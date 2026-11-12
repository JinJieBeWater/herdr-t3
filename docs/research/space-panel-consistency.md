# 空间面板：Files 与 Review 两页的可见不一致

观察对象：右侧空间面板（ADR 0011 / 0012）里的两个页面 `Files`（`mods/t3-files`）与 `Review`（`extras/mods/review`），以及面板头 `panelHead`（`mods/t3-chrome/main.js:139`）。全部结论来自演示窗口的整窗截图，未读代码推断布局；引用的代码位置只用于给现象命名。

## 环境与复现

- 演示窗口：`DEMO=/private/tmp/herdr-t3-demo-consistency sh scripts/demo/stage.sh up`，用离线副本 `/private/tmp/herdr-t3-offline`（其 `scripts/demo/repos.sh` 只造本地 git 仓库，不访问 GitHub：本机当时 `https://github.com` 返回 200 但演示不应该依赖网络）。
- 窗口 1680×1042 点（截图 3360×2084，2×），`zoom: 1.1`，暗色主题 catppuccin-mocha，字体 Geist Mono / Geist。
- 三个空间：
  - `atlas`：本地 git 仓库，未提交 = 3 改 / 1 删 / 2 新增（新增在 `src/lib/`、`docs/guide/`），嵌套深度 2。
  - `blank`：只有一个提交，无改动。
  - `empty`：非 git 的空目录。
- Review 页用本地 `jin.review` 守护进程（`:7957`，因为默认 `7855` 被这台机器已有的守护进程占用）；**未跑 AI 分析**，所以 Review 页没有 analysis 分组说明，分组来自 diff 的目录分组。
- 全宽截图额外设了 `review.prefs.groupNav = "sidebar"`（Review 设置里的 Groups: Sidebar），否则全宽时 Review 仍只有「组卡片」一行。
- 只用 `herdr-app do` 驱动：`layout.select {stack:"panel-body",child:"files"|"review"}`、`layout.show/hide {id:"panel"|"work"}`、`t3-files.open:<path>`。没有鼠标操作（没有人工确认的 hover / 点击态）。
- 一个副作用：鼠标停在面板头的关闭按钮上，所以每张图右上角的 ✕ 都带 hover 底色。这不是两页的差异。

截图（本目录）：

| 文件 | 内容 |
| --- | --- |
| `01-files-open-default.png` | Files，已打开 `src/panel/index.js`，默认宽度 |
| `02-review-default.png` | Review，同一空间、同一宽度，diff 已加载 |
| `03-files-wide.png` | Files，⤢ 全宽 |
| `04-review-wide.png` | Review，全宽（diff + aside + 组侧栏） |
| `05-files-no-file-default.png` | Files，默认宽度，无打开文件（`blank` 空间） |
| `06-review-no-changes-default.png` | Review，无未提交改动（`blank` 空间） |
| `07-files-empty-folder.png` | Files，非 git 空目录（`empty` 空间） |
| `08-review-not-git.png` | Review，非 git 目录 |

## 量到的尺寸（点，截图像素 ÷ 2）

面板列 x 981..1680；正文区（`panel-body`）990..1671，宽 681。

| | Files 默认 | Review 默认 | Files 全宽 | Review 全宽 |
| --- | --- | --- | --- | --- |
| 正文列 | 文件视图 990..1391（401）+ 树 1392..1671（279） | 单列 990..1671（681） | 文件视图 291.5..1391 + 树 1392..1671（279） | diff 291.5..1135（843.5）+ aside 1136..1415（279）+ 组侧栏 1416..1671（255） |
| 分隔线 | 竖线 1 条（x=1391） | 无 | 竖线 1 条 | 竖线 2 条（x=1135、1415） |
| 面板头 | 0..44，chrome 底色 | 0..44，chrome 底色 | 0..44 | 0..44 |
| 头部行 | 44..88（底色 = 正文背景） | 44..88（底色 = chrome） | 44..88 | 44..88 |
| 头部行下横线 | 文件视图 x990..1391 在 87；树列内缩 1405..1658 在 90.5 | 整宽 87 | 同左 | 整宽 87 |
| 正文内容起点 | 88（树列实际 91.5） | 88 | 88 | 88（aside 从 88 起） |

行高（实测节奏）：

- Files 树行 30.8（`ROW = 28`，`mods/t3-files/main.js:17`；`pl(8 + depth*14)`、`rounded(6)`）。
- Review 侧栏组行 52.8（`h(48)`、`rounded(8)`、`pr(10)`，`extras/mods/review/groups.js` 的 `groupSidebar`）。
- Review aside 文件行约 31（`FILE = 32`，`extras/mods/review/rows.js:5`）。
- Review 文件列表 diff 行距约 24..25（`ROW = 20` 配 zoom）；Files 代码视图行距约 21.5。

