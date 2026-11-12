# 出现顺序审计：标签栏、窗格头、space 面板、Files

日期：2026-11-11。范围：新东西出现在哪里、容器里的条目先后。只读审计：没改代码或已有文档，只写了本文件。
判断依据：[ADR 0001](../../adr/0001-trade-off-order.md)——行为选省注意力的，“T3 这样做”不算理由，外观照 T3。
T3 Code 基线：`/Users/jinjiebewater/my/personal/fork/t3code` @ `97db94c9bf`。
未开 demo 窗口（`stage.sh up` 要经 `repos.sh` 走 GitHub，并会在桌面开一个窗口），所以结论都来自代码与 T3 源码；只有 #9 需要截图才能定论。
侧栏（Inbox 分区、Agents、Spaces 行）的排序见同目录 `sidebar.md` 与 [t3code-sidebar-order.md](../t3code-sidebar-order.md)，本文不重述。

## 标签栏（`mods/t3-tabs`）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 1 | `navigation.js:402-411` | Lists：`space.tabs` 原序（含拖拽改过的）。Inbox：当前工作 tab → 家族 tab → 无权属的 space 程序 tab | 无对应（T3 的 tab 只有右侧面板的 surface） | 保持 |
| 2 | `main.js:363-375` | Inbox 下把当前 tab 里非 agent 的 pane（程序、mod）作为虚线组**放在最前**，其后家族 tab、再程序 tab，两组间各一条分隔线 | 无对应 | 保持：虚线紧贴面包屑，读作“当前 tab 还装着这些”，正好是同一 tab 的延续；家族其次，无关程序最后。数量少（通常 0–2 项），前置不花额外路程 |
| 3 | `main.js:363-375` | 虚线组左侧先于家族 tab，但数字键不数它：`cmd-2` 落到第一个家族 tab | 无对应 | 保持：虚线组是 tab 1 的分段（虚线就是这个意思），编号与画面一致 |
| 4 | Herdr `tab.new`（`main.js:452` 的 `tab.move` 用 `space.tabs` 顺序换算目标位） | 新标签追加在末尾并立即显示；Inbox 下（无 agent）落在程序组末端 | 右面板新 surface 追加末端并激活（`apps/web/src/rightPanelStore.ts:215-223`） | 保持 |
| 5 | `main.js:328-337` | 行尾：`+`（仅 Lists）→ 面板开关 → 窗口按钮 | 右面板行尾：tabs → `+` → layoutControls（`components/RightPanelTabs.tsx:611-730`、`ChatView.tsx:6009-6025`） | 保持 |
| 6 | `main.js:154`、`main.js:168`；`navigation.js:191-199`；`shared/layout-settings.js:8` | Settle / Snooze 掉正在看的 agent 后：默认落 Home；设置 `afterAway: "next"` 时落到下一张卡片（跳过本批被收起的，绕回开头），没有卡片才回 Home。后台被收起的 agent 不动焦点 | 收起的 thread：下一张卡片，最后一张时在该项目开新 draft（`components/Sidebar.tsx:2342-2370`） | 保持：默认收手（ADR 0004），T3 的“下一张”仍作为设置保留；差异与理由都已写在 ADR 里 |
| 7 | `navigation.js:202-219` | 关掉标签后：回本 space 最近显示过的 tab（`trail`），没有记忆才用 Herdr 的选择 | 关掉面板页：右邻，否则最后一个（`rightPanelStore.ts:507-523`） | 保持：回到“刚才在哪”比按位置猜右邻省注意力 |
| 8 | `navigation.js:176-189` | Inbox 下 `cmd-t` / 点面包屑的 space：先复用最近显示过的空 shell tab（按 `trail` 顺序），都没有才新建 | 无对应 | 保持 |
| 9 | `main.js:236-260` | Inbox 标签条按**右端**对齐（贴 Actions）：装不下时先切掉左端（虚线组、最早的家族 tab），程序 tab 留着。若在看的正是其中一项，会滚回到它 | 无对应（T3 的 tab 条左边起） | **待确认 / 建议改**：需 demo 确认默认侧栏宽度下是否真溢出。溢出时保住左端（当前工作 + 家族）比保住程序 tab 省注意力；改法是“装得下才右对齐，装不下从左起”（`fromEnd` 只在 `over === 0` 时生效） |

