# Herdr T3 审查 · 角度 B：交互一致性

基线：`/Users/jinjiebewater/my/personal/projects/herdr-t3` 工作区 HEAD `fc7f6c3`（无未提交改动）。只读代码和文档，没开演示窗口；`scripts/check.sh` 输出 `all checks passed`。共享模块以 `shared/` 为准，引用副本时只是为了给出 mod 内的行号。

## 必须修

没有。没有发现会丢数据、关错东西，或让常用路径直接失效的交互问题。下面几条最接近必须修的是第 1、2 条：一个会让快捷键作用到另一个 agent 上，一个会让部分按键绕过关闭确认。

## 应该修

### 1. keys.json 漏掉了几组会绕过 t3-tabs 规则的键

- **是什么**：布局的 `keys.json` 在 `layout:herdr-t3` 里逐条覆盖 global 的导航和关闭键，但作者自己的 `~/.config/herdr-app/keys.json` global 里还有 4 条没被覆盖：`ctrl-alt-g` 和 `ctrl-alt-w` → `mod.open:picker`，`ctrl-alt-shift-up` / `-down` → `agent.prev` / `agent.next`。同一组 `ctrl-alt-*` 里的其余键（`ctrl-alt-c`、`ctrl-alt-x`、`ctrl-alt-shift-x`、`ctrl-alt-1…9`、`ctrl-alt-[ ]`、`ctrl-alt-shift-1…9`、`ctrl-alt-shift-[ ]`）都覆盖了（`keys.json:1-61`）。非 mac 平台上 Herdr 当前的默认键（`~/my/personal/fork/herdr-app/defaults/keys.json`：`ctrl-shift-w` tab.close、`ctrl-shift-x` pane.close、`ctrl-shift-t` tab.new、`alt-1…` space.select、`ctrl-1…` tab.select、`ctrl-shift-k` picker、`alt-up/down` agent.prev/next）一条也没覆盖。
- **问题**：
  - 按 `ctrl-alt-g` 打开的是自带 picker：没有 `↩ Back` 行，命名规则不同，它的关闭窗格也不经过 t3-tabs 的确认和“先离开”。
  - 按 `ctrl-alt-shift-down` 走 Herdr 的 `agent.next`，而不是指南写的“按侧栏画出来的行走、到两端停住”（`docs/user/guide.zh-CN.md:47`）。
  - 在 Linux/Windows 上：`ctrl-shift-w` 关闭有程序的标签时不确认，Herdr 选的右邻还会显示出来；`alt-1` 把隐形的 Home 也算进 space 序号；`ctrl-1` 被布局改成了第 n 个 space，而那个平台上它原本是第 n 个标签。这和指南第 22 行“关闭前确认”、第 42 行“不算 Home”的说法相反。布局在标签栏给 Windows 画了窗口按钮（RECIPE），说明它预期会在 Windows 上运行。
- **最小修法**：在 `keys.json` 里补上 `"ctrl-alt-g"` / `"ctrl-alt-w": "mod.open:t3-picker"` 和 `"ctrl-alt-shift-down"` / `"-up": "t3-tabs.next"` / `".prev"`。非 mac 默认键二选一：要么同样逐条映射到 `t3-tabs.*`，要么在指南“快捷键”一节明确写“只覆盖 macOS 的键，其他平台请自行映射”。
- **不修的后果**：同一个“下一个 agent / 跳转 / 关闭”，按哪组键决定走哪套规则，在用户看来就是时灵时不灵。非 mac 用户会在不确认的情况下关掉正在运行的 agent。

### 2. Inbox 卡片的 Settle 提示在后台卡片上也显示 ⇧⌘S；已 Settle 行的提示指向一个不存在的命令

