# T3 Code 右侧面板：Files surface 与 Diff surface 的布局与行为事实

只记录源码事实与出处，不含方案。研究对象是 T3 Code 的右侧面板（`RightPanelTabs`）里两个 surface：Files（`files` / `file:<path>`）与 Diff（`diff`）。pull-request 的 Code tab 另有实现，本文只在必要处作对照。

## 0. 快照与范围

- 代码：`/Users/jinjiebewater/my/tools/t3code`，HEAD `09a54f01bc0ae83865347a965ced50f8c8ec2953`，工作区干净。路径写法：组件文件相对 `apps/web/src/components/`（如 `files/FileBrowserPanel.tsx`），`index.css`、`pierre-tree-theme.ts`、`rightPanelStore.ts`、`rightPanelLayout.ts`、`hooks/*`、`lib/*` 相对 `apps/web/src/`，`apps/web/package.json`、`packages/*` 相对仓库根。
- 文件树的底层库：`@pierre/trees` `1.0.0-beta.6`（`apps/web/package.json:33`），行高、缩进、选中底色、键盘都来自这个库，本节引用的库内数值取自已安装的 `node_modules/.pnpm/@pierre+trees@1.0.0-beta.6_*/node_modules/@pierre/trees/dist/`。
- 没有打开 T3 Code 窗口、桌面或截图。所有"看起来"的结论都只是代码里的类名与数值，未做像素级验收。

## 1. 两个 surface 在面板里的位置

面板外壳是 `RightPanelTabs`（`RightPanelTabs.tsx:1336-1525`）：一行固定高度的标签条，加一个 `flex-1` 的 content 区（`RightPanelTabs.tsx:1524`）。surface 由 `RightPanelSurfaceContent` 按 `surface.kind` 分发：

| kind | 渲染 | 出处 |
| --- | --- | --- |
| `diff` | `<DiffPanel mode="embedded">` | `chat/RightPanelSurfaceContent.tsx:108-119` |
| `files` / `file` | `<FilePreviewPanel>` | `chat/RightPanelSurfaceContent.tsx:199-240` |

关键结构事实：**Files 不是"一个常驻文件浏览器"，而是一个单例 `files` surface 加每个文件一个 `file:<path>` surface**。`openFile` 会先过滤掉所有 `kind: "files"`，再 upsert `file:<path>`（`rightPanelStore.ts:784-816`，`surfaceId = \`file:${relativePath}\``）。所以文件浏览器（`FileBrowserPanel`）在每个 file surface 里各实例一份，展开/滚动/搜索状态各自独立（实例 key 见 `FilePreviewPanel.tsx:1545`）。`diff` 与 `files` 都是单例（`singletonSurface("diff" | "files")`）。

标签条上的标题：`diff` → "Diff"，`files` → "Files"，`file` → 文件名（`RightPanelTabs.tsx:576-583`），图标分别为 `FileDiff`、`Files`、文件类型图标 `size-3`（`RightPanelTabs.tsx:660-670`）。

窄宽度退化发生在**面板级**而非 surface 级：视口 `max-width: 980px` 时整个右侧面板改为 sheet（`rightPanelLayout.ts:1`，`ChatView.tsx:694,1051`）；sheet 宽度 `w-[min(42vw,28rem)] min-w-80 max-w-[28rem]`，视口 `max-[760px]` 时 `w-[min(88vw,24rem)]`（`RightPanelSheet.tsx:25`）。内联时宽度默认 540px、最小 360px、最大取视口 70% 且给同级聊天列留 360px（`hooks/usePreviewPanelInlineSize.ts:11-15,63-70`）。

## 2. Header 结构（问题 1）

### 2.1 面板级标签条

