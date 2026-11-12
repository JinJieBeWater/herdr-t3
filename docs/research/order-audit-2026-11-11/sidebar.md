# 侧栏“打开后出现的先后”审计（侧栏列表与分组）

只读审计：没有改代码或文档，工作区里 `extras/` 等未提交改动未触碰。

- 依据：`docs/adr/0001-trade-off-order.md`（行为选省注意力的，“T3 这样做”不是理由；外观照 T3）。
- 本地代码：本仓库当前工作区（未提交改动集中在 `extras/mods/review`、`shared/review-git.js`，与本次范围无关）。
- T3 对照：`/Users/jinjiebewater/my/personal/fork/t3code`，`HEAD 97db94c9bf`。下文的 T3 行号都指这个 fork。
  **注意**：这个版本比 `docs/research/t3code-sidebar-order.md` 记录的 `701e13c` 新，Active 的排序和 Working 收纳区都变了：当前 fork 没有 Working 收纳区，Active 改按创建时间静态排（`apps/web/src/components/Sidebar.logic.ts:536-553`，注释原文“Activity NEVER reorders the list”）。
- 未开 demo 窗口：`scripts/demo/stage.sh up` 要拉 GitHub，且工作区有他人未提交改动；结论全部来自代码，标了“待确认”的地方需要在多机器 / 有子 agent 的窗口里复现。

## 1. Inbox（mods/t3-inbox）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 1 | `mods/t3-inbox/main.js:272-273`、`mods/t3-inbox/list-view.js:112-190`、`row-model.js:124-127` | 顶部卡片（Pinned → Active）→ 底部收纳区 Working → Snoozed → Settled；“Show more” 在 Settled 行之后 | Pinned → Active → Snoozed → Settled（`apps/web/src/components/Sidebar.tsx:2004`、`:3657` 明确写 Snoozed 在 inbox 与 Settled 之间） | 保持 |
| 2 | `row-model.js:118`、`:10`（`byRecent`） | Active 卡片按“最近一次状态变化”倒序，同刻按 address | 当前 fork：按 `createdAt` 倒序，活动不改序（`Sidebar.logic.ts:538-553`）；旧版按“回到待处理的返回时间”倒序（研究文档） | 保持：本地排序键实际是“进入卡片区的先后”，与 T3 旧版的“进入 Active 的先后”同向；另一处含义见 #7 |
| 3 | `row-model.js:119` | Working 组内按 run 起手时间倒序（`begun`） | 当前 fork 无 Working 收纳区；旧版按用户最后发言时间倒序 | 保持 |
| 4 | `row-model.js:121` | Snoozed 组内最早醒来在前，同刻按 address | 同向（`Sidebar.tsx:1979-1984`，注释“Soonest wake first”） | 保持 |
| 5 | `row-model.js:122`、`:126-127`；`list-view.js:149-161` | Settled 组内按 Settle 时间倒序；一页 10 行、再 25；折叠或翻过页时仍显示当前查看的那一行 | 同向且同常量（`Sidebar.logic.ts:604-620`、`Sidebar.tsx:181-182`、`:2086-2094`） | 保持 |
| 6 | `mods/t3-inbox/main.js:48-50` | Working / Snoozed / Settled 三个默认都折叠 | Settled 默认展开（`Sidebar.tsx:2077-2080`），Snoozed 默认折叠（`:2099-2102`） | 待确认：本地两组都锚在底部，默认全关可能是有意；若认可 T3 的取舍，Settled 应默认展开（历史一眼可见，不再多点一下） |
| 7 | `row-model.js:118` | 卡片区只按时间排，不分“是否需要你”：一个刚变安静的 idle 可以压在有未读 done 点的那张之上 | 无对应（T3 的行不按状态排） | 待确认：ADR 0001 的口径下 done（有答复待读）应领先 idle（无需动作），代价是同一张卡在 blocked↔idle 之间多一次组内跳位 |
| 8 | `mods/t3-inbox/pins.js:11-14` | 新 pin 追加到 Pinned 末尾 | 新 pin 落到 Pinned 顶部：“Key that sorts before every arranged pinned thread, so a fresh pin lands at the top of the run”（`apps/web/src/hooks/useThreadActions.ts:104-112`） | 建议改：`setPinned([address, ...pins])`。省注意力：刚 pin 的那一行就在眼皮下，不用在 Pinned 块里往下找；现有 pin 的相对顺序不动 |
| 9 | `mods/t3-inbox/filter.js:15` | “All spaces” 首位，其后按 `spaces()` 模型序（Home 除外），搜索按名字子串过滤；高亮固定从 All spaces 起 | “All projects” 首位，其后按项目序（默认按活动、可 manual；`Sidebar.tsx:3332-3360`、`Sidebar.logic.ts:839-856`） | 保持：与 Spaces 列表用同一张心理地图；多机器时的顺序差异见 #21 |
| 10 | `mods/t3-inbox/main.js:278-291` | 画出的卡片顺序同时是 `cmd-]` / `cmd-[` 的巡行顺序（`setAgentOrder`） | — | 事实记录：任何“卡片顺序要不要动”的决定都同时改键盘巡行，这是重排的隐性成本 |

