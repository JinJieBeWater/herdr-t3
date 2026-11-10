# Inbox 标签栏：以 agent 为主角的整体方案

状态：已实施（见下方“实施记录”）。设计图：[inbox-tab-bar-panes-design.html](inbox-tab-bar-panes-design.html)。参照 T3 Code `337c5858` 的 `ChatHeader.tsx`（面包屑）和 `RightPanelTabs.tsx`（面板胶囊）。

## 问题

Herdr 的结构是 space → tab → pane → 终端，agent 是终端里的程序。一个 tab 可以有多个 pane、多个同级 agent、多个程序。Lists 的标签栏是 space 的平级 tab 列表；Inbox 的标签栏只放当前工作周边的 tab，但外观和 Lists 一样，让人以为规则也一样，而且一个 tab 被当成了一个 agent。

## 三条原则

1. **Inbox 的单位是 agent**：标签栏的主角 = 侧栏亮着的卡片 = 焦点所在的 agent。三者永远一致。
2. **左边是“和谁说话”，右边是“用什么工具”**：左边是面包屑（agent），右边是胶囊标签（程序、子 agent 的 tab、被 zoom 挡住的程序 pane）。外观不同，就不会和 Lists 的 tab 条混淆。
3. **折叠用 Herdr 原生 zoom**：zoom 按 tab 记住，只作用于本屏，不改分屏结构。布局不替人搬 pane，也不 park；从卡片进入分屏的 tab 时保留分屏，只移动焦点。

## 结构

```text
Inbox
[space] herdr-t3 / [■ 布局优化] [ 审查 ] ⌄ ⧉        [lazygit┆] │ [检查布局] │ [lazygit] [dev server]   ▶ dev  ＋
 └ 面包屑：space / 父 agent / 同级切换器 ⌄ ⧉         └ 胶囊：同 tab 被挡的程序 │ 子 agent 的 tab │ space 程序 tab

Lists（不变，只把 zoom 中的 tab 展开成一组 pane）
[Pi 布局优化] [Pi 修复登录] [lazygit] [dev server]                                                     ▶ dev  ＋
```

| 区域 | 内容 | 点击 |
|---|---|---|
| space 名 | 当前 space 的标记和名字，最宽 160px | 去这个 space 的空标签，已有就切过去，没有才新建（`t3-tabs.open-empty`）；Inbox 下取代 `+` |
| 父 agent | 看子 agent 时出现；放不下先缩成 … | `focusAgent` 回父级 |
| 同级切换器 | 当前 tab 的全部顶层 agent，按 pane 顺序；只有一个时就是普通标题 | `focusAgent`：焦点、卡片高亮、切换器高亮一起移；zoom 中则移动 zoom |
| 标题、`⌄` | 当前 agent 的菜单：Pin、Snooze、Settle，标签里只有它时加 Rename（`t3-menu` 的 `agent`） | 同 T3 的 thread actions |
| 右键 | 点到什么就是什么的菜单：space 上是 space 菜单，agent 名上是它窗格的菜单 | 同布局其他右键 |
| `⧉` | 只在当前 tab zoom 且有 ≥2 个 pane 时出现 | 还原分屏 |
| 虚线组 | 当前 tab 被 zoom 挡住的非 agent pane（程序、mod） | `focusPane`，即移动 zoom |
| 子 agent 的 tab | 当前 agent 家族里、有自己 tab 的子 agent | `tab.select` |
| space 程序 tab | 当前 space 里不含 agent 的 tab，保持原顺序，可拖动 | `tab.select`；× 和右键菜单同现在 |

在 Inbox 下，pane 单独显示时（tab 只有一个 pane，或 tab 被 zoom），窗格标题不再写 agent 名，因为面包屑已经写了；只留图标、目录、按钮和状态。分屏时窗格标题照旧写名字，用来区分各个 pane。Lists 的窗格标题不变。

## “在看谁”的唯一规则

标签栏和 Inbox 用同一条规则（原先两处不一致：`navigation.visibleTabs()` 取 `focused().agent ?? here[0]`，`row-model.inboxInView()` 遇到普通程序返回 null）。实现时标签栏改用 `navigation.js` 已有的 `inViewAgent()`，它本来就照 `inboxInView()` 写成，所以 t3-inbox 不用改：

