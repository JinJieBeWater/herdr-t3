# 收起当前 agent 后回 Home，不跳到下一张卡片

这是对 T3 Code 的有意偏离。自动跳到下一张，等于替人决定下一步看什么；留在原处也不对，Settle 的意思是“这个我不想再看了”。所以收起正在查看的 agent（Settle、Snooze、拖动、划选）后总是回到 Home，连续处理时多按一次 `cmd-]`，换来跳转结果固定。收起后台 agent 不跳转。

## Consequences

- Review 是唯一例外：回到打开它之前的地方，因为看完 diff 通常要回去跟 agent 说话（见 [0007](0007-review-belongs-to-the-space.md)）。
- 单独发布的 `herdr-t3-inbox` 不传 `home` prop，保持跳到下一张的行为。
