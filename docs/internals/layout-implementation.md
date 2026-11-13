# 布局实现中的宿主限制

改 render/timer、键盘/hover、测量/滚动、Review 文本或壁纸转换时读本文。可见规格与验收在 [RECIPE](../../RECIPE.zh-CN.md)；尺寸/颜色以 [t3-tokens](t3-tokens.md) 为准，跨帧数据、文件和迁移以 [storage](storage.md) 为准。本文只记不能从 API 签名看出的限制，不复制这两份的表，也不归档旧版 RECIPE。

## Render 只造 view

Herdr 在绘制中拒绝会再请求绘制的操作：`cx.notify()`、`cx.new()`、`cx.focus_handle()`、`InputState.new()` 等会抛错，保留旧帧并报 `This view could not be re-rendered`。Review 的首次读取和 `VirtualListScrollHandle.new()` 也要在 `cx.timer.after(0, …)` 启动；绘制中开始的读取可能不返回，直到 30s 超时。绘制发现 Undo 请求、主题变化需重读等，先安排 0ms timer，绘制后执行。

`scripts/render-guard.cjs` 在假的 Herdr 中预加载这些约束。`scripts/check.sh` 还在已装 app home 中运行检查，因为有测试查官方图标；类型检查用脚本里的 `tsc --noEmit` 参数，不用 git 忽略的 `jsconfig.json`，官方 check 新生成的默认配置不适合这些 mod。

## 隐藏副本与常驻入口

隐藏 stack 子节点/列里的 mod 不绘制、不收 `<mod>.<command>`；启动后的 timer 继续，首次显示前则尚未启动。Inbox/Agents 的行计算独立于 `render()`，由每秒 timer 也调用，只有当前模式写 agent order。必须随时工作的命令/Snooze 维护在根浮动、视觉为空的 `t3-tabs {part:"keys"}`；不能依赖可被面板放大藏住的标签条。

`t3-tabs/main.js` 的 `nav()` 给 strip/keys 共用同一导航；strip 绘制前也 track，避免晚一帧。同一帧 track 两次必须幂等，`check-navigation.cjs` 按此回放。`shared/sidebar.js` 查 `sidebar`、`sidebar-lists`；缺 stack 不当作 Lists，独立发布 mod 未必有整个布局。

Home 的 layout select/row 高度和目标 panel restore 与 tab select 同次发出；在 `spaces()` 回传前暂认已到达，不能把 Home 面板写回来源 space。命令后的模型晚一帧左右，不从调用成功推断所有结构已回传。新 space 自带 shell、不能失最后 tab，替换 Home 内容先加入再关闭。Home 的识别/名称契约见 ADR 0005/0006，键和保存归属见 storage。

## Hover 和失踪的离开事件

Herdr 在最后已知鼠标仍落在元素上一帧范围时可能丢 leave，而 GPUI 已记为离开：按键后第一次移出行、按住拖出再松开、离开窗口都能留下 hover。`shared/tip.js` 的 `pointerGone` 在提示/详情显示期间每 100ms 用 `mouse_position()` 对比元素 box；没有卡片、仅 hover 点亮的控件用 `hoverKept`。macOS 指针出窗口后不再送 move；指针停住且沿最后一步再走两步会越窗口边，则视为已经离开。拖动在窗口失活也结束，不能只等永远不来的 release。

Tooltip 用自己管理时序的 `Popup`：`HoverCard` 会因指针停在卡片上继续开，透明 popup 仍挡住下面输入。每次打开换 id，尺寸只在一个 id 首次布局时上报；布局完再淡入。`Popup` 不自动翻转，顶栏等位置明确传 `below`。官方 `.tooltip()` 只有字符串和宿主样式，无法提供这套外观。

## 键盘、关闭键与菜单链

键盘模式由 `shared/focus.js` 管；每副本 close 调 `stopsEnd`。运行首副本通过 `globalThis.t3FocusRun` 清崩溃残值：Herdr 当前所有 mod 共用 JS context，但未承诺此能力，`sessionStorage` 又是每副本一份。没有在走键盘的副本遇到普通 stop 按下，要在 press 夺焦点前结束旧模式。Inbox 内菜单只在真正持键盘时保模式。

Herdr 自 0.1.14 起自动处理绑定 `tab.close`/`pane.close` 的关闭键，但布局绑到 `t3-tabs`，每个 popup/dialog 必须另有 `mod:<name>` 四键 `overlay.close` 覆盖。两页面板有自己的 close 覆盖；同时可停靠和弹层的 mod，键盘 Tab 到停靠副本时也会拦这四键、那时不关东西。仓库 gate 查自己打开的 overlay；Herdr 内置弹层名单升级时另核。

