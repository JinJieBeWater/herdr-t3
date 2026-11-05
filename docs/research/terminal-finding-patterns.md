# 找回非 agent 终端程序：产品模式与证据

## 结论

官方资料显示，终端程序的找回入口主要有五种：按键呼出的搜索/切换器、可浏览的终端或 session 列表、按最近使用回跳、把前台程序/任务状态放进现有列表，以及把长期命令作为可恢复的命名 session。无需让所有终端长期占据一个注意力面板：tmux、VS Code、iTerm2、Warp、cmux 都提供按需调用的入口；WezTerm、Zellij 则把切换列表做成临时 launcher 或浮动 session manager。资料没有证明哪种方式对 lazygit、dev server、nvim 这类普通进程普遍最好。

证据更充分的字段包括终端/tab 标题、session 名、当前或最近命令、目录、运行状态和最近使用顺序。只有少数产品能在入口处直接呈现 agent 状态；多数通用终端没有 agent 与普通程序的原生分类。各产品资料对崩溃与普通退出的区分也有限。

以下“一步/两步”按资料描述的操作路径计数：快捷键/命令呼出列表，再选中目标通常是两步；直接焦点切换或专用键跳转算一步。产品自定义键位、版本和布局可能改变路径。未查到表示本次所查一手资料未明确说明，不代表产品一定不支持。

## 产品记录

