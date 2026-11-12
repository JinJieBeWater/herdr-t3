# 收起的 agent 拆到自己的标签：设计

状态：已放弃。`26bef8d` 实现后撤回：拆出、记原处、合回这一套机制太复杂；Settle、Snooze 仍只作用于侧栏，分屏由人自己摆（ADR 0010）。实测记录见文末。

## 问题

Settle、Snooze 只作用于侧栏：卡片进收纳区，面板留在原处。一个标签里分屏着几个 agent 时，收起的那个照样占着分屏，人得在一堆面板里找还在工作的那个。

## 规则：收起的暂时出去，回来的归位

分屏是人搭的结构，Settle、Snooze 只是一时不看。所以收起只借用结构，回来就还原。

- 收起：`settled` 且 `stillSettled`，或 `snoozed` 未到点（`shared/tree.js` 的同一判断，不另写）。
- 在场：其余顶层 agent。程序窗格、mod 窗格不算 agent，不参与判断，留在原处。
- **出去**：收起的 agent 所在标签里还有在场的顶层 agent 时，把它（连同它在同一标签里有面板的子 agent）拆到同一 space 的新标签，记下原标签 `t3.from`。
- **归位**：带 `t3.from` 的终端不再是「收起的 agent」了（醒来、有新工作、需要你、Undo，或 agent 退回 shell 不再是 agent），合回原标签，放在最右（Herdr 只能这样放，宽度重新分配），删掉 `t3.from`。它自己的标签随之关掉。
- 不归位，只删 `t3.from`：原标签已经关了；或者人在它的标签里另开了窗格（那里成了人的地方）。
- 标签里全是收起的 agent，或只有它一个，什么都不动。

对照现状而不是挂在事件上：由 `t3-tabs` 每帧对照现状（`track()` 旁），所以卡片按钮、`cmd-shift-s`、拖动、横扫、面包屑菜单、另一个窗口、重启后，都走同一条路，不必在每个入口加代码。

例：

| 标签里 | 结果 |
|---|---|
| A 在场、B 刚 Settle | B 拆出 |
| A、B 都已 Settle | 不动；之后 A 有新工作，那一刻 B 拆出 |
| A 已 Settle、旁边一个 lazygit | 不动（没有在场的 agent） |
| B 已拆出，之后醒来 / 有新工作 | 合回原标签最右，它的标签关掉 |
| B 已拆出，人在它的标签里开了个 shell | 醒来后不合回，删 `t3.from` |

## 拆出的做法

`terminal.keep` 只放进当前焦点的标签，不能用。实测可行的做法（见文末）：

1. 先写自己的标记 `t3.from=<space>/<tab>`（park 会保留非 Herdr 标记），记下原处。
2. `terminal.park`：Herdr 放手，删掉 `herdr.space`、`herdr.tab`，约 50ms 生效。
3. 轮询到 `herdr.tab` 消失后，写 `herdr.space=<原 space>`、`herdr.tab=<新 id>`：Herdr 重新接管，在原 space 开这个 id 的新标签。不抢焦点，`keep` 恢复，`settled`、`snoozed`、`herdr.seen` 和未读的 done 都保留。

远程机器上的终端：标签值用那台机器的本地 id，去掉 `<machine>/` 前缀（Herdr 文档）。未实测。

## 引入的行为和处理