- 高度 `var(--workspace-topbar-height)`，即 52px（`index.css:123`；有 titlebar-area 环境时 `max(40px, env(titlebar-area-height, 52px))`，`index.css:156`），`min-h` 同值，`shrink-0`（`RightPanelTabs.tsx:1334-1340`）。
- 背景取默认（无 `bg-*` 类），底边线没有；`pl-2`，内联时 `pr-28`（给标题栏按钮留位），否则 `pr-3`（`RightPanelTabs.tsx:1336-1340`）。
- 左侧：可横向滚动的标签列表（`ScrollArea`，隐藏滚动条 + 两端渐隐），标签后面紧跟"+"添加菜单（`size="icon-xs"`，图标 `size-3.5`）（`RightPanelTabs.tsx:1346-1390,1403-1410`）。
- 右侧：空间不足时才出现的两个箭头页脚（`icon-xs`，`ChevronLeft/Right`，到边禁用）→ `layoutControls`（线程详情/终端/右面板三个 `Toggle size="sm"`，见 `chat/PanelLayoutControls.tsx:78-120`）→ Electron 的窗口控件留白（`RightPanelTabs.tsx:1440-1520`）。
- 单个标签：高 24px（`h-6`）、`text-xs`（12px）、`rounded-md`（6px）、`max-w-36`、`pr-2 pl-1.5`、`gap-0.5`，图标 `size-3`（12px）；选中 `bg-accent text-foreground`，未选中 `text-muted-foreground` + `hover:bg-accent/60`（`RightPanelTabs.tsx:1012-1019`）。标签可拖动排序（`@dnd-kit`）、可中键关闭、可右键出菜单、可重命名（仅 device surface）。

### 2.2 Diff surface 自己的工具栏

`DiffPanelShell` 一行 header，左 scope 组、右工具组，`justify-between`（`DiffPanelShell.tsx:12-31`）：

- 高度：`mode="embedded"`（右侧面板就是这条路径）时 `flex h-10 min-h-10 ... px-2`（`DiffPanelShell.tsx:15-17`）；若祖先带 `data-preview-panel-mode="inline"`，压到 `h-7 / min-h-7`、去底边线、加 `mb-3`（同处）。也就是内联面板里 28px、sheet 里 40px。底边线 `border-border/60`，`bg-background`。
- 左：scope 下拉按钮（`Button size="xs"`，24px，含 `ChevronDown`，`data-workspace-focus-default`，`max-w-full` 可截断）→ 选 commit 时的 7 位 SHA（可点开远端链接）→ head→base 比较区（`@container/diff-refs`，容器小于 20rem 时隐藏 head、只留 `vs` 和 base，tooltip 给全量）（`DiffPanel.tsx:818-845,993-1035`）。
- 右（`shrink-0`、`gap-1`，有 commit 时 `gap-0`）：增删统计 `DiffStatLabel`（`text-2xs`）→ 刷新（`icon-sm`，28px）→ 全部文件折叠/展开（`icon-sm`）→ Stacked/Split 分段 ToggleGroup → 换行 Toggle（`size="sm"`）→ 忽略空白 Toggle → 隐藏测试文件 Toggle（仅 `testFileCount > 0`）→ 文件树 Toggle（`FolderTreeIcon`，仅在 `diffFileKeys.length > 0` 时出现）（`DiffPanel.tsx:1114-1276`）。所有开关都是图标 Toggle + tooltip，没有文字标签。

### 2.3 Files surface：没有 surface 级工具栏

Files 没有等价的 scope/工具行；面板标签条下面直接是内容，最多两层 subheader：

1. 面包屑行（`FILE_SURFACE_SUBHEADER_CLASS`）：`h-10 min-h-10 gap-2 px-3`，有底边线 `border-border/60`；内联时 `h-7`、去底边线、`mb-3`（`files/fileSurfaceChrome.tsx:10-11`）。左：可滚动隐藏滚动条的面包屑（`text-xs`），可点面包屑跳目录、点箭头弹同层文件夹菜单（`FilePreviewPanel.tsx:1263-1280`，`files/FileBreadcrumbs.tsx:1-40`）。右：`OpenInPicker`（compact，外部编辑器/文件管理器）、渲染模式切换（markdown/表格等）、换行、在预览浏览器打开、文件浏览器 Toggle（`FolderTree`，`size="sm"` 按钮、`pressed` 跟开关）（`FilePreviewPanel.tsx:1286-1340`）。没有文件时这一行不存在。
2. 文件树行（`FileBrowserPanel` 自己的 subheader，**不属于那个共享类**）：`h-10 min-h-10 gap-1 px-2`，底边线同色；内联时 `h-9`、`mb-1`、去底边线（`files/FileBrowserPanel.tsx:487-489`）。左：刷新按钮（`icon-xs`）+ 搜索输入（`InputGroup`，`h-7`，`type="search"`，占满剩余宽度，`data-workspace-focus-default`）（`files/FileBrowserPanel.tsx:74-101,490-500`）。右：全部折叠/展开（`icon-xs` + `MorphIcon size-3.5`，有目录且非 hostFolder 才出现）（`files/FileBrowserPanel.tsx:501-523`）。
3. 预览内部的第三条 bar（大文本/二进制预览）：左 "Full file" 文字，右复制、保存（`FilePreviewPanel.tsx:1635-1663`），同一 `FILE_SURFACE_SUBHEADER_CLASS`。