## 窗格标题栏（`mods/t3-pane`）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 10 | `main.js:293-297` | 悬停出现的按钮：Split right → Split down → Zoom → Close | 终端面板工具条：Split horizontal → Split vertical → New terminal → Close（`components/ThreadTerminalDrawer.tsx:1319-1357`） | 保持：横向分屏在前（与 T3 默认方向一致），破坏性的 Close 最后 |
| 11 | `main.js:294-295`；`navigation.js:165` | 分屏方向：新 pane 在右 / 在下；Home 重建固定用 `right` | `splitTerminal` 默认 `horizontal`，新终端追加末端（`rightPanelStore.ts:426-445`） | 保持 |
| 12 | `main.js:288-306` | 从左到右：程序图标、名字、文件夹、〔悬停按钮，绝对定位盖住文件夹右端〕、子 agent 计数、状态标记（working / 需要你 / Snoozed 或 Settled / Done） | 头部是面包屑 + 右侧动作，无状态标记（`components/chat/ChatHeader.tsx:216-380`） | 保持：标记留在最右，与标签栏的标记、× 同列；悬停按钮不占位 |
| 13 | `main.js:29-39`（`kidRows`） | 子 agent 列表：spawn 顺序、深度优先，子项按层缩进挂在其父之后 | Agents 面板：spawn 顺序稳定、活动原位更新，但按 run/批次分组、不按父子缩进（`components/AgentsPanel.tsx:1-13`） | 保持（父/子是 Herdr 的模型）；批次分组的差异记「待确认」，改动会同时动 Agents 列表，成本高 |

## space 面板（`shared/panel.js`、`mods/t3-chrome`、`layouts/herdr-t3.json`）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 14 | `layouts/herdr-t3.json`（`panel-body`）；`scripts/update.sh:48`、`scripts/demo/stage.sh:108` | 页顺序：Files → Review（装 Review 扩展时追加在末尾）；面板头按这个顺序画（`mods/t3-chrome/main.js:168`） | 新 surface 追加末端；启动器固定顺序 Browser / Terminal / **Files** / Diff / Pull request / Agents（`RightPanelTabs.tsx:676-724`） | 保持：两边都是 Files 在 Diff（≈Review）之前，且都是“新的加在最后” |
| 15 | `shared/panel.js:32-37`；`shared/panel.js:62-73` | 从没开过面板的 space：面板关着；`cmd-alt-b` 或 Review 栏的开关打开时落在 **stack 当前页**（即窗口上一次显示的那页），不是固定 Files | thread 没有 surface 时打开是空态启动器（`rightPanelStore.ts:123-127`、`612-617`） | 保持：重开最近看的那页比每次跳 Files 少一下。若觉得“新 space 一开就是 Review”意外，最小改法是把 fallback 从 `s.page` 改成 `"files"` |
| 16 | `mods/t3-chrome/main.js:167-171` | 面板头：页 tab → 弹性空隙 → 放大 → 关闭 | tabs → `+` → 最大化 / 面板开关（`ChatView.tsx:6009-6025`） | 保持：破坏性的关闭在最右 |
| 17 | `mods/t3-tabs/main.js:331-334`（`reviewToggle`）；`shared/panel.js:32-37` | 面板开关的入口：装了 Review 栏自己的开关时，标签栏不再画第二个，两处调的都是 `togglePanel()`、落在同一页 | 只有一个面板开关（`PanelLayoutControls`） | 保持：两个一模一样的按钮不并列 |

