# 每个 space 记自己的面板

取代 [0011](0011-one-space-panel.md) 里“面板只有一份开关，不按 space 记”这一条。面板仍是窗口右侧唯一的一列，跨标签固定；但它开没开、显示哪一页、放没放大，按 space 各记一份，照 T3 按 thread 记右侧面板（`rightPanelStore` 的 `isOpen`、`activeSurfaceId`、`maximized`）。宽度和 T3 一样，整个窗口一份。没记过的 space 里面板关着。

快捷键也照 T3：`cmd-alt-b` 是 `rightPanel.toggle`；键盘在面板里时 `cmd-w` 关闭面板，对应 T3 焦点不在终端时的 `rightPanel.close`。T3 的 `diff.toggle`（`cmd-d`）只在焦点不在终端时生效，而 Herdr 的焦点几乎总在终端上，所以 `cmd-d` 留给 Herdr 的向右分屏，Review 用 `cmd-shift-g`。T3 没有打开 Files 的键，Files 也不设。

## Considered Options

- **整个窗口一份开关（0011）**：在一个 space 里打开的 Review 或 Files，切到别的 space 还盖着，那里不一定有要看的。0011 担心切 space 时面板忽开忽关、人得猜；T3 的做法说明，面板跟着正在看的东西恢复，反而不用猜。
- **Review 用 `cmd-d`**：要把 Herdr 的向右分屏挪到别的键，动的是 Herdr 的基础操作。

## Consequences

- 状态记在共享状态 `t3.panels`，按 space id。由能看到面板变化的那份副本在绘制时同步：平时是标签栏的 `t3-tabs`；放大时标签栏隐藏，换成面板头 `t3-chrome`。放大和关闭在操作时当场写入，所以从放大状态回来的标签栏读到的记录已和面板一致。
- Home 也是 space：回 Home 时面板按 Home 自己的记录显示，默认关着。
- 单独发布的 herdr-pulls-review 用在 Herdr 自带布局里，那里由自带的 `tabs` 按 space 记，不受影响。
