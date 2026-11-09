> **归档（2026-11-09）**：历史审查记录，不是待办。文中行号、数据与结论均对应下方基线，与当前代码不一定一致；样本仓库已匿名化。源码引用写作 `repo:相对路径:行号`。4 项发现均已在 pulls.review `multi-repo` 修复：
>
> | 发现 | 修复 commit |
> | --- | --- |
> | 1 淘汰删掉刚访问的条目 | `9a383cf` |
> | 2 符号链接全文显示目标文件 | `18b8d6a` |
> | 3 分页不限 rows/token | `b20d5d2`（文档 `d1f982f`） |
> | 4 求 key 也启动 Git | `bc4a8dd` |

What this change does:

daemon 把本地 Git diff、分析状态和已审标记转换成 Review pane 使用的 JSON，后续 rows 已独立读取，diff rows 和全文均按 4 MiB 分页。本次审查当前实现整体，确认两个正确性问题、一处仍然危险的数据规模限制，以及一处可删减的轮询成本；没有重复报告旧审计中已经修复的缺陷。

基线：`pulls.review` 的 `multi-repo`，`36e8599eb5a294fa6536c35e8ff262a1a30aa314`，被审仓库工作区干净。范围为 `packages/cli/src/daemon/`、其调用的 `packages/core/src/local/`，以及直接决定缓存锁语义的 `storage.ts`、`core/src/cache/diff-cache.ts`；读取 pane 调用方以确认可达性。线上只访问现有 `0.3.4-fork.7` daemon 的 `/api/review`、`/api/review/rows`、`/api/review/file`、`/api/review/status`。

**Must fix**

1. **淘汰仍能删除刚打开且刚保存分析的缓存条目**（`pulls.review:packages/core/src/cache/diff-cache.ts:148`、`:166`；`pulls.review:packages/cli/src/storage.ts:61`）

   - **What this is：** 缓存超出 200 条或 200 MiB 时，`enforceBudget` 按访问时间选择条目，删除其 metadata 和 body；普通更新则通过 `exclusive` 和跨进程 `dirLock` 排队。
   - **Problem：** 删除没有取得条目的锁，也不重查此前选出的候选；两个使用实际 `dirLock` 的缓存对象可以出现“选 A 淘汰 → `touch(A)` 成功 → 保存 A 的分析成功 → 旧淘汰删除 A”的交叠。隔离时序中，删除前 A 的 `lastViewedAt=3000`、分析 `model=paid` 均已读回，删除后 A 不存在，却保留了 `lastViewedAt=2000` 的 B。
   - **Fix：** 删除候选也复用 `exclusive(meta.key)`，锁内重读 metadata，确认条目没有在选择后被访问或改写才删除；清理 reviewed marks 前重新读取仍保留的条目。保留上述并发时序作为回归检查。
   - **If we skip it：** 达到正常缓存预算后，用户刚使用的页面及其付费分析仍可能消失；rows 路由随后会得到缓存缺失，转回完整读取，分析结果却无法恢复。

2. **仓库内符号链接的全文显示了另一个文件**（`pulls.review:packages/core/src/local/source.ts:156`；`pulls.review:packages/cli/src/daemon/review.ts:461`；`herdr-t3:extras/mods/review/diff.js:80`）

   - **What this is：** 工作树的 `loadFile` 先解析真实路径，再读取该路径；提交页则通过 `git cat-file blob` 读取 Git 保存的内容，pane 对未截断的文本链接开放全文按钮。
   - **Problem：** 新增 `alias.txt -> target.txt` 时，diff 的新增行是 `target.txt`，但工作树全文返回目标文件的 `TARGET_CONTENT`、`second line`；把同一个链接提交后，全文又变成 `target.txt`。前一轮边界修复已阻止仓库外读取，但仍允许把仓库内链接目标的内容当作链接本身展示；现有 `source.test.ts` 也明确断言了这种错误的全文语义。
   - **Fix：** 对最后一级符号链接使用 `lstat`、`readlink` 返回链接文本，不跟随目标；普通文件继续保留真实路径的仓库边界校验。全文应与该文件的 Git blob 内容一致。
   - **If we skip it：** 用户在全文视图中审阅了错误的对象，同一个链接在提交前后还会展示不同文本；链接目标的大小也与链接自身的 diff 大小无关。

**Should fix**

