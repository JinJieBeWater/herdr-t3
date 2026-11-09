> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1、2 项：pulls.review `5524d19` 加入字节预算，`dca544c` 加入续读，`b20d5d2` 再限制实际行数与 token 数；这些不代表整页元数据已有任意规模的硬上限。
- 第 3 项：已修于 pulls.review `5524d19`；第 4 项的跨进程写入锁见 `ac16153`、`5816bff`、`5e1eba3`。
- 第 5 项：仓库外读取由 `65043a1` 阻止，链接自身的全文语义由 `18b8d6a` 修正。
- 第 6–8 项：分别已修于 pulls.review `34a048f`、`27015cc`（并发淘汰补修 `9a383cf`）、`d963419`。
- 第 9 项：pane 补行的整页重复读取已由 pulls.review `dca544c` 与本仓库 `0e03d14` 消除；通用同页并发请求合并未单独验收，不记为已完成。

---

What this change does:

本次只读审查跟踪 Review pane 使用的 daemon 请求，从 Git、本地 diff 源、缓存到高亮和 JSON 响应。按“单人在本机使用，但仓库可以很大”的负载判断，确认 5 项必须修复、4 项应该修复的问题。

审查基线：`pulls.review` 的 `multi-repo`，`20a7c28dffd7584c30179557a71737e8a99d4074`，工作区干净。范围为 `packages/cli/src/daemon/`、`packages/core/src/local/` 及直接调用的缓存实现；读取 pane 调用方以确认实际触发路径。以下源码引用均指向该 fork 的上述基线。

**Must fix（必须修复）**

1. **3000 行和 1000 列仍不能保证响应小于 8 MiB**（`pulls.review:packages/cli/src/daemon/review.ts:274`、`pulls.review:packages/cli/src/daemon/review.ts:315`）
   - **What this is：** `firstRows` 按新增、删除行数选整份文件，首个文件无条件加入；显式 `rows` 直接返回这些文件的全部 hunks。
   - **Problem：** 3 个文件共 3000 行、每行仅 321 字符，实际响应为 **10,710,947 字节**；单个 170,000 行、340,000 字节的文件也未被 core 截断，首批响应为 **8,899,668 字节**。两者均超过 Herdr 的 8,388,608 字节上限，前者的 HTTP 响应仍为 200。
   - **Fix：** 返回 rows 时按实际 JSON 的 UTF-8 字节数守住响应预算，允许文件内分页并提供续读位置；预算要包含元数据、上下文行和 token 的结构开销。
   - **If we skip it：** 初次打开或滚动到这些文件时，pane 仍读不到响应；降低“每批改动行数”不能覆盖首个大文件和高亮后的体积膨胀。

2. **显示整个文件仍可直接超过 8 MiB**（`pulls.review:packages/cli/src/daemon/review.ts:358`、`pulls.review:packages/cli/src/daemon/server.ts:241`）
   - **What this is：** `/api/review/file` 重新获取整页 diff，然后读文件全文，一次返回所有行。
   - **Problem：** 9,000 行、每行 1,000 个 `x` 的文本文件，其 diff 已被 core 标记 `truncated`，但全文响应仍为 **9,456,796 字节，HTTP 200**。pane 的全文按钮会对这种非二进制文件发出该请求。
   - **Fix：** 全文接口也使用有字节上限的行区间分页；core 的 patch 截断不能替代全文接口的响应限制。
   - **If we skip it：** 大文件的 diff 被省略后，用户点击全文仍然失败，无法完成审阅。

3. **340 KB 的合法文件会让全文接口栈溢出**（`pulls.review:packages/cli/src/daemon/review.ts:143`）
   - **What this is：** `fullRows` 把一个 hunk 的所有 rows 用 `rows.push(...array)` 一次传入函数。
   - **Problem：** 新增文件 `a.js` 的内容为 `"1\n".repeat(170000)`，原文件只有 340,000 字节、patch 低于 512 KiB 截断阈值；在实际 Node 24.22.1 下，全文接口返回 **500 / `Maximum call stack size exceeded`**。
   - **Fix：** 逐项追加 hunk rows，避免把文件行数变成一次函数调用的参数个数。
   - **If we skip it：** 行很多但字节数不大的文件也打不开全文；仅扩大 HTTP 响应上限不会修复这个异常。

