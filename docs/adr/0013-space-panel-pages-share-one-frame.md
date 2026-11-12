# space 面板的两页共用一套框架

双向跨页操作和共用导航列宽度已由 [0015](0015-panel-pages-stay-independent.md) 取代；共用框架和视觉实现保留。

修订 [0011](0011-one-space-panel.md) 里“窄时 Review 按原有规则改用页签和 unified diff”这一条，以及“Review 的组侧栏和文件栏也移到 diff 右边”的两列做法。

Files 和 Review 是同一个 space 面板的两页，但头部、导航列、树行、菜单、空态各写各的：Files 的头是两条各跟一列的列头，Review 是一条 chrome 底的整页头；Files 常驻一列树，Review 窄时没有导航列、宽时有组侧栏和文件栏两列；选中、行高、圆角、字体、控件样式都不同（截图见 [space-panel-consistency](../research/space-panel-consistency.md)）。切页时整页在跳。

两页改为同一套框架，以 T3 Code 右侧面板为唯一基准（[t3code-panel-surfaces](../research/t3code-panel-surfaces.md)）；pulls.review 只决定 diff 内容本身。T3 两个 surface 之间不一致的地方（树默认开关、默认宽度、树头高度），取 Files surface 的做法。

- **框架**：`panel-body` 是一张 `background` 卡片，和工作列的窗格一样，每页的工具栏是卡片的第一行；两页都不画自己的底色，工具栏、内容和导航列透出卡片的底色，只靠线隔开。面板头之下每页一条常驻全宽工具栏，左边是“在看什么”，右边是页面工具，最右是导航开关；其下内容在左、导航列在右。空态也保留工具栏。
- **导航列**：每页只有一列，两页共用一个宽度、一样的边框和列头；没有按宽度变形的断点。Review 的组并入这一列，作为树的顶层节点。（已由 [0014](0014-review-groups-filter-the-tree.md) 修订：组是工具栏下方一行页签，树只列当前组。）
- **树**：两页用 `shared/` 里同一个文件树行，规格照 T3 的 Pierre compact 树。选中只表示一个当前文件。Review 的已看勾选放在行首，chevron 之后、文件图标之前。
- **菜单与跨页**：文件行两页同一份右键菜单，菜单项由 `shared/` 里同一个函数算出，尺寸照 `t3-menu`；面板自己画，不开 `t3-menu` 的 overlay，因为单独发布的 Review 所在的 Herdr 自带布局里没有 `t3-menu`。跨页跳转是菜单项，加上工具栏里一个对称的图标按钮。
- **状态**：加载、空、错误用一套组件。
- **字体**：面板里的界面文字跟随布局字体，等宽字体只给 diff 和代码，取自设置，不写死字体名。

规格和实施顺序见 [space-panel-unify-plan](../research/space-panel-unify-plan.md)。

## Considered Options

- **只统一 token（色、圆角、字号），保留两页各自的结构**：最省，但切页时头部高度、横线、导航列仍然在跳，不一致的根在结构。
- **Review 保留组侧栏 + 文件栏两列，Files 也加一列**：两列在默认宽度 681 下放不下内容；T3 没有两列导航。
- **以 pulls.review 网页为 Review 页基准**：两页就有两个基准，正是现在不一致的来源。

## Consequences

- Review 窄宽时的组卡片行、宽时的组侧栏与 aside 删除；设置里的 Groups: Tabs / Sidebar（`groupNav`）和 Files: Tree / List（`fileList`）删除。
- Review 的选中从“视野内的多行”改为单个当前文件，滚动时跟随视口顶部的文件。
- 默认宽度下导航列占 256，Review 的 diff 比现在窄（约 425）；可以关掉导航列或放大面板。
- 组的环形图删除，组 summary 移到 diff 区顶部，只显示当前组的。
