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

## asciicn 壁纸

把 Home 换成一张静止的 [asciicn](https://asciicn.dev) 风格的画，颜色取自你的主题，换主题或明暗模式时跟着变。自带 4 张 asciicn 的画（灯塔、黄昏山峦、星云、余烬），也可以用你自己的图片或 `.ans` 文件。

鼠标移到 Home 的右下角，那里会出现切换器：`‹ ›` 换画。`+` 打开一张卡片，主操作是 **Choose image…**，已经在 Studio 做好的画用 **Import Studio file (.ans)…** 导入。

**Choose image…** 选一张图片（PNG、JPG、HEIC 等），默认以 **Braille** 在整个 Home 上预览；可以在同一张预览上试 **Blocks**（方块）或 **Dots**（半调圆点）。**Apply** 保存一张 `.ans` 壁纸并选中它；**Cancel** 回到原来的壁纸，不保存。只保存生成的画，不复制或修改原图；保存后也不能回到图片草稿编辑。

如果 Apply 已经保存字符画、却无法生成最终壁纸，预览会保持打开。处理提示的问题后，再点 **Apply**：草稿未变且已保存文件的内容仍一致时，沿用这个草稿自己的文件，不重复保存。之后即使取消，已保存的 `.ans` 也会留在文件夹里。

想精细调整（对比度、抖动、换其他字符），点 **Create in asciicn Studio…** 展开三步：1. **Open asciicn Studio ↗**；2. 做好画，用画面下方的 **.ans** 按钮保存（会存到「下载」）；3. 回到这里点 **Import Studio file (.ans)…**。导入的 `.ans` 沿用原来的字符画法，不出现图片样式选项。选中的壁纸会保留，新建的 Home 也一样。要删除自己加的画，按 `×`，在确认里核对画名，再确认删除；取消就保持不动。确认还会停止这张画正在进行的转换，旧转换结束也不会把它带回来。

你加的画以 `.ans` 文件存在 `~/.config/herdr-app/asciicn-wallpaper/`：辅助入口 **Open folder** 会打开它，直接复制进来的 `.ans` 文件也会出现，在这里改了的会重新画。Braille、方块、象限和半调圆点保留形状；其他 ASCII 字符近似画成越暗越大的短条，所以用字母拼成的画保留明暗，不保留字形。颜色会换成你主题里最接近的颜色，而非原图的精确颜色。画面撑满 Home 的高度；Home 变窄或变宽时只是两边露得少或多，主体始终在视野里。比 Home 窄的画改为撑满宽度，上下各裁掉一点。手机照片在 Herdr 里横过来了，是相机记录的旋转信息没被采用：先在「预览」里转正再选。

支持 Unicode、以 `-` 开头的名字，以及 `.hidden.ans` 等普通隐藏文件。外部文件名恰好为 `.ans`、`..ans` 或 `...ans` 时会拒绝，先换个有意义的名字再导入。阴影字符（`░`、`▒`、`▓`）密集的画也能导入，不会再生成过大的图块。

安装：把 `extras/mods/asciicn-wallpaper` 复制到 `~/.config/herdr-app/mods/`，然后在这套布局的设置里，把 **Home shows** 选成 asciicn wallpaper。它由 `scripts/update.sh` 负责更新，不会动你加的画。选图片在 macOS 上、以及装了 `zenity` 和 ImageMagick 的 Linux 上可用；没有 ImageMagick 时用 **Import Studio file (.ans)…**。没有文件选择框的平台（包括 Windows），用 **Open folder** 把 `.ans` 文件复制进去。自带的画来自 asciicn，MIT 许可（`LICENSE-asciicn`）。

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
