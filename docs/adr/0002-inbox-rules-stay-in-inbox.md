# Inbox 的注意力规则只在 Inbox 生效

Inbox 按注意力组织，Lists 按项目组织，两者是对等的工作方式。两者共享事实：命名、置顶、`settled` / `snoozed` 标签的含义（`shared/tree.js`）、关闭确认、焦点和缩放修正，以及 Unpin 的 Undo。Inbox 处理注意力的策略只在侧栏选中 Inbox 时生效，侧栏隐藏时按所选模式：

- **Settle**：按钮、拖动和 `cmd-shift-s`。在 Lists 里，这个键什么都不做。
- **回 Home**：收起或关闭当前查看的 agent 后回到 Home（[0004](0004-putting-away-lands-on-home.md)）。在 Lists 里关闭它，和关闭其他标签一样，回到这个 space 上一次看的标签。
- **Snooze 藏起 working**：在 Lists、标签、窗格标题和 Go to 里，已 Settle 或 Snooze 的 agent 只去掉 done 圆点，工作中照样转圈。侧栏开关的计数也按所选模式计算。
- **空间筛选**：只有 Inbox 下，带进视野的 agent 才会放宽筛选。在 Lists 里切换 agent 不会改动它。
- **标签栏**：显示 Inbox 时，只放当前工作周边的标签，不显示状态标记；显示 Lists 时全部显示。上/下一个标签和 `cmd-1…9` 跟着标签栏走。

Snooze 在两种情况下结束：树里有失败，或者当面开始了新一轮。这属于维护共享事实，由一直显示的 `t3-tabs` 执行，两种模式都生效。醒来后被看过才清除 Woke，这仍然只是 Inbox 的规则。

## Considered Options

- **两种模式规则完全相同**（本 ADR 的前一版）：否决。Lists 看不到 Settled 和 Snoozed，在那里 Settle、回 Home、把 working 显示成 idle，都成了看不出原因的副作用。在 Lists 里切换 agent 还会悄悄清掉 Inbox 的筛选。
- **Lists 也分 Settled 组**：否决，否则 Lists 会变成第二个 Inbox。已 Settle 或 Snooze 的行留在原位，不加按钮。

## Consequences

- `cmd-]` / `cmd-[` 对折叠的处理随组织方式不同。Inbox 只走画出来的行，折叠的 Working 是有意收起的；Lists 也走折叠的组，否则默认折叠的 Idle 走进去就回不来。子 agent 不算，没有窗格的只能弹窗打开。
- 在 Lists 里点图钉仍会结束 Snooze，因为置顶会写同一个标签，而 Lists 里看不到 Snooze 状态。