4. **pane 刷新与分析完成并发时会丢掉已保存的 AI 结果和会话**（`pulls.review:packages/cli/src/daemon/review.ts:227`、`pulls.review:packages/cli/src/daemon/child.ts:20`、`pulls.review:packages/cli/src/devframe.ts:46`）
   - **What this is：** daemon 和 worktree server 共享磁盘缓存，却分别建立 `CacheRepositories`；`pulls.review:packages/core/src/cache/diff-cache.ts:80` 的写队列只保护自己的实例。
   - **Problem：** daemon 的 `putDiff` 先读旧 body，分析端随后保存结果和会话，再让 daemon 完成写入，最终两者都消失；隔离时序检查确认 `hasLlm=false, hasSession=false`。实际触发是分析将结束时 agent 又改了文件，pane 的文件监视或刷新请求与结果保存交叠。
   - **Fix：** daemon 模式下让同一仓库的缓存写入由一个拥有者串行处理，分析端把保存操作交给它；锁必须覆盖整个“读旧值、合并、写回”区间。
   - **If we skip it：** 花钱生成的分析和会话可能被一个只读页面请求覆盖，后续只能重新分析。

5. **工作树中的符号链接会让全文接口读取仓库外文件**（`pulls.review:packages/core/src/local/source.ts:158`、`pulls.review:packages/cli/src/daemon/review.ts:365`）
   - **What this is：** 工作树全文读取只检查 `resolve/relative` 得到的字面路径是否位于仓库内，随后调用会跟随符号链接的 `readFile`。
   - **Problem：** 临时仓库内的 `a.txt` 指向仓库外自建文件，diff 显示链接目标路径，全文接口却返回外部文件中的 `OUTSIDE_REPOSITORY_CONTENT`。这个路径确实在当前 diff 中，可以通过接口的文件存在检查。
   - **Fix：** 将符号链接作为链接处理，使用 `readlink` 返回其目标文本；读取普通文件时按实际路径验证仓库边界。
   - **If we skip it：** pane 会把外部文件内容误当作被审阅的文件展示，可能包括仓库外的私有内容。

**Should fix（应该修复）**

6. **合法的 `uncategorized` AI 分组会被今天的回退判定隐藏**（`pulls.review:packages/cli/src/daemon/review.ts:309`、`pulls.review:packages/core/src/types/analyze.ts:89`）
   - **What this is：** `5941585` 通过“解析后的组是否有一个 key 不等于 `uncategorized`”判断旧分析还有没有命中文件；模型分组的 key 则允许任意字符串。
   - **Problem：** 保存一个 key 为 `uncategorized`、覆盖全部当前文件、headSha 完全匹配的合法 AI 分组，下一次读取却得到 `source=rule-based, analysis.state=none`，备注和 critical 标记均不显示。隔离检查中 3 个文件全部命中，结果仍被隐藏，缓存中的分析本身还在。
   - **Fix：** 根据原分析是否仍有文件路径命中来判断，或在添加自动兜底组前记录是否保留了原分组；不要用合法模型 key 充当来源标志。
   - **If we skip it：** 有效分析会被当成从未分析；开启自动分析的 pane 在重新打开时还可能再次启动分析。

7. **未变化的常用页面不会更新缓存访问时间**（`pulls.review:packages/cli/src/daemon/review.ts:304`、`pulls.review:packages/core/src/cache/diff-cache.ts:148`）
   - **What this is：** diff 缓存按 `lastViewedAt` 淘汰旧页面，但 `readReview` 命中缓存后既不写 diff，也不调用已有的 `touch`。
   - **Problem：** 用同一实现的两条缓存预算复现：工作树在 t=1000 打开、commit A 在 t=2000 打开、工作树在 t=3000 再读，工作树时间仍为 1000；t=4000 打开 commit B 时，刚使用的工作树被淘汰，commit A 留下。
   - **Fix：** 成功读取已有页面后调用 `cache.diffs.touch(key)`，只更新元数据。
   - **If we skip it：** 生产环境触及 200 条或 200 MiB 预算时，会淘汰活跃页面及其 AI 结果；重复查看并不能保护它。

