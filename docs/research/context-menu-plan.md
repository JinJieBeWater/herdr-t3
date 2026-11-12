# 右键菜单统一方案

日期：2026-11-11。状态：已实施（分支 `context-menu`），与方案的出入见文末「实施时的调整」。图示：[context-menu-design.html](context-menu-design.html)。

## 现状问题

右键菜单都由 `t3-menu` 绘制，但打开方式和内容各写各的：

| 问题 | 位置 |
|---|---|
| 不少有操作的行没有右键：Inbox 卡片和 slim 行、Agents 的 agent 行和子 agent 行、Spaces 未打开的 checkout 行和机器标题、Inbox 的 space 筛选行 | `t3-inbox/row-view.js:153,202`、`t3-agents/rows.js:86,256`、`t3-spaces/main.js:252,365`、`t3-inbox/filter.js:46` |
| 打开时的处理不一致：有的停止事件冒泡、收起详情卡、清掉悬停高亮，有的不做；高度有的传 260、有的不传 | `t3-spaces/main.js:139`、`t3-agents/rows.js:318`、`t3-tabs/main.js:439` |
| agent 菜单的内容由调用方算好再传进来（只有标签栏标题这样做），以后接到卡片和 Agents 行上就会出现三份逻辑 | `t3-tabs/main.js:511-518` |
| 分隔线按命令名写死（`.close`、`app.help`、`t3-tabs.settle`…），新增一项就要改这张表 | `t3-menu/main.js:184` |
| `global` 菜单（New space、Keybinds、四个主题）在布局里没有任何入口 | `t3-menu/main.js:98` |

## 规则

依据：[ADR 0001](../adr/0001-trade-off-order.md)（外观照 T3，行为以省注意力为先）、[ADR 0002](../adr/0002-inbox-rules-stay-in-inbox.md)、[t3-tokens](../internals/t3-tokens.md)，以及 T3 的 `buildThreadActionMenuItems` 和项目文件夹菜单（`Sidebar.tsx`）。

1. **覆盖**：侧栏和标签栏里代表一个对象（agent、space、checkout、机器、标签、窗格）的行或项，右键打开这个对象的菜单。只是按钮的不加（`+`、侧栏开关、品牌栏、Home 入口），弹层里的列表不加。
2. **同一对象同一菜单**：在哪里右键都是同一份内容，由 `t3-menu` 根据目标的当前状态算出；调用方只传是哪个对象，不传算好的选项。唯一的变量是 Inbox 或 Lists（ADR 0002）。
3. **右键的行为**：在指针处打开，宽 220，最高 260；停止冒泡，不选中、不切换、不拿走键盘；收起悬停详情卡，清掉悬停高亮。标题的 `⌄` 和点击标题打开的是按钮菜单，仍挂在标题下方 4px，内容相同。
4. **分组和顺序**照 T3 线程菜单的结构，组与组之间加分隔线，空组不画：
   1. 去处：New tab、Open、New space here、Split、Zoom
   2. 状态：Pin、Settle、Snooze 或 Wake
   3. 改名和复制：Rename、Copy address、Copy path、Send back、Send right-clicks
   4. Worktree：New worktree、Open worktree
   5. 结束：Close、Close pane、Remove worktree（放最后）
5. **措辞**：只写动词，对象就是右键的那个东西（Rename、Close）；窗格菜单保留 `Close pane`，在终端上右键时要和标签区分。可切换的项写执行后的状态：Pin / Unpin、Settle / Un-settle、Snooze / Wake。只有会再弹出对话框的项带 `…`（`Custom…`）。
6. **不可用的项不显示**，不像 T3 那样置灰：菜单越短越省注意力（ADR 0001）。
7. **图标**：和别处执行同一动作的按钮用同一个图标（卡片上的 check、undo、alarm-clock，Agents 的 pin、pin-off）；新图标放进 `t3-menu/icons/`。
8. **危险色**：只有会删数据的 `Remove worktree` 用 `ansi1` 文字色，不填色块（t3-tokens 规则 4）。`Close` 在有程序运行时本来就会先确认，所以照 T3 的 Archive 用普通颜色。
9. **数值**不变，沿用 t3-tokens 里的「菜单面板」和「菜单行」：面板内边距 4、圆角 8，行高 28、横向 8、间距 8、字号 14、圆角 4，图标 16，快捷键 12 中粗 `dim`，分隔线 1px `border`、横向 8、纵向 4。

## 各对象的菜单

`[]` 表示满足条件才显示。

| 对象 | 打开位置 | 菜单项 |
|---|---|---|
| **Agent（Inbox）** | Inbox 卡片、Inbox slim 行、标签栏的标题和父级（右键或 `⌄`） | [Pin / Unpin] · [Settle / Un-settle] · [Snooze ▸ / Wake] ┃ [Rename] · Copy address · [Send back to ‹父级›] ┃ [Close] |
| **Agent（Lists）** | Agents 的 agent 行、子 agent 行 | [Pin / Unpin] ┃ [Rename] · Copy address · [Send back to ‹父级›] ┃ [Close] |
| **Space** | Spaces 行、Agents 的 space 分组、面包屑里的 space、Inbox 的 space 筛选行 | New tab ┃ Rename · Copy path ┃ [New worktree · Open worktree] ┃ [Remove worktree] · Close |
| **Checkout（未打开）** | Spaces 里变暗的仓库行 | Open ┃ Copy path |
| **机器** | Spaces 的机器标题 | [New space here] · [Connect] |
| **标签** | 标签 | New tab ┃ Rename ┃ Close |
| **窗格** | 终端、窗格标题栏、zoom 后的窗格分段、mod 卡片（例如 Review） | [Split right · Split down · Zoom] ┃ Copy address · Send right-clicks to pane / Use Herdr right-click menu · [Send back to ‹父级›] ┃ [Close pane] |
| **Snooze 子菜单** | Agent 菜单的 Snooze | 不变：预设时间 ┃ Custom… |

