# 按钮共用一个 helper

修订 [t3-tokens.md](../internals/t3-tokens.md) 规则 2「不要新建共享常量文件」在按钮上的适用。

按钮原先各 mod 自己画：文字按钮四处、图标按钮二十来处，尺寸照着 T3 对齐了，颜色和状态没有。结果是同一个状态多种画法：悬停有 `hover`、foreground 4%、6%、7% 四种底，禁用有 0.3、0.5 和换底色，`hover` 在弹层上（部分主题等于 `popover`）看不见，壁纸 mod 的主按钮用 `accent` 填色、禁用后几乎读不出字。尺寸三处一样就够，颜色和状态组合多、靠复制守不住。

按钮改由 `shared/button.js` 的 `button()` 画，照 T3 `ui/button.tsx` 的 variant × size：`primary`、`outline`、`danger`、`ghost`（T3 的 ghost-muted）、`plain`（T3 的 ghost），底面分 `chrome`、`card`、`row`、`tab`，颜色和状态表在 t3-tokens.md「按钮」。`scripts/sync.sh` 分发副本，和其他共享模块一样。

## Considered Options

- **只写一张状态→token 表，各处照抄**：成本最低，但现状就是「照着约定各写各的」走样出来的。
- **shadcn 式完整组件库（按钮、输入框、select、toggle 一起）**：输入框和 select 已用宿主的 `Input`、`Select`，菜单和列表已在 `shared/`；没有同样的走样证据，先不做。

## Consequences

- helper 只管外观和 `role`；点击（或传 `act`）、`hot` 的悬停追踪、`stop()`、`tip()` 仍由调用方加，因为 Review 和 Files 不带 `focus.js`。
- 行、标签、分段切换、日历格、select 触发框、按钮组、输入框的 stepper、行内链接、Inbox 行上的悬停控件不算按钮，保留各自画法（表下列出）。侧栏行里的按钮走 `row` 底面：照 T3 行控件只变亮、没有底色。
- 迁移后有可见变化：ghost 图标静止色统一为 `dim`（Files、Review 原为 `muted`），卡片、弹层和对话框上的悬停改为可见的 foreground 7%，禁用统一 0.64，对话框按钮悬停从 0.88 改为 0.9，Actions 编辑器的 Save 禁用时保留 `solid` 底、整体变淡，开着弹层的按钮在 chrome 上带 `selected` 底。
