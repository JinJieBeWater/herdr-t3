# space 面板两页统一：实施计划

日期：2026-11-11。决定见 [ADR 0013](../adr/0013-space-panel-pages-share-one-frame.md)。依据：T3 两个 surface 的事实 [t3code-panel-surfaces](t3code-panel-surfaces.md)，现状截图 [space-panel-consistency](space-panel-consistency.md)，数值 [t3-tokens](../internals/t3-tokens.md)。

范围：`mods/t3-files`、`extras/mods/review`（含单独发布的 herdr-pulls-review）、新增或扩展的 `shared/` 模块。面板头 `t3-chrome` 的 `panelHead` 不改（40px，页签 + 放大 + 关闭）。左侧栏不动。

## 规格

### 1. 工具栏（每页一条）

- 面板头下方，全宽，40 高，不画底色，左右内边距 8，底边线 1px `t.border`。始终显示，空态、加载、出错时也在。Review 窄宽时滚动隐藏头部的行为（`headerHidden`）删除。
- 左边是“在看什么”，右边是页面工具，最右是导航开关。
  - Files：左边是面包屑（无文件时只显示项目根名）。右边依次是 `Review ↗` 图标按钮（仅对 Review 中有变更的文件显示，现 `content()` 里的 `t3-files-review`），然后是导航开关。
  - Review：左边是 scope 下拉、base 选择和计数。右边依次是 Analyze（唯一带文字的按钮）、展开/折叠菜单、设置、“在 Files 打开”图标按钮（有当前文件且面板有 Files 页时显示），然后是导航开关。没有改动时 scope 下拉照常可用；不在 git 仓库时，左边只写页名 `Review`，右边只留导航开关。
- 控件统一用 t3-tokens 的 Button xs：24 高，12 号字，图标 14，ghost 样式（不描边，悬停出底色）。scope 下拉、Analyze 也用这个规格。
- 两页都不画自己的底色，`panel-body` stack 画 `background`（圆角 8），和工作列的窗格一样是一张卡片（2026-11-11 用户再次改定，取代同日的“`panel-body` 也不画”：面板主体直接放在 chrome 上时，右侧顶部有 80px chrome（面板头加工具栏），左侧只有 40px 加卡片，右边显得头重）。每页的工具栏是卡片的第一行，如同左边窗格的标题栏在它的卡片里；工具栏、内容区（编辑器、diff、空态、加载、出错）和导航列都透明，透出卡片的底色，Files 的行号栏也就和卡片同色；导航列只靠左边线隔开，工具栏只靠底边线。Review diff 里的文件头保留自己的卡片底色，行的悬停和选中保留各自的色调。截图里卡片、工具栏、正文、导航列的像素都应等于左边窗格卡片的颜色，卡片四周留白也和它一致（40px 那一行之下，左右和底部 8）。

### 2. 导航列

- 在内容右侧，左边线 1px `t.border`，左缘可拖。宽度默认 256，最小 160，最大 `min(560, 面板正文宽 − 256)`；两页共用同一个宽度值，持久化方式按 `docs/internals/storage.md` 选。
- 开关在工具栏最右，默认打开，两页各自记住开关状态（按 `storage.md` 的规则）。不设按宽度变形的断点。
- 列顶有一条列头：40 高，底边线 1px `t.border`。
  - Files：搜索框加全部折叠/展开。现 `side()` 的搜索头移进来，不再内缩，不再用搜索框的下边框代替线。
  - Review：左边写 `Files` 和文件数，右边是全部折叠/展开。
- Review 没有文件可列时（没有改动、不在 git 仓库），隐藏导航列，开关保留但不可用。Files 维持现状：空目录时树列在，列里写一行提示。
- 删除：Review 的 `groupTabs`、`groupSidebar`、`aside`、`groupHeader` 的现有摆放，`WIDE` / `ASIDE_*` 断点，`sidebarShown`，设置里的 Groups: Tabs/Sidebar（`groupNav`）。

### 3. 树和行（`shared/` 一份）

- 规格照 T3 的 Pierre compact 树：
  - 行高 24，12 号字（布局的界面字体）。
  - 圆角 6，行左右各内缩 2；缩进与内边距按 density 0.8 派生（每层约 6.4 + 16 + 4.8）。
  - 选中底色是文字色 12%，悬停 7%，焦点行有 1px 焦点环。
  - 目录有 chevron，收起时转 −90°。单子目录压成一行 `a / b / c`。
  - 图标 16，用 `shared/file-icons.js`。git 状态字母徽标放在名字之后，保留现 `letter` / `fileStatus` 的画法，两份合一。
- 行组件提供一个行首插槽，Review 用它放已看勾选：放在行首，chevron 之后、文件图标之前，文件、文件夹、组行都是三态，只在 Review 页显示（2026-11-11 用户看过批次 2–3 截图后改定，原为“状态字母之后”）。行组件另有尾部插槽，Review 的组行用它放 critical 标记和文件数。已看的文件名划线变暗，沿用现有做法。
- 排序与初始展开：Files 按名字排，初始收起。Review 按 diff 顺序排，初始展开。
- 选中只表示一个当前文件：
  - Files 是打开的那个文件。
  - Review 是 `view.current`：点击或 j/k 设定，滚动时跟着视口顶部的文件。原来“视野内多行高亮”（`files.js` 的 `inView` 着色）删除。