- **是什么**：`mods/t3-inbox/row-view.js:153` 给每张卡片的 Settle 按钮传 `{ action: "t3-tabs.settle" }`，不管这张卡片是不是当前查看的。`row-view.js:213` 给已 Settle 行的撤销箭头传 `"t3-inbox.settle"`，这个命令在 `keys.json` 里没有绑定（真正绑的是 `t3-tabs.settle`），所以永远显示不出按键。
- **问题**：RECIPE 规定提示里的快捷键“仅当按键和控件做的是同一件事”才加，标签栏的 × 也照此只在当前标签上显示 `⌘W`（`mods/t3-tabs/main.js:614`）。但 `cmd-shift-s` 只作用于当前查看的 agent。场景：正在看 agent A，鼠标悬停后台卡片 B 的 Settle，提示写着 `Settle agent ⇧⌘S`；按下 ⇧⌘S 后，被 Settle 并跳到 Home 的是 A，不是 B。反过来，当前查看的那一行已经 Settle 过，悬停撤销箭头时本该提示 ⇧⌘S，却什么也不显示。
- **最小修法**：两处都改成 `action: viewing(a) ? "t3-tabs.settle" : undefined`。`row-view.js:213` 保留现有的 `napping` 判断。
- **不修的后果**：提示把人引到错误的按键上，结果是错误的 agent 被收起并离开当前视图。

### 3. Agents 的排序按钮不是开关：菜单开着时再点会重新打开

- **是什么**：`mods/t3-agents/main.js:263-271` 的排序按钮按下时只记 `sortFrom`，点击时直接 `openOverlay`，没有用 `pressed` / `justClosed`；排序菜单副本的 `close()`（`main.js:22`）也不写关闭时间。
- **问题**：RECIPE 的“键盘”一节说，再点打开弹窗的按钮会关闭弹窗，因为这次按下先关掉弹窗，点击时用 `justClosed` 判断。Actions ▾、Inbox 的 Search / New space / New tab、Spaces 标题栏、Home 的按钮、Review 栏的 logo 都这样做了，唯独排序按钮没有。场景：打开排序菜单，再点一次排序按钮，菜单闪一下又出现，只能按 Esc 或点别处关掉。
- **最小修法**：按钮的 `on_mouse_down` 里加 `pressed(this)`；`on_click` 里先判断 `if (justClosed(this, "t3-agents.sortClosed")) return;`；`close()` 在 `props()?.sortMenu` 时 `setShared("t3-agents.sortClosed", Date.now())`。
- **不修的后果**：全布局只有这一个按钮违反“再点关闭”，和它并排的 Spaces / Inbox 按钮行为相反。

### 4. 右键菜单 t3-menu 没走统一的列表移动方式，会同时亮两行

- **是什么**：`mods/t3-menu/main.js:92` 打开时 `at = 0`；`:128-133` 只处理 ↑/↓/Enter/Esc；`:149-150` 选中行用 `selected`，悬停行另用 `.hover(bg(t.hover))`，悬停不会改 `at`。
- **问题**：RECIPE 写“所有弹窗列表的移动方式只有一套（`shared/list.js`）……菜单支持 Home、End，没有搜索框的菜单还支持 T3 的 typeahead”，还写“指针所在的行高亮”；CHANGELOG.md:56 也写“Every popup's list now moves the same way”。场景：右键一个标签，第一行 Rename 已经是 `selected` 底色；指针移到 Close 上，Close 显示 `hover` 底色，屏幕上同时亮两行，这时按 Enter 执行的是 Rename。Home、End、按首字母跳转都不起作用。
- **最小修法**：引入 `list.js` 的 `menuJump`；`at` 初始为 -1；行加 `on_hover`，悬停时把 `at` 设为这一行，去掉单独的 `.hover`；Enter 前判断 `at >= 0`。这样会超出 RECIPE 说的“只改了 `choose()`”，跟进 Herdr 菜单更新时要多合并一处。如果想让克隆保持最小改动，至少把 RECIPE 和 CHANGELOG 里的“所有弹窗”改成“除右键菜单外”。
- **不修的后果**：最常用的菜单（标签、space、终端的右键）和文档的承诺不一致，键盘用户按 Enter 可能执行到不是自己看着的那一行。

