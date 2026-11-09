# Review pane 性能：daemon 与 Git 数据源调查（只读）

日期 2026-11-09。范围：jin.review daemon 的 `/api/review`、`/api/review/rows`、`/api/review/file`、`/api/review/status`，以及背后的 Git 取数、缓存和快照。Pane、QuickJS、宿主桥和端到端测量由主任务负责，本文不涉及。

标注：**[源码]** 当前源码事实；**[实测]** 本次实测；**[历史]** 已修的旧问题；**[假设]** 未验证的推断。

## 0. 基线：在用版本不是 cwd 那份 checkout

| 项 | 值 |
| --- | --- |
| 在用 daemon | pid 36665，启动于 13:05；运行 `~/.bun/install/global/node_modules/jin.review/dist/daemon-process.mjs`（`0.3.4-fork.8`，dist 构建于 11:45）；Node 22.23.4 |
| 对应源码 | `~/my/personal/projects/pulls.review` `multi-repo` @ `d1f982f0bef0`，工作区干净，比 origin 超前 21 个提交。dist 含 `readRows`、`3e3`、`1e4`、`4194304`，与该提交的 `readBudget` 一致 |
| 过时 checkout | `~/my/personal/fork/pulls-review` `multi-repo` @ `85d05f24c5ae`（= origin/multi-repo），工作区干净。**没有** `/api/review/rows`，不能当作在用版本 |
| worktree server | 调查期间没有运行中的 `daemon-child` |
| 样本 | `shared.review.shown` 唯一一项的 root/base，当前留存的 Compare 页；报告不保留业务仓库路径和分支名 |

以下行号均指 `projects/pulls.review@d1f982f`，前缀为 `packages/`。

## 1. 调用链（每次请求做什么）

```text
POST /api/review {page, colors, rows?, firstRows?}            cli/src/daemon/server.ts:217
  review(): readBody + valibot + reviewTree()                 server.ts:73, :56
    registry.find(worktreeId)  已知 worktree 信任 60 s       registry.ts:139-158
  caches(tree.path) → repoCacheDir = 每次 spawn git rev-parse --git-common-dir   review.ts:228-239, storage.ts:45
  readReview                                                   review.ts:342-392
    pageTarget → targetForPage；/branch 还要 1-3 次 git 探测默认分支   daemon/analysis.ts:11-23, core/src/local/repo.ts:24-34
    source.fetch()  ← 每次都跑，无内存快照、同页请求不合并    review.ts:356, core/src/local/source.ts:132-151
      git rev-parse --show-toplevel                            source.ts:117
      resolveTarget: rev-parse×2 + merge-base + log --reverse %B（无上限）   source.ts:44-64, :36-42
      git diff -M --full-index base head（MAX_BUFFER 512 MiB，无超时）     source.ts:13,121, local/git.ts:8,16-23
        /worktree: 复制 index + add -N . + diff，head = 全文 hash         source.ts:70-83, :125-128
      truncateLargeChunks（单文件 > 512 KiB 只留计数）+ parsePatch       source.ts:86-102, :136-140
    cache.diffs.get(key)：读 meta 和整份 body JSON，再 valibot 校验     core/src/cache/diff-cache.ts:107-111
    命中（head 和 base sha 都相同）→ touch（加锁改写 meta）
    未命中 → putDiff：再 get 一次 + changedSinceReviewed + 写整份 body + enforceBudget 列出所有 meta   review.ts:361, diff-cache.ts:198-217, :148-173
    reviewMarks.get(全部文件 sha)：fs 驱动没有批量接口，逐个 getItem   core/src/cache/review-marks.ts:21-32
    无分析时 ruleBased.analyze + resolveGroups                 review.ts:371
    servedRows：高亮请求的文件，单次预算 4 MiB / 3000 rows / 10k tokens   review.ts:279, :324-340
    响应：所有文件的元数据 + 全部 groups + 全部 commits（不分页）       review.ts:374-391

POST /api/review/rows {files, base, head, from?}               server.ts:227
  readRows：pageKey（compare/commit/worktree 不调 git）+ cache.diffs.get 整份 body   review.ts:398-405
    base/head 不一致 → {stale:true}；一致则 servedRows（hunk 先整块高亮再 slice(from)）   review.ts:295-318
  不跑 git diff；但每次都重读、重解析整份 body

POST /api/review/file {file, colors, from?}                    server.ts:251
  readFullFile：每页都跑一次完整 source.fetch() 来找这一个文件      review.ts:433-446
    loadFile：range/commit 用 cat-file -e 和 cat-file blob；工作树直接读文件   source.ts:156-175
    fullRows 每页都把整个文件重新高亮，再 slice(from)   （代码里已注明的 shortcut：review.ts:431）

POST /api/review/status {page}                                 server.ts:237
  readStatus：pageKey + children.peek().running(key)，IPC 5 s 超时   review.ts:408-411, children.ts:18-38
  不读 diff、不写缓存；/branch 页会 spawn git 探测默认分支
```