### 2.4 三种 header 高度一览（同一面板内）

| 行 | sheet / 常规 | 内联（`data-preview-panel-mode=inline`） | 底边线 | 出处 |
| --- | --- | --- | --- | --- |
| 面板标签条 | 52 | 52 | 无 | `RightPanelTabs.tsx:1336`，`index.css:123` |
| Diff 工具栏 | 40 | 28（`mb-3`） | 有 / 无 | `DiffPanelShell.tsx:15-17` |
| Diff 文件树行 | 40 | 28（`mb-3`） | 有 / 无 | `diffs/DiffFileTree.tsx:186` |
| Files 面包屑行 | 40 | 28（`mb-3`） | 有 / 无 | `files/fileSurfaceChrome.tsx:11` |
| Files 文件树行 | 40 | 36（`mb-1`） | 有 / 无 | `files/FileBrowserPanel.tsx:488` |

## 3. 导航列（问题 2）

两个 surface 用的是同一个组件 `FileExplorerPane`，并且都在**右侧**：

- `aside` 带 `border-l border-border/60`（`files/FileExplorerPane.tsx:64-70`），resize handle 在左边缘（`files/FileExplorerPane.tsx:72-108`）。
- 尺寸常量：`MIN_WIDTH = 160`、`MAX_WIDTH = 560`、`FILE_CONTENT_MIN_WIDTH = 256`（内容区至少留 256px，见 `files/FileExplorerPane.tsx:8-10`）。最大宽实际取 `min(560, row - 256)`（`files/FileExplorerPane.tsx:48-58`）。
- 默认宽：Files 传 `defaultWidth = 256`（组件默认，`files/FileExplorerPane.tsx:19-20`），即固定 256px；Diff 传 `defaultWidthFraction = 0.4`，即行宽的 40%（`DiffPanel.tsx:1498-1503`）。`defaultWidthFraction` 会让"默认宽"随容器变化，但用户拖过一次后就被存档值覆盖（`useResizableWidth` 注释与实现 `hooks/useResizableWidth.ts:31-43`）。
- 宽度持久化 key 不同：Files `t3code.fileExplorerWidth`（`files/FileExplorerPane.tsx:19`），Diff `t3code:diff-file-tree-width`（`DiffPanel.tsx:1500`）。注意分隔符一个是 `.` 一个是 `:`。
- 可拖动、可键盘调宽：handle `tabIndex=0`，`ArrowLeft` +16、`ArrowRight` -16、`Home` 最小、`End` 最大，带 `aria-valuenow/min/max`（`files/FileExplorerPane.tsx:72-108`）。
- 是否可拖：Files 传 `resizable={Boolean(previewPath)}`——有文件预览时可拖，只剩树时树占满整行且无 handle（`FilePreviewPanel.tsx:1543`，`files/FileExplorerPane.tsx:64-82`）。
- 面板开关：Diff 是 surface 工具栏右侧的 Toggle，默认**关闭**，持久化 `t3code.diffFileTreeOpen`（`DiffPanel.tsx:115,234-238`）。Files 是面包屑行右侧的 Toggle，默认**开启**，持久化 `t3code.fileExplorerOpen`（`FilePreviewPanel.tsx:161,991-993,1332-1341`）。
- 窄宽度：**两个 surface 都没有针对树的断点**。没有文件打开时树仍然强制显示（`shouldShowFileExplorer`：`relativePath === null` 时返回 true，`files/filePreviewMode.ts:32-38`），只是变成不可拖动、占满整行。真正按宽度退化的只有整个面板变 sheet（980px，见 §1）。
- 树本身不出现空/加载占位，`FileBrowserPanel` 在加载时仍渲染 `<FileTree>`，只是内容为空或覆盖一行 `Loading files…`（见 §7）。

