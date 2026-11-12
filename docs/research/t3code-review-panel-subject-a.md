# T3 Code review/diff 面板：Subject A 证据调查

## 范围与证据快照

本调查只读检查 `/Users/jinjiebewater/my/tools/t3code`，该 clone 的 HEAD 为 `09a54f01bc0ae83865347a965ced50f8c8ec2953`（2026-11-08，`fix(search): keep whole-word title matches above busy prefixes (#32242)`），工作区干净。相关实现集中在 `apps/web/src/components/DiffPanel.tsx`、`components/diffs/`、`components/pullRequest/` 与 `GitActionsControl.tsx`。本报告的每个代码描述均附 clone 内绝对路径与行号。

## 入口、作用范围和面板结构

- 线程右侧面板把 `DiffPanel` 作为 `diff` surface 懒加载；从线程详情打开时会切到 branch Changes diff。线程面板上的 `diff.toggle` 调用 toggle，`addDiffSurface` 则先选 branch scope 再打开；见 [`RightPanelSurfaceContent.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/RightPanelSurfaceContent.tsx:108) 和 [`useRightPanelActions.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:101)。
- Diff 选择模型覆盖 Changes（分支 diff）、Uncommitted、Latest turn、单个 Turn、Commit，以及具体 tool-call diff；scope 菜单列出前三项，并提供 Turn/Commits 子菜单；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:817) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:854)。来源状态保存在 thread diff store，切换 scope 会写回对应选择；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:779)。
- 文件读权限、非 Git 仓库、无已完成 turn、加载/错误、无 patch/no net changes 都各有独立空态或提示；预览被截断、untracked 文件尚未读到、tool-call patch 有省略文件时也会显示说明；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1281) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1303)。
- 外观 mode 有 inline、sheet、sidebar、embedded；inline 固定为视口宽的 42%，限制在 360–560px，其他 mode 占满父容器。桌面 Electron 的非 sheet/embedded 顶栏兼作拖动区；见 [`DiffPanelShell.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanelShell.tsx:8)。

## 标题栏控件与 diff 查看方式

- 标题左侧是 scope selector。选 commit 时旁边显示短 SHA；有远程 commit URL 时可打开该 commit。Changes 模式在顶部显示当前 head→base，base 可搜索选择；相同名字的 local/remote ref 可切换远端版本；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:817) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:985)。
- 右侧控件按适用条件出现：增删行数、刷新、全部文件折叠/展开、Stacked/Split、换行、忽略空白、隐藏测试文件、切换 file tree。Stacked/Split 写入 client settings；其他 toggle 在组件 state 中控制；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1121) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1172)。
- `diffLayout` 的 stacked 被传为 Pierre diff viewer 的 `unified`，split 传为 `split`；line wrapping 控制 `overflow` 为 wrap 或 scroll。非 diff 的原始 patch 显示在 `<pre>` 中，也遵循换行开关；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1484)。
- 可按文件收起/展开，展开或选树中某文件时会请求 lazy patch；diff 标题点击可开偏好编辑器，右键给文件上下文菜单；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:693) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1373)。

## 文件树

- 文件树用 `@pierre/trees`，初始目录全部展开、紧凑密度、不启用搜索。列表保留 diff 顺序，附加 added/deleted/renamed/modified 状态；见 [`DiffFileTree.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/DiffFileTree.tsx:83) 和 [`diffFileTree.logic.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/diffFileTree.logic.ts:17)。
- 树头显示 Files 与文件计数，可全部展开/折叠目录。选文件会展开对应 diff、请求 lazy file、滚动到文件；当前选中行再次点击也会重新 reveal；见 [`DiffFileTree.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/DiffFileTree.tsx:183) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:693)。
- 树宽可拖动，默认占容器 40%，宽度以 `t3code:diff-file-tree-width` 保存；树开关也写 localStorage，默认关闭；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:234) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1497)。为避免 Pierre tree 同一节点路径既是文件又是目录，冲突文件路径在内部用零宽空格别名，边界交互仍映射回真路径；见 [`diffFileTree.logic.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/diffFileTree.logic.ts:44)。

## 行批注与交给 agent

- 工作区 diff 上从行号 gutter 或选中行开启批注；行范围转成 review comment context 并保存到对应 composer draft。提交批注本身只把文本写进该草稿上下文，聊天发送 context 会带上 `reviewComments`；见 [`AnnotatableCodeView.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/AnnotatableCodeView.tsx:209)、[`AnnotatableCodeView.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/AnnotatableCodeView.tsx:228) 和 [`ChatComposer.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ChatComposer.tsx:3097)。
- 批注框支持 `⌘/Ctrl Enter` 发送、Escape 取消；还可语音输入。快捷提交只有在未 pending、内容非空或 secondary action 允许空文本时可用；见 [`DiffCommentAnnotation.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/DiffCommentAnnotation.tsx:145) 和 [`commentSubmitShortcut.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/commentSubmitShortcut.ts:7)。
- PR Code tab 的行批注分流不同：有 inline comment 权限时主按钮 `Add to review`，次按钮 `Add to agent`；无评论权限但 handoff 可用时主按钮变成 `Add to agent`。选区和文本被构造成 PR/file/line 评论上下文，再由 `addSelectionToAgent` 生成包含 PR 元数据及 request 的 handoff，并调用 `startAsk`；见 [`PullRequestCodeTab.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestCodeTab.tsx:1039) 和 [`PullRequestDetailPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestDetailPanel.tsx:997)。
- 因此两处“批注”动作不能视作同一流程：工作区 diff 是聊天上下文附件；PR Code 的 Add to agent 是立即开始 agent handoff。PR 时间线上的既有评论可另行加入聊天 composer，并附上所属 PR reference；见 [`PullRequestDetailPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestDetailPanel.tsx:1024)。

## Pull request review

- Pull request 页面在右侧 panel/tab 容器呈现 detail；Code tab 独立懒加载 diff viewer，标题栏可按 All commits 或单 commit 筛选、显示文件数/已读数/隐藏测试文件数/被 host withholding 的提示；见 [`PullRequestsPage.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestsPage.tsx:1469) 和 [`PullRequestCodeTab.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestCodeTab.tsx:1096)。
- PR diff 的工具栏与工作区 diff 近似：Stacked/Split、换行、忽略空白、隐藏测试文件、折叠文件、file tree；窄容器下选项折叠菜单，宽时展开控件。所选单个 commit 不允许对行发表评论，工具栏提示需切回 All commits；见 [`PullRequestCodeTab.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestCodeTab.tsx:1222) 和 [`PullRequestCodeTab.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestCodeTab.tsx:1237)。
- 正式 review 支持 Comment、Approve、Request changes，由 provider capabilities 决定呈现哪些 verdict。提交时一并提交 summary 与待发 inline comments，失败保留草稿以便重试；见 [`PullRequestReviewForm.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestReviewForm.tsx:26) 和 [`PullRequestReviewForm.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestReviewForm.tsx:108)。
- Detail 页面还挂载 Guide、Timeline、Code 等 tab；Review Guide 的代码路径支持直接从 stop 提问或将选区交给 agent。具体 PR tab 内容在 [`PullRequestDetailPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestDetailPanel.tsx:1760) 和 [`PullRequestDetailPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestDetailPanel.tsx:1824)。

## Git actions

- Git actions 位于 thread details 的独立控件组，不在 DiffPanel 标题栏。主按钮依状态提供 Commit、Commit & push、Commit/push/创建 PR 等 quick action；旁边菜单另列 Commit、Push、Create PR，若仓库没有 remote 可 Publish repository。非 Git 仓库提供 Initialize Git；见 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:1490) 和 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:1591)。
- Commit dialog 可输入提交说明并选部分文件；Push/Create PR 走 stacked action。是否可用取决于 busy、工作区更改、当前 branch、ahead/behind/upstream、是否已有 open PR；无 remote 时菜单隐藏 Push 和 PR 项；见 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:1340) 和 [`GitActionsControl.logic.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.logic.ts:108)。
- 运行中显示进度状态与耗时，错误 toast 保留，成功状态有短暂 inline 展示；无法操作时会显示具体原因提示。未创建分支或落后 upstream 也有提示；见 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:1515) 和 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:1469)。

