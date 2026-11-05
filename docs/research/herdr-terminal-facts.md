# Herdr 终端能力事实清单

## 结论

- `panes()` 给的是 Herdr 窗口中的 pane；其中终端 pane 的 `program` 按当前运行程序识别，`title` 是终端标题，`cwd` 是实时目录。`terminals()` 则覆盖 Core 的终端，包括没有 pane 的子 agent；它没有 `foreground` 字段。读取前台进程需调用 `hc get <terminal> --json`。
- 本次首次快照有 21 个 pane；`hc ls` 有 37 个本机终端及 1 个 `kvm/t4`。差额由 16 个子 agent 和 1 个远端终端构成。没有 pane 的终端可通过 `terminal.keep` 分配 pane，也可用 `terminal.peek` 临时查看；`terminal.show` 的定义是将一个终端暂时替换进 pane。
- `pane.focus` 的 API 接受 pane id 或 terminal id；类型文档没有保证跨 tab、跨 space、zoom 或远端目标的具体切换效果。本次未执行会改变用户界面的焦点命令。
- 命名函数优先使用终端 label `pi.session`。可查到 label 和 title 的当前值，但现有字段没有 label 新鲜度/会话存活标记；Pi 退出后的残留是否发生，本次未实测。
- Picker 只搜索 space、tab 名和关联 agent 的程序名；Inbox 的 Search 按钮已调用 `mod.open` 打开 picker。自定义 overlay 有现成先例。全局按键可绑定 `mod.open:<名称>`。
- `hc get` 提供前台进程、运行状态及结束后的退出码；`terminals()` 未暴露前台进程，也没有通用输出活动/程序崩溃事件字段。agent 状态来自程序主动报告，不等于一般进程退出状态。

## 证据与逐项记录

### 1. pane 程序、标题、目录和前台进程

- **类型定义：** [herdr.d.ts](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:139>) 的 `Program` 含 `name`、`key`、`shell`、`agent`；[PaneInfo](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:183>) 的 `title` 是终端设置的标题，`cwd` 是实时目录，`program` 为 `Program`。文档称 `panes()` 返回所有 tab 中的 pane 且数据 live（第 205–207 行）。
- **前台程序语义：** [安装指南](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:733>) 说明每个 pane、agent、terminal 都有 `program`，并按终端当前运行的程序识别；没有报告程序时才回退到启动程序。`hc get` 是终端级信息源。[t3-tabs](</Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-tabs/main.js:68>) 在弹确认框时用 `hc get <terminal> --json` 读 `foreground.pid/name`；每次确认按需调用，并非固定轮询。成本为一次异步 `hc` 命令/RPC；本次没有量测耗时。
- **t3n 实测：** `herdr-app ls` 中 t3n 对应 pane `peeb082dfbe7a5678d7874e816994d22b`；pane 的 `status`、`app`、`name` 均为 `null`。紧接着 `hc get t3n --json` 输出 `argv:["/bin/zsh","-l"]`，`foreground.name:"lazygit"`，`foreground.argv:["lazygit"]`，`exit_code:null`，title 为 `π - herdr 重复 worktree - Engineer`，label `pi.session:"herdr 重复 worktree"`。启动命令是 zsh，前台进程是 lazygit；API 的 `Program` 定义中 `key/name` 是程序表的识别结果，未在本次对 t3n 的 pane `program` 对象直接读到其具体值。`hc ls` 人类输出把它显示为 zsh。
- **pane 对象值及实时变化：未查实。** 曾按许可短暂加载只读临时 mod 读取 `panes()` 的 t3n 对象，但输出文件是 `{}`，未取得对象值；随后关闭 overlay、删除临时 mod。故不能据此报告 t3n 的实际 `program.name/key/shell`，也未捕获同一 pane 从 lazygit 切回 shell 的变化。API 说明 `panes()` 数据 live；安装指南称 `program` 跟随终端当前运行程序。`terminals()` 返回结构与 `hc ls --json` 相同，类型文档列举 address/argv/name/parent/labels/state/status/report/program，没有 foreground（[herdr.d.ts](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:214>)）。读取 `foreground` 可直接 `hc get`；[t3-tabs 样例](</Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-tabs/main.js:73>) 为每次确认调用一次异步 `hc get`，实际耗时未量测。