- 键盘：↑↓ 移动焦点，← 收起或跳到父级，→ 展开或进入子级，Enter 打开或跳转，Home/End 到首尾。Review 的 j/k/r/f/c/s 保留。
- 删除 Review 的 Files: Tree/List 设置（`fileList`）和 `rows.js` 的 list 分支。

### 4. Review 合成一列

- 树的层级：组 → 子组 → 文件夹 → 文件。没有分析结果时，没有组这一层，就是普通文件树。
- 组行占一行 24 高：类别图标（`categoryIcon`）、标题、critical 标记、文件数；可折叠。环形图（`donut`）删除。当前组的组行用选中色。
- diff 区只显示当前组，沿用 `view.groupKey`。点组行切换到这个组；点别组里的文件，先切组，再滚到该文件。
- 组 summary 移到 diff 区顶部，只显示当前组的：标题 13 medium，正文 12。

### 5. 右键菜单与跨页跳转

- 文件行两页同一份菜单，内容由 `shared/` 里的一个函数按目标算出；画法沿用 `t3-files` 的 `menuView`（尺寸照 t3-menu：宽 220，行高 28，面板内边距 4，圆角 8）。不改走 `t3-menu` 的 overlay，因为 Review 要能单独装在 Herdr 自带布局里（herdr-pulls-review），那里没有 `t3-menu`。
- 文件行菜单项依次是：
  - Copy path、Copy relative path、Mention in agent、Reveal in Finder、Open in default app（现 `menuItems`）；
  - Open in Review：只对 Review 里有变更的文件显示；
  - Open in Files：面板有 Files 页时显示；
  - Mark reviewed / Mark unreviewed：只在 Review 页显示。
- 文件夹行去掉打开类的项（Open in default app、Open in Review、Open in Files）。组行没有菜单。
- 跨页跳转要做到：切到目标页，选中目标文件，滚到它，必要时展开它的祖先目录。

### 6. 状态

一套组件放在 `shared/`，两页共用：

- 加载：14px spinner 加一行文字，居中，`role("status")`。现 Files 的纯文字 `Loading…` 改为这个。
- 空：24px 图标、13 medium 标题、12 号 `t.dim` 提示，居中，间距 8。现 Files 的 `t3-files-empty` 已是这个样子；Review 的 `note()` 改为这个。
- 错误：工具栏下方一条红条（`t.ansi1` 18% 底）加 Retry，即现在 Review 的做法。Files 的灰字错误改为这个。

### 7. 字体与字级

- 面板里的界面文字（面包屑、树、工具栏、菜单、状态）不写字体名，跟随布局的界面字体。
- 等宽字体只用在 diff 和代码内容上，取 `settings().font_family`（同 `shared/project.js:55`），去掉写死的 `MONO = "JetBrains Mono"`（`t3-files/main.js:16`、`review/controls.js:12`）。
- 字号：正文 12，次要信息 11；只有空态标题和组 summary 标题用 13 medium。其余 14 号字的地方（Review 组名、aside 头）随所在结构一起删除或改成 12。

## 批次

按依赖顺序做，每批一个提交（Conventional Commits）。每批都要走完 `AGENTS.md`「Finishing a change」的四步，最后一步是在演示窗口默认侧栏宽度下截全窗图并看过。

1. **shared 行与树**：新建 shared 文件树模块（行、缩进、chevron、压缩、选中/悬停/焦点、键盘、尾部插槽、状态徽标），接进 `sync.sh`，Files 和 Review 都改用它。连同第 3 节的选中语义、删除 List 和第 7 节的字体一起做。
2. **导航列**：共用宽度、拖动、开关、列头。Files 的搜索移进列头。Review 暂时把现有 aside 的文件树放进这一列，删掉断点、`groupTabs` / `groupSidebar` 的摆放和 `groupNav`。
3. **Review 合成一列**：组和子组成为树节点，组 summary 移到 diff 区顶部，删除环形图，实现切组后滚到文件。
4. **工具栏、菜单、跨页**：两页的工具栏按第 1 节改，右键菜单和跨页跳转按第 5 节做。
5. **状态组件**：按第 6 节做，两页的加载、空、错误都换成它。

文档（每批随改动更新）：`RECIPE.md`、`RECIPE.zh-CN.md`、两份 changelog，两份 README 和 `docs/user/` 中描述到这部分的地方。另外更新 `GLOSSARY.md` 的 Files / Review / space 面板条目（如果条目说到了布局），并在 ADR 0011 里加一行，指向 0013 取代的那一条。

## 验收

- 演示窗口（`scripts/demo/stage.sh`，离线时照 [space-panel-consistency](space-panel-consistency.md) 的做法）在默认宽度和放大两种状态下各截一组图，覆盖：Files 打开文件、Files 无文件、Review 有改动、Review 无改动、Review 非 git。看图确认：两页的工具栏、导航列、列头横线在同一高度，左右边距一致，行高、选中、字体一致。
- `scripts/check.sh` 输出 `all checks passed`。新逻辑（压缩、排序、键盘移动、菜单项条件、宽度上下限）各留断言测试，放在现有 `check-*.cjs` 的写法里。
- 用 `herdr-app do` 驱动的地方都核实过。真实鼠标的悬停、拖动、右键没有核实过的，在交付时写明。