Pane 的触发频率（来自 herdr-t3 `a0802e9` 源码，便于估算 daemon 负载，pane 细节由主任务负责）：可见时每 15 s 一次完整的 `/api/review`（`extras/mods/review/main.js:64`）；文件变化最多每秒一次读取（`main.js:65`、`review-load.js:36`）；分析进行中每 1.5 s 一次 `/status`（`main.js:61`）；滚动补行走 `/rows`；全文按页走 `/file`（`review-load.js:125-126`）。

## 2. 实测（Node 22.23.4，不是 QuickJS；未向 daemon 发任何 HTTP）

HTTP 端到端数据来自主任务：`/api/review` 带 `rows:[]`，耗时 1512 ms，响应 443,705 B，其中 commits 20 KB、files 327 KB、groups 96 KB。下面是本次对 daemon 各阶段的离线拆解，直接 import d1f982f 源码执行。测量期间负载 5.7，只能当量级参考，不是分位数基准。

样本规模：113 commits，1274 files，+191,399/−30,838 行，3323 hunks；原始 diff 21.0 MB；缓存的 `pr-body` 为 15.5 MB（整个仓库缓存 59 MB：27 meta、27 body、99 review）。

| 阶段 | 耗时 | 依据 |
| --- | ---: | --- |
| 每次 spawn 小 git 命令 | 16–36 ms/次 | shell / Node execFile |
| rev-parse×3 + merge-base | ~50 ms | stages.mts |
| `git log` %B（113 commits，27 KB） | ~20 ms | |
| **`git diff -M --full-index`** | **765–1040 ms** | 3 次 stages + 2 次 shell |
| split 截断 | ~57 ms | |
| parsePatch | ~85 ms | |
| **`source.fetch()` 合计（热）** | **975–1040 ms** | 另有冷启动或高负载观测 2.6–3.3 s；没有隔离两者贡献 |
| 每次 fetch 的堆增量 | **~100 MB** | 持有结果时 heap 118→217 MiB |
| 读 body + JSON.parse + valibot（命中路径，也是每次 `/rows`） | **91–102 ms** | cache.mts，用 daemon 的 unstorage 栈只读 |
| reviewMarks.get（1274 次逐个 fs 读） | 19–30 ms | |
| ruleBased.analyze | 21 ms | |
| 序列化不含 rows 的 review | 9 ms / 377 KB | |
| computeEntrySizeBytes（putDiff 路径） | 151 ms | 未命中才发生 |
| JSON.stringify body（写路径） | 53 ms | 未命中才发生 |
| 高亮约 3000 rows（34 个文件，17,922 tokens） | 43 ms | 含首次初始化 |
| 最大 hunk（9297 行 json）两侧高亮 | 11 ms | 本样本主要是 json/md，代码语言可能更贵 **[假设]** |

拆解结论：对照约 1.3–1.5 s 的 HTTP 耗时，**git diff 占大头**。split、parse、JSON.parse、schema 校验和序列化在 Node 主线程同步执行，会延迟其他请求回调 **[源码]**。本次阶段计时是墙钟时间，其中读缓存包含异步磁盘等待；没有直接测主线程累计 CPU 时间、事件循环延迟或其他请求的排队时间。

## 3. 硬限制清单 [源码]

| 限制 | 值 | 位置 | 超出时 |
| --- | --- | --- | --- |
| git stdout | 512 MiB | `core/src/local/git.ts:8` | execFile 报错，返回 500 |
| git 子进程超时 | **无** | `git.ts:16-23` | 挂住的 git 会挂住请求；pane 30 s 后超时 |
| 单文件 patch | 512 KiB | `source.ts:15` | 丢掉 hunks，只保留计数，标 `truncated`（样本中 3 个） |
| rows 单次读取 | 4 MiB / 3000 rows / 10k tokens | `review.ts:279` | 分批；本样本实际先撞上 token 上限（约 1700 rows/批） |
| 行宽 | 1000 列；tokenize 2000 | `review.ts:92`, `:97` | 截断 |
| 请求体 | `/api/review`、`/rows` 256 KiB，其余 8 KiB；路径数组 ≤ 5000 | `server.ts:123-125`, `:217`, `:227` | 400 / 413 |
| 磁盘缓存 | 200 条 / 200 MiB，LRU | `diff-cache.ts:15-16` | 淘汰 |
| 跨进程锁 | mkdir 锁，30 s 视为失效 | `storage.ts:55-88` | |
| 状态 IPC | 5 s | `children.ts:18-38` | 返回错误 |
| **commits 数** | **无上限**，每次 %B 全量 | `source.ts:36-42` | 每次读取和响应都随之线性增长 |
| **元数据中的文件 / groups 数** | **无上限**，不计入 4 MiB 预算 | `review.ts:276` 已注明的 shortcut | 约 1 万文件时元数据约 4 MiB |