### 2. pane 与终端数量、无 pane 终端

- **计数快照：** 最初执行的 `herdr-app ls` JSON 中有 21 个 terminal pane（其中 20 个 agent，另一个是非 agent pane）；同一时段 `hc ls` 显示 37 个本机终端和 `kvm/t4`。因此本机无 pane 的差额为 16；当时 Core 列出的 16 个子 agent 全部有 `parent`，另有一个 pane 外的 `kvm/t4`。清单变化是实时的，后续快照已有新增用户终端，不能把不同时间的计数相减。
- **无 pane 示例：** 首次 `hc ls` 列出诸如 `t1f8`（parent `t1f6`）、`t1gc`（parent `t19f`）和 `kvm/t4`。它们不在 `herdr-app ls` 的 pane 终端列表中。`hc ls` 文档说明其列出 Core 终端及子 agent；`terminals()` 文档说明其覆盖 Core 全部终端。
- **能否打开：** 命令说明提供 `terminal.keep {terminal, place?}`（给无 pane 子 agent 一个 pane）、`terminal.peek {terminal}`（在 tab 上方预览并提供 keep/close）和 `terminal.show {terminal?, pane?}`（临时替换 pane 内容）。来源：[命令清单实测](命令 `herdr-app commands`)，及[安装指南](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:561>)。本次未实际执行这些改变界面的命令。
- **是否属于“用户要找的”：** 事实层面，子 agent、后台 worker 和远端 Core 终端都可存在于 `terminals()` 而不在 panes；后台终端由 `hc run --bg` 创建。Herdr 指南将 unlabeled worker 描述为隐藏终端，并明确有 `terminal.keep` / `terminal.peek` 操作；是否纳入目标列表取决于产品范围，本次不作推荐。

### 3. `pane.focus` 的范围、zoom 与远端

- **命令及字段：** `herdr-app commands` 输出 `pane.focus` 参数可为 `pane` 或 `terminal`；`panes()` 是所有 tab 的 pane（live），pane 包含 `tab` 和 `zoomed`。类型文档说明 pane 的 machine-qualified id 带机器前缀（[herdr.d.ts](</Users/jinjiebewater/.config/herdr-app/mods/t3-inbox/gpui-kit.d.ts:22274>)）。
- **已知行为：** 类型定义称 `pane.focus {terminal}` 优先聚焦布局中第一个可见的 terminal block，其次是 model pane；聚焦布局 terminal block 时 `focused().pane` 和 `focused().shown` 为 null，隐式 zoom/go/swap 等操作会失败（[herdr.d.ts](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:219>) 第 219–224 行）。
- **未实测/未由当前字段说明：** 从 Inbox 直接聚焦另一个 tab/space 的 pane 后窗口实际选择过程；目标 pane 已被 zoom 时会否取消 zoom 或失败；对其他机器 pane 的真实聚焦结果。`pane.focus` 实测会改变当前窗口，不在本次测试范围内。类型信息仅证实远端 pane id 有 machine 前缀、`pane.focus` 接受 pane/terminal id；未发现关于这三种情况更具体的保证。

### 4. Pi 名称残留与可判旧性

- [name.js](</Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-inbox/name.js:20>) 建立终端 label 快照；第 36 行优先返回 `labels["pi.session"]`，之后才考虑命名 tab、可辨 title 或程序名。因此若该 label 在 Pi 退出后仍留在终端上，它会被当作当前名字。
- 本次 `hc get t3n --json` 实测确有 `pi.session` label 和 Pi 格式 title；但该终端的前台程序是 lazygit，所以这只能证明标签和标题可以与当前前台程序不一致，不能证明 Pi 已退出或字段是残留。
- `terminals()` 暴露 labels、state、status、report、program 等 Core 终端字段，但文档没有 label 写入时间或 Pi session 存活字段；`title` 是终端标题。现有已检查字段不足以判定某个 `pi.session` 是否陈旧。Pi 退出后的残留行为未实测。