### 5. Lists 里取消置顶没有撤销提示，Inbox 里有

- **是什么**：Inbox 把卡片拖出 Pinned 时会写 `remember("Unpinned", …)`（`mods/t3-inbox/drag.js:142`），底栏显示 `Unpinned, Undo`。Lists 的图钉按钮直接 `setShared("agents.pins", …)`（`mods/t3-agents/rows.js:204`），不留提示。
- **问题**：ADR 0002 要求两种模式规则相同；RECIPE.zh-CN.md:50 写“Settle 和取消置顶后……显示 Undo……Lists 和 Inbox 都有”；CHANGELOG.md:190 写“Settle and Unpin leave an undo notice”。场景：在 Lists 里误点了一个置顶 agent 的图钉，它离开 Pinned 并按排序落到别处，没有 Undo，原来的置顶顺序也丢了。
- **最小修法**：给 t3-tabs 加一个 `unpin:<address>` 命令，写一条 `owner: "tabs"` 的提示，`action: "Unpinned"`，`undos: [{ address, pins }]`。`undo()`（`mods/t3-tabs/main.js:276-302`）需要按动作区分：Unpinned 只恢复 pins，不能去写 `settled`。Lists 的图钉按钮取消置顶时改为 `run("t3-tabs.unpin:…")`。如果判断不值得做，就把 RECIPE 和 CHANGELOG 改成“Inbox 里拖出置顶”。
- **不修的后果**：同一个操作，在一种模式里能撤销，在另一种模式里不能，正好违反了 ADR 0002 的初衷。

### 6. RECIPE（中英两版）有两处和代码矛盾，而 RECIPE.md 是给 agent 照着构建的正本

- **是什么**：
  - 置顶卡片：RECIPE.zh-CN.md:44 前半句说“已置顶的也一样”，后半句却说“置顶卡片……不提供 Settle 按钮”；RECIPE.md:42 也同时有 “a pinned one too” 和 “offer no Settle button”。代码对置顶卡片照样提供 Settle（`row-view.js` 里 `offer = over && !busy(a)`，没有判断是否置顶），CHANGELOG.md:155 也写 “A pinned card offers Settle too”。
  - Spaces 右键：RECIPE.zh-CN.md:41 和 RECIPE.md:39 写“右键打开自带 `menu`”，代码开的是 `t3-menu`（`mods/t3-spaces/main.js:268`），这样它的 Close 才会经过 t3-tabs。
- **问题**：agent 照 RECIPE 重建或修改时，可能去掉置顶卡片的 Settle，或者把 Spaces 的右键改回自带菜单，绕开“先确认、先离开”。
- **最小修法**：两版都删掉“不提供 Settle 按钮”这半句；把“自带 `menu`”改成 `t3-menu`。
- **不修的后果**：文档自相矛盾，下次按文档实现就会引入回归。

## 可以更好

### 7. 菜单的初始高亮和 Space 键各不相同

- **是什么**：Actions 菜单打开就亮第一行（`mods/t3-actions/main.js:76`）。排序菜单（`t3-agents/main.js:27`）和 Snooze 菜单（`snooze.js`，`napAt = -1`）则照 T3“按键或指针到达前不高亮”。Snooze 菜单的指针离开一行时会清掉高亮，排序菜单和 Actions 菜单不清。Space 键只在 Snooze 菜单和单位列表里等同 Enter（`snooze.js` 的 `bind_keys`），在 Actions、排序和右键菜单里都没用。
- **问题**：同样是没有搜索框的菜单，打开时亮不亮、Space 能不能选，取决于是哪个菜单。
- **最小修法**：Actions 菜单的 `initMenu` 改成 `view.at = -1`，Enter 前判断 `view.at >= 0`；现在的 `picks[view.at]()` 在 -1 时会抛错。Space 要么在各菜单的 `on_key_down` 里一并处理，要么只在 Snooze 菜单里保留并在 RECIPE 写明。
- **不修的后果**：键盘用户要逐个记住每个菜单的规则；也会出现“打开 Actions 后直接回车就运行了第一个动作”这类意外。

