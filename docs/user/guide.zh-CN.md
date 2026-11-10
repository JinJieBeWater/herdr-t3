# Herdr T3 使用指南

[English](guide.md) · 中文

比 [README](../../README.zh-CN.md) 更详细地说明每个部分。

## 功能

- **两种侧栏，一键切换**（`cmd-shift-b`）：Inbox 按注意力组织，Lists 按项目组织，`cmd-]` 和 `cmd-[` 在两边都能逐个走。Settle、Snooze 藏起工作中的 agent、关闭当前 agent 后回到 Home，都只属于 Inbox；在 Lists 里关闭它会回到你之前看的标签。标签栏也不同。
  - Spaces：只在不寻常时显示仓库、分支和领先/落后；worktree 折叠在所属仓库下，checkout 开没开都一样；机器多于一台时按机器分组。
  - Agents：按 space 或按优先级分组，可置顶，子 agent 缩进在父级下。
  - Inbox：T3 式 Settle。需要你的 agent 以卡片留在上方；结束的由你手动 Settle 进底部的安静列表，有新工作时自动回来。工作中的 agent 折叠进 Working 收纳区。Snooze 把任何不需要你的 agent 藏到你选的时间。
- **各处同一个名字**：Inbox 卡片、agents 列表、标签和窗格标题用同一条规则给终端取名：Pi 在跑时用 Pi 会话名，其次是你命名过的标签，再其次是有意义的终端标题，最后是程序名。同一个标签里的两个 Pi 各自显示自己的会话名；Pi 退出后在原处启动的 lazygit 显示为 lazygit，不沿用旧会话名。
- **各处同一套状态标记**：工作中转圈，blocked 或这一轮失败时显示 `!`，done 显示圆点。已 Settle 或 Snooze 的 agent 在各处都不再显示 done 圆点，Lists 也一样；只有 Inbox 会藏起工作中的 Snooze agent，其他地方照样转圈。显示 Inbox 时，标签上不显示任何标记：什么需要你由侧栏来说。
- **窄标签、带框窗格**：24px 标签，照 T3 的面板标签；圆角窗格带 28px 标题栏（名字、目录、状态；悬停时出现分屏、缩放、关闭）。有子 agent 的 agent 在这里显示子 agent 数量，有需要你的就显示需要你的个数；点开只列出这个 agent 的子 agent，每个一行：程序图标、名字、已工作多久或在等什么，最右是它自己的状态，标记同 Agents；嵌套的缩进。悬停显示详情，选一个就 peek 它。Inbox 里就靠它打开子 agent。
- **新建**：标签栏的 `+` 直接在当前 space 开终端标签；侧栏的 New tab（Lists 和 Inbox 都有）先选 space。侧栏的 New space 在机器多于一台时先问建在哪台；`cmd-n` 不问，直接用当前 space 的机器。不选 agent：在终端里启动。
- **Home**：Settle 或 Snooze 当前查看的 agent 后，回到一个安静的固定位置，不再跳到下一张卡片，下一步看什么由你决定。想继续跳到下一张，或者把 Home 换成终端或别的 mod，见下面的设置。用这里的按钮或 `cmd-]`、`cmd-p`、`cmd-t` 决定下一步，Undo 能带回刚才的 agent。`cmd-shift-h` 或侧栏左上角的 Herdr logo 可随时进入。它不占 space 序号。它只放一样东西（页面、终端或 mod），没有窗格标题栏：不能 split 也不能关，agent 也不会留在里面。侧栏显示时，空的标签栏会收起，Home 占满高度。
- **跳转**（`cmd-p`，或 Inbox 的 Search）：每个窗格一行，agent 和程序都在，名字和图标与窗格标题相同（标签名只有你命名过才算），所以输入 `lazygit` 就能直接跳到那个窗格，不管它旁边有没有 agent、在哪个 space。第一行回到上次从这里跳走前的窗格，所以 `cmd-p`、回车就能来回切换。
- **动作**，类似 T3 Code 的运行按钮：标签栏右上角的 `▶` 运行上次用过的动作，`▾` 列出全部动作（点一个就运行），每项有齿轮可编辑，底部可 Add action。每个动作是一条命令，在新标签或右/下分屏里运行，目录默认用当前终端的，也可以单独指定。在界面里编辑，不用改文件。它是 `t3-actions` mod，随布局一起安装，也[单独发布](https://github.com/JinJieBeWater/herdr-t3-actions)给其他布局用。
- **其他机器**：机器多于一台时 Spaces 按机器分组，来自其他机器的 Inbox 卡片带服务器标记，标记不单独弹提示。Lists 的 Agents 行只在悬停详情里显示机器名；Inbox 卡片的悬停详情也能查看机器名。从侧栏底部的服务器图标添加机器；重建过的机器会提供 Connect，New space 会先问建在哪台机器上。
- **程序图标**：Inbox、Agents、标签、窗格标题、Go to 和子 agent 菜单直接使用 Herdr 官方素材，保留原有留白和配色，图标槽按各组件的尺寸绘制。
- **项目图标**：space 显示其仓库的 favicon（在它所在的机器上查找），没有时显示 T3 配色的首字母图标。
- **关闭前确认**：标签或窗格的 ×、`cmd-w`、`cmd-shift-w` 和右键菜单的 Close 在有程序运行时先询问，没有程序运行时直接关闭。
- **Review**（可选，[见扩展](extras.zh-CN.md#pullsreview)）：标签栏里的 Review 栏统计当前 worktree 待评审的内容，点击后打开：每个 space 一个，可以是分屏或独立标签，已经开着就跳过去。切换 commit 在窗格自己的顶栏。它的窗格标题（显示 Lists 时还有标签）用布局的状态标记显示分析进度，在 Inbox 里也有一张卡片。

## 日常用法

- **侧栏**：侧栏右上角的按钮（或 `cmd-shift-b`）在 Lists 和 Inbox 之间切换；旁边那个按钮隐藏侧栏。
- **Inbox**：鼠标移到已结束的卡片上，点 `✓ Settle` 收起；有新工作时它会自己回来，也可以点那一行的撤销箭头拿回来。`cmd-shift-s`（隐藏侧栏时也能用，Lists 里不起作用）Settle 当前查看的 agent 并回到 Home，已 Settle 的则取回。你自己取回的 agent（点撤销箭头、拖出 Settled 或按 `cmd-shift-s`）排到 Active 顶部。点 `Undo` 则放回原位。接着按 `cmd-]` 打开最上面的卡片，可以逐张处理。卡片和行可以像 T3 一样拖动：移动 6px 即拿起；`Pinned` 和 `Active` 标签展开，拿起的行标出松开后的动作（Pin、Unpin、Settle、Un-settle），列表在落点让出位置。Pinned 保留你排的顺序，Active 和 Settled 按各自的排序。按 Esc 或从侧栏左右两侧拖出放回原处，从上下边缘拖出则按标记落下；Working 卡片拿不起来。按住卡片的 `✓ Settle`（或已 Settle 行的撤销箭头）划过多行，可以一次 Settle（或取回）整段。和 Agents 列表共用同一份置顶。Review 有自己的卡片，分析时在 Working，结束后回到 Active：从任何地方点它都能回去，Settle 就是关闭并回到打开它之前的地方（从 Review 栏可以重开，已审标记和分析结果都还在）。
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

键盘操作：用 Herdr 的 `pane.go` 移到侧栏列表后，Tab 能走遍窗口里的所有控件，包括 Review 栏的计数段和 logo，Enter 或 Space 和点击效果相同。在新建菜单和跳转里，Tab 还能走到底部按钮（New space、`← Spaces`、New tab）。

## 更新

Herdr 不会更新别人做的 mod 和布局。再添加一次也不行：安装从不覆盖已有文件，只会装出一份改了名的副本（如 `t3-inbox-2`）。更新要靠覆盖：

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

也可以对你的 Herdr agent 说：「更新 Herdr T3：clone github.com/JinJieBeWater/herdr-t3，运行里面的 `scripts/update.sh`，然后对每个 `mods/t3-*` 跑 `herdr-app check`。」mod 保存后自动重载，不用重启。脚本需要 `jq` 和 `rsync`；缺少其中之一，或者你的 `keys.json`、布局不是有效的 JSON 时，它会在改动任何文件前停下。

- 覆盖：`mods/t3-*` 和 `layouts/herdr-t3.*`（并删掉已移除的文件），以及你已安装的 Review、主题导出扩展和附带主题。没安装的扩展不会被装上。
- 合并 `keys.json`：仓库的按键写进你的 `layout:herdr-t3` 分区和弹窗的 `mod:…` 分区，相同的键被替换，并逐条打印被替换的，方便你改回去；其他按键和分区不动。你的分区里有、仓库没有的键也会打印出来：旧键（比如 `"cmd-shift-a": "t3-tabs.view"`）可以删掉。
- 会保留：置顶、折叠、排序、布局的设置、Settled 收纳区和已 Settle 的 agent（存在 `data/`、`shared.json` 和终端标签里），以及你的动作；已安装布局里的主题、当前选中的侧栏、聚焦边框颜色、Review 和主题导出的块。
- 会丢掉：你对被覆盖文件的其他修改，需要重新改。Settle 后跳到下一张卡片现在是一项设置，不用再改文件。
- 如果首次安装时因为重名改过名字，脚本并不知道：它会装上原来的名字，你可以让布局改回指向自己那份，或者删掉那份。
- 改了什么、一些键的效果有什么变化：见[更新日志](../../CHANGELOG.zh-CN.md)。从 Focus 改名为 Inbox 之前的版本升级（`t3-focus` → `t3-inbox`）时，先把 `data/t3-focus` 改名为 `data/t3-inbox`（卡片顺序和收纳区状态），再删掉 `mods/t3-focus`。

## 已知限制

- Home 是一个单独的 space：切到其他布局、执行 `herdr-app ls` 或从另一台机器看时，会看到它。
- 你给 Home 改了名后，同一 Herdr core 的另一个窗口认不出它，会再建一个 Home。
- 其他机器上的 space 没有 Review 栏。
- 这次启动 Herdr 后 Inbox 还没显示过时，侧栏隐藏期间它不更新卡片顺序，`cmd-]` 和 `cmd-[` 可能按旧顺序走。`cmd-shift-s` 照常能 Settle。
