# Herdr T3 审查 · 角度 C：视觉层级与重心

基线：`fc7f6c3`（工作树干净）。`scripts/check.sh` 输出 `all checks passed`。

演示窗口：`stage.sh up` 克隆 GitHub 时 SSL 失败（`SSL_ERROR_SYSCALL`）。按 AGENTS.md 的离线做法，在 `/private/tmp` 里 `git clone` 了一份本仓库，把它的 `repos.sh` 改成从本机的 herdr-t3-inbox / herdling / pulls-review / pi-stuff 克隆，再加了只用假 agent 的场景 `scene-c.sh`、`scene-c2.sh`。`DEMO=/private/tmp/herdr-t3-demo-C`，窗口在内建屏 6 号工作区，用户自己的 Herdr 和焦点没动。layout / actions / review 三个场景要真 pi 和 OpenCode Go key，我没把你的 key 复制进去，所以没跑。截图都是默认侧栏宽度 256、zoom 1.1、catppuccin-mocha。

截图（`/tmp/herdr-t3-review/shots/`）：
`01-inbox.png` Inbox 场景 · `02-inbox-states.png` 各状态卡片 · `03-inbox-done.png` 未读 done · `04-lists.png` Lists（`04-crop-agents.png`、`04-crop-tabs-right.png` 是放大图）· `05-lists-hidden.png` / `06-inbox-hidden.png` 隐藏侧栏 · `07-home.png` Home · `08-picker.png` Go to · `09-new.png` New · `10-crop-top.png` Lists 下 blocked 窗格头 · `11-crop.png` Actions 菜单 · `12-review-bar.png` 带 Review 栏的布局 · `14-crop.png` 展开的 Settled

## 必须修

无。没有看到状态标记被盖住、层级颠倒或 token 明显越界这类会误导人的问题。

## 应该修

### 1. Inbox 卡片第三行总写 `main`

- **是什么**：卡片第三行的 meta 取的是窗格的原始分支名（`mods/t3-inbox/row-view.js:54`、`:76`），`main`、`master` 也照样显示。
- **问题**：`02-inbox-states.png` 里 8 张卡有 7 张第三行只写 `main`。布局在 Spaces 里已经定过规则：「master/main go: nearly every space is on one」（`mods/t3-spaces/main.js:436-444`）。Inbox 是按注意力组织的视图，这一行没有任何信息，却让每张卡从 60px 涨到 78px（`row-view.js:160-176`）。按预期负载几十个 agent 算，侧栏列表区约 810px，扣掉收纳区后，三行卡（加间隔 83）放 9 张左右，两行卡（65）能放 12 张，同一屏多出约 28%。程序图标也被挤到第三行，没法和标题对齐。
- **最小修法**：`row-view.js:74` 计算 meta 时，用和 Spaces 相同的条件去掉 `main` / `master`。详情卡（`:60`）照旧显示完整分支。`:172` 已经处理了「没有 meta 时图标回到标题行」，不用另改。
- **不修的后果**：Needs you 卡片一多就要滚动才能看全，卡片越多，越是在最需要省注意力的时候浪费它。

## 可以更好

### 2. Agents 按优先级显示时，名字后面多出一个暗色「‥」

- **是什么**：在按优先级分组和 Pinned 组里，行名后面跟一段 12px 暗色的 space 名：`where` 设了 `flex_shrink(1000)` 并 `truncate`，和名字之间隔 10px（`mods/t3-agents/rows.js:215-217`、`:242`）。
- **问题**：剩余宽度只有几个像素时，space 名被截得只剩半个省略号。`04-crop-agents.png` 里「Wire the done dot ‥」「Split pane header ‥」后面的就是它，读不出意思，像渲染残留。剩余宽度为 0 时，这 10px 的 gap 仍然占着，名字又少 10px：默认宽度下名字只剩约 115px（「Reproduce the L…」）。
- **最小修法**：把 `where` 文字换成 12px 的 `projectMark`。它宽度固定，不会被截断，悬停提示写 space 名，和 Inbox 卡片、Spaces 用同一个标记。或者干脆去掉，悬停详情卡已经列出了 space。
- **不修的后果**：几十行里会零星出现这种「‥」或「he…」碎片，Lists 本来就不宽的名字列也一直被它占掉 10px。

### 3. Settled 收纳区标题里，`Clear` 一直贴在计数旁边

