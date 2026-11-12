# 右上角详情入口与 space 面板控件改造方案

状态：方案，等待用户决定是否实施。基线 `0a116d4`。依据为用户确认的三行弹出内容，以及 [T3 行为研究](t3code-layout-controls.md)、[交互补充](t3code-layout-interactions.md)、[接入研究](t3code-layout-adaptation.md)。本文件集中规定实施范围；研究文件和 HTML 示意不作为已经实现的证据。

## 1. 目标与范围

右上角提供「详情」和「space 面板」两个明确入口。详情始终默认收起，点击才打开原生 popup；只占弹层本身的区域，终端的尺寸、分屏和 zoom 不因详情开关而改变。

详情只有三行：

| 行 | 内容和行为 |
| --- | --- |
| 机器／目录 | 展示「本机」或当前 space 已登记的远程机器名；目录优先取打开时的当前终端 cwd，再取同标签终端、space 的 folder。目录图标提供完整路径提示和复制；下拉复用现有 space 菜单。机器是该 space 的事实，不提供把现有终端迁往另一台机器的伪切换。 |
| Open in | 本机目录使用系统文件管理器：macOS 为 Finder，其他平台用宿主可执行的系统打开方式。有多个真实可用目标才显示选择箭头；第一版不自建编辑器发现或远程挂载。远程仍显示机器和路径，本地 Open in 不可用时给出明确原因，路径可复制。 |
| Actions | 放入现有的「上次使用的动作／下拉」按钮组；没有动作时显示现有 Add action。运行、选择、添加、编辑、删除、图标、Tab／Right／Down 和自定 cwd 都沿用现有能力。弹层里保留完整动作名称，不受主工作列 compact 状态影响。 |

这是整理入口；Todo、agent 状态、space 概览、Review 链接、Git 操作和底部终端不进入详情。Files／Review 仍是现有 space 面板的两页。

机器行采用 Herdr 已有的 space 菜单，而非 T3 的运行环境选择器。这一适配遵循 [ADR 0001](../adr/0001-trade-off-order.md)：只用 mod API，不模拟不存在的会话迁移能力。

## 2. 布局与交互

```text
面板关闭： 主工作区标题                    [详情] [面板] [窗口按钮*]
面板展开： 主工作区标题 [详情] │ Files / Review [放大] [面板] [窗口按钮*]
面板放大：                    Files / Review [恢复] [面板] [窗口按钮*]
```

`*` 仅宿主要求自行绘制窗口按钮的平台显示；Lists 的新建标签 `+` 和现有 Home／隐藏侧栏规则继续生效。

| 操作 | 结果 |
| --- | --- |
| 点击详情 | 在按钮下方、靠窗口一侧对齐打开 popup；再点收起，使用现有 `pressed`／`justClosed` 处理「外点先关闭、click 又重开」的竞态。 |
| 打开 Actions 下拉 | 复用既有菜单与键盘导航；子菜单的 Escape 先关子菜单，下一次才关详情。执行动作前收起相关弹层，再交还给目标终端／新开的终端。 |
| 编辑或新增动作 | 收起菜单与详情，再打开现有编辑器；保存后更新同一份 Actions 数据。删除继续经过现有确认流程。 |
| 点击弹层外部／Escape／关闭快捷键 | 关闭最上层 popup；不关闭背后的终端标签。键盘打开时，关闭后恢复触发入口或原可用焦点。 |
| 点击面板按钮 | 沿用 `togglePanel()`：恢复该 space 上次的页，或隐藏；隐藏放大的面板时恢复工作列。 |
| 放大／恢复 | 沿用 `toggleWide()`；放大时保留面板头的恢复与开关，整个工作列仍按现有方式隐藏。 |
| 切换 Files／Review | 只恢复该页自己的内容与阅读状态，按 [ADR 0015](../adr/0015-panel-pages-stay-independent.md) 保持独立。 |

保留 `cmd-alt-b`、`cmd-shift-g`、面板内 `cmd-w` 的现有含义。按用户后续决定，删除 `cmd-shift-b → t3-tabs.sidebar`，改为 `cmd-shift-b → t3-tabs.details`：打开／收起详情弹层。Inbox／Lists 继续通过现有侧栏按钮切换，不另配替代快捷键；详情也可通过现有 Tab stops、Enter／Space 操作。

