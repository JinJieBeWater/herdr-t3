# 侧栏隐藏时，当前模式继续生效

Herdr 隐藏的 mod 副本仍然存活、定时器照跑，只是不绘制，也收不到 `<mod>.<command>`。所以 Inbox 的计算从 `render()` 里抽出来，隐藏时由定时器驱动；命令走 `shared`，按键命令由一直显示的 `t3-tabs` 接收。这从根上解决了“隐藏后状态过时”一类问题，取代了此前在各个读取方补 `stillSettled` 这类规则的做法。

## Consequences

Inbox 副本第一次显示后才启动：这次运行里还没显示过 Inbox 时，隐藏状态下算不了它的顺序和 Settle。