## 2. Agents（mods/t3-agents）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 11 | `mods/t3-agents/main.js:204-213`、`mods/t3-agents/rows.js:20-21`、`:327-330` | Pinned → Needs you(4) → Done(3) → Working(2) → Idle(1)；按 space 分组时 Pinned → 各 space 组（组序 = `agents()` 序） | Pinned → Active → Snoozed → Settled；没有 priority 分区（项目分组见 `Sidebar.logic.ts:881-919`） | 保持：Done 在 Working 之上符合 ADR 0001（未读答复要动作，working 不要） |
| 12 | `main.js:204` | 分区内：rank 倒序 → 最近变化倒序 → 创建序（`seq`）倒序 | 无分区；项目内 thread 按 `createdAt` 倒序、静态（`Sidebar.logic.ts:538-553`） | 保持 |
| 13 | `main.js:210-215` | space 组内保持 `agents()` 原序，不按紧急度重排 | 项目内 thread 静态排，同向 | 保持 |
| 14 | `rows.js:116-127` | 子 agent 紧跟父级、深度优先、带树线；父级折叠时只留 blocked 的子 agent | 无子 agent | 保持：树是位置的全部意义；同层兄弟按 `terminals()` 序（`shared/tree.js` 的 `agentKids`） |
| 15 | `rows.js:327-330`、`main.js:184-194` | 折叠的组仍显示“当前查看的那一行”，计数不算它 | 同向（route row，`Sidebar.tsx:2086-2094`） | 保持 |
| 16 | `rows.js:328` | Idle 分区默认折叠，其余默认展开 | 无对应 | 保持（默认折叠的组仍在键盘巡行里，`t3-agents` 已处理） |
| 17 | `main.js:16-20` | 默认排序 = Priority（`SORTS[0]`，键未设时） | 无此模式；但 `agents.sort` 是与 Herdr 自带 agents 列表共用的键（`docs/internals/storage.md:32`），自带列表的默认也是 Priority | 待确认：README:19 与 ADR 0002 说“Lists 按项目组织”，默认却是 Priority；改成 Grouped by space 会让两个列表在键未设时表现不一致，需要 owner 决定 |

## 3. Spaces 与 Pinned（mods/t3-spaces、pin 共用）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 18 | `mods/t3-spaces/main.js:235`、`:244-245` | This computer 在最前，其余机器按名字 `.sort()` 升序；空机器给一行 “New space here”，加载中给 “Loading…” | 无机器概念 | 保持（本机优先、字母序可预期）；备注：`.sort()` 按码点，大写名排在小写前 |
| 19 | `main.js:151-197` | 机器内按 Herdr 模型序；worktree 挂在主 checkout 下；checkout 本身不是 space 时插一行不可打开的 repo 行，占它第一个 worktree 的位置 | worktree 是项目里的 thread，项目默认按活动排、可 manual（`Sidebar.logic.ts:839-856`） | 保持：拖拽和 `space.next/prev` 都以模型序为准，同一张地图 |
| 20 | `main.js:161-167` | 刚从一个 dim 行打开的 checkout，落到那行的位置，不跳到列表末尾 | 无对应 | 保持（整组不跳位） |
| 21 | `main.js:195-217` + `:230-246` | 显示序按机器分块；模型序只按 repo 嵌套排（`ordered()` 不按机器分块），而 `space.next/prev`、`ctrl-N` 走模型序 | 无对应 | 待确认：多机器时“眼睛看到的顺序”与键盘巡行、`space.move` 的索引可能不是同一个（单机复现不了；`dest()`/`slot()` 已按机器挡住跨机器拖放，说明作者意识到模型与分组的分歧） |
| 22 | `mods/t3-spaces/main.js:151-197`、`pins.js:11` | Pinned 一份 `pinList` 给 Inbox、Agents、标签栏；两处都按 `pinList` 序显示 | Pinned 块无表头，Inbox/Active 也共用一份 | 保持（与 #8 是同一处改动） |

## 最值得改的（按价值）

1. **新 pin 落到 Pinned 顶部**（#8，`pins.js:11` 一行）：T3 明确同向，刚 pin 的东西立刻在眼前，现有顺序不动。
2. **卡片区分“有答复待读”与“无需动作”**（#7）：现在两者只按时间混排，是本次范围里最直接的注意力泄漏；先确认再动，做法是 done 在前、组内仍按时间。
3. **Agents 默认排序 Priority vs 按项目**（#17）：文档说 Lists 按项目，代码默认 Priority；牵涉与 Herdr 自带列表共用的 `agents.sort`，要 owner 拍。
4. **Settled 是否默认展开**（#6）：T3 展开、本地折叠，只差一个默认值，影响“历史是否一眼可见”。
5. **多机器时显示序 vs 模型序**（#21）：影响 `space.next/prev` 与筛选行，但需要两台机器才能复现，先验证再定。

## 未决 / 待确认汇总

- #6、#7、#16、#17、#21 需要决定或复现；其余为“保持”。
- 没有验证 GUI 表现，也没有跑 `scripts/check.sh`（本次不改任何代码）；上面每条顺序都已在代码里读到对应实现。
