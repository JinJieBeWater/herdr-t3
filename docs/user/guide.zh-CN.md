# Herdr T3 使用指南

[English](guide.md) · 中文

比 [README](../../README.zh-CN.md) 更详细地说明每个部分。

## 功能

- **两种侧栏，一键切换**（`cmd-shift-b`）：Inbox 按注意力组织，Lists 按项目组织，`cmd-]` 和 `cmd-[` 在两边都能逐个走。Settle、Snooze 藏起工作中的 agent、关闭当前 agent 后回到 Home，都只属于 Inbox；在 Lists 里关闭它会回到你之前看的标签。标签栏也不同。
  - Spaces：只在不寻常时显示仓库、分支和领先/落后；worktree 折叠在所属仓库下，checkout 开没开都一样；机器多于一台时按机器分组，`ctrl-1…9` 和切换下一个 space 的键按看到的顺序走。
  - Agents：按 space 或按优先级分组，可置顶，子 agent 缩进在父级下。
  - Inbox：T3 式 Settle。需要你的 agent 以卡片留在上方，等你处理的排最前；结束的由你手动 Settle 进底部的安静列表，有新工作时自动回来。工作中的 agent 折叠进 Working 收纳区。Snooze 把任何不需要你的 agent 藏到你选的时间。
- **各处同一个名字**：Inbox 卡片、agents 列表、标签和窗格标题用同一条规则给终端取名：Pi 在跑时用 Pi 会话名，其次是你命名过的标签，再其次是有意义的终端标题，最后是程序名。同一个标签里的两个 Pi 各自显示自己的会话名；Pi 退出后在原处启动的 lazygit 显示为 lazygit，不沿用旧会话名。
- **各处同一套状态标记**：工作中转圈，blocked 或这一轮失败时显示 `!`，done 显示圆点。已 Settle 或 Snooze 的 agent 在各处都不再显示 done 圆点，Lists 也一样；只有 Inbox 会藏起工作中的 Snooze agent，其他地方照样转圈。显示 Inbox 时，标签上不显示任何标记：什么需要你由侧栏来说。
- **窄标签、带框窗格**：24px 标签，照 T3 的面板标签；圆角窗格带 28px 标题栏（名字、目录、状态；悬停时出现分屏、缩放、关闭）；分屏时，你不在的窗格标题栏变暗，同 T3。选了 Inbox 时，收起的 agent 也在这里标出：已 Settle 显示勾，Snooze 中显示闹钟和剩余时间。有子 agent 的 agent 在这里显示子 agent 数量，有需要你的就显示需要你的个数；点开只列出这个 agent 的子 agent，每个一行：程序图标、名字、已工作多久或在等什么，最右是它自己的状态，标记同 Agents；嵌套的缩进。悬停显示详情，选一个就 peek 它。Inbox 里就靠它打开子 agent。zoom 一个分屏的标签，标签栏会展开它的各个窗格，每个一段：点一段就改 zoom 它；用窗格标题栏的缩放按钮或 `cmd-shift-enter` 还原分屏。
- **Inbox 下的标签栏**：以你正在看的 agent 为主角，也就是 Inbox 亮着的卡片。左边是它的 space、是子 agent 时的父级和它的名字；点 space 去这里的空标签，已有就切过去、没有才新建，这时标签栏右边不再有 `+`；点名字或 `⌄` 打开这个 agent 的菜单：Pin、Snooze、Settle，和卡片上一样，标签里只有它时还有 Rename。右键名字或父级打开那个 agent 的菜单，和 T3 一样；右键 space 打开 space 的菜单。这里只写你正在看的 agent：同一标签里的其他 agent 用它的卡片或窗格去。右边分开放：它的子 agent 的标签，再是不含 agent 的标签。焦点在程序上时 agent 留在那里但不亮；从标签栏进入工具标签时它变暗，点它回去。点左边的 space 或按 `cmd-t` 开始新的事之后只有 space，直到你再看某个 agent。这个 agent 的窗格单独显示时，标题里不再写标签栏已经写了的名字。
- **新建**：标签栏的 `+` 直接在当前 space 开终端标签（显示 Inbox 时由标签栏左边的 space 承担，先去已有的空标签）；侧栏的 New tab（Lists 和 Inbox 都有）先选 space。侧栏的 New space 在机器多于一台时先问建在哪台；`cmd-n` 不问，直接用当前 space 的机器。不选 agent：在终端里启动。
- **Home**：Settle 或 Snooze 当前查看的 agent 后，回到一个安静的固定位置，不再跳到下一张卡片，下一步看什么由你决定。想继续跳到下一张，或者把 Home 换成终端或别的 mod，见下面的设置。用这里的按钮或 `cmd-]`、`cmd-p`、`cmd-t` 决定下一步，Undo 能带回刚才的 agent。`cmd-shift-h` 或侧栏左上角的 Herdr logo 可随时进入。它不占 space 序号。它只放一样东西（页面、终端或 mod），没有窗格标题栏：不能 split 也不能关，agent 也不会留在里面。侧栏显示时，空的标签栏会收起，Home 占满高度。
- **跳转**（`cmd-p`，或 Inbox 的 Search）：每个窗格一行，agent 和程序都在，名字和图标与窗格标题相同（标签名只有你命名过才算），所以输入 `lazygit` 就能直接跳到那个窗格，不管它旁边有没有 agent、在哪个 space。最近待过的窗格排在最前，越近越前，不管当时是怎么切过去的，所以 `cmd-p`、回车就回到刚才所在的窗格；你所在的窗格排最后。输入时，名字匹配的排在只靠目录或 space 匹配的前面。
- **动作**，类似 T3 Code 的运行按钮：标签栏右上角的 `▶` 运行上次用过的动作，`▾` 列出全部动作（点一个就运行），每项有齿轮可编辑，底部可 Add action。每个动作是一条命令，在新标签或右/下分屏里运行，目录默认用当前终端的，也可以单独指定。在界面里编辑，不用改文件。它是 `t3-actions` mod，随布局一起安装，也[单独发布](https://github.com/JinJieBeWater/herdr-t3-actions)给其他布局用。
- **其他机器**：机器多于一台时 Spaces 按机器分组，来自其他机器的 Inbox 卡片带服务器标记，标记不单独弹提示。Lists 的 Agents 行只在悬停详情里显示机器名；Inbox 卡片的悬停详情也能查看机器名。在 Herdr 的 Settings 里添加机器；重建过的机器会提供 Connect，New space 会先问建在哪台机器上。
- **程序图标**：Inbox、Agents、标签、窗格标题、Go to 和子 agent 菜单直接使用 Herdr 官方素材，保留原有留白和配色，图标槽按各组件的尺寸绘制。
- **项目图标**：space 显示其仓库的 favicon（在它所在的机器上查找），没有时显示 T3 配色的首字母图标。
- **右键菜单**：代表 agent、space、仓库、机器、标签或窗格的东西，右键都打开它的菜单，在哪里右键都是同一份。agent 的（Inbox 卡片、Agents 行、标签栏里的名字）：Pin、Settle、Snooze 或 Wake（只在 Inbox 下有；鼠标停在 Snooze 上，时间选项在菜单旁边展开，同 T3 的子菜单）、标签里只有它时的 Rename、Copy address、Send back 回父级、Close。space 的（Spaces 或 Agents 里的行、标签栏、Inbox 的筛选）：New tab、Rename、Copy path、New worktree 和 Open worktree、Remove worktree、Close。Spaces 里仓库那一行暗行：Open、Copy path。机器标题：New space here、Connect。标签的：New tab、Rename、Close。窗格的（终端、窗格标题栏）：Split、Zoom、Copy address、Send right-clicks to pane、Close pane。当下做不了的不列出来。
- **关闭前确认**：标签或窗格的 ×、`cmd-w`、`cmd-shift-w` 和右键菜单的 Close 在有程序运行时先询问，没有程序运行时直接关闭。
- **space 面板**：窗口右侧和侧栏一样高的面板，页面有 Files，装了 Review 扩展时还有 Review，同时只显示一页。切换标签时它不动，内容跟着当前 space；每个 space 各记它开没开、在哪一页、放没放大，照 T3 按 thread 记的做法，没打开过面板的 space 里它是关着的。标签栏右端的按钮（和侧栏开关左右对称）打开面板，停在上次的页面，再按就关闭（装了 Review 扩展时，它是 Review 栏的最后一段）；快捷键照 T3：`cmd-alt-b` 和这个按钮一样，键盘在面板里时 `cmd-w` 关闭面板；`cmd-shift-g` 打开面板并切到 Review，已在 Review 时则关闭。它的顶栏有各页的页签、`⤢`（放大盖住标签区，再按还原）和 `×`（关闭）。拖它的左边缘可以调宽度，一开始和标签区一样宽；页签栏固定为 40px 高。Files 和 Review 各记自己的文件、阅读位置、换行和树宽；切页只恢复该页。每页只缓存最近三个 space 的完整数据；更早的保留阅读选择，回来重读。Files 隐藏后停止读取和刷新，两页都不保留递归目录监听。Files 显示时本机通常每 5s、远程每 10s 检查，大仓库适当放慢；Review 每 15s 刷新，重新显示时立即补读。
- **Files**：只读浏览当前 space 的文件夹，本机或其他机器上的都可以。右边的文件树和 Review 的是同一个，边展开边读取（只含一个文件夹的文件夹合成一行 `a / b`），Git 忽略的项变暗，改动的文件用 Review 的颜色标 A、M、D 或 R；折叠的文件夹里有改动时带一个点。选一个文件，左边显示内容：代码带语法着色，Markdown 默认显示预览（也可以看源码，会记住上次的选择），图片直接显示。树所在列顶部的 Search files 按路径找任何文件，没展开的文件夹也算：输入几个词，每个词都要出现在路径里；↑/↓、Enter 和 Esc 可用。在树里，↑/↓ 移动，← 和 → 收起、展开文件夹，Enter 打开文件。点文件上方路径里的文件夹，会在树里定位到它。在某一行右键可以复制路径或相对路径、在这个 space 的 agent 里提及它（输进它的输入框，不按回车）、在 Finder 里显示或用默认应用打开（后两项只限本机）。工具栏的换行按钮切换代码在面板边缘自动换行（默认）或横向滚动；悬停提示为 Scroll long lines 或 Wrap long lines。这个选择独立于 Review 设置里的 Lines。文本有变化时会自己更新；图片重新点选时重读。Files 和 Review 布局相同：顶部一条工具栏，内容在左，文件树在右边的一列里，每页各记自己的宽度；拖这一列的左缘调宽，或者用工具栏最右的树形按钮关掉它（每页各自记住）。搜索框旁边的按钮一次折叠或展开所有文件夹。
- **Review**（可选，[见扩展](extras.zh-CN.md#pullsreview)）：面板的 Review 页评审当前焦点所在的 worktree；点它的页签或按 `cmd-shift-g` 打开。每个 space 各有自己的评审，页面显示当前 space 的。工具栏下方照 pulls.review 是一行组页签：每个页签有类别图标、名字、需要留意时的标记、增删行数、文件数，以及表示已看多少的进度环。选一个组，左边的 diff 和右边的文件树就只显示这个组，AI 分析过后，它的说明显示在 diff 顶部。AI 分析之前按文件夹分组（Docs、Code……）；只有一个组时不列组。树和 Files 一样，每层先目录后文件，名称忽略大小写、数字按数值排；diff 和 `j`/`k` 沿用相同顺序。文件夹默认折叠，只展开到正在看的文件，组的子组是其中的行；正在看的文件是唯一高亮的一行，滚动 diff 时跟着走。每行行首是已看勾选。在文件或文件夹上右键，菜单和 Files 的相同，另有 Mark reviewed。标签栏里不显示计数，下面的范围菜单里有。分析进度用布局的状态标记显示：面板关着时在面板按钮里、图标左边，开着时在面板的 Review 页签上，这个页签用的是 pulls.review 的 logo。Review 页顶栏左边的范围按钮照 T3 Code 的 diff 面板，写着正在看的范围（Changes、Uncommitted、Outgoing、Incoming 或某个 commit），点开菜单换一个：上面四项带数量，下面是 Commits，在旁边展开一个可搜索的子菜单。在 Changes 下，`head →` 后面的 base 是一个按钮，照 T3：点开换一个分支来比较，本地或远程都行（行尾的开关切到远程版本），或者选 Automatic 回到默认分支。每个 space 记住自己选的 base，Commits 也只列这个 base 之后的提交。其他机器上的 space 没有 Review。

## 日常用法

- **侧栏**：侧栏右上角的按钮（或 `cmd-shift-b`）在 Lists 和 Inbox 之间切换；旁边那个按钮隐藏侧栏。
- **Inbox**：鼠标移到已结束的卡片上，点 `✓ Settle` 收起；有新工作时它会自己回来，也可以点那一行的撤销箭头拿回来。`cmd-shift-s`（隐藏侧栏时也能用，Lists 里不起作用）Settle 当前查看的 agent 并回到 Home，已 Settle 的则取回。你自己取回的 agent（点撤销箭头、拖出 Settled 或按 `cmd-shift-s`）排到 Active 顶部。点 `Undo` 则放回原位。接着按 `cmd-]` 打开最上面的卡片，可以逐张处理。卡片和行可以像 T3 一样拖动：移动 6px 即拿起；`Pinned` 和 `Active` 标签展开，拿起的行标出松开后的动作（Pin、Unpin、Settle、Un-settle），列表在落点让出位置。Pinned 保留你排的顺序，新置顶的排最上，Active 和 Settled 按各自的排序。按 Esc 或从侧栏左右两侧拖出放回原处，从上下边缘拖出则按标记落下；Working 卡片拿不起来。按住卡片的 `✓ Settle`（或已 Settle 行的撤销箭头）划过多行，可以一次 Settle（或取回）整段。和 Agents 列表共用同一份置顶。
- **设置**：侧栏底部的 sliders 按钮或 `cmd-shift-,` 打开布局自己的设置，样子和 Herdr 的设置一样。改动立即生效，更新后也保留。
  - **After putting away**：Home（默认），或 Next card：Settle、Snooze、拖走或划走当前查看的 agent 后打开下一张卡片，没有下一张就回 Home。关闭 agent 的标签仍回 Home。
  - **Home shows**：Default 是三个按钮的页面；Terminal 是主目录下的 shell；也可以选你自己的 mod。`~/.config/herdr-app/mods` 里 `mod.json` 写了 `"home": true` 的 mod 才会出现在选项里。选了立即替换。在 Home 的终端里起 agent，这个 space 会原地变成普通 space，按目录命名，画面不动；下次回 Home 会新建一个 Home。
- **聚焦边框**（默认关闭）：把 `~/.config/herdr-app/layouts/herdr-t3.json` 里窗格的 `focus.color` 从 `"background"` 改成 `"accent"`（或其他主题色），聚焦的窗格就会有边框。保存即生效。
- **Snooze**：鼠标移到卡片上（工作中的也可以，需要你的不行），点时钟选时间。它进 Snoozed 收纳区等待，到点回到原位并标 `Woke`，直到你看过它或点一下这个标记。其间需要你时它会出现；这一轮失败、你在查看时给了新工作（Lists 里也算）、置顶或 Settle 都会结束 Snooze。5 秒内可以点 `Undo` 撤回；在收纳区里，悬停一行出现划掉的闹钟（按住划过多行可以一次叫醒整段），也可以把它拖出来。

## 快捷键

布局自带的，写在 `keys.json` 的 `layout:herdr-t3` 里（安装时会合并进去）。这些只覆盖 macOS 的键：`keys.json` 不能按平台区分按键，所以在 Linux 和 Windows 上，Herdr 自己的键（`ctrl-shift-w` 关闭标签、`alt-1…` 选 space 等）仍执行 Herdr 的命令，绕过布局的规则，比如关闭前确认、序号不算 Home。请在你自己的 `keys.json` 里把它们绑到下面的命令。

| 快捷键 | 命令 | 作用 |
| --- | --- | --- |
| `cmd-shift-b` | `t3-tabs.sidebar` | 侧栏在 Lists 和 Inbox 之间切换 |
| `cmd-shift-s` | `t3-tabs.settle` | Settle 当前查看的 agent 并回到 Home，已 Settle 的则取回。选中 Inbox 时能用，显示或隐藏都一样；Lists 里不起作用。忙着的不动，置顶的会取消置顶 |
| `cmd-shift-h` | `t3-tabs.home` | 回到 Home |
| `cmd-shift-,` | `t3-tabs.settings` | 打开布局的设置 |
| `cmd-alt-b` | `t3-tabs.panel` | 打开 space 面板并停在上次的页面，或关闭它 |
| `cmd-shift-g` | `t3-tabs.review` | 打开面板并切到 Review；已在显示 Review 就关闭面板。需装 Review 扩展 |
| 键盘在面板里时 `cmd-w`、`ctrl-alt-shift-x` | `t3-files.close`、`review.close` | 关闭面板，而不是后面的标签 |
| `cmd-t`、`ctrl-alt-c` | `t3-tabs.new` | 在当前位置新建标签；在 Home 时打开新建菜单，先选 space |
| `ctrl-1…9`、`ctrl-alt-shift-1…9` | `t3-tabs.space:<n>` | 第 n 个 space，不算 Home |
| `cmd-alt-]` / `cmd-alt-[`、`ctrl-alt-shift-]` / `ctrl-alt-shift-[` | `t3-tabs.space-next` / `t3-tabs.space-prev` | 下一个或上一个 space，跳过 Home |
| `cmd-1…9`、`ctrl-alt-1…9` | `t3-tabs.tab:<n>` | 标签栏显示的第 n 个标签 |
| `cmd-shift-]` / `cmd-shift-[`、`ctrl-tab` / `ctrl-shift-tab`、`ctrl-alt-]` / `ctrl-alt-[` | `t3-tabs.tab-next` / `t3-tabs.tab-prev` | 标签栏显示的下一个或上一个标签 |
| `cmd-p` | `mod.open:t3-picker` | 按名字或程序跳到任一窗格，或回到上一处（和 Inbox 顶栏的 Search 相同） |
| `cmd-]` / `cmd-[` | `t3-tabs.next` / `t3-tabs.prev` | 下一个或上一个顶层 agent，按选中侧栏的顺序走，到两端停住，显示或隐藏都一样。Inbox 走它画出来的行（折叠的 shelf 只算当前查看的那一行）；Lists 也走折叠的组 |
| `cmd-w`、`ctrl-alt-shift-x` | `t3-tabs.close-tab` | 关闭标签，里面有程序在运行时先确认 |
| `cmd-shift-w`、`ctrl-alt-x` | `t3-tabs.close-pane` | 关闭窗格，里面有程序在运行时先确认 |

有对话框或弹窗开着时（Go to、New、菜单、Settings、命令面板、Actions 编辑器等），这几个关闭标签和窗格的键改为关掉它，和 Herdr 自带布局一样（`keys.json` 里的 `mod:…` 分区）。

其他标签、space 和窗格操作沿用 Herdr 自己的快捷键。Inbox 里的置顶和拖动用鼠标；Clear 和其他按钮一样能用键盘。

键盘操作：用 Herdr 的 `pane.go` 移到侧栏列表后，Tab 能走遍窗口里的所有控件，包括面板按钮，Enter 或 Space 和点击效果相同。在新建菜单和跳转里，Tab 还能走到底部按钮（New space、`← Spaces`、New tab）。

## 更新

Herdr 不会更新别人做的 mod 和布局。再添加一次也不行：安装从不覆盖已有文件，只会装出一份改了名的副本（如 `t3-inbox-2`）。更新要靠覆盖：

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

也可以对你的 Herdr agent 说：「更新 Herdr T3：clone github.com/JinJieBeWater/herdr-t3，运行里面的 `scripts/update.sh`，然后对每个 `mods/t3-*` 跑 `herdr-app check`。」mod 保存后自动重载，不用重启。脚本需要 `jq` 和 `rsync`；缺少其中之一，或者你的 `keys.json`、布局不是有效的 JSON 时，它会在改动任何文件前停下。

- 覆盖：`mods/t3-*` 和 `layouts/herdr-t3.*`（并删掉已移除的文件），以及你已安装的 Review、主题导出扩展和附带主题。没安装的扩展不会被装上。
- 合并 `keys.json`：仓库的按键写进你的 `layout:herdr-t3` 分区和弹窗的 `mod:…` 分区，相同的键被替换，并逐条打印被替换的，方便你改回去；其他按键和分区不动。你的分区里有、仓库没有的键也会打印出来：旧键（比如 `"cmd-shift-a": "t3-tabs.view"`）可以删掉。
- 会保留：置顶、折叠、排序、布局的设置、Settled 收纳区和已 Settle 的 agent（存在 `data/`、`shared.json` 和终端标签里），以及你的动作；已安装布局里的主题、当前选中的侧栏、聚焦边框颜色、面板的 Review 页、Review 栏和主题导出的块。
- 会丢掉：你对被覆盖文件的其他修改，需要重新改。Settle 后跳到下一张卡片现在是一项设置，不用再改文件。
- 如果首次安装时因为重名改过名字，脚本并不知道：它会装上原来的名字，你可以让布局改回指向自己那份，或者删掉那份。
- 改了什么、一些键的效果有什么变化：见[更新日志](../../CHANGELOG.zh-CN.md)。从 Focus 改名为 Inbox 之前的版本升级（`t3-focus` → `t3-inbox`）时，先把 `data/t3-focus` 改名为 `data/t3-inbox`（卡片顺序和收纳区状态），再删掉 `mods/t3-focus`。

## 已知限制

- Home 是一个单独的 space：切到其他布局、执行 `herdr-app ls` 或从另一台机器看时，会看到它。
- 你给 Home 改了名后，同一 Herdr core 的另一个窗口认不出它，会再建一个 Home。
- 其他机器上的 space 没有 Review 栏，也没有 Review 页。
- 其他机器上的 Files：可见时文本变化通常在 10 秒内显示，大仓库适当放慢；图片重新点选时重读，超过 512 KB 的图片不预览。
- Files 只预览 1 MB 以内的文本，只给常见语言着色（JavaScript 和 TypeScript、JSON、YAML、Rust、Go、Python、shell、CSS、C 和 C++、Java、Kotlin、Ruby、PHP、SQL、Lua、GraphQL、Makefile）；TOML、HTML、Swift 等显示为纯文本。
- 长行自动换行（Files 和 Review 的默认）时在面板边缘断行，Review 里必要时会从单词中间断开，但不会拆开带重音的字母或连成一个的 emoji。
- Files 只按路径搜索，不搜内容，也不含 Git 忽略的文件；不在 Git 里时最多搜 20 万个文件。
- 这次启动 Herdr 后 Inbox 还没显示过时，侧栏隐藏期间它不更新卡片顺序，`cmd-]` 和 `cmd-[` 可能按旧顺序走。`cmd-shift-s` 照常能 Settle。
