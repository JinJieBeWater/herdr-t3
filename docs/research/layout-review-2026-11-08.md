# 整套布局审查（2026-11-08，基线 fc7f6c3）

四路独立只读审查的汇总：A 数据与状态、B 交互一致性、C 视觉层级、D 代码质量。各路的完整报告在 [layout-review-2026-11-08/](layout-review-2026-11-08/)。C 引用的截图在 `/tmp`，审查结束后已删除。汇总时回到代码核实了 A1–A4、B1、B2、C1。

## 结论

日常单窗口使用没有发现会出错或丢数据的问题，`scripts/check.sh` 通过，token 和共享模块也守得好。问题集中在三处：

1. **失败与竞争路径上的写入**：远程写失败、多窗口、两次写入返回的顺序和发出时相反。这些情况会让置顶、Woke、未读 done 和 Review 设置被悄悄改掉或丢掉。
2. **几处交互没跟上“一套规则”**：右键菜单、排序按钮、Lists 的取消置顶，以及 Settle 的按键提示。
3. **防回归不够**：类型检查没有接入 `check.sh`，有四条行为改坏了测试也不会失败。

## 优先修（小改动、真实场景）

| # | 问题 | 位置 | 最小修法 |
|---|---|---|---|
| A3 | 卡片 Settle 写失败时，置顶已被删掉、Undo 也没了 | `mods/t3-inbox/actions.js:49-51` | 照 `t3-tabs/main.js:258`，写成功后再取消置顶 |
| A2 | 后台窗口停在某个 agent 上，到期时会替人清掉它的 Snooze，人回来时没有 Woke | `mods/t3-inbox/main.js:230-231`、`row-model.js:71` | 两个“已看”清理条件加 `window().active` |
| A6 | `payBack` 写失败照样删记录，未读 done 或 Woke 静默丢失 | `mods/t3-tabs/main.js:403-406` | 改用已有的 `writeLabel()`，成功后再删 |
| A4 | Review 设置整份 PUT 旧快照，改语言会撤回别处刚改的模型 | `extras/mods/review/settings.js:41-80` | 只提交本次改的字段，并且串行保存 |
| A7 | Review 快速勾选再取消“已审”，乱序落地后保存的是勾选 | `extras/mods/review/diff.js:54-64` | 同一文件的写入串行发送，或合并为最后一次选择 |
| B2 | 后台卡片的 Settle 提示 ⇧⌘S，按下去却收起正在看的 agent；已 Settle 行引用了不存在的 `t3-inbox.settle` | `mods/t3-inbox/row-view.js:155`、`:213` | 只在正在看的卡片上显示按键，删掉不存在的 action |
| C1 | Inbox 卡片第三行几乎都只写 `main`，每张卡多占 18px | `mods/t3-inbox/row-view.js:74` | 套用 Spaces 省略 main/master 的同一条件（`t3-spaces/main.js:436-444`） |
| D1 | 类型检查没接进 `check.sh`，目前有一个 TS 错误 | `mods/t3-tabs/main.js:34` | `check.sh` 里给每个 mod 跑 `tsc`，共约 1s |

## 应该修

