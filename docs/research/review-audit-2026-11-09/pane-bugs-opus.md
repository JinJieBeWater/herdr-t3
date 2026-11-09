# Review pane 正确性审计（2026-11-09）

> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1 项：已修，见本仓库 `f0100f7`、后续补修 `9e1c66f`。
- 第 2–5 项：分别已修于 `d2c2ff2`、`125d459`、`7f16a15`、`417acd4`。

---

范围：`extras/mods/review/*.js`，看 HEAD `06439d7` 的状态机、异步竞态、定时器和 watch 循环、边界情况。性能不在范围内。今天已修的 5941585、e3dd293、7761eb1、a1c9773、06439d7/a1691c2 不重复报。

假定负载：一个人在本机用，仓库可能很大（实测 `/branch/sample-feature` 1554 个文件、7 个组）。

**这部分代码做什么：** Review pane 从 jin.review daemon 读一页 diff（分组、文件、reviewed 标记），只为视野里和后面 10 个文件要 rows（高亮后的代码行），每次读取最多 3000 行改动。它还管理翻页、换 worktree、AI 分析轮询、标记 reviewed、整文件视图、设置面板，并用 `watchFolder` 和定时器在仓库改动后重读。

复现方法：把 `check-pane.cjs` 前 160 行（假环境）复制到 `/tmp`，加一个可控的假 daemon：40 个文件，每个 500 行；第一次打开按 `firstRows` 给 f0–f5 的 rows。真实数据用只读的 `POST /api/review` 和 `GET /api/agents`、`GET /api/settings` 测量。

## 必须修

1. **一次读取失败或被丢弃后，那些文件永远停在 “Loading…”，Retry 也救不回来**（`review-load.js:L54`、`L70`、`L82-L89`；`main.js:L292`、`L323`）
   - **是什么：** `asked` 记下“已经要过 rows 的文件版本（sha）”，防止同一个文件反复要。`rowsToAsk` 会跳过这些文件。
   - **问题：** sha 在**发出请求时**就记进 `asked`，不是在 rows **到达时**。只要这次回答没被用上，这些文件就再也不会被要。只有翻页（`open()`）或换主题会清掉 `asked`。实测两种触发：
     - (A) 滚到 f20，pane 要 `["f20"…"f25"]`，daemon 返回 502。点 Retry，请求的是 `["f26"…"f31"]`；f20 `hunks` 仍为空，列表一直显示 “Loading…”；15 秒刷新之后还是一样。
     - (B) 同样要 f20–f25，回答还没回来时按 `r` 或点勾选框标记 f0。回答被 `if (view.marking || marks !== view.marks) return` 丢掉，之后的读取只要 `["f26"…"f31"]`，f20–f25 永远是 “Loading…”。在大仓库里一边滚动一边勾选很常见：一次读取在 QuickJS 里要解析约 1 MB JSON，窗口不短。
   - **修法：** 在 `loadReview` 里记一个 `applied`，`apply(r)` 之后设为 true；在 `finally` 里如果没用上，就把本次的 sha 从 `view.asked` 删掉。再给 `main.js:L292` 的自动读取加上 `&& !this.error`，这样 daemon 挂掉时不会一直重试，交给 Retry 和 15 秒刷新去重读。大约改 4 行。
   - **不修的后果：** 大 diff 里勾选或碰到一次 daemon 出错，就有一段文件再也看不到，只能切到别的页再切回来。

2. **新内容在旧的滚动位置打开**（`review-load.js:L136-L145`）
   - **是什么：** `apply` 只有在 `switching`（从一个已显示的页翻到另一页）时，才调用 `scroll.scroll_to_item(0)` 回到顶部。
   - **问题：** 另外三种情况也会换成一份全新的列表，但都不回顶部。`VirtualListScrollHandle` 会跨帧保留位置（见 `gpui-kit.d.ts` 里的说明），所以新列表停在旧的偏移处。Harness 输出：
     - 在 worktree A 滚到 f20，Review bar 让同一个 pane 打开 worktree B：`render` 先 `forget()`，`switching` 为 false，`scroll_to_item` 调用为 `[]`。普通翻页时为 `[["scroll",0]]`。
     - 翻页失败（`forget()`），再点 Retry 成功：`scroll_to_item` 调用为 `[]`。
     - 往下读时 AI 分析跑完，组从 `g` 换成 `ai-1`：`scroll_to_item` 调用为 `[]`。旧组不存在后，`groupKey` 换成了第一组。
     结果是新列表从中间开始，组头（只在 `atTop()` 时显示）也看不到。
   - **修法：** 把回顶部和换组放在一起，删掉 L145：`if (!r.groups.some(g => g.key === view.groupKey)) { view.groupKey = r.groups[0]?.key ?? null; view.scroll.scroll_to_item(0); }`。`forget()` 会把 `groupKey` 置空，所以翻页、换 worktree、失败后重试都会走这一行。净改动 0 行。
   - **不修的后果：** 换 worktree 或分析完成后，用户看到的是另一份列表的中段，以为内容不全或跳错了地方。