## Files（`mods/t3-files`）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 18 | `model.js:34-40`（`sortEntries`） | 目录在前，然后名字自然序（数字按值、忽略大小写）；`.git` 不列；被 ignore 的照列、变暗 | T3 用 `@pierre/trees`（`components/files/FileBrowserPanel.tsx:1-6`），排序在库内，本地没找到“目录优先”的约定 | 待确认（保持现状：目录优先是文件树通行做法，库行为未核对） |
| 19 | `model.js:85-99`（`treeRows`） | 已删除的文件放在该目录条目之后（不插回名字位置） | 无对应 | 保持：变更聚成一个尾巴，比按名字混在中间容易发现；Review 才是看变更的地方 |
| 20 | `model.js:128-146`（`rank`）、`main.js:17` | 搜索结果：uFuzzy 排名在前（带高亮），没排上名的按路径原序补在末尾；最多 200，超出时尾行写 “N of M matches · type more to narrow” | 服务端排名，客户端只保序、上限同为 200（`components/files/ProjectFilePicker.logic.ts:14,44-79`） | 保持 |
| 21 | `main.js:385-410`、`main.js:420-437` | 页内：文件内容在左，树在右，搜索框在树上方；文件头：面包屑 → Preview/Code → `Review ↗` | Files surface 只有一个树 + 上方搜索框，预览是另一个 surface（`components/files/FileBrowserPanel.tsx:353-380`） | 保持 |

## 新出现的东西

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 22 | `navigation.js:236`（`track`；`fresh` 在 179、458）、`mods/t3-inbox/actions.js:33-42` | 新 agent 出现不抢焦点：卡片由 Inbox 归位（排序见 `sidebar.md`），标签栏跟着“人在看的 agent”走 | 无直接对应（T3 的 thread 由人发创建并导航过去；agent 由程序在终端里起，布局不干预） | 保持 |
| 23 | `mods/t3-spaces/main.js:151-197`；`main.js:285,300,357,570` | 新 space 追加在模型序末尾（工作树 space 会被挪到主 checkout 之下），并立刻成为当前 space、显示它的 shell | 新 thread 出现在 Active 顶部（按创建时间倒序） | 保持：Spaces 是人工拖出来的顺序，末尾追加不动人的排列；新 space 一造出来就是当前 space，位置不影响“看到它” |

## 最值得改的（按价值）

1. **Inbox 标签条溢出时保住左端**（#9，`mods/t3-tabs/main.js:236-243`）。唯一一处“顺序主动藏掉更该看的东西”：装不下时先切掉虚线组和最早的家族 tab，而程序 tab（最不重要）留着。改法一行级别：`fromEnd` 只在 `over === 0` 时生效。**先要 demo 截图**确认默认侧栏宽度下真的会溢出，否则只是理论问题。
2. **Files 树排序**（#18）：不是问题，只是 T3 对应的库行为没核对。要判断“目录优先 + 自然序”是否与 T3 一致，得在装了 `@pierre/trees` 的环境里看一次。
3. **子 agent 列表按批次分组**（#13）：T3 的做法，但会把 pane 头的 kids 列表和 Agents 列表一起改，省下的注意力不抵成本，不建议现在动。

共 23 行：21 行保持，#9 待 demo 后决定，#18 待确认。保持的里面，与 T3 顺序一致的有 10 处（#4、#5、#10、#11、#13 的顺序部分、#14、#15、#16、#17、#20），其余 11 处要么 T3 没有对应，要么是 ADR 0001 下有意与 T3 不同（#1、#2、#3、#6、#7、#8、#12、#19、#21、#22、#23）。

## 未做的事

- 没开 demo 窗口：`stage.sh up` 要经 `repos.sh` 走 GitHub，并会在桌面开窗；#9、#18 的“看得见”结论需要截图复核。
- 没核对 `@pierre/trees` 内部的排序实现（本地 `node_modules` 里没有这个包）。
- 没重议右键菜单分组（见 [context-menu-plan.md](../context-menu-plan.md)），也没重审侧栏排序（见 `sidebar.md`）。