8. **子进程状态查询失败会伪装成正常结束**（`pulls.review:packages/cli/src/daemon/server.ts:67`、`pulls.review:packages/cli/src/daemon/children.ts:29`）
   - **What this is：** `runningRequests` 在子进程 5 秒没有应答时抛错，但服务器的 `running()` 把所有错误都转成空对象。
   - **Problem：** 让已存在的 worktree server 的 `running()` 抛出真实超时错误 `Worktree server did not answer`，实际路由返回 **200 / `{ "running": false }`**，没有 `error`。pane 会把它当成结束并刷新，刷新同样经过这段吞错代码。
   - **Fix：** 保留查询失败信息，返回可见错误或失败状态；“没有启动过子进程”才正常返回未运行。
   - **If we skip it：** 正在运行但暂时失联的分析会停止显示为运行中，真正的查询故障也没有原因可查。

9. **每批补行和同页并发请求仍重复做整页工作**（`pulls.review:packages/cli/src/daemon/review.ts:301`、`pulls.review:packages/cli/src/daemon/review.ts:330`、`pulls.review:packages/core/src/local/source.ts:132`）
   - **What this is：** 每次先 `source.fetch()`，再检查缓存；`rows` 只省未选择文件的高亮和输出，不省 Git diff、日志、patch 解析以及全量 reviewed 查询。
   - **Problem：** 真实 1,264 文件 compare 页的 `rows: []` 读取耗时 621 ms；两个同时只补 `AGENTS.md` 的缓存命中请求仍执行 **12 次 Git、8 次 `codeToTokens`**，合计 700 ms，均未写 diff。pane 滚动触发的后续补行会反复付出整页成本。
   - **Fix：** 对已解析的 base/head 没变化的提交、范围页复用已解析 diff，并合并同一页、同一组选项正在进行的请求；复用判断要包含 base。
   - **If we skip it：** 3000 行分批虽然缩小响应，却把大 diff 的读取成本重复到每一批，多 pane 或快速切换时还会叠加同样的工作。

## 实测请求成本

真实数据来自 `/path/to/benchmark-repo`。在线请求只使用已注册的仓库及 `/api/review`、`/api/review/status`；未触发分析或 reviewed 写入。在线 daemon 为现有 Node 24.22.1 进程，未重启。

下表为在线 daemon 的单次观测，不是分位数或稳定性能基准。`metadata` 是 `rows: []`；`firstRows` 是 `rows: [], firstRows: true`，使用与 pane 相同形式的语法颜色。