## 4. 树行（问题 3）

两者都是 `@pierre/trees` + `density: "compact"`（`files/FileBrowserPanel.tsx:270`，`diffs/DiffFileTree.tsx:84`），`flattenEmptyDirectories: true`（压缩单子目录为 `a / b / c` 一行，合并在 `[data-item-flattened-subitems]` 里，`style.js` 的 `[data-item-flattened-subitem]` 规则）。差异在初始展开与排序。

- 行高：`compact` 预设 `itemHeight: 24`、`factor: 0.8`（库内 `dist/model/density.js:3-15`），落到 `--trees-row-height: 24px`，行 `height = line-height = 24px`，`flex: 0 0 24px`。
- 缩进：每层一个竖线单元 `[data-item-section="spacing-item"]`，单层由 `--trees-level-gap`（`8px × 0.8 = 6.4px`）、`--trees-icon-width`（16px）、`--trees-item-row-gap`（`6px × 0.8 = 4.8px`）派生（`dist/style.js` 的 `:host` 变量表与 spacing 规则）。未在浏览器里量过实际像素缩进。
- 内边距：`--trees-item-padding-x: 8px × 0.8 = 6.4px`，`--trees-item-margin-x: 2px × 0.8 = 1.6px`，圆角被 T3 覆盖为 `var(--radius-md)`（6px）（`pierre-tree-theme.ts:12`）。
- 字号：T3 覆盖 `--trees-font-size-override: 0.75rem`（12px），字体 `var(--font-sans)`（`pierre-tree-theme.ts:7-8`）。
- 图标：文件图标宽 16px（`--trees-icon-width`），目录折叠箭头是 `[data-icon-name="file-tree-icon-chevron"]`，`aria-expanded="false"` 时旋转 -90°（库 CSS）。两者都用 T3 自己的图标集 `T3_PIERRE_ICONS`（`pierre-icons.ts:1-6`，`files/FileBrowserPanel.tsx:27,274`，`diffs/DiffFileTree.tsx:87`）；Diff 树会为每个 path 解析一次图标，并对"同名既是文件又是目录"的 path 加零宽空格别名（`diffs/diffFileTree.logic.ts:46-75`）。
- git 状态色：行上 `[data-item-git-status]` 让图标与文件名取状态色，并把 12px 宽的 git lane（`--trees-git-lane-width`）填上状态标记（库 CSS）。
  - Files 树只标 `ignored`（`files/FileBrowserPanel.tsx:351-363`）。
  - Diff 树按 diff 类型标 `added / deleted / renamed / modified`，同 path 状态冲突时降级为 `modified`（`diffs/diffFileTree.logic.ts:12-39`）。
- 选中与悬停 token：T3 覆盖 `--trees-selected-bg-override: color-mix(in srgb, currentColor 12%, transparent)`、`--trees-hover-bg-override: currentColor 7%`、`--trees-border-color-override: currentColor 14%`（`pierre-tree-theme.ts:3-8`），所以选中/悬停都是"把当前文字色按比例混进透明"，不引入新色相。聚焦行另有 1px outline（`--trees-focus-ring-*`）。
- 折叠：单击目录行即切换展开（`computeFileTreeRowClickPlan` → `toggleDirectory`，带修饰键时不切换）（库内 `dist/render/rowClickPlan.js:3-16`）；两个 surface 都有"全部展开/折叠"按钮，Diff 在树 header 里、Files 在树 header 里（`diffs/DiffFileTree.tsx:192-219`，`files/FileBrowserPanel.tsx:501-523`）。`expand-all` 在两个实现里都跳过被 ignore 的目录（`files/FileBrowserPanel.tsx:129-132`）。

