# Review pane 性能审查（2026-11-09）

> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1、2 项：已修于本仓库 `0ca6fd6`、`20a7458`；后续大组片段缓存与首帧上限分别见 `e227489`、`ea924dc`。
- 第 3 项：补行改为独立读取，见本仓库 `0e03d14` 与 pulls.review `dca544c`；第 4 项见本仓库 `9a2ad1a`。
- 第 5 项：本仓库 `ebd9a5e` 限制入口，pulls.review `5524d19`、`dca544c` 限制响应并支持续读。

---

**这部分做什么：** Review pane（`extras/mods/review/`）在 Herdr 的 QuickJS 里把 jin.review daemon 的一页 review 画出来：左边分组，旁边 aside 列出当前组的文件，右边是虚拟列表里的 diff。行（highlighted rows）不随首读全部下发，而是按视野分批向 daemon 要，每批最多 3000 行改动。

**假设的负载：** 一个人在本机用，但仓库很大。实测用的是 `/path/to/benchmark-repo` 的三页：`/worktree`（65 文件）、`/branch/sample-feature`（1554 文件，`code` 组 1164 个）、`/compare/origin/sample-feature...sample-feature`（1264 文件，`docs` 组 626 个）。

**怎么测的：** 复制 `check-pane.cjs` 的假环境，`review()` 改为请求本机真实 daemon（只用 `/api/review`、`/api/review/file` 两个只读路由），`v_virtual_list` 只画 700px 视野内的项；在 node 里从头滚到尾，每步先 render，再等这一批 rows 到达后再 render，并用 `node --cpu-prof` 采样。慢倍数用本机 codemode 的 QuickJS 校准：同一段 `columns()` 负载和同一个空循环，QuickJS 都比 node 慢 **12–15×**。下文 QuickJS 的数都按「实测 12–15× / 任务给的 30–50×」两档估。node 的元素数用 Proxy 计数，跟倍数无关。

## Must fix

1. **每批 rows 到达，整组的行宽都重算一遍** (`extras/mods/review/rows.js:L18`, `rows.js:L62-68`, `main.js:L170-176`)
   - **这是什么：** `items()` 在 `version` 变化时重建列表，并调用 `contentWidth()` 算横向滚动的最大宽度。`contentWidth()` 对每一行调用 `columns()`，`columns()` 对每个 token 做一次 `replaceAll("\t")` 和一次正则匹配。
   - **问题：** 每批 rows 到达后 `applyReview` 都会 `version++`，所以每批都要把**已加载的所有行**的宽度重算一遍。越往下滚，每批越慢，整趟滚动是 O(n²)。实测从头滚完 branch 的 `code` 组：227 批，单次重建从 7ms 涨到 85–115ms（node，7787 项）。cpu-prof 显示 `items` 共占 10.15s，其中 `contentWidth`/`columns` 占 8.80s（87%），`buildItems` 本身只有 0.84s。换算到 QuickJS，组尾单次重建约 1.0–1.7s（12–15×），按 30–50× 算是 2.6–5.8s，都在一次 render 里完成，很可能被 Herdr 判为 interrupted。打开「整文件」也一样：`dist/server.js` 有 48441 行，`contentWidth` 在 node 里要 33ms，之后**每次**重建都会再付一遍。
   - **修法：** 行对象在多次重建之间是同一个对象（`apply` 会保留旧 hunks，`pairRows` 也只引用原来的行），所以把结果缓存在行上就行，改 `rows.js:L18` 一行：`row ? (row.columns ??= Math.min(MAX_COLUMNS, row.tokens.reduce(...))) : 0`。重建就只剩 `buildItems` 那约 10%。
   - **如果不修：** 大组滚到后半段时，每来一批行，pane 都会卡一秒以上，或者直接报 interrupted。

2. **aside 每次 render 都画出组内全部文件** (`extras/mods/review/files.js:L43`, `files.js:L49-101`)
   - **这是什么：** 宽度 ≥1024 时（独占一个 tab 的 pane 通常满足），diff 旁边有个 aside。`fileTree()` 每次 render 都对组内**每个**文件生成一行（每行约 9 个元素），同时还要重建 `byPath` Map（全部 1554 个文件）和 `fileRows` 树，然后放进一个不虚拟化的 `overflow_y_scrollbar()`。
   - **问题：** 实测 branch 的 `code` 组（1164 文件）aside 一次就有 10766 个元素，占整次 render 11415 个元素的 94%。aside 单项在 node 里要 5ms，QuickJS 下约 60–75ms（30–50× 算是 150–250ms），这还没算 gpui 对上万个元素做布局的时间。compare 的 `docs` 组（626 文件）是 6435 个元素。render 触发得很频繁：滚动时 150ms 的 scroll spy 一变就 `notify`，每批 rows 到达、每次 hover 分组 tab（`tip.js` 的 `hoverKept`）也都会触发，所以滚动时 JS 线程基本一直满载。
   - **修法：** 行高本来就固定 28px，直接用仓库里现成的 `scrollList`（`extras/mods/review/list.js:L35`，提交菜单已经在用），只画视野里约 25 行：`scrollList(view, "review-files", { count: rows.length, row: 28, draw: (i) => drawRow(rows[i], i) })`，把现在 `rows.map` 的回调体原样挪进 `drawRow`。
   - **如果不修：** 打开大组以后，任何一次重绘都要构建和布局上万个元素，滚动 diff 会一直卡。