| 情况 | 处理 |
|---|---|
| 收起的正是焦点所在的面板 | 焦点在它身上时不拆：拆了焦点会落到同标签的邻居，邻居的未读 done 被消耗。收起流程本来就会离开（Home 或下一张卡片，ADR 0004），离开后的下一帧再拆。没有离开（Inbox 单独发布、没有 Home）就等焦点走开。 |
| 它所在的标签正显示着，但焦点在别的面板 | 照拆，分屏当场收拢，焦点不动。这正是要的效果。 |
| Undo（5 秒内） | 不用另写：Undo 清掉标记，它就在场了，按归位规则合回。两处 Undo 的代码不动。 |
| 归位时人正看着它（它的标签正显示） | 等人离开再合：否则它的标签会在眼前消失，Herdr 换显示别的标签。 |
| 归位时人正看着原标签里的别人 | 照合，焦点不动（实测），分屏里多出它。 |
| 反复收起又回来 | 每次都对应一次真实的状态变化，跟着搬。 |
| 拆出后 agent 退回 shell（core 0.1.20 起退出即不再是 agent） | 按归位合回原标签：没拆的话这个 shell 本来就在分屏里，结构还给人。不合回的话，它会以「不含 agent 的标签」挂在 Inbox 标签栏上（实测）。 |
| 拆出后整个终端结束（程序没包 shell） | 面板和标签跟着关，`t3.from` 留在已结束的终端上，不处理（孤儿只看还活着的）。 |
| 搬到一半崩溃 | 每帧找「有 `t3.from`、没有 `herdr.space`、还活着」的终端，按 `t3.from` 的 space 重新接管进新标签，下一帧再按规则决定要不要归位；space 已没，按它的 `cwd` 新开一个 space（写一个新的 `herdr.space` id，和 Herdr 对不认识的 id 的处理一致）。否则它会从界面消失，重启电脑后也不会像别的终端那样换成 shell。 |
| 几个窗口同时在跑 `t3-tabs` | 各自每帧对照，会抢着搬同一个。搬之前在共享状态里占位 `t3-tabs.tidying = { address, until }`，别的副本见到就跳过。 |
| 新标签的名字 | 不命名。Herdr 自动叫“2”“3”，标签栏按命名规则显示 agent 名（没人命名的标签读作它的 agent）。 |
| zoom | 不用处理（实测）：拆走没被 zoom 的面板，原标签保持 zoom；拆走被 zoom 的那个，原标签退出 zoom，剩下的面板照常分屏。 |
| Clear（清空 Settled） | 现在关的是窗格；拆出后每个都独占标签，关掉即关标签，现有“space 不留空”的处理照用。 |
| 记忆（`trail`、`lastIn`） | 指向原标签的记录里，那个 agent 已不在：现有代码按“不在就取第一个”回退，不另处理。 |
| 子 agent 自己有面板 | 父级拆走时它不会自己跟过去（实测）。先拆父级，再对它同样 park 并打上父级新标签的 id，它就进到父级旁边，父子关系保留。子 agent 自己不会被收起（卡片和 Settle 都只对顶层）。 |
| Lists 模式 | 只在侧栏选中 Inbox 时执行（ADR 0002）。切到 Lists 不再搬；回到 Inbox 后按现状补上。 |

## 代码落点

- `t3-tabs/tidy.js`（新，只有 `t3-tabs` 用）：`move(address, space, tab)` 只做 park 和打标记；`tidy(terms, every)` 按规则找出要出去的和要归位的，跳过人正看着的，占位，调 `move`，再处理孤儿。
- `t3-tabs/navigation.js`：`track()` 里调 `tidy`。
- 两处 Undo 不动。
- 终端标签 `t3.from` 记进 `docs/internals/storage.md` 的终端标签一栏。
- 测试：`check-navigation.cjs` 的 fake herdr 加上 park 删标签、打标签后接管的行为，锁住上表每一行。

## 已定（2026-11-11）

1. 只在侧栏选中 Inbox 时执行。
2. 原 space 已没的孤儿，按 `cwd` 新开 space。
3. 回来时自动合回原标签（取代先前的“只拆不合”）：分屏是人搭的结构，收起只是一时不看。

## 实现前要补测

- 远程机器上的终端（去掉 `<machine>/` 前缀的标签值）：demo 环境没有远程机器，要用真实的 kvm 才能测。

## 不在本设计内

- 原地把面板缩成细条：Herdr 没有 `pane.resize`。
- 自动 zoom：人要并排看在场的面板。
- `terminal.park` 单独使用：顶层 agent 会从界面消失，重启电脑后丢失（实测）。

## 实测记录（2026-11-11，demo 窗口，Herdr 当时版本）

- 直接 park 顶层 agent：删 `herdr.space`/`herdr.tab`，`keep=false`，侧栏里消失，`agent.focus` 无效；`terminal.peek` 能看。
- `terminal.keep {place}`：只放进当前焦点的标签或 space，原处不记得；park 标签最后一个面板会关标签，space 唯一面板会关 space。
- core 停止再启动：`keep` 的终端换成 shell，park 掉的变 finished，永不显示。
- 直接改有面板的终端的 `herdr.tab`：不移动，标记只在接管时生效。
- park 后打 `herdr.space` + 新 `herdr.tab`：在原 space 开该 id 的新标签，焦点不动（人在别的 space 也一样），`keep=true`，自有标记和 `herdr.seen` 保留，未读 done（turn 1、seen 0）仍是 done。
- 打回原 `herdr.tab`：回到原标签最右，宽度重新分配；它的临时标签自动关掉；人正看着原标签里的别人时焦点不动。
- 焦点所在的面板被拆走：焦点落到同标签邻居。
- zoom：拆走没被 zoom 的面板，原标签保持 zoom；拆走被 zoom 的，原标签退出 zoom。
- 有面板的子 agent：父级拆走后它留在原标签；park 它（它仍挂在父级下，不从界面消失）再打上父级新标签的 id，进到父级旁边，`parent` 不变。
- core 0.1.20：agent 退回 shell 后 `status` 为 null、不再是 agent，`settled` 标记还在；Settled 收纳区里它直接消失。拆出去的退回 shell 后，它的标签留着，在 Inbox 标签栏里以不含 agent 的标签显示。程序没包 shell 时整个终端结束，面板和标签一起关。
- 孤儿接管到不存在的 space：打上新的 `herdr.space`、`herdr.tab` id，Herdr 按终端的目录新开 space（名字取自文件夹），不抢焦点。
