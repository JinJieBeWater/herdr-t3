# Inbox Terminals 交互方案独立评审

**推荐先做按 pane 查找的切换器，接现有 Inbox Search 和 T3 布局内的 `cmd-p`，并在空查询时提供“回到上次切换的来源”。暂缓默认展开、包含空闲 shell 的全局 Terminals 列表。** 原方案的优势是看见目标后一击直达；缺口是长列表的辨认成本，以及跳走后怎么回来。当前只有一个非 agent 终端的快照，不足以证明需要一份常开的全局清单。

这是方案评审，没有运行或修改实现。委托方提供的快照是 21 个 pane 中仅一个非 agent 终端 `t3n`，实际运行 lazygit，名称残留旧 Pi 会话；本评审未重新采样该会话。

**已确认的现状与根因**

- Inbox 的数据是 `agents()` 加请求 `inbox: true`、且所在 tab 没有 agent 的 mod pane；普通终端没有入口。[来源](../../mods/t3-inbox/main.js#L348)
- 官方 picker 一行一个 tab，只匹配 space 名、tab 名和其中 agent 的程序名，选中执行 `tab.select`。所以把 lazygit 开在已有 agent 的 tab 里，搜 `lazygit` 找不到，也不能指定那个 pane。[过滤与跳转](</Users/jinjiebewater/.config/herdr-app/mods/picker/main.js:63>)
- tab 的代表 pane 优先取 agent；共享命名又无条件优先取 `pi.session` 标签。程序改变后，旧会话名仍可能盖过程序名。加一个入口时必须明确显示当前程序，不能只复用这个名字。[tab 代表](../../mods/t3-tabs/main.js#L64)、[命名优先级](../../mods/t3-pane/name.js#L21)
- `inbox: true` 的 mod 卡片表示可关注、可 Settle 关闭的对象；dev server、nvim、lazygit 不具备这个约定，不能借它们的卡片模型混入。[规格](../../RECIPE.md#L40)

**原方案的场景走查**

起点：Inbox 已显示，焦点在 A；目标 pane 不可见，跳过去后 A 也不可见。一次点击、快捷键或输入一段查询各记一步；扫描、滚动另列，不能靠少算这部分证明更快。同 tab 的两个 pane 若都可见，直接点目标本来就是一步。

| 场景 | 去程：步骤与视线 | 回 A：步骤与视线 |
| --- | --- | --- |
| A → B 项目的 dev server，当前是 All spaces | 看侧栏下部 Terminals，辨认程序、B 的 space、tab，点击：**1 步**，另加扫描/滚动 | 找 A 卡片并点击：可见时 **1 步**；A 若仍在默认折叠的 Working，先展开再点：**2 步**，另加滚动 |
| A → B，Inbox 只过滤了 A 的 space | 若 Terminals 遵守过滤，先点过滤器、All spaces，再点目标：**3 步**，另加扫描/滚动 | 同上；filter 已变成 All spaces |
| A → 当前项目的 lazygit | 在同一个全局列表辨认项目与程序，点击：**1 步**；不是只扫描当前项目 | 同上；没有保存来源，仍需重新找 A |

A 在折叠 shelf 中时只有“正在看它”才露出来，离开后会收起。[折叠规则](../../mods/t3-inbox/main.js#L452) 普通终端通常没有 Inbox 的 `inView`；这时 `cmd-]` 取首项、`cmd-[` 取末项，**不能保证返回 A**。有 parent 关系的终端可能映射到祖先，但那也不是历史返回。[焦点映射](../../mods/t3-inbox/main.js#L355)、[快捷键实现](../../mods/t3-chrome/main.js#L18)

规模上，**0 个时应不显示这一节**；只有一个 lazygit 时，原方案确实很便宜，长期鼠标往返可能优于切换器。到了 15 个，按现有 slim 行的 30px 估算，仅行就占约 450px，再加标题，容易把 Settled 推出视口。空闲 shell 使多个 `zsh` 混在其中；多个 dev server 又可能都叫 `node` / `bun`。程序名加淡色 tab、space 图标仍未必能区分 worktree 或不同机器，应能读到项目文字、必要的目录及机器信息。记住折叠可以降低常驻成本，但下一次寻找也就增加一次展开。

**实质不同的替代，用同一组场景比较**

下表沿用上述起点；回程以 A 仍在折叠 Working 为例。切换器的查询能唯一定位目标时记 3 步；同名结果还需方向键或点击。

| 方案 | A → B server | A → 当前项目 lazygit | 回 A | 15 个 / 0–1 个时的取舍 |
| --- | --- | --- | --- | --- |
| **按 pane 的全局切换器**：程序、项目、tab、标题、目录可搜，agent pane 也可选 | `cmd-p` → 查询 → Enter，**3 步**；只看临时结果 | 同样 **3 步**，不必知道它属于哪个 agent tab | 搜 A **3 步**；若空查询默认“回到来源”，`cmd-p` → Enter **2 步** | 15 个靠查询缩小，不占常驻高度；只有一个时比可见列表多两步 |
| **当前工作上下文入口**：pane header 或 agent 卡片旁打开同 tab / 同 space 的程序菜单 | 先 `cmd-shift-b`、选 B space，再打开程序菜单、选 server，约 **4 步** | 开菜单、选 lazygit，**2 步**；先看当前 tab，再看当前 space | 从 Inbox 找 A **2 步**；若已切到 Lists，点可见的 A 行可为 **1 步** | 15 个分散在不同项目时明显减噪；0 个隐藏入口、1 个可直接显示程序。跨项目较慢 |
| **tab 栏显示所含程序，并可展开选 pane** | 切 Lists、选 B、开目标 tab 的程序菜单、选 pane，约 **4 步**，另加扫描 tabs | 在目标 tab 开程序菜单、选 pane，**2 步**，另加扫描 tabs | 与上一项相同，仍需找 A | 信息贴近容器，但只能看当前 space；15 个会挤压已有 24px tabs，0–1 个成本小 |
| **切回上一个 pane 的命令** | 首次发现没有改善，仍走现有 tab/pane 导航；已访问且正好是上一项时 **1 步** | 同左 | **1 步**，无需在侧栏重新辨认 A | 任意数量都省回程；无法解决首次找不到程序，单做不完整 |
| **短的当前上下文入口 + 全局切换器** | 全局查询 **3 步** | 当前上下文 **2 步** | 切换器的来源入口 **2 步** | 同时服务鼠标与键盘；多一个入口及分组规则，宜在单一切换器使用反馈后再加 |

上下文入口与 tab 标记的区别在于：前者从“我正在做什么”找协作程序，不要求知道其 tab；后者需要先知道或扫描容器。返回命令解决来回检查，不解决发现。单纯给原列表换排序或图标，没有这些差别。

**理念与现有交互的关系**

“Save human attention”允许导航入口存在。一个静态程序行不会天然违背理念；但默认展开的全局库存，尤其是空 shell，会在每次处理 agent 消息时都占视野。原方案把程序排除在状态、Settle、置顶、Snooze 外是正确的边界，保留这一点。

| 现有交互 | 判断与需要守住的边界 |
| --- | --- |
| `cmd-]` / `cmd-[` | 排除程序能保住处理待办的节奏，但“走 Inbox 绘制行”的规格要改称关注项顺序，避免出现可点击行却键盘跳不过去的误解；它们不承担返回。[规格](../../RECIPE.md#L51) |
| Settle / Snooze / 状态 | 程序行必须独立于 `every`、`put` 等关注项数据，不套 agent 状态。dev server 正常运行不等于 agent 的 Working；Settle 也不应停止它。[Settle 分支](../../mods/t3-inbox/main.js#L499) |
| 拖放 | 原方案并非插入几行就完成：程序区域应是明确的非投放区，清除旧 drag target，并防止拖放松手又触发程序点击。现有根节点会接收整栏的释放事件；这是待实现时需验证的集成风险。[行事件](../../mods/t3-inbox/main.js#L659)、[根节点](../../mods/t3-inbox/main.js#L1198) |
| space 过滤 | 原方案未定范围。建议若做 Inbox 列表就服从同一过滤，否则 All/某项目的含义分裂；跨项目查找交给明确标注为全局的切换器。现有“外部聚焦后放宽过滤”只认识关注项，不能自动覆盖新增程序。[过滤与 reveal](../../mods/t3-inbox/main.js#L374) |
| Clear | 现状只关 Settled agent 的 pane，同 tab 的 server 会留下；独立程序列表不应改变这个范围。Clear 为保留 space 新建的空 shell 会出现在“包含空 shell”的列表里，清空后仍有行应可理解。[实现](../../mods/t3-inbox/main.js#L1068) |
| Lists 的 Agents | 顶层仍来自 `agents()`；展开部分沿 `parent` 链展示子终端，不会枚举同 tab 的普通 split。切到 Lists 能找 agent、space，不能补齐程序发现。把全体程序塞进 Agents 会改变分组、状态、pins 和导航含义。[列表与子级](../../mods/t3-agents/main.js#L161)、[顶层来源](../../mods/t3-agents/main.js#L220) |

**最小落地建议与 API 依据**

第一步只做一个 T3 自有的 pane 切换器：从现有 Search 点开，也通过 `layout:herdr-t3` 的 `cmd-p` 打开；沿用现有输入、方向键和 Enter 交互。已有终端 pane 都能选，包括 agent，原本可查找的 mod pane 也保留，避免去程能找程序、回程找不到人。程序作为明确字段显示，space / tab / 必要目录用于消歧，保留现有名称作上下文；旧 Pi 名不能盖住 `lazygit`。dev server 没有可靠的语义类型，显示宿主暴露的程序及上下文，不承诺自动识别“这是开发服务器”。

空查询默认选中有效的“回到上次切换的来源”。只保存通过此切换器跳转前的焦点，选回后交换两端；这是有边界的回程，不是假定已有全局焦点历史。首次无来源时选当前 pane，避免 Enter 意外跳走。目标关闭或机器不可用时撤掉失效来源，选择时重新校验。

以下行号均来自已安装的 [gpui-kit.d.ts](</Users/jinjiebewater/.config/herdr-app/mods/picker/gpui-kit.d.ts:22235>)，无需新增后端 API：

| 能力 | API 与证据位置 |
| --- | --- |
| 枚举各 tab 的 pane，保留准确身份 | `panes()` / `PaneInfo`：22373–22397；`spaces()` / `TabInfo`：22276–22327。保留远程 ID，不自行拆写 |
| 显示、搜索程序与上下文 | `Program.name/key/shell/agent`：22329–22345；pane 的 title、cwd、tab：22373–22393；必要时 `terminals()` 补充 labels：22404–22407 |
| 跨 space 直达目标 pane | `run("pane.focus", { pane })`：22247–22248；现有 mod 卡片已有跨 space 约定。优先 pane ID；用 terminal 时会优先选可见 layout terminal block：22409–22417 |
| 打开临时界面、处理入口命令 | `mod.open`：22266；`openOverlay` / `closeOverlay`：22522–22558；`nextCommand()`：22585–22592。现有 picker 已示范输入与选择，无需新交互框架 |
| 保存有限回程、校验可用性 | `focused()`：22409–22417；`sessionStorage`：20565–20588、22629–22630；`machines()` 的 layout 可用性：22322–22324。未见原生 `focus.previous`，完整历史需常驻 mod 另行跟踪 |

官方 picker 是布局直接使用的 shipped mod，[RECIPE 已注明](../../RECIPE.md#L50)，API 也说明 shipped 文件会被更新替换（22263）。实施时用官方支持的 `mod.clone` 或项目自有 mod 接入口，不直接改安装目录中的官方 picker。实施范围需同步 Search 调用、布局快捷键、安装/同步路径与操作说明；保留原有 tab / space / 新建结果及其行为，新增 pane 结果只负责聚焦，不能误继承 tab 行 `ctrl-d` 关闭整个 tab 的处理。

首轮不做常驻全局清单、空 shell 常驻展示、程序卡片、进程健康状态、自动识别服务、pins / Settle / Snooze、`cmd-]` 扩容或完整焦点历史。空 shell 仍可在按需查找中找到。无 pane 的 parked 终端也不纳入首轮；API 的 `terminal.peek/keep` 可留到确有此需求时使用。

最小验收是重放两个来回场景：混合 agent tab 内的 lazygit 能按程序搜到并准确聚焦；跨 space 的 server 能按项目和上下文找到，再用 `cmd-p`、Enter 回 A。另用 15 个同名/空 shell、0–1 个程序、Working 折叠、目标中途关闭/离线检查辨认与回程；原有 Settle、Clear、拖放、过滤和 agent 导航应维持既定含义。

**推荐最可能错在用户更依赖视觉记忆与鼠标，而且长期只有一两个程序。** 这种情况下，可见列表的一击比每次查询更省注意力；应补短的当前项目入口，再看是否需要全局常驻列表。鼠标或原生 tab 导航的去程也不会更新上述有限来源，若这才是常用路径，就应做跟踪实际焦点的返回命令。另一个风险是宿主的程序识别也残留或只报 `node`：API 能提供入口，不能凭空提供可辨认的工作名称，需先实测 lazygit、nvim 和实际 server 的报告值。

未做 GUI 操作、实际程序识别采样、快捷键回程或远程/zoom/`terminal.show` 场景验收；步数是基于代码与明确假设的走查。只新增本报告，无删除、无实现改动、未运行测试、未提交。