初始展开与排序：

| | 初始展开 | 排序 | 行装饰 |
| --- | --- | --- | --- |
| Files | `initialExpansion: "closed"` | 未传 `sort`，用库默认（按名字） | 展开中目录显示 `t3-tree-icon-loading` 旋转图标（`files/FileBrowserPanel.tsx:289-295`，`pierre-tree-theme.ts:14-19`） |
| Diff | `initialExpansion: "open"` | `sort: ordering.sort`，按 diff 里文件出现的顺序（`diffs/DiffFileTree.tsx:86-90`，`diffs/diffFileTree.logic.ts:131-150`） | 无 |

"选中"在两个 surface 里语义不同：

- **Files：选中 = 当前打开的文件**。`selectedPath` 由 surface 的 `relativePath` 给出，`revealRequestId` 变化时展开祖先、清掉别的选中、`select()` 并 `scrollToPath({ focus: true, offset: "center" })`，同时关闭搜索（`files/FileBrowserPanel.tsx:411-478`，关键调用 449-470）。外部（chat 里的文件链接）打开文件也走同一条 reveal 路径。
- **Diff：选中 = 用户点过的那一行，只有 turn scope 才有持久选中**。`selectedFilePath` 只在 `diffSelection.kind === "turn"` 时非空（`DiffPanel.tsx:329-331`）；点树行只调用 `revealDiffFile`（展开该文件、清掉它的折叠状态、请求 lazy patch、把代码视图滚到头部），不写回选中（`DiffPanel.tsx:693-710`，`diffs/DiffFileTree.tsx:74-80`）。branch / uncommitted / commit scope 下没有"当前文件"概念，重新挂载后没有高亮。**没有 scroll spy**：代码视图没有滚动监听回写选中（`diffs/useCodeViewFileReveal.ts:1-46` 只有单向 reveal），因此不存在"文件在视野内即高亮"。
- Diff 树对"再点一次同一行"有特判：Pierre 对唯一选中行不发 change 事件，所以 `onClickCapture` 里读当前选中并再调用一次 `onSelectFile`，保证重复点击仍会重新 reveal（`diffs/DiffFileTree.tsx:223-244`）。

## 5. 搜索与过滤（问题 4）

- **Files**：搜索框在树 header 左侧，`InputGroup variant="ghost"`，`h-7`，`type="search"`，`placeholder="Search files"`，`data-workspace-focus-default`，Escape 清空并 blur（`files/FileBrowserPanel.tsx:74-101`）。树的 `search: false` 表示不渲染库自带搜索框，但 T3 用 `useFileTreeSearch(model)` 从外部驱动过滤，模式 `fileTreeSearchMode: "hide-non-matches"`（`files/FileBrowserPanel.tsx:268-296,305`）。配套行为：查询走 200ms 防抖的 `useProjectPathSearch`（路径级搜索，不只过滤已加载节点，`files/FileBrowserPanel.tsx:163-166`）；结果被截断时显示 "More matches available. Refine your search."（`files/FileBrowserPanel.tsx:538-541`）；无匹配时 Pierre 会退回未过滤树，所以 T3 自己判 `hasNoSearchMatches` 并显示 "No matching files."（`files/FileBrowserPanel.tsx:306-307,552-559`）；reveal 外部选中文件时会先 `setQuery("")` + `closeSearch()`（`files/FileBrowserPanel.tsx:449-450`）；hostFolder 的搜索限制写在 props 说明里（`files/FileBrowserPanel.tsx:45-46`）。
- **Diff**：树里**没有任何搜索**——`search: false`，没有外部搜索框，也没有 `onSearchChange`（`diffs/DiffFileTree.tsx:90`）。树的内容过滤只有一个来自 surface 工具栏的 "Hide test files" Toggle，命中 `isTestChangedFile` 的行不进树也不进代码视图，但当前 reveal 的文件始终保留（`DiffPanel.tsx:651-658,1191-1205`）。
- 两个 surface 都不支持"打字跳转"（typeahead）：库里只有在 `searchEnabled` 时打字才开搜索（`dist/render/FileTreeView.js:1086`），两者都关掉了。
- 全局还有独立的文件选择器 `mod+p`（`filePicker.toggle`，`packages/shared/src/keybindings.ts:82`）与项目搜索 `mod+shift+f`，都不在面板内。

