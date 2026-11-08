# T3 视觉基准

布局的圆角、边距、尺寸、字号统一到 T3 Code。本文是统一时的查表入口，**T3 源码优先于本表**：`pingdotgg/t3code` 的 `apps/web/src`，提交 `337c5858`（2026-11-05）。本机副本在 `/private/tmp/t3code-terminal-research`，没有时重新 clone 这个提交。

## 规则

1. 每个数值都能指向 T3 的一个组件。没有直接对应时，用用途最接近的组件，并在代码注释里写一句为什么。
2. 同一种用途全布局只有一个值。三处相同就够了，不要新建共享常量文件。
3. 宿主做不到的（Herdr 弹窗外壳、玻璃效果、缩放动画）记进下面的「做不到」，不写模拟层。
4. 只统一视觉。行为、颜色（由主题决定）和下面的「有意不同」不改。T3 的 `destructive` 取 `ansi1`，不取 Herdr 的 `destructive`（即 `blocked`，部分主题是琥珀色）；上面的字在白色和 `background` 里取对比度高的：T3 主题下就是 T3 的白字，浅红主题下白字看不清时用背景色。

换算：T3 `1rem = 16px`，`spacing(1) = 4px`，Herdr 的逻辑 px 与之一比一。带 `sm:` 的取 `sm:` 的值，这是桌面尺寸。

## 圆角

| T3 | px | 用途 |
| --- | --- | --- |
| `rounded-sm` | 4 | 菜单和 combobox 的行、20px 及更小的按钮、标签的 ×、徽章、键帽 |
| `rounded-md` | 6 | tooltip、compact 输入框、28px 高的小按钮 |
| `rounded-lg`、`--control-radius` | 8 | 菜单、popover、combobox、select 的面板，输入框，默认按钮 |
| `rounded-2xl` | 16 | 对话框、命令面板 |

## 组件

| 组件 | T3 文件 | 数值 |
| --- | --- | --- |
| 菜单面板 | `ui/menu.tsx` | 内边距 4，圆角 8，大阴影 |
| 菜单行 | `ui/menu.tsx` | 最小高 28，横向 8、纵向 4，间距 8，字号 14，圆角 4 |
| 菜单搜索框 | `ui/menu.tsx` | 外层横向 8、上 6、下 4；输入框高 26，下 6 后 1px 下划线，图标 16，文字起点 20 |
| Combobox 搜索框 | `ui/combobox.tsx` | 外层横向 12、上 10；其余同菜单搜索框 |
| Combobox 行 | `ui/combobox.tsx` | 见源码，横向 8、纵向 4，圆角 4 |
| Tooltip | `ui/tooltip.tsx` | 横向 8、纵向 4，字号 12，圆角 6 |
| Popover | `ui/popover.tsx` | 圆角 8；default 纵向 16、横向 16，compact 纵向 8、横向 12 |
| 输入框 | `ui/input.tsx` | 默认高 30、横向 11、圆角 8；sm 高 26、横向 9；compact 高 28、横向 9、字号 12、圆角 6 |
| Select | `ui/select.tsx` | 同尺寸的按钮；面板内边距 4，圆角 8；箭头 14 |
| 按钮 | `ui/button.tsx` | 默认高 32；sm 高 28；xs 高 24，字号 12，图标 14 |
| 图标按钮 | `ui/button.tsx` | 32、28、24（图标 14）、20（圆角 4，图标 12）、16（图标 12） |
| 键帽 | `ui/kbd.tsx` | 高 20，最小宽 20，横向 4，字号 12，圆角 4 |
| 徽章 | `ui/badge.tsx` | 见源码，圆角 4 |
| 对话框 | `ui/dialog.tsx`、`dialog-styles.ts` | 最宽 512，圆角 16；头部内边距 24、间距 8；标题 20 半粗；正文 24；底部横向 24、纵向 16；默认有上边线，`bare` 变体没有（Actions 编辑器用它） |
| 确认框 | `ui/alert-dialog.tsx` | 同对话框 |
| 命令面板 | `ui/command.tsx`、`CommandPalette*.tsx` | 最宽 576，最高 420，圆角 16；搜索纵向 6；底部纵向 10，上边线 |
| 标签关闭 | `ui/panel-tab-close-button.tsx` | 16，圆角 4，图标 12 |
| 标题栏按钮 | `index.css`、`ui/sidebar.tsx` 的 `SidebarTrigger` | 28，间距 12，图标 16 |
| 侧栏 | `Sidebar*.tsx`、`ui/sidebar.tsx` | 见源码；RECIPE 里已写明的是之前量过的值，仍要对照 |
| 侧栏图标 | `SidebarThreadHeader.tsx`、`SidebarProjectFolderHeader.tsx`、`ui/collapsible-section-header.tsx`、`SidebarThreadRow.tsx` | 图标跟着按钮框走：28 的按钮图标 16，24 的小按钮（`icon-xs`）图标 14；收纳区和文件夹的折叠箭头、行内控件和标记 12 |
| 面板标签 | 终端和预览面板的标签组件 | 见源码 |

## 有意不同

用户决定保留，不要改回 T3（见 [ADR 0002](../adr/0002-lists-and-inbox-share-rules.md) 和 [ADR 0004](../adr/0004-putting-away-lands-on-home.md)）：

- 标签关闭按钮在标签末尾，名字很短的标签最小 96px。
- Settle 后回 Home，Review 回打开它之前的地方。
- `cmd-]` 在 Lists 下也走折叠的组。
- 标签栏高度、工作区框架等 T3 没有的结构，以及 Review 的 diff 内容区。
- 品牌栏按钮之间没有 T3 的 12 间距，这样才和下一行的按钮对齐。
- Spaces 行之间 1，T3 的文件夹之间 8：space 多了太占高度。

## 做不到

- 玻璃效果（背景模糊）和弹窗的缩放动画。
- 字距（`tracking-widest`）：kit 没有字距 API。
- 命令面板的背景遮罩：New 和 Go to 是 popup，改 dialog 就不能固定在顶部。顶部 `offset` 96 是 T3 `10vh` 的近似值，宿主只收固定值。
- Herdr 自带的 `space.close` 确认框和 worktree 对话框：数值写死，mod 碰不到。
- 数字框内容居中：`NumberInput` 不接受。
- 竖向滚动条的尺寸由宿主决定。

外壳圆角能做到：`frame: "none"` 由 mod 自画，已用于 16 圆角的 New、Go to、Actions 编辑器、确认框和 Custom snooze。菜单类弹层的宿主外壳本来就接近 8，不用自画。

确认框放在 `t3-actions` 的 `actions: "confirm"` 里，因为宿主 `confirm` 改不了圆角；单独发布的 Inbox 没有 `t3-actions`，回退到宿主 `confirm`。
