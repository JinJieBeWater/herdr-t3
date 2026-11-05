# T3 Code：终端与运行中程序的发现和返回

## 结论

- 上游把集成终端及其运行会话归到具体线程（并受环境范围约束）。切换线程后，当前线程的终端抽屉状态随线程切换；回到原线程可继续找到该线程的会话。线程可有多个终端，右侧面板也能将终端作为 surface 打开。[ChatView 线程终端抽屉与线程 UI 状态](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L732-L733) · [终端按线程查询](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/state/terminalSessions.ts#L234-L246) · [ChatView 终端抽屉、右侧面板](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L3927-L3995)
- 线程侧栏行有“该线程存在运行中终端进程”的提示，附进程数；点击提示会显示对应终端并激活线程。它是线程范围的运行进程指示，不是线程仍在 Working 的信号。[线程行进程数和图标](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L178-L179) · [指示器渲染](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L670-L675) · [pulse 与状态条件](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ThreadStatusIndicators.tsx#L500-L515) · [点击目标与激活线程](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ThreadStatusIndicators.tsx#L523-L562)
- 有终端 toggle/new/split/close 快捷键，且命令面板可搜索命令；没有发现按终端名或程序名检索并跨线程跳转的入口，也没有列出所有运行中终端的全局视图。现有线程搜索搜消息和计划，不是终端搜索。[键绑定及搜索范围](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L1-L4) · [终端快捷键](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L39-L58) · [线程内搜索](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L60-L64)
- 长期运行的 dev server 不会令线程继续留在 Working 区。服务器退出、崩溃等本身也不保证即时通知：当前帮助文档称，除 agent 明确等待的命令/监视器外，后台 shell/monitor（例如 dev server）停止后不会唤醒线程，线程会在用户下次发消息时获知。线程 run 自身结束/失败则回到活动列表并显示线程状态。[Working 区规则](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/thread-sidebar.md#L115-L125) · [重启后对后台 shell 的处理](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/updating.md#L25-L31)
- 这套终端访问方式依赖线程拥有终端和线程行作为入口。Herdr 的基本单位是终端、agent 是终端里的程序；可借鉴运行提示、可点回会话的交互，但需把索引及导航键改为终端身份，不能照搬“线程拥有终端”、按线程恢复抽屉状态或 thread row 入口。

## 1. 归属与切换

Web ChatView 按当前 `routeThreadRef` 读取终端 UI 状态；状态以 `terminalUiStateByThreadKey` 保存。终端 session 查询也要求 `environmentId` 与 `threadId`，running terminal ids 从该线程已知 session 推导。换线程时当前视图据新线程 ref 读取对应状态；此前线程的终端不因此转移到新线程。[ChatView 状态键](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L732-L733) · [按线程查询终端 session](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/state/terminalSessions.ts#L234-L249) · [从当前线程取得运行终端](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L948-L975)

一个线程允许多个 terminal session：线程行汇总 running terminal ids 并显示数量；右侧 panel surface 可包含多个 terminal ids。源码没有规定固定的“一个线程几个终端”上限；会话数由实际创建和服务端能力决定。[行上汇总](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L670-L675) · [右侧 terminal surface](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L3927-L3995)

集成终端抽屉与右侧面板是两个终端入口。Actions 中项目脚本的命令 id 是 `script.{id}.run`，项目脚本通过终端快捷入口关联到该命令。源码确认 ChatView 存在按线程的终端抽屉与项目终端可用性；但文档没有明确规定 Actions 启动的终端会话是否持久归属当前线程，也没有规定必然新建还是复用终端，因此不把它和 agent 发起的线程终端等同。[ChatView 线程抽屉与项目可用性](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L3204-L3243) · [脚本命令格式](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L39-L48)

## 2. 发现运行中终端

线程行通过 `useThreadRunningTerminalIds` 取当前线程运行进程 id，按 id 数量计算提示；提示是会 pulse 的 teal terminal 图标，辅助文本为 “N terminal process(es) running”。行内按钮点击会 `revealThreadTerminal` 并激活线程。没有运行中的 terminal ids 时按钮不存在；提示不代表 agent turn 是否 Working。[运行进程筛选](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/state/terminalSessions.ts#L234-L249) · [线程行提示与数量](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L178-L179) · [状态与 pulse](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ThreadStatusIndicators.tsx#L500-L515) · [点击行为](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ThreadStatusIndicators.tsx#L523-L562)

另外，线程详情卡片展示该线程启动的本地服务器及端口并可点击打开。该信息按 thread 展示；dev server 并不会让 Working 区保持展开。[thread-sidebar 文档](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/thread-sidebar.md#L115-L125)

## 3. 搜索、命令面板与全局入口

命令面板 `Cmd+K` 搜命令、项目、线程；前缀 `>` 将结果限制为 actions。终端命令可从面板按命令搜索；终端默认键位包括 `mod+g` 切换、终端聚焦时 `mod+shift+g` 新建，以及 split/close。`mod+j` 的示例是终端已开且未聚焦时切换。具体默认键位可在 Keybindings 设置变更。[命令面板与终端键位](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L39-L58) · [线程/命令搜索范围](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L10-L18)

线程内 `chat.find` 搜索当前线程消息与 proposed plans；源码和帮助文档未显示其按终端标题、shell 命令、进程名搜索。未发现全局“运行中终端”清单或跨线程终端搜索；线程行的运行提示是当前发现其他线程终端的入口。[线程搜索定义](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/keybindings.md#L60-L64) · [侧栏逐线程计算终端状态](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L670-L675)

## 4. Dev server 结束或崩溃

线程的 Working/状态反映 agent 工作或其明确等待的工作；独立 dev server 的存活不延长该状态。帮助文档说明，若后台 dev server 或 watchdog 停止，线程不会被唤醒，agent 会在用户下一次消息时获知。源码/帮助未规定独立 dev server 崩溃或正常退出时必然弹 toast、系统通知或线程行失败状态；不可把 agent run 失败提示当作服务器退出告警。[Working 区边界](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/thread-sidebar.md#L115-L125) · [后台 shell 结束后的通知边界](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/updating.md#L25-L31)

## 5. 用户反馈与上游取舍

- Issue [#962](https://github.com/pingdotgg/t3code/issues/962)（2026-03-12）直接报告集成终端难发现：用户只从文档找到 `terminal.toggle`，建议加 View 菜单、toolbar/sidebar 按钮或在命令面板更突出地呈现。issue 已关闭，但本次读取的 issue 页面没有足够信息证明每一项建议都被实现；当前源码仍以快捷键/命令及线程终端图标为主要入口。[issue](https://github.com/pingdotgg/t3code/issues/962) · [当前终端快捷键与面板入口](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L3927-L3995)
- Discussion [#62](https://github.com/pingdotgg/t3code/discussions/62) 希望 agent 使用可查看和输入的真实终端；thread details 卡片采用按 thread 展示本地 server/端口并提供打开动作的方案。文档同时明确，遗留的 dev server 不会把线程留在 Working 区。取舍是保留线程工作状态语义，同时提供线程上下文的 server/terminal 入口，不维护全局后台进程面板。[讨论](https://github.com/pingdotgg/t3code/discussions/62) · [thread-sidebar 帮助](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/docs/user/thread-sidebar.md#L115-L125)
- Issue [#16586](https://github.com/pingdotgg/t3code/issues/16586) 报告 agent 已结束而 preview server 仍运行，Stop 对较早命令无效；维护者确认停止路径问题，关联修复追踪 [#22052](https://github.com/pingdotgg/t3code/issues/22052)，先前相关改动见 [PR #14636](https://github.com/pingdotgg/t3code/pull/14636)。Issue [#28067](https://github.com/pingdotgg/t3code/issues/28067)（2026-10-31）报告 detached 长进程使 terminal wait 只等 pipe EOF，agent turn 看似停滞。此类反馈说明运行进程可脱离 agent turn，停止和等待生命周期可能产生可发现性问题；它们不是全局终端索引的实现记录。[#16586](https://github.com/pingdotgg/t3code/issues/16586) · [#14636](https://github.com/pingdotgg/t3code/pull/14636) · [#28067](https://github.com/pingdotgg/t3code/issues/28067)

## 6. 对 Herdr 的可迁移性

可迁移的是“把运行状态露出在导航列表，显示数量/状态，并让点击回到真实运行会话”的交互原则。T3 的数据键和入口均以 thread 为中心：其 terminal session 查询按 `environmentId + threadId`，抽屉状态按 thread key 保存，侧栏图标也是 thread row。Herdr 应以 terminal id 作为归属和回访目标；agent 的状态应作为该终端内程序/会话的属性。否则照搬 T3 的线程列表会把同一终端与其 agent 关系错误地固化成 thread owns terminal。[终端查询键](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/state/terminalSessions.ts#L234-L249) · [线程终端状态](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/ChatView.tsx#L732-L733) · [侧栏线程行提示](https://github.com/pingdotgg/t3code/blob/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17/apps/web/src/components/sidebar/SidebarThreadRow.tsx#L670-L675)

## 取证范围

- 上游仓库：`pingdotgg/t3code`；实际读取的 `main` commit：[`337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17`](https://github.com/pingdotgg/t3code/commit/337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17)。2026-11-05 查询 `refs/heads/main` 指向该提交；报告中的源码和文档链接固定在该 commit。读取日期：2026-11-05。
- GitHub issues/discussion/PR 为其各自一手页面，属于有独立编号的反馈记录，不存在可固定到源码 commit 的链接。查阅日期：2026-11-05。
- “没有发现”表示在本次检查的当前 Web 源码、键绑定/侧栏文档及关联用户反馈中没有找到相应机制；若上游存在未检索到的非公开或平台专属 UI，则不据此断言不存在。