## 6. 右键菜单与跨 surface 跳转（问题 5）

- **Files 树行有右键菜单**：模型 composition 里注册 `contextMenu.triggerMode: "right-click"`（`files/FileBrowserPanel.tsx:257-267`）。菜单由主进程原生菜单承载，条目 = `useFileContextMenu().buildItems()`（Open / Reveal in 文件管理器 / Open with ▸ 编辑器）+ `Copy mention` + `Add to chat`（`files/FileBrowserPanel.tsx:178-208`，条目定义 `fileContextMenu.ts:59-86`）。`Copy mention` 复制 composer mention 文本（`serializeComposerFileLink`），`Add to chat` 直接插入当前聊天 composer 末尾；聊天未打开时 toast 报错（`files/FileBrowserPanel.tsx:214-249`）。
- **Files 树支持拖到 composer**：`dragstart` 写 `COMPOSER_MENTION_DRAG_TYPE`，拖拽期间抑制"选中即打开"，`dragend` 清选中（`files/fileTreeDragMention.ts:1-50`，`files/FileBrowserPanel.tsx:285-288,480-486`）；树自身 `dragAndDrop: { canDrop: () => false }`，不做树内重排（`files/FileBrowserPanel.tsx:269`）。
- **Diff 树行没有右键菜单，也没有拖拽**：`useFileTree` 调用里没有 `composition.contextMenu`、没有 `dragAndDrop`（`diffs/DiffFileTree.tsx:83-95`）。`DiffFileTree` 的 `headerAccessory` 与 `footer` 两个插槽存在但两个调用点都没传（`diffs/DiffFileTree.tsx:32,43,191`，`DiffPanel.tsx:1504-1510`）。
- Diff 的右键菜单挂在**代码视图的文件头**上，不挂在树上：`onContextMenuCapture` 从 `[data-title]` 取路径，弹同一个 `useFileContextMenuHandler`，因此条目只有 Open / Reveal / Open with，没有 `Copy mention` / `Add to chat`（`DiffPanel.tsx:266,1406-1423`，`fileContextMenu.ts:166-171`）。
- **跨 surface 跳转：不存在**。Diff 树点行 = 在 diff 内 reveal（上面 §4）；Diff 代码视图点文件头 = 交给 `openDiffFilePrimaryAction` 用外部编辑器打开（`DiffPanel.tsx:726-760`，`diffFileActions.ts:92`）；Files 点文件 = 打开/更新 `file:<path>` 标签（`rightPanelStore.ts:784-816`）。没有任何"从 diff 打开文件浏览器"或"从文件跳到它的 diff"的入口。文件 ↔ diff 的关联只发生在 chat markdown 链接：文件链接 → `openFileSurface`（Files），diff 链接 → `openDiffSurface`（`ChatView.tsx:3274`，`chat/useRightPanelActions.ts:134-168`）。

## 7. 键盘与焦点（问题 6）

树内键盘由库统一处理，两个 surface 完全相同（因为都只传参数、没改 keyboard）：

- 方向键 `Up/Down` 移动焦点，`Right` 在已展开目录上移到下一个、未展开时展开，`Left` 在已展开目录上折叠、否则移到父级；`Home/End` 首尾（库内 `dist/render/FileTreeView.js:1124-1145`）。
- `Shift+Up/Down` 扩展选区；`Ctrl/Cmd+Space` 切换聚焦行选中；`Ctrl/Cmd+A` 全选可见；`Shift/Ctrl/Cmd`+单击也是范围/切换选区（`FileTreeView.js:1114-1121`，`rowClickPlan.js:3-16`）。
- 键盘上下文菜单键 / `Shift+F10` 打开发起菜单（`FileTreeView.js:1117-1122`），但只有在注册了 context menu 的树里才生效——也就是只有 Files。
- `F2` 重命名只在 `renamingEnabled` 时生效，两个调用点都没开（`FileTreeView.js:1058`，两个 `useFileTree` 调用）。
- 行本身是 `<button data-type="item">`，`Enter`/`Space` 走原生按钮激活即"点击"；库自身的 keydown 只特判了搜索框内的 `Enter`（选中并关搜索）与 `Escape`（`FileTreeView.js:1063-1082`）。没有 typeahead。
- 焦点落点：Files 的搜索输入带 `data-workspace-focus-default`（`files/FileBrowserPanel.tsx:87`），Diff 的 scope 按钮带同一属性（`DiffPanel.tsx:825`）；面板级 `workspaceFocusKey` 按 surface 区分（`RightPanelTabs.tsx:1319-1321`）。树列宽 handle 也是可聚焦控件（`tabIndex=0`，见 §3）。
- 目录行单击即展开，无修饰键（`rowClickPlan.js:3-16`）。

