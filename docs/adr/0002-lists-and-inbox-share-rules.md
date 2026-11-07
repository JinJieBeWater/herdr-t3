# Lists 和 Inbox 对等，规则相同

Inbox 按注意力组织，Lists 按项目组织，两者是对等的工作方式：关闭、跳转、Settle 和 Snooze 的规则相同，侧栏隐藏时也一样。唯一保留的差异是标签栏：显示 Inbox 时只放当前工作周边的标签、不显示状态标记，显示 Lists 时全部显示；上/下一个标签和 `cmd-1…9` 跟着它走。

## Considered Options

- **Inbox 是唯一模型**：否决。Lists 是按项目工作的另一种方式，不是 Inbox 的附属。
- **Lists 也分 Settled 组**：否决，否则 Lists 会变成第二个 Inbox。已 Settle 或 Snooze 的行留在原位，按 idle 显示，不加按钮。

## Consequences

`cmd-]` / `cmd-[` 对折叠的处理随组织方式不同：Inbox 只走画出来的行，折叠的 Working 是有意收起的；Lists 也走折叠的组，否则默认折叠的 Idle 走进去就回不来。子 agent 不算，没有窗格的只能弹窗打开。
