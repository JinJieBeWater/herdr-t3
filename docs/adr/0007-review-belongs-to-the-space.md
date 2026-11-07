# Review 属于 space，每个 space 一个

agent 和 space 是多对一：决定时的快照里，9 个有 agent 的 space 没有一个跨仓库，4 个有多个 agent，最多 7 个共用一个 worktree，diff 没法归到某个 agent 头上。所以每个 space 一个 Review、一张卡片，标签和分屏都有卡片；入口在别的标签已开着时跳过去，不再新开；关闭或 Settle 回到打开它之前的地方。

Review 栏是当前 space 的状态和入口，留在标签栏右侧、和 Actions 同一组；在 commit 之间切换是 Review 窗格自己顶栏的事。计数常驻、每段可点，agent 工作时照常更新；不用彩色，因为颜色在这个布局里表示 agent 状态，窄窗口改用图标；logo 固定在最右。自动分析只在点计数打开时触发。

## Considered Options

- **Review 是 agent 的一步**：见上面的多对一。这也是保留 Review 卡片的原因，它是 Inbox 里唯一的 space 级对象。
- **`[Review ▾]` 单按钮**：用户会扫一眼计数，收进菜单就看不到了。

## Consequences

远程 space 没有 Review 栏：jin.review 的 daemon 只监听本机。