面板级快捷键（默认绑定，`packages/shared/src/keybindings.ts:67-77`）：`mod+alt+b` = `rightPanel.toggle`，`mod+t` = `rightPanel.new`（需面板已开且焦点不在终端），`mod+w` = `rightPanel.close`，`mod+d` = `diff.toggle`。面板打开时 "+" 菜单内用单字母跳（`apps/web/src/lib/surfaceShortcutKey.ts` + `RightPanelTabs.tsx:1165-1171`，条目见 `RightPanelTabs.tsx:1093-1133`：B/T/F/D/P/L/M）。

## 8. 加载 / 空 / 错误状态（问题 7）

| 状态 | Diff surface | Files surface |
| --- | --- | --- |
| 权限中 | `DiffPanelLoadingState label="Checking file access..."`（骨架屏 + `sr-only` 文本，`DiffPanel.tsx:1294-1299`，`DiffPanelShell.tsx:91-116`） | `Spinner` + "Checking file access..."（`FilePreviewPanel.tsx:1243-1252`） |
| 无权限/读不了 | 居中 `text-xs text-muted-foreground/70` 一段文字（`DiffPanel.tsx:1293-1301`） | `p-4 text-sm` 一段文字（`FilePreviewPanel.tsx:1253-1257`）；未知写权限另有一条 "Read-only connection…" 横条（`FilePreviewPanel.tsx:1342-1346`） |
| 无 thread / 非 git / 无 turn | 三句居中提示："Select a thread to inspect turn diffs." / "…not a git repository." / "No completed turns yet."（`DiffPanel.tsx:1282-1292`） | 不适用（文件读取与 git 无关） |
| 加载中 | `DiffPanelLoadingState`，label 随 scope 变（"Loading changes…" / "Loading commit…" / "Checking checkpoint diff…" / tool-call）（`DiffPanel.tsx:1348-1360`）；lazy patch 的批量加载用 `DiffFileLoadingBoundary` 骨架 + `role="status"`，`rootMargin: 600px` 触发下一批（`diffs/DiffFileLoadingBoundary.tsx:18-34`） | 内容区 `Spinner size="lg"`（`FilePreviewPanel.tsx:1486-1490`）；预览/大文本用 `FileSurfaceLoading`（`files/fileSurfaceChrome.tsx:110-124`）；树里 `Loading files…`（`role="status"`，有内容时改成 `sr-only`）（`files/FileBrowserPanel.tsx:540-551`） |
| 空 | "No net changes in this selection." / "No patch available for this selection."（`DiffPanel.tsx:1366-1370`）；工具调用只有内容没 diff 时逐段 `<pre>`（`DiffPanel.tsx:1330-1358`） | 树无空工作区提示；搜索无命中才是 "No matching files."（`files/FileBrowserPanel.tsx:552-559`） |
| 错误 | `selectedPatchError` 一行 `text-2xs text-error/80`（`DiffPanel.tsx:1325-1329`）；truncated / untracked 未加载 / tool-call 省略文件各有顶部 `bg-muted/40` 横条（`DiffPanel.tsx:1304-1324`） | 树顶一条红色可点重试："…Click to retry."（`files/FileBrowserPanel.tsx:528-535`）；文件读失败用居中 `role="alert"`：错误文案 + 尝试过的路径 + 工作区根目录 + "locate the file in Files" 提示，无重试按钮（`FilePreviewPanel.tsx:1458-1483`）；`FileSurfaceFailure` 才带 "Try again"（`files/fileSurfaceChrome.tsx:126-152`，用在资源 URL 失败处 `FilePreviewPanel.tsx:371-380`） |
| 截断 | 大小超限横条 "This preview exceeds the size limit…"（`DiffPanel.tsx:1311-1318`） | "Preview limited to the first 1 MB…" 警告条（`FilePreviewPanel.tsx:1347-1360`） |

