# 更新日志

[English](CHANGELOG.md) · 中文

## 2026-11-05

### 跳转：程序，以及回到上一处

- `cmd-p` 和 Inbox 的 Search 打开布局自己的跳转（`t3-picker`，改自 Herdr 的 picker），画法同新建菜单：T3 的命令面板，两行的行带 space 标记、程序和状态标记，底部是按键提示。每个窗格一行，名字和图标与窗格标题、标签一致，不再按标签列出 Herdr 自己的标签名：输入 `lazygit` 回车，就跳到那个窗格，不管它旁边有没有 agent、在哪个 space。标签名只有你命名过才参与搜索。ctrl+d 关闭这个窗格，有程序在运行时先确认。
- 第一行回到你上次从这里跳走前的窗格，打开时就选中它，所以 `cmd-p`、回车就能来回切换。
- Pi 退出后，终端不再沿用旧的 Pi 会话名：在原处启动的 lazygit，标签和窗格标题都显示 lazygit。
- 更新时：把 `mods/t3-picker` 也复制过去，并把 `"cmd-p": "mod.open:t3-picker"` 加进 `layout:herdr-t3` 的快捷键。

### Inbox：找回 review

- 独立标签里的 review 和 agent 一样有卡片：分析时在 Working，结束后回到 Active 顶部。从任何 space 点它都能回去，`cmd-]` 和 `cmd-[` 也会走到它。Settle 就是关闭，已审标记和分析结果都会保留，可以从 Review 栏重开。
- agent 旁边的 review 获得焦点时，点亮那个 agent 的卡片，快捷键从它继续走。
- Review 栏的菜单分成 Commits 和 Branches 两页，点击或按 Tab 切换，两者不再混在一起。分支行显示最后一条提交、比默认分支多几个提交和时间；悬停时出现和提交一样的卡片，另外列出作者、与上游的差距，以及它检出在哪个 worktree。
- 退出 Herdr 时正在分析的 review，重启后不再一直转圈到你打开它：Review 栏启动时清掉这个状态，还在跑的分析几秒内会重新显示。

### 动作和 Review 成为独立 mod