- **A1**：自动清理和新的 Settle 写入如果落地顺序反了，Settle 会被撤销（`t3-inbox/main.js:118-130`）。需要远程很慢，或者 agent 一轮跑得极快才会触发，所以排在后面。
- **A5**：从加入 Home 之前的版本更新，Inbox 的 props 哈希变了，它存的筛选、开合和顺序就读不到了（`scripts/update.sh:39`）。如果没有旧版用户，在 changelog 里写明即可；否则需要做一次迁移。
- **B3**：Agents 的排序按钮没接 `justClosed`，菜单开着时再点会重开，不会关上（`t3-agents/main.js:263-271`）。
- **B4**：`t3-menu` 没走 `shared/list.js`，打开后会同时亮两行，Enter 执行的是第一行，也不支持 Home、End 和 typeahead。
- **B5**：Lists 点图钉取消置顶没有 Undo，和 ADR 0002 不符。
- **B6**：RECIPE 中英文版各有两处和代码矛盾：一处说置顶卡片没有 Settle，另一处说 Spaces 右键是自带 menu。
- **D2**：四条行为没有测试兜底：`walkSpaces` 回绕、git 失败后重问、远程仓库不进 watch、60 秒兜底轮询。
- **D3**：`git status` 加 `--untracked-files=no`。
- **D4**：`stage.sh` 的 `rm -rf` 护栏能被 `/private/tmp/` 或带 `..` 的路径绕过，`kill` 的 pid 可能已经过期。
- **D5**：Inbox 的 Undo 只在 1 秒定时器里处理，最多晚 1 秒生效。
- **D6**：“找布局节点、判断 Inbox 还是 Lists”复制了六份，可以收进 `shared/`。
- **D7**：Inbox 的新近排序规则定义了两次（`row-model.js:97`、`:111`），拖动落点和实际排序可能不一致。

## 可以更好

- **视觉**：Lists 里被挤成“‥”的 space 名；Settled 标题里的 `Clear` 读起来像“Clear 2”；Lists 下边缘的 blocked 标签被裁掉，也没有“还有更多”的提示；Spaces 和 Agents 默认 1:1，改成 1:2 更合适；在 Home 打开弹层时，底下的按钮会露出来。
- **交互**：各菜单打开时的初始高亮和 Space 键处理不统一；用 Tab 走不到 Review 栏和弹层底部的按钮；只有 Inbox 的拖动能用 Esc 取消；用词不统一（Unsettle/Un-settle、terminals/panes）；新建菜单写死了 `⌘`。
- **个人配置**：你的 `~/.config/herdr-app/keys.json` 里 `ctrl-alt-g/w` 仍然指向自带 picker，`ctrl-alt-shift-up/down` 仍然是 `agent.prev/next`。这是 `update.sh` 有意保留的个人键位，不算布局缺陷；但布局也没覆盖 Linux/Windows 的默认键（B1）。
- **代码**：大文件混了多种职责（`t3-spaces/main.js`、`t3-tabs/main.js`）；localStorage 解析没有保护；测试文件会被一起装进用户目录。

## 做得好、不该动

- `settled=<时间>:<turn>` 由 core 保存事实，再按当前 turn 判断是否仍然有效。
- `shared/` 加 sync 加 check 的副本机制：52 份副本一致，复制清单和各 mod 的 import 对得上。
- `shared/list.js` 和 `shared/focus.js` 把列表移动、Tab 停靠和“再点关闭”收成一套。所有关闭入口都走 t3-tabs 的同一条确认路径。
- token 守得严：圆角只用 4/6/8/16，例外都写了出处。状态标记全局一套。
- 测试扎实：约 20 处故意改坏代码的测试中，现有检查抓到了约 14 处。

## 没检查到的

- 真实鼠标悬停和拖动、多窗口、远程掉线、崩溃恢复和真实升级都没有实机回放，A 是用假 Herdr 夹具在内存里回放的。
- 演示窗口只跑了 inbox 场景，layout、actions、review 三个场景需要 OpenCode Go key。
- 没看浅色主题、窄窗口和多台机器的显示。
- “照 T3”的地方没有逐项对照 T3 源码，因为本地的 t3code 版本较旧。

## 处理结果（2026-11-08，6ca8fac..HEAD）