## 应该修

3. **同一个 pane 来回切 worktree，watch 循环越积越多**（`review-load.js:L25-L37`；`main.js:L270`）
   - **是什么：** `watchReview` 对每个 root 跑一个 `await watchFolder(root)` 循环，循环条件是 `view.watching === root`。换 root 时 `render` 把 `watching` 设为 null。一个 space 只有一个 review pane，它可能先后显示几个 worktree（`pulls-review/open.js` 的 `herdr()`）。
   - **问题：** 从 A 切到 B，A 的旧循环还停在 `watchFolder(A)`，要等 A 下一次有改动才会醒。在那之前切回 A，`watchReview(A)` 又起一个新循环。旧循环醒来时 `watching === "A"` 又成立，于是两个循环都活着。Harness：A→B→A 之后，A 改动 3 次触发了 6 次 `refresh`，最后仍有 2 个 A 的 watch 在等。每切一个来回多一个，pane 关闭前不会减少。每次改动都会让每个循环各跑一次 `git check-ignore`。
   - **修法：** 让循环认一个对象，不认字符串：`if (view.watching?.root === root) return; const me = view.watching = { root }; while (view.watching === me) …`，循环里的 `view.watching === root` 也改成 `=== me`。改 3 行。
   - **不修的后果：** 来回切几次以后，每次存盘都跑 N 次 git 和 N 次刷新；读取有合并（`again`），所以界面不会出错，但浪费会一直增长。

## 可以修

4. **daemon 重启后第一次打开设置，6 秒后会清掉正在输入的模型搜索，并撤回刚选的值**（`settings.js:L28-L30`）
   - **是什么：** 每次打开设置面板，`loadSettings` 都用 `Promise.all` 一起读 `/api/agents` 和 `/api/settings`，回来后整体覆盖 `view.shared`，并清空模型输入框。
   - **问题：** 实测 `/api/agents` 冷启动要 6006 ms，之后有缓存，只要 5 ms；`/api/settings` 是 60 ms。daemon 重启过（升级，或 pane 的 `connect()` 自己拉起）而 pane 还开着时，上一次读到的 `view.agents` 还在，所以 Model 行马上可点。用户在 6 秒内进入 Model 页输入 “son”，回答一到，输入被清空。如果这期间选了语言或模型，乐观更新会被旧的 settings 覆盖：daemon 已经存下了新值，面板却显示旧值，直到下次打开。
   - **修法：** settings 单独读、单独赋值，不等 agents：`request(root, "GET", "/api/settings").then(s => { view.shared = s; cx.notify(); })`。删掉 L30 的 `set_value("")`，关闭面板和返回上一页时本来就会清空。
   - **不修的后果：** 偶尔出现，打的字被吞掉或显示旧值，不会丢数据。

5. **空 diff 显示 “No files in this group”**（`diff.js:L176`；`review-load.js:L142`）
   - **是什么：** 没有可显示的条目时，列表区域显示这句话。
   - **问题：** 实测 `/compare/sample-feature...sample-feature` 返回 `files: 0, groups: []`，`groupKey` 为 null，列表为空，于是在没有任何组的情况下说“这个组里没有文件”。表头同时显示 `+0 −0 0/0`、一个画满的进度圆环和 “Analyze with AI”。
   - **修法：** `.child(view.review.files.length ? "No files in this group" : "No changes to review")`，一行。
   - **不修的后果：** 只是措辞误导，没有其他问题。

原审查结论（基线时）：先修 1 和 2。

已排除（查过，没报）：单文件 rows 超过 8 MB 上限。daemon 会把超大文件截断成 `hunks: []`（这个分支有 5 个），实测未截断的最大文件 7461 行，1.34 MB；首次打开的读取约 1.04 MB。`/worktree` 的整文件读取工作区内容（`core/src/local/source.ts` 的 `loadFile`）。`select`、`step`、`toggleFull` 在翻页时的守卫，以及 0 个组、只有子组时的 `asideGroup`，都没发现问题。

未检查：第 2 条只在 harness 里证明没调用 `scroll_to_item`，没有在 demo 窗口里截图确认偏移确实保留。rows 分批到达后，视野上方的文件从一行 “Loading…” 撑开，内容是否跳动，取决于 GPUI 按像素还是按条目锚定滚动，没有窗口无法确认。空 diff 上点 “Analyze with AI” 会不会真的跑一次付费分析，没有调用 analyze，未验证。