3. **4 MiB 限制守住了传输上限，没有约束一包数据要处理多少行和 token**（`pulls.review:packages/cli/src/daemon/review.ts:279`、`:301`、`:344`；`herdr-t3:extras/mods/review/main.js:171`）

   - **What this is：** `firstRowFiles` 按整份文件的新增、删除行数预选，首文件总是允许进入；真正分页的 `rowsWithin` 只计算 JSON 字节，因此单文件和密集 token 都能绕过 3000 行这个负载预期。
   - **Problem：** 一个仅 340,000 字节、170,000 行的合法文件首包送回 **80,872 行**，下一包又送回 **79,498 行**；另一个仅 1000 行的文件送回 **321,000 个 token**，仍未 `clipped`。后者仅首组 `buildItems + contentWidth` 在 `node --jitless` 已约 **40 ms**，尚无 GPUI 元素构造；这证明仍有危险量级，不能据此声称已实测 QuickJS 打断。
   - **Fix：** 在现有分页出口统一限制实际 rows 数和 token 数，复用 `from`、`clipped`、`truncated`，保留字节预算；额度应以真实 Herdr 的 50 ms 门限校准。把首组文件路径直接交给这个出口后，可删除 `firstRowFiles` 的整文件预选；pane 对累计 rows 的构建仍须保留缓存，缩小单包不能替代它。
   - **If we skip it：** 小于 8 MiB 的响应仍能让一次收包处理或首次构建遍历数十万对象，行数少也不保证安全；继续调整整文件的“改动行数”无法覆盖这两个输入。

**Nice to have**

4. **只求已有页面的 key，也要启动一次 Git**（`pulls.review:packages/cli/src/daemon/review.ts:260`；`pulls.review:packages/cli/src/daemon/server.ts:56`；`pulls.review:packages/core/src/local/source.ts:117`；`pulls.review:packages/core/src/types/source.ts:20`）

   - **What this is：** `pageKey` 新建一个完整 local source，只为了调用 `key()`；source 的构造立即运行 `git rev-parse --show-toplevel`，而服务器已从注册表取得规范化的 `tree.path`。
   - **Problem：** 即使状态没有变化，worktree、compare 每次 status 仍启动 1 次 Git，branch 启动 3 次，其中另外 2 次用于默认分支解析；真实热请求分别约 8–11 ms、23–25 ms。每 1.5 秒轮询时，branch 是约 120 次 Git/分钟/页面；注册表已改成对已知 worktree 缓存 60 秒，这里没有重复报告旧的每轮全仓扫描。
   - **Fix：** 在服务器已知规范根目录的调用路径上直接复用 `serializeRef({ kind: 'local', repo: tree.path, target })`，删除为求 key 而构造 source 的步骤；保留 branch 的默认分支解析，先不增加新缓存或 API 选项。这能明确省掉每次查询的一次 Git。
   - **If we skip it：** 功能仍然正确，但多个 pane 的状态轮询和补行会重复启动这些短进程；这属于后台成本，不是 50 ms render 被打断的直接证据。

**负载与成本证据**

真实仓库为大型样本仓库 `/path/to/benchmark-repo`，分支 `sample-feature`；以下为单次在线观测，耗时包含请求、daemon 执行、响应读取和 JSON 解析，不是稳定分位数。`rows: []` 不要高亮行，`firstRows` 为 `rows: [], firstRows: true`；rows 批次只请求首组前 10 个路径。