### 8. 用 `cmd-shift-s` 取回和点撤销箭头取回，回到的位置不同

- **是什么**：Inbox 的撤销箭头和拖出 Settled 走 `unsettle`，会把 `changed[address].at` 设为现在（`mods/t3-inbox/actions.js:23-28`），所以这一行排到 Active 顶部。`cmd-shift-s` 走 `t3-tabs.settle`，对已 Settle 的 agent 只写 `settled=`（`mods/t3-tabs/main.js:256`），不更新时间，这一行按旧时间排在 Active 中间。
- **问题**：RECIPE 和指南说按键“对当前查看的 agent 做同样的事……已 Settle 的则取回”，实际落点不一样。
- **最小修法**：Inbox 发现 `settled` 标签不是由自己清掉、而是被外部清掉时，同样把 `changed.at` 设为现在。或者让 `t3-tabs.settle` 在 Inbox 显示时通过 `shared` 通知它。
- **不修的后果**：影响小（这一行正在查看，会高亮），但“按键和按钮效果相同”这条承诺不完全成立。

### 9. 键盘 Tab 走不到 Review 栏，也走不到 New / Go to 的 footer 按钮

- **是什么**：`extras/mods/pulls-review/bar.js:354-397` 的计数段和 logo 没有用 `focus.js` 的 `stop`（它根本没引入 `focus.js`）。`t3-new-menu` 和 `t3-picker` 也没用 `focus.js`，所以 footer 里的 `New space`、`← Spaces` 和 `New tab` 不是停靠点。
- **问题**：RECIPE 说进入键盘模式后“Tab 走遍整个界面”，弹层里的控件始终是停靠点；Actions、确认框、编辑器、Custom snooze 对话框都做到了。Review 栏就紧挨着 Actions，Tab 却会直接跳过它。New 菜单里切换到选机器这一步只能用鼠标点。
- **最小修法**：把 `focus` 加进 `sync.sh` 里 `pulls-review`、`t3-new-menu`、`t3-picker` 的 share 列表，按 Actions 的写法给这几个按钮套上 `stop()`。
- **不修的后果**：只用键盘的人用不了这几个入口。

### 10. 拖动时能不能用 Esc 取消，各处不同

- **是什么**：Inbox 拿起一行后按 Esc 会放回（`mods/t3-inbox/drag.js:216-223`）。Spaces 拖动（`t3-spaces/main.js` 的 `dragTo` / `letGo`，约 560-630 行）和标签拖动（`t3-tabs/main.js:581-597`）都不处理 Esc。
- **问题**：三处拖动都照 T3 的“移动 6px 才拿起”，但取消方式不同：Spaces 只能把指针移出列表，标签只能移出标签栏。
- **最小修法**：照 Inbox 的做法，拿起时抢一个 focus handle，`on_key_down` 收到 escape 就调用 `letGo(cx, true)`，标签栏则清空 `pressed` 和 `over`。
- **不修的后果**：已经习惯在 Inbox 里按 Esc 的人，到 Spaces 里按 Esc 不起作用，松手就把 space 放到了错的位置。

### 11. 用词和平台细节不统一

