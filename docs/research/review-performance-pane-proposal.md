# Review pane 性能方案：pane / QuickJS 交互端

2026-11-09。只评估方案，未修改实现，也未请求真实 daemon。基线：T3 `e4b2787`（review mod 与 `a0802e9` 相同，因此[数据流报告](review-performance-data-flow.md)的实测仍然适用）、jin.review `pulls.review@d1f982f`、宿主 `herdr-app@1d838e2`。行号都指这些提交。daemon 内部的缓存实现见[服务端报告](review-performance-daemon-investigation.md)，本文只列 pane 对它的接口条件。

标注：**[实测]** 原报告的真实样本测量；**[合成]** 本轮在隔离环境用合成数据测量；**[源码]** 源码事实；**[推算]** 由前两者推出，未经验证；**[待验收]** 实施后才能确认。

## 结论

1. **把量宽从 Render 移到其他阶段，只能避免中断，不能消除冻结。** QuickJS 是主线程上的解释器：宿主说明异步结果"settles on the main thread"（`vendor/gpui-kit/crates/shell/src/engine/quickjs/sandbox.rs:286`），JIT 已关闭（`mod.rs:1652-1656`）。Event/Task 阶段有 500 ms 预算，只表示超过这个时间才被打断；在这之前，整个 Herdr 窗口都停着。真实样本首批量宽约 83–130 ms，只换阶段，就从"中断"变成"整窗卡顿约 0.1 s"。
2. **量宽的总工作量可以显著减少，有三种办法。** (a) daemon 已经按同一规则把每行截到 1000 字符，pane 的 `clipRows` 是重复扫描，可以在这一趟里顺便算出列数；(b) `match(WIDE)` 会为每个宽字符分配一个字符串，中文越多越慢，改用 `replace` 计数后，在中文密集文本上快 2–3 倍；(c) 列数改由 daemon 附带，pane 就不再做按字符计费的工作。
3. **需要逐行精确量宽，但每个 token 最多扫描一次。** 缓存键是 row 对象本身，失效由"新数据就是新对象"自动完成，不需要另加失效逻辑。
4. **有两个触发器在放大负载。** 文件监听不区分页面类型：只有 `/worktree` 页依赖工作树，但 agent 改任何未被忽略的文件，都会让 Compare/branch/commit 页重读整页。在 commit 页上，凡是不带 rows 的读取成功生效，都会再读一次整个 base（约 444 KB，daemon 端约 1.7 s）。切换提交时的读取总是不带 rows，所以每次生效的切换都会触发一次。

## 冻结和取数等待是两件事

| 用户感受 | 成因 | 发生位置 | 本文对应 |
| --- | --- | --- | --- |
| **交互冻结**：整窗不响应、掉帧、`interrupted` | QuickJS 在主线程同步执行：JSON.parse、apply、量宽、建列表 | pane | P1、P3 |
| **取数等待**：spinner、"Loading…"、风扇转 | daemon 的 `git diff` 和缓存读取，HTTP 在后台执行，不冻结 UI | daemon | P2 只减少请求次数；单次延迟由 daemon 方案解决 |

P2 同时影响两者：每少一次整页读取，pane 就少一次 444 KB 的解析加 `said()`（[合成] 合计约 10–30 ms 主线程时间），daemon 也少约 1.3–1.7 s 的工作。

## 当前处理顺序与真正的热点

```text
HTTP 收齐（后台） ─▶ response.json() 解析 ─▶ clipRows 遍历每个 token ─▶ applyReview / 合并 rows ─▶ version++ ─▶ notify
   [实测] 1 MB 首批：JSON.parse 28.9 ms；首次 apply（含 clipRows）12.4 ms        ── 以上在一个 Task 中，主线程连续执行
Render ─▶ items()：buildItems（parts 复用）+ contentWidth（首次逐行量宽，结果缓存在 row.columns 上）
   [实测] 首批 2,865 rows：items() 在 Render 中 interrupted；放在 init 测为 105.1 ms
   [实测] 列宽预先算好后，Render 中 items() 22.3 ms
```

