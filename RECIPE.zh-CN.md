# Herdr T3

> 中文译本。给 agent 构建用的正本是 [RECIPE.md](RECIPE.md)，两者不一致时以英文为准。

Herdr App 的一个安静、近似 T3 Code 的窗口：左侧 256px 侧栏，可在 Lists（Spaces + Agents）和带 T3 式 Settle 的 Inbox 之间切换；窄标签栏；圆角窗格带小标题栏；还有 Agent 模式，用一个铺满的 agent 代替当前标签。全部使用主题自身的颜色，只有 agent 需要你时才醒目。

![Herdr T3](preview.png)

## 你看到什么

从左到右，分隔线 1px `border`：

- **侧栏**（256px，同 T3，最小 208，最大 480；拖动边缘可调整宽度；`chrome` 背景），从上到下：
  - **品牌栏**（40px，可拖动窗口，给 macOS 窗口按钮留位置）：右侧两个 26px 按钮：侧栏模式（`circle-check` 图标：显示 Inbox；`layers`：显示 Lists）、隐藏侧栏。
  - **列表**，二选一（stack）：
    - **Lists**：Spaces 和 Agents，1:1 分割（各至少 90px）。Spaces：彩色方形头像带 space 首字母；worktree 折叠在其主 checkout 下，带树线；机器多于一台时按机器分组；名字后面只显示不寻常的 git 信息（`repo · branch ↑2 ↓1`，省略 `main` / `master`）。Agents：按 space 分组或按优先级（排序菜单），置顶的在 `Pinned` 组，子 agent 带树线缩进在父级下；14px 状态标记靠右。
    - **Inbox**：T3 侧栏。需要你的 agent 显示为卡片，底部是折叠的 Working 和 Settled 收纳区。Active 按回到你手上的时间排，Working 按本轮开始时间，Settled 按 Settle 时间，同时间按 address；停止工作的 agent 在 Working 多留 2 秒（blocked 立即离开，置顶或已 Settle 的不留），之后排到 Active 顶部；马上续跑、等你处理后再继续，都不挪位；查看卡片不改变顺序（见 `mods/t3-inbox`；[单独 mod 的 recipe](https://github.com/JinJieBeWater/herdr-t3-focus/blob/main/RECIPE.zh-CN.md) 有完整说明）。
  - **底栏**（41px，上边框）：一行 Settings；App 更新就绪时带一个 6px `accent` 圆点。
- **工作区**：
  - **标签栏**（40px，可拖动窗口）：当前 space 的标签，28px 胶囊（圆角 6，当前标签 `selected`）：程序图标、名字（没人命名的标签按下面的命名规则显示其中的 agent，没有 agent 就显示当前 pane），工作中显示转圈，blocked 显示 `!` 徽章，done 且未看显示 7px `done` 圆点；当前标签有关闭 `×`。然后是 26px 的视图切换按钮（`square` 图标：只看一个 agent；`layers`：显示标签）和 `+`（`tab.new`：在当前 space 开终端标签）。Agent 模式下胶囊换成一条 agent 栏：程序图标、agent 名（`foreground`）、所在 space（`dim`）、状态标记。Windows 上有窗口按钮。侧栏隐藏时，最左边出现侧栏开关，同时统计 agent：blocked、working、done。
  - **工作主体**（内边距 2/8，间距 8），二选一（stack）：
    - **窗格**，即当前标签：圆角 8，`background` 填充，聚焦边框 2px，默认关闭（`focus.color` 为 `background`，改成 `accent` 即显示；平时的边框也是 2px，颜色同 `background`，所以聚焦时终端不会变尺寸），单个窗格也带框。每个窗格顶部有 28px 标题栏：程序图标、agent 名或终端标题（13px 中粗，聚焦时 `foreground`）、目录、状态标记，以及右分屏、下分屏、缩放/取消缩放、关闭按钮（悬停时出现）。
    - **Agent 模式**：一个 agent 的终端铺满显示，`background` 填充，圆角 8，无标题栏。
  - 底部留 6px；布局里有自带的 `workspace-status` 状态栏，但隐藏。
- **新建菜单**（`t3-new-menu`，520×420 弹层，位于顶部）：选一个 space 开终端标签（`tab.new`），或 New space（`space.new`）；`⌘1…` 按编号选 space。

## 它怎么表现

- **终端地址**：窗格标题和 Agents 列表的行（子 agent 也是）在名字前用 `dim` 色显示终端地址，程序改了标题也能分清；名字就是地址时只显示一次。
- **名字**，各处（Inbox 卡片、agents 列表、标签、窗格标题）一条规则，写在 `mods/t3-inbox/name.js`，用到它的 mod 各放一份副本：先用 Pi 会话名（`pi.session` 标签）；agent 再看有人命名过的标签名；然后是有意义的终端标题（按程序只去掉该 agent 自带的标记：Pi 的 `π - … - <目录>`、OpenCode 的 `OC | `；不是路径、不含 `user@host`、不是程序自己的名字、不只是目录名或 space 名，比如 Codex 和未命名的 Pi）；最后是程序名。
- **agent 状态**，各处（agents 列表、标签、窗格标题、Inbox 卡片）标记一致：working：`working` 色转圈；blocked：14px 圆角 `!` 徽章，底色为 15% 不透明的 `blocked`；done：7px `done` 圆点（Inbox 里是绿色 `Done`）；idle：agents 列表里是圆环，其余位置不显示。父级连同仍在运行的子 agent 一起判断，规则写在 `mods/t3-inbox/tree.js`，用到它的 mod 各放一份副本：自己或任一子 agent blocked 即 blocked（失败结束的一轮，即终端状态 `error`，视为 blocked：`agents()` 没有这个状态，从 `terminals()` 读）；否则自己有未读的 done 即 done；否则自己或任一子 agent working 即 working；否则用自己的状态。子 agent 的 done 是父级的消息，不算它自己的。
- **侧栏模式**：品牌栏按钮或 `cmd-shift-b`（`t3-chrome.sidebar`）对 stack `sidebar-lists` 执行 `layout.select`（`lists` / `inbox`）。显示 Inbox 时，标签栏和侧栏开关的计数里不再显示已 Settle agent 的完成圆点。
- **Spaces**：单击切换（agent view 下改为显示该 space 的 agent，优先当前 tab 的；没有 agent 时回到 tabs。那里单独 `space.select` 不起作用，视图会停在所显示 agent 的 space），右键打开自带 `menu`，拖动排序；悬停 checkout 的头像时它变成 worktree 的折叠箭头。只在 git 可能变化时读取（新位置、命令或轮次结束、机器重新连上），窗口在前台时另有慢速兜底轮询。
- **Agents**：单击执行 `agent.focus`（标签模式下聚焦那个窗格；Agent 模式下选定显示哪个 agent），Inbox 卡片相同。和 Herdr 自带的 agents 列表一样，每行在状态前显示当前状态持续的时间（`<1m`、`5m`、`3h`、`2d`），悬停时这个位置换成置顶按钮（布局不动）；父级在时间前显示折叠箭头（默认折叠，折叠后带淡色数量）；blocked 或出错的子 agent 仍显示在它下面，缩进一级。已结束 agent 的折叠记录会被清掉。你正在看的 done agent 留在 Done 组，直到你离开。
- **Inbox / Settle**：悬停已结束的卡片出现 `✓ Settle`；悬停已 Settle 的行出现撤销箭头；有新工作（working、blocked，或 Settle 后又结束过一轮）自动回来。`cmd-shift-s`（`t3-inbox.settle`）对当前查看的 agent 做同样的事：已结束且未置顶的，像按钮一样 Settle 并跳到下一张；已 Settle 的则取回。不做自动 Settle。拖动照 T3 侧栏（`Sidebar.drag.ts`、`Sidebar.pointer.ts`）：按住卡片或行移动 6px 即拿起（Working 卡片、Settle 变更还没从 Core 回来的行除外）。拿起的副本（`selected` 底色、1px `accent` 边框、大阴影）只上下移动，按下的位置始终在鼠标下，限制在列表内、Pinned 标签以下；右上角换成松开后动作的标记：`Pin`、`Unpin`、`Settle`、`Un-settle`（accent 描边和 10% 底色），原地不动时不显示。只在拿起期间，24px 的 `Pinned` 和 `Active` 标签（12px 中粗加 1px 细线，作为目标时 `accent`）以 150ms ease-out 的高度过渡展开，Settled 标题也会显示（即使为空），平时 `foreground`，作为目标时 `accent`。每行放在 lane 里：上方一个间隙、行本身和 2px 间距，最后一行之后再有一个间隙；拿起的行移向别处后原位收起。落点的间隙张开到目标分区的行高：Pinned 和 Active 为卡片高 + 2（拿起的卡片自身高度，或最近测得的卡片高度），Settled 为 30px。Pinned 保留手动顺序（置顶卡片上半部放在它上面，下半部放在下面）；Active 和 Settled 按各自排序（取消 Settle 或 Settle 后排最上，取消置顶回到按时间的位置）。Active 或 Settled 为空、或 Settled 折叠时，显示 36px 虚线占位，作为目标时 accent。Settled 始终一页：移出一行时下一行补上，Settle 进来一行时最后一行隐藏。在侧栏内任意处松开都落在间隙处；Herdr 不上报侧栏外的松手，所以按离开方向决定：从上下边缘离开（按最后的鼠标位置取最近的边）就按标记落下，和 T3 越过列表两端仍保留最后目标一致；Esc（只在拿起期间侧栏持有键盘）、从左右两侧离开或拿起的行从列表消失都会放回原处；松开不会打开那一行。Settle 当前正在看的 agent 时切到下面一张卡片，到底则从顶部绕回，同 T3。划选：按住卡片的 `✓ Settle` 或已 Settle 行的撤销箭头划过同一分区的多行，标记整段，松开即全部 Settle（或取回）。置顶卡片不论状态都按置顶顺序留在顶部，空间头像后有 pin 图标，不提供 Settle 按钮。置顶存在共享状态 `agents.pins`，与 t3-agents 共用。
- **标签**：单击选中，双击改名，拖动排序，右键菜单，滚轮切换上/下一个标签（Agent 模式下切换 agent）。
- **Agent 模式**：切换按钮或 `cmd-shift-a`（`t3-tabs.view`）对 stack `view` 执行 `layout.select`（`main` / `agent`）。它让键盘停在这个 agent 上，所以会落到看不见的地方的操作都会退回标签模式：当前 space 新出现的 shell 或 mod 窗格（分屏、新标签；随后对它执行 `pane.focus`）、从新建菜单打开的标签（`t3-new-menu` 先退出 Agent 模式）、用键盘把焦点移到 shell。新出现的 agent 窗格不抢画面；用键盘把焦点移到 agent 窗格时改为显示那个 agent。
- 置顶、折叠、排序、筛选和收纳区状态按屏幕保存（`localStorage` / 共享状态 `agents.sort`、`space.colors`）。

## 由什么构成

- `layouts/herdr-t3.json`：根为 `row` → `sidebar` 列 [`brand` 块 `t3-chrome`；`sidebar-lists` stack [`lists` 列 [`spaces` `t3-spaces`、`agents` `t3-agents`]、`inbox` `t3-inbox`，props `{ "newMenu": "t3-new-menu" }`]；`sidebar-footer` `t3-chrome`，props `{ "footer": true }`]，以及 `work` 列 [`tabs` `t3-tabs`；`work-body` 行 [`view` stack，默认 `main` [`main` `{ "tab": "active", "pane": { "header": { "content": { "mod": "t3-pane" } } } }`、`agent` `{ "agent": "focused" }`]]；`work-bottom-inset`；`status` `workspace-status`，隐藏]。预览图：`layouts/herdr-t3.svg`。
- Mods：`t3-chrome`、`t3-spaces`、`t3-agents`、`t3-tabs`、`t3-pane`、`t3-new-menu` 分别改自 Herdr 自带的 `workspace-chrome`、`spaces`、`agents`、`tabs`、`pane`、`new-menu`；`t3-inbox` 是新写的。原样使用的自带 mod：`workspace-status`、`picker`、`menu`，以及 `mods/workspace-chrome/` 下的图标和 `mods/pane/close.svg`。
- `keys.json`：`layout:herdr-t3` → `cmd-shift-b`：`t3-chrome.sidebar`，`cmd-shift-a`：`t3-tabs.view`，`cmd-shift-s`：`t3-inbox.settle`（只在 Inbox 显示时生效）。
- 运行的程序：`t3-spaces` 运行只读的 `git status` / `git rev-parse`（不加可选锁、不用 fsmonitor）和 `hc machine ls --json`；`t3-inbox` 运行 `hc label <agent> settled=<ms>:<turn>`。

## 注意

- `t3-tabs` 和 `t3-chrome` 用 `find(layout(), "sidebar-lists")` 找 stack；保留节点 id `sidebar`、`sidebar-lists`、`lists`、`inbox`。同样，`t3-tabs` 和 `t3-new-menu` 找 `view` 及其子节点 `main`、`agent`；没有它就没有切换按钮。
- 只有品牌栏那份 `t3-chrome` 监听 `nextCommand()`；底栏那份没东西可切换。
- Agent 模式下 Herdr 确实会新建分屏或标签并聚焦过去，但画面停在 Agent 模式，agent 块还会退回显示别的 agent：输入进了一个谁也看不到的窗格。`t3-tabs` 在 `render` 里发现新窗格和焦点变化（它始终在布局里），而不是逐个拦截命令，所以快捷键、命令面板和 `hc` 都一样覆盖。
- 窗口不重绘时（在后台）mod 的 `render` 不会执行：要在窗口位于前台时测试 Agent 模式的退出。
- 碰到 index 的 git 命令会再次唤醒目录监听：始终带上 `--no-optional-locks -c core.fsmonitor=false`。
- Settle 标签大约 0.65 秒后才出现在 `terminals()`：要保留待定值。
- macOS 无标题栏时，侧栏隐藏或很窄，标签栏要给窗口按钮留位置（`layout().traffic_lights`）。
- `mods/t3-spaces/check-sidebar.cjs` 和 `mods/t3-pane/check-pane.cjs` 用假的 `herdr` 加载 mod；要在已安装的 home 里用 `node` 运行，因为它们在那里找自带图标。

## 完成标准

- 每个 `mods/t3-*` 都通过 `herdr-app check`，`layout.switch {"name": "herdr-t3"}` 显示上面描述的窗口。
- `node mods/t3-spaces/check-sidebar.cjs` 和 `node mods/t3-pane/check-pane.cjs` 输出各自的通过行。
- `cmd-shift-b` 在 Lists 和 Inbox 之间切换侧栏。
- `cmd-shift-a` 只显示一个 agent；点侧栏卡片就显示那个；在其中分出一个 shell，会退回标签模式并聚焦到这个 shell。
- 对当前查看的已结束 agent 按 `cmd-shift-s`，它被 Settle 并显示下一张卡片；对已 Settle 的再按，它回来。
- 在 Inbox 里 Settle 一个已结束的 agent，它移入 Settled，标签上的完成圆点消失；再给它发提示，它回来。
- worktree space 折叠显示在它的 checkout 下；远程机器有自己的分组标题。
