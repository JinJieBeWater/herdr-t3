# Herdr T3 使用指南

[English](guide.md) · 中文

比 [README](../../README.zh-CN.md) 更详细地说明每个部分。

## 功能

- **两种侧栏**：`cmd-shift-l` 切换 Inbox（注意力）和 Lists（space），`cmd-]`／`cmd-[` 都可逐个走。Settle、Snooze 藏 agent 属于 Inbox，Lists 关闭后回之前的标签。
  - Spaces：只在不寻常时显示仓库、分支和领先/落后；worktree 折叠在所属仓库下，checkout 开没开都一样；机器多于一台时按机器分组，`ctrl-1…9` 和切换下一个 space 的键按看到的顺序走。
  - Agents：按 space 或按优先级分组，可置顶，子 agent 缩进在父级下。
  - Inbox：T3 式 Settle。需要你的 agent 以卡片留在上方，等你处理的排最前。结束的 agent 可以收进 **Settled**，有新工作时自动回来。工作中的 agent 折叠进 Working。Snooze 把不需要你的 agent 藏到你选的时间。要结束已 Settle 的 agent 进程，用 **Clean up**。
- **各处同一个名字**：Inbox 卡片、agents 列表、标签和窗格标题用同一条规则给终端取名：Pi 在跑时用 Pi 会话名；顶层 agent 独占标签时，你命名过的标签优先于有意义的终端标题；多个顶层 agent 共用标签时，有意义的终端标题优先，各自显示自己的标题，没有会话名或标题的同伴（例如无会话名的 Pi）仍保留标签名；最后是程序名。子 agent 不继承标签名；Pi 退出后在原处启动的 lazygit 显示为 lazygit，不沿用旧会话名。
- **各处同一套状态标记**：工作中是虚线圆，blocked 或这一轮失败时显示 `!`，done 显示圆点。已 Settle 或 Snooze 的 agent 在各处都不再显示 done 圆点，Lists 也一样；只有 Inbox 会藏起工作中的 Snooze agent，其他地方照样标出工作中。显示 Inbox 时，标签上不显示任何标记：什么需要你由侧栏来说。
- **窄标签、带框窗格**：24px 标签，照 T3 的面板标签，标签栏和 space 面板里是同一种：悬停时 × 盖住图标，状态标记留在右端，中键关闭，名字被截断时悬停显示全名；圆角窗格带 28px 标题栏（名字、目录、状态；悬停时出现分屏、缩放、关闭）；分屏时，你不在的窗格标题栏变暗，同 T3。选了 Inbox 时，收起的 agent 也在这里标出：已 Settle 显示勾，Snooze 中显示闹钟和剩余时间。标题栏的状态只表示它自己的 agent；旁边的子 agent 按钮写它启动的全部后代数量，需要你时变色，有在跑的时数字前加工作标记，tooltip 写需要你和在跑的个数。点开按树序列出，每行是程序图标、名字和 Agents 行同样的标记：工作时长、Needs you、红色 Failed、没看过的完成圆点或空闲时长。指针或 Up／Down 点亮行，点行或 Enter peek；右键打开侧栏同一份 agent 菜单，含 Send back、Copy address，Escape 关闭。Inbox 里就靠它打开子 agent。zoom 一个分屏的标签，标签栏会展开它的各个窗格，每个一段：点一段就改 zoom 它；用窗格标题栏的缩放按钮或 `cmd-shift-enter` 还原分屏。
- **Inbox 下的标签栏**：以你正在看的 agent 为主角，也就是 Inbox 亮着的卡片。左边是它的 space（点击打开空间菜单，可点 New tab `⌘T` 新建标签页，或直接找到并切到当前 space 下的全部 agent、缩进子 agent 与终端程序／shell，右键列表行打开该 agent 或窗格的菜单，指针移到行上出现的 `×` 或按 `ctrl-d` 关闭它，菜单保持打开）、是子 agent 时的父级和它的名字；点名字或 `⌄` 打开这个 agent 的菜单：Pin、Settle、Snooze、Mark unread，和卡片上一样，未由 Pi 会话名命名的顶层 agent 还有 Rename（与另一顶层 agent 共用标签时显示 Rename tab）。右键名字或父级打开那个 agent 的菜单，和 T3 一样；右键 space 仍打开 space 的菜单。这里只写你正在看的 agent：同一标签里的其他 agent 用它的卡片或窗格去。右边分开放：它的子 agent 的标签，再是不含 agent 的标签。焦点在程序上时 agent 留在那里但不亮；从标签栏进入工具标签时它变暗，点它回去。开了新标签之后（不管从哪里开）只有 space，直到你再看某个 agent。这个 agent 的窗格单独显示时，标题里不再写标签栏已经写了的名字。
- 点 Inbox 或 Lists 侧栏的 New tab in… 打开 **New**。选已打开的 space 就在其中新建标签，也可以从列表下方选记住的项目，让它在原来的机器和目录重新打开。项目最后一个终端关闭后，New 仍会记住它。标签栏的 `+`、Inbox 面包屑的 space 菜单里的 New tab，以及 `cmd-t` 都会在当前 space 打开终端标签。在 Home，或没有打开的 space 时，按 `cmd-t` 则打开 New。机器多于一台时，侧栏的 New space 会先问建在哪台。`cmd-n` 直接用当前 space 的机器。在终端里启动 agent。
- **Home**：Settle 或 Snooze 当前查看的 agent 后，回到一个安静的固定位置，不再跳到下一张卡片，下一步看什么由你决定。想继续跳到下一张，或者把 Home 换成终端或别的 mod，见下面的设置。用这里的按钮或 `cmd-]`、`cmd-p`、`cmd-t` 决定下一步，Undo 能带回刚才的 agent。`cmd-shift-h` 或侧栏左上角的 Herdr logo 可随时进入。它不占 space 序号。它只放一样东西（页面、终端或 mod），没有窗格标题栏：不能 split 也不能关，agent 也不会留在里面。Home 是页面或 mod 时，侧栏右边一直到窗口顶边都是 Home，壁纸的图连顶行下面也铺上。Home 是终端时仍带框；侧栏显示时，它上面的空标签栏会收起。
- **跳转**（`cmd-p`）：每个窗格一行，agent 和程序都在，名字和图标与窗格标题相同（标签名只有你命名过才算），所以输入 `lazygit` 就能直接跳到那个窗格，不管它旁边有没有 agent、在哪个 space。最近待过的窗格排在最前，越近越前，不管当时是怎么切过去的，所以 `cmd-p`、回车就回到刚才所在的窗格；你所在的窗格排最后。输入时，名字匹配的排在只靠目录或 space 匹配的前面。
- **Clean up**（`cmd-shift-r`／`ctrl-alt-r`，或侧栏底栏的垃圾桶图标）不离开 Inbox，回收用完的终端。**Idle**：当前标签之外已 Settle 的 agent 和停在提示符的 shell，折成一块，只写有几个、哪些 space 随之关闭；展开可按 space 看名字，点 **Close** 一起关掉。**Left behind**：所在 space 已经没有在工作的 agent、却还在运行的程序，例如项目做完后忘掉的 `bun dev`。每个是一张卡片，写明所在 space 和进程：点卡片跳过去，点卡片上的 **Stop**（或高亮后按 `ctrl-d`）当场停掉，不再二次确认。还有 agent 在工作的 space 里的程序，以及你正在的 space 里的程序，算在用，不会出现。数量随关闭实时更新，关闭前逐个复查。没有可清理的东西时，会弹出提示。关掉的 space 仍留在 New 里。要回到别的终端用 Go to：输入 space 名就会列出它的窗格。
- **详情和 Actions**：square-menu 按钮或 `cmd-shift-b` 打开详情，一个不改终端尺寸的 popup。再点按钮或按 Escape 关闭；换 space、标签或终端时它会关掉并提示。
  - 第一行是所在的机器：悬停 folder 图标看目录，整行右键复制路径。
  - **Open in**：主半边用 Finder 或上次选的已装 T3 编辑器（Cursor、Trae、Kiro、VS Code／Insiders／VSCodium、Zed、Antigravity 和 JetBrains）打开目录；箭头只选用哪个，和 Files 共用。选的编辑器卸载了就回到 Finder；远程 space 上说明为什么不可用。
  - **Actions**（全局）：没有时显示 Add action，有时显示上次运行的那个和其余的菜单，悬停才出 Edit。编辑时详情留在对话框后面。名字被截断时悬停显示全名。
  - **Review**：主半边显示 Review，行尾写 Review 正显示的范围。箭头列出各范围和数量（`3 commits`、`1 file`），给正显示的打勾；Commits 在旁边展开，可搜索。选中就让 Review 显示它。需要装 Review 扩展，且 space 在本机。
  - 键盘操作：用 `cmd-shift-b`（或在按钮上按 Enter）打开时，第一个控件带焦点环。↑／↓ 在行间移动，←／→ 在一行的两半间移动，Enter 按下；这样打开的菜单首行点亮，关掉后键盘回到它的箭头。Escape 关闭详情，回到终端。
  - 卡片右键可显示或隐藏这几项，或 Reset；全部隐藏时用 Choose what to show 找回。
  - 打开面板会收起详情；面板放大时，快捷键先恢复终端。Home 没有 Actions。
