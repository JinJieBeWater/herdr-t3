# 多 pane 关闭后的回退验收

用户反馈：

> 感觉需要优化一下这个布局在多个pane时候的关闭的退回逻辑，目前有多个pane也会退回home，感觉不太对

同一个标签还有窗格时，关闭 agent 窗格后留在该标签，由 Herdr 选择剩余窗格。整个 agent 标签或最后一个窗格关闭仍回 Home。Settle、Snooze 和 Review 的返回规则不变。

根因有两处：`closePaneNow()` 主动跳 Home；`track()` 又把 agent 窗格消失当成整个标签消失。修复去掉前者，只在整个标签消失时触发后者。

2026-11-09 验证：

- `node mods/t3-tabs/check-navigation.cjs` 在修复前失败：期望只有 `pane.close`，实际先执行了 `space.select Home`。修复后通过，覆盖同标签剩余 shell、agent、mod，以及外部关闭。
- `mods/t3-spaces/check-sidebar.cjs` 同步更新旧断言，覆盖 Inbox、Lists 和剩余 agent 的已读状态。
- `scripts/sync.sh` 已执行；`scripts/check.sh` 输出 `all checks passed`。
- 独立 demo 使用本地空项目、默认侧栏宽度，通过 `herdr-app do` 回放：布局关闭命令先询问，执行确认命令后同一 space、同一标签保留，剩余 shell 获得焦点。
- 同一 demo 中直接执行 `pane.close`，以及报告 agent 状态的测试程序自行退出，都保留原标签并聚焦剩余 shell；最后一个 agent 窗格关闭则回 Home。窗口无 mod 错误。
- 亲自检查了完整窗口截图：[关闭前](split-before.png)、[关闭后](split-after.png)。

未验证真实鼠标点击；demo 里的 agent 是测试替身。
