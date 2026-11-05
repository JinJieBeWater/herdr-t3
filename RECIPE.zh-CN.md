# Herdr T3

> 中文译本。给 agent 构建用的正本是 [RECIPE.md](RECIPE.md)，两者不一致时以英文为准。

Herdr App 的一个安静、近似 T3 Code 的窗口，在 agent 越开越多时替你节约注意力。默认打开带 T3 式 Settle 的 Inbox：需要你的 agent 以卡片留在上方，工作中的折叠进 Working 收纳区，结束的等你手动 Settle，有新工作时自动回来。一键可切到 Lists（Spaces + Agents），其他机器上的 agent 也在同一个侧栏里，并标出所在机器。窄标签和带框窗格使用同一套名字和状态标记。动作控件类似 T3 的运行按钮，把你的命令放在标签栏：`▶` 重新运行上一条，在新标签或分屏里执行。可选的 Review 栏配合 pulls.review 使用，统计当前 worktree 待评审的内容，并在 agent 旁的窗格里打开。

![Herdr T3](preview.png)

## 你看到什么

从左到右，分隔线 1px `border`：

- **侧栏**（256px，同 T3，最小 208，最大 480；拖动边缘可调整宽度；`chrome` 背景），从上到下：
  - **品牌栏**（40px，可拖动窗口，给 macOS 窗口按钮留位置）：右侧两个 26px 按钮：侧栏模式（`circle-check` 图标：显示 Inbox；`layers`：显示 Lists）、隐藏侧栏。
  - **列表**，二选一（stack）：
    - **Lists**：Spaces 和 Agents，1:1 分割（各至少 90px）。Spaces：每个 space 的标记（见下）；worktree 折叠在其主 checkout 下，带树线；机器多于一台时按机器分组；名字后面只显示不寻常的 git 信息（`repo · branch ↑2 ↓1`，省略 `main` / `master`）。Agents：按 space 分组或按优先级（排序菜单），置顶的在 `Pinned` 组，子 agent 带树线缩进在父级下；14px 状态标记靠右。
    - **Inbox**：T3 侧栏。需要你的 agent 显示为卡片，底部是折叠的 Working、Snoozed 和 Settled 收纳区。Active 按回到你手上的时间排，Working 按本轮开始时间，Settled 按 Settle 时间，同时间按 address；停止工作的 agent 在 Working 多留 2 秒（blocked 立即离开，置顶或已 Settle 的不留），之后排到 Active 顶部；马上续跑、等你处理后再继续，都不挪位；查看卡片不改变顺序（见 `mods/t3-inbox`；[单独 mod 的 recipe](https://github.com/JinJieBeWater/herdr-t3-inbox/blob/main/RECIPE.zh-CN.md) 有完整说明）。
      - 卡片：同 T3，当前查看、需要你处理或已完成时标题突出（`foreground`，medium），其余退后（`muted`，normal）；悬停只提亮颜色。程序图标（60% 透明度）和远程机器标记放在第三行行尾，没有第三行时放在标题行行尾。
      - 已 Settle 的行：同 T3，一行 30px，行首是项目的 16px 标记（和卡片的头像一样，未点亮时半透明），然后是标题和 Settle 后经过的时间；悬停时时间换成撤销箭头。
      - 卡片和已 Settle 行的详情：同 T3 的线程卡片，用 `Popup` 挂在行右侧 4px、和行顶部对齐：标题，然后是项目、其他机器的名字、分支和程序，12px，最宽 320px。时序同 T3 的 tooltip 分组：第一张等 150ms；有卡片开着或刚关不到 400ms 时，下一张和行内控件的提示都立即出现；关闭没有延迟。第一张和最后一张有 150ms 淡入淡出，立即出现的没有。实色底加 `shadow_xl`：T3 的玻璃效果靠背景模糊，mod 做不到。行内控件点亮、拖动或点击这一行时隐藏。
  - **底栏**（40px），同 T3：一排 32px 纯图标按钮（圆角 8，16px 图标，悬停前为 `dim`）：Settings，以及打开官方 `machine-add` 的 server 图标；Herdr 下载好更新后，最右出现 `Update` 胶囊（15% `accent` 底、12px `accent` 字），点击重启进入新版（`app.update`）。
- **工作区**（`chrome`，窗格背后也是：在 `canvas` 不同色的主题里，窗格上方的 2px 否则会成为标签栏下的一道窄条）：
  - **标签栏**（40px，可拖动窗口）：当前 space 的标签，照 T3 的面板标签：24px 高、12px 字、宽度取决于完整名字，放得下就全部显示；放不下时最长的先让步，当前标签降到 240px、其他降到 144px，再放不下就滚动；名字很短的标签至少 96px，比 T3 的宽（圆角 6，当前标签 `selected`）：12px 程序图标（没有程序时用终端图标）；然后是名字（没人命名的标签按下面的命名规则显示其中的 agent，没有 agent 就显示当前 pane），工作中显示转圈，blocked 显示 `!` 徽章，done 且未看显示 7px `done` 圆点，这些都在标签末尾的 16px 位置，悬停标签时由关闭 `×` 占据。这里和 T3 不同：T3 是图标变成 `×`，而图标是用来区分标签的，况且窗格头的关闭按钮也在右侧。然后各自占一个块，块宽跟着内容自动调整：你加了 Review 栏的话先是它（`pulls-review` mod，见 README），然后是动作控件（[t3-actions](https://github.com/JinJieBeWater/herdr-t3-actions) mod：`▶ <名字> | ▾` 外面一圈 1px `border` 描边，没有动作时是 `▶ Add action`），最后是标签栏末尾：26px 的 `+`（`tab.new`：在当前 space 开终端标签），Windows 上再加窗口按钮。侧栏隐藏时，最左边出现侧栏开关，同时统计 agent：blocked、working、done。
    - 标签的完整名字，悬停时：一个悬停提示（12px，`chrome`，1px `border`，圆角 6），挂在标签下方 4px，文字起点和标签里的名字对齐，只有名字和状态文字，因为 `×` 盖住了状态标记（项目、分支和程序在侧栏和窗格标题栏里都有）。时序和 Inbox 行相同（`details.js`，t3-inbox 那份的副本）；按下标签或状态标记点亮时隐藏。
  - **窗格**（内边距 2/8，间距 8），即当前标签：圆角 8，`background` 填充，聚焦边框 2px，默认关闭（`focus.color` 为 `background`，改成 `accent` 即显示；平时的边框也是 2px，颜色同 `background`，所以聚焦时终端不会变尺寸），单个窗格也带框。每个窗格顶部有 28px 标题栏：程序图标、agent 名或终端标题（13px 中粗，聚焦时 `foreground`）、目录、状态标记，以及右分屏、下分屏、缩放/取消缩放、关闭按钮（悬停时出现）。
  - 底部留 6px；布局里有自带的 `workspace-status` 状态栏，但隐藏。
- **新建菜单**（`t3-new-menu`，576 宽弹层，位于顶部）：选一个 space 开终端标签（`tab.new`）；`⌘1…` 按编号选 space。当前 space 排最前，同一机器的 space 排在一起；显示 6 行后滚动，滚动跟随高亮。每行第二行是目录，远程 space 前面加服务器图标和机器名，和 T3 标记远程 thread 的方式相同。底部 footer 放按键提示，右侧是 New space（`space.new`）：有多台机器时先选机器，和 T3 的 Add project 先选 environment 相同（未就绪的机器置灰且不可选，`← Spaces` 返回）。`⌘N` 不询问，直接用当前 space 的机器。

## 它怎么表现

- **终端地址**：窗格标题在名字前用 `dim` 色显示终端地址，程序改了标题也能分清；名字就是地址时只显示一次。侧栏不显示，那里的宽度留给名字。
- **跳转**（`t3-picker`，由自带 `picker` 经 `mod.clone` 得来；`cmd-p`，以及 Inbox 的 Search，经它的 `picker` prop），画法同新建菜单，即 T3 的命令面板：576 宽弹层，位于顶部，无边框搜索框，下面直接是列表，不加标题（只有一种行），46px 两行的行，显示 6 行后滚动，滚动跟随高亮；底部 footer 放按键提示（`↑ ↓` Navigate、`Enter` Go、`⌃D` Close pane、`Esc` Close），右侧是 New tab（打开 `t3-new-menu`）。一行是一个窗格而不是一个标签：每个窗格都有一行，agent、程序、shell 和 mod 窗格都在，当前 space 的在前，然后是同一机器的，顺序同新建菜单，各自按标签顺序。一行：space 标记（16px），按命名规则得出的名字（同窗格标题），下面是程序图标和程序名（`panes()` 的 `program` 跟随前台程序：从 shell 启动的 lazygit 就是 `lazygit`）、远程时的服务器图标和机器名、space 名，有活着的子 agent 时显示 `+n`；右侧是状态标记，规则和标记同窗格标题（显示 Inbox 时，已 Settle 或 Snooze 的 agent 不显示 done 圆点）。标签名不单独成行：没人命名的标签名只是位置（"4"）或最初的名字，不代表里面在跑什么。输入时，窗格按 space 名和机器名、有人命名过的标签名、它的名字、程序名和 key、目录匹配；高亮移到第一个匹配。回车或点击用 `pane.focus`（可跨 space）；ctrl+d 通过 `t3-tabs.close-pane:<pane>` 关闭窗格，有程序在运行时先确认。从这里跳走时离开的窗格记在 `shared("t3-picker.back")`；它还在且没有聚焦时，第一行回到它（右侧显示 `↩ Back`），空查询打开时选中它，所以 `cmd-p`、回车就能来回切换；否则打开时选中当前聚焦的窗格。只记从这里的跳转，在别处点击不算。不列没有窗格的终端。
- **Space 标记**，照 T3 Code 画项目的方式（`ProjectFavicon`），写在 `mods/t3-inbox/project.js`，t3-spaces 和 t3-new-menu 各放一份副本：优先用项目自己的图标（Inbox 卡片和 New 16px，Spaces 18px，圆角 25%），照 T3 的方式在 space 当前所在位置（第一个终端的目录，否则是创建时的目录）的仓库根目录查找：先按顺序找 T3 的常见文件（`favicon.svg`、`public/favicon.ico` … `.idea/icon.svg`；不含 `.icns`），再看页面里的 `<link rel="icon">` 或路由里的 `{ rel: "icon", href }`。找到后复制到 `cache/t3-icons/`（图片只能从 App 目录显示；按内容命名），通过 `space.icons` 共享；找到的 10 分钟后重查，没找到的 1 分钟后重查。没有图标就用文字头像：和 T3 的两个字母不同，只取名字的第一个字母或数字并大写（`herdr-t3` → `H`，`智能算量` → `智`），粗体等宽，字号是标记的 0.64，颜色按名字从 T3 的 18 色里哈希取（暗色主题用 Tailwind 400，亮色用 600），底色是同色 14%。名字里没有可拼的字（`~`）时显示文件夹。`space.colors` 也写入同样的颜色（600），给官方的 picker 用。
- **名字**，各处（Inbox 卡片、agents 列表、标签、窗格标题）一条规则，写在 `mods/t3-inbox/name.js`，用到它的 mod 各放一份副本：Pi 在跑时先用 Pi 会话名（`pi.session` 标签）；agent 再看有人命名过的标签名；然后是有意义的终端标题（不跑 agent 的终端上带 agent 标记的标题是残留的，比如 Pi 之后的 lazygit，不算；按程序只去掉该 agent 自带的标记：Pi 的 `π - … - <目录>`、OpenCode 的 `OC | `；不是路径、不含 `user@host`、不是程序自己的名字、不只是目录名或 space 名，比如 Codex 和未命名的 Pi）；最后是程序名。
- **agent 状态**，各处（agents 列表、标签、窗格标题、Inbox 卡片）标记一致：working：`working` 色转圈；blocked：14px 圆角 `!` 徽章，底色为 15% 不透明的 `blocked`；done：7px `done` 圆点（Inbox 里是绿色 `Done`）；idle：agents 列表里是圆环，其余位置不显示。父级连同仍在运行的子 agent 一起判断，规则写在 `mods/t3-inbox/tree.js`，用到它的 mod 各放一份副本：自己或任一子 agent blocked 即 blocked（失败结束的一轮，即终端状态 `error`，视为 blocked：`agents()` 没有这个状态，从 `terminals()` 读）；否则自己有未读的 done 即 done；否则自己或任一子 agent working 即 working；否则用自己的状态。子 agent 的 done 是父级的消息，不算它自己的。
- **侧栏模式**：品牌栏按钮或 `cmd-shift-b`（`t3-chrome.sidebar`）对 stack `sidebar-lists` 执行 `layout.select`（`lists` / `inbox`）。显示 Inbox 时，标签栏和侧栏开关的计数里不再显示已 Settle 或 Snooze agent 的完成圆点；工作中的 Snooze agent 也不计入，直到醒来或需要你。
- **动作**：[t3-actions](https://github.com/JinJieBeWater/herdr-t3-actions) mod，详见它自己的 recipe。和 T3 Code 的项目动作一样，但是全局的：主动作是上次运行的那个，没有就是第一个。`▶` 运行它；菜单里点一行就运行那个动作并把它设为主动作；齿轮打开编辑器。运行用 `terminal.open { argv: ["sh", "-c", command], name, place, folder? }`：每次都新开标签或右/下分屏，以动作名命名；命令结束后 shell 保留。没填目录时在当前终端的目录启动；焦点在 mod pane 上时（比如 agent 旁边的 review），用同一标签里终端的目录，再没有就用 space 的目录；`~` 会展开。动作存在 `shared("t3-actions")` = `{ list: [{ id, name, command, icon, place, cwd? }], last }`，Herdr 重启后仍保留。
- **Spaces**：单击切换，右键打开自带 `menu`，拖动排序；有 worktree 的 checkout 在行尾显示折叠箭头，和父 agent 一样（折叠后带淡色数量）。space 的实际顺序跟随这些行，折叠的也算（`space.move`），所以 `space.next` / `space.prev` 和 `ctrl-1…` 按列表显示的顺序走。只在 git 可能变化时读取（新位置、命令或轮次结束、机器重新连上），窗口在前台时另有慢速兜底轮询。
- **Agents**：单击执行 `agent.focus`，Inbox 卡片相同。和 Herdr 自带的 agents 列表一样，每行在状态前显示当前状态持续的时间（`<1m`、`5m`、`3h`、`2d`），悬停时这个位置换成置顶按钮（布局不动）；父级在时间前显示折叠箭头（默认折叠，折叠后带淡色数量）；blocked 或出错的子 agent 仍显示在它下面，缩进一级。已结束 agent 的折叠记录会被清掉。你正在看的 done agent 留在 Done 组，直到你离开。
- **Inbox / Settle**：悬停已结束的卡片出现 `✓ Settle`（已置顶的也一样：和 T3 相同，Settle 会取消置顶，Undo 放回原位）；悬停已 Settle 的行出现撤销箭头；有新工作（working、blocked，或 Settle 后又结束过一轮）自动回来。`cmd-shift-s`（`t3-inbox.settle`）对当前查看的 agent 做同样的事：已结束的，像按钮一样 Settle 并跳到下一张；已 Settle 的则取回。不做自动 Settle。拖动照 T3 侧栏（`Sidebar.drag.ts`、`Sidebar.pointer.ts`）：按住卡片或行移动 6px 即拿起（Working 卡片、Settle 变更还没从 Core 回来的行除外）。拿起的副本（`selected` 底色、1px `accent` 边框、大阴影）只上下移动，按下的位置始终在鼠标下，限制在列表内、Pinned 标签以下；右上角换成松开后动作的标记：`Pin`、`Unpin`、`Settle`、`Un-settle`（accent 描边和 10% 底色），原地不动时不显示。只在拿起期间，24px 的 `Pinned` 和 `Active` 标签（12px 中粗加 1px 细线，作为目标时 `accent`）以 150ms ease-out 的高度过渡展开，Settled 标题也会显示（即使为空），平时 `foreground`，作为目标时 `accent`。每行放在 lane 里：上方一个间隙、行本身和 2px 间距，最后一行之后再有一个间隙；拿起的行移向别处后原位收起。落点的间隙张开到目标分区的行高：Pinned 和 Active 为卡片高 + 2（拿起的卡片自身高度，或最近测得的卡片高度），Settled 为 30px。Pinned 保留手动顺序（置顶卡片上半部放在它上面，下半部放在下面）；Active 和 Settled 按各自排序（取消 Settle 或 Settle 后排最上，取消置顶回到按时间的位置）。Active 或 Settled 为空、或 Settled 折叠时，显示 36px 虚线占位，作为目标时 accent。Settled 始终一页：移出一行时下一行补上，Settle 进来一行时最后一行隐藏。在侧栏内任意处松开都落在间隙处；Herdr 不上报侧栏外的松手，所以按离开方向决定：从上下边缘离开（按最后的鼠标位置取最近的边）就按标记落下，和 T3 越过列表两端仍保留最后目标一致；Esc（只在拿起期间侧栏持有键盘）、从左右两侧离开或拿起的行从列表消失都会放回原处；松开不会打开那一行。Settle 当前正在看的 agent 时切到下面一张卡片，到底则从顶部绕回，同 T3。划选：按住卡片的 `✓ Settle` 或已 Settle 行的撤销箭头划过同一分区的多行，标记整段，松开即全部 Settle（或取回）。置顶卡片不论状态都按置顶顺序留在顶部，空间头像后有 pin 图标，不提供 Settle 按钮。置顶存在共享状态 `agents.pins`，与 t3-agents 共用。
- **Inbox / Snooze**，照 T3：`snoozed=<唤醒毫秒>` 写在 agent 的终端上（`hc label`，回读前暂存）。悬停时，不需要人处理的卡片（工作中、已置顶的也可以；这一轮失败算需要人）在 Settle 前显示 20px 的 `clock` 按钮；悬停的控件占住角落，状态在其下淡出。点开菜单（`Popover`，宽度随内容、至少 160px，行高 28px，从时钟左缘垂下、向右越过侧栏边缘；鼠标或按键到达前不高亮；↑/↓，Enter 或 Space，Esc；焦点句柄交给面板，打开时在面板自己的 key context 里绑定 Enter 和 Space，因为 Popover 自带的绑定只会关闭菜单）：In 1 hour、In 3 hours、This evening（18:00，过点消失）、Tomorrow（9:00）、Next week（周一 9:00，周日时显示为 Tomorrow），最早的在上，同一分钟只留一行，右侧写唤醒时间。和 T3 一样，时长从点击时算起，菜单画出后已过去的时间会被拒绝并提示。分隔线下的 `Custom…` 打开对话框（本 mod 作为 overlay，同 t3-actions 的编辑器）：Date and time（自绘日历，过去的日期不可选，加 `HH:MM`）或 Duration（数量加 Minutes、Hours、Days）。不存在或已过去的时间、非正数的时长会提示并保持打开；结果经 `shared("t3-inbox.custom")` 和 `t3-inbox.custom-snooze` 命令交给 Inbox，和预设一样 Snooze，除非此时 agent 已需要人处理。预设不可配置。Snooze 后出现 T3 的 `Snoozed 1 agent, Undo` 提示；若在查看它，则和 Settle 一样跳到下一张。Snoozed 收纳区在 Working 和 Settled 之间，默认折叠，最早醒的在上；行的样式同已 Settle 的行，显示剩余时间（`10m`、`3h`、`2d`，`accent` 闹钟），悬停换成划掉的闹钟（Wake；按住划过多行叫醒整段）。把行拖出来即唤醒（标记 `Wake`）；不能拖进去：放下时给不出唤醒时间。到点后回到原位（其间 `track` 跳过宽限期；在 Snooze 期间结束的工作算回到你手上，所以醒来时排到顶部，和 T3 的 return 一样），标 `blocked` 色的 `Woke`，直到看过或点击；悬停时 Woke 留在控件旁边；仍在工作的显示在 `Working` 旁边。撤销 Settle 会还原未到期的 Snooze。提前结束：需要人时只在此期间显示（标签保留）；它的子树失败、查看时开始新一轮、Wake、置顶或 Settle 清除标签。已置顶的保留置顶，醒来回到原处。
- **Inbox 动画**，照 T3（`Sidebar.motion.ts`）：行的顺序或所在区变化时（Settle、取消 Settle、一轮结束、拖动放下），挪了位置的行从原位滑过去（收起区标题、Show more 和 Active 为空时的提示也一起滑，和 T3 的列表标记一样，行不会从它们上面滑过），新行从上方 40px 淡入（上面有留下来的行时跟着它走），离开的行在原位淡出；150ms ease-out，拖动中或一次超过 40 行时不播。拖动放下的行从松手处滑到落点。悬停时，时间和 Settle/撤销按钮交叉淡变；working 卡片平时 70% 不透明度，悬停或正在查看时恢复；已 Settle 行的项目标记平时 40%。Herdr 只给元素“之后的变化”补间，所以移动的行换一个新 id，先在原位画一帧再放手。
- **Inbox：mod pane 卡片**：没有 agent 的标签里的 mod pane，点 agent 卡片到不了，所以在 `shared("<mod>.program")` 里声明了 `inbox: true` 的（比如 review：`{ icon, tint, name, inbox: true }`；只有图标不算声明）有自己的卡片，每个标签一张：space 标记和名字、`<mod>.titles` 里的名字，图标放在 agent 卡片放程序图标的位置。它按 `<mod>.status` 走，和 agent 按状态走一样：`working` 在 Working 收纳区，`done` 和 `blocked` 回到 Active 顶部；第一次出现时在 Active 顶部。`inbox: true` 同时表示这个 pane 可以随时关掉，状态都在别处：Settle（`Settle and close`，和 agent 同样的条件下才提供，以及 `cmd-shift-s`）就是 `pane.close`，正在查看时先跳到下一张，没有 Settled 也没有 Undo；space 的最后一个标签会先询问。单击是 `pane.focus`，可跨 space。不能置顶、不能拖动、不参与划选。受 space 筛选影响，查看被筛掉的卡片时放宽筛选。agent 旁边的 mod pane 没有卡片，它点亮那个 agent 的卡片。
- **当前查看的行**，照 T3 的 route row：所在区折叠或排在 Settled 当前页之外时仍然显示；查看的是没有自己行的子 agent（区块、peek）时，点亮最近一个列出的祖先；从别处切到一个被空间筛选隐藏的 agent 时，筛选放宽为全部空间并保存（首次绘制不会，查看期间自己选的筛选也保持不变）。Herdr 不能用代码滚动普通列表（只有虚拟列表可以），所以和 T3 不同，不会把它滚进视野。
- **撤销提示条**，照 T3：Settle 和取消置顶后，在第一个收起区标题上方显示 `Settled 2 agents, Undo` 5 秒（200ms 淡入淡出）；连续同一种操作合并计数；Undo 让它们回到原样，不算新消息。不绑快捷键：⌘Z 留给终端。
- **关闭**，照 T3 的 `confirmTerminalClose`：标签和窗格的 ×，以及上面的快捷键，都交给标签栏的 `t3-tabs`。有程序在运行时（`hc get`：前台不是它自己的 shell，或查询没有结果）打开自带的 `confirm`（400×170，照 T3：标题是 `Close tab "<名字>"?` / `Close pane "<名字>"?`，标题不换行，名字过长时截断；正文说明会结束什么）；没有程序在运行时直接关闭，这一点和总是确认的 T3 不同。space 的最后一个窗格交给 Herdr 自己的 `Close space?`。`tab.close` 和 `pane.close` 对 agent 不变；右键菜单和命令面板仍直接执行它们。
- **标签**：单击选中，双击改名，拖动排序，右键菜单，滚轮切换上/下一个标签。
- 置顶、折叠、排序、筛选和收纳区状态按屏幕保存（`localStorage` / 共享状态 `agents.sort`、`space.colors`）。

## 由什么构成

- `layouts/herdr-t3.json`：根为 `row` → `sidebar` 列 [`brand` 块 `t3-chrome`；`sidebar-lists` stack [`lists` 列 [`spaces` `t3-spaces`、`agents` `t3-agents`]、`inbox` `t3-inbox`，props `{ "newMenu": "t3-new-menu", "picker": "t3-picker" }`]；`sidebar-footer` `t3-chrome`，props `{ "footer": true }`]，以及 `work` 列（`chrome`）[`tabs-row` 行（40px，`"resizable": false`，`chrome`）[`tabs` `t3-tabs`、`actions` `t3-actions`，props `{ "block": "actions" }`、`tabs-end` `t3-tabs`，props `{ "part": "end", "block": "tabs-end" }`]；`work-body` 行 [`main` `{ "tab": "active", "pane": { "header": { "content": { "mod": "t3-pane" } } } }`]；`work-bottom-inset` 行 6px [`bar-measure` `t3-tabs`，props `{ "part": "measure" }`]；`status` `workspace-status`，隐藏]。预览图：`layouts/herdr-t3.svg`。
- Mods：`t3-chrome`、`t3-spaces`、`t3-agents`、`t3-tabs`、`t3-pane`、`t3-new-menu`、`t3-picker` 分别改自 Herdr 自带的 `workspace-chrome`、`spaces`、`agents`、`tabs`、`pane`、`new-menu`、`picker`；`t3-inbox` 是新写的。`t3-actions` 是单独的 mod，随布局一起安装。原样使用的自带 mod：`workspace-status`、`menu`，以及 `mods/workspace-chrome/` 下的图标和 `mods/pane/close.svg`。
- `keys.json`：`layout:herdr-t3` → `cmd-shift-b`：`t3-chrome.sidebar`，`cmd-shift-s`：`t3-inbox.settle`（只在 Inbox 显示时生效），`cmd-p`：`mod.open:t3-picker`，`cmd-]` / `cmd-[`：`t3-chrome.next` / `.prev`（由一直显示的 t3-chrome 处理，按 Inbox 写进 `shared("t3-inbox.rows")` 的 `{ order, view }` 走，其中是 address，mod pane 的卡片是 `pane:<id>`，照 T3 的 `resolveAdjacentThreadId`，不循环；显示 Lists 时用 `agent.next` / `.prev`）。 `cmd-w` 和 `ctrl-alt-shift-x`：`t3-tabs.close-tab`；`cmd-shift-w` 和 `ctrl-alt-x`：`t3-tabs.close-pane`。
- 运行的程序：`t3-spaces` 运行只读的 `git status` / `git rev-parse`（不加可选锁、不用 fsmonitor）和 `hc machine ls --json`，点重装机器的 Connect 时运行 `hc machine rm` 和 `hc machine add`；`t3-inbox` 运行 `hc label <agent> settled=<ms>:<turn>`；为 space 标记，`t3-spaces`、`t3-inbox`、`t3-new-menu` 运行 `git rev-parse --show-toplevel`、`sh -c` 文件检测和 `base64`（在 space 的机器上）。

## 注意

- `t3-tabs` 和 `t3-chrome` 用 `find(layout(), "sidebar-lists")` 找 stack；保留节点 id `sidebar`、`sidebar-lists`、`lists`、`inbox`。
- 悬停提示是 `mods/t3-inbox/tip.js`（用 `HoverCard` 照 T3 Code 的 tooltip 绘制：12px，标签加 `keys()` 读到的快捷键，可带一行暗色说明），各放一份副本。和 T3 一样，提示只用几个词说出控件的名字，控件本身有没有文字都可以加；第二行只用于看不出来的操作（Shift+click）。纯图标按钮和无文字标记（状态、机器）有提示，程序图标和图钉没有。和 T3 一样默认朝上；上方放不下的（品牌栏、标签栏及其中的 Actions 和 Review 栏、Actions 菜单的行、两行的筛选提示）传 `below`：`HoverCard` 不会像 T3 那样自动翻转。`.tooltip()` 只收字符串，样式由外壳决定。
- 只有品牌栏那份 `t3-chrome` 监听 `nextCommand()`；底栏那份没东西可切换。
- 碰到 index 的 git 命令会再次唤醒目录监听：始终带上 `--no-optional-locks -c core.fsmonitor=false`。
- Settle 标签大约 0.65 秒后才出现在 `terminals()`：要保留待定值。
- macOS 无标题栏时，侧栏隐藏或很窄，标签栏要给窗口按钮留位置（`layout().traffic_lights`）。
- 窄窗口：`bar-measure`（`t3-tabs`，`part: "measure"`）放在 `work-bottom-inset` 里，工作列宽度小于 1024 逻辑像素（比 T3 的 768 大，因为这里控件要和标签共用一行）时把 `shared("bar.compact")` 设为 true，动作控件和 Review 栏随之去掉文字。放在这里测，是因为这条的宽度不受标签栏影响；测标签区的话，控件一收起标签区就变宽，又会展开。
- 动作通过 `sh -c` 运行：拿不到你 shell 的别名和函数（需要的话在命令里写 `zsh -ic '…'`），纯 Windows 也没有 `sh`。
- `t3-actions` 和标签栏末尾（`t3-tabs`，`part: "end"`）自己调整所在块的宽度：`run("layout.resize", { id: props().block, px })`，宽度取 `on_size_change` 的值除以 `settings().zoom`（它报的是乘过缩放的像素）。`tabs-row` 要保持不可拖动，否则拖动会和它们抢宽度。布局引用了没安装的 mod 时，`herdr-app status` 会报 `no mod folder`：把包括 `t3-actions` 在内的所有 `mods/t3-*` 复制过去。
- `mods/t3-spaces/check-sidebar.cjs` 和 `mods/t3-pane/check-pane.cjs` 用假的 `herdr` 加载 mod；要在已安装的 home 里用 `node` 运行，因为它们在那里找自带图标。 `mods/t3-new-menu/check-new-menu.cjs` 和 `mods/t3-picker/check-picker.cjs` 同样检查新建菜单和跳转，可在任意位置运行。
- 标签条让当前标签保持可见，移动量最小，和 T3 的 `scrollIntoView({ inline: "nearest" })` 一样。Herdr 的滚动容器不能由脚本移动，所以 `tab-scroll` 负责裁剪，`tab-strip` 用 `.ml()` 偏移；标签的完整宽度来自一份高度为 0 的名字副本，用 `on_size_change` 量出。只在当前标签或可用宽度变化时才移动，所以横向滑开的标签不会被拉回；滚轮仍然用来切换标签。

## 完成标准

- 每个 `mods/t3-*` 都通过 `herdr-app check`，`layout.switch {"name": "herdr-t3"}` 显示上面描述的窗口。
- `node mods/t3-spaces/check-sidebar.cjs` 和 `node mods/t3-pane/check-pane.cjs` 输出各自的通过行。
- `cmd-shift-b` 在 Lists 和 Inbox 之间切换侧栏。
- 对当前查看的已结束 agent 按 `cmd-shift-s`，它被 Settle 并显示下一张卡片；对已 Settle 的再按，它回来。
- 在 Inbox 里 Settle 一个已结束的 agent，它移入 Settled，标签上的完成圆点消失；再给它发提示，它回来。
- Snooze 一个工作中的 agent 1 小时：它进入 Snoozed，不再计入侧栏切换按钮的工作数；权限提示让它显示为 Needs you，回答后再次隐藏。
- worktree space 折叠显示在它的 checkout 下；远程机器有自己的分组标题。
- 没有动作时动作块显示 `▶ Add action`，宽度正好是控件加 8px；在编辑器里加一个后显示 `▶ <名字> | ▾`，点 `▶` 会开一个以它命名的标签运行命令。
