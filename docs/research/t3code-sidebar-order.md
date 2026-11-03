# T3code 侧边栏排序研究

## 范围与版本

上游仓库：[pingdotgg/t3code](https://github.com/pingdotgg/t3code)。检查时默认分支为 `main`，commit 是 [`701e13cebb040d8433cd9aefb803ddd0d58c41d6`](https://github.com/pingdotgg/t3code/commit/701e13cebb040d8433cd9aefb803ddd0d58c41d6)。下文源码链接都固定到这个 commit。

## 各分区排序

| 分区 / 模式 | 排序规则 | 同序时的 tie-break |
|---|---|---|
| **Pinned** | 有 `pinOrderKey` 的线程按 key 升序；无 key 的排后面，按 `createdAt` 降序。[源码](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L263-L295) · [测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.logic.test.ts#L784-L814) | `id`、再 `environmentId`。源码注释说明环境 ID 用来避免相同 key 的线程按事件到达顺序排列。 |
| **普通 Active** | 按 `activeOrderKey`；无 key 的新建/重开线程排在有 key 的前面，并按 `max(createdAt, unsettledAt)` 降序。[排序时间](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L116-L124) · [排序器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L298-L330) | `id`、再 `environmentId`。拖拽会写入顺序 key。[测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L236-L285) |
| **Active：项目文件夹模式** | 改用 Working 的“最近用户发送”排序。[模式选择](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L695-L701) · [排序器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L57-L76) | `id`、再 `environmentId`。 |
| **Active：Working shelf 开启** | Active/inbox 按 `createdAt`、`unsettledAt`、最近 run 的请求/完成时间、本地观察到的返回时间中的最大值降序排列。[排序器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L33-L55) · [模式选择](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L695-L701) | `id`、再 `environmentId`。 |
| **Working** | `max(createdAt, latestUserAuthoredMessageAt)` 降序；若用户消息时间字段缺失，才回退到 `latestRun.requestedAt`。[排序器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L57-L89) | `id`、再 `environmentId`。测试确认排序看用户发送时间，不看之后更晚的 run 请求时间。[测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.test.ts#L220-L242) |
| **Settled** | 优先有效的 `settledAt`；否则取 `latestUserMessageAt`、最近 run 的请求/开始/完成时间中的最新值；再否则用有效 `updatedAt`。降序。[排序器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L21-L63) | 只按 `id` 升序。测试覆盖了不同 ID 的同时间戳情况。[测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L61-L103) |

分区在排序前决定：有效 snooze、settled override、pin 状态会把线程放进对应 shelf；其余线程按工作状态进入 Working 或 Active。之后再执行上表排序。[分区与排序](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L627-L727)

### Tie-break 缺口

Pinned、Active order key、inbox return、Working 排序都会比较 `environmentId`。Settled 排序没有环境 ID：不同环境中若线程 ID 和时间戳都相同，比较器返回相等，稳定排序会保留输入顺序。通用 `sortThreads` 也只按 ID 打破平局。这是源码可证的边界；现有 Settled 测试只测了不同 ID。[Settled 比较器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L49-L63) · [通用比较器](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L126-L139) · [测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L96-L103)

## 哪些变化会重排

- **查看 / 已读：** 排序字段不含 `lastVisitedAt`。visit tracker 单独记录或发送访问水位，因此仅访问水位变化没有进入这些排序器，不会直接改变分区顺序。[tracker 说明](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadVisits.ts#L48-L60) · [水位更新](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadVisits.ts#L95-L140) · [排序输入](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L5-L13)
- **Tracker 缺项清理：** inbox return tracker 每次 `observe(threads)` 都会立即删除本次列表中不存在的线程的 tracker state 和 `returnedAt`，没有暂存缺项历史的宽限。若某线程临时从观察快照缺席，它的本地返回时间历史会被清掉；传入 `null`（功能关闭）则清空全部记录。这可能让 Active return 排序失去该时间输入。[观察与清理](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L169-L180) · [删除缺席项](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L223-L240)
- **发送 / turn：** Working 和项目文件夹模式的 Active 会受用户发送时间影响。Working shelf 开启时，Active/inbox 会受 run 完成、重开和本地观察到的返回时间影响；测试覆盖了完成时间及服务端没有时间戳的本地返回情形。[Working 测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.test.ts#L220-L242) · [Active return 测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.logic.test.ts#L1004-L1052)
- **状态 / 生命周期：** 工作状态变化会让线程在 Working 与 Active 之间移动；Settled、Pinned、Snoozed 状态变化会改变所在 shelf。即使 shelf 内时间不变，跨 shelf 也会改变可见位置。**2 秒宽限只用于普通 Working 退出**，目的是平滑 run 间隙，不是所有状态变更都延迟：审批、用户输入、guest 消息、可执行 plan、错误/失败等 actionable 状态会立即退出 Working；placement 改变或线程被排除时也绕过宽限。tracker 记录返回时间供 Active return 排序使用。[分类条件](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L17-L31) · [宽限判断与 tracker](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadInbox.ts#L187-L240) · [分区](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L659-L727)
- **手动 pin / Active 排序：** 尽量生成夹在相邻 key 之间的 midpoint；无法生成时会重写受影响可见行的 key。测试覆盖 key 生成、重复 key 平局和 1,200 行 Active 排序。[key 规划](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.ts#L230-L261) · [测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L236-L303)

## 拖拽、动画、滚动与行身份

- **拖拽预览：** drag start 记录一次 `occurredAt`。自定义策略按当前列表 ID 投影目标分区；Working shelf 开启时，预览位置使用这次捕获的时间排序。[drag start](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L1896-L1920) · [投影顺序](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L379-L403) · [策略](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.drag.ts#L93-L169)
- **拖拽期间是否冻结顺序：** 不是完整快照。drag start 会暂停 FLIP 列表动画；若渲染顺序/分区 key 没变，缓存列表保持不变。但 key 一旦变化，缓存列表会更新；被拖行离开可见列表则取消拖拽。因此源码只能证明动画暂停和 key 不变时顺序稳定，不能证明所有流式更新在整个拖拽期间都被冻结。[暂停动画](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L1896-L1902) · [列表缓存与取消条件](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L1965-L1986) · [拖拽使用的 IDs](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L2021-L2042)
- **动画：** 使用 Web Animations 做位置差值动画，时长 **150ms**、`ease-out`；遵循 reduced-motion，并限制每次处理淡入/淡出的行数最多 40。拖拽期间停用；展开 shelf 时也停用，避免行穿过固定标题。[动画参数](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.motion.ts#L1-L4) · [动画更新](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.motion.ts#L120-L149) · [启停条件](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L1987-L2010)
- **滚动：** 普通线程拖拽启用 `DndContext` auto-scroll；context drag 关闭。因此普通拖拽时允许自动滚动，没有全局冻结滚动。[DndContext](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L3284-L3293)
- **React key：** 行的 React `key` 与 sortable ID 都是带环境作用域的 thread key，身份不依赖行索引；搜索结果也使用相同 key。[线程行](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L3310-L3325) · [搜索行](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.tsx#L3222-L3232)

## 相关测试与覆盖范围

上游测试覆盖 Settled 时间/平局、Active order key 与环境 tie-break、Pinned key、Working 发送时间、Active return 时间，以及拖拽几何和分区投影。[排序测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L61-L103) · [Active order 测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/packages/client-runtime/src/state/threadSort.test.ts#L236-L303) · [拖拽测试](https://github.com/pingdotgg/t3code/blob/701e13cebb040d8433cd9aefb803ddd0d58c41d6/apps/web/src/components/Sidebar.drag.test.ts#L513-L544)

检查到的文件里，没有 UI 回归测试验证 `lastVisitedAt` 改变时列表顺序不变，也没有集成测试验证实时拖拽期间流式更新不会改变顺序。源码注释表达了预期行为，但这些边界未由测试覆盖。

## 对“列表抖动”的源码线索

源码能证实的可能因素：turn 发送/完成改变排序时间、生命周期状态让线程跨 shelf 移动，以及 Settled（和通用 `sortThreads`）对跨环境同 ID 行缺少 tie-break。查看/已读水位本身不是排序输入。以上是供本地对照的线索，不是对本地实现的判断。

## Herdr T3 本地对照

检查基线为 `528722b`；已安装的 `t3-focus/main.js` 与仓库一致。本地探针用 Node VM 执行真实 Focus 类的 `track` 和 `render` 排序段，只替换时间、数据源和 UI 宿主；没有复制排序实现，也没有修改运行中的应用。

| 场景 | 探针结果 | 代码位置 |
|---|---|---|
| 同一个 Agent 在 200ms 内经历 working → idle → working | 分区立即变成 Working → Active → Working，没有退出宽限。与 T3 的 2 秒缓冲形成直接差异。 | [工作分区判断](../../mods/t3-inbox/main.js)，`working`、`out`、`work` |
| 查看已完成 Agent，done → idle，其他输入不变 | 相对顺序保持不变。现有归一化有效，不能把所有查看动作都归为抖动来源。 | 同文件，`track` |
| A 完成后位于 C 前；A 暂时缺席，同时 B 状态变化；A 再出现 | A 的已观察完成时间从 2000 丢成 0，回退到旧 `status_ms=100`，顺序由 A,C 变成 C,A。缺席项清理必须在有状态变化的那一帧才会触发。 | 同文件，`track` 的缺项删除与 `since` 回退 |
| 两个 Settled Agent 的 Settle 时间相同，仅反转底层窗格顺序 | 顺序由 A,B 变成 B,A。Settled 比较器没有固定的次级排序键；批量 Settle 可能产生同毫秒时间。 | 同文件，`put.sort`；[基线排序代码](https://github.com/JinJieBeWater/herdr-t3/blob/528722b/mods/t3-focus/main.js#L173-L177) |

本地 Active 与 Working 共用“最近观察到的状态变化时间”；T3 的 Working 按用户发送时间、Active return 模式按返回时间排序。两者的时间语义不同。本地行/lane 已使用 address 作为身份，不能归因于使用数组下标作为 key；现有 150ms 过渡主要用于拖拽间隙和标题高度，没有普通列表换位动画。

建议下一次修复先限于普通 Working 退出宽限（blocked 必须立即出现）和确定的同时间戳排序，再检查本地排序时间在暂时缺项后的保留方式。时间语义应分别记录本轮开始和返回待处理，避免无关状态变化重写排序依据。缺项清理在 T3 tracker 中也存在，不能说上游已解决这个边界。动画可以随后评估，先确定应该移动的事件。

这些结果证明了输入序列下的代码行为，尚未采集用户现场的状态序列，因此不能认定哪一项就是此次抖动的根因。未修改布局或 mod，未运行 GUI 验收和上游测试；已阅读相关测试，并执行上述本地探针。