## 可见的不一致

### 1. 面板头之下，两页的「第一行」不是一回事

- Files：头以下立刻是**两个各自独立的列头**——文件视图的 `根名 / 路径 / 文件名`（等宽 12）+ 右侧 `Review ↗` 描边按钮；树列的 `Search files` 搜索框（`px(12) pt(10)`，字段 `h(33)`）。
- Review：头以下是**一条贯穿整个面板**的头部行——`Uncommitted ⌄` 胶囊、`+14 −6 ◯ 0/7` 计数、右端分析/折叠/设置三个图标（窄宽度只留图标）。
- 证据：`01` / `02`。代码：`mods/t3-files/main.js` 的 `content()`（40 高、`pl(8) pr(8)`、`border_b`）与 `side()` 的搜索头；`extras/mods/review/header.js` 的 `header()`（`h(40) px(16) border_b bg(t.chrome)`）。
- 因此两页的页头不是一个层级：Files 的头部跟着**各自的列**走，Review 的头部跟着**整页**走。

### 2. 同一高度上的底色不同

- Files 头部行（44..88）是正文底色（catppuccin base，`(30,30,46)`），只有面板头是 chrome（`(24,24,37)`）。
- Review 头部行（44..88）是 chrome（`(24,24,37)`），正文从 88 才开始用 base。
- 结果：Review 页的正文看起来从 88 才开始，Files 页的正文从 44 就开始；两页在 y=44 处形成一条明显的横向分界，但只有 Review 有「上浅下深」的分段。

### 3. 顶部横线对不齐（同一页内部也不对齐）

- Review：88 处一条 1px 横线，整宽（990..1671），占满面板。
- Files：文件视图的横线在 87，横跨 990..1391；树列的横线在 90.5，且只跨 1405..1658（左右各内缩约 13），因为它是搜索框的下边框而不是列分隔。
- 于是 Review 的横线与 Files**文件视图**的横线相差 ~0.5（可视为对齐），与 Files **树列**的横线相差 ~3.5，且后者两端空出一截。
- 证据：`01`、`02`、`03`、`04`。

### 4. 导航列：个数、位置、宽度、出现条件都不同

- Files：始终有一列文件树，宽 279（`TREE = 280`），**贴着面板右缘**；默认与全宽都一样宽，只有文件视图让出空间。
- Review 默认宽度：**完全没有导航列**，文件列表与分组信息都在 diff 流里（一行为组卡片 `Docs` / `Code`）。
- Review 全宽：右侧一次出现两列——`aside`（280：组标题 + 说明 + 文件树）+ 组侧栏（255，组行的纵向导航）。即文件列表不在面板边缘，组导航才在边缘。
- 于是同一种信息（分组 / 文件）在 Review 里会以三种形态出现：组卡片行（窄）、aside（宽）、组侧栏（宽），而 Files 只有一种（树）。
- 证据：`01`、`03`、`04`。代码：`extras/mods/review/main.js:406-424`、`groups.js` 的 `groupTabs` / `groupSidebar`、`files.js` 的 `aside`。

### 5. 同一个「选中的行」画法不同

- Files：整行 `rounded(6)`、左右各内缩 5，底色 `t.selected`，行高 30.8。
- Review 组侧栏：`rounded(8)`、左右各内缩 9，底色 `t.selected`，行高 52.8（三行信息：图标 + 组名 14 + 计数 11）。
- Review aside：同目录下的文件行共用**一个圆角块**底色（`panels.md` + `review.md` 连续成块，块内不再单独高亮），而 Files 里相邻行各自平铺在正文底色上，只有「当前文件」一行被高亮。
- 证据：`01`（`index.js` 行）、`04`（`Docs` 组行、`panels.md`/`review.md` 块）。

### 6. 行内信息密度与控件

- Files 树行：chevron 12 + 图标 14 + 名称（等宽 12）+ 右端 git 状态字母徽标（`M` 橙 / `A` 绿，10px、`rounded(4)`）。
- Review aside 文件行：勾选框 + 图标 14 + `目录/文件名`（等宽 12）+ `+n −n` + 状态字母徽标；多了勾选框与增删计数。
- Review 组卡片（窄）：组名 14 medium + `+n −n ・ n files`（11）+ 顶部/左右 1px 描边 + 选中时上移 1px；Files 树里没有任何「卡片」形态。
- 证据：`01`、`02`、`04`。

