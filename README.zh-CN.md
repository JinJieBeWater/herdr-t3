# Herdr T3

[English](README.md) · 中文

给 Herdr App 用的 [T3 Code](https://github.com/pingdotgg/t3code) 风格布局。侧栏可以在 Lists（Spaces + Agents）和带 T3 式 Settle 的 Inbox 之间切换，另有窄标签栏和带圆角边框的窗格。

![Herdr T3](preview.png)

只想要 Settle 侧栏？它也单独发布了一份：[herdr-t3-focus](https://github.com/JinJieBeWater/herdr-t3-focus)。

## 理念

**节约人类的注意力。**

agent 可以越开越多，人的注意力却不会跟着变多。Herdr T3 的整个设计都围绕这一点。

> It's so nice to have 14 threads running and zero visible. Why let working threads get in the way of things that need your attention?
>
> —— [Theo](https://x.com/theo/status/2114131018575962496)

Inbox 的做法来自 [T3 Code](https://github.com/pingdotgg/t3code)。

## 功能

- **两种侧栏，一键切换**（`cmd-shift-b`）：Lists，或 Inbox。
  - Spaces：只在不寻常时显示仓库、分支和领先/落后；worktree 折叠在它的 checkout 下；机器多于一台时按机器分组。
  - Agents：按 space 或按优先级分组，可置顶，子 agent 缩进在父级下。
  - Inbox：T3 式 Settle。需要你的 agent 以卡片留在上方；结束的由你手动 Settle 进底部的安静列表，有新工作时自动回来。工作中的 agent 折叠进 Working 收纳区。
- **各处同一个名字**：Inbox 卡片、agents 列表、标签和窗格标题用同一条规则给终端取名：Pi 会话名，其次是你命名过的标签，再其次是有意义的终端标题，最后是程序名。同一个标签里的两个 Pi 各自显示自己的会话名。
- **各处同一套状态标记**：工作中转圈，blocked 或这一轮失败时显示 `!`，done 显示圆点。显示 Inbox 时，已 Settle 的 agent 在标签和窗格标题上也不再显示 done 圆点。
- **窄标签、带框窗格**：24px 标签，照 T3 的面板标签；圆角窗格带 28px 标题栏（名字、目录、状态；悬停时出现分屏、缩放、关闭）。
- **新建**：标签栏的 `+` 直接在当前 space 开终端标签；侧栏的 New tab 先选 space（或新建一个）。不选 agent：在终端里启动。
- **动作**，类似 T3 Code 的运行按钮：标签栏右上角的 `▶` 运行上次用过的动作，`▾` 列出全部动作（点一个就运行），每项有齿轮可编辑，底部可 Add action。每个动作是一条命令，在新标签或右/下分屏里运行，目录默认用当前终端的，也可以单独指定。在界面里编辑，不用改文件。它是 `herdr-actions` mod，随布局一起安装，也[单独发布](https://github.com/JinJieBeWater/herdr-actions)给其他布局用。

## 安装

让你的 Herdr agent 添加 `herdr.dev/layouts/JinJieBeWater/herdr-t3`。手动安装：把 `layouts/herdr-t3.json`、`layouts/herdr-t3.svg`、所有 `mods/t3-*` 和 `mods/herdr-actions` 复制进 `~/.config/herdr-app/`，把 `keys.json` 合并进你自己的。外观和行为见 [RECIPE.zh-CN.md](RECIPE.zh-CN.md)。

## 快速上手

- **侧栏**：侧栏右上角的按钮（或 `cmd-shift-b`）在 Lists 和 Inbox 之间切换；旁边那个按钮隐藏侧栏。
- **Inbox**：鼠标移到已结束的卡片上，点 `✓ Settle` 收起；有新工作时它会自己回来，也可以点那一行的撤销箭头拿回来。`cmd-shift-s` Settle 当前查看的 agent，已 Settle 的则取回；配合 `cmd-]` 可以逐张看完、逐张 Settle。卡片和行可以像 T3 一样拖动：移动 6px 即拿起；`Pinned` 和 `Active` 标签展开，拿起的行标出松开后的动作（Pin、Unpin、Settle、Un-settle），列表在落点让出位置。Pinned 保留你排的顺序，Active 和 Settled 按各自的排序。按 Esc 或从侧栏左右两侧拖出放回原处，从上下边缘拖出则按标记落下；Working 卡片拿不起来。按住卡片的 `✓ Settle`（或已 Settle 行的撤销箭头）划过多行，可以一次 Settle（或取回）整段。和 Agents 列表共用同一份置顶。
- **聚焦边框**（默认关闭）：把 `~/.config/herdr-app/layouts/herdr-t3.json` 里窗格的 `focus.color` 从 `"background"` 改成 `"accent"`（或其他主题色），聚焦的窗格就会有边框。保存即生效。

## 快捷键

布局自带的，写在 `keys.json` 的 `layout:herdr-t3` 里（安装时会合并进去）：

| 快捷键 | 命令 | 作用 |
| --- | --- | --- |
| `cmd-shift-b` | `t3-chrome.sidebar` | 侧栏在 Lists 和 Inbox 之间切换 |
| `cmd-shift-s` | `t3-inbox.settle` | Settle 当前查看的 agent 并跳到下一张卡片，已 Settle 的则取回。只在显示 Inbox 时生效；忙着的或置顶的不动 |
| `cmd-]` / `cmd-[` | `t3-chrome.next` / `t3-chrome.prev` | 下一个或上一个 agent。显示 Inbox 时照 T3：按 Inbox 画出来的行的顺序走（折叠的区只算当前查看的那一行），到两端停住。显示 Lists 时用 Herdr 的 `agent.next` / `agent.prev` |
| `cmd-w`、`ctrl-alt-shift-x` | `t3-tabs.close-tab` | 关闭标签，里面有程序在运行时先确认 |
| `cmd-shift-w`、`ctrl-alt-x` | `t3-tabs.close-pane` | 关闭窗格，里面有程序在运行时先确认 |

我自己加在 `global` 里的：

| 快捷键 | 命令 | 作用 |
| --- | --- | --- |
| `cmd-p` | `mod.open:picker` | 和 Inbox 顶栏的 Search 是同一个选择器 |

标签、space 和窗格沿用 Herdr 自己的快捷键。Inbox 里的置顶、拖动和 Clear 用鼠标。

## 更新

Herdr 不会更新别人做的 mod 和布局。再添加一次也不行：安装从不覆盖已有文件，只会装出一份改了名的副本（如 `t3-inbox-2`）。更新要靠覆盖：

- 对你的 Herdr agent 说：「从 github.com/JinJieBeWater/herdr-t3 更新 Herdr T3：用仓库最新的文件覆盖我已安装的 `mods/t3-*`、`mods/herdr-actions` 和 `layouts/herdr-t3.*`，然后对每个 mod 跑 `herdr-app check`。」如果首次安装时因为重名改过名字，就覆盖改名后的那份。
- 手动更新：把同样的文件复制过去覆盖旧的。mod 保存后自动重载，不用重启。
- 会保留：置顶、折叠、排序、Settled 收纳区和已 Settle 的 agent。这些存在 `data/`、`shared.json` 和终端标签里，不在 mod 目录中。会丢掉：你自己对被覆盖文件的修改，包括聚焦边框颜色；覆盖布局后重新设置即可。
- `keys.json` 和可选扩展保持原样；只有提交记录提到它们时，再和仓库对比。带 `!` 的提交会改名（例如 `refactor!: rename the layout and theme to herdr-t3`），按提交里的改名同步调整。
- 从 Focus 改名为 Inbox 之前的版本升级（`t3-focus` → `t3-inbox`）：把 `data/t3-focus` 改名为 `data/t3-inbox`（卡片顺序和收纳区状态），把 `keys.json` 里的 `t3-focus.settle` 改成 `t3-inbox.settle`，再删掉 `mods/t3-focus`。
- 动作和 Review 栏已移出 `t3-tabs`：把新的 `mods/herdr-actions` 也复制过去（动作会保留，它们存在 `shared.json` 里）；用 Review 的话，把可选扩展里的 `mods/pulls-review` 和 `mods/review` 换成 fork 里的（见下文）。
- `cmd-]` / `cmd-[` 现在归布局自己（`t3-chrome.next` / `.prev`）：把它们加进你的 `layout:herdr-t3` 分区，会覆盖 `global` 里的 `agent.next`。
- 关闭标签和窗格现在会先确认：把仓库 `keys.json` 里的 `cmd-w`、`ctrl-alt-shift-x`、`cmd-shift-w`、`ctrl-alt-x` 四行加进你的 `layout:herdr-t3` 分区，会覆盖 `global` 里的 `tab.close` 和 `pane.close`。
- Agent 模式已移除（最后包含它的提交是 `a8cbcd4`）：覆盖后删掉 `keys.json` 里的 `"cmd-shift-a": "t3-tabs.view"`。

## 它会运行什么

- `t3-spaces`：在各 space 的目录里运行只读的 `git status` / `git rev-parse`，监听这些仓库的变化（`watchFolder`），运行 `hc machine ls --json`。点重装机器的 Connect 时运行 `hc machine rm` 和 `hc machine add`。
- `t3-inbox`：Settle 或取消 Settle 时运行 `hc label <agent> settled=<ms>:<turn>`。
- `t3-spaces`、`t3-inbox`、`t3-new-menu`：为每个 space 的图标，在 space 所在的位置（它的机器上）运行 `git rev-parse --show-toplevel`、`sh` 文件检测和 `base64`；找到的图标复制到 `cache/t3-icons/`。

不发网络请求。

## 可选扩展

不属于布局本身，安装时也不会被复制；需要的话手动添加。

### pulls.review

Review 栏和评审窗格，来自[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo/mods)：Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下就在 agent 旁边的窗格里打开那份评审。按[它的 README](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo/mods/README.zh-CN.md) 安装，然后让你的 Herdr agent 把它的块放进这个布局的 `tabs-row` 这一行、紧跟在 `tabs` 后面（见那里的第 3 步）。`scripts/sync.sh` 同步布局时会保留这个块。评审窗格所在的标签和窗格标题栏用这个布局的标记显示分析状态：`t3-tabs` 和 `t3-pane` 读取 `shared("review.status")`。

### 预览图里的主题和设置

`extras/themes/herdr-t3.json` 是截图里的深色主题：canvas 和 chrome 为 `#141418`，accent 和 working 为 `#6b93ff`，blocked 为 `#f0a33a`。把它复制进 `~/.config/herdr-app/themes/`。它和布局同名，所以是这个布局专属的主题：只有在 Herdr T3 布局里，设置页才会列出它，在那里选上即可。其余设置写进 `settings.json`：

```json
{
  "appearance": "dark",
  "font": "Maple Mono NF CN",
  "ui_font": "Maple Mono NF CN",
  "font_size": 12,
  "minimum_contrast": 3
}
```

Herdr 不自带 [Maple Mono NF CN](https://github.com/subframe7536/maple-font)：先安装它，或者删掉字体这几行，沿用 Herdr 的 JetBrains Mono 和 Geist。

## 致谢与许可证

`t3-chrome`、`t3-spaces`、`t3-agents`、`t3-tabs`、`t3-pane`、`t3-new-menu` 和布局本身，分别基于 Herdr App 自带的 `workspace-chrome`、`spaces`、`agents`、`tabs`、`pane`、`new-menu` 和 `main` 修改。Settle 参照 T3 Code 的设计。许可证与 Herdr App 相同，为 Apache-2.0。

## 更多

- [herdr-t3-focus](https://github.com/JinJieBeWater/herdr-t3-focus)：本布局的 Inbox 侧栏，单独作为 mod 发布。
- [herdling](https://github.com/JinJieBeWater/herdling)：Herdr 的 macOS 菜单栏伴侣。
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff)：我写的 Pi 扩展和 Skills。
