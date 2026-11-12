# 弹层与菜单顺序只读审计

请求：只读审计本布局里"弹层与菜单中的条目先后"，范围 t3-new-menu、t3-picker、t3-actions、t3-menu、t3-chrome/settings.js、t3-home、extras 的 review base 选择器。判断依据 [ADR 0001](../../adr/0001-trade-off-order.md)：行为上选更省注意力，外观/结构照 T3。不改代码和文档，不动他人改动。

方法：只读代码。基线 `578fc83`（审计途中另一会话把 `ccf1b08` 的 review 改动提交了，行号取自 `578fc83`，当时工作区干净）。T3 对照用 fork `/Users/jinjiebewater/my/personal/fork/t3code` HEAD `97db94c9bf`，下文只写路径。未开 demo 窗口（`stage.sh up` 要 GitHub，且窗口只能看不能点），因此"默认亮哪一行""Herdr 把弹层夹回窗口"这类表现是读代码得出，未做 GUI 验证。

## 1. 新建菜单（mods/t3-new-menu）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 1 | `main.js:48-56`（rank 在 `:52`） | 当前 space → 同机器的 space → 其他；同组按机器名，再按 `spaces()` 模型序；每行右侧标 `⌘1…⌘9`（`:104`） | `CommandPalette.tsx:1391-1405` + `sidebarProjectGrouping.ts:149-157`：只把当前项目提到最前，其余照侧栏序，**不**按 environment 重新分组 | 保持：同一机器内仍是侧栏序，重排只发生在跨机器的行之间；差异见待确认 A |
| 2 | `main.js:38-45` | 当前 space 的机器 → This computer → 其余按名字；未就绪置灰不可选 | `CommandPalette.tsx:730-753`：本机 primary 最前，其余 `localeCompare`，未连接的保留但置灰 | 保持：第一行就是 ⌘N 会用的那台，Enter 即默认；只有"当前在远程时本机不第一"这一点与 T3 相反 |
| 3 | `main.js:134-143` | footer：↑↓ Navigate、Enter（New tab / New space）、Esc，右侧一个动作（New space / ← Spaces） | `CommandPaletteContent.tsx:44-73`：同样是 Navigate、Enter、Esc，再 `footerTrailing` | 保持：逐项同向 |

## 2. Go to（mods/t3-picker）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 4 | `main.js:37-56`（rank `:40`，Back `:53`，首个高亮 `:98`） | 最前是 Back（上次从这儿跳走的地方，默认亮它）→ 当前 space 的 pane，再同机器的 space → 其他；每个 space 内按标签序，`here` 加粗 | 跳转类表面在 T3 是一张平表、按最近一次用户发言倒序（`CommandPalette.logic.ts:176-215`、`threadSort.ts:66-89`，默认 `updated_at`），当前项标 "Current thread"，没有 Back 行 | 保持 + 记限制：`panes()` 只有当前 `focused`，没有焦点时间或历史（`herdr.d.ts:185-205`），按"最近用过"排得自己记状态，属新功能，不在本次范围 |

## 3. Actions 菜单（mods/t3-actions）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 5 | `main.js:82-113` | 按保存序；Add action 固定在列表外、分隔线之后、永远可见 | `ProjectScriptsControl.tsx:192-243`：`scripts.map()` 保存序，Add action 最后 | 保持：主脚本（`main.js:22`，上次跑过或第一个）不往前挪，两边一致，位置不随执行漂移 |
| 6 | `main.js:14` | 图标 play、test、lint、configure、build、debug | `projectScriptEditor.tsx:52-59` 同一顺序 | 保持 |
| 7 | `main.js:165-192` | 字段 Name、Command、Folder → 一行 Icon、Run in → footer：Delete ｜ Cancel、Save | `projectScriptEditor.tsx:257-386`：字段集不同（Name 带图标、Keybinding、Command、Preview URL、两个开关），footer 同序 | 保持：footer 的"破坏性在左、Cancel 在 Save 左"与 T3 一致 |
| 8 | `main.js:217-219` | 确认框：Cancel、Delete | `projectScriptEditor.tsx:391-409`：Cancel、Delete action | 保持 |

## 4. 右键菜单与 Snooze（mods/t3-menu）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 9 | `main.js:83-95`（agent） | Pin · Settle · Snooze ┃ Rename · Copy address · Send back ┃ Close | `threadActionMenu.logic.ts:47-106`：New thread on branch、Pin、Settle、Snooze▸、Rename、Regenerate title、Mark unread、Copy path/branch/ID、Delete（无分隔线，破坏性项最后） | 保持：首段与末项同向。T3 首项"在分支上开新标签"这里没有对应项，属缺项，不是次序问题 |
| 10 | `main.js:106-171`（pane、tab、space、checkout、machine） | 与 `context-menu-plan.md` §4 的分组逐条对应（去处 ｜ 状态 ｜ 改名与复制 ｜ worktree ｜ 结束） | T3 没有 pane/tab 菜单；space 对应项目菜单 | 保持：今天刚统一过，没看到明显问题 |
| 11 | `main.js:151-152`、`shared/snooze-presets.js:4-12` | 子菜单：预设按唤醒时间升序、同一分钟只留一行，右侧"几点醒"一列，分隔线后 Custom… | `threadSettled.ts:323-368`：固定语义序（In 1 hour、In 3 hours、This evening〔距 18:00 超过 1 小时才出现〕、Tomorrow、Next week），不排序、不去重；菜单里把标签和时刻合成一句话（`threadActionMenu.logic.ts:84-88`） | 保持：这是本次唯一"明确偏离 T3 且我判断该保留"的顺序。代价是 15:00–18:00 之间 This evening 会与 In 3 hours 换位，15:00 前后两行同一时刻只留一行；换来的是右侧时刻列单调，能顺着扫，不必先认标签 |

