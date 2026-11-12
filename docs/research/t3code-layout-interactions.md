# T3 Code 右上角补充：详情交互、右面板标签页、关闭与焦点

研究日期：2026-11-12，快照 `/Users/jinjiebewater/my/tools/t3code` @ `09a54f01`（干净）。只补 [t3code-layout-controls.md](./t3code-layout-controls.md) 的缺口；已有事实（图标、状态归属、宽度断点、联动）不重述。行号指向该快照。本轮只读，没有 GUI 点击或第三方构建。

## 1 线程详情卡：右键、区块来源、折叠、密度与滚动

| 行为 | 事实 | 源码 |
| --- | --- | --- |
| 右键菜单 | 卡片任意空白处右键，在指针位置弹出菜单；`input/textarea/contenteditable/a[href]` 和已选中文本不吃这条右键，让原生菜单和弹层自己的菜单生效 | [ThreadDetailsPanel.tsx:131](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:131)、[菜单锚点:287](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:287) |
| 菜单内容 | 一组「Show in thread details」复选项加「Reset to default」；与设置里同一份 body，右键菜单不是另一套 | [ThreadDetailsItemsMenu.tsx:11](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsItemsMenu.tsx:11) |
| 区块清单 | 固定 12 项 id（environment、openIn、scripts、branch、gitActions、changes、servers、automations、lineage、sideChats、usage、context），没有用户自定义区块；id 已存进设置，不能改名 | [threadDetailsItems.ts:4](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/threadDetailsItems.ts:4) |
| 只存偏离 | 只写回与默认不同的选择，其余留空以继承将来的默认值；usage/context 默认跟已退役的 Labs 开关 | [threadDetailsItems.ts:53](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/threadDetailsItems.ts:53) |
| 空区块自动收起 | 区块没有单独的展开/折叠；内容为空时整段隐藏（`has-[>div:last-child:empty]:hidden`），分隔线只跟在有内容的区块后 | [ThreadDetailsSection.tsx:26](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsSection.tsx:26) |
| 可折叠的东西 | 只有列表级「Show N more」和分组展开：PR 行、邻近/侧聊分组、Servers 溢出；Automations 直接给固定高度滚动 | [ThreadDetailsPrRows.tsx:78](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPrRows.tsx:78)、[ThreadRelationshipsControl.tsx:158](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadRelationshipsControl.tsx:158)、[ThreadAutomationsPanel.tsx:158](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadAutomationsPanel.tsx:158) |
| 密度降级 | 卡片高度放不下时按 `full→compact→essential` 降密度：environment 只在 full，openIn 去掉 essential，servers/automations/lineage 只在 full，usage/context 任何密度都留 | [threadDetailsCardLayout.ts:9](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/threadDetailsCardLayout.ts:9)、[ThreadDetailsPanel.tsx:150](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:150) |
| 密度测量 | 用实测高度决定密度，且刻意扣掉会滚动的列表高度，免得列表变长把上面的区块挤掉；内容项集合变化时重测 | [ThreadDetailsCard.tsx:92](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:92) |
| 滚动 | 卡片外层共用一个带渐隐的 ScrollArea；部分内部列表另有自己的有界滚动，例如 Automations 的 `max-h-[13.5rem] overflow-y-auto`，并非所有区块都独立滚动 | [ThreadDetailsCard.tsx:126](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:126)、[ThreadAutomationsPanel.tsx:158](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadAutomationsPanel.tsx:158) |
| 清空后的出路 | 所有区块都被隐藏时，卡内出现「Choose what to show」行，点它等于在同一位置开同一菜单 | [ThreadDetailsPanel.tsx:271](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:271) |

## 2 右面板：新增 / 切换 / 关闭，最后一页与整块隐藏的差别