### 5. Picker、命令、overlay 和快捷键

- 安装的 [picker/main.js](</Users/jinjiebewater/.config/herdr-app/mods/picker/main.js:63>) 通过 `agents()`、`spaces()` 和 `terminals()` 组装菜单，但过滤条件只匹配 space 名、tab 名和 tab 内 agent 的程序名（第 73–80 行）。按 Enter/点击选中后调用 `tab.select` 或新建 tab/space（第 101–106 行）。没有按任意终端搜索/跳转的现成能力；没 pane 的子 agent也不是单独可选终端行。
- `herdr-app commands` 有 `agent.focus {terminal}`（agent，包括子 agent）、`terminal.keep`、`terminal.peek` 和 `terminal.show`，但未见针对任意终端的搜索式选择器命令。`terminal.search` 是当前焦点终端的屏幕/scrollback 文本查找，不是终端列表搜索（命令清单输出）。
- [Inbox Search 按钮](</Users/jinjiebewater/.config/herdr-app/mods/t3-inbox/main.js:1177>) 点击时执行 `run("mod.open", { name: "picker" })`。当前全局键位也将 `cmd-p`、`ctrl-alt-g` 和 `ctrl-alt-w` 绑定到 `mod.open:picker`（[keys.json](</Users/jinjiebewater/.config/herdr-app/keys.json:17>)）。安装指南的键位章节说明 `global` 可绑定 app command，命令支持 `mod.open` 和 `mod:<name>` 分区。
- **自定义 overlay 先例：** picker 本身用 `mod.json` 配置 popup overlay（[picker/mod.json](</Users/jinjiebewater/.config/herdr-app/mods/picker/mod.json>)）；[pulls-review](</Users/jinjiebewater/my/personal/projects/herdr-t3/extras/mods/pulls-review/main.js:11>) 既可作为 pane/bar，也可在 `props.overlay` 下启动 overlay 流程，配套 `mod.json` 声明 popup。`t3-actions` 也根据 overlay props 在同一 mod 内切换 menu/editor overlay（[main.js](</Users/jinjiebewater/my/personal/projects/herdr-t3/mods/t3-actions/main.js:177>)）。这些是已存在的 mod 自定义 overlay 用法。

### 6. 程序退出、退出码和输出活动

- `hc get <terminal> --json` 实测结构含 `foreground`、`state`、`exit_code`、`finished_ms` 和 `screen`；t3n 当前 `exit_code:null`、`state:"live"`。结束后退出码是 terminal 记录字段，但本次未用用户已有终端制造退出验证。
- `terminals()` 文档说明返回 Core 终端信息并随变化 live；该接口没有专门列出 `foreground` 或输出活动字段（[herdr.d.ts](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:214>)）。
- 安装指南将 agent 定义为通过 OSC 7501 报告状态的终端；该状态用于 agent 状态（working/blocked/done/idle），不代表任意 dev server 的通用存活/退出码事件（[AGENTS.md](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:150>)）。本次检查的 `herdr` API 未发现通用进程结束回调、退出码事件订阅或输出活动通知字段。用 `hc get` 轮询可读取进程信息，但轮询间隔、开销及输出活动判断能力未测。

## 检查范围与安全记录

- 只读检查：仓库 mod、安装目录 API/指南、`herdr-app commands/status/ls`、`hc ls/get`。
- 仅启动并清理了本任务自己的 `/tmp` 临时 hc 终端；未操作 t3n 或其他已有终端。曾短暂加载只读临时 mod 查询 t3n；已关闭 overlay、删除 mod 和临时输出文件。未调用会改变 pane 焦点的命令。收尾 `herdr-app status` 的 `errors` 为空且无 overlay。
- 最后一次 `herdr-app status` 的 `errors` 为空、无 overlay。窗口焦点在任务过程中发生变化；本任务没有发送焦点/窗口切换命令。
