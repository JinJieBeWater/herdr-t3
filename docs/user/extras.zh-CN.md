# Herdr T3 可选扩展

[English](extras.md) · 中文

不属于布局本身，安装时也不会被复制；需要的话手动添加。

## pulls.review

`extras/mods/pulls-review` 和 `extras/mods/review`：Review 栏和 space 面板里的 Review 页，配合[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)（CLI 叫 `jin.review`）使用。Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下在面板的 Review 页打开那份评审，和 Files 并列。每个 space 各有自己的评审，页面显示当前 space 的；页面顶栏左边的范围按钮写着正在看什么，点开可以换：Changes（当前分支对默认分支，按钮后面显示 `head → base`，点 base 可以换成别的本地或远程分支，每个 space 各记一份）、Uncommitted、Outgoing 和 Incoming（要推送和要拉取的提交），或者从 Commits 子菜单选当前分支的某个提交；看某个提交时，后面显示短 SHA，用 `‹ ›` 在这个分支的提交之间前后走。设置里的 `Lines: Wrap` 让长行自动换行。Analyze automatically 只对点计数生效。在这个布局里，Review 栏只是面板按钮，代替 logo（logo 在面板的 Review 页签上）：标签栏里没有计数（Review 页的范围菜单里有）；分析状态用这个布局的标记显示在这个按钮里、图标左边，也显示在页签上。在 Herdr 自带布局里计数照旧，没有描边，平时是暗色，悬停或它就是正显示的 diff 时提亮。它也单独发布为 [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review)：按[它的 README](https://github.com/JinJieBeWater/herdr-pulls-review/blob/main/README.zh-CN.md) 安装（`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`，或者把两个目录复制进 `~/.config/herdr-app/mods/`），然后让你的 Herdr agent 把 Review 栏的块（`"id": "review-bar"`，props 里带 `"toggle": true`）放进这个布局的 `tabs-row` 这一行、`tabs-end` 前面，紧挨面板开关，再把 `{ "id": "review", "type": "block", "content": { "mod": "review" } }` 加到 `panel-body` 这个 stack 的末尾。装了这个扩展后，`scripts/update.sh` 会自己加上这一页，并在更新布局时保留 Review 栏的块和它的 `toggle`。
`extras/mods/pulls-review` 和 `extras/mods/review`：Review 栏和 space 面板里的 Review 页，配合[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)（CLI 叫 `jin.review`）使用。Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下在面板的 Review 页打开那份评审，和 Files 并列。每个 space 各有自己的评审，页面显示当前 space 的；页面顶栏左边的范围按钮写着正在看什么，点开可以换：Changes（当前分支对默认分支，按钮后面显示 `head → base`，点 base 可以换成别的本地或远程分支，每个 space 各记一份）、Uncommitted、Outgoing 和 Incoming（要推送和要拉取的提交），或者从 Commits 子菜单选当前分支的某个提交；看某个提交时，后面显示短 SHA，用 `‹ ›` 在这个分支的提交之间前后走。长行默认在面板边缘自动换行；设置里选 `Lines: Scroll` 改为横向滚动，Files 的代码也跟着变。Analyze automatically 只对点计数生效。在这个布局里，Review 栏只是面板按钮，代替 logo（logo 在面板的 Review 页签上）：标签栏里没有计数（Review 页的范围菜单里有）；分析状态用这个布局的标记显示：面板关着时在这个按钮里、图标左边，开着时在页签上。在 Herdr 自带布局里计数照旧，没有描边，平时是暗色，悬停或它就是正显示的 diff 时提亮。它也单独发布为 [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review)：按[它的 README](https://github.com/JinJieBeWater/herdr-pulls-review/blob/main/README.zh-CN.md) 安装（`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`，或者把两个目录复制进 `~/.config/herdr-app/mods/`），然后让你的 Herdr agent 把 Review 栏的块（`"id": "review-bar"`，props 里带 `"toggle": true`）放进这个布局的 `tabs-row` 这一行、`tabs-end` 前面，紧挨面板开关，再把 `{ "id": "review", "type": "block", "content": { "mod": "review" } }` 加到 `panel-body` 这个 stack 的末尾。装了这个扩展后，`scripts/update.sh` 会自己加上这一页，并在更新布局时保留 Review 栏的块和它的 `toggle`。
`extras/mods/pulls-review` 和 `extras/mods/review`：Review 栏和 space 面板里的 Review 页，配合[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)（CLI 叫 `jin.review`）使用。Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下在面板的 Review 页打开那份评审，和 Files 并列。每个 space 各有自己的评审，页面显示当前 space 的；页面顶栏左边的范围按钮写着正在看什么，点开可以换：Changes（当前分支对默认分支，按钮后面显示 `head → base`，点 base 可以换成别的本地或远程分支，每个 space 各记一份）、Uncommitted、Outgoing 和 Incoming（要推送和要拉取的提交），或者从 Commits 子菜单选当前分支的某个提交；看某个提交时，后面显示短 SHA，用 `‹ ›` 在这个分支的提交之间前后走。长行默认在面板边缘自动换行；设置里选 `Lines: Scroll` 改为横向滚动，Files 的代码也跟着变。Analyze automatically 只对点计数生效。在这个布局里，Review 栏只是面板按钮，代替 logo（logo 在面板的 Review 页签上）：标签栏里没有计数（Review 页的范围菜单里有）；分析状态用这个布局的标记显示在这个按钮里、图标左边，也显示在页签上。在 Herdr 自带布局里计数照旧，没有描边，平时是暗色，悬停或它就是正显示的 diff 时提亮。它也单独发布为 [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review)：按[它的 README](https://github.com/JinJieBeWater/herdr-pulls-review/blob/main/README.zh-CN.md) 安装（`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`，或者把两个目录复制进 `~/.config/herdr-app/mods/`），然后让你的 Herdr agent 把 Review 栏的块（`"id": "review-bar"`，props 里带 `"toggle": true`）放进这个布局的 `tabs-row` 这一行、`tabs-end` 前面，紧挨面板开关，再把 `{ "id": "review", "type": "block", "content": { "mod": "review" } }` 加到 `panel-body` 这个 stack 的末尾。装了这个扩展后，`scripts/update.sh` 会自己加上这一页，并在更新布局时保留 Review 栏的块和它的 `toggle`。
`extras/mods/pulls-review` 和 `extras/mods/review`：Review 栏和 space 面板里的 Review 页，配合[我的 pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo)（CLI 叫 `jin.review`）使用。Review 栏统计当前焦点所在工作树有什么可评审的（当前分支上默认分支没有的提交、未提交的文件、要推送和要拉取的提交），点一下在面板的 Review 页打开那份评审，和 Files 并列。每个 space 各有自己的评审，页面显示当前 space 的；页面顶栏左边的范围按钮写着正在看什么，点开可以换：Changes（当前分支对默认分支，按钮后面显示 `head → base`，点 base 可以换成别的本地或远程分支，每个 space 各记一份）、Uncommitted、Outgoing 和 Incoming（要推送和要拉取的提交），或者从 Commits 子菜单选当前分支的某个提交；看某个提交时，后面显示短 SHA，用 `‹ ›` 在这个分支的提交之间前后走。长行默认在面板边缘自动换行；设置里选 `Lines: Scroll` 改为横向滚动，Files 的选择各自独立。Analyze automatically 只对点计数生效。在这个布局里，Review 栏只是面板按钮，代替 logo（logo 在面板的 Review 页签上）：标签栏里没有计数（Review 页的范围菜单里有）；分析状态用这个布局的标记显示：面板关着时在这个按钮里、图标左边，开着时在页签上。在 Herdr 自带布局里计数照旧，没有描边，平时是暗色，悬停或它就是正显示的 diff 时提亮。它也单独发布为 [herdr-pulls-review](https://github.com/JinJieBeWater/herdr-pulls-review)：按[它的 README](https://github.com/JinJieBeWater/herdr-pulls-review/blob/main/README.zh-CN.md) 安装（`herdr.dev/mods/JinJieBeWater/herdr-pulls-review`，或者把两个目录复制进 `~/.config/herdr-app/mods/`），然后让你的 Herdr agent 把 Review 栏的块（`"id": "review-bar"`，props 里带 `"toggle": true`）放进这个布局的 `tabs-row` 这一行、`tabs-end` 前面，紧挨面板开关，再把 `{ "id": "review", "type": "block", "content": { "mod": "review" } }` 加到 `panel-body` 这个 stack 的末尾。装了这个扩展后，`scripts/update.sh` 会自己加上这一页，并在更新布局时保留 Review 栏的块和它的 `toggle`。

Review 跟随你的主题，包括 Graphite 等主题里带透明度的复选框颜色。吸顶文件头保留不透明底色，滚动的代码不会透出并和文件名重叠。

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
