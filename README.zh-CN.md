# Herdr T3

[English](README.md) · 中文

给 [Herdr App](https://herdr.dev) 用的一套布局：同时开着很多 agent，只看需要你的那几个。

![Herdr T3](preview.png)

## 为什么做它

> It's so nice to have 14 threads running and zero visible. Why let working threads get in the way of things that need your attention?
>
> —— [Theo](https://x.com/theo/status/2114131018575962496)

我在 T3 Code 里用过这种工作方式：在跑的看不见，需要我的才出现，看完收起，有新动静它自己回来。我想在 Herdr 里也这样工作，所以把 T3 Code 的 Inbox 和外观搬了过来，并让它适应 Herdr 的标签、窗格和多台机器。

## 功能

- **Inbox 和 Lists**：两种侧栏，一键切换。Inbox 按什么需要你来排，带 T3 式的 Settle 和 Snooze；Lists 按项目排。两者规则相同。
- **Home**：收起正在看的 agent 后，回到一个安静的页面，不会自动跳到下一张卡片。下一步看什么由你决定。
- **同一个名字，同一套标记**：卡片、列表、标签和窗格标题用同样的方式给终端取名、标状态。
- **跳转**（`cmd-p`）：按名字跳到任何窗格，agent 和普通程序都行。
- **动作**：类似 T3 Code 的运行按钮，运行你自己的命令，在新标签或分屏里。
- **窄标签、带框窗格**，照 T3 Code 的外观。
- **其他机器**：它们的 space 按机器分组，卡片带机器标记。
- **Review**（可选）：在 agent 旁边的窗格里看当前 worktree 待评审的内容。

每项的详细说明见[使用指南](docs/user/guide.zh-CN.md)。

## 安装

让你的 Herdr agent 添加 `herdr.dev/layouts/JinJieBeWater/herdr-t3`。手动安装：把 `layouts/herdr-t3.json`、`layouts/herdr-t3.svg` 和所有 `mods/t3-*` 复制进 `~/.config/herdr-app/`，再把 `keys.json` 合并进你自己的。

只想要 Inbox？它也单独发布了一份：[herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox)。

## 快速上手

1. `cmd-shift-b`（或侧栏右上角的按钮）在 Inbox 和 Lists 之间切换。
2. 在 Inbox 里，鼠标移到已结束的卡片上，点 `✓ Settle` 收起；有新工作时它会自己回来。`cmd-shift-s` 收起正在看的 agent 并回到 Home。
3. 在 Home 按 `cmd-]` 打开最上面的卡片，可以逐张处理。
4. 鼠标移到卡片上，点时钟，可以把它 Snooze 到你选的时间。

拖动、划过多行、置顶等用法见[日常用法](docs/user/guide.zh-CN.md#日常用法)。

## 快捷键

| 快捷键 | 作用 |
| --- | --- |
| `cmd-shift-b` | 侧栏在 Inbox 和 Lists 之间切换 |
| `cmd-shift-s` | 收起正在看的 agent 并回到 Home，已收起的则取回 |
| `cmd-]` / `cmd-[` | 按侧栏的顺序到下一个或上一个 agent |
| `cmd-p` | 跳到任一窗格 |
| `cmd-shift-h` | 回到 Home |
| `cmd-t` | 在当前位置新建标签；在 Home 时先选 space |

完整列表见[快捷键](docs/user/guide.zh-CN.md#快捷键)。

## 更新

```sh
git clone --depth 1 https://github.com/JinJieBeWater/herdr-t3 && herdr-t3/scripts/update.sh
```

它会覆盖布局和 mod，并合并 `keys.json`；你的置顶、已收起的 agent、动作、主题和聚焦边框都会保留。保留和不保留哪些，见[更新](docs/user/guide.zh-CN.md#更新)。

## 它会运行什么

- `t3-spaces`：在各 space 的目录里运行只读的 `git status` / `git rev-parse`，监听这些仓库的变化（`watchFolder`），运行 `hc machine ls --json`。点重装机器的 Connect 时运行 `hc machine rm` 和 `hc machine add`。
- `t3-inbox`：Settle 或取消 Settle 时运行 `hc label <agent> settled=<ms>:<turn>`。
- `t3-inbox`：Snooze 或唤醒时运行 `hc label <agent> snoozed=<ms>`。
- `t3-spaces`、`t3-agents`、`t3-inbox`、`t3-new-menu`：为每个 space 的图标，在 space 所在的位置（它的机器上）运行 `git rev-parse --show-toplevel`、`sh` 文件检测和 `base64`；找到的图标复制到 `cache/t3-icons/`。

不发网络请求。

## 可选扩展

- **pulls.review**：Review 栏和评审窗格。
- **给 Pi 用的主题导出**：让 Pi 的配色跟着 Herdr 走。
- **主题**：Catppuccin 和 T3 Code，各有明暗两套。

安装方法见[可选扩展](docs/user/extras.zh-CN.md)。

## 致谢与许可证

`t3-chrome`、`t3-spaces`、`t3-agents`、`t3-tabs`、`t3-pane`、`t3-new-menu`、`t3-picker` 和布局本身，分别基于 Herdr App 自带的 `workspace-chrome`、`spaces`、`agents`、`tabs`、`pane`、`new-menu`、`picker` 和 `main` 修改。Settle 参照 T3 Code 的设计。Catppuccin 主题使用 [Catppuccin](https://github.com/catppuccin/catppuccin) 色板（MIT 许可证，Copyright (c) 2021 Catppuccin）；T3 Code 主题取自 [T3 Code](https://github.com/pingdotgg/t3code) 的默认配色（MIT 许可证，Copyright (c) 2026 T3 Tools Inc.）。图标来自 [Lucide](https://lucide.dev)（ISC 许可证，Copyright (c) Lucide Contributors）。许可证与 Herdr App 相同，为 Apache-2.0。

## 更多

- [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox)：本布局的 Inbox 侧栏，单独作为 mod 发布。
- [herdling](https://github.com/JinJieBeWater/herdling)：Herdr 的 macOS 菜单栏伴侣。
- [pi-stuff](https://github.com/JinJieBeWater/pi-stuff)：我写的 Pi 扩展和 Skills。