## 4. 风险与重复计算

| # | 现象 | 类别 | 量级（本样本） |
| --- | --- | --- | --- |
| R1 | 每次 `/api/review` 都跑完整的 `git diff` 和 parse，即使 base/head sha 没变。命中缓存省去 body 重写，但仍更新访问时间，取数照旧 | [源码][实测] | 每次约 1.0–1.5 s、约 100 MB 瞬时堆增长；只按 15 s 刷新周期计，每分钟四次重复取数累计约 4–6 s 墙钟时间，不能等同于主线程 CPU 时间 |
| R2 | 同一页的并发请求不合并（多个 pane、刷新与 watch 同时触发、bar 和 pane 同时读） | [源码] 旧审计第 9 项中“同页合并”部分**未修** | N 个并发 = N 份 git diff 和 N×100 MB |
| R3 | `/rows` 每批都重读、重解析整份 15.5 MB body | [源码][实测] | 每批约 100 ms。若发生 110 批，则缓存读取、解析和校验累计约 11 s；这里没有回放完整滚动，也没有把异步磁盘等待全算成主线程 CPU |
| R4 | `/file` 每页都跑完整 `fetch()`，再高亮整个文件 | [源码][实测 fetch] | 每页 ≥ 1 s。超长文件 N 页 ≈ N×(1 s + 整文件高亮)；代码中已有 shortcut 注释 |
| R5 | `/rows` 带 `from` 时先把整个 hunk 高亮再切片 | [源码] | 本样本单个 9297 行 json hunk 高亮约 11 ms；跨多个分页反复处理同一大 hunk，累计成本可能随文件长度超线性增长 [假设] |
| R6 | commits 不设上限，%B 全量拉取，每次 `/api/review` 都完整返回 | [源码] | 本样本 20 KB；长期分支的 `/branch` 有上千 commits 时达 MB 级，每 15 s 一次 [假设] |
| R7 | 每次响应都带全部文件元数据和 groups（`rows:[]` 也一样），不计入预算 | [源码][实测 HTTP] | 444 KB/次；QuickJS 解析成本由主任务测 |
| R8 | 每个 `/api/review`、`/rows` 都 spawn 一次 `git rev-parse --git-common-dir` | [源码] `review.ts:231` | 每次 16–36 ms |
| R9 | reviewMarks 逐文件 fs 读 | [源码][实测] | 1274 次约 25 ms，次要 |
| R10 | `/worktree` 页：head 是全文 hash，任何改动都会触发 putDiff（再 get 一次，加上 stringify 15 MB 和写盘），且每次都 `add -N .` 遍历工作树 | [源码] | 本样本不是 worktree 页；大仓库工作树页每次读取额外约 0.3 s+ [假设] |
| R11 | 多个同步解析和序列化阶段占用同一 Node 主线程 | [源码] | 可能抬高 `/rows`、`/status` 的尾延迟；未直接采样排队时间 |

**[历史，已修，勿重复报告]**（见 `docs/research/review-audit-2026-11-09/daemon.md`、`review-cleanup-2026-11-09/daemon.md`）：
- `/api/review` 补行反复读整页，已由 `dca544c` 的 `/rows` 解决（`/rows` 现在只读缓存，代价见 R3）。
- rows 预算：`5524d19`、`b20d5d2`。
- 求 page key 要启动 git：`bc4a8dd`。
- `/status` 每次扫描注册表：`34d98db`，现在信任 60 s。
- 打开要两次读取、`/status` 读 diff：`8d28f64`。
- 淘汰与锁：`27015cc`、`9a383cf`、`ac16153`、`5816bff`、`5e1eba3`。

## 5. 建议的改法边界（按收益/代价排序，均未实施）