各项的显示条件：

- Pin：子 agent 不显示（置顶只针对顶层 agent）。
- Settle：agent 或它的子 agent 在 working / blocked 时不显示（和现在的标题菜单一样）。已 settle 的显示 Un-settle。
- Snooze：blocked 和 mod 卡片不显示（和卡片按钮的 `canNap` 一样）；已 snooze 的显示 Wake。
- Rename：agent 是所在标签里唯一的顶层 agent，并且标签名不是 Pi 起的（和现在标题菜单的条件一样，改由 `t3-menu` 计算）。
- Send back：是被单独放出来的子 agent，并且父级还在。
- Close：agent 有所在的窗格时显示，走 `t3-tabs.close-pane`，和 × 一样先确认、先离开。
- Connect：机器断开或需要重建时显示。

## 实现形状

```diff
 shared/
+├── menu.js            # openMenu(view, mod, kind, target, cx)：停止冒泡、清悬停、在指针处 220×260 打开
 mods/t3-menu/main.js
-  items(p, git)        # 每种菜单各自拼数组，分隔线看命令名
+  items(p, git)        # 每项带分组号，组变化时画分隔线
+  agentItems(address, mode)   # 由 agents()/terminals()/pins/tree 现算，三个入口共用
+  case "checkout" | "machine"
-  case default (global)        # 删除：没有入口
 mods/t3-inbox/         # 卡片和 slim 行右键；菜单 mod 名来自新 prop `menu`，没有时不开（单独发布的 Inbox 没有 t3-menu）
 mods/t3-agents/rows.js # agent 行和子 agent 行加右键，space 分组改用 openMenu
 mods/t3-spaces/        # checkout 行和机器标题加右键；命令 reconnect:<machine>
 mods/t3-tabs/main.js   # 标题菜单只传 address；四处右键改用 openMenu
+  命令 settle:<addr> wake:<addr>   # 菜单的 Settle、Un-settle、Wake，带 Undo；后台的不跳 Home
 mods/t3-pane/main.js   # 改用 openMenu
 layouts/herdr-t3.json  # t3-inbox props 加 "menu": "t3-menu"
 scripts/sync.sh        # share menu、pins、tree、sidebar 到用到它们的 mod
```

`t3-menu` 是 Herdr `menu` 的克隆，`global` 分支是继承下来的。主题有 Herdr 的 Settings，New space 有 `+` 和 New，Keybinds 有自己的快捷键，所以删掉这个分支，不另找入口。

## 不做

- 收纳区标题和 Agents 的分组标题：只能折叠；Settled 的 Clear 已经是可见按钮，做一个只有一项的菜单没有意义。
- Actions 的 ▶：T3 的同类按钮也没有右键，编辑走 ⌄ 菜单里的齿轮。
- 标签栏空白处、Home、品牌栏和页脚按钮、各种弹层列表。
- Copy 子菜单（T3 的 Path / Branch / Thread ID）：先只做 Copy address 和 Copy path，有需要再加。
- 多选菜单（T3 的 `Settle (N)`）：布局没有多选。
- extras 里的 review 和 pulls-review：发布在单独的仓库，另开一轮。
- 键盘打开菜单（Shift+F10 或 Menu 键）：要先确认 Herdr 会把这些键交给 mod，确认后再加到键盘模式的停靠点上。

## 验证

- `t3-menu/check-menu.cjs`：每种对象在各种状态下的菜单项、分组和顺序；Inbox 和 Lists 的差别。
- 各 mod 的 check：每个入口右键时，用 `openMenu` 的参数打开，并且事件不冒泡。
- Demo 窗口：用 `herdr-app do` 带上 props 直接打开每种菜单，在默认侧栏宽度下截图。真实的右键点击 demo 驱动不了，会标为未验证。

## 文档

RECIPE 两种语言、CHANGELOG 两种语言、`docs/user/guide` 两种语言（右键能做什么）。`t3-inbox` 的新 prop 写进 RECIPE 的 layout 一节。

## 实施时的调整

- **去掉 Filter by**：Inbox 的筛选状态存在 `t3-inbox` 自己的 `localStorage` 里，`t3-menu` 和标签栏都读不到，没法判断该写 Filter by 还是 Show all spaces。要做的话，得先把筛选状态登记成共享键（`docs/internals/storage.md`）。
- **Mod 卡片用窗格菜单**：Review 这类卡片代表的是一个窗格，所以用 `pane` 菜单（Split、Zoom、Close pane），不再单独给一份「卡片动作」菜单。
- **面包屑里的父级和变暗的标题用 agent 菜单**：它们代表 agent，按「同一对象同一菜单」改用 agent 菜单，不再用它的窗格菜单。agent 菜单的 Close 同样只关这个 agent 的窗格。
- **命令**：Settle 和 Un-settle 走 `t3-tabs.settle:<address>`。后台的 agent 被 settle 时不跳回 Home，正在看的 agent 和按快捷键一样离开。Wake 走 `t3-tabs.wake:<address>`。都由一直显示的 `t3-tabs` 处理，和标题菜单原来的做法一致，没有给 `t3-inbox` 加命令。
- **机器标题**：已连接或 core 已重建时才有右键（New space here、Connect）。睡着的机器两项都没有，不打开空菜单。