详情命令由始终显示的 keys 副本路由，和点击入口共用上下文计算与 popup 生命周期。面板放大时先恢复工作列再打开详情；Home 依原有规则不提供 Actions 上下文。既有 popup／编辑器在最上层时，先遵守其键盘上下文，避免打开第二份详情。

切换 space／标签后，已打开的详情不应继续操作旧位置。打开时传递轻量的来源快照；执行前核对 space／tab／terminal 是否仍有效以及是否仍为当前上下文，失效则关闭并提示重开。无需增加后台轮询。

## 3. 实现落点：复用三个现有 mod

原生布局的两个位置交替承载同一套面板控件，达到窗口右上角的稳定位置；不使用 root floating、全屏透明捕获层或重建终端。

```text
tabs-row
├── tabs            t3-tabs：既有标题、标签
├── actions         t3-actions：改为详情入口，保留这个常驻副本
└── tabs-end        t3-tabs：工作列末端控件

panel-head          原 block 改为 40px row
├── panel-pages     t3-chrome：Files / Review 页签和状态
└── panel-end       t3-tabs：面板末端控件
```

`t3-tabs` 的 end renderer 增加工作列／面板两个明确的渲染位置：面板关闭时，工作列末端画面板开关和平台窗口按钮；面板打开时，这些移由 `panel-end` 绘制，工作列保留详情。放大／恢复只在面板末端出现。一个 renderer 负责平台按钮和面板控件，避免在 `t3-chrome` 再复制一份。

`panel-end` 的键盘焦点必须有自己的原生 key context：用宿主已提供的 `key_context`、`cx.bind_keys` 和 `on_action` 将面板头内的关闭键路由到隐藏面板。不能直接沿用整个 `t3-tabs` 的全局 `close-tab`，否则 Tab 走到面板头后按 `cmd-w` 可能关掉背后的终端。工作列末端与面板末端的关闭行为分别验证，不覆盖全局布局键位。

| 路径 | 改动 |
| --- | --- |
| `mods/t3-actions/main.js` | 增加 layout 专用详情入口和 `actions: "details"` popup 分支；同一 mod 内复用现有 Actions control／menu／editor／confirm。无 props 的独立 Actions 控件继续服务单独发布的产品，不作为本布局的旧行为开关。 |
| `mods/t3-tabs/main.js` | end renderer 按位置绘制；面板开关回归布局统一提供；读现有 Review 状态显示关闭时的提示。保留 keys 副本和 Home／Inbox／Lists／zoom 逻辑。 |
| `keys.json` | 将 `cmd-shift-b` 从 `t3-tabs.sidebar` 改为 `t3-tabs.details`；其余布局键和 popup 关闭键保持原语义。 |
| `mods/t3-chrome/main.js` | `panelHead` 只负责页签和 Review 页签状态；原放大、关闭按钮移交 end renderer，关闭入口换为同一个面板开关图标。 |
| `extras/mods/pulls-review/main.js`、`bar.js` | 退出本布局专用的 `toggle` 模式，保留单独安装时的计数栏；状态职责交接见下节。 |
| `layouts/herdr-t3.json` | `actions` 改 props 为详情入口；`panel-head` 拆成页签和 end 两个原生 block，各自保留 window drag 区域与按钮的事件阻断。保留 `work`、`panel`、`panel-body`、`files`、`review` 等身份。 |
| `scripts/update.sh`、`scripts/check-update.sh` | 迁移旧的布局级 Review toggle 栏，统一按钮；保留 extra 的 Review 页、个人主题、焦点色、stack 选择及 theme-export。更新幂等性和唯一 id 检查。 |
| `scripts/demo/stage.sh`、相关 scene、demo-stage、poster 与布局预览 SVG | 跟随新头部结构和详情打开路径；旧 Actions 顶栏截图、Review toggle 注入不再描述新布局。 |