## Should fix

3. **每批 rows 都是一次完整的 review 读，载荷九成以上是重复的元数据** (`extras/mods/review/review-load.js:L52-65`；daemon `pulls.review/packages/cli/src/daemon/review.ts:L288-341`)
   - **这是什么：** pane 要几个文件的行时，发的是带 `rows: [paths]` 的 `/api/review`。daemon 照常对整页重新 `source.fetch()`（L302）、做规则分组，再把**全部**文件的元数据、分组和提交一起返回，只是给其中几个文件附上 hunks。
   - **问题：** 实测滚完 branch 的 `code` 组发了 227 次读，每次 0.56–1.0MB，daemon 每次耗时 0.43–0.66s；滚完 compare 的 `docs` 组发了 109 次读，每次 0.44–0.63MB、0.68–1.10s。只要 1 个文件行的那次读也有 558KB，基本全是那 1554 个文件的元数据。pane 每次还要对这几百 KB 做 `JSON.parse`、`applyReview` 里两次 `said()` 序列化（全部文件）和合并旧 hunks，cpu-prof 里 `applyReview` 合计 0.47s。而且请求在飞的时候不会再发下一批（`!this.loading`），所以用户每批都要看 0.5–1.1s 的「Loading…」。
   - **修法：** daemon 的 `/api/review` 收到非空 `rows` 且没有 `firstRows` 时，只回 `{ files: [{ path, sha, hunks }] }`。pane 对这种回包按 `path`+`sha` 把 hunks 挂到现有文件上，再 `version++`，不走 `apply`。daemon 约 5 行，pane 约 8 行，`plans/fork/04`、`05` 的契约要同步改。
   - **如果不修：** 在大仓库里滚一遍，要传上百 MB、占 daemon 几分钟 CPU，每批行都要等半秒到一秒。

4. **commit 页上，每批 rows 读完都会再把 base 分支整读一遍** (`extras/mods/review/review-load.js:L74`, `review-load.js:L150-156`)
   - **这是什么：** 单个 commit 的页面里，提交列表要从 base 页取，所以每次读成功后都会调用 `loadBaseCommits`，对 base 发一次 `rows: []` 的完整读。
   - **问题：** rows 分批读也会触发它。实测在 `/commit/SAMPLE_COMMIT`（191 文件，`tests` 组）里滚动：3 批 rows（289KB、93KB、551KB，各约 0.2s）后面各跟了一次 `/branch/sample-feature` 的整读，每次 550KB、daemon 0.38–0.47s，比这批 rows 本身还大、还慢。提交列表不会因为加载了几个文件的行就变。
   - **修法：** `review-load.js:L74` 改成 `if (!rows.length) loadBaseCommits(view, cx);`。打开、文件监听和 15s 定时这几种读都不带 rows，所以新提交照样会进列表。
   - **如果不修：** 在大分支的单个 commit 里滚动，daemon 负载和流量会翻倍以上。

5. **「整文件」按钮在标成 Too large 的文件上也能点，真实数据回包超过 8MB** (`extras/mods/review/diff.js:L80`)
   - **这是什么：** 文件头上的「整文件」按钮由 `canFull()` 决定是否出现，它只排除了已删除文件和二进制文件。daemon 判为 `truncated`、在 diff 里显示「Too large to show」的文件，照样有这个按钮。
   - **问题：** 实测 branch 页有 5 个 truncated 文件。`dist/large-bundle.js` 的 `/api/review/file` 回了 **10.84MB**（84888 行），超过单个响应 8388608 字节的上限。`dist/server.js` 回了 7.79MB（48441 行），刚好压线；它在 node 里 parse 53ms、`clipRows` 57ms、`contentWidth` 33ms，QuickJS 下约 1.7–2.1s（30–50× 是 4–7s），而且宽度这部分以后每次重建都要再算（见第 1 条）。
   - **修法：** `canFull` 加上 `&& !file.truncated`，一行。diff 都放不下的文件，整文件只会更大。
   - **如果不修：** 在打包产物上点这个按钮，要么报超限错误，要么卡几秒并有 interrupted 的风险。

原审查结论（基线时）： 先修 1 和 2。
**未检查：** gpui 对上万个元素做布局、绘制的真实耗时（没在 demo 窗口里实跑，只有元素数）；daemon 每次读的 0.4–1.1s 里 `git diff` 和高亮各占多少；网页版对 truncated 文件是否也禁用整文件；只在默认 unified、tree 布局下测过，split 会让 `contentWidth` 跑三遍，第 1 条只会更重。

## 测过但不报的

- **scroll spy 每 150ms 一次：** 列表最深处（7562 项）`spied()` 在 node 里约 0.5ms。用同样的循环在 QuickJS 里校准后约 1–2ms，占 150ms 周期不到 2%，不值得改。
- **render 里的 `head()`、`rowsWanted()`、`groupStats`：** 都是 O(文件数)，但实测各 ≤0.03ms，可以忽略。
- **8MB 上限和分批：** 按 pane 的 `rowsToAsk` 在三页真实数据上模拟，最大一批是 1.06MB（compare 的 `docs/quantity-takeoff/tasks.json`）；每改动行最多 1.2KB（`.jsonl`），3000 行约 3.7MB，在上限以内。