| 页面 | 文件数 | metadata 字节 / ms | firstRows 字节 / ms / 行 | rows 批次字节 / ms / 行 | 热 status，3 次范围 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/worktree` | 65 | 20,779 / 123.55 | 886,545 / 326.66 / 1,271 | 16,530 / 31.18 / 174 | 8.37–10.75 ms |
| `/branch/sample-feature` | 1,554 | 566,718 / 383.17 | 1,036,170 / 390.14 / 3,022 | 67,164 / 67.38 / 464 | 23.10–25.18 ms |
| `/compare/origin/sample-feature...sample-feature` | 1,264 | 430,642 / 660.65 | 1,039,866 / 721.29 / 3,175 | 79,643 / 65.93 / 438 | 7.76–9.14 ms |

这些请求均成功，status 响应均为 17 字节、`running=false`。真实 `/file` 还抽取了未被 core 截断的 样本仓库的 Markdown 文件 `docs/research/sample-note.md`：5,660 行、419,381 字节、538.10 ms；没有把服务器的这段等待时间算进 render 的脚本预算。

下表直接载入现有 `rows.js` 的 `clipRows`、`buildItems`、`contentWidth`，在 Node 24.22.1 的 `--jitless` 模式执行，预热 2 次后取 7 次中位数；每次使用新解析的 row 对象，测的是首次构建，宽度设为 1000、统一视图、无折叠。`build + width` 对应 render 中的首组数据构建；`parse`、`clip` 是分别记录的收包阶段，**不把这三列相加冒充一次 render**，也不按固定倍率换算 QuickJS。

| 输入 | 响应字节 | rows / tokens | parse | clip | 首组 build + width |
| --- | ---: | ---: | ---: | ---: | ---: |
| 真实 compare 首包 | 1,039,866 | 3,175 / 9,664 | 1.16 ms | 1.15 ms | 4.73 ms |
| 真实 branch 首包 | 1,036,170 | 3,022 / 10,616 | 1.28 ms | 1.25 ms | 3.72 ms |
| 真实 worktree 首包 | 886,545 | 1,271 / 28,807 | 1.56 ms | 2.77 ms | 4.87 ms |
| 170,000 短行文件的首包 | 4,195,048 | 80,872 / 80,872 | 13.18 ms | 12.10 ms | 24.46 ms |
| 1000 行密集 token 文件 | 3,570,684 | 1,000 / 321,000 | 11.76 ms | 37.46 ms | 40.04 ms |

两个边界输入均来自临时 Git 仓库：空初始提交后，分别新增 `a.js`，内容为 `'1\n'.repeat(170000)`，或 `('1+'.repeat(160) + '1\n').repeat(1000)`；均未触发 core 的 512 KiB patch 截断。高亮颜色为 `foreground=#cccccc, number=#d19a66, keyword=#c678dd, string=#98c379, comment=#7f848e`；调用 `readReview({ rows: [], firstRows: true, ... })`，长文件后续调用 `readRows({ files: ['a.js'], from: 80872, base, head, ... })`。

发现 1 的复现只把缓存 `maxEntries` 缩到 1，并使用两个缓存对象共享同一 storage 和实际 `dirLock`：A 于 `t=1000` 存入，B 于 `t=2000` 存入；在 B 的淘汰调用真正删除 A 的两个文件前暂停，执行 A 于 `t=3000` 的 `touch` 和 `setAnalyzedResult`，读回二者后恢复删除。没有修改真实缓存或 reviewed 标记；生产预算只是把这个并发窗口推迟到 200 条或 200 MiB。

**精简边界与验证**

优先收拢行预算和删除 `firstRowFiles`，不建议再拆 `readReview`：它目前是约 50 行的取数、缓存与组装流程，拆成只调用一次的包装不会消除工作量。没有确认可直接删除的业务死代码；`readRows` 的 stale 回退、全文分页的重复高亮、锁过期接管，以及分析状态错误传播均已读过，其中有明确 `shortcut:` 的取舍没有另列成“新缺陷”。

现有检查：`bunx vitest run packages/cli/src/daemon/review.test.ts packages/cli/src/daemon/server.test.ts packages/cli/src/storage.test.ts packages/cli/src/daemon/registry.test.ts packages/core/src/local packages/core/src/cache`，**12 个测试文件、91 个测试全部通过**，5.70 秒。临时探针 **6 项通过**；其中关于 `fingerprint` 的额外调用链追踪没有列入发现，因为当前 pane/bar 不走该路径。

只写了本报告和 `/tmp` 探针；未修改源码、配置或 Git 状态，未提交，未调用分析、未写真实 reviewed 标记、未重启 daemon、未操作 Herdr 窗口。删除项仅为本任务创建的临时探针、测量 JSON 和 Vite 临时缓存。

Verdict（历史结论，基线 `36e8599`）：当时建议先修 1 和 2；1–4 均已修复，见文首映射。

Lean: -10 lines possible. 这是估计：统一行预算后删除约 15 行的 `firstRowFiles` 预选，再减去必要的新额度判断，不增加通用分页框架。

Not checked: 未操作真实 Herdr 测量 QuickJS/GPUI 或确认新的 `interrupted` 触发阈值；未运行付费分析、built-worker lifecycle smoke、长时间 RSS/磁盘采样或真实跨进程压力测试。行/token 数量风险已测到，实际 Herdr 的安全分页额度仍需实机校准。