现有 `t3-actions` 常驻副本仍接收 `delete-action:<id>`，避免只把 Actions 放进按需 popup 后，删除确认发出的命令无人处理。它随 Home 的隐藏和已有生命周期继续工作，不额外增加一个零宽常驻副本。

公共代码仍从 `shared/` 改源，经 sync 分发；本轮优先保持 Actions 新分支为 mod 私有实现。新建局部文件时避免与 `shared/*.js` 同名，否则 `check.sh` 会把它当成必须相同的副本。

### Review extra 的交接

目前 `pulls-review` 的 `toggle: true` bar 既画面板按钮，又在启动时清掉上次残留的 Working 状态。统一控件时一并处理：

- 本布局不再靠 `reviewToggle(layout())` 判断谁拥有开关；`t3-tabs` 是唯一的布局级按钮实现，关闭时仍显示现有 Review 状态提示，展开后由 Review 页签承载。
- `scripts/update.sh` 按本布局中 `content.mod === "pulls-review"` 的旧顶栏块识别迁移，兼顾旧 `review` id、自定义 block id 和无 `toggle` 的早期安装；仅退出本布局的顶栏插入，保留 extra 文件和 Review 页。
- 将本布局清理跨重启 Working 残留的职责移交到始终显示的布局 keys 初始化；单独安装的计数栏仍保留自己的初始化清理。复用 Review 原有状态上报，不新增 Git 查询或 timer。
- `pulls-review` 在 Herdr 自带布局中的计数栏仍是有效产品能力。对应代码与独立安装说明继续保留；只更新其中 Herdr T3 接入段。

这是对 [ADR 0011](../adr/0011-one-space-panel.md) 的顶栏入口归属、及 [ADR 0012](../adr/0012-each-space-keeps-its-panel.md) 中「面板头自行画控件」的局部修订；space 级状态、唯一面板、独立页面均保留。实施时用新 ADR 明确取代这些具体条款。

## 4. 数据、视觉与宿主约束

**数据。** `KEY.actions`（当前为 `t3-actions.actions`）、动作 id、字段、`last`、原迁移链，以及 `t3.panels` 的结构全部复用。来源快照、popup id、当前子菜单只记本次运行的内存；打开的详情不写入 `localStorage` 或共享持久状态。跨副本的关闭时间戳沿用 `t3-actions.<用途>Closed` 约定。若增加这一记录，先更新 [storage.md](../internals/storage.md)。

**执行。** Actions 的 cwd 优先级仍是显式配置（含 `~` 展开）、来源终端 cwd、同标签终端、space folder。popup 的键盘焦点不等于执行目标，不能用弹层内临时焦点替换来源。系统打开目录使用 `exec` 参数数组，并处理失败；远程路径不传给本机 Finder。现有通过 `sh -c` 执行动作的限制继续如实说明，不借本轮重写跨平台 shell。

**视觉。** 顶栏继续 40px；两个布局入口 28px、图标 16px，使用 `shared/button.js` 的 `sm` 与 focus／tip helper。详情宽度参考 T3 的 280px，外壳圆角 16px，以 `frame: "none"` 和主题色绘制；菜单使用现有 8px 圆角、28px 行、4px 内边距。Actions 保留现有 split control 的尺寸和描边（按钮组是 ADR 0016 的明确例外）。弹层内普通控件采用 `card` 底面；开启态、hover 和焦点环分开。图标只引用该 mod 自己的 `icons/` 或宿主资源。

**宿主。** `openOverlay` 的 popup、顶层 Escape、`mod:t3-actions` 的关闭键绑定与既有 submenu 实现是基础。最先在隔离 demo 中验证父子 popup 的关闭与焦点归还；以宿主已支持的模式完成，不为 T3 的玻璃效果、弹出缩放或窄屏 sheet 增加模拟层。面板 min width、拖宽和页面布局继续服从现有 ADR，不照搬 T3 的 980px 响应式状态机。

## 5. 分批实施与完成标准

每批先改对应文档，再改实现；行为检查先复现目标差异，再做最小修改。每批结束执行仓库规定的 sync、检查与 demo 验收，复用已有效的证据。