- 首次量宽发生在 `main.js:181,189`，即 `part.widths ??= measure(part.items)`；逐行计算在 `rows.js:20` 的 `columns()`。**每批 `/rows` 到达后都会重来一次，不只发生在首次打开。** `loadRows` 每次 `version++`（`review-load.js:149`），下一次 Render 就要测量新到的最多约 3,000 行。
- 所有新行都会先经过 `clipRows`：`review-load.js:184`（整页）、`:133`（`/file` 翻页）、`:140`（`/rows`），以及 `diff.js:98`（首次打开整文件）。因此它是把量宽前移的唯一位置，不需要新的阶段或队列。
- daemon 的 `highlight()`（`packages/cli/src/daemon/review.ts:95-109`，提交 `a1691c2`）用与 `clipRows` 相同的规则把每行截到 1000 字符，`hunkRows` 和 `fullRows` 都经过它。**pane 再截一次永远不会改变结果，只是多扫描一遍** [源码]。

## 本轮补测：量宽能少算多少 [合成]

方法：在 `/tmp` 临时建一个 mod，用安装的 `herdr-app check`（gpui-shell 0.7.1，与 pane 相同的 QuickJS 解释器）在 init 阶段计时，再抛错输出结果。数据是合成的，没有读取业务内容。`Date.now()` 精度为毫秒，每组跑 2–3 次，没有控制机器负载，只能当量级参考。实验目录已删除。

| 输入：约 2,856 rows / 10.3k tokens / 20.6 万字符 | 耗时 |
| --- | ---: |
| 现状：`clipRows` | 9–13 ms |
| 现状：首次 `contentWidth`（`match` 计数） | 25–35 ms |
| 合成一趟：只在超长时截断，再用快速路径加计数算列数 | 12–17 ms |
| 合成一趟之后，Render 中的 `contentWidth`（只读缓存） | 1–2 ms |
| 结果一致性 | 与现状完全相同 |

| 约 20.9 万字符，中文占比 | 0% | 10% | 50% | 90% |
| --- | ---: | ---: | ---: | ---: |
| `t.match(WIDE).length`（现状） | 17 ms | 41 ms | 99 ms | 136 ms |
| `t.length - t.replace(WIDE, "").length` | 19 ms | 27 ms | 43 ms | 41 ms |

合成数据的现状量宽为 25–35 ms，真实样本约 83–130 ms，相差 2.4–3.3 倍。中文较多的 Markdown 或注释能解释这个差距，**但真实样本的中文占比没有核实** [推算]。把同一行代码换成 `replace` 计数，在中文密集时能省 2–3 倍，在纯 ASCII 时持平。

buildItems 的合成成本很低（170 个 items 用 3–5 ms；split 下 4–8 ms），而真实样本的 1,353 个 items 用了 22.3 ms [实测]。这一项是 Render 中剩下的主要成本，但在下文的重建帧预算之内。

## 量宽：要算到什么程度、在哪个阶段算、缓存和失效

