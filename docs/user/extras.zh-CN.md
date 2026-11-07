# Herdr T3 可选扩展

[English](extras.md) · 中文

不属于布局本身，安装时也不会被复制；需要的话手动添加。

## pulls.review

`extras/mods/pulls-review` 和 `extras/mods/review`：Review 栏和评审窗格，配合[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)（CLI 叫 `jin.review`）使用。Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下打开那份评审，每个 space 一个：窗格设置里的 `Open in` 决定是 agent 旁边的窗格还是独立标签。窗格自己的顶栏负责在这份 diff 的 commit 之间切换。Analyze automatically 只对点计数生效。它也单独发布为 [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review)：按[它的 README](https://github.com/JinJieBeWater/herdr-pulls-review/blob/main/README.zh-CN.md) 安装（`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`，或者把两个目录复制进 `~/.config/herdr-app/mods/`），然后让你的 Herdr agent 把它的块放进这个布局的 `tabs-row` 这一行、紧跟在 `tabs` 后面。`scripts/update.sh` 更新布局时会保留这个块。评审窗格所在的标签和窗格标题栏用这个布局的标记显示分析状态。

## 给 Pi 用的主题导出

`extras/mods/t3-theme-export` 是 [pi-herdr-theme](https://github.com/JinJieBeWater/pi-stuff/tree/main/packages/pi-herdr-theme) 在 Herdr 这一侧的部分。pi-herdr-theme 是[我的 Pi 配置](https://github.com/JinJieBeWater/pi-stuff)里的一个 Pi 扩展，让 Pi 的配色跟着 Herdr 走。这个 mod 没有界面：Herdr 实际显示的颜色一变（设置页点选、布局主题、系统明暗、内置预设都算），它就把 `{ "name", "colors" }` 写到 `~/.cache/herdr-app-theme.json`；扩展监听这个文件，重新生成 Pi 主题。两边都要装：把目录复制进 `~/.config/herdr-app/mods/`，再让你的 Herdr agent 在这个布局的 `work` 列末尾加一次 `{ "id": "theme-export", "type": "block", "size": { "px": 0 }, "content": { "mod": "t3-theme-export" } }`。不要设成隐藏，隐藏的块不会启动。它只在放了这个块的布局里运行：切到其他布局后 Pi 保持原来的颜色，想跟随就在那个布局里也加上。`scripts/update.sh` 更新这个布局时会保留这个块。

## 主题和设置

布局不指定主题，沿用你自己的。`extras/themes/` 里附带两对明暗主题，需要的话可以用：

- `catppuccin-mocha` 和 `catppuccin-latte`：[Catppuccin](https://catppuccin.com) 官方色板，终端色按官方规范，界面用 Catppuccin 自己的层次色（底层 mantle、卡片 base、选中和边框 surface0），强调色为 blue。
- `t3-code-dark` 和 `t3-code-light`：T3 Code 网页端默认绘制的颜色，深色 canvas 为纯黑、accent 为 `#346bf1`，浅色 canvas 为 `#fcfcfc`、accent 为 `#1b4ed8`，终端用 T3 Code 采用的 VS Code 终端配色。终端文字取对话正文的 90% 前景色，让 agent 的回复读起来和 T3 Code 一样。

把想要的文件复制进 `~/.config/herdr-app/themes/`，在设置页选上；或者在 `settings.json` 里写一对，跟随系统明暗切换，例如 `"theme": { "light": "catppuccin-latte", "dark": "catppuccin-mocha" }`。预览图里的其余设置：

```json
{
  "font": "Geist Mono",
  "ui_font": "Geist",
  "font_size": 12,
  "zoom": 1.1,
  "minimum_contrast": 3
}
```