- **已修**：A1–A4、A6、A7；B2–B11（B8 的取回落点、B9 的 Tab 停靠点、B10 的 Esc 取消拖动，以及 B11 的用词和平台按键都在内）；D1–D5、D7、D10、D13、D15、D16。每条行为修复都补了修前会失败的测试。
- **另修**：Inbox 第一张卡片离 Search 的间距改成和 T3 一样（列表顶部原来多留了 10px）。macOS 窗口按钮随缩放对齐。Herdr 的 `traffic_lights` 是不乘缩放的屏幕坐标，所以由 t3-chrome 在缩放变化时，以及布局被更新改回原值时，改写已安装的 `layouts/herdr-t3.json`（y = 12 + 20×(zoom−1)）。演示窗口里核对了 0.9、1.0、1.25 三档。
- **没修**：
  - C1、C2、C3、C5、C6：做了之后按用户意见撤回，保持原样（Lists 行名后的 space 名、卡片第三行的分支、Clear 常显、Lists 1:1、Home 按钮居中）。
  - A5：旧版 Inbox 存储的迁移。要先确认有没有从加入 Home 之前的版本升级的用户。
  - B1：`keys.json` 不能按平台区分，指南里写明只覆盖 macOS 的键。
  - B7 的 Space 键，以及排序菜单在指针离开时清高亮。
  - B12：没有验证过。
  - C4：标签栏边缘的渐隐提示。
  - D6、D8、D9：重构。
  - D11、D12，以及 D14 的 `touchesDiff`。
- **没实机验证**：真实鼠标的悬停和拖动、键盘 Tab 停靠点、多窗口、远程掉线、全屏下的窗口按钮。截图只用了 fake-agent 场景。

## 处理结果（2026-11-08 第二轮，bf0e781 之后）

上一节的修复又做了两份复查：一份看 Inbox 和 Review，一份看其余部分。另做了一次加深与文档一致性审查。

- **复查报的问题，已修**：
  - 用 `cmd-shift-s` Settle 后点 Undo，agent 会排到 Active 顶部。现在 Undo 不论在哪个窗口、从哪个入口点，都回原位。只有三种明确取回排到顶部：撤销箭头、拖出 Settled、对已 Settle 的 agent 按 `cmd-shift-s`。按键取回由 t3-tabs 写进 `shared("t3-inbox.unsettled")`，各窗口的 Inbox 据此判断，不再把任何被清掉的 `settled` 标签都当作新消息。
  - 置顶卡片 Settle 后，写入返回前仍留在 Pinned，拖到 Settled 会先弹回。现在 Settle 立即取消置顶，写入失败时放回原位，其间新加的置顶保留。
  - Spaces 和标签栏的根元素一直挂着焦点句柄，平时点击空白处可能夺走终端的键盘（复查时没有实机确认）。现在只在拖动期间挂上，用来接 Esc。`t3-inbox/drag.js` 有同样的写法，早于本轮，没有改。
  - 归还未读失败时，每次重试都弹一次错误提示。现在每条记录只提示一次，照常重试。
  - t3-chrome 运行 `herdr-app status` 判断当前布局，依赖 PATH 和子进程继承的 app home。现在读 `shared("layout")`。
- **重构**，用户可见行为不变：
  - 六处布局树查找归成 `shared/sidebar.js` 的 `sidebarParts()`，由 `sync.sh` 复制到 t3-chrome、t3-home、t3-tabs、t3-spaces、t3-agents、t3-inbox。
  - Spaces 的仓库事实和读取调度移进 `t3-spaces/repos.js`，对外只有 `update` 和 `forSpace`。对应测试移到 `check-repos.cjs`。
  - Tabs 的导航、关闭落点和未读归还移进 `t3-tabs/navigation.js`。
- **文档**：按一致性审查的 D1–D8 改正 README、RECIPE、指南、ADR 0003 和 changelog 中过时的说法和中英差异，并重写 11-08 的 changelog。
- **没做**：两处 `touchesDiff` 共源，收益小，等下次改这条规则时一起做。测试按 Interface 重新归属，只随 `repos.js` 做了 Spaces 这一份。
- **新发现，已修**：在新 clone 或新 worktree 里，`scripts/check.sh` 的类型检查原本会失败：`herdr-app check` 给每个 mod 写一份默认的 `jsconfig.json`，`tsc` 照它报几百个错误。现在 `check.sh` 把选项直接写在命令里，不再读这个文件，新 clone 里也能通过。
- **没实机验证**：平时点击 Spaces 和标签栏是否还会夺走键盘，要真实鼠标点一次才能确认。多窗口下的 Undo 和按键取回只在假 Herdr 夹具里回放过。