- 动作移出 `t3-tabs`，成为单独的 mod `mods/t3-actions`，随布局一起提供，也[单独发布](https://github.com/JinJieBeWater/herdr-t3-actions)给其他布局用。它属于更新时要覆盖的 `mods/t3-*`；已有的动作会保留。
- 单独发布的 Inbox 仓库改名为 [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox)，和里面的 mod 同名；旧的 herdr-t3-focus 地址会自动跳转过去。mod 仍叫 `t3-inbox`，已装的不受影响。
- pulls.review 扩展改成 Review 栏（`extras/mods/pulls-review`）和评审窗格（`extras/mods/review`），配合 [pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo) 的 `jin.review` 使用；也[单独发布](https://github.com/JinJieBeWater/herdr-pulls-review)了一份。它仍是可选的，见 README 的可选扩展。

### 视觉

- 悬停提示和 T3 一样在控件上方打开，卡片上的提示不再挡住标题。上方放不下的（品牌栏、标签栏及其中的 Actions 和 Review 栏、Inbox 筛选）仍在下方打开。
- 标签照 T3 的面板标签：24px 高，放得下时显示完整名字。放不下时最长的先让步，当前标签降到 240px、其他降到 144px，再放不下就滚动，并保持当前标签可见。名字很短的标签至少 96px，`Pi` 这样的标签不再只有一条。
- 侧栏底栏改成一排图标按钮。
- 新安装时先显示 Inbox。
- 悬停标签时图标不再变化：`×` 改到标签末尾，盖住状态标记，悬停提示里加上状态文字。这里和 T3 不同，T3 是图标变成 `×`。每个标签都为这个位置留出宽度，悬停时宽度不变。
- Active 为空时留白，和 T3 一样，不再显示 `Nothing needs you.`。只有整个列表为空才居中提示；筛选后没有内容时，提示里会写出空间名。
- 窗格背后改用和标签栏相同的 `chrome`：在 `canvas` 不同色的主题里，窗格上方不再露出一道 2px 窄条。Herdr T3 自带主题的外观不变。

### 交互

- 悬停标签时，图标变成 ×，并用一个安静的悬停提示显示完整名字，时机与 Inbox 行一致。
- 工作区窄于 1024px 时，动作和 Review 栏收成图标和数字。
- mod 窗格可以给所在的标签和窗格标题栏提供标题、图标和状态；评审窗格就这样显示分析状态。
- `cmd-]` / `cmd-[` 照 T3 在 Inbox 里走：按画出来的行的顺序，到两端停住；折叠的区只算当前查看的那一行。显示 Lists 时照旧用 Herdr 的 `agent.next`。更新后，在 `keys.json` 的 `layout:herdr-t3` 分区加上 `"cmd-]": "t3-chrome.next"` 和 `"cmd-[": "t3-chrome.prev"`。
- **Snooze**，照 T3：鼠标移到卡片上，点时钟打开菜单（In 1 hour、In 3 hours、This evening、Tomorrow、Next week、Custom…）。agent 进 Snoozed 收纳区等待，到点回到原位并标 `Woke`；需要你时会提前出现，撤销、Wake 或把它拖出收纳区都能立刻叫回。
- 已置顶的卡片也能 Settle，和 T3 相同：Settle 会取消置顶，Undo 放回原位。
- 查看没有自己行的子 agent 时，点亮它父 agent 的卡片，Settle 也作用在这张卡片上。
- 关闭标签或窗格时，里面有程序在运行就先确认，空 shell 直接关闭：包括 × 和 `cmd-w` / `cmd-shift-w`。更新后，把仓库 `keys.json` 里的 `cmd-w`、`ctrl-alt-shift-x`、`cmd-shift-w`、`ctrl-alt-x` 四行加进你的 `layout:herdr-t3` 分区。Agent 和右键菜单的关闭不变。

### 修复

- 折叠或展开收起区时，区标题和行一起滑动，卡片不会再从它上面滑过。
- 撤销提示条里的 Undo 改成中粗，悬停时加下划线，和 T3 一致。
- 窗格标题栏里的长名字会用满标题栏的空间，不再止于 260px。

## 2026-11-04

一大堆修复和视觉打磨，更贴近 T3 Code。

### 远程机器

- **添加机器**：侧栏底部 Settings 那一行末尾的服务器图标，Lists 和 Inbox 里都有。
- **重连**：重建过的机器会显示 Connect，用原来的名字重新配对；配对失败会留在列表里并写明原因。
- 机器标题上的 `+` 和 New space there 会在那台机器上新建 Space，本机也一样。
- 其他机器上的 Inbox 卡片带服务器图标，悬停显示机器名，和 T3 一样。
- New 菜单会标出远程 Space，新建 Space 时先问建在哪台机器上。
- Space 图标在它所在的机器上查找。

### 视觉

- Space 显示仓库自己的 favicon；没有的话，按名字从 T3 的 18 种颜色里取色，在同色浅底上显示首字母，不再是实色方块上的白色首字母。中文名显示第一个字。
- Inbox 里需要你处理、已完成或正在看的标题会亮起，其余变暗。
- 卡片的程序图标和机器图标放到第三行末尾，标题独占一行。
- 已 Settle 的条目开头显示项目图标。
- 悬停按钮时，图标和文字一起变亮。
- 窗格按钮不再把标题栏挤动。

### 交互

- 所有图标和控件悬停都会显示 T3 风格的提示，带快捷键和补充说明；靠近窗口底部时向上弹出。
- 悬停 Inbox 条目，旁边会淡入它的详情，条目上的时间和按钮交叉淡入淡出。
- Inbox 条目会滑到新位置，新条目淡入、移除的淡出；拖放松手后从松手处滑回。
- Settle 和 Unpin 之后显示撤销提示，持续 5 秒。
- New 菜单改成 T3 命令面板的样式：只列 Space，列表跟着高亮项滚动，New space 和快捷键提示放在底部。
- 菜单、对话框和拖动行为统一：每个菜单都能用方向键，Clear 通过 Herdr 自带的确认框确认，拖动中的标签页变半透明，指针离开即结束拖动。

### 修复

- Space 的顺序和 `ctrl-N` 跟随嵌套显示，挂在主仓库下的 worktree 和快捷键顺序一致（来自 Herdr 官方 spaces mod 的修复）。
- 关掉 Clear 的确认框后，按钮不再一直亮着。
- pulls.review 扩展：不再弹出 Opening… 提示。

### 移除

- agent view。更新后从 `keys.json` 删掉 `"cmd-shift-a": "t3-tabs.view"`。