| 行为 | 事实 | 源码 |
| --- | --- | --- |
| 新增 | tab 条尾部「+」开 launcher 菜单，项带单键字母（B 浏览器、T 终端、D diff、F 文件、…），菜单内直接按字母即触发；`mod+t` 只在面板已开时聚焦该按钮并展开菜单 | [RightPanelTabs.tsx:1391](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1391)、[按键:1042](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1042) |
| 新增即显示 | 新 surface upsert 时把 `isOpen` 置 true，所以从菜单新建会自动打开面板 | [rightPanelStore.ts:296](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:296) |
| 切换 | 点 tab 标题激活（设备 tab 双击改名）；激活副作用按类型分：预览同步当前预览会话、终端聚焦其终端、diff 打开时重置为分支范围 | [RightPanelTabs.tsx:990](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:990)、[useRightPanelActions.ts:207](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:207) |
| 拖拽与溢出 | 指针拖动 6px 起拖重排；tab 条横向滚轮、两端箭头翻页、激活 tab 自动滚入视野 | [RightPanelTabs.tsx:831](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:831)、[滚轮:1288](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1288) |
| 关闭入口 | 中键点 tab 直接关；右键菜单 Close / Close others / Close to right / Close all，禁用规则按位置和数量算；终端 tab 关闭前弹确认，agent 控制的浏览器关闭前弹破坏性确认 | [RightPanelTabs.tsx:1256](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1256)、[useRightPanelSurfaceClose.ts:99](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/useRightPanelSurfaceClose.ts:99) |
| 关最后一页 | `isOpen = surfaces.length > 0 && current.isOpen`：关掉最后一个 tab 后面板自己隐藏；活动 tab 关闭时激活右邻（否则左邻）；空状态会被 store 整条删掉 | [rightPanelStore.ts:950](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:950)、[空态清理:311](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:311) |
| 整块隐藏 | 面板按钮只把 `isOpen` 置 false，保留 tabs 和活动 tab；重新打开回到原 tab，只有 tabs 本来就空才显示空态选择器 | [rightPanelStore.ts:1074](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:1074)、[空态:1523](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1523) |
| 差别实质 | 隐藏面板会做资源转场：当前预览转 mini player、设备转浮动视图，并清最大化；关掉最后一个 tab 走的是释放路径（关预览会话、关终端会话、删未使用的侧聊），不产生 mini player / 浮动设备 | [useRightPanelActions.ts:170](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:170)、[useRightPanelSurfaceClose.ts:79](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/useRightPanelSurfaceClose.ts:79) |
| 关闭顺序 | 多选关闭时活动项最后关，避免面板先闪一下空态 | [useRightPanelSurfaceClose.ts:119](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/useRightPanelSurfaceClose.ts:119) |

## 3 Escape、点击外部、焦点与拖宽

| 行为 | 事实 | 源码 |
| --- | --- | --- |
| Escape · inline 面板 | inline 容器没有注册 Escape 关闭；文件内的 Escape 用于取消设备重命名。surface 内部和其弹层仍可自行处理 Escape | [RightPanelTabs.tsx:963](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:963) |
| Escape · sheet | 窄窗 sheet 由 dialog 语义处理 Esc，关闭回调就是「关面板」本身（同面板按钮，含 mini player 转场） | [RightPanelSheet.tsx:12](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelSheet.tsx:12)、[ChatView.tsx:3997](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3997) |
| Escape / 点外部 · 详情 popover | 走浮层默认关闭，落到同一个 `onOpenChange`；只有「线程搜索栏」是保留例外（焦点或外部点击落到 `[data-thread-find-bar]` 就取消关闭） | [ThreadDetailsCard.tsx:132](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:132) |
| 点外部 · inline 详情 / inline 面板 | 容器不因外部点击关闭；按钮和对应命令可收起 | 同上两处 |
| 焦点 · 详情 | inline 打开时把工作区焦点移到 details 区；再点收起时，若焦点正在卡内则还给内容区；popover 打开时请求 details 区焦点并阻止默认初始焦点 | [useRightPanelActions.ts:234](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:234)、[ThreadDetailsCard.tsx:163](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:163) |
| 焦点 · 面板 | 打开面板后聚焦活动终端；最大化时把焦点移到面板区 | [useRightPanelActions.ts:222](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:222) |
| 快捷键 | 详情 `mod+shift+b`（`!terminalFocus`）、右面板 `mod+alt+b`、新 tab `mod+t`（要求面板已开）、`mod+w` 映射 `rightPanel.close` | [keybindings.ts:67](/Users/jinjiebewater/my/tools/t3code/packages/shared/src/keybindings.ts:67) |
| `mod+w` 的真实含义 | 它关的是当前活动 tab，不是整块面板；`!terminalFocus` 时才生效，重复按住不连发 | [useRightPanelActions.ts:336](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:336) |
| 拖宽 | 左侧 8px 热区、仅指针拖动；拖动过程只改 CSS 变量，松手且位移 >2px 才写 localStorage；范围 360–min(70% 视口, 行宽−360)，默认 540 | [RightPanelResizeHandle.tsx:8](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/preview/RightPanelResizeHandle.tsx:8)、[useResizableWidth.ts:88](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/useResizableWidth.ts:88) |
| 拖宽边界情况 | 宽度按线程存 key；最大化时手柄不渲染；`role="separator"` 有但没传 tabIndex/onKeyDown，键盘无法调宽 | [ChatView.tsx:3996](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3996)、[PreviewPanelShell.tsx:152](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/preview/PreviewPanelShell.tsx:152) |

## 未核实

- base-ui（未安装 node_modules，未核对）默认的 Esc、外部点击、焦点归还是框架行为，以上只确认了本仓库交给它处理的位置，没有逐条读库源码。
- 没打开窗口：真实右键位置、触控/双指滚动、拖宽手感、sheet 动画、`mod+w` 与其他键的冲突都未实测。
- Herdr 侧对照与布局示意按分工不在本文件；结论仅限该源码快照。