点已开的 popup 按钮，outside press 先关弹层、click 才到按钮；`close()` 写时间，按钮用 `justClosed` 避免立刻重开。`t3-menu` 用父子 id 链关闭后代，Review 页内子菜单复用 `shared/submenu.js` 的悬停意图/方向键规则。Snooze `Popover` 的 Enter/Space 要绑定在持 focus handle 的面板 context，否则宿主绑定只关菜单、不选项。滚动列表用 `shared/list.js` 同步 pointer/highlight/scroll，另包滚动容器会跟不上按键。

## 尺寸、滚动与重排

`on_size_change` 返回乘 zoom 后像素；布局 resize 用逻辑像素，要除 `settings().zoom`。Actions/end 自定 block 宽，`tabs-row` 不可拖。Compact 在不受标签控件宽度影响的 `bar-measure` 测工作列；在标签区测会因控件收缩而反复开合。macOS traffic lights 是未缩放屏幕点，文件热加载补偿与并发安全写见 storage。

Herdr 普通 scroll area 不能脚本移动。标签条由 `tab-scroll` 裁切、`tab-strip.ml()` 偏移；零高全名副本量完整宽，只有 active/room 改变才修正。侧栏普通列表不能代码 scroll-to-current；搜索/树用可控虚拟列表。

导航列不用宿主 `h_resizable`：它按 id 留各块大小并随页面等比缩放，面板变宽时会先错误缩放一帧再弹回。共用 `shared/nav-column.js` 自绘边缘，拖动只改本页、释放才保存。`holdWidth` 共用算法但每页独立状态：宽稳定 300ms 后重排；Files 在此之前固定旧 Editor 宽并裁切，Review 保留旧折行列数。Editor 的 soft wrap 配置创建时取，切换后绘制外重建。Files/Review 刷新与缓存生命周期由 storage 定义；不调用不可可靠取消订阅的递归 `watchFolder`。

## 外部关闭与未读补偿

布局自己关先离开再删；程序结束/Send back/space 消失则来不及，Herdr 已在同一步显示邻居并标 seen。`navigation.js` 只为前一帧未读、仅被这次自动选择带出的 agent 记欠账，离开视野且 seen 回传后写 `herdr.seen=<turn-1>`（官方 Mark unread），一并归还误清 Woke。仍在视野满 3s 即真实已看；失败仅首次提示、有效期内重试。记忆仅本次运行，不做跨重启猜测；标签写法/归属由 storage 和 `shared/labels.js` 管。

## Review 的文字与树

`rows.js` 从 `vendor/char-width.js` 取宽度表（`scripts/vendor.sh` 用 get-east-asian-width 和 Unicode mark/default-ignorable 生成）：宽/全角 2，组合/连接/变体及被连接字符 0，其余 1；断行避开组合和被连接字符。分别量代码字体的 `0` 与 `中`：后备 CJK 字体每字未必等于两倍拉丁宽，未量到前才用两列。行到达时在读取任务 `clipRows` 建累计列宽；宽度变化只算行数，ASCII 除法、非 ASCII 在累计宽上二分，实际切分仅给可见行，不在每次绘制重算整份 diff。

组计数 `tabStats` 在读入/已看变化时算，不因 Herdr 任意重绘反复遍历。读入时一次规范化文件自然顺序，diff、行请求、j/k 同序。子组路径用 `group:<key>/src` 隔离同名目录，不能把子组合并成 lone folder。吸顶文件头需先垫 `background`，半透明 selected 不应透代码；unchecked 颜色先展开短 hex，再缩原 alpha，边框保原色。

## 壁纸转换而非用户生命周期

`extras/mods/asciicn-wallpaper/ascii-art.js` 同时供 `scripts/wallpaper.mjs` 内置图和运行时导入使用。asciicn 没有 CLI/包；图片经 sips/ImageMagick 缩到 `imageGrid`（96 格行，按比例16–480列、每格2×4像素），BMP base64 回读，`decodeBmp` 支持24/32位、两种行序。Braille 沿 Studio image 默认两端各裁0.5%的 autoLevels、阈值0.5、每格八像素平均色、五取偶。Blocks/Dots 也走完整画布，不能按内容边界裁掉空白。

字符用 SVG 而非 text：宿主 text 会吞空格/换行、字体可能把 `##` 连写。Braille/block/quadrant/shade/halftone/diagonal 用上游 glyph 形状，其他字符以暗度条近似。纯半调圆点按正方格，其余按 Studio 文字格宽高比0.5。转换器 version2 的40大小 tiles 避免阴影展开 SVG 超宿主单次1MiB写上限；逐 tile 让出 tick，图片生成器也按 yield 让出，避免阻塞界面。

原生 chooser 按 `window().platform`，不加 macOS `activate`（多等约2s）或 `default location`（Downloads 会请求目录权限）。Windows 只留目录入口。EXIF 方向不处理。导入/草稿/保存的路径、缓存键、分块原子发布、并发作废与清理条件只在 storage 维护，改这些先读它，不在这里写第二套规则。
