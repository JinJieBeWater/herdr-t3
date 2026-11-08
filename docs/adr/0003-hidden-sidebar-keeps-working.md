# 侧栏隐藏时，当前模式继续生效

Herdr 隐藏的 mod 副本仍然存活、定时器照跑，只是不绘制，也收不到 `<mod>.<command>`。所以 Inbox 的计算从 `render()` 里抽出来，隐藏时由定时器驱动，维持已启动副本的顺序。读 `settled` 标签的各方仍按 `shared/tree.js` 的共享规则解释它。命令走 `shared`，按键命令（包括 Settle）由一直显示的 `t3-tabs` 独立处理，不依赖 Inbox 副本。

## Consequences

Inbox 副本第一次显示后才启动：这次运行里还没显示过 Inbox 时，隐藏状态下不维护它自己的行顺序。Settle 快捷键不受影响。