```text
inView(focus)
  焦点 pane 是 agent                      → 它（卡片亮、切换器实心高亮）
  焦点在无 pane 的子 agent（peek、block） → 最近的已列出祖先
  焦点是声明了 inbox 的 mod 卡片          → 那张卡片自己（标签栏把它当工具：胶囊高亮，面包屑空心）
  焦点是未声明 inbox 的 mod               → 旁边的 agent（同 Inbox：卡片亮，切换器高亮它）
  焦点是同 tab 的程序                     → 无卡片亮；面包屑空心框 = 本 tab 最后看的 agent
  焦点在不含 agent 的 tab                 → 无卡片亮；面包屑变暗 = 本 space 最后看的 agent
```

新增一份记忆：每个 tab 最后看的 agent（`navigation.js`，和 `trail` 同类，只在内存里）。每帧校验：tab 或 agent 已不在就丢掉，回退到 tab 里第一个 agent。

## 生命周期

所有显示都由每帧的 `spaces()`、`panes()`、`agents()`、`terminals()` 推出；只有 `trail`（space → 最近显示的 tab）和新增的“tab → 最后看的 agent”两份记忆，它们都按存活情况校验。所以下面的变化都不需要专门的事件处理，只需要规则正确。

### agent 和程序

| 事件 | 结果 |
|---|---|
| 在 shell pane 里启动 agent | 这个 tab 变成 agent tab：从右边的程序组移到左边。如果焦点在它上面，面包屑就是它 |
| 同 tab 里又启动一个顶层 agent（分屏） | 切换器多一项，位置按 pane 顺序；高亮仍跟焦点 |
| agent 退出，pane 留下 shell | 这个 pane 变回程序。tab 里没有其他 agent 时，整个 tab 移到程序组；面包屑变暗，指向本 space 最后看的 agent，没有时就不画面包屑 |
| 同级 agent 中有一个退出 | 切换器少一项；如果它是当前项，按 inView 规则落到焦点所在 |
| 程序退出、pane 关闭 | 胶囊消失；它若是 zoom 组的最后一个，虚线组消失 |
| 子 agent 启动并有自己的 tab | 出现在子 agent 组；没有 pane 的仍只在窗格标题的 `n agents ⌄` 里 |
| 父 agent 先结束 | 子 agent 成为家族顶层（`visibleTabs` 只沿 live 的父级向上走），面包屑去掉父级 |

### pane、tab、zoom

| 事件 | 结果 |
|---|---|
| 分屏（`pane.split`、Actions 在右/下运行） | 新 pane 直接可见，栏上不加；之后如果 zoom，它进虚线组或切换器 |
| zoom（窗格标题按钮或 Herdr 快捷键） | 出现 `⧉`，被挡住的程序进虚线组，同级 agent 仍在切换器 |
| 在 zoom 中点切换器或卡片 | 用现有的 `zoom.js` 移动 zoom，再聚焦 |
| 从 Herdr 自己的入口（toast、hc、命令面板）聚焦被挡住的 pane | 现有的 `zoomFollows()` 让 zoom 跟上焦点，栏随之变化 |
| 关掉被 zoom 的 pane | 由 Herdr 决定剩下的 zoom 状态；栏按 `zoomed` 字段重新画，不保存自己的状态 |
| 还原到只剩 1 个 pane | 不画切换器、`⧉` 和虚线组；面包屑就是普通标题 |
| pane 在 tab 之间移动（swap、拖动）、`tab.move` | 每帧重推，无需处理；记忆以 tab id 为键，tab 还在就有效 |
| 关闭当前 agent 的 tab，或关掉它的最后一个 pane | 不变：Inbox 下回 Home（ADR 0004）；Lists 下回本 space 上一个显示过的 tab |
| 只关当前 agent 的 pane，tab 里仍有同级 agent | 不变：留在这个 tab，由 Herdr 选窗格；按 inView 规则，切换器高亮落到它选中的那个 |
| 新建 tab（`+`、`cmd-t`） | 新的 shell tab 进程序组，处于显示状态；面包屑变暗，点它回去 |

### 注意力（只在 Inbox 下）

| 事件 | 结果 |
|---|---|
| Settle 或 Snooze 当前 agent，tab 里还有同级 agent | 不变：回 Home，或按设置去下一张卡片。不自动跳到同级：下一步看什么由人决定 |
| 同级 agent 已经 Settle 或 Snooze | 仍留在切换器里（它确实在这个 tab 里）。切换器不画状态；点它时 Inbox 按现有规则把它显示在收纳区当前行 |
| 同级 agent 需要你 | 由侧栏卡片告诉你，切换器不画状态（ADR 0002：Inbox 下标签栏没有状态） |
| 被 zoom 挡住的同级 agent 完成了 | 它没有被看到，done 圆点应该保留。**待实测**：Herdr 显示 tab 时会不会把被挡住的 agent 也标成已看；如果会，就按 `payBack()` 已有的“被 zoom 挡住不算在视野里”的方式补回 |