| 产品 | 入口形态与按什么找 | 跳转 | 长期运行程序与异常状态 | Agent 与普通终端 |
|---|---|---|---|---|
| [cmux](https://cmux.com/docs/configuration) | 左侧 workspace 列表；⌘B 切换，⌘F 全局搜索，⌘⇧P 命令面板。搜索 workspace/branch 元数据及终端、prompt、transcript 内容。 | 从搜索结果进入 workspace；通常呼出+选择两步。 | Workspace 可显示程序状态；发布说明列有 idle、working、blocked、done、error。Cloud 机器可生成名称并设置显示标签。未查到崩溃专门提示。 | Agent 在终端 workspace 中运行，状态可见于 workspace 列表；没有证据表明普通进程另有分类。[配置与搜索](https://cmux.com/docs/configuration) · [发布说明](https://github.com/manaflow-ai/cmux/releases) |
| [Superset](https://github.com/superset-sh/superset/blob/main/apps/docs/content/docs/terminal-integration.mdx) | Workspace 内有终端 tabs，侧栏 Sessions 区可见外部 CLI/自动化创建的 session；本次资料未说明搜索字段。 | 选 session/tab；步数未说明。 | Pane 标题可双击改名；应用重启后恢复进程、输出历史和 scrollback。进程结束后可在原 pane 开 shell，旧输出保留。未查到崩溃提示。 | Agent 与终端同属 workspace 的功能；未查到侧栏按 agent/普通终端分类的规则。 |
| [Conductor](https://www.conductor.build/docs/reference/big-terminal-mode) | Workspace 为主要入口；⌘⇧T 打开 Big Terminal Mode，终端支持 tabs 与 preset。未查到搜索/quick pick。 | 打开模式并选择 tab；具体步骤未说明。 | Session 可重启恢复；tab preset 可启动常用命令或 agent。命名、进程状态与崩溃提示未查到。 | Agent chat 与 Big Terminal Mode 是不同入口，可在同一 workspace 使用；未查到普通程序状态分类。 |
| [Zed Agent Panel](https://zed.dev/docs/ai/agent-panel) | 命令面板创建 thread；侧栏按项目分组，可选 thread。未查到按 thread 字段搜索。 | 先打开/聚焦 Agent Panel，再选 thread；具体跳转步数未说明。 | 显示工具活动指示；可有 terminal thread。未查到长期普通进程命名或崩溃提示。 | Agent Panel 与 [Terminal Panel](https://zed.dev/docs/terminal) 分开；Agent Panel 也可承载 terminal thread。 |
| [Zed Terminal Panel](https://zed.dev/docs/terminal) | 快捷键切换 panel；多个 terminal 以 tabs 显示，也可从命令面板新建。Shell 可用 OSC 设置标题。 | 打开 panel 后选 tab。未查到搜索或最近使用入口。 | 可命名标题；任务可在 terminal 执行。未查到进程状态/崩溃提示。 | 与 Agent Panel 分开管理。 |
| [VS Code Terminal](https://code.visualstudio.com/docs/terminal/basics) | Terminal 面板的 tabs 提供名称、图标、颜色、分组装饰；可由命令面板或快捷键打开。另有 [Focus Terminal](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/terminal/browser/terminalActions.ts) 快速选择入口，以及 [Quick Open `term ` 前缀](https://code.visualstudio.com/updates/v1_16) 列出终端。资料未明确这些 picker 匹配哪些字段。 | 打开 picker、选中目标，通常两步；直接切换焦点需快捷键配置。 | [后台任务终端](https://code.visualstudio.com/docs/agents/run/tools) 可查看输出或 Show Terminal；未显示的后台终端在命令结束后清理。异常结束显示错误与退出码。终端 tab 可命名。 | Agent 命令可在 chat 或集成终端执行；后台终端可由 agent 命令启动。未查到专门 agent/普通终端分栏规则。 |
| [tmux `choose-tree`](https://github.com/tmux/tmux/wiki/Getting-Started) / [`find-window`](https://github.com/tmux/tmux/wiki/Formats) | `Ctrl-b s` 列 session，`Ctrl-b w` 列 window/pane；tree 可按名称搜索。`find-window` 匹配 window 名。 | Tree 中方向键+Enter；find-window 找到后切换，通常两步。 | 可重命名 session/window；未查到内建长任务状态或崩溃提示。 | 未查到内建 agent 分类。 |
| [sesh](https://github.com/joshmedeski/sesh) | 可接 fzf popup 选择活跃 tmux session、配置 session、zoxide/目录搜索结果；显示 session 名、来源、路径和 active window。 | 选择后连接；若不存在可创建。 | 可用 alias、图标、window 名辨识；活跃 session 支持预览。未查到崩溃/完成提醒。 | Agent skill 可教 agent 复用 session/window；picker 未见 agent 状态分类。 |
| [Zellij Session Manager](https://zellij.dev/documentation/session-manager-alias.html) | 默认 `Ctrl-o` 再 `w` 打开浮动 session manager；显示活跃 session 元数据。官方资料未明确搜索字段。 | 选 session 切换；通常两步。 | session 命名；[Session Resurrection](https://zellij.dev/documentation/session-resurrection.html) 会列出 EXITED session 并可恢复，重跑命令前有确认横幅。未查到崩溃原因分类。 | [插件](https://zellij.dev/documentation/plugins.html) 可渲染 UI、响应状态、控制 Zellij；未查到原生 agent 分类。 |
| [WezTerm Launcher](https://wezterm.org/config/launch.html) | Tab bar `+` 菜单或 `ShowLauncher` 打开 launcher；`FUZZY|TABS` 搜索当前窗口 tabs。未明确 fuzzy 匹配字段。 | 呼出、选择、Enter 激活，通常两步。 | 可把前台进程名写进 tab 标题；nightly API 可读取程序上报的 progress/error/paused 状态并自定义显示。未查到自动崩溃提示。 | 未查到内建 agent 分类。 |
| [iTerm2 Open Quickly](https://iterm2.com/documentation-menu-items.html) | `Cmd-Shift-O` 打开快速切换器；按 tab 标题、命令、主机、用户名、profile、目录、badge label 搜索并按相关度排列。 | 选中 session 即跳转；呼出+选择两步。也可从结果新开 tab 或切 profile。 | [Shell Integration](https://iterm2.com/documentation-shell-integration.html) 提供命令结束通知、退出码、目录和运行时长；未查到区分崩溃/正常退出的通知。 | 未查到 Open Quickly 内建 agent 分类。 |
| [Warp Session Navigation](https://docs.warp.dev/terminal/sessions/session-navigation) | Command Palette 的 `sessions:` 或 Session Navigation；按 prompt、当前/上次命令、命令状态搜索，按最近聚焦排序。 | 打开列表并选中，鼠标/方向键+Enter，通常两步。 | 显示当前/最近命令及状态；普通命令结束或等待密码可发通知。 | [Coding agent 通知](https://docs.warp.dev/agents/capabilities/agent-notifications/) 有 Complete、Request、Error 状态及图标；parent/child agent 状态有区分。 |
| [Ghostty](https://ghostty.org/docs/config/keybind/reference) | 配置快捷键显示/隐藏 Quick Terminal；每次针对一个 Quick Terminal。未查到 session 搜索/筛选器。 | 一键显示/隐藏并恢复同一终端。 | 可配置命令完成通知（never/unfocused/always），依赖 Shell Integration 或 shell 发 OSC 133；未查到崩溃专门提示。 | 未查到原生 agent 会话管理。 |
| [Agent Deck](https://github.com/asheshgoplani/agent-deck) | TUI 汇总 agent sessions，`/` 模糊搜索所有 sessions，`Alt+/` 限当前 group；按 `Enter` attach。另支持按状态筛选、最近使用(MRU)快捷切换及搜索对话。 | 已在 TUI：搜索+Enter；键盘导航也可一键跳到组/序号 session。 | 状态为 running、waiting、idle、error；tmux status bar 可给 waiting session 配数字键直达。主要管理 agent sessions。 | Agent 专用管理器，搜索、分组、状态与普通终端分离。 |
| [Claude Squad](https://github.com/smtg-ai/claude-squad) | TUI 管理多个 agent，各自在独立 tmux session/worktree；主入口是 session 列表和预览。README 可确认 session preview/diff review，但未明确搜索字段与最近使用排序。 | 从列表选 agent session；具体按键/步数以当前 README 为准，未在所查资料确认。 | 可 watch session、预览 diff、checkout/commit/push；遇启动 tmux session 超时的 troubleshooting 指引是更新 agent CLI。通用崩溃/运行状态提示未查到。 | 明确是 agent 专用管理器；没有证据表明普通终端程序纳入同一列表。 |

## 可复用模式与边界

1. **按需快捷切换器。** tmux choose-tree/find-window、VS Code Quick Open、iTerm2 Open Quickly、Warp Session Navigation、cmux 搜索均将列表隐藏在按键/命令后。适合偶尔找目标、减少常驻列表占用；前提是终端能被稳定命名或其元数据可搜索。弱点是大多需要记快捷键，呼出后仍需选择；VS Code picker 的匹配字段在所查官方资料中不清楚。
2. **最近终端回跳。** Warp 按最近聚焦排序；sesh 与 Agent Deck 支持 MRU/近期跳转。适合在少数活动终端间反复往返，通常比重新搜索少一步。弱点是“最近”不代表想找的那一个；当前证据中此模式主要在 session 或 agent 管理器内，而非所有产品通用。
3. **类型化固定入口或焦点槽。** Zed 按 Agent Panel/Terminal Panel 分开；Ghostty Quick Terminal 是一键显隐的独立终端；VS Code 后台 task terminal 可通过 Show Terminal 回看。适合少数稳定角色或特定任务类型。弱点是固定槽数量有限；未提供按运行程序内容检索的普遍能力。
4. **在既有列表中标记程序上下文。** iTerm2 可按命令、目录、标题、badge 搜索；WezTerm 可显示前台进程标题；Warp 可显示最近命令；cmux 可显示 workspace 状态。适合避免新增常驻列表，用已存在的标签/搜索结果暴露“这里跑着什么”。弱点是命令/OSC 上报的可靠性、更新时机与标题可读性因 shell/程序而异；状态通常不等于崩溃诊断。
5. **命名且可恢复的长期 session。** Superset 保留进程及 scrollback；Zellij 可恢复 EXITED session；tmux/sesh 提供可命名 session；Conductor 支持 session 重启恢复。适合 dev server 等长运行任务，能从“终端在哪”转为“服务 session 叫什么”。弱点是命名主要依赖用户或启动 preset；恢复退出命令不等于发现退出原因。
6. **Agent 专用状态看板。** Agent Deck、Claude Squad 把 agent 放入专用管理入口，Agent Deck 还能筛 waiting/error 并快捷跳转；cmux、Warp 把 agent 状态放在工作区/会话视图中。适合将 agent 待处理事项与普通 shell 工作区分。弱点是 agent 管理器不能据此找普通 lazygit/dev server/nvim；状态语义通常来自 agent 集成，并非一般前台进程的通用状态。

**证据边界：** 来源是厂商/项目官方文档、源码或发布说明；没有在本次运行产品逐一实测。某些产品文档只说明列表入口而不说明精确匹配算法、跳转键数、普通进程状态或崩溃区分，表中已标记未查到。`WezTerm` 的进度接口标记为 nightly；产品版本会影响键位和细节。
