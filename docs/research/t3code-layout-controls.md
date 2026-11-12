# T3 Code 右上角：线程详情与右侧面板

研究日期：2026-11-12。对应用户截图 `/Users/jinjiebewater/Pictures/Snapzy/Snapzy_2026-11-12_16-48-06_686.png`；中间的底部终端按钮按用户要求排除。

研究对象：本机 `/Users/jinjiebewater/my/tools/t3code`，干净提交 `09a54f01bc0ae83865347a965ced50f8c8ec2953`（2026-11-08）。以下链接指向该副本的源码行；`PanelLayoutControls.tsx`、`ui/toggle.tsx` 与既有上游基准 `337c5858c33bc7f8f6dfd391a2c279fa0f7e4d17` 相同。本轮只研究，没有改变 Herdr 的行为。

## 两个入口的职责

| 截图位置 | 控件 | 内容与点击行为 |
| --- | --- | --- |
| 左边，方框内三条横线 | Thread details，`SquareMenuIcon` | 当前线程的 Workspace、Version Control、Servers、Automations、Usage、Context 等信息与操作，具体区块按设置及可用数据出现。点击切换详情卡的显示。 |
| 右边，右侧分栏图标 | Right panel，`PanelRightIcon` | 带标签的工具面板，可承载 Files、Diff、浏览器等。按钮只切换面板显示，不固定跳到 Files 或 Diff。 |

图标、按钮与 tooltip 定义见 [PanelLayoutControls.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:52) 和[右面板按钮](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:108)；详情区块见 [ThreadDetailsPanel.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsPanel.tsx:151)，右面板的纯开关行为见 [useRightPanelActions.ts](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:221)。

两者有各自的状态，可以同时显示。详情卡属于聊天区域；工具面板是聊天区域右边的另一块区域：

```text
宽敞时： [ 聊天区域 · 右侧空位放详情卡 ] [ 右侧工具面板 ]
拥挤时： [ 聊天区域 · 点击按钮弹出详情 ] [ 右侧工具面板 ]
```

这是结构示意，详情卡是聊天画布内绝对定位的卡片，不是又增加一条可拖宽的侧栏。其默认宽 280px，靠右和顶部的间距基准为 12px；放不下最低聊天宽度，或可用高度不足 160px 时，使用 popover。判定依据实际画布测量，不是单一的窗口宽度断点。见 [threadDetailsCardLayout.ts](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/threadDetailsCardLayout.ts:17)、[ThreadDetailsCard.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:149) 与[画布模式选择](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:1942)。

## 线程详情的状态

- 每个线程分别保存 `inlineOpen` 和 `popoverOpen`。默认分别为 `true`、`false`：空间足够时详情卡默认显示；只能弹出时默认收起。[默认值](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:199)
- 点击按钮切换当前呈现方式的状态。在 popover 模式下，按钮直接作为弹层 trigger；inline 模式下走详情开关 handler，打开时把工作区焦点移到详情，关闭时必要时还给内容区。[trigger](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:52) · [handler](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:231)
- popover 以聊天 header 为锚点，在其下方靠右显示；点击外部或焦点离开会走弹层关闭流程，但线程搜索栏有专门的保留例外。popover 切回 inline 时会收起浮层。[header 锚点](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3894) · [弹层开关](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:132) · [定位](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:173) · [切换模式](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/ThreadDetailsCard.tsx:66)
- 持久化只保留用户主动收起 inline 的选择；popover 不以打开状态恢复。默认 inline 显示不需要单独保存。[partialize](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:1171)

## 右侧面板的状态