| 页面 | 文件数 | metadata 耗时 / 字节 | firstRows 耗时 / 字节 | firstRows 文件 / hunk / rows | `codeToTokens` 次数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/worktree` | 65 | 162 ms / 20,779 | 113 ms / 887,315 | 65 / 65 / 1,271 | 130 |
| `/branch/sample-feature` | 1,554 | 381 ms / 566,718 | 381 ms / 1,036,940 | 40 / 42 / 3,022 | 84 |
| `/compare/origin/sample-feature...sample-feature` | 1,264 | 621 ms / 430,642 | 592 ms / 1,040,216 | 45 / 62 / 3,175 | 124 |

高亮次数由实际返回的 hunk 数和 `pulls.review:packages/cli/src/daemon/review.ts:111` 的两侧调用计算，并非高亮耗时采样。branch、compare 的首批实际改动行分别为 2,987、2,964；rows 比 3000 多是因为包含上下文行。

使用实际源码和临时 `git` 包装器逐次计数，`readReview` 本身每次的 Git 调用如下；缓存命中也一样执行。

| 页面 | diff 源的 Git 次数 | 内容 |
| --- | ---: | --- |
| 工作树 | 5 | 根目录、HEAD、index 路径、临时 index 的 `add -N`、全量 diff |
| branch（此仓库默认分支为 `origin/dev`） | 8 | 2 次默认分支探测，加根目录、两个 revision、merge-base、log、diff |
| compare | 6 | 根目录、两个 revision、merge-base、log、diff |
| 非根提交的 commit 页 | 5（代码计数） | 根目录、提交、父提交、log、diff；根提交另需 empty-tree 查询 |

HTTP `/api/review` 在此之上，每次还要 1 次 `repoCacheDir` 的 Git；该仓库缓存实例首次创建再多 1 次。注册表缓存过期时还会扫描每个已注册仓库，当前额外 5 次 Git，因此当前注册表过期、缓存实例已存在时，工作树/branch/compare 分别为 **11 / 14 / 12 次 Git**；注册表仍热时为 **6 / 9 / 7 次**。其他仓库默认分支命中更晚时，branch 探测次数会更多。

缓存和高亮的成本分开看：

| 情形 | 缓存读取与写入 | 高亮 |
| --- | --- | --- |
| 现有页面、head 未变 | 读 meta、body；批量查所有文件 sha 的 reviewed；**0 次写入** | `rows: []` 为 0；选择 H 个 hunk 为 2H 次 |
| 新页面或 head 改变 | 上述读取之外，`putDiff` 再读旧条目、可能查旧 reviewed；写 meta、body 各 1 次，然后列举缓存元数据执行淘汰 | 与选择的 hunk 数有关，不缓存已高亮 rows |
| `/api/review/file` | 不使用 diff/file-content 缓存，先完整 fetch；工作树再直接读文件，提交/范围页另有 `cat-file -e` 和 `cat-file blob` 两次 Git | 全文 1 次，再对每个 hunk 调 2 次，即 1+2H |

`unstorage` 的 fs driver 没有批量 `getItems` 实现，会对每个 sha 分别 `getItem`。因此“1 次 reviewed 批量查询”仍是 N 个文件读取尝试，当前三页分别为 65、1,554、1,264 次，不能算成一个磁盘文件读取。

## 状态轮询与缓存增长

`/api/review/status` **没有做 Git diff、patch 解析、高亮或 diff 缓存写入**，也不会启动 worktree server；已有子进程时有一次 IPC 查询。在线三页分别观测到 10、27、50 ms，响应均为 17 字节。

为包含注册表成本，另在隔离 `createDaemonApp` 中使用同一份真实注册表、模拟子进程状态应答，记录实际 Git 命令；仅查询状态，没有修改注册表或启动子进程。

| 页面 | 注册表过期：Git / 耗时 | 注册表仍热：Git / 耗时 |
| --- | ---: | ---: |
| worktree | 6 / 79 ms | 1 / 11 ms |
| branch | 8 / 89 ms | 3 / 31 ms |
| compare | 6 / 65 ms | 1 / 11 ms |

额外的 5 次全部是 `git worktree list --porcelain -z`。pane 每 1.5 秒轮询，而注册表 TTL 是 1 秒；没有别的请求提前刷新注册表时，每个轮询都会扫描当前 5 个仓库，branch 页约为每分钟 320 次 Git 启动。

diff 缓存有 **200 条 / 200 MiB** 的淘汰预算，并非每次刷新追加一个版本；工作树和范围页面的 key 稳定，内容变化时覆盖同一个条目。当前 样本仓库 缓存的只读磁盘统计为：

| 类别 | 文件数 | 实际字节 |
| --- | ---: | ---: |
| `pr-body` | 27 | 52,164,003 |
| `pr-meta` | 27 | 219,260 |
| `review` | 99 | 7,623 |
| `file-content` | 175 | 5,264,091 |
| `agent` | 21 | 2,621,594 |

预算按序列化内容估计，不能当作整个目录的硬上限；`file-content`、`agent` 也不属于 diff 预算。pane 的 `/file` 读取路径没有写 `file-content`；本次未发现 pane 每次读取导致这些目录持续新增的情形。主题 Map 按颜色组合保留、仓库缓存 Map 按公共 Git 目录保留，未做长时间内存采样，不据此声称已有内存泄漏。

## 复现输入与证据

临时检查直接导入 fork 的 TypeScript 源码，Vitest 把 `@pulls.review/core/*` 指向 `packages/core/src/*.ts`，运行在 Node 24.22.1。每个大小案例使用一个独立临时 Git 仓库，先做空初始提交，再创建以下未跟踪文件；缓存使用 `createCacheRepositories(createStorage())`，`running` 返回空对象。

```ts
const colors = {
  foreground: '#cccccc', number: '#d19a66', keyword: '#c678dd',
  string: '#98c379', comment: '#7f848e',
}

// 案例 A：三个文件，每个 1000 行，共 3000 行。
for (const name of ['a.js', 'b.js', 'c.js'])
  writeFileSync(join(cwd, name), ('1+'.repeat(160) + '1\n').repeat(1000))

// 案例 B：一个文件，170000 行，340000 字节。
writeFileSync(join(cwd, 'a.js'), '1\n'.repeat(170000))

// 案例 C：一个文件，9000 行，每行 1000 个 ASCII 字符。
writeFileSync(join(cwd, 'a.txt'), ('x'.repeat(1000) + '\n').repeat(9000))
```

| 案例 | 调用 | 实际结果 |
| --- | --- | --- |
| A | `readReview({ rows: [], firstRows: true, ... })` | 10,710,947 字节，3000 rows，三个文件均未 truncated |
| A | `readReview({ rows: ['a.js','b.js','c.js'], firstRows: false, ... })` | 同为 10,710,947 字节 |
| A | 隔离真实路由 `/api/review` | HTTP 200，10,710,947 字节 |
| B | `readReview({ rows: [], firstRows: true, ... })` | 8,899,668 字节，170000 rows，未 truncated |
| B | 隔离真实路由 `/api/review/file` | HTTP 500，`Maximum call stack size exceeded` |
| C | 隔离真实路由 `/api/review/file` | HTTP 200，9,456,796 字节；diff 已 truncated、没有 hunks |

并发缓存检查使用两个独立的缓存实例共享同一 storage，精确安排下面的合法交叠；没有运行模型或改生产分析：

```text
daemon.putDiff：读出旧 meta/body，暂停在返回旧 body 之前
child.setAnalyzedResult：保存一个完整的模拟 AI 分组
child.setLlmSession：保存会话；再次读取确认 AI 结果已存在
daemon.putDiff：恢复，用此前读到的旧 analyzedBy/llmSession 合并并写回
最终读取：newer-head 存在，AI 结果与会话都不存在
```

`pulls.review:packages/cli/src/agents/rpc.ts:78` 已用 `shortcut:` 承认浏览器写入与结果保存可能交叠；这里复现的触发方是 pane 的 `/api/review` 自动刷新，不需要浏览器同时写入，因此当前实际工作流已经跨过这个限制。

其余检查的具体触发方式：

- **合法分组 key：** 保存 `key: 'uncategorized'`、`filePaths: ['a.js','b.js','c.js']`、当前 headSha、critical 和文件备注，再读 review；最终只剩规则组 `Code`，`analysis=none`、备注为空。
- **LRU：** 将同一个缓存实现的 `maxEntries` 设为 2，提前准备两个提交和稳定的工作树；按发现 7 的时间顺序读取，不改文件。生产预算只是把触发点推迟到更多条目或字节。
- **IPC 错误：** 给隔离 daemon 一个已存在的子进程对象，其 `running()` 拒绝并携带超时错误；经过真实 `/api/review/status` 路由得到 200 和 `{running:false}`。
- **符号链接：** 只在临时目录创建 repo 外的测试文本及 repo 内指向它的 `a.txt`；普通 diff 返回链接目标字符串，`readFullFile` 返回外部测试文本，未访问任何真实私有文件。
- **重复请求：** 真实 compare 页先用内存缓存预热，然后同时请求两次 `rows: ['AGENTS.md']`；记录 12 次 Git、4 个返回 hunks、8 次高亮调用，`putDiff` 为 0 次，两份响应各 436,807 字节。

## 验证与收尾

临时 Node 复现检查先通过 9 项，再单独通过新增的合法 key 检查，共 10 项；过滤新增项时显示的其余 9 项 skipped 是主动筛选，前一轮已全部通过。现有检查 `corepack pnpm vitest run packages/cli packages/core/src/local`：**18 个测试文件通过、1 个跳过；122 个测试通过、1 个跳过**，3.85 秒；跳过的是需要 `PULLS_DAEMON_SMOKE=1` 的 built-worker lifecycle smoke，没有启用，以遵守不操作运行中 daemon 的约束。

未修改任何源码、配置或 reviewed 标记，未调用分析、未提交、未停止或重启 daemon、未操作 Herdr 窗口。删除项仅为本任务创建的临时实验目录；报告保留了可重建的输入、时序和结果。


原审查结论（基线时）：fix 1–5 first.

Not checked: 未做 Herdr 真实点击、付费 AI 实跑、长时间 RSS/磁盘增长采样或真实跨进程压力测试；已确认的字节越界、栈溢出、结果覆盖与仓库外读取仍需修复。
