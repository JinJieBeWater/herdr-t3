# 标签的关闭按钮放在哪：T3、Kero、Rex、VS Code

2026-11-05 调研。问题：我们的标签平时左边显示程序图标，悬停时图标变成 `×`，看着别扭。

## 结论

建议把 `×` 移到标签右侧，和状态标记共用一个位置；程序图标始终留在左边。这是对 T3 的有意偏离。

## 各家做法

| 产品 | 关闭入口 | 图标是否被替换 | 依据 |
|---|---|---|---|
| T3 Code（origin/main `9e85538535`） | 悬停时图标位变 `×` | 是 | `apps/web/src/components/ui/panel-tab-close-button.tsx` |
| 我们 | 同 T3 | 是 | `mods/t3-tabs/main.js:228`、`:270` |
| Kero（`egoist/kero` `8eb2ead`） | 没有横向标签栏。会话行上没有 `×`，靠右键菜单和 `⌘⇧W` | 否 | `view.go:477`（`sessionRow`）、`view.go:766` |
| Kero 窗格头 | 悬停后右侧淡入，动画 120ms | 否 | `panes.go:520`（`paneControls`） |
| Kero 文件查看器 | 右上角。有未保存改动时显示圆点，悬停变 `×` | 否，被替换的是状态标记 | `edits.go:231`（`closeButton`） |
| Rex Beta 0.1.0 | 图标、标题、状态和关闭按钮是各自独立的视图；具体位置未实测 | 从符号看不是同一个视图 | App 二进制里的符号，见下 |
| VS Code | 默认在右侧，可设到左侧；未保存圆点和关闭按钮共用位置 | 否 | [#65139](https://github.com/microsoft/vscode/issues/65139)、[Modern UI README](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/modernUI/README.md) |

Rex 横向标签的符号依次是 `blockIconView`、`titleField`、`keepsCloseButtonShown`、`closeButton`、`hoverTrackingArea`、`statusIndicator`、`statusDot`、`muteIndicator`，另有布局类型 `HorizontalTabCloseLayout`。纵向标签行另有 `iconView`、`nameField`、`stateCapsule`、`closeButton`、`showsCloseButton`、`keepsCloseButtonShown`。这只能推断结构，不能证明按钮的位置。

## VS Code 团队讨论过同样的设计

[#65139](https://github.com/microsoft/vscode/issues/65139) 提议悬停时把文件图标换成 `×`。提议者列的好处是不用预留宽度，连续关闭时下一个 `×` 正好滑到指针下。提议者也承认，按钮要悬停才能发现。团队内部讨论后没有采纳，理由是开了左侧关闭的用户习惯在那个位置看未保存状态。

## 未验证

- 没有实测 Rex 和 Kero 的悬停效果。打开它们会打扰正在用的桌面，Rex 当时也没有窗口可截。
- 没有查 Ghostty：它用 macOS 原生标签，文档里没有写关闭按钮的位置。