### 模式和位置

| 事件 | 结果 |
|---|---|
| Inbox ↔ Lists | 同一帧换画法；zoom 展开在两种模式下相同 |
| 隐藏侧栏 | 仍按所选模式（ADR 0003）。侧栏开关和计数在最左边，面包屑紧跟其后 |
| 去 Home | 标签栏没有内容，这一行收成 8px（现有行为） |
| 切换 space | 面包屑和胶囊换成新 space 的；这个 space 里还没看过 agent 时，面包屑只有 space 名 |
| 远程机器 | id 带机器前缀，规则相同；space 名旁边的机器标记沿用 space 标记 |
| Herdr 重启 | 两份记忆丢失：空心框回退到 tab 里第一个 agent，变暗的面包屑在看过一个 agent 之前不出现。shortcut：只记在内存，需要时再持久化 |

## 键盘

- `cmd-1…9`、`tab-next`/`tab-prev`、滚轮：仍走 `visibleTabs()` 的 tab 顺序（agent 的 tab = 1，然后是子 agent 的 tab、程序 tab），编号不变。
- `cmd-]` / `cmd-[`：仍走侧栏的卡片，同级 agent 各有一张卡片，所以它们已经能走到。
- 面包屑各项、切换器各项、`⧉`、胶囊都是 Tab 停靠点（`shared/focus.js`），Enter 和点击相同。

## 宽度

从左到右让位：父级先缩成 …；space 名截到 160px；切换器里的当前项保留名字，其余同级只剩图标（悬停显示全名）；胶囊按现有的 `fairCap` 规则让位，再不够就滚动。分隔线不让位。在默认侧栏宽度下要在 demo 窗口截图验收。

## 改动范围

- `mods/t3-tabs/navigation.js`：拆出 `context()`，返回面包屑（space、父级、同级、当前、空心）、zoom 组、子 agent 组、程序组；保留 `visibleTabs()` 给按键用；新增“tab → 最后看的 agent”的记忆；inView 规则和 Inbox 统一。
- `mods/t3-tabs/main.js`：Inbox 分支画面包屑和右对齐的胶囊；zoom 展开取代 `${name} Z`（两种模式都这样）。
- `mods/t3-pane/main.js`：Inbox 下单独显示时不写名字。
- `mods/t3-tabs/check-navigation.cjs`：用假 core 锁住同级、空心记忆、zoom 组、agent 退出、子 agent 父级结束这几种情况。
- 文档：`RECIPE.md` / `RECIPE.zh-CN.md`、两份 CHANGELOG、`docs/user/guide*.md`；ADR 0002 的“标签栏”一条改写；新增 ADR 记下“Inbox 标签栏以 agent 为主角、折叠用原生 zoom”。
- 验收：`scripts/sync.sh`、`scripts/check.sh`；在 demo 窗口里对单 pane、同级分屏、zoom、焦点在程序、子 agent 五种场景截图。

## 待实测

1. 被 zoom 挡住的 agent，在它所在的 tab 显示时，是否被 Herdr 标成已看。
2. 关掉被 zoom 的 pane 后，Herdr 是否保留 zoom、zoom 落到哪个 pane。
3. 默认侧栏宽度下，面包屑、切换器、胶囊、Actions、Review 栏能否同时放下。

## 实施记录

- 看同级 agent C 时，子 agent 组只放 C 自己家族的 tab：家族跟着当前查看的 agent 走，和卡片一致。
- 关闭后的落点还没显示出来时（`going`），Herdr 临时选中的邻居不算“在看”，面包屑保持原来的 agent。
- Lists 下 zoom 展开的分组保留这个 tab 的状态标记，放在 `⧉` 前面。
- 分组不能像 tab 那样拖动（代码里有 shortcut 注释）。
- demo 窗口里看过：同级分屏、焦点在同 tab 的程序、zoom、去看程序 tab、子 agent、Lists 下 zoom、隐藏侧栏。待实测第 1、2 条仍未验证；窄窗口没有截图。

- 同级切换器取消：用户决定面包屑的标题位置只显示当前查看的 agent，同标签的其他 agent 靠卡片或窗格到达（见 ADR 0010）。上文涉及切换器的描述以此为准。
- 不含 agent 的标签按进入方式分：从标签条进入工具标签保留 away（变暗、点它回去）；点 space 名或 `cmd-t` 之后标为 fresh，只显示 space，直到再看某个 agent（见 ADR 0010）。
