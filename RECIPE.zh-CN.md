# Herdr T3

> 中文译本。给 agent 构建用的正本是 [RECIPE.md](RECIPE.md)，两者不一致时以英文为准。

Herdr App 的一个安静、近似 T3 Code 的窗口：左侧 256px 侧栏，可在带 T3 式 Settle 的 Inbox（默认显示，T3 只有这一种侧栏）和 Lists（Spaces + Agents）之间切换；窄标签栏；圆角窗格带小标题栏。全部使用主题自身的颜色，只有 agent 需要你时才醒目。

![Herdr T3](preview.png)

## 你看到什么

从左到右，分隔线 1px `border`：

- **侧栏**（256px，同 T3，最小 208，最大 480；拖动边缘可调整宽度；`chrome` 背景），从上到下：
  - **品牌栏**（40px，可拖动窗口）：同 T3，26px 的隐藏侧栏按钮在最左，紧跟 macOS 窗口按钮，和侧栏隐藏时标签栏里的开关同一个位置，所以不会跳动；最右是 26px 的侧栏模式按钮（`circle-check` 图标：显示 Inbox；`layers`：显示 Lists）。
  - **列表**，二选一（stack）：
    - **Lists**：Spaces 和 Agents，1:1 分割（各至少 90px）。Spaces：每个 space 的标记（见下）；worktree 折叠在其主 checkout 下，带树线；机器多于一台时按机器分组；名字后面只显示不寻常的 git 信息（`repo · branch ↑2 ↓1`，省略 `main` / `master`）。Agents：按 space 分组或按优先级（排序菜单），置顶的在 `Pinned` 组，子 agent 带树线缩进在父级下；14px 状态标记靠右。
    - **Inbox**：T3 侧栏。需要你的 agent 显示为卡片，底部是折叠的 Working 和 Settled 收纳区。Active 按回到你手上的时间排，Working 按本轮开始时间，Settled 按 Settle 时间，同时间按 address；停止工作的 agent 在 Working 多留 2 秒（blocked 立即离开，置顶或已 Settle 的不留），之后排到 Active 顶部；马上续跑、等你处理后再继续，都不挪位；查看卡片不改变顺序（见 `mods/t3-inbox`；[单独 mod 的 recipe](https://github.com/JinJieBeWater/herdr-t3-focus/blob/main/RECIPE.zh-CN.md) 有完整说明）。
      - 卡片：同 T3，当前查看、需要你处理或已完成时标题突出（`foreground`，medium），其余退后（`muted`，normal）；悬停只提亮颜色。程序图标（60% 透明度）和远程机器标记放在第三行行尾，没有第三行时放在标题行行尾。
      - 已 Settle 的行：同 T3，一行 30px，行首是项目的 16px 标记（和卡片的头像一样，未点亮时半透明），然后是标题和 Settle 后经过的时间；悬停时时间换成撤销箭头。
      - 卡片和已 Settle 行的详情：同 T3 的线程卡片，用 `Popup` 挂在行右侧 4px、和行顶部对齐：标题，然后是项目、其他机器的名字、分支和程序，12px，最宽 320px。时序同 T3 的 tooltip 分组：第一张等 150ms；有卡片开着或刚关不到 400ms 时，下一张和行内控件的提示都立即出现；关闭没有延迟。第一张和最后一张有 150ms 淡入淡出，立即出现的没有。实色底加 `shadow_xl`：T3 的玻璃效果靠背景模糊，mod 做不到。行内控件点亮、拖动或点击这一行时隐藏。
  - **底栏**（40px），同 T3：一排 32px 纯图标按钮（圆角 8，16px 图标，悬停前为 `dim`）：Settings，以及打开官方 `machine-add` 的 server 图标；Herdr 下载好更新后，最右出现 `Update` 胶囊（15% `accent` 底、12px `accent` 字），点击重启进入新版（`app.update`）。
- **工作区**：
  - **标签栏**（40px，可拖动窗口）：当前 space 的标签，照 T3 的面板标签：24px 高、12px 字、宽度取决于完整名字，放得下就全部显示；放不下时最长的先让步，当前标签降到 240px、其他降到 144px，再放不下就滚动（圆角 6，当前标签 `selected`）：12px 程序图标（没有程序时用终端图标），悬停标签时它变成关闭 `×`；然后是名字（没人命名的标签按下面的命名规则显示其中的 agent，没有 agent 就显示当前 pane），工作中显示转圈，blocked 显示 `!` 徽章，done 且未看显示 7px `done` 圆点。然后各自占一个块，块宽跟着内容自动调整：你加了 Review 栏的话先是它（`pulls-review` mod，见 README），然后是动作控件（[herdr-actions](https://github.com/JinJieBeWater/herdr-actions) mod：`▶ <名字> | ▾` 外面一圈 1px `border` 描边，没有动作时是 `▶ Add action`），最后是标签栏末尾：26px 的 `+`（`tab.new`：在当前 space 开终端标签），Windows 上再加窗口按钮。侧栏隐藏时，最左边出现侧栏开关，同时统计 agent：blocked、working、done。
    - 标签的详情，悬停时：和 Inbox 行同一张卡片（`details.js`，t3-inbox 那份的副本），挂在标签下方，距左下角 4px：完整名字，然后是项目、其他机器的名字、分支和程序。时序也相同；按下标签或状态标记点亮时隐藏。
  - **窗格**（内边距 2/8，间距 8），即当前标签：圆角 8，`background` 填充，聚焦边框 2px，默认关闭（`focus.color` 为 `background`，改成 `accent` 即显示；平时的边框也是 2px，颜色同 `background`，所以聚焦时终端不会变尺寸），单个窗格也带框。每个窗格顶部有 28px 标题栏：程序图标、agent 名或终端标题（13px 中粗，聚焦时 `foreground`）、目录、状态标记，以及右分屏、下分屏、缩放/取消缩放、关闭按钮（悬停时出现）。
  - 底部留 6px；布局里有自带的 `workspace-status` 状态栏，但隐藏。
- **新建菜单**（`t3-new-menu`，576 宽弹层，位于顶部）：选一个 space 开终端标签（`tab.new`）；`⌘1…` 按编号选 space。当前 space 排最前，同一机器的 space 排在一起；显示 6 行后滚动，滚动跟随高亮。每行第二行是目录，远程 space 前面加服务器图标和机器名，和 T3 标记远程 thread 的方式相同。底部 footer 放按键提示，右侧是 New space（`space.new`）：有多台机器时先选机器，和 T3 的 Add project 先选 environment 相同（未就绪的机器置灰且不可选，`← Spaces` 返回）。`⌘N` 不询问，直接用当前 space 的机器。

## 它怎么表现

- **终端地址**：窗格标题在名字前用 `dim` 色显示终端地址，程序改了标题也能分清；名字就是地址时只显示一次。侧栏不显示，那里的宽度留给名字。
- **Space 标记**，照 T3 Code 画项目的方式（`ProjectFavicon`），写在 `mods/t3-inbox/project.js`，t3-spaces 和 t3-new-menu 各放一份副本：优先用项目自己的图标（Inbox 卡片和 New 16px，Spaces 18px，圆角 25%），照 T3 的方式在 space 当前所在位置（第一个终端的目录，否则是创建时的目录）的仓库根目录查找：先按顺序找 T3 的常见文件（`favicon.svg`、`public/favicon.ico` … `.idea/icon.svg`；不含 `.icns`），再看页面里的 `<link rel="icon">` 或路由里的 `{ rel: "icon", href }`。找到后复制到 `cache/t3-icons/`（图片只能从 App 目录显示；按内容命名），通过 `space.icons` 共享；找到的 10 分钟后重查，没找到的 1 分钟后重查。没有图标就用文字头像：和 T3 的两个字母不同，只取名字的第一个字母或数字并大写（`herdr-t3` → `H`，`智能算量` → `智`），粗体等宽，字号是标记的 0.64，颜色按名字从 T3 的 18 色里哈希取（暗色主题用 Tailwind 400，亮色用 600），底色是同色 14%。名字里没有可拼的字（`~`）时显示文件夹。`space.colors` 也写入同样的颜色（600），给官方的 picker 用。
- **名字**，各处（Inbox 卡片、agents 列表、标签、窗格标题）一条规则，写在 `mods/t3-inbox/name.js`，用到它的 mod 各放一份副本：先用 Pi 会话名（`pi.session` 标签）；agent 再看有人命名过的标签名；然后是有意义的终端标题（按程序只去掉该 agent 自带的标记：Pi 的 `π - … - <目录>`、OpenCode 的 `OC | `；不是路径、不含 `user@host`、不是程序自己的名字、不只是目录名或 space 名，比如 Codex 和未命名的 Pi）；最后是程序名。
- **agent 状态**，各处（agents 列表、标签、窗格标题、Inbox 卡片）标记一致：working：`working` 色转圈；blocked：14px 圆角 `!` 徽章，底色为 15% 不透明的 `blocked`；done：7px `done` 圆点（Inbox 里是绿色 `Done`）；idle：agents 列表里是圆环，其余位置不显示。父级连同仍在运行的子 agent 一起判断，规则写在 `mods/t3-inbox/tree.js`，用到它的 mod 各放一份副本：自己或任一子 agent blocked 即 blocked（失败结束的一轮，即终端状态 `error`，视为 blocked：`agents()` 没有这个状态，从 `terminals()` 读）；否则自己有未读的 done 即 done；否则自己或任一子 agent working 即 working；否则用自己的状态。子 agent 的 done 是父级的消息，不算它自己的。
- **侧栏模式**：品牌栏按钮或 `cmd-shift-b`（`t3-chrome.sidebar`）对 stack `sidebar-lists` 执行 `layout.select`（`lists` / `inbox`）。显示 Inbox 时，标签栏和侧栏开关的计数里不再显示已 Settle agent 的完成圆点。
- **动作**：[herdr-actions](https://github.com/JinJieBeWater/herdr-actions) mod，详见它自己的 recipe。和 T3 Code 的项目动作一样，但是全局的：主动作是上次运行的那个，没有就是第一个。`▶` 运行它；菜单里点一行就运行那个动作并把它设为主动作；齿轮打开编辑器。运行用 `terminal.open { argv: ["sh", "-c", command], name, place, folder? }`：每次都新开标签或右/下分屏，以动作名命名；命令结束后 shell 保留。没填目录时在当前终端的目录启动；焦点在 mod pane 上时（比如 agent 旁边的 review），用同一标签里终端的目录，再没有就用 space 的目录；`~` 会展开。动作存在 `shared("t3-actions")` = `{ list: [{ id, name, command, icon, place, cwd? }], last }`，Herdr 重启后仍保留。
- **Spaces**：单击切换，右键打开自带 `menu`，拖动排序；有 worktree 的 checkout 在行尾显示折叠箭头，和父 agent 一样（折叠后带淡色数量）。space 的实际顺序跟随这些行，折叠的也算（`space.move`），所以 `space.next` / `space.prev` 和 `ctrl-1…` 按列表显示的顺序走。只在 git 可能变化时读取（新位置、命令或轮次结束、机器重新连上），窗口在前台时另有慢速兜底轮询。
- **Agents**：单击执行 `agent.focus`，Inbox 卡片相同。和 Herdr 自带的 agents 列表一样，每行在状态前显示当前状态持续的时间（`<1m`、`5m`、`3h`、`2d`），悬停时这个位置换成置顶按钮（布局不动）；父级在时间前显示折叠箭头（默认折叠，折叠后带淡色数量）；blocked 或出错的子 agent 仍显示在它下面，缩进一级。已结束 agent 的折叠记录会被清掉。你正在看的 done agent 留在 Done 组，直到你离开。
- **Inbox / Settle**：悬停已结束的卡片出现 `✓ Settle`；悬停已 Settle 的行出现撤销箭头；有新工作（working、blocked，或 Settle 后又结束过一轮）自动回来。`cmd-shift-s`（`t3-inbox.settle`）对当前查看的 agent 做同样的事：已结束且未置顶的，像按钮一样 Settle 并跳到下一张；已 Settle 的则取回。不做自动 Settle。拖动照 T3 侧栏（`Sidebar.drag.ts`、`Sidebar.pointer.ts`）：按住卡片或行移动 6px 即拿起（Working 卡片、Settle 变更还没从 Core 回来的行除外）。拿起的副本（`selected` 底色、1px `accent` 边框、大阴影）只上下移动，按下的位置始终在鼠标下，限制在列表内、Pinned 标签以下；右上角换成松开后动作的标记：`Pin`、`Unpin`、`Settle`、`Un-settle`（accent 描边和 10% 底色），原地不动时不显示。只在拿起期间，24px 的 `Pinned` 和 `Active` 标签（12px 中粗加 1px 细线，作为目标时 `accent`）以 150ms ease-out 的高度过渡展开，Settled 标题也会显示（即使为空），平时 `foreground`，作为目标时 `accent`。每行放在 lane 里：上方一个间隙、行本身和 2px 间距，最后一行之后再有一个间隙；拿起的行移向别处后原位收起。落点的间隙张开到目标分区的行高：Pinned 和 Active 为卡片高 + 2（拿起的卡片自身高度，或最近测得的卡片高度），Settled 为 30px。Pinned 保留手动顺序（置顶卡片上半部放在它上面，下半部放在下面）；Active 和 Settled 按各自排序（取消 Settle 或 Settle 后排最上，取消置顶回到按时间的位置）。Active 或 Settled 为空、或 Settled 折叠时，显示 36px 虚线占位，作为目标时 accent。Settled 始终一页：移出一行时下一行补上，Settle 进来一行时最后一行隐藏。在侧栏内任意处松开都落在间隙处；Herdr 不上报侧栏外的松手，所以按离开方向决定：从上下边缘离开（按最后的鼠标位置取最近的边）就按标记落下，和 T3 越过列表两端仍保留最后目标一致；Esc（只在拿起期间侧栏持有键盘）、从左右两侧离开或拿起的行从列表消失都会放回原处；松开不会打开那一行。Settle 当前正在看的 agent 时切到下面一张卡片，到底则从顶部绕回，同 T3。划选：按住卡片的 `✓ Settle` 或已 Settle 行的撤销箭头划过同一分区的多行，标记整段，松开即全部 Settle（或取回）。置顶卡片不论状态都按置顶顺序留在顶部，空间头像后有 pin 图标，不提供 Settle 按钮。置顶存在共享状态 `agents.pins`，与 t3-agents 共用。
- **Inbox 动画**，照 T3（`Sidebar.motion.ts`）：行的顺序或所在区变化时（Settle、取消 Settle、一轮结束、拖动放下），挪了位置的行从原位滑过去（收起区标题、Show more 和 Active 为空时的提示也一起滑，和 T3 的列表标记一样，行不会从它们上面滑过），新行从上方 40px 淡入（上面有留下来的行时跟着它走），离开的行在原位淡出；150ms ease-out，拖动中或一次超过 40 行时不播。拖动放下的行从松手处滑到落点。悬停时，时间和 Settle/撤销按钮交叉淡变；working 卡片平时 70% 不透明度，悬停或正在查看时恢复；已 Settle 行的项目标记平时 40%。Herdr 只给元素“之后的变化”补间，所以移动的行换一个新 id，先在原位画一帧再放手。
- **当前查看的行**，照 T3 的 route row：所在区折叠或排在 Settled 当前页之外时仍然显示；查看的是没有自己行的子 agent（区块、peek）时，点亮最近一个列出的祖先；从别处切到一个被空间筛选隐藏的 agent 时，筛选放宽为全部空间并保存（首次绘制不会，查看期间自己选的筛选也保持不变）。Herdr 不能用代码滚动普通列表（只有虚拟列表可以），所以和 T3 不同，不会把它滚进视野。
- **撤销提示条**，照 T3：Settle 和取消置顶后，在第一个收起区标题上方显示 `Settled 2 agents, Undo` 5 秒（200ms 淡入淡出）；连续同一种操作合并计数；Undo 让它们回到原样，不算新消息。不绑快捷键：⌘Z 留给终端。
- **关闭**，照 T3 的 `confirmTerminalClose`：标签和窗格的 ×，以及上面的快捷键，都交给标签栏的 `t3-tabs`。有程序在运行时（`hc get`：前台不是它自己的 shell，或查询没有结果）打开自带的 `confirm`（400×170，照 T3：标题是 `Close tab "<名字>"?` / `Close pane "<名字>"?`，标题不换行，名字过长时截断；正文说明会结束什么）；没有程序在运行时直接关闭，这一点和总是确认的 T3 不同。space 的最后一个窗格交给 Herdr 自己的 `Close space?`。`tab.close` 和 `pane.close` 对 agent 不变；右键菜单和命令面板仍直接执行它们。
- **标签**：单击选中，双击改名，拖动排序，右键菜单，滚轮切换上/下一个标签。
- 置顶、折叠、排序、筛选和收纳区状态按屏幕保存（`localStorage` / 共享状态 `agents.sort`、`space.colors`）。

## 由什么构成

- `layouts/herdr-t3.json`：根为 `row` → `sidebar` 列 [`brand` 块 `t3-chrome`；`sidebar-lists` stack [`lists` 列 [`spaces` `t3-spaces`、`agents` `t3-agents`]、`inbox` `t3-inbox`，props `{ "newMenu": "t3-new-menu" }`]；`sidebar-footer` `t3-chrome`，props `{ "footer": true }`]，以及 `work` 列 [`tabs-row` 行（40px，`"resizable": false`，`chrome`）[`tabs` `t3-tabs`、`actions` `herdr-actions`，props `{ "block": "actions" }`、`tabs-end` `t3-tabs`，props `{ "part": "end", "block": "tabs-end" }`]；`work-body` 行 [`main` `{ "tab": "active", "pane": { "header": { "content": { "mod": "t3-pane" } } } }`]；`work-bottom-inset` 行 6px [`bar-measure` `t3-tabs`，props `{ "part": "measure" }`]；`status` `workspace-status`，隐藏]。预览图：`layouts/herdr-t3.svg`。
- Mods：`t3-chrome`、`t3-spaces`、`t3-agents`、`t3-tabs`、`t3-pane`、`t3-new-menu` 分别改自 Herdr 自带的 `workspace-chrome`、`spaces`、`agents`、`tabs`、`pane`、`new-menu`；`t3-inbox` 是新写的。`herdr-actions` 是单独的 mod，随布局一起安装。原样使用的自带 mod：`workspace-status`、`picker`、`menu`，以及 `mods/workspace-chrome/` 下的图标和 `mods/pane/close.svg`。
- `keys.json`：`layout:herdr-t3` → `cmd-shift-b`：`t3-chrome.sidebar`，`cmd-shift-s`：`t3-inbox.settle`（只在 Inbox 显示时生效），`cmd-]` / `cmd-[`：`t3-chrome.next` / `.prev`（由一直显示的 t3-chrome 处理，按 Inbox 写进 `shared("t3-inbox.rows")` 的 `{ order, view }` 走，照 T3 的 `resolveAdjacentThreadId`，不循环；显示 Lists 时用 `agent.next` / `.prev`）。 `cmd-w` 和 `ctrl-alt-shift-x`：`t3-tabs.close-tab`；`cmd-shift-w` 和 `ctrl-alt-x`：`t3-tabs.close-pane`。
- 运行的程序：`t3-spaces` 运行只读的 `git status` / `git rev-parse`（不加可选锁、不用 fsmonitor）和 `hc machine ls --json`，点重装机器的 Connect 时运行 `hc machine rm` 和 `hc machine add`；`t3-inbox` 运行 `hc label <agent> settled=<ms>:<turn>`；为 space 标记，`t3-spaces`、`t3-inbox`、`t3-new-menu` 运行 `git rev-parse --show-toplevel`、`sh -c` 文件检测和 `base64`（在 space 的机器上）。

## 注意

- `t3-tabs` 和 `t3-chrome` 用 `find(layout(), "sidebar-lists")` 找 stack；保留节点 id `sidebar`、`sidebar-lists`、`lists`、`inbox`。
- 悬停提示是 `mods/t3-inbox/tip.js`（用 `HoverCard` 照 T3 Code 的 tooltip 绘制：12px，标签加 `keys()` 读到的快捷键，可带一行暗色说明），各放一份副本。和 T3 一样，提示只用几个词说出控件的名字，控件本身有没有文字都可以加；第二行只用于看不出来的操作（Shift+click）。纯图标按钮和无文字标记（状态、机器）有提示，程序图标和图钉没有。贴窗口底部的传 `above`：`HoverCard` 不会自动翻转。`.tooltip()` 只收字符串，样式由外壳决定。
- 只有品牌栏那份 `t3-chrome` 监听 `nextCommand()`；底栏那份没东西可切换。
- 碰到 index 的 git 命令会再次唤醒目录监听：始终带上 `--no-optional-locks -c core.fsmonitor=false`。
- Settle 标签大约 0.65 秒后才出现在 `terminals()`：要保留待定值。
- macOS 无标题栏时，侧栏隐藏或很窄，标签栏要给窗口按钮留位置（`layout().traffic_lights`）。
- 窄窗口：`bar-measure`（`t3-tabs`，`part: "measure"`）放在 `work-bottom-inset` 里，工作列宽度小于 1024 逻辑像素（比 T3 的 768 大，因为这里控件要和标签共用一行）时把 `shared("bar.compact")` 设为 true，动作控件和 Review 栏随之去掉文字。放在这里测，是因为这条的宽度不受标签栏影响；测标签区的话，控件一收起标签区就变宽，又会展开。
- 动作通过 `sh -c` 运行：拿不到你 shell 的别名和函数（需要的话在命令里写 `zsh -ic '…'`），纯 Windows 也没有 `sh`。
- `herdr-actions` 和标签栏末尾（`t3-tabs`，`part: "end"`）自己调整所在块的宽度：`run("layout.resize", { id: props().block, px })`，宽度取 `on_size_change` 的值除以 `settings().zoom`（它报的是乘过缩放的像素）。`tabs-row` 要保持不可拖动，否则拖动会和它们抢宽度。布局引用了没安装的 mod 时，`herdr-app status` 会报 `no mod folder`：先装 herdr-actions。
- `mods/t3-spaces/check-sidebar.cjs` 和 `mods/t3-pane/check-pane.cjs` 用假的 `herdr` 加载 mod；要在已安装的 home 里用 `node` 运行，因为它们在那里找自带图标。 `mods/t3-new-menu/check-new-menu.cjs` 同样检查新建菜单，可在任意位置运行。
- 标签条让当前标签保持可见，移动量最小，和 T3 的 `scrollIntoView({ inline: "nearest" })` 一样。Herdr 的滚动容器不能由脚本移动，所以 `tab-scroll` 负责裁剪，`tab-strip` 用 `.ml()` 偏移；标签的完整宽度来自一份高度为 0 的名字副本，用 `on_size_change` 量出。只在当前标签或可用宽度变化时才移动，所以横向滑开的标签不会被拉回；滚轮仍然用来切换标签。

## 完成标准

- 每个 `mods/t3-*` 都通过 `herdr-app check`，`layout.switch {"name": "herdr-t3"}` 显示上面描述的窗口。
- `node mods/t3-spaces/check-sidebar.cjs` 和 `node mods/t3-pane/check-pane.cjs` 输出各自的通过行。
- `cmd-shift-b` 在 Lists 和 Inbox 之间切换侧栏。
- 对当前查看的已结束 agent 按 `cmd-shift-s`，它被 Settle 并显示下一张卡片；对已 Settle 的再按，它回来。
- 在 Inbox 里 Settle 一个已结束的 agent，它移入 Settled，标签上的完成圆点消失；再给它发提示，它回来。
- worktree space 折叠显示在它的 checkout 下；远程机器有自己的分组标题。
- 没有动作时动作块显示 `▶ Add action`，宽度正好是控件加 8px；在编辑器里加一个后显示 `▶ <名字> | ▾`，点 `▶` 会开一个以它命名的标签运行命令。