## 快捷键与状态

- right panel 提供 `rightPanel.toggle`、`rightPanel.toggleMaximized`、`rightPanel.close`；DiffPanel 另有 `diff.toggle`。代码使用 keybinding command id，用户可能配置绑定；本次 source 查找能确认 command handlers 和设置展示，未从 app 的运行时偏好推断具体默认组合；见 [`useRightPanelActions.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:330) 和 [`PullRequestsPage.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestsPage.tsx:1451)。
- 批注提交统一识别 Meta/Ctrl+Enter，Escape 关闭正在编辑的批注；PR review summary 表单也使用相同提交 chord；见 [`commentSubmitShortcut.ts`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/commentSubmitShortcut.ts:7) 和 [`PullRequestReviewForm.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestReviewForm.tsx:167)。
- DiffPanel 显示无 thread、无权限、非 Git repo、没有 completed turn、加载/错误、空 diff/无 net changes、截断 patch、lazy 文件加载等状态；操作可见性和 disabled reason 也随来源和 Git 状态变化；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1281) 和 [`GitActionsControl.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/GitActionsControl.tsx:214)。

## 窄宽度与视觉 token 对照

- DiffPanel inline 至少 360px。head/base ref 在容器小于 20rem 时隐藏 head，仅保留 `vs` 和 base，以 tooltip 展示完整比较文本；其余顶栏按钮仍是横向 shrink-0/固定图标按钮，文件树默认宽度为剩余空间 40%。代码足以识别压力点，但不能代替真实窄窗布局验收；见 [`DiffPanelShell.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanelShell.tsx:31)、[`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:993) 和 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1497)。
- PR Code 工具栏 `< @lg` 时把 diff 选项收到菜单，`@lg` 以上显示按钮组；见 [`PullRequestCodeTab.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestCodeTab.tsx:1237)。PullRequestsPage 的右 panel 默认宽度为窗口一半，并可保存调整结果；见 [`PullRequestsPage.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/pullRequest/PullRequestsPage.tsx:1470)。
- Herdr 的 [`t3-tokens.md`](/Users/jinjiebewater/my/personal/projects/herdr-t3/docs/internals/t3-tokens.md:1) 规定 px/spacing 换算、`xs` 按钮为 24px、图标按钮 32/28/24/20/16px、popover 圆角 8px；见同文第 12、20、33、36–37 行。clone 中 DiffPanel 用 `size="xs"` scope button、`size="icon-sm"` 的 28px refresh/collapse、`size="sm"` toolbar toggles，Tree/toolbar 的常规高度 40px；见 [`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:821)、[`DiffPanel.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanel.tsx:1133)、[`DiffPanelShell.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/DiffPanelShell.tsx:17) 和 [`DiffFileTree.tsx`](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/diffs/DiffFileTree.tsx:185)。前述数值对得上 token 表；Review diff 内容区被 token 文档明确列作有意不同，因此不能据此要求内容区也完全采用另一组件的布局；见 [`t3-tokens.md`](/Users/jinjiebewater/my/personal/projects/herdr-t3/docs/internals/t3-tokens.md:53)。
- token 文档写明其参考 T3 源码提交 `337c5858`，而调查 clone 的 HEAD 是 `09a54f0`；所以这里只能做表内数值与当前 clone 类名/组件尺寸的对照，不能声称这是相同版本的像素级复核；见 [`t3-tokens.md`](/Users/jinjiebewater/my/personal/projects/herdr-t3/docs/internals/t3-tokens.md:3)。

## 未决事项

- 没有打开运行中的 T3 Code 窗口或截图，故窄宽度下 header controls 和 tree 与 code view 并排时的真实可读性/裁切仍未核实；源代码的容器断点只提供静态线索。
- 没有读取某个实际用户 profile 的 keybindings，因此这里只报告快捷键命令与 chord，不列举具体 `diff.toggle` 默认键。
- Herdr 的 `Review` 在 glossary 中指 space 级待评审内容及 Review 页，而 T3 Code 此处的 `DiffPanel` 与 Pull Request review 是代码/PR 查看器；若 Subject A 的产品意图要把 T3 交互并入 Herdr Review，入口命名和承载页面仍需由负责人确定。Herdr 词义见 [`GLOSSARY.md`](/Users/jinjiebewater/my/personal/projects/herdr-t3/GLOSSARY.md:88) 与 [`ADR 0007`](/Users/jinjiebewater/my/personal/projects/herdr-t3/docs/adr/0007-review-belongs-to-the-space.md:1)。
