# 二级菜单方案

2026-11-11。问题：我们的菜单遇到下一级时，要么换掉整个菜单（Snooze），要么翻到同一弹层的第二页（Review 的 Commits、Branches，设置的 Language、Agent、Model）。T3 Code 用的是向右展开的子菜单。

## 参考

| 来源 | 做法 | 位置 |
|---|---|---|
| Herdr 自带 `win98` | 每级一个 `openOverlay({ kind: "popup", frame: "none", at, width, height })`；`at` 取悬停行 `e.bounds` 的右边；已开各级记在 `shared("win98.menus")`，带 `parents`，`closeTree` 连同下级一起关；选中一项关掉整串；`→`/Enter 开，`←`/Esc 退 | `~/.config/herdr-app/mods/win98/menu.js`、`kit.js:356` |
| T3 Code `MenuSub` | Base UI `SubmenuTrigger`：悬停 100ms 打开，`closeDelay` 0，`safePolygon` 让斜着移向子菜单时不关；`side="inline-end"`、`align="start"`、`alignOffset` -5；触发行末尾 `chevron-right`，打开时保持高亮 | `apps/web/src/components/ui/menu.tsx:322-375`；`@base-ui/react` 1.5.0 `menu/submenu-trigger/MenuSubmenuTrigger.js:35-119` |

win98 证明两件事：开第二个 popup 不会关掉第一个；`frame: "none"` 的 popup 由 mod 自己画外观。它缺 T3 的打开延迟、安全区域和贴边翻转。

## 范围

| 菜单 | 现在 | 改成 |
|---|---|---|
| 右键菜单 agent 的 Snooze（`mods/t3-menu`） | 换成一个新的 Snooze 菜单 | 子菜单：预设时间，分割线，Custom… |
| Review 范围菜单的 Commits、Branches（`extras/mods/review/scope.js`） | 同一弹层第二页，带返回和搜索 | 子菜单，顶上是搜索框，最高 320，和 T3 的 Commits 子菜单一样 |
| Review 设置的 Language、Agent、Model（`extras/mods/review/settings.js`） | 同上 | 子菜单；Model 带搜索 |

不改：pulls-review 的 logo 菜单（Commits、Branches 是用 Tab 切换的两个并列页，不是上下级）；没有下一级的菜单。

## 做法

两类菜单的画法不同，各用各的承载方式，共用一份交互逻辑。

**共用 `shared/submenu.js`**（`scripts/sync.sh` 复制到用它的 mod）：只管判断，不画东西。

- 悬停意图：鼠标停在触发行 100ms 才打开；已有子菜单时，移到别的行也要等 100ms 才换。
- 安全区域：从离开触发行时的指针位置，到子菜单靠近一侧的上下两角，围成一个三角形。指针在三角形里移动时不切换、不关闭。
- 位置：子菜单左上角贴触发行右边，上移 5（T3 的 `alignOffset`）；右边放不下时改贴触发行左边，往左展开。
- 键盘：`→`/Enter 在触发行上打开子菜单并把高亮放到第一项（有搜索框时聚焦搜索框）；子菜单里 `←`/Esc 关掉它，回到触发行；选中一项关掉整串菜单。

**右键菜单（`t3-menu`）照 win98**：子菜单是第二个 `openOverlay` popup，`at` 由 `subPlace(行的 e.bounds, 宽, 0, window.viewport_size().width)` 算；`props` 带 `parents` 和触发项；已开的各级记在 `shared("t3-menu.chain")`，关闭沿用 `closeTree` 的做法。键盘打开时没有行的位置，用打开菜单时的指针位置加行的偏移估算。

**面板里的下拉（Review）**：Review 的弹层本来就是面板里 `absolute()` 的元素（`main.js:439-445`），子菜单也一样画在面板里，`subPlace` 的范围是面板自己的宽度：范围菜单在左边，子菜单往右；设置在右边，子菜单往左。状态和搜索框留在同一个 view。父弹层的 `on_mouse_down_out` 要放过落在子菜单里的按下（子菜单是它的兄弟，不在它的范围里）。

## 验证结果（2026-11-11，demo 窗口）

截图：`/private/tmp/submenu-spike/*.png`（一次性）。

1. gpui-base `Popup` 能画出所在区块和 overlay 的边界（`left_center` 把内容左边中点钉在触发元素右边中点；嵌套 `Popup` 也能画）。但 Herdr 的 `AGENTS.md` 写明 mod 只能经 overlay 画到区块外，框外部分能否接到点击无法验证（`herdr-app do` 不能点击；向 demo 进程 `CGEventPostToPid` 发的点击它不收），所以不用。
2. overlay popup 的 `at` 超出窗口时，Herdr 把它夹回窗口内，不翻到另一边：翻转要自己算，`window.viewport_size()` 给窗口宽度（`gpui-kit.d.ts:20495`）。
3. 多个 overlay popup 可以同时开着（win98 也这样用）。点击子菜单 overlay 时父菜单会不会被关掉同样无法验证；Snooze 选中一项本来就关掉整串，不受影响。

共用逻辑已写好：`shared/submenu.js`（`subPlace`、`heading`、`hoverRow`、`subOpened`、`subLeft`），测试 `shared/check-submenu.cjs`。

## 测试与验收

- 行为测试（各 mod 的 `check-*.cjs`）：100ms 前不打开，之后打开；三角形内移动不切换，三角形外切换；`→`/`←`/Esc/Enter；选中关闭整串；靠右翻到左边。
- `scripts/check.sh` 显示 `all checks passed`。
- demo 窗口默认侧栏宽度整窗截图：Snooze 子菜单、范围菜单 Commits（含搜索）、设置 Model；面板放大（⤢）时 Review 的子菜单翻到左边。
- 真实鼠标斜移只能报告为未验证（demo 用 `herdr-app do` 驱动，不动鼠标）。

## 文档

`RECIPE.md`/`RECIPE.zh-CN.md`（菜单的子菜单尺寸和行为）、双语 CHANGELOG、`docs/user/guide*.md` 与 `extras*.md` 中写到"第二页"的句子；`docs/research/review-panel-redesign-plan.md` 里"GPUI 的弹层不做悬停子菜单"一句标注已被本文取代。

## 分工

我已写完 `shared/submenu.js` 和它的测试，并跑完上面三项验证；两个 agent 并行：一个负责 `t3-menu` 的 Snooze，一个负责 Review 的范围和设置菜单。文档、sync、check、截图和提交由我做。

注意：工作区里有另一个会话还没提交的改动（`shared/panel.js`、各 mod 的 `store.js`、`shared/check-panel.cjs` 等），实施和提交时不碰这些文件。