## 5. Settings 与 Home

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 12 | `mods/t3-chrome/settings.js:10-16` | 导航只有一个 Home 分区；页内 After putting away → Home shows | T3 设置的分区序（`settingsSearch.ts:21-29`）只作"固定项在前、其余可预期"的参照，没有 Home | 保持：两行都属 Home，先"收起后去哪"再"Home 里放什么"，符合从动作到内容的读法 |
| 13 | `settings.js:32-40` | Default（t3-home）→ Terminal → 其余按标题字母序 | 无对应 | 保持：两个固定项在前、其余可预期 |
| 14 | `mods/t3-home/main.js:15-19` | Next agent → Go to → New tab | 无对应页；T3 命令面板的动作序是"先新建、再查找"（`CommandPalette.tsx:1417-1560`） | 保持：这里是刚收起一个 agent 的落点，最常做的下一步是看下一个 |

## 6. Review 的 base 选择器（extras）

| # | 位置 | 现在的顺序 | T3 对应 | 判断 |
|---|---|---|---|---|
| 15 | `extras/mods/review/scope.js:211-231`（`baseList` 在 `:214`）+ `review-git.js:93-100` | Automatic（在搜索时去掉）→ 每个本地分支（配一个远程，origin 优先）→ 只有远程的；两段内部都按最近提交倒序（`--sort=-committerdate --count=200`） | `DiffPanel.tsx:366-380`、`baseRefChoices.ts:17-47`：三段结构完全相同；本地分支的先后来自 `GitVcsDriverCore.ts:2719-2731` 的优先级（当前分支、默认分支各最前），其余按 refname 字母序 | **建议改**：行里只有名字和 REMOTE 开关，没有日期，按时间排的次序看不出依据；找 `main` 或某个 feature 只能整列扫，而字母序可以一眼跳到位置。若不想丢"最近碰过的在前"，至少把默认分支提到 Automatic 之后（它现在可能落在中段）。改法是一处 sort；注意 `readRefs` 被 Review 栏共用，且 `--count=200` 是按时间截断的，排序只改显示、不改截断 |

## 最值得动的（按价值）

1. **#15 review base 列表的次序**（唯一一条确定的代码级建议）：Automatic 以下改字母序（或先默认分支），与 T3 同结构；行内没有日期，时间序是看不见的规律。
2. **待确认 A：New 菜单是否按机器分组**（#1）。这是"结构照 T3"与"省注意力"唯一真冲突的一处，需要 owner 拍。
3. **待确认 B：Go to 的"最近用过"序**（#4）。现在是按 space 分组 + 标签序，稳但长；T3 那种"最近动过的在上"要新增一份焦点历史，是功能而不是调整。
4. **#11 Snooze 的两种排法**（时间序 vs T3 的语义序）：保留时间序，只要知道只差下午三小时的那一次换位。

## 待确认

- **A（#1）**：New 菜单把"同机器"的 space 提到其他机器之前，侧栏、`space.next/prev` 走的是模型序（另一份审计 `sidebar.md` 的 #21 是同一条根）。菜单里失去的是"你在侧栏刚记下的位置"，得到的是"本地目录挨在一起"。T3 只提当前项、其余照侧栏序；要不要对齐 T3 得看实际使用是否常跨机器。
- **B（#4）**：按最近用排序需要新的状态（`panes()` 没有时间，`docs/internals/storage.md` 也没登记这类键），只读审计无法判断是否值得。
- **C（#2）**：当前 space 在远程时，This computer 排第二；T3 的形式是本机永远第一。两种都会让某一行位置固定，不好说哪个更省注意力，没有现场使用数据。
- 附注（不属顺序）：`RECIPE.zh-CN.md:48` 写"正在用的 mod 即使不再自荐也列出"，`settings.js:36` 只留 `home: true` 的 mod，文档与实现不符；当前选中值仍会显示在选择框里，所以只是少一行，不是显示错。

## 没做的

- 没开 demo 窗口，也没跑 `scripts/check.sh`（无代码改动）。
- 没审范围外的列表：Inbox/Agents 的收纳区与排序、标签栏、Files 树、Review 页内分组（`sidebar.md` 已覆盖侧栏部分）。
