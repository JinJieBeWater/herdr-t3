# T3 Code Snooze：事实清单

## 结论

- Snooze 是线程级、服务端持久状态；计时到期和提前唤醒由客户端列表计算，排队后台工作可继续，线程仍隐藏到到期或出现需要用户处理的信号。
- Web 客户端允许 Snooze 正在工作的线程；pending 请求、等待中的 guest 消息及普通排队 run 会阻止 Snooze。服务端另行校验有效未来时间、pending runtime request 和 queued run。
- 到期或提前唤醒后，线程进入正常分类；`snoozedUntil`/`snoozedAt` 和 `lastVisitedAt` 决定侧栏行是否显示 Woke。
- 上游 `main` 实际读取提交：[`337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`](https://github.com/pingdotgg/t3code/commit/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17)，2026-11-05。下文源码链接均固定此 commit。Web 桌面侧栏为准。

## 1. canSnooze 与状态范围

客户端 `canSnooze` 排除 pending approval、user input、runtime request、subagent request、guest 消息，以及 `hasQueuedTurnStart` 认定的 queued turn；没有排除 Working、失败、已 Settled 或已 Pinned。子 agent/子线程没有独立禁用规则；若它在父线程投影中形成 pending subagent request，则会阻止并触发提前唤醒。UI context menu 另外要求线程支持 snooze 的环境配置。[客户端 gate](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L111-L128) · [右键菜单 gate](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L2580-L2638)

服务端 `thread.snooze` 拒绝无效/非未来时间、任何 pending runtime request，以及非自动来源的 queued run；带 notification 或 delegated completion 的自动 queued run 例外。此校验没有检查 Working、error/failed、Settled、Pinned，也没有单独检查 subagent 请求或 guest 消息。服务端/客户端的 guest 与子线程请求差异如上。[服务端校验](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3513-L3559)

## 2. Pin 与 Snooze

Snooze 已 pinned 线程时不清除 `pinnedAt`；有效 snooze 的列表分类先于 pin，因此线程从 Pinned 区移到 Snoozed shelf，pin 状态仍存着。Pin 一个 snoozed 线程会清除 `snoozedUntil`/`snoozedAt`，更新 `lastSnoozeWakeAt`，并回到 Pinned 区。[Pin/Snooze 字段更新](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3623-L3669) · [侧栏分类优先级](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L632-L687)

## 3. 提前唤醒与失败

`threadRaisedHandWhileSnoozed` 的完整条件：pending approval、pending user input、pending runtime request、pending subagent request、`pendingGuestMessageCount > 0`，或失败时间晚于 `snoozedAt`。V2 优先用 failed latest run 的 `completedAt`；否则运行时为 error/failed 时用 `runtime.updatedAt`（legacy session 用 session 时间）。[举手与失败时间](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L86-L109)

请求被回答后，runtime request 不再 pending，举手条件消失；如果原定时间尚未来到且没有其他条件，线程重新落入 Snoozed。该请求本身不会清除服务端 snooze 字段；源码未规定“回答请求”会永久结束 snooze。[有效 snooze 计算](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L137-L146) · [请求状态字段投影](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/ProjectionStore.ts#L1595-L1625)

失败必须是 snooze 之后的新失败；旧失败（failure edge 时间不晚于 `snoozedAt`）不举手。子线程自身失败是否被并入父线程 failure edge，源码未规定；父线程投影中的 pending subagent request 会举手。[失败边界](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L95-L109)

## 4. 新用户消息、自动 run、到期时 Working

服务端收到非 automatic wake 的消息时清除 snooze；automatic wake（后台通知/委派完成）保留 snooze。客户端普通 run 完成不会举手。到期由客户端把线程从 Snoozed 重新分类，即使线程仍在 Working；显示归 Working shelf。[消息清除条件](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L5540-L5568) · [普通完成不唤醒的规则](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L81-L84) · [列表分类](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L632-L704)

## 5. Woke 标记

`threadWokeAt` 在计划到期时返回原 `snoozedUntil`；提前举手时返回新失败时间（若有），否则 runtime `updatedAt` 或 `snoozedAt`。打开/访问线程会推进 `lastVisitedAt`，从而清除提示；行组件提供显式 acknowledge 回调。字段由服务端保存在 `lastSnoozeWakeAt`，计划到期通过 `mark-unread`、手动 unsnooze 和 pin 等路径归档/清理。[wake 时刻和未读判定](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L148-L180) · [服务端唤醒时间存储](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3633-L3667) · [行组件 Woke 回调](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L3355-L3422)

侧栏行和聊天视图判定不同。侧栏行的 `isWoke` 只比较 wake 时间和 `lastVisitedAt`（及未 Settled），不看 run 完成时间，所以后台新一轮结束后行上的 Woke 仍在。状态优先级是 Working、Waiting、Approval、Input、Request、Limited、Failed、Woke、Done，Woke 排在 Done 之前；角上的 Woke 按钮按 `isWoke` 显示，Working 时也在，并且 hover 时不淡出。`isThreadWokeUnseen`（把晚于 wake 的 run 完成算作看过）只用于聊天视图和 Mobile 详情页。[行的 isWoke 与状态优先级](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L713-L785) · [角上的 Woke 按钮](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L1278-L1302) · [聊天视图的判定](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/chat/useThreadLifecycle.tsx#L218-L223)

## 6. 醒来后排序

Active 默认按 `activeOrderKey` 排序；配置分组/排序时按相应的 send/activity 规则，启用 Inbox return 观察时按 return 排序。Snooze 期间 run 结束可能更新活动排序字段，因此醒来时使用当前排序规则与当前字段值；源码未规定一个统一“醒来置顶”规则。[Active 排序选择](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L675-L705) · [active order sort helper](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.logic.ts#L985-L1000)

## 7. Preset

默认 preset 来自 `DEFAULT_SNOOZE_PRESETS`；设置可按 environment 覆盖，菜单打开时读取。条目为相对时长或本地时间，解析标签包括 `In …`、`This morning/afternoon/evening`、`Tomorrow`、星期名、`Next week`/`Next <weekday>`；when 标签为时刻，跨日时加本地星期缩写。时刻格式走用户 `timestampFormat`（locale/12-hour/24-hour），标签/星期名使用英文常量及运行时 locale 日期格式。[默认列表](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/contracts/src/settings.ts#L119-L140) · [标签和时刻格式](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L202-L283) · [环境设置与 timestamp 格式](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.snooze.ts#L18-L60)

规则：按 wake 时间升序；同一分钟去重，稳定排序保留 settings 中先出现者；今日已过时刻过滤；相对时长在点击时从点击时间重算；日历时刻沿用菜单显示的 wake，若点击时已过去则不执行并提示“该 snooze 时间已过”。服务端对任何已过时间拒绝命令。[过滤/去重/选择时重算](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L285-L335) · [过期提示](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.snooze.ts#L34-L48) · [服务端未来时间校验](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3513-L3528)

## 8. 入口与键盘

桌面入口包括线程行 hover 的 Snooze 时钟动作、线程 context menu 的 preset/Custom，以及多选 context menu 的 `Snooze (N)` 和 Custom。没有 Snooze 专用快捷键的源码定义；通用键盘导航/菜单焦点由菜单 API 管理，Snooze 菜单打开时焦点细节未规定。[行操作](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L3320-L3425) · [单线程菜单](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L2578-L2655) · [多选菜单](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L2260-L2335)

## 9. Undo

Snooze 成功后显示 `Snoozed` 撤销通知（与 Settled、Unpinned、Archived 共用），5 秒后消失；撤销就是一步 unsnooze，失败提示 "Failed to wake thread"。`Sidebar.tsx` 里的 `attemptSnooze` 只处理失败 toast，通知由它调用的 `useThreadActions` 发出。[Snoozed 通知](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/hooks/useThreadActions.ts#L891-L896) · [5 秒到期](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/hooks/showThreadUndoNotice.ts#L141-L149)

Settle 的撤销计划会还原 Settle 清掉的状态：先 unsettle，原来置顶就重新 pin，原来 snooze 且未到期就重新 snooze（已到期的跳过）。Settle 同时使该线程更早的 pin/snooze 撤销失效。[撤销计划](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadUndo.ts#L46-L66) · [Settle 流程](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/hooks/useThreadActions.ts#L758-L784)

## 10. 正在查看的线程被 Snooze

成功 Snooze 当前查看线程后，客户端计划导航到下一个可用线程；候选会跳过 Settled、Snoozed 和同批正在 Snooze 的线程。失败时不导航。Shelf 折叠时若当前 route 指向该 Snoozed 线程，仍单独保留其行（高亮并有唤醒入口）；查看本身不会清除 snooze。[前进导航和候选过滤](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L1540-L1605) · [Snooze 后导航](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L2200-L2232) · [折叠 shelf 的路由行](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L510-L520)

## 11. 睡眠、时钟变化、多客户端

Web 为最近的 wake deadline 注册一次性时钟；机器睡眠错过多个期限后一次推进到已过的最新期限。时钟取 `Date.now()`，源码未规定系统时钟被人为前拨/回拨时的校正策略。状态及 snooze 字段由服务端事件/projection 同步给客户端；不同客户端各自按本机时钟计算到期分类。[deadline clock](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.logic.ts#L126-L153) · [服务端 shell 投影字段](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/ProjectionStore.ts#L1595-L1625) · [事件/命令合同](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/contracts/src/orchestrationV2.ts#L1870-L1890)

## 12. 通知、徽标、未读、线程计数

Snooze 不删除线程，也不阻止后台通知/委派 run；通知可继续触发后台工作且保持隐藏。源码未发现 Snooze 会关闭系统通知或改变全局通知偏好。Snoozed shelf 标题显示数量，侧栏总线程数计入 snoozed；有效 snooze 从 Active/Pinned 分类中移出。Woke 未读提示遵循 wake 时间与访问/完成时间比较。其他徽标、通知计数、未读计数是否排除 snoozed，源码未规定为一条统一规则。[自动消息保留 snooze](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L5540-L5568) · [Shelf 数与侧栏总数](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/Sidebar.tsx#L3520-L3540) · [Woke 未读条件](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/packages/client-runtime/src/state/threadSettled.ts#L372-L389)

## 13. Settle、Archive 与 auto-settle

Settle 清除 snooze 字段和 pin；Snooze 命令本身不清除 settled 状态，但有效 Snooze 分类会显示在 Snoozed shelf。Pin 会唤醒 snooze。Archive 字段独立；默认线程列表过滤 archived，服务端 archive 更新没有清除 snooze 字段。源码未规定 Archive 与 Snooze 互斥。Auto-settle 是否会结算 snoozed 线程，取决于普通 auto-settle 条件；源码未发现 snooze 是豁免条件。因而不能说 Snoozed 自动屏蔽 auto-settle。[Settle 与 Pin 更新](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3580-L3670) · [Archive 更新](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L3565-L3580) · [Auto-settle 判定](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/server/src/orchestration-v2/Orchestrator.ts#L8980-L9045)

## 相对 cefb544 的行为变化

- 桌面行现有 hover Snooze 动作；旧文档只记了 context menu。当前 context menu 与多选菜单均有 Custom。
- Snooze 成功有 `Snoozed` 撤销通知，失败显示错误 toast；旧文档未记录成功反馈。
- Snooze 当前查看线程会前进导航；折叠 shelf 保留 route 当前线程。旧文档只描述折叠状态，没有这两个细节。
- 当前模型使用 `lastSnoozeWakeAt`/`threadWokeAt` 与访问时间共同管理 Woke；旧文档把到期醒来描述为回到普通排序，没有覆盖 Woke 生命周期。
- 当前服务端对新消息清 Snooze 的区分明确基于 automatic wake 消息类型，并允许 notification/delegated completion queued run；旧文档的结论较粗略。

## Herdr 方案审查

方向成立：按 terminal label 存唤醒时间、到期由客户端判定，和 T3 的客户端判定一致。审查发现的 7 个问题都已修在 Snooze 提交里。

验证方式：`check-inbox` 的回归测试（每项都做过变异检查）。键盘一项另外在真实的 gpui-shell（`ScriptView` + `simulate_keystrokes`）上跑过，用的是结构相同的脚本，不是 mod 本身；真实 Herdr 窗口没有跑过，因为隔离 VM 里的 `Herdr.app` 是空壳（`Contents/MacOS` 为空）。

### 已修

| # | 问题 | 修法 |
|---|---|---|
| 1 | 菜单的 ↑/↓/Enter 不工作：焦点在 Popover 外层，panel 的 `on_key_down` 收不到；Popover 又把 Enter、Space 绑定成开关，只会关菜单。原测试直接调 handler，所以是假绿 | `track_focus` 交给 panel；打开时在 panel 自己的 key context 里 `bind_keys`（内置 win98 菜单的做法，也能扛住 keys.json 重载） |
| 2 | 选中已过去的时间会立刻 Woke；相对时长最多早醒一分钟 | 同 T3：时长从点击算起，已过的时刻拒绝并警告 |
| 3 | 指针在时钟上按 Enter 后 `hot` 卡住，这一行点不开，详情卡也不再出现 | `snooze()` 清掉 `hot` |
| 4 | agent 被 snooze 而子 agent 卡住时，侧栏开关的计数漏掉 Needs you | `awake` 改用含子树的状态，与 Inbox 的判定一致 |
| 5 | `hc label` 持续失败时，每次 render 都重写并弹错误（自动 Un-settle 同样） | render 发起的写入失败后等一分钟；人的操作不受限 |
| 6 | Settle 的 Undo 丢掉 snooze | 还原未到期的 snooze，已到期的跳过，同 T3 |
| 7 | 到期时还在工作，Woke 要等它结束才出现 | 与 Working 并排；hover 时只留 Woke，同 T3 |

按键探针的结果（`down down up enter x` 这类序列）：

| 写法 | 结果 |
|---|---|
| 修之前 | 收不到任何按键，Enter 关闭菜单 |
| 只加 `track_focus` | ↑/↓ 正常，Enter、Space 仍只关闭菜单 |
| 现在的写法 | ↑/↓ 正常，Enter、Space 选中，Esc 关闭，关闭后焦点回到原处；多个 Popover 共用一个句柄也正常 |

### 有意保留的差异

| 差异 | T3 | Herdr | 原因 |
|---|---|---|---|
| 失败的线程 | 可以 snooze，只有之后的新失败才唤醒 | 算需要你，不能 snooze；又因 busy 不能 Settle，只能处理它 | 失败要人看 |
| Settled 行 | 可以 snooze（服务端视为提升） | 行上没有时钟 | 没有需求 |
| 到期时正在等人 | Needs you 和 Woke 同时显示 | 只显示 Needs you，答复后才出现 Woke | Needs you 已经足够醒目 |
| 提前举手 | 也标 Woke | 不标 | 同上 |
| 时间格式 | 跟随 `timestampFormat` | 固定 12 小时制 | 想要 24 小时制时再做 |
| 入口 | 还有右键菜单、多选、可配 preset | hover 时钟和 Custom… | 已知跳过 |
| Custom 对话框 | 日期在弹出的日历里选，时间用原生控件，时长带步进按钮，单位是下拉框，有 Edit snooze options | 自绘日历，时间是 `HH:MM` 文本框，时长是文本框，单位是分段按钮，没有 Edit snooze options（预设不可配） | kit 没有这些控件 |
| 菜单字距 | `when` 用 tracking-widest | 无字距 | kit 没有 letter-spacing |

### 数据决定的局限

- **新用户消息的判定**：T3 按消息类型区分，Herdr 看不到类型，只能用“在视野内开始新一轮”近似。所以在视野内的 agent 自己续跑也会结束 snooze，后台 `hc send` 不会。
- **失败判定**：T3 有持久的失败时间，Herdr 靠 render 时观察状态。窗口全关期间发生、又很快消失的失败会漏掉。
- **寿命**：label 随终端结束；T3 随线程持久。

### 核对后确认一致

置顶线程 snooze 后保留 pin、进 shelf；给 snoozed 线程置顶会唤醒；请求被回答后回到 shelf（T3 的 snooze 字段同样不清除）；Woke 优先于 Done，后台新一轮结束后仍在；snooze 期间结束的 run 醒来时上浮（T3 的 `returns`）；查看未到期的线程不清除 snooze；Snooze 当前线程后前进；折叠 shelf 保留当前行；5 秒 `Snoozed` 撤销；默认 preset 的 5 项和同分钟去重；shelf 按唤醒时间升序；拖入被禁止。
