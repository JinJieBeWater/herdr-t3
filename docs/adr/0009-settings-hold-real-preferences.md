# 设置页只收真偏好

布局有了自己的设置页（`t3-tabs.settings` 打开，`t3-chrome` 绘制）。设置页只收这样的选项：两种做法各自对一类人更省注意力，没有一个对所有人都更好。为保留旧行为、外观微调或一次性的口味，不加设置。这条和 [0008](0008-change-behaviour-without-toggles.md) 不冲突：0008 管行为变更，不留开关保旧行为；本条管本来就因人而异的偏好。

收进来的两项：收起当前 agent 后回 Home 还是跳到下一张卡片（按需挑下一步的人要 Home，连续清队列的人要下一张）；空 Home 放默认页还是终端（有人把 Home 当常驻 shell）。

## Considered Options

- **照 Flockbook 自建 `<appHome>/herdr-t3/config.json`**：可以手改，但要写文件读写、并发重试、坏文件提示和定时重读。存在 `shared("t3.settings")` 里，这些都是现成的：持久、改了所有实例立即重绘、`scripts/update.sh` 不碰。
- **写进布局 JSON（props、`focus.color` 等）**：更新覆盖布局文件就丢；用 `layout.set` 写个人布局还会清空 Herdr 记的点击状态（侧栏宽度、主题选择、当前 stack）。所以聚焦边框不进设置页，仍手改，等 Herdr 提供只写 pane focus 的命令。
- **窗格标题栏常显、单窗格带框、底部状态栏、终端内边距、Snooze 预设**：外观或一次性口味，按 [0001](0001-trade-off-order.md) 不逐个开放。

## Consequences

- 设置每次现读（`shared/layout-settings.js` 带默认值），没有缓存，也没有迁移。
- 外观照搬 Herdr 自带的 Settings，而不是 T3：它和 Herdr 的设置并列，看起来应该是同一类东西。
- 以后新增选项先对照本条；只有一个分区时也保留左侧导航，加分区不用改结构。