- **是什么**：只要有可清理的行，`Clear` 就画在标题行里计数的左边（`mods/t3-inbox/list-view.js:127-143`、`:149`），收纳区折叠时也一样。T3 的 Settled 标题没有这个按钮（`SidebarListMarkers.tsx` 和 `Sidebar.tsx` 里都没有 Clear）。
- **问题**：`02-crop-bottom.png` 里这一行读起来是「Settled … Clear 2 ›」。`Clear` 和计数字号、颜色相同，挨得又近，像是计数的标签。而且这是一个会结束多个终端的操作，平时一直摆在外面。RECIPE 里其他「做整行不做的事」的按钮（Settle、pin、撤销）都只在悬停时出现。
- **最小修法**：只在收纳区展开或标题行悬停时显示 `Clear`（用 `view.open || view.overShelf === "settled-header"` 包住 `clearButton`）。
- **不修的后果**：底部常驻一个读不清的「Clear 2」，和 Working 的计数行对不齐，干扰快速扫一眼计数。

### 4. Lists 下标签溢出时，边缘标签的状态标记被裁掉

- **是什么**：标签条只保证当前标签可见（`mods/t3-tabs/main.js:453-466`），其余标签在 `tab-scroll` 边缘直接裁掉。状态标记在标签末尾的 16px 槽里（`:613`）。
- **问题**：`04-crop-tabs-right.png` 里最右边的「A very long tab…」是 blocked 标签，`!` 正好落在被裁掉的部分；最左边的标签被切在字中间（`10-crop-top.png` 里的「ab ba… ◌」）。在 Lists 下，标签栏本来是要显示全部标记的。
- **最小修法**：成本最低的是 `tab-scroll` 两侧有被裁掉的标签时，在边缘画一个 8px 渐隐（`chrome` 色），让人知道还有内容。要连标记一起露出来，就得在边缘汇总被隐藏标签里最紧急的那个状态，那是新功能，先不建议做。
- **不修的后果**：Agents 列表仍然会显示 Needs you，所以不会漏掉，只是标签栏上的提示不完整。

### 5. Lists 的 Spaces : Agents 默认 1:1

- **是什么**：`layouts/herdr-t3.json:39` 和 `:46` 两个块都是 `weight: 1`。
- **问题**：`04-lists.png` 里 5 个 space 只用了上半区不到 60%，下面一大片空白；Agents 只露出 Needs you、Done 和一部分 Working，Idle 组完全看不到。预期负载是几个 space、几十个 agent，比例正好反过来。
- **最小修法**：改成 `1 : 2`（Spaces 仍至少 90px）。分隔条可以拖，所以这只是默认值的问题。
- **不修的后果**：每个新用户第一次打开 Lists，都得自己去拖分隔条。

### 6. 在 Home 打开 Go to 或 New，Home 的按钮从弹层下面露出来

- **是什么**：Home 的三个按钮在窗格里垂直居中（`mods/t3-home/main.js:51-52`）；Go to 和 New 距顶部 96、最高 420，并且没有遮罩，这是 t3-tokens 里写明的「做不到」。
- **问题**：窗口高约 1000 时，弹层下缘正好落在按钮列中间。`08-picker.png` 和 `09-new.png` 里，Home 的「Go to ⌘P / New tab ⌘T」紧贴在弹层 footer 下面露出半截，看起来像弹层的一部分，footer 自己也有一个 New tab。Home 自己的 Go to / New tab 按钮打开的正是这两个弹层，所以每次在 Home 用它们都会碰到。
- **最小修法**：Home 的列表改成在窗格上部 1/3 处（例如 `justify_start` 加 `pt` 约 35%），或者往下挪到弹层最大高度以下（96 + 420 = 516）。都不需要遮罩。
- **不修的后果**：只是不好看，不影响操作。

## 做得好、不该动

- **token**：圆角只用了 4、6、8、16，例外的 3（12px 徽章，按比例缩小）、5（logo）、12（日历，对应 T3 的 `rounded-xl`）都有出处。详情卡的 `p(12)`、圆角 6 正好是 T3 `TooltipPopup` 加 `ThreadHoverCard` 内边距的结果。Go to 的 footer 是 14px medium，和 T3 的 `CommandFooter` 一致。
- **层级**：状态标记全局一套，blocked 用 15% 琥珀底的徽章，从截图取色确认过。Working 卡片和行用 70% 透明度退后，Needs you 和 Done 用 medium 加 foreground 突出；隐藏侧栏后的计数把三种状态压成一行。Inbox 下标签栏不显示标记，Home 保持安静。这几处主次都清楚，不该动。

**没检查到的**：需要真实指针的悬停态（提示、详情卡、标签的 ×、窗格头按钮、Settle / Snooze 控件、拖动）；Review 栏的计数（只在活动窗口里读，要借焦点，我没借）和 review 窗格本身；真 pi 的 layout / actions / review 场景；浅色主题；窗口宽度低于 1024 时控件收起文字的样子；多机器分组、子 agent 树线；Snooze 菜单和 Custom 对话框。