## 9. 两个 surface 彼此不一致的地方（源码可见）

1. **导航列默认状态相反**：Diff 默认隐藏（`t3code.diffFileTreeOpen` 默认 false），Files 默认显示（`t3code.fileExplorerOpen` 默认 true）（`DiffPanel.tsx:234-238`，`FilePreviewPanel.tsx:991-993`）。
2. **导航列默认宽度策略不同**：Files 固定 256px，Diff 行宽 40%；宽度 storage key 的分隔符也不同（`.` vs `:`）（`files/FileExplorerPane.tsx:20`，`DiffPanel.tsx:1500`）。
3. **开关位置不同**：Diff 的树开关在 surface 工具栏（与换行/空白等并列），Files 的树开关在面包屑行（与 OpenIn/渲染切换并列）。
4. **树 header 高度不同**：同为内联面板，Diff 树 header 28px，Files 树 header 36px，其他行 28px（`diffs/DiffFileTree.tsx:186` vs `files/FileBrowserPanel.tsx:488`）。
5. **树 header 内容不同**：Diff 有 "Files" 文字 + 文件数 + 展开/折叠；Files 有刷新 + 搜索框 + 展开/折叠，没有标题也没有计数（`diffs/DiffFileTree.tsx:189-219`，`files/FileBrowserPanel.tsx:490-523`）。
6. **初始展开相反**：Diff 全展开（`"open"`），Files 全收起（`"closed"`）（`diffs/DiffFileTree.tsx:86`，`files/FileBrowserPanel.tsx:273`）。
7. **排序规则不同**：Diff 按 diff 出现顺序（同级再按深度、名字），Files 按名字（`diffs/DiffFileTree.tsx:91`，`diffs/diffFileTree.logic.ts:131-145`，`files/FileBrowserPanel.tsx:268-296`）。
8. **行右键与拖拽只有 Files 有**：Diff 树既无右键菜单也无拖拽 mention 能力；同样的右键菜单位于 diff 的代码视图文件头上，且少了 `Copy mention`/`Add to chat`（见 §6）。
9. **搜索只有 Files 有**；Diff 只有一个粗粒度 "Hide test files" 过滤器（见 §5）。
10. **"选中"语义不同**：Files 的选中等于"当前打开的文件"且会被 reveal 同步；Diff 的选中是瞬时点击态，只有 turn scope 才有可持久化的 `filePath`（见 §4）。
11. **Files 的导航列不是独立 surface**：每个打开的文件各带一份独立的树实例与状态；Diff 是单例 surface（见 §1）。
12. **加载/错误文案与形态不同**：Diff 用整块骨架屏 + `role="status"`，Files 用居中 Spinner / 一行 `Loading files…`；Diff 的空态有明确句子，Files 的树在空工作区什么都不显示（见 §8）。
13. `DiffFileTree` 声明了 `headerAccessory` 与 `footer` 两个插槽，两处调用都没使用（`diffs/DiffFileTree.tsx:32-43`，`DiffPanel.tsx:1504-1510`），属于未接线接口。

## 10. 未核实

- 没有打开真实窗口/截图，所以 §2 的高度、§4 的缩进与行高在实际渲染里是否与类名一致（尤其是 `in-data-[preview-panel-mode=inline]` 变体在 sheet 模式下是否真的不生效）未验证。
- Pierre 树内部搜索框在 `search: false` 时的隐藏方式只从 `dist/render/FileTreeView.js:1799` 的 `searchEnabled ? …` 推断，未在浏览器里确认 DOM。
- 未读取任何用户 keybinding profile，只引用仓库默认绑定。