1. **原生弹层与执行上下文。** 为 Actions 增加详情 popup，完成三行、本地／远程可用性、按需关闭、来源校验、完整动作名和现有编辑／删除流程。先保留当前面板控件。完成标准：实际 demo 的三个入口可用，嵌套 Escape 不关闭终端，动作启动目录／位置正确，详情前后终端几何不变。
2. **统一两个头部位置。** 接入详情触发器，拆出 panel-end，移动放大和平台窗口按钮，处理 Review extra 与旧安装迁移。完成标准：面板关闭／展开／放大时均只有一组正确的面板与平台控件；装／不装 extra 均正常，Review 状态不丢失，反复更新不重复插入块。
3. **全布局回放与发布同步。** 补齐 Home、Inbox、Lists、隐藏侧栏、终端分屏／zoom、本地／远程、空 Actions／多 Actions、浅色／深色、默认侧栏宽度及窄宽度回放。完成标准：所改模块相关检查通过，`scripts/check.sh` 输出 `all checks passed`，原生 demo 整窗图可见完整内容与控件，记录真实点击尚未覆盖的项目。

最小测试落点：`mods/t3-actions/check.cjs` 锁住来源与执行行为；`mods/t3-tabs/check-buttons.cjs` 覆盖两个 end 位置、面板头关闭键不关闭背后终端、Windows glyphs；keys／命令回放确认 `cmd-shift-b` 不再切换侧栏模式、按需切换详情且放大状态可进入；`shared/check-panel.cjs` 复用原状态恢复回放；`scripts/check-update.sh` 补旧绑定覆盖、extra、个人配置、幂等和 id 唯一性。原 HTML 回放只证明示意，不能替代原生 mod 检查与整窗截图。

## 6. 文档、同步与清理

- 更新 `GLOSSARY.md` 的 Action 入口定义、详情弹层新术语；新增上述 ADR，修订受影响的旧条款。词汇继续用 space／agent／Action／space 面板，不引入 thread。
- 在快捷键表和 changelog 明确 `cmd-shift-b` 改为详情、Inbox／Lists 使用侧栏按钮；更新脚本合并该键时按既有机制报告替换，其他个人键位保留。
- 同步更新两份 RECIPE、两份 CHANGELOG、两份 README 中相关介绍，以及 `docs/user/guide*`、`docs/user/extras*`。用户文档只解释看见什么、如何操作，链接遵守两类文档受众分离。
- `scripts/sync.sh` 会写入安装目录及 `herdr-t3-inbox`、`herdr-t3-actions`、`herdr-pulls-review`。实施前记录这些工作树的改动；同步产生的实际改动在各自仓库完成检查和提交，不把它们误认作主仓库已提交。
- 移除本布局旧的 Actions 顶栏运行组、Review 专用 toggle 插入与抑制分支、`t3-chrome` 重复的面板操作，以及失效 demo／截图说明；保留单独发布产品仍使用的默认 Actions 与 Review 计数栏。
- 依 [ADR 0008](../adr/0008-change-behaviour-without-toggles.md) 直接更新布局行为，不提供“旧顶栏／新弹层”偏好开关；持久数据沿用原名，旧布局结构迁移只针对受影响的块。个人数据、主题、焦点色与已有 extra 保留。
- 提交采用 Conventional Commits；本轮只交方案，实施与 push 由用户后续决定。实施结束清理本任务的 demo、后台进程、临时文件与辅助 worktree。

Ryūgi 可作为方案批注与设计／结果对照的载体；它不是产品依赖，也不替换仓库的原生 demo、测试、审查和交付门禁。安装或接入 Pi 不属于这次改造的前置任务。

## 7. 当前证据与尚待实跑

已核对仓库 AGENTS、术语、全部 ADR、storage／tokens、相关 mod、keys、sync／update／demo／检查入口，以及安装的宿主类型说明。原型已验证三行 popup 与终端宽度不变。没有执行产品构建、sync 或修改实际布局。

开始实施时首先实跑父子 popup 的点击／键盘关闭和焦点返回，确认来源信息在各平台的读法；macOS 以外的平台窗口按钮需要对应平台实跑证据。独立核查 agent 因“共享上下文 owner 不可用”未能启动，本方案由主 agent 直接核对，未声称已有独立复核。