- 每个线程默认关闭、没有标签。点击打开后恢复该线程原有的标签和活动标签；第一次没有内容时，显示添加工具的空态，不会强制创建 Files 或 Diff。[初始状态](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:199) · [只改显示状态](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:1088) · [空态](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelTabs.tsx:1525)
- 再点按钮关闭。关闭会清除最大化状态并隐藏面板，保留标签；后续再打开是普通大小。[关闭 handler](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:170) · [store.close](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:1074)
- 关闭时，当前浏览器预览可能转到 mini player，device surface 则交给浮动设备视图。面板隐藏并不等于其中的资源全部销毁。[关闭前的资源处理](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/useRightPanelActions.ts:170)
- 线程对应的面板状态写入 localStorage；普通线程之间切换时按线程取回，不是一份全局标签列表。[读取](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:1048) · [持久化](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:1160)
- 普通 inline 宽度默认 540px、最小 360px，最大值同时受视口的 70% 和给聊天区保留 360px 的限制。[宽度参数](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/usePreviewPanelInlineSize.ts:13) · [最大宽度计算](/Users/jinjiebewater/my/tools/t3code/apps/web/src/hooks/usePreviewPanelInlineSize.ts:68)
- 常规桌面模式是 inline 面板，可放大／恢复。默认非最大化且窗口宽度不超过 980px 时，改为从右侧出现的 sheet；不能把这条断点套用到线程详情卡。[断点](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelLayout.ts:1) · [最大化覆盖 sheet 判定](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:1051) · [RightPanelSheet.tsx](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/RightPanelSheet.tsx:12)
- 放大后，聊天列宽度变为 0 且不可交互，右面板占满该工作区域；恢复后重新并排。[聊天列](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3331)

## 两者的联动与按钮位置

两者并非完全互不影响：打开右面板会先关闭已经弹出的详情 popover，但不直接改变详情卡的 `inlineOpen`。关闭右面板时，如果详情 popover 正开着、inline 原来被收起，会把 `inlineOpen` 恢复为 `true`。因此不能实现成两个没有联动的布尔值，也不能实现成互斥的两个工具页面。[updateThread](/Users/jinjiebewater/my/tools/t3code/apps/web/src/rightPanelStore.ts:352)

右面板在桌面 inline 模式打开后，详情按钮从窗口最右的按钮组移到聊天区域自己的 header 右端；窗口最右保留右面板按钮并增加放大／恢复。关闭面板后，详情按钮回到原按钮组。放大按钮关闭时立即隐藏，不等待淡出，避免与移回来的详情按钮重叠。[显示条件](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:1094) · [按钮组](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3294) · [独立详情按钮锚点](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:164) · [放大按钮过渡](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:190)

## 视觉与快捷键

- 桌面按钮 28×28px，图标 16px，圆角 8px，组内间距 4px；均为 `ghost` / `sm` Toggle，小屏默认尺寸为 32px。[按钮组](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:80) · [Toggle 尺寸与样式](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ui/toggle.tsx:6)
- 开启状态由 `pressed` 对应的 `bg-accent` / `text-accent-foreground` 表示。hover、pressed 和 `focus-visible` 是不同状态；focus ring 另有 2px inset 环及 1px offset。截图里的蓝色描边不能直接当作永久的开启态样式，截图本身也不能确定描边的触发方式。[Toggle 状态](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ui/toggle.tsx:7)
- tooltip 出现在下方，显示控件名称及当前配置的快捷键；不是把固定快捷键文字写死在按钮中。[详情 tooltip](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/chat/PanelLayoutControls.tsx:73) · [快捷键标签来源](/Users/jinjiebewater/my/tools/t3code/apps/web/src/components/ChatView.tsx:3279)
- 默认键位：详情 `mod+shift+b`，右面板 `mod+alt+b`；macOS 的 `mod` 对应 ⌘，详情快捷键有 `!terminalFocus` 条件。用户可重新配置，不能据默认值推断截图环境的实际绑定。[DEFAULT_KEYBINDINGS](/Users/jinjiebewater/my/tools/t3code/packages/shared/src/keybindings.ts:57)

## Herdr 当前对照与验证边界

Herdr 已有右侧 space 面板的 `open/page/wide` 状态、恢复上次页面和按 space 保存的能力；其归属是 space，T3 此处按 thread 取状态。[shared/panel.js](/Users/jinjiebewater/my/personal/projects/herdr-t3/shared/panel.js:8) · [保存和恢复](/Users/jinjiebewater/my/personal/projects/herdr-t3/shared/panel.js:44)。本轮没有决定新的详情入口在 Herdr 应承载哪些内容。

结论来自指定源码快照及用户截图，没有打开 T3 Code 窗口执行真实点击，也没有验收窄窗、焦点、拖动或动画的实际表现。没有产品实现改动、删除项或运行时验证需求。
