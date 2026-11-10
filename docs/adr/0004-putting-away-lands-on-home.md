# 收起当前 agent 后回 Home，不跳到下一张卡片

这是对 T3 Code 的有意偏离。自动跳到下一张，等于替人决定下一步看什么；留在原处也不对，Settle 的意思是“这个我不想再看了”。所以收起正在查看的 agent（Settle、Snooze、拖动、划选）后默认回到 Home，连续处理时多按一次 `cmd-]`，换来跳转结果固定。收起后台 agent 不跳转。

## Consequences

- 只在侧栏选中 Inbox 时生效（见 [0002](0002-inbox-rules-stay-in-inbox.md)）。Lists 里没有 Settle；关闭当前 agent 的标签时，回到这个 space 上一次看的标签。

- Review 是唯一例外：回到打开它之前的地方，因为看完 diff 通常要回去跟 agent 说话（见 [0007](0007-review-belongs-to-the-space.md)）。
- 单独发布的 `herdr-t3-inbox` 不传 `home` prop，保持跳到下一张的行为。
- 连续清卡片的人可以在设置里选 Next card（见 [0009](0009-settings-hold-real-preferences.md)）：跳到下一张，没有下一张就回 Home。`home` prop 仍只表示“这里有 Home 可去”，选哪种是 `t3.settings` 里的偏好。关闭标签不受这项设置影响，仍回 Home：关闭是销毁，不是看完了。