| 方案 | 改动边界 | 收益 | 代价/风险 |
| --- | --- | --- | --- |
| **A. 按 sha 快照短路** | `readReview`（`review.ts:354-361`）与 core source：commit/range 页先解析实际 sha（解析 refs 的实测量级约 50–100 ms）；与快照 base/head 一致时复用 diff 和 commits，跳过 log、diff、parse | 省去本样本最重的 git diff 和 patch parse；最终延迟需实施后实测，尚有缓存、marks、groups 等成本 | 要正确处理 base 移动、merge-base 和 amend；`/worktree` 需自己的失效规则。可能改 core 的 `DiffSource` 或 daemon 边界，具体结构待实施决定 |
| **B. 进程内解析结果 LRU + 在途合并** | 有字节上限的已解析快照缓存，加同一快照的在途请求合并；`readReview`、`readRows`、`readFullFile` 共用 | R2、R3、R4（`/rows` 免读 body，`/file` 免 fetch），R11 也减轻 | 会增加常驻堆；本次约 100 MB 是 fetch 的瞬时堆增量，不能当成准确驻留成本。需实测并按字节设限，worktree 页同样要判断失效 |
| C. `/file` 改用 pane 已有的 base/head，与 `/rows` 同一契约（stale 时让 pane 重读），并按 (path, sha) 缓存整文件高亮 tokens | `server.ts:251`、`review.ts:433-446`，加上 pane 的一次调用改动 | R4 | 加一个可选字段，跨两个仓库，需要旧版本兼容 |
| D. `caches()` 按 cwd 记住 `repoCacheDir` | `review.ts:228-239`，一行级改动 | R8，每请求省 16–36 ms | 几乎没有 |
| E. git 加 `timeout`、commits 设上限或单独取 | `git.ts:16-23`、`source.ts:36-42` | 健壮性和 R6 | commits 上限会改动 UI 契约（pane 的提交菜单），需要用户决定 |
| F. 元数据分页或按需取（files、groups、commits） | API 契约 | R7，只在万级文件时有意义 | 改动大，跨 daemon 和 pane；目前 444 KB 量级，**不建议先做** |

推荐顺序：先做 **D**（零风险），再做 **A + B**。两者合起来覆盖 R1–R4 和 R11，改动集中在 daemon 的 `review.ts`，如果走 core 则再加 `source.ts`。C、E、F 视主任务端到端测量里 daemon 时延的占比再定。

**需主任务确认的判断 [假设]**：daemon 侧的 1–1.5 s 走 HTTP 异步，本身不会冻结 UI。如果 pane“卡顿”指的是 UI 冻结，主因更可能在 QuickJS 处理 444 KB 响应和重建列表；如果是“打开或刷新慢、风扇转”，主因是 R1、R2。另外，`/compare` 页的 diff 与工作树文件无关，但 pane 的 watch 仍会因文件改动触发完整读取（`review-load.js` watch 只过滤 gitignore）。这是 pane 侧可省的 R1 触发源，请主任务核实。

## 6. 复现

```bash
# 版本核对
ps -o pid,lstart,command -p "$(pgrep -f jin.review/dist/daemon-process.mjs)"
git -C ~/my/personal/projects/pulls.review rev-parse HEAD   # d1f982f…
grep -o 'readRows\|4194304' ~/.bun/install/global/node_modules/jin.review/dist/daemon-process.mjs | sort | uniq -c

# Git 阶段计时（只读；把 BASE 和 HEAD_REF 设为当前 Compare 的两个 ref）
ROOT=$(jq -r '."review.shown" | to_entries[0].value.root' ~/.config/herdr-app/shared.json)
cd "$ROOT"
MB=$(git merge-base "$BASE" "$HEAD_REF")
time git log --reverse --format=%H%x00%an%x00%aI%x00%B%x1e "$MB..$HEAD_REF" -- >/dev/null
time LC_ALL=C git -c core.quotePath=false diff --no-color --no-ext-diff --src-prefix=a/ --dst-prefix=b/ --full-index -M "$MB" "$HEAD_REF" -- | wc -c

# 缓存体积（只读）
du -sh "$(git rev-parse --git-common-dir)/pulls-review"; ls -laS "$(git rev-parse --git-common-dir)/pulls-review/pr-body" | head
```

Node 阶段拆解用的是临时脚本（已删除）。做法：用 `node --import <tsx loader>` 直接 import `projects/pulls.review/packages/core/src/local.ts` 的 `createLocalSource(...).fetch()`、`patch-parser.ts` 的 `parsePatch`、`cache.ts` 的 schema 和 `createReviewMarks`（配 unstorage fs 驱动并设 `readOnly: true`），再用 `performance.now()` 包住各阶段。`packages/cli/src/daemon/review.ts` 依赖未构建的 core dist，无法直接 import，因此高亮和 `flatKeys` 按 d1f982f 原样内联复制。全程未写缓存、未发 HTTP、未启停 daemon、未写 reviewed、未触发 analyze。