### 7. 顶部行里的控件形状不同

- Files 的行动按钮 `Review ↗`：`h(24) px(8) rounded(6)` + 1px 描边 + `muted` 文字。
- Review 的 `Uncommitted ⌄`：`h(24) px(7) rounded(8)` + 无描边 + `foreground + "08"` 半透明底 + medium 文字；右侧三个图标按钮 `size(24) rounded(8)`。
- 两页都有 24 高，但圆角 6 vs 8、描边 vs 填充底、普通 vs medium，视觉上是两种控件语言。
- 证据：`01`、`02` / `04`。代码：`mods/t3-files/main.js` 的 `content()` 里 `t3-files-review`；`extras/mods/review/scope.js` 的 `scopeButton`。

### 8. 顶部行的左右起点不同

- 首个元素距正文左边：Files 14.5（文件视图 `pl(8)` + 面包屑自身 4），Review 18（`px(16)`）。
- 行尾：Files 顶部行右端没有控件，只有树列里 `Search files` 提示文字（结束在 1503，树列右缘 1671）；Review 顶部行右端是齿轮按钮，结束在 1644（距面板右缘 27）。
- 证据：`01` vs `02` 的 y=44..88 像素带。

### 9. 空状态：一页有图标和两级文字，另一页只有一行

- Files（`05`、`07`）：文件视图中央 = 24px 图标 + 13px `No file open` + 12px 说明（`gap(8)`，整体居中），**树列照旧显示**（`blank` 里一行 `README.md`；`empty` 里左上角 12px 灰字 `This folder is empty.`）。头部仍在：树列的搜索行和它的横线都保留，只有文件视图的面包屑行没了。
- Review（`06`、`08`）：**整页一行** 12px 灰字居中（`Nothing uncommitted here. Pick a diff to review in the Review bar.` / `This space's folder isn't in a git repository.`），没有图标、没有标题/说明分级，**整条头部行连同横线一起消失**（88 处那条 1px 线也不见了）。
- 一处同类信息的分级也不同：`空白文件夹` 在 Files 是树列里的左对齐一行，在 Review 是整页居中一行。
- 代码：`mods/t3-files/main.js` 的 `content()`（`t3-files-empty`）与 `tree()`；`extras/mods/review/main.js:345` 的 `note()`。

### 10. 加载状态

- Review：`Loading the review…` 带 14px 旋转指示（`svg spinner`）+ `role("status")`，`py(48)` 居中（`extras/mods/review/main.js` 的 `diffContent` 分支）。
- Files：文件内容加载是 `p(16)` 的 12px 灰字 `Loading…`，左上角，没有指示器；树列未列出时同样是左上角 `Loading…`（`mods/t3-files/main.js:411`、`:440`）。
- 证据：本次截图没有抓到这两个状态（加载太快），此条来自代码位置，未在截图里确认。

### 11. 字号与字体

- 面板头页签：两页一致（`h(24) pl(6) pr(8) rounded(6) text_size(12)`，选中 `t.selected`），唯一差别只在 Review 页签会挂运行状态标记（本次未出现）。
- 页内文字：Files 面包屑 12 等宽、树行 12 等宽、状态徽标 10 等宽；Review 头部计数 11 等宽、组名 14 medium、组计数 11、aside 头 14 medium + 11 + 12、文件路径等宽 12。
- 两页都用 `JetBrains Mono` 给路径/代码（`mods/t3-files/main.js:16`、`extras/mods/review/controls.js` 的 `MONO`），但标签层级不同：Files 全页几乎没有 14px 标签，Review 到处是 14px medium 标题。

### 12. 其它可见点

- Files 的列分隔竖线从 y=88 一直到底；Review 窄宽度没有任何竖线，全宽两条竖线也都从 88 起。
- Review 窄宽度把「分组」放在正文顶部一行卡片（`pt(9) pb(8)`，卡片 `px(8) py(2) rounded_t(6)`），全宽换成 aside + 侧栏；Files 没有这种「同一个东西换形态」的行为。
- Files 页在打开文件后，头行多出 `Review ↗`（跨页跳转）；Review 页没有任何指向 Files 的入口。

## 未覆盖

- hover / 按下 / 键盘焦点态（截图只用命令驱动，没有鼠标）。
- Review 带 AI 分析结果时的分组（analysis）形态。
- 浅色主题（`catppuccin-latte`）。
- 面板全宽下的空状态（只拍了默认宽度）。
- 真实点击：未验证。