- **其他机器**：机器多于一台时 Spaces 按机器分组，来自其他机器的 Inbox 卡片带远程机器标记，标记不单独弹提示。Lists 的 Agents 行只在悬停详情里显示机器名；Inbox 卡片的悬停详情也能查看机器名。在 Herdr 的 Settings 里添加机器；重建过的机器会提供 Connect，New space 会先问建在哪台机器上。
- 机器名旁的警告表示断开后 agent 会停止，即使现在仍已连接。点警告查看 Herdr 的说明和 Copy 按钮，再自行到那台机器上执行建议的命令。此报告需要远程 herdr-core 0.1.21 或更新版本；旧 core 没有该字段时不显示警告。
- **程序图标**：Inbox、Agents、标签、窗格标题、Go to 和子 agent 菜单直接使用 Herdr 官方素材，保留原有留白和配色，图标槽按各组件的尺寸绘制。
- **Space 标记**：space 显示其仓库的 favicon（在它所在的机器上查找），没有时显示 T3 配色的首字母图标。
- **右键菜单**：代表 agent、space、仓库、机器、标签或窗格的东西，右键都打开它的菜单，在哪里右键都是同一份。agent 的（Inbox 卡片、Agents 行、标签栏里的名字）：Pin、Settle、Snooze 或 Wake、Mark unread（只在 Inbox 下有，侧栏显示或隐藏都可用；鼠标停在 Snooze 上，时间选项在菜单旁边展开，同 T3 的子菜单；Mark unread 在已结束过一轮的空闲 agent 上出现，原地把它标回 Done（不切路由），Inbox 卡片、窗格头、space 切换菜单以及 Lists 下的 Agents 和标签栏都会显示未读圆点，并清除 Settled 或 Snoozed）、未由 Pi 会话名命名的顶层 agent 显示 Rename（与另一顶层 agent 共用标签时显示 Rename tab）、Copy address、Send back 回父级、Close pane。space 的（Spaces 或 Agents 里的行、标签栏、Inbox 的筛选）：New tab、Rename、Copy path、New worktree 和 Open worktree、Remove worktree、Close。Spaces 里仓库那一行暗行：Open、Copy path。机器标题：New space here、Connect。标签的：New tab、Rename、Close。窗格的（终端、窗格标题栏）：Split、Zoom pane 或 Unzoom pane、Copy address、Send right-clicks to pane、Close pane。当下做不了的不列出来。
- **关闭前确认**：标签或窗格的 ×、标签上的中键、`cmd-w`、`cmd-shift-w` 和右键菜单的 Close 在有程序运行时先询问，没有程序运行时直接关闭。开框后标签里增加了终端，或关闭标签会连带关闭整个 space 时，会再次询问。
- **space 面板**：窗口最右面板按 space 归属，跨终端标签；每 space 记标签列表、当前项、开关和放大，宽度全窗口共用。初次打开为空，Open a surface 提供 Files F 和装了扩展才有的 Review R，+ 同样提供。Review 读标签工作处的仓库：最后活动终端所在文件夹，没有时用 space 文件夹，所以 space 文件夹不是仓库时，也能评审你 `cd` 进去的仓库；在其他机器上或不在仓库里时置灰并说明原因。+ Files 添加或选中整宽树的通用标签；文件原位替换通用标签，已有标签就选中它，其他文件追加。文件标签共用一棵树，选标签清空搜索并定位文件；Review 唯一。顶栏依次是标签、紧跟末标签的 +、放大／恢复和面板开关，平台按钮只在窗口最右；标签左侧图标在悬停或键盘聚焦时换成 ×。标签放不下时用滚轮横滚，‹ › 并排出现在标签后，哪边到头哪边置灰，当前标签自动滚入。同名文件照 T3 看起来一样；名字被截断时悬停显示全名。右上角的详情、Lists 的 + 和面板开关是一组，右缘对齐窗格头最右的控件；面板头的首个标签和末个按钮，与下面 Files 或 Review 的头部同边。隐藏（`cmd-alt-b`）保留标签并退出放大。×、中键或在 Files／Review 里按 `cmd-w` 关闭当前标签，不关背后的终端；选右邻、无则左邻，最后一个关闭收起，重开为空。标签菜单：Copy path、Close、Close others、Close to the right、Close all。在 Files／Review 里按 `cmd-t` 在 + 下打开菜单，F／R 添加，方向键和 Enter 可用；终端里的 `cmd-t` 仍是新标签。切换保留 Review 的范围／组／文件／位置，关闭再添加从默认开始。每 space 只保留最近显示三个文件的预览／Editor／阅读位置，更早的回顶重读；每类 surface 完整数据只留最近三个 space。隐藏停止刷新、回来补读，不留递归 watcher（Files 本机通常 5s、远程 10s，Review 15s）。
- **Files**：只读浏览当前 space 的文件夹，本机、远程都可以。通用 Files 是整宽的树；打开文件后，内容在左、树在右。目录图标随展开开合，文件显示类型图标，只含一个子目录的目录连成一行（`a / b`），折起后也一样；Review 的树也是这个样子。Git 忽略的条目变暗，改动标记只在 Review 里有。Search files 也能找到还没展开的目录里的文件，结果仍按目录排成树；超过 200 个时留下文件名命中的和路径短的。还没搜的词显示加载中，不会配着别的词的结果。打开结果不清搜索，从别处切到文件标签才清空并定位到那个文件。Escape 清空并退出输入。刷新和全部展开／折叠在搜索框两旁；折叠后，之前没做完的展开不会再把目录打开。树里可以用方向键、Home／End、Enter／Space，每次选中一行。从标签或命令打开文件不会把键盘从终端拿走；点树、点面包屑或 Locate 才会。面包屑上的目录在原文件旁边打开，还能点回原文件；点 › 弹出这个目录的内容，同 T3 只用一个菜单：点里面的目录就在原地换成它，顶上的 **Back**（或 ←）回上一级，Esc 关闭，选中文件就打开。头部的 Open in 与详情共用编辑器偏好和菜单：菜单里选只是记住，主按钮才打开。Preview／Code、换行和树开关切换时位置不变，用不上时置灰并说明原因。Markdown 默认显示预览，代码和图片也能看。右键或 Shift+F10 打开菜单（`cmd-w` 关菜单，不关标签）：本机的 Open、Reveal、Open with，复制相对路径，以及插入到本标签最后活动的终端（没有就置灰）。插入不按回车，借用的剪贴板文字会还原，剪贴板里的图片和你刚复制的新内容不会被覆盖。拖动树的左边，或聚焦后用 ←／→、Home／End 调宽；宽度和换行设置与 Review 分开。文字只在可见时刷新，图片重新选中才刷新。面包屑上的目录悬停时只提亮文字、不铺底色，键盘聚焦仍有焦点环。面包屑和树行即使被截断也不显示悬停提示，Open in 的箭头只有无障碍标签。 可将任意文件或文件夹行拖进终端，Herdr 为路径加引号并粘贴，不按 Enter。本机文件可复制到远程终端，目录不能上传；远程路径只能拖进同一台机器的终端。含控制字符的路径会被拒绝，拖到终端外即取消；菜单里的 Insert into terminal 仍是独立入口。
- **Review**（可选，[见扩展](extras.zh-CN.md#pullsreview)）：面板的 Review 标签评审标签工作处的仓库；从 + 添加或按 `cmd-shift-g` 打开。每个 space 各有自己的评审，面板显示当前 space 的。工具栏下方照 pulls.review 是一行组页签：每个页签有类别图标、名字、需要留意时的标记、增删行数、文件数，以及表示已看多少的进度环。选一个组，左边的 diff 和右边的文件树就只显示这个组，AI 分析过后，它的说明显示在 diff 顶部。AI 分析之前按文件夹分组（Docs、Code……）；只有一个组时不列组。树和 Files 一样，每层先目录后文件，名称忽略大小写、数字按数值排；diff 和 `j`/`k` 沿用相同顺序。文件夹默认折叠，只展开到正在看的文件，组的子组是其中的行；正在看的文件是唯一高亮的一行，滚动 diff 时跟着走。每行行首是已看勾选，图标与 Files 相同。文件或文件夹行可像 Files 一样拖进终端，或右键用同一份 Open、Reveal、Open with、Copy path 和 Insert 菜单。右键不改当前文件、目录折叠和已看勾选，菜单打开时该行保持点亮。已删除文件不能拖动，只能 Copy path；子组行两者都没有。标签栏里不显示计数，下面的范围菜单里有。分析状态显示在带 pulls.review logo 的 Review 标签上。Review 顶栏左边的范围按钮照 T3 Code 的 diff 面板，写着正在看的范围（Changes、Uncommitted、Outgoing、Incoming 或某个 commit），点开菜单换一个：上面四项带数量，下面是 Commits，在旁边展开一个可搜索的子菜单。在 Changes 下，`head →` 后面的 base 是一个按钮，照 T3：点开换一个分支来比较，本地或远程都行（行尾的开关切到远程版本），或者选 Automatic 回到默认分支。每个 space 记住自己选的 base，Commits 也只列这个 base 之后的提交。其他机器上的 space 没有 Review。

## 日常用法

在 Inbox 的 **Search** 中输入名字，侧栏会显示紧凑的结果列表。↑、↓ 选结果，Enter 打开，Esc 清空。`cmd-p` 仍可在整个窗口里跳转。**Filter by space** 列出有 Inbox 条目的 space，并保留已选中的 space。筛选后 Inbox 为空时，点 **Show all spaces** 恢复完整范围。

点击卡片打开 agent。点卡片上的图钉可取消置顶，Undo 可恢复它的位置。悬停分支旁的工作树图标可查看 checkout 目录名和分支名。

从 Home 回到 space 或在 space 间跳转时，目标终端直接出现在该 space 的工作区域。如果上次离开时开着 Files，它会和终端一起出现。切到已缓存的文件标签时，面包屑和预览一起恢复。

菜单打开后，即使列表顺序变化，点击或按 Enter 仍作用于你选中的命令和对象。对象已离开时需重新选择，关闭再打开同一路径的文件标签也一样。独立 Inbox 的 Settle 快捷键以按下时持有焦点的 agent 为准。

Insert 拒绝包含控制字符的路径；可改用 Copy path。

- **侧栏**：`cmd-shift-l` 或设置里的 Sidebar shows 切 Lists 和 Inbox；侧栏隐藏时只有设置能切，和 T3 一样，这时侧栏快捷键不起作用。窗口按钮后面的按钮或 `cmd-b` 隐藏侧栏；隐藏后这个按钮留在原处，点它把侧栏找回来；和 T3 一样，旁边不再放别的，回 Home 用 `cmd-shift-h`。隐藏期间，不管在 Home 还是别处，布局都不显示 agent 在做什么：有 agent 需要你时，Herdr 自己的通知照样会告诉你；把侧栏找回来就能看到全部。`cmd-shift-b` 打开详情。
- **打开菜单的按钮**：详情、面板 `+`、子 agent 计数、排序、New space、New tab in… 等按钮在菜单或弹层开着时保持按下，提示不会盖在上面；再点一次就关闭。
- **Inbox**：鼠标移到已结束的卡片上，点 `✓ Settle` 收起；有新工作时它会自己回来，也可以点那一行的撤销箭头拿回来。`cmd-shift-s`（隐藏侧栏时也能用，Lists 里不起作用）Settle 当前查看的 agent 并回到 Home，已 Settle 的则取回。你自己取回的 agent（点撤销箭头、拖出 Settled 或按 `cmd-shift-s`）排到 Active 顶部。点 `Undo` 则放回原位。接着按 `cmd-]` 打开最上面的卡片，可以逐张处理。卡片和行可以像 T3 一样拖动：移动 6px 即拿起；`Pinned` 和 `Active` 标签展开，拿起的行标出松开后的动作（Pin、Unpin、Settle、Un-settle），列表在落点让出位置。Pinned 保留你排的顺序，新置顶的排最上，Active 和 Settled 按各自的排序。按 Esc 或从侧栏左右两侧拖出放回原处，从上下边缘拖出则按标记落下；Working 卡片拿不起来。按住卡片的 `✓ Settle`（或已 Settle 行的撤销箭头）划过多行，可以一次 Settle（或取回）整段。和 Agents 列表共用同一份置顶。
- **设置**：侧栏底部的 sliders 按钮或 `cmd-shift-,` 打开布局自己的设置，样子和 Herdr 的设置一样。改动立即生效，更新后也保留。
  - **After putting away**：Home（默认），或 Next card：Settle、Snooze、拖走或划走当前查看的 agent 后打开下一张卡片，没有下一张就回 Home。关闭 agent 的标签仍回 Home。
  - **Home shows**：Default 是三个按钮的页面；Terminal 是主目录下的 shell；也可以选你自己的 mod。`~/.config/herdr-app/mods` 里 `mod.json` 写了 `"home": true` 的 mod 才会出现在选项里。选了立即替换。在 Home 的终端里起 agent，这个 space 会原地变成普通 space，按目录命名，画面不动；下次回 Home 会新建一个 Home。
  - **Sidebar shows**（在 Sidebar 页）：Inbox 或 Lists，和 `cmd-shift-l` 是同一个开关。
- **聚焦边框**（默认关闭）：把 `~/.config/herdr-app/layouts/herdr-t3.json` 里窗格的 `focus.color` 从 `"background"` 改成 `"accent"`（或其他主题色），聚焦的窗格就会有边框。保存即生效。
- **Snooze**：鼠标移到卡片上（工作中的也可以，需要你的不行），点时钟选时间。它进 Snoozed 收纳区等待，到点回到原位并标 `Woke`，直到你在选中 Inbox 时看过它，或点一下这个标记。其间需要你时它会出现；这一轮失败、你在查看时给了新工作（Lists 里也算）、置顶或 Settle 都会结束 Snooze。5 秒内可以点 `Undo` 撤回；在收纳区里，悬停一行出现划掉的闹钟（按住划过多行可以一次叫醒整段），也可以把它拖出来。

## 快捷键

布局的快捷键写在 `keys.json` 的 `layout:herdr-t3` 里，安装时会合并进去。下表也列出随布局提供的替代键，例如 Clean up 的 `ctrl-alt-r`。在 Linux 和 Windows 上，也可以在自己的 `keys.json` 里把 Herdr 原生快捷键绑定到下面的命令，使用布局的关闭确认和 space 编号规则。

| 快捷键 | 命令 | 作用 |
| --- | --- | --- |
| `cmd-shift-b` | `t3-tabs.details` | 切换详情 |
| `cmd-b` | `t3-tabs.toggle-sidebar` | 隐藏或显示侧栏，和侧栏按钮一样。在本布局里它取代 Herdr 的 `layout.toggle:sidebar` |
| `cmd-shift-l` | `t3-tabs.sidebar` | 在 Lists 和 Inbox 之间切换侧栏；侧栏隐藏时不起作用。在本布局里它取代 Herdr 的 `layout.switch` |
| `cmd-shift-s` | `t3-tabs.settle` | Settle 当前查看的 agent 并回到 Home，已 Settle 的则取回。选中 Inbox 时能用，显示或隐藏都一样；Lists 里不起作用。忙着的不动，置顶的会取消置顶 |
| `cmd-shift-z` | `t3-tabs.undo` | Undo，提示可撤销时有效 |
| `cmd-shift-h` | `t3-tabs.home` | 回到 Home |
| `cmd-shift-,` | `t3-tabs.settings` | 打开布局的设置 |
| `cmd-alt-b` | `t3-tabs.panel` | 打开 space 面板并停在上次的页面，或关闭它 |
| `cmd-shift-g` | `t3-tabs.review` | 打开面板并切到 Review；已在显示 Review 就关闭面板。需装 Review 扩展 |
| `cmd-shift-e` | `t3-tabs.files` | 打开面板并切到 Files；已在显示 Files 就关闭面板 |
| Files 或 Review 里 `cmd-w`、`ctrl-alt-shift-x` | `t3-files.close`、`review.close` | 关闭活动面板标签，不关终端 |
| Files 或 Review 里 `cmd-t` | `t3-chrome.surface-menu` | 在 + 下打开菜单，F／R 添加 Files／Review |
| 终端焦点内 `cmd-t`、`ctrl-alt-c` | `t3-tabs.new` | 新建终端标签 |
| `ctrl-1…9`、`ctrl-alt-shift-1…9` | `t3-tabs.space:<n>` | 第 n 个 space，不算 Home |
| `cmd-alt-]` / `cmd-alt-[`、`ctrl-alt-shift-]` / `ctrl-alt-shift-[` | `t3-tabs.space-next` / `t3-tabs.space-prev` | 下一个或上一个 space，跳过 Home |
| `cmd-1…9`、`ctrl-alt-1…9` | `t3-tabs.tab:<n>` | 标签栏显示的第 n 个标签 |
| `cmd-shift-]` / `cmd-shift-[`、`ctrl-tab` / `ctrl-shift-tab`、`ctrl-alt-]` / `ctrl-alt-[` | `t3-tabs.tab-next` / `t3-tabs.tab-prev` | 标签栏显示的下一个或上一个标签 |
| `cmd-p` | `mod.open:t3-picker` | 按名字或程序跳到任一窗格，或回到上一处 |
| `cmd-shift-r`／`ctrl-alt-r` | `t3-tabs.cleanup` | Clean up：关掉闲置终端，停掉被落下的程序 |
| `cmd-]` / `cmd-[` | `t3-tabs.next` / `t3-tabs.prev` | 下一个或上一个顶层 agent，按选中侧栏的顺序走，到两端停住，显示或隐藏都一样。Inbox 走它画出来的行（折叠的 shelf 只算当前查看的那一行）；Lists 也走折叠的组 |
| `cmd-w`、`ctrl-alt-shift-x` | `t3-tabs.close-tab` | 关闭标签，里面有程序在运行时先确认 |
| `cmd-shift-w`、`ctrl-alt-x` | `t3-tabs.close-pane` | 关闭窗格，里面有程序在运行时先确认 |

有对话框或弹窗开着时（Go to、New、菜单、Settings、命令面板、Actions 编辑器等），这几个关闭标签和窗格的键改为关掉它，和 Herdr 自带布局一样（`keys.json` 里的 `mod:…` 分区）。

在 Files 或 Review 里，`cmd-shift-w` 和 `ctrl-alt-x` 用来收起当前菜单。要用这两个键关闭终端窗格，先把焦点移回终端。

其他标签、space 和窗格操作沿用 Herdr 自己的快捷键。Inbox 里的置顶和拖动用鼠标。

键盘操作：用 Herdr 的 `pane.go` 移到侧栏列表后，Tab 能走遍窗口里的所有控件，包括面板按钮，Enter 或 Space 和点击效果相同。在新建菜单和跳转里，Tab 还能走到底部按钮（New space、`← Spaces`、New tab in…）。

## 更新

更新器会检查布局和快捷键配置各自包含一个 JSON 对象，并检查必需 mod 的入口文件。如果复制期间保存了布局或快捷键，更新器会保留你的修改，提示冲突和已经更新的内容。保存完毕后重新运行即可。

同一 Herdr 目录每次只运行一个更新。如果中断后留下 `.herdr-t3-update.lock`，先确认该次更新和 `rsync` 进程都已结束，用 `rmdir` 移除空锁目录，再重试。

Herdr 不会更新别人做的 mod 和布局。再添加一次也不行：安装从不覆盖已有文件，只会装出一份改了名的副本（如 `t3-inbox-2`）。更新要靠覆盖：

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

也可以对你的 Herdr agent 说：「更新 Herdr T3：clone github.com/JinJieBeWater/herdr-t3，运行里面的 `scripts/update.sh`，然后对每个 `mods/t3-*` 跑 `herdr-app check`。」mod 保存后自动重载，不用重启。脚本需要 `jq` 和 `rsync`；缺少其中之一，或者你的 `keys.json`、布局不是有效的 JSON 时，它会在改动任何文件前停下。

- 覆盖：`mods/t3-*` 和 `layouts/herdr-t3.*`（并删掉已移除的文件），以及你已安装的 Review、主题导出扩展和附带主题。没安装的扩展不会被装上。
- 合并 `keys.json`：仓库的按键写进你的 `layout:herdr-t3` 分区和弹窗的 `mod:…` 分区，相同的键被替换，并逐条打印被替换的，方便你改回去；其他按键和分区不动。你的分区里有、仓库没有的键也会打印出来：旧键（比如 `"cmd-shift-a": "t3-tabs.view"`）可以删掉。
- 会保留的内容包括置顶、折叠、排序、布局的设置、Settled 收纳区和已 Settle 的 agent、New 记住的项目，以及你的动作。已安装布局里的主题、当前侧栏、聚焦边框颜色、面板的 Review 位，以及仍已安装的 Review 栏和主题导出块配置也会保留。扩展卸载后，下次更新会移除它的布局块。
- 会丢掉：你对被覆盖文件的其他修改，需要重新改。Settle 后跳到下一张卡片现在是一项设置，不用再改文件。
- 如果首次安装时因为重名改过名字，脚本并不知道：它会装上原来的名字，你可以让布局改回指向自己那份，或者删掉那份。
- 改了什么、一些键的效果有什么变化：见[更新日志](../../CHANGELOG.zh-CN.md)。

## 已知限制

- Home 是一个单独的 space：切到其他布局、执行 `herdr-app ls` 或从另一台机器看时，会看到它。
- 你给 Home 改了名后，同一 Herdr core 的另一个窗口认不出它，会再建一个 Home。
- 其他机器上的 space，面板里的 Review 置灰，你自己加的 Review 栏也不显示。
- 其他机器上的 Files：可见时文本变化通常在 10 秒内显示，大仓库适当放慢；图片重新点选时重读，超过 512 KB 的图片不预览。
- Files 只预览 1 MB 以内的文本，只给常见语言着色（JavaScript 和 TypeScript、JSON、YAML、Rust、Go、Python、shell、CSS、C 和 C++、Java、Kotlin、Ruby、PHP、SQL、Lua、GraphQL、Makefile）；TOML、HTML、Swift 等显示为纯文本。agent 改写你正看着的超过 16 KB 的文件、或你对它切换 Wrap 后，它先显示片刻纯文本，内容约 10 秒不再变化（Wrap 是 0.3 秒）后再着色；其间你滚动过，就保持纯文本，直到再次打开。超过 256 KB 的不自动着色，按代码上方的 **Highlight anyway** 才着色，着色时窗口会停顿片刻。
- Files 用 Herdr 原生的只读编辑器显示代码，所以行号栏的底色和高度没法照 T3。文字仍可选中。
- 长行自动换行（Files 和 Review 的默认）时在面板边缘断行，Review 里必要时会从单词中间断开，但不会拆开带重音的字母或连成一个的 emoji。
- Files 只按路径搜索，不搜内容，也不含 Git 忽略的文件；不在 Git 里时最多搜 20 万个文件。
- 这次启动 Herdr 后 Inbox 还没显示过时，侧栏隐藏期间它不更新卡片顺序，`cmd-]` 和 `cmd-[` 可能按旧顺序走。`cmd-shift-s` 照常能 Settle。

点击终端里的路径不会打开它：Herdr 不把终端里的点击告诉布局。