- 撤销 Settle 的叫法：悬停提示是 `Unsettle`（`row-view.js:183`），拖动标记是 `Un-settle`（`drag.js:56`，指南和 RECIPE 也写 `Un-settle`）。应统一成一种。
- 关闭确认框的标题：关标签或窗格时是 `Close 2 terminals?`（`t3-tabs/main.js:196`），Inbox 的 Clear 是 `Close 2 panes?`（`t3-inbox/list-view.js:134`）。两者都是结束终端，建议统一用 terminals。
- RECIPE.zh-CN.md:45 和 RECIPE.md:43 说 Snooze 后显示 `Snoozed 1 agent, Undo`，但布局底栏实际显示 `Snoozed,`（`t3-chrome/main.js:38`）；只有单独停靠、没有底栏时才是 `Snoozed 1 agent,`。
- README.zh-CN.md:39、:50 用“收起 / 正在看的 agent / 已收起的则取回”，指南用“Settle / 当前查看的 agent / 已 Settle 的则取回”。GLOSSARY 指定“当前查看的 agent”，并要求避免“当前 agent”这类叫法。
- 新建菜单每行的编号提示写死了 `⌘${i + 1}`（`t3-new-menu/main.js:117`），而 Go to 的 footer 会按平台显示 `⌃D` 或 `Ctrl+D`（`t3-picker/main.js:127`）。
- `t3-inbox/main.js:82` 的注释还写着已经废弃的 `t3-inbox.settle (cmd-shift-s in keys.json)`；第 2 条里的错误 action 名很可能就是照这条注释写的。
- 指南第 51 行说 “Inbox 里的置顶、拖动和 Clear 用鼠标”，但 Clear 是键盘停靠点（`list-view.js:127`），键盘也能按。
- **最小修法**：逐条改字符串或文档，不涉及逻辑。
- **不修的后果**：同一件事在不同地方叫法不同，读文档的人对不上界面。

### 12. 待验证风险：从侧栏 Tab 到标签栏打开菜单，按 Esc 后键盘可能回到侧栏，而不是回到按钮

- **是什么**：Herdr 关闭弹层后，把键盘还给 `focused_block`（`~/my/personal/fork/herdr-app/src/window.rs:1550-1556`）。这个值只在 `pane.go` 落到 `focusable` 的 mod 时设置。键盘模式从侧栏开始，Tab 在 GPUI 里移到标签栏的 Actions ▾，并不会改 `focused_block`。
- **推断的场景**：`pane.go` 进入 Inbox，Tab 到 Actions ▾，按 Enter 打开菜单，再按 Esc。键盘会被交还给 Inbox，Inbox 的 `enter()` 再把焦点放回它自己记下的最后一个停靠点（`shared/focus.js:65-73`），而不是 ▾。侧栏里的弹层（排序、筛选、Snooze）不受影响，因为它们本来就在 focusable 的 mod 里。
- **未验证**：没有在窗口里实际操作过，只是按源码推断。
- **建议**：实际操作一次确认。如果属实，可以在 `t3-actions` 和 `t3-tabs` 的菜单副本 `close()` 时记下打开它的停靠点，由栏副本在下一帧 `focus()` 回去。

## 做得好、不该动的

- `shared/list.js`（`step`、`menuJump`、`scrollList`）和 `shared/focus.js`（`stop`、`justClosed`、键盘模式）把弹窗列表的移动方式、Tab 停靠点和“再点关闭”收成一份实现，大多数弹层都在用。上面几条的修法也都是让剩下的地方接入这一份，不应该另起一套。
- 所有关闭入口（标签的 ×、窗格的 ×、`cmd-w`、`cmd-shift-w`、右键菜单的 Close、Go to 的 `ctrl-d`、Settle Review）都经过 t3-tabs 的 `closeTab` / `closePane`，确认框和“先离开再关”只有一处实现。`t3-menu` 只改 `choose()` 来接上这条路，是对的。
- 提示里的快捷键用 `keyOf` 从 `keys()` 现读，没有写死；标签的 × 只在当前标签上显示 `⌘W`，这条规则本身是对的，第 2 条只是没有处处照做。

没检查到的：没有开窗口实际操作，鼠标、滚轮、拖动和焦点归还都是读代码推断的（第 12 条明确未验证）；没有逐项对照 T3 源码核实“照 T3”的视觉和时序数值（本地 `~/my/personal/fork/t3code` 停在 2026-08-13，早于 RECIPE 引用的 commit）；没有审 Review 窗格内部（`extras/mods/review` 的 diff 和设置页）的按键；没有在 Windows 或 Linux 上验证第 1 条。
