# Herdr T3

Herdr App 的一套布局，让人同时开着很多 agent，只看需要他的那几个。

## 来自 Herdr

**Space**：
一个项目的工作区，在某一台机器上，里面有若干标签。
_Avoid_: project、workspace

**Agent**：
向 Herdr 报告状态（working、blocked、done、idle）的终端程序。
_Avoid_: thread（T3 Code 的叫法）、session

**子 agent**：
由另一个 agent 启动的 agent，列在父级下面。
_Avoid_: child、worker

**顶层 agent**：
不是子 agent 的 agent。

**程序**：
不报告状态的终端程序，如 lazygit、vite。
_Avoid_: tool、app

**机器**：
`hc machine` 管理的一台计算机，本机或通过 ssh 连接的远程机器。
_Avoid_: host、server

## 侧栏

**Inbox**：
按注意力组织的侧栏：需要你的 agent 是上方的卡片，其余收进底部的收纳区。
_Avoid_: Focus（旧名）、通知

**Lists**：
按项目组织的侧栏，由 Spaces 和 Agents 两个列表组成。
_Avoid_: 列表模式

**卡片**：
Inbox 上方代表一个 agent 或一个 Review 的条目。

**收纳区**：
Inbox 底部可折叠的分组：Working、Snoozed、Settled。
_Avoid_: drawer、文件夹

**Pinned**：
被置顶的 agent 所在的分组，保留人排的顺序；Inbox 和 Agents 列表共用一份置顶。

## 状态

**当前查看的 agent**：
焦点所在窗格里的 agent。
_Avoid_: 当前 agent、选中的 agent

**未读的 done**：
已 done、但人还没看过的 agent，显示为圆点。

**Settle**：
人把结束的 agent 收起；它一有新工作就自动回来。
_Avoid_: archive、dismiss、完成

**Snooze**：
把不需要你的 agent 藏到人选的时间；到点回到原位，标为 Woke。
_Avoid_: 稍后提醒、mute

**Woke**：
刚从 Snooze 醒来、人还没看过的标记。

## 位置和入口

**Home**：
收起当前查看的 agent 后的落脚点，一个不属于任何项目的隐形 space。
_Avoid_: dashboard、首页

**Settings**（布局设置）：
布局自己的设置页，和 Herdr 的 Settings 分开；只收因人而异的偏好（见 ADR 0009）。
_Avoid_: preferences、config、T3 settings

**Go to**：
`cmd-p` 打开的跳转面板，每个窗格一行。
_Avoid_: picker（mod 名）、Search（Inbox 里的入口名）

**Action**：
标签栏运行按钮里的一条命令，在新标签或分屏里运行。
_Avoid_: task、script

**Review**：
一个 space 的待评审内容，以及显示它的评审窗格；Review 栏是它在标签栏里的入口。
_Avoid_: diff、changes