- **需要完整精确吗？需要逐行精确，但只用得到每个 side 的最大值。** `sideWidth` 只决定横向能滚多远，以及滚动条滑块大小（`main.js:203`、`diff.js:195`）。如果只按长度计数（[合成] 4–9 ms），中文行少算一半，tab 行少算四分之三，行尾就滚不到，会违反 `check-pane.cjs:113,117-118` 已锁定的行为。用"上界剪枝"只精确量少数行也不可行：tab 的上界是长度的 4 倍，剪不掉多少行。
- **下界**：每行每个 token 至少扫描一次，而且这一次可以放在 daemon（P3）。在 pane 内做时，最少是"一趟，ASCII token 直接取 `length`，含 tab 或宽字符的 token 做一次原生 `replace`"。
- **split / unified**：列数按 row 缓存。unified 取 `row`；split 的 `pair` 左右两侧分别取 `line.left` / `line.right`，上下文行在两侧是同一个对象，只量一次；新增或删除的文件走 `solo`。三种模式共用同一个 `row.columns`，**切换 split 不会重新量宽**，只会重跑 `pairRows` 和 buildItems（[合成] 多 1–3 ms）。
- **长行**：daemon 截断后，每行最多 1000 字符，相当于 2000 列中文或 4000 列 tab。最坏的一批是 3,000 行、每行 1000 字符的日志类文本，约 300 万字符，仍在 daemon 4 MiB 的字节预算内。按 replace 计数 0.09–0.2 µs/字符推算，pane 内单趟需要约 0.3–0.7 s，接近甚至超过 500 ms 的 Task 预算 [推算]。**推荐由 P3 在生产端一次算好，pane 就不再承担这部分随字符量增长的成本。** 在 pane 内分片处理也能避免一次长时间阻塞，但总工作量不变，还要引入队列和"列宽未就绪"的中间状态，代价更大。
- **计算阶段**：推荐在生产端完成（P3，daemon 在 `rowsWithin()` 中对最终发送的行计算，见 [daemon 方案 §4a](review-performance-daemon-proposal.md#4a-跨层衔接rows-附带-columns单次读取按整个响应限额)）。只发布 pane 时，在响应到达后的 `clipRows` 这一趟里完成（P1），位于 Task 阶段，在 `version++` 之前。
- **缓存键**：row 对象本身（`row.columns`）。这个字段现在已经是 `columns()` 的缓存（`rows.js:20` 的 `??=`），只是在 Render 中首次使用时才填入；P3 由响应直接带来，P1 在到达时提前填入，读取代码都不用改。每个文件和 side 的最大值继续使用现有的 `part.widths`，它的键是 `rows.js:171` 的 stamp；整组最大值继续使用 `itemsId`（`main.js:175`）。
- **失效点**：不需要新增。token 只会以新的 row 对象到达；以下情况都会重新取行，自然得到新对象：主题变化（`main.js:309` 删除 `hunks` 并重读）、文件 sha 变化（`review-load.js:187` 不再沿用旧的 hunks）、整文件翻页（`concat` 生成新数组，旧行的值不变）。截断和计数在同一趟中完成，计数总是对应截断后的 token。

## 建议（最多 3 项）

**推荐组合：P3 + P2。** 既然 daemon 这一轮本来就要改，列宽直接由生产端算好；P2 只改 pane，可以并行。P1 只在 pane 必须单独发布时，作为小修备选，**不能当作完整解决方案**：按推算，它的到达切片仍为 70–130 ms。

### P1（备选，只发布 pane 时）. `clipRows` 一趟完成截断和量宽，并换用 replace 计数（pane，工程量 S）

- **改动**：`extras/mods/review/rows.js`
  1. 第 20 行 `columns()`：把 `(t.match(WIDE)?.length ?? 0)` 改为 `t.length - t.replace(WIDE, "").length`（两者都只统计 BMP 宽字符，结果相同）。
  2. `clipRows`（第 46-58 行）：在逐 token 循环里累计截断后文本的列数。不含 tab 和宽字符的 token 用一次 `/[\t\u2e80-\ud7ff\ue000-\uffff]/.test()` 判断后，直接加 `length`；否则走第 1 条的计数。循环结束后写入 `row.columns`。`contentWidth` 和 `columns()` 的 `??=` 保持不变，测试中直接构造的 row 仍然可用。
  3. `main.js` 中的 `items()` 留在 Render，不要把它挪到回调里：预热对照实验里真实样本是 22.3 ms，在重建帧预算之内；挪到回调会让到达切片多 22 ms。
- **数据形状**：在到达时提前填充 row 已有的 `columns` 缓存字段。不改 API，不新增阶段或队列。
- **收益边界**：**有望**消除已复现的 Render 中断，需要真实样本回放确认 [待验收]。原报告"预先量宽后 Render 中 items() 为 22.3 ms"是一个实验性预热的对照，不是 P1 实现的实测。量宽总量：纯 ASCII 约省 60%（[合成] 35–47 ms → 12–17 ms）；中文密集时省 2–3 倍。真实样本的到达切片 [推算] 约为解析 28.9 + apply 12.4 + 单趟 30–90 ms ≈ **70–130 ms，很可能仍超过 50 ms 的预算**。所以 P1 有望解决中断，但很可能解决不了冻结。
- **回归风险**：低。列数规则不变，`check-pane.cjs:112-131` 已有 CJK、tab、截断后宽度的断言。需新增一条断言：`clipRows` 之后每行都带有整数 `columns`，以锁定"Render 不再逐字符计算"。
- **验收**：
  - 输入：原报告的真实首批（2,865 rows / 9,185 tokens），用原报告第 4–5 步的 `herdr-app check` 回放方法，unified 和 split 各一次。
  - 目标：Render 中 `items()` 不中断，且 ≤ 25 ms；Render 中的 `contentWidth` ≤ 2 ms；记录到达切片（`JSON.parse` + `applyReview`，含 `clipRows`）。如果切片超过 50 ms，就触发 P3。
  - 合成长行批（3,000 行 × 1000 字符，分纯 ASCII 和 90% 中文两组）：在 Task 中不中断，并记录耗时，作为 P3 的依据。

### P2. 只在 diff 可能变化时重读（pane，工程量 S）

- **改动**：`extras/mods/review/review-load.js`
  1. `touchesDiff(root, paths, page)`（第 17-23 行）：保留开头的 `.git/HEAD|refs` 判断。之后对 `page !== "/worktree"` 直接返回 `false`。依据：daemon 的 `targetForPage`（`packages/cli/src/daemon/analysis.ts:11-23`）中，只有 `worktree` 页的目标是工作树，`branch`、`compare`、`commit` 页都只解析 refs。调用方在第 34 行改传 `view.page`。这样，非 worktree 页也不必再为每批文件变化启动一次 `git check-ignore`。
  2. `loadReview`：在第 73 行记录 `const switched = view.switching`；把第 90 行改为 `if (!rows.length && !(switched && view.baseCommits)) loadBaseCommits(view, cx)`。在同一 base 内切换提交时，`main.js:295-296` 会保留 `baseCommits`，所以不必重读 base。刷新和 refs 变化触发的读取不属于切换，仍会重读 base，新提交照样能进入列表，`check-pane.cjs:1176-1178` 的行为保持不变。
- **base 读取的现有触发条件** [源码]：`loadBaseCommits`（`review-load.js:207-214`）只在一次 `/api/review` 读取被应用之后调用（`:90`）。它要求同时满足：本次读取没有请求 rows；读取没有被更新的读取取代（`:81`）；主题没有变化（`:83`）；读取期间没有正在落地的标记（`:85`）；并且当前页不是 base 本身（`:209`）。切换页面时 `group` 为空，所以请求的 rows 总是空的（`:73,76`），**每次生效的切换都会触发一次 base 读取**。快速连点时，被后一次切换取代的读取不会触发。在 commit 页上，如果刷新时屏幕上的文件都已有 rows，这次读取也不带 rows，同样会触发 base 读取。
- **新鲜度契约保持不变**：ref 名字可以移动，Compare/branch 页并不是不可变的。P2 只去掉"工作树普通文件变化"这一个对非 `/worktree` 页无效的触发源，现有更新路径全部保留：
  - **ref 前进**（commit、amend、rebase、fetch 更新本仓库的 loose ref）：root 下的 `.git/HEAD` 或 `.git/refs/` 变化仍会立即触发读取（`review-load.js:18`）。这次读取不是切换，所以 commit 页仍会重读 base，新提交会进入列表。
  - **监听看不到的 ref 变化**（linked worktree 的 common dir、只写 `packed-refs` 的更新）：与现在一样，由可见时每 15 s 一次的刷新覆盖（`main.js:64`）。
  - **分析完成**：运行期间每 1.5 s 轮询一次 `/status`，运行结束或出现新错误时重读整页（`main.js:61`、`review-load.js:159-175`）。由浏览器或其他进程发起、pane 不知道的运行，靠 15 s 刷新发现，此后进入同样的轮询。
  - **浏览器端的已审标记**：15 s 刷新。
  - pane 不可见时只记下 `dirty`，重新可见后 1 s 内读取（`main.js:65,91`），保持不变。
- **不改的部分**：保留 15 s 的定时刷新，它是上面多条路径的兜底。让定时刷新变便宜，由 daemon 一路负责：它已经确认的方案是，不改 HTTP API，通过 `LocalSource.revisions()` 解析真实的 base/head 并复用磁盘上的 diff。也不对 base 读取做时间节流：那样会让 refs 变化后新提交最多晚 15 s 才出现。
- **收益边界** [源码推算]：
  - 在 Compare、branch 或 commit 页上，agent 持续写工作树文件、但没有提交时，整页读取次数从"最快每秒一批、在途时合并为下一次"（约每 1.5 s 一次）降到"每 15 s 一次，加上 refs 变化时的读取"。60 s 内从约 40 次降到约 4 次，相应减少 daemon 的整页读取次数和 pane 的解析与 `said()` 次数。
  - 在同一 base 内切换提交：每次生效的切换少一次 base 读取（约 444 KB，daemon 端约 1.7 s）。刷新和 refs 变化触发的 base 读取保持不变。
  - `/worktree` 页不受影响。
- **回归风险**：低。linked worktree 的 refs 不在 root 下，现在本来就看不到，仍由 15 s 刷新兜底，这是既有限制。`.git/packed-refs` 不在正则中（`git pack-refs` 或 fetch 可能只写这个文件），也是既有限制；需要时可以把 `packed-refs` 加进第 18 行。
- **验收**（`check-pane.cjs` 的 watcher 和 baseReads 场景，第 1166-1219 行）：
  - 页面为 `/compare/a...b` 时，`/repo/a.ts` 变化应触发 0 次读取，`.git/refs/heads/fix` 变化触发 1 次；页面为 `/worktree` 时，`/repo/a.ts` 变化触发 1 次（现有断言保留）。
  - 在已有 `baseCommits` 时，`showPage` 切换到另一个 commit，base 读取次数为 0；刷新时仍为 1。
  - 实施方可选做的真实回放：在 Compare 页上让 agent 改文件 60 s，统计这个 pane 发出的 `/api/review` 次数，目标 ≤ 5。

### P3（推荐）. 生产端附带每行列数（daemon 加字段，pane 沿用现有读取，工程量 S–M）

只列 pane 对 daemon 的要求，不涉及 daemon 内部实现：

- **数据形状**：`/api/review` 的 `files[].hunks[].rows[]`、`/api/review/rows` 和 `/api/review/file` 的 `rows[]`，每行加上 `columns: number`。值等于截断后各 token 文本的长度之和（`\t` 按 4 个空格计算），再加上落在 `[\u2e80-\ud7ff\ue000-\uffff]` 内的 UTF-16 单元数，与 `rows.js:16-20` 的规则完全相同。字段名用 `columns`，pane 现有的 `row.columns ??=` 就能直接使用，不需要新增读取代码。
- **pane 侧**：读取代码不用改。`row.columns ??= …` 遇到 daemon 给出的值就直接使用，不会再计算。
- **兼容和发布顺序**：两个仓库独立发布，而且有真实用户安装，所以**保留 pane 现有的 `clipRows` 和 `columns()` 计算作为兜底**，这部分没有新增代码。各种组合的行为：
  - 新 daemon + 旧 pane：现有 `row.columns ??=` 直接使用字段，量宽收益立即生效。
  - 旧 daemon + 新 pane：回退到 Render 中计算，行为与现在相同。
  - 两边都更新：pane 不再逐字符量宽。
  因此发布顺序不影响正确性；先发 daemon，收益就能立刻生效。`clipRows` 同时保留截断边界：`a1691c2` 之前的 daemon 不截断行，而 pane 没有版本检查。只有在 pane 能确认 daemon 的最低版本之后，才能删除兜底和 `clipRows`。目前 `/api/status` 只返回 `{ pid }`（`server.ts:121`），没有版本号，本轮不做。
- **一致性要求**：daemon 计算 `columns` 时，必须用截断之后的 token；当 pane 的 `clipRows` 不再改变 token 时（daemon 已截断），这个值与 pane 自己算的结果相同。
- **防止规则漂移**：两个仓库共用一份行样例（ASCII、tab、中文、astral 字符、恰好 1000 字符和超过 1000 字符），断言 daemon 输出的 `columns` 等于 pane 规则算出的值。
- **收益边界** [推算]：pane 中随字符量增长的量宽成本降到 0。真实首批（约 1 MiB 的完整响应）剩下解析 28.9 ms 加 apply 12.4 ms，合计约 41 ms；这两个数来自原报告分开测量的步骤，加起来是否仍是 41 ms 需要回放确认。之后的重建帧 Render 约 22 ms，这个数来自预热对照实验，同样需要回放确认。每行多约 13 B，2,865 行约 37 KB，相当于 1 MB 首批的 3.7%，解析时间增加约 1 ms。长行最坏批不再需要 0.3–0.7 s 的 pane 计算；如果剩下的解析仍然超出预算，见下一条。
- **另一个接口条件：按完整响应控制大小。** rows 的字节预算目前为 4 MiB（`review.ts:279`），而文件、分组、提交等元数据（本样本约 444 KB）不计入这个预算，所以完整 JSON 会更大。验收必须对完整响应计时，覆盖解析、apply 和随后的 Render，不能只看解析时间，也不能假设 Render 一定不在同一帧。首轮按主汇总的口径：以当前约 1 MiB 的完整响应为样本，到达处理 ≤ 50 ms，再根据实测调整 rows 预算。此外，`review.ts:272-276` 注释中"3000 rows / 10,000 tokens 能在一次 render 内建好"的说法已被实测推翻（2,865 rows / 9,185 tokens 发生中断），这些限额不能当作 Render 的保证。
- **与 daemon 方案的关系**：daemon 一路已确认的热读方案（不改 HTTP API，解析真实 base/head 后复用磁盘 diff；因为分析会跨进程写入 body，仍然读取 body）正好满足 pane 的需要。base 和 head 的 sha 不变时，整页读取不再执行 `git diff`，15 s 刷新和 P2 保留的 refs 触发读取都会变便宜，pane 不需要额外的版本查询接口。热读耗时以 daemon 报告的推算为准：只读元数据时约 0.32–0.53 s [推算]，见 [daemon 方案](review-performance-daemon-proposal.md)。
- **验收**：
  - 用共用行样例做双端断言。
  - 真实首批（约 1 MiB 完整响应）回放：到达处理（解析加 apply）≤ 50 ms；记录随后的重建帧 Render，目标 ≤ 25 ms；记录两者是否落在同一帧。
  - 长行合成批：pane 内不再出现与字符量成正比的量宽耗时。
  - 旧 daemon 加新 pane：行为与现在相同（兜底路径）。

## 验收预算

这些是本文为体验设定的检查阈值，不是项目已有的 SLA。所有阈值都按"一次在主线程上连续执行的 JS"计时，不能用"没被 interrupt"代替。

| 阶段 | 目标 | 依据 |
| --- | ---: | --- |
| 普通 Render（滚动、悬停、spied 刷新） | ≤ 8 ms | 60 Hz 一帧 16.7 ms，宿主还要排版和绘制 |
| 重建帧 Render（新一批、折叠、切换组或页面后的第一帧） | ≤ 25 ms | 真实首批建列表 22.3 ms [实测]；留出一倍余量，避免接近 50 ms 的中断阈值 |
| 数据到达处理（完整响应的解析 + apply + 预处理，到 `notify` 为止） | ≤ 50 ms | 常用的"长任务"界线。它是否与随后的 Render 落在同一帧未经验证，所以两者都要记录；首轮以约 1 MiB 完整响应为样本 |
| 后台刷新切片（不带 rows 的整页读取） | ≤ 25 ms | 每 15 s 一次，不应可感知；[合成] 解析加 `said()` 约 10–30 ms，处在边界上 |
| 交互事件处理（折叠、标记、切换） | ≤ 50 ms | 用户操作后 100 ms 内要有响应 |

取数等待单独报告：单提交约 100 ms、整页 1.3–1.7 s [实测]。它不计入上面的预算，由 daemon 方案验收。

## 上一轮需要修正或舍弃的建议

1. **不推荐"把量宽移出 Render，再按有界批次处理"**（数据流报告的方案 A）。只换阶段，只是把中断变成同样长的整窗冻结。分批处理确实能把一次连续阻塞拆开，但总工作量不变，还要维护异步队列、中间状态和"列宽未就绪"的展示规则。与之相比，由生产端一次算好列宽（P3）代价更小。
2. **修正 daemon 报告中"UI 冻结的主因更可能是处理 444 KB 响应和重建列表"的判断。** 只含元数据的读取，建列表 12.5 ms [实测]，解析和 `said()` 约 10–30 ms [合成]。单次都不大，问题在于触发频率（P2）。主要的冻结来源是 rows 的首次量宽和大批量解析。
3. **不要把 daemon 的 rows 和 tokens 限额当作 Render 预算。** 它们只限制单次读取的大小；pane 在 Render 中做什么，需要由 pane 自己保证。

## 第一步

推荐 P3 + P2 一起做。

- daemon 在 `rowsWithin()` 最终发送的每行加上 `columns`，并附双端一致的行样例；pane 的读取代码不改，兜底保留。daemon 一路核对后确定这个位置更合适：`highlight()` 只返回 tokens，全文视图之后还会替换它们。
- P2 改 `review-load.js` 约 3 行，外加两条断言。
- 然后用约 1 MiB 的真实首批，回放 unified 和 split 两种模式，按上面的预算验收。

只有在 pane 必须单独先发布时，才做 P1（改 `rows.js` 约 6 行，加一条断言）作为小修。它有望消除中断，但需要回放确认，而且很可能仍超出 50 ms 的到达处理预算。

## 还没评估的部分

- 完整 Render 中 header、aside 和文件树等其他组件的耗时（原报告的整帧回放受检查器主题错误影响），以及真实帧率和输入延迟。
- 整文件翻页时，`whole.rows` 每页都会 `concat`，stamp 也会变，所以每翻一页都会在 Render 中为整个文件重建 items，翻页越多，总成本按平方增长。按合成速率推算，约 3 万行的整文件，最后一页需要 30–50 ms。这是待验收的风险，建议的验收输入：一个 3 万行的文本文件打开整文件视图并翻到底，每一帧都不中断且 ≤ 25 ms。
- QuickJS 堆占用。
- 真实样本的中文占比（它决定 P1 的实际收益落在 2–3 倍还是约 1.4 倍）。
