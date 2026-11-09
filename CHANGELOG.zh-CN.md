# 更新日志

[English](CHANGELOG.md) · 中文

## 2026-11-09

- Inbox：Working 折叠时，它的标题与 Snoozed 的间距和 Snoozed 与 Settled 的一致。以前多出 5px。

- Lists：Agents 行不再在标题和控件之间显示远程机器图标；悬停整行，在详情里看机器名。

- 程序图标：整个布局直接使用 Herdr 官方素材，保留各组件原定的图标尺寸，以及素材自带的留白和配色。

- Inbox 的远程机器标记不再单独弹提示；悬停整张卡片，在详情里看机器名。

- Review 栏：从 logo 菜单选的提交或分支能在评审窗格里正常加载。以前要等 30 秒后读取超时失败，点计数打开则正常。
- Review：又审了一遍代码后的修复和提速，部分需要 jin.review 0.3.4-fork.8。
  - 内容相同的文件（比如几个一模一样的 `tsconfig.json`）都能加载出 diff。以前除第一个外可能一直停在 `Loading…`。读取超时后点 Retry 会重新请求缺的 diff。
  - 语法着色很密的行能显示到末尾。以前超过 400 个着色片段后，剩下的部分会悄悄丢掉；现在用前景色显示。
  - 中文或含 tab 的长行能横向滚到末尾。以前最后一段滚不到。
  - 展开的整文件会跟着换成新主题的颜色。
  - 折叠的文件在展开时才加载 diff，滚过时不再加载。
  - 大组里每来一批 diff、折叠一个文件或标记 reviewed，只重画涉及的文件：1,164 个文件的组里从 39 ms 降到 2 ms。
  - diff 和整文件按每页最多 3,000 行、10,000 个着色片段读取（仍不超过 4 MB），短行很多或着色很密的文件分段加载，不再卡住面板。（fork.8）
  - 符号链接的整文件显示链接本身（和 Git 保存的一致），不再显示它指向的文件。（fork.8）
  - 刚打开并分析过的 review 不会再被同一时刻的缓存清理删掉。（fork.8）
  - 轮询分析进度时每次少启动一个 Git 进程。（fork.8）
- Review bar：review 快捷键只在 bar 计到未提交改动时才打开未提交页。以前暂存后又改回的文件会让它打开一个空 review，而不是分支。
- Review bar：点计数一定能送到已打开的 Review 面板。以前系统时间回拨后，或刚在面板里切换提交后，面板可能忽略这次点击。
- Review bar：logo 菜单只构造看得见的行；不经按下的点击（键盘或辅助工具）在 logo 处打开菜单，而不是上一次按下的位置。
- Review 面板：组里有几百个文件的 review（比如长分支的 push）可以打开了。以前几乎每次都停在 `interrupted`：diff 旁的文件列表在知道自己高度之前会画出每一行，被打断的视图又永远拿不到高度。需要自己测高度的菜单和列表，在测到之前只画一屏的行。
- 窗格标题栏：有子 agent 的 agent 显示子 agent 数量（`3 agents ⌄`），有子 agent 需要你时改为用 blocked 色显示需要你的个数。点击后在一个和排序菜单、右键菜单同样式的菜单里列出全部子 agent：顶部是计数，每个的状态是图标右下角的圆点，行尾写已工作多久或在等什么，嵌套的缩进。列表开着时，子 agent 启动或结束会跟着增减行，全部结束后自动关闭。选一个就 peek 它；悬停一个时显示和它在 Lists 里那一行相同的详情卡。以前在 Inbox 里没有办法打开子 agent；Lists 的子 agent 行不变。
- 跳转：窗格的 `+n` 只数子 agent。以前 agent 用来跑命令的 shell 也算在内。
- Lists：agent 用来跑命令的 shell（`hc run --bg`）不再作为它的子 agent 列出或计数。那个 shell 启动的 agent 仍然列出，排在该 agent 下一层。
- Review 面板：很大的 diff 可以打开了，不管是上千个文件，还是含超长行（比如日志或压缩过的文件，每行显示前 1000 个字符）。大组的 diff 滚动到哪里加载到哪里。以前会停在 `interrupted`，或提示响应超过 8388608 字节上限。需要 jin.review 0.3.4-fork.6。
- Review 面板：切到很大的组后，可能一直卡在 `cannot read property 'get' of undefined`，只显示上一次成功的画面。现在下一次变化时会重新画这个组。
- Review 面板：修正大评审和读取中切换时的问题。
  - 文件的 diff 读取失败，或在你勾选 reviewed 时才到达，现在点 Retry 或等标记保存后会重新读取。以前会一直停在 `Loading…`，直到打开别的页。
  - 文件刚改动前点开整份文件，现在显示改动后的版本。以前旧内容会回到新文件的标题下面。
  - 大到无法显示的文件不再有整份文件按钮。以前会请求超过一次读取能承载的数据。
  - diff 或整份文件一次读取放不下时，滚动到末尾会接着加载后面的部分，8.5 万行的压缩文件也能一直读到最后一行。只有后面的部分确实读不到时，末尾才写 `The rest of this file is too large to show`。一次读取放不下的文件会在下一次读取时加载，不再停在 `Loading…`。
  - 在大组里往下滚，每批只读这批文件的 diff，不再把整个评审重读一遍。在 1554 个文件的分支里，每批大小约为原来的三分之一，加载快约七倍：从 834 KB、335 ms 降到 283 KB、48 ms。
  - diff 旁的文件列表只画屏幕上的行，每行宽度只量一次，上千个文件的组滚动和加载 diff 不再卡住。
  - 前面文件的 diff 还在加载时点一个文件，现在会滚到它的顶部。以前会停在另一个文件上。
  - 把窗格切到另一个 worktree 再切回来，第一个 worktree 只留一个监听，不再每来回一次多一个、每次变化都多读一遍评审。
  - 设置里选的语言或模型，在打开设置时的读取迟到后仍保持选中；agent 列表还在加载时，模型搜索框里输入的内容也不会被清掉。以前两者都会被撤回。
  - 换到另一个 worktree、失败后重试读取，或分析完成后，列表从顶部开始。以前会停在旧列表的滚动位置。
  - 路径里含 `:` 的文件，固定标题和“在视图中”的标记都正常。
  - 没有改动的范围显示 `No changes in this range`，不再显示 `No files in this group`。
- Review 栏：开着 Git 的 `log.showSignature` 时，logo 菜单也能打开了，以前会出错。菜单还会给每个尚未推送的提交标上 `↑`：以前要推送的提交超过 200 个时，有些会显示 `On origin/…`。
- Review 栏：评审还没打开就切到另一个 space，那个 space 的评审保持原样；logo 菜单还没读完就移到另一个仓库，菜单就不再弹出。以前前一个评审会替换掉新 space 的评审，旧仓库的菜单也会弹在新仓库上。
- Review 栏：窗口在后台时，文件变化不再启动 Git，回到窗口后一秒内计数跟上。已经离开的仓库有变化时，也不再让 Review 栏重新读一遍当前的仓库。
- Review 栏：未提交计数就是评审列出的文件数。暂存后又改回原样的文件不再计入，移动的文件只算一个。以前点 `1 uncommitted` 可能打开一份空评审。
- Review 面板：控件改用布局的主题色，和侧栏、菜单一致。
  - 悬停是一层很淡的文字色，和 Home 一样；打开、选中或在视图里的项用 `selected`，菜单里高亮的行也是。以前所有主题都是同一种半透明灰。
  - Re-run 和 Analyze with AI 用 `solid` 填充，和对话框的主按钮一样。以前是 `accent` 底白字。
  - 设置里 Unified/Split 等选项放在 `input` 轨道上，选中的用 `selected`，和 Custom snooze 一样。以前是灰色轨道加凸起的胶囊。
  - 在视图里的文件连成一块，只在两端圆角；相邻的测试文件也一样。以前每行各自一块。
  - 未勾选的框用 `input` 边框，和 T3 一样，在高亮行上也看得见。以前在部分主题里会消失。
- 有对话框或弹窗开着时，`cmd-w` 和 `cmd-shift-w` 关掉它，和 Herdr 自带布局一样：Go to、New、各个菜单、Settings、命令面板、Actions 编辑器等都是。以前会关掉后面的标签，或询问是否关闭。运行 `scripts/update.sh` 装上这些按键。
- 在分屏里关掉 agent 的窗格、标签里还有其他窗格时，留在该标签，由 Herdr 选剩下的窗格。agent 的程序自己结束时也一样。
- 同一个已命名标签里的两个 agent 各用自己的名字，侧栏、标签和窗格标题都一样。以前两个都显示标签名。父级旁边的子 agent 也不再用标签名。
- Lists 里，自己有 pane 的子 agent 只在父级下面显示一次。以前显示两次：父级下面一次，自己再占一行。置顶时仍单独一行。
- 右键不在标签里的终端（例如窗口里的终端）时，不再出现 Split、Zoom 和 Close pane，这些在那里用不了。
- 单独使用的 Inbox：Clear 的确认框大小随文字，和 Herdr 0.1.14 的对话框一样。以前固定 400×170。
- 窗格标题以 agent 名开头。终端地址从标题栏移到窗格的右键菜单（标题栏或终端上右键）：`Copy address` 旁边写着地址，点击即复制。名字只是程序名时（如 `Pi`、`zsh`）不再写在程序图标旁边。以前地址显示在名字前面。
- Inbox 卡片不再写 `1 sub-agent working`，和 T3 的侧栏一样不提子 agent：卡片的状态已经合并了它们。第 3 行的分支改为从中间截断，开头和结尾都看得到。

## 2026-11-08

- 新建标签开在 space 显示的目录，也就是第一个终端的目录：`+`、`cmd-t`、标签右键菜单和 New 都一样。以前开在 space 创建时的目录，所以 agent 换了目录的 space 会显示一个目录、新标签却开在另一个目录。
- 窗格标题里，终端地址和名字隔 6px，读作一个标签；目录仍在名字后 12px。以前三段都隔 12px。
- 评审窗格：
  - 分支对上游的标题按提交流向写：要推送是 `main → origin/main`，要拉取是 `origin/main → main`。以前写作 `To push: main` 和 `To pull: main`。
  - Review 栏 `↑`、`↓` 计数的悬停提示也这样写：`Review main → origin/main`。以前写作 `Review 2 commits to push`。
  - `Analyzing…` 不再带自己的转圈，窗格标题的转圈已经表示正在分析。
  - 其余转圈改用 `working` 色，和布局其他地方一致。以前跟着文字色。
  - 分组标签一行放不下时，横向滚动的标签在窗格边缘才被裁掉。以前在离边缘 16px 处就被截断，外侧还空出一条。
- 侧栏顶部照 T3：
  - Inbox 的 Search 行和 Lists 的 Spaces 标题行，和右边窗格的标题行对齐。以前低 8px。
  - 第一张卡片在 Search 下方 8px。以前要再低 10px。
  - 图标用 T3 的尺寸：顶部按钮（包括品牌栏）是 16px，品牌栏以前是 14px；机器行的 + 是 14px；折叠箭头是 12px。
  - 折叠箭头和机器行的 + 排在上面按钮的正下方，共两列。以前错开几个像素。
  - 顶部三排按钮的上下间距一样。
- 指针从一行移到下一行时，详情卡直接换成新的。以前旧卡会在新卡下面淡出，看起来会闪。
- 侧栏左上角、窗口按钮右边，照 Herdr 自带布局放了官方 logo 和名字。点它们回到 Home。悬停时和在 Home 时它们提亮，背后不加底色。原来的房子按钮已删除。
- macOS 上窗口按钮落在品牌栏的中线上，比以前高 1pt。
- 任何缩放下窗口按钮都留在这条中线上。缩放变化时，布局会更新你已安装的 `herdr-t3` 布局里的按钮位置。用别的名字另存的布局副本不改。
- 会滚动的弹窗列表（如新建菜单、跳转）在鼠标移过时不再滚动。以前指针落在只露出一半的行上，列表会把它滚进来。用方向键移动时，列表仍会滚到高亮的行。
- README 精简了，只讲这是什么、怎么安装、怎么上手。功能、快捷键、更新和已知限制在[使用指南](docs/user/guide.zh-CN.md)里，可选扩展在[单独的页面](docs/user/extras.zh-CN.md)。
- Inbox：
  - Settle 后点 Undo，agent 回到 Active 里原来的位置。不管用哪种方式 Settle、在哪个窗口点 Undo，都是这样。
  - 点 Undo 立即生效。以前最多要等 1 秒。
  - 对已 Settle 的 agent 按 `cmd-shift-s`，它排到 Active 顶部，和点撤销箭头、拖出 Settled 一样。
  - Settle 置顶的卡片会立即取消置顶。Settle 失败时，置顶放回原位。
  - 慢速远程机器上，Settle 不会再被迟到的旧写入撤销。
  - 后台窗口不再清掉到期的 Snooze，你回来时 `Woke` 还在。
  - Clear 的确认框标题是 `Close 2 terminals?`，和关闭标签一样。
  - Settle 按钮的提示只在当前查看的卡片上显示 `cmd-shift-s`，因为这个键只作用于这张卡。这张卡 Settle 后，它的撤销箭头也显示这个键。
  - 撤销箭头的提示改为 `Un-settle`，和拖动标记一致。
- Lists：
  - 用图钉按钮取消置顶后显示 `Unpinned, Undo`，和 Inbox 一样。Undo 把置顶放回原位。
  - 再点一次排序按钮会关闭菜单，和其他打开弹窗的按钮一样。
  - Spaces 查 git 信息时不再扫未跟踪文件，大仓库的磁盘开销少很多。
- 拖动 space 或标签时，按 Esc 放回原处，和 Inbox 一样。
- Herdr 有时会显示一个你没选的标签，比如程序自己退出时。这会清掉那里未读的 done 或 `Woke`，布局随后把它们还回去。还回去失败时只提示一次，并继续重试。以前失败时没有任何提示。
- 菜单和键盘：
  - 右键菜单一次只亮一行。Enter 执行亮着的那行，不再默认执行第一行。
  - 右键菜单支持 Home、End 和输入行首字母跳转。
  - Actions 菜单打开时没有高亮，刚打开就按 Enter 不会执行任何动作。
  - 右键菜单和 Actions 菜单里，指针离开一行就清掉它的高亮。
  - Tab 能走到 Review 栏的计数和 logo。
  - Tab 能走到新建菜单（New space、`← Spaces`）和跳转（New tab）的底部按钮。New space 的选机器步骤不再必须用鼠标。
  - 新建菜单的编号提示按平台显示：macOS 上是 `⌘1`，其他平台是 `Super+1`。
- Review：
  - 在设置里改语言、agent 或模型，只保存这一项。不会再撤回别的 Review 窗格里或刚才做的修改。
  - 快速勾选再取消“已审”，以最后一次点击为准。
- `scripts/update.sh` 不再把 mod 的测试文件装进 App 目录，并删掉旧版更新留下的。

## 2026-11-07

- 同一 core 的另一个窗口现在能认出已有的 Home，不再另建一个、并把原来的当作项目列出来。Home 看起来没有变化；你自己叫 Home 的 space 不会被认作它。
- `scripts/update.sh` 用一条命令更新已安装的布局：覆盖布局和 mod，合并 `keys.json` 并说明替换了哪些键，保留聚焦边框颜色、主题、Review 和主题导出的块。README 的「更新」一节改为只讲这个，旧的手动步骤已删除。
- 关掉正在看的 agent 时，如果它是所在 space 唯一的标签，现在会直接回到 Home。以前会先短暂显示别的 space 的标签，可能让那里的 agent 丢掉未读的 done。
- core 拒绝写入时，Settle 或 Snooze 不再留下 `Settled, Undo` 提示；Undo 写入失败时，提示也会保留，可以再点一次。
- Review 窗格的弹窗用 Esc 关掉后，再点按钮能立即打开，以前会有一小会儿点了没反应。
- Herdr 丢掉鼠标离开事件时，Spaces 里机器分组的标题不再一直亮着。

## 2026-11-06

- 整个布局的圆角、边距、尺寸和字号现在都照 T3 Code，同一种用途只有一个值。
  - **弹窗**：菜单行高 28、圆角 4、字号 14。New、Go to、Actions 编辑器、Custom snooze 和关闭确认按 T3 的对话框和命令面板绘制，圆角 16，底栏、键帽和 × 按钮也一样。
  - **侧栏**：按钮是 T3 的 28px；卡片、行和收纳区用它的间距；Inbox 顶栏 48px，Spaces 标题和它对齐；底栏 44px。
  - **工作区**：`+` 和窗格按钮 24px、圆角 8；Home 的键帽照 T3；标签栏的控件按 T3 分组。
  - **Review**：Review 栏的控件、窗格顶栏、commit 列表、设置和文件树用同样的数值。打开设置子页不再让窗格渲染失败，Collapse test files 也有图标了。
  - **菜单照 T3 下垂**：Snooze 放得下时和时钟右缘对齐，放不下时翻到左缘、向右伸出侧栏；排序菜单从按钮下方打开，右缘对齐。关闭确认和 Delete 是红色，字段标签用正文颜色。
  - **更新**：复制 `mods/t3-*` 和 `layouts/herdr-t3.*`，用 Review 的话再复制扩展，并删掉已移除的文件（`rsync -a --delete`）。单独发布的 `t3-actions` 现在也包含关闭确认。
- Inbox 空间筛选的弹层改成 T3 和布局其他弹窗的尺寸：圆角 8、内边距 4、带阴影，行高 32 且紧贴排列（之前行距 34），搜索框也更矮。搜索文字照 T3 距图标 20px，因此比名字靠左 4px，仍在按钮左缘以内。
- 切到被 zoom 藏起的 pane 时，现在会直接显示它：zoom 移到这个 pane，旁边的 pane 继续隐藏。以前卡片亮了但画面还停在原来的 pane，键盘也失效，被 zoom 的 agent 还会丢掉未读的 done。通知和外部 `agent.focus` 仍会晚一帧修正，done 会还回来。
- Lists 和 Inbox 现在用同一套规则，只是组织方式不同：按项目，或按注意力。
  - **关闭和返回，Lists 也一样**：关掉正在看的 agent 回到 Home，关掉其他标签回到你原来的标签，回到一个 space 时显示你离开时的标签。
  - **`cmd-]` 和 `cmd-[`** 按侧栏的顺序走顶层 agent，到两端停住，Lists 下以前会绕回去。Inbox 走它画出来的行；Lists 也走折叠的组。
  - **Settle 到处生效**：`cmd-shift-s` 在 Lists 和隐藏侧栏时都能用，并回到 Home。已 Settle 或 Snooze 的 agent 在 Lists、标签、窗格标题和 Go to 里都不再显示 done 圆点；在 Lists 里它留在原位，显示为 idle。
  - **隐藏侧栏后模式继续生效**：按键继续按该模式的行走，这些行隐藏时也保持最新；`Settled, Undo` 显示在标签栏 5 秒。
- Review 属于 space，因为多个 agent 共用它的工作树。
  - **每个 space 一个**：Review 栏会跳到已开着的那个，在别的标签也一样，不再新开。`Open in` 决定新开时的位置。以前每个标签各开了一个 Review 窗格的，把多余的关掉：Review 栏优先用当前标签里的那个。每个 Review 都有 Inbox 卡片，分屏也有，焦点在它上面时点亮。
  - **Settle Review 会返回**：关掉或 Settle 正在看的 Review，回到打开它之前的地方，不去 Home，因为看完通常要回去跟 agent 说话。
  - **Review 栏只统计和打开**：`3 uncommitted │ 5 ahead of main │ ↑2 │ ↓1 │ logo`。计数增减时 logo 不动；计数不再有颜色（颜色在这里表示 agent 状态），窄窗口用图标区分。logo 菜单只用来选 review 什么。
  - **切换在窗格里**：`‹ Commit 2 of 5 ›` 和这份 diff 的 commit 列表移到了窗格自己的顶栏。
  - **Analyze automatically 只对点计数生效**：从菜单选择或切换 commit 不再触发付费分析。
- 关闭标签不再消耗旁边 agent 未读的 done。程序结束、space 关闭或 Send back 时，Herdr 会短暂显示相邻标签，以前这会把它标成已读；现在离开后会恢复成未读，被清掉的 Woke snooze 也会回来。右键菜单的 Close（标签和窗格）改为和 × 一样先确认、先离开，用的是 Herdr 菜单的副本（`t3-menu`）。
- 键盘模式不再卡住：以前关掉持有它的部分，或在单独停靠 Inbox 时在键盘模式中退出，之后点卡片和行会把键盘从终端抢走。Inbox 隐藏时菜单还开着，也不再让模式一直保持。
- 再次点击打开弹窗的按钮，现在会关闭弹窗，不再关了又开：Actions ▾；Inbox 的 Search、New tab、New space；Spaces 的 New tab、New space；Home 的 Go to、New tab。
- Review 面板的设置和折叠菜单可以用键盘操作，和其他弹窗一致。Model 页打开后可以直接打字，Enter 选中高亮的行；悬停会移动高亮；↑/↓ 能到 Default 和自定义模型。Language、Agent 页和折叠菜单支持 ↑/↓、Home、End、打字、Enter 和 Space。折叠菜单或分析状态开着时，`j`、`k`、`r`、`f`、`c`、`s` 不再作用到下层的 diff。
- Custom snooze 的日历支持方向键。以前在日期或翻月按钮上按 Enter 只会关掉日历，现在和点击效果相同；日历打开时定位到已选日期。
- Agents 分组的箭头和 Review 分组的类别图标，在指针离开事件丢失时不再一直亮着。
- Herdr 不是活动窗口时悬停也能正常工作：卡片的控件、提示和详情卡会留在屏幕上，不再闪一下就消失。
- 修复了整个布局里过期或互相矛盾的状态：
  - **隐藏侧栏时**：已 Settle 的 agent 有新工作会计入开关，done 圆点也会显示；`cmd-shift-b` 和 `cmd-shift-s` 正常工作或不响应，不再报错（请改你的按键，见「更新」）。Inbox 或 Lists 没显示期间结束的 agent，保持真实的顺序和时间。
  - **Inbox**：把已置顶且 Snooze 的 agent 拖出来只唤醒，保留置顶；Undo 不再丢掉之后新加的置顶；很快按 Undo 不再闪烁；拖动在收不到离开事件时也能结束，任何缩放下都跟手。
  - **Lists**：在 worktree 里 `cd` 不再打乱 space 顺序和 `ctrl-N`。用别的方式连上的机器会恢复显示。临时机器显示真实状态，机器状态立刻更新。拖出窗口的行会回到原位。`git status` 跑得更少，一台挂起的机器不再拖住其他机器。
  - **标签和 Home**：用键回到某个 space，显示你之前所在的标签，不再是 Herdr 选的邻居。Go to 的 Back 可以跨标签。在 Home 取消关闭不再改动布局，启动时也不会多建一个 Home。拖动中标签发生变化时，不再选错或移错。
  - **键盘**：关掉所在窗格会结束键盘模式，第一次显示 Lists 或 Inbox 不再中断它。
  - **Review**：Retry 不再让窗格卡死。关掉 review 窗格后，Review 栏不再显示计数和步进。关掉自动分析对所有窗格立即生效，别的窗格不会再启动付费分析。daemon 死掉时显示失败，不再一直转圈；窗口在后台时分析结束，标记保留到你回来。
- 所有弹窗列表的移动方式统一了。Inbox 空间筛选、Actions 菜单和 Review 面板的模型列表里，↑/↓ 现在让高亮始终可见，不再跑出列表底部；New 和 Go to 里悬停一行就会高亮它，滚轮也会带着高亮走，和其他菜单一致。排序菜单没有高亮时按 ↑ 现在会到最后一行。
- Home 默认页现在是三个按钮：Next agent、Go to 和 New tab，并标出各自的按键。New tab 取代了 New space，后者在这里只会在主目录新建一个 space。Next agent 没有可去之处时会变暗。
- 隐藏侧栏时 `cmd-]` 和 `cmd-[` 也能用，和 Lists 一样按 Herdr 的顺序走。它们现在是 `t3-tabs.next` 和 `.prev`：请在你的按键配置里修改（见「更新」）。
- Inbox 空间筛选的弹层照 T3 从筛选按钮左缘展开；搜索文字之前会超出按钮。
- 显示 Inbox 时，标签栏不再和侧栏抢注意力：只放当前 agent、它的子 agent 和不含 agent 的标签（在这些标签里时，你最后看的 agent 留在最左），不显示状态标记。`cmd-1…9`、上/下一个标签的键和滚轮按显示的标签走（请把新按键加进你的配置，见「更新」），关掉当前 agent 后回到 Home。关掉不含 agent 的标签会回到你刚才所在的标签，不再落到右邻，旁边 agent 未读的 done 也不会被消耗。Lists 不变。
- Settle 或 Snooze 当前查看的 agent 后，现在会回到 Home：一个只显示后续按键的安静页面，不再把你带到下一张卡片。在这里按 `cmd-]` 打开最上面的卡片，Undo 能带回刚才的 agent。`cmd-shift-h` 或新的房子按钮可随时进入。它不占 space 序号（请把新按键加进你的配置，见「更新」），也能分屏放入任意 mod 或程序。
- 焦点在一个旁边没有 agent 的 mod 窗格上时，agents 列表不再点亮第一个 agent。
- Spaces 和 Agents 现在和 Inbox 一样有动画。折叠、排序、新建或关闭 space、agent 结束时，行在 150ms 内滑动和淡入淡出，大多数情况以前是瞬间跳变。
- 拖动 space 时行会抬起跟随指针，列表在落点让出位置，不再只画一条线；checkout 会带上展开的 worktree。
- Lists 和 Inbox 的行有了按下反馈，Lists 的折叠箭头交叉淡变。
- 悬停提示和详情卡不再卡在屏幕上；窗口不活动时也不再弹出。
- 指针移进卡片的 Snooze 菜单时，Settle 不再消失，时钟和菜单也不再跳动：菜单开着时卡片保持悬停的样子。
- 在行内控件之间移动时，详情卡不再闪烁：指针离开控件后卡片就回来，在行的其他位置照常显示。
- 悬停提示和详情卡淡入淡出时会滑动 4px，不再突然消失：离开提示、移到行内控件、换到下一行，都会淡出。

- New、Go to 和 Actions 编辑框打开时直接显示内容；原来的淡入会让它们先空白一下。
- 子 agent 行有了自己的详情卡，父行的卡片不再停留在它旁边。
- 关掉 checkout 后，它的 worktree 不再散开。checkout 没开且有两个以上时，它们折叠在一行代表仓库的暗色行下：点击打开 checkout 并由它接替这一行，箭头负责折叠。折叠状态按仓库保存；折叠后仍显示当前所在的 worktree。
- Lists 的外观和交互照 T3 的侧栏，仍保留 Herdr 的 Spaces 和 Agents 两栏。Agent 行高 36px，不需要关注时变淡（工作中的 70% 不透明度），时间和置顶按钮交叉淡变，悬停显示详情卡。按 space 分组时，分组头照 T3 的项目文件夹：space 标记和名字，只在折叠时显示数量和状态点，右键打开 space 菜单。折叠的分组仍显示当前查看的行，查看被折叠的子 agent 时点亮父级。重排时行会滑动。Spaces 行高 32px。收纳区标题和机器行 32px；排序菜单淡入，按键或指针到达前不高亮。
- 标签的悬停卡片不再挡路：指针移到 `×` 时收起；名字完整显示又没有状态要说时不再弹出。`×` 有自己的 `Close tab` 提示，500ms 后出现。
- `t3-theme-export` 不再丢失写入期间发生的颜色变化；导出改为 `{ name, colors }`，去掉没人读的 `light`。请同时更新 `pi-herdr-theme`。

## 2026-11-05

### 按 T3 的数值绘制

- Lucide 图标描边 1.75px，同 T3 的 CSS 把 Lucide 的 2px 调细。每个 mod 都用自己的副本，Herdr 自带的那些也一样；只有加载转圈不是 Lucide，仍用自带的。
- Inbox 的密度和 T3 侧栏一致：已 Settle、已 Snooze 的行和 Show more 为 36px，收纳区标题 32px、数量用常规字重，卡片内边距 6、圆角 6。
- 撤销提示条放在侧栏底栏，同 T3，不再遮挡列表：显示 `Settled,`（或 `Settled 2,`）和 `Undo`；空间不够时截断摘要，`Undo` 始终显示。单独停靠、没有底栏时，Inbox 仍在第一个收纳区上方显示。
- Custom snooze 的时长改用带 − / + 的数字字段，单位用下拉选择，同 T3 的对话框。
- Snooze 菜单、New、Go to 和 Actions 编辑框改为淡入。T3 同时从 98% 放大，Herdr 做不了缩放动画。
- Inbox 顶栏的 Search 尺寸照 T3 的搜索框：32px 高、16px 图标。
- New 和 Go to 的搜索框、底栏内边距照 T3 的命令面板。
- Actions 编辑框改为 T3 的 512px 对话框，高度随内容；Actions 菜单行 28px，编辑按钮 24px。
- 关闭确认改用 T3 的措辞：`Close terminal "<名字>"?` 和 "This stops the running process and clears its history."；标签里有多个在运行时为 `Close 2 terminals?`。
- 标签要移动 6px 才开始拖动，同 T3；不到 6px 松手时选中按下的那个标签。
- 键盘焦点照 T3 的 focus-visible：用 `pane.go` 移到 Inbox、Spaces 或 Agents 后进入键盘模式，Tab 走遍侧栏、标签栏和窗格标题栏的控件，当前控件有 2px 内描边；键盘落在某行时，该行悬停才出现的控件也会出现；Enter 或 Space 触发。菜单支持 Home、End，没有搜索框的菜单还支持 T3 的字母 typeahead。鼠标操作不变：点击后键盘仍留在终端。`pane.go` 向左走到边缘时现在会进入侧栏。
- 更新：用 `mods/t3-*` 各文件夹覆盖已安装的；用 Review 的再复制 `extras/mods/review` 和 `extras/mods/pulls-review`。

### 图标统一为 Lucide

- 布局和 Review 扩展的图标都换成 Lucide，和 T3 Code、shadcn/ui 一样，同一套网格。改动的有搜索、机器图标、侧栏开关、窗格标题栏的分屏/缩放/关闭，以及 Review 的 Phosphor 图标（含分类图标）；程序图标、Review 的文件图标、Windows 窗口按钮和加载转圈不变。
- 更新时：覆盖已安装的 `mods/t3-*`，用 Review 的话再覆盖 `extras/mods/review` 和 `extras/mods/pulls-review`；遗留的旧图标（`review/ph/`、`t3-pane/split-*.svg`）可以删掉。

### 对齐

- 侧栏行和卡片里的按钮悬停只变亮、不加底色，和 T3 一致：Inbox 的时钟、Settle、撤销和 Wake，以及 Lists 里机器行的 `+`、worktree 和子 agent 的折叠、图钉；Snooze 菜单打开时时钟同样只是变亮。栏、标题行和标签的 `×` 保留底色，也和 T3 一致。
- 分组标题统一成一类，照 T3：Agents 列表的分组和 Inbox 的 shelf、Spaces 的机器行一样，12px 淡色标签，数量和箭头放在最右（展开朝下、折叠朝右），箭头和状态标记同列，悬停整行时变亮。分组标签不再用状态色。
- 窗格标题的图标和第一个词对齐到第一个标签的图标和文字，也和终端正文同列。
- 标签栏的 `+`、窗格最后一个按钮和状态标记同列，距窗口边缘 10px，和品牌栏按钮一致。`+` 改为 26px，与 recipe 写的一致。
- Lists 里，checkout 的折叠箭头和标题栏最后一个按钮、状态标记同列；折叠箭头统一为 12px；`New space here` 按 space 行排版。
- 更新：复制 `mods/t3-pane`、`mods/t3-tabs`、`mods/t3-spaces`、`mods/t3-agents` 和 `layouts/herdr-t3.json`。

### 新建：space 建在哪台机器，只有一条规则

- 侧栏的 New space 在机器多于一台时先问建在哪台，Inbox 和 Lists 都一样，和 New 菜单原有的行为一致。`cmd-n` 仍然不问，直接用当前 space 的机器；机器行的 `+` 用该行的机器。
- Spaces 标题栏和 Inbox 顶栏有同样的两个按钮：New space（`folder-plus`，原来是 `+`）和 New tab（先选 space）。
- 更新时：复制 `mods/t3-spaces`、`mods/t3-inbox`、`mods/t3-new-menu` 和 `layouts/herdr-t3.json`。

### 跳转：程序，以及回到上一处

- `cmd-p` 和 Inbox 的 Search 打开布局自己的跳转（`t3-picker`，改自 Herdr 的 picker），画法同新建菜单：T3 的命令面板，两行的行带 space 标记、程序和状态标记，底部是按键提示。每个窗格一行，名字和图标与窗格标题、标签一致，不再按标签列出 Herdr 自己的标签名：输入 `lazygit` 回车，就跳到那个窗格，不管它旁边有没有 agent、在哪个 space。标签名只有你命名过才参与搜索。ctrl+d 关闭这个窗格，有程序在运行时先确认。
- 第一行回到你上次从这里跳走前的窗格，打开时就选中它，所以 `cmd-p`、回车就能来回切换。
- Pi 退出后，终端不再沿用旧的 Pi 会话名：在原处启动的 lazygit，标签和窗格标题都显示 lazygit。
- 更新时：把 `mods/t3-picker` 也复制过去，并把 `"cmd-p": "mod.open:t3-picker"` 加进 `layout:herdr-t3` 的快捷键。

### Inbox：找回 review

- 独立标签里的 review 和 agent 一样有卡片：分析时在 Working，结束后回到 Active 顶部。从任何 space 点它都能回去，`cmd-]` 和 `cmd-[` 也会走到它。Settle 就是关闭，已审标记和分析结果都会保留，可以从 Review 栏重开。
- agent 旁边的 review 获得焦点时，点亮那个 agent 的卡片，快捷键从它继续走。
- Review 栏的菜单分成 Commits 和 Branches 两页，点击或按 Tab 切换，两者不再混在一起。分支行显示最后一条提交、比默认分支多几个提交和时间；悬停时出现和提交一样的卡片，另外列出作者、与上游的差距，以及它检出在哪个 worktree。
- 退出 Herdr 时正在分析的 review，重启后不再一直转圈到你打开它：Review 栏启动时清掉这个状态，还在跑的分析几秒内会重新显示。

### 动作和 Review 成为独立 mod

- 动作移出 `t3-tabs`，成为单独的 mod `mods/t3-actions`，随布局一起提供，也[单独发布](https://github.com/JinJieBeWater/herdr-t3-actions)给其他布局用。它属于更新时要覆盖的 `mods/t3-*`；已有的动作会保留。
- 单独发布的 Inbox 仓库改名为 [herdr-t3-inbox](https://github.com/JinJieBeWater/herdr-t3-inbox)，和里面的 mod 同名；旧的 herdr-t3-focus 地址会自动跳转过去。mod 仍叫 `t3-inbox`，已装的不受影响。
- pulls.review 扩展改成 Review 栏（`extras/mods/pulls-review`）和评审窗格（`extras/mods/review`），配合 [pulls.review fork](https://github.com/JinJieBeWater/pulls.review/tree/multi-repo) 的 `jin.review` 使用；也[单独发布](https://github.com/JinJieBeWater/herdr-pulls-review)了一份。它仍是可选的，见 README 的可选扩展。

### 视觉

- 悬停提示和 T3 一样在控件上方打开，卡片上的提示不再挡住标题。上方放不下的（品牌栏、标签栏及其中的 Actions 和 Review 栏、Inbox 筛选）仍在下方打开。
- 标签照 T3 的面板标签：24px 高，放得下时显示完整名字。放不下时最长的先让步，当前标签降到 240px、其他降到 144px，再放不下就滚动，并保持当前标签可见。名字很短的标签至少 96px，`Pi` 这样的标签不再只有一条。
- 侧栏底栏改成一排图标按钮。
- 新安装时先显示 Inbox。
- 悬停标签时图标不再变化：`×` 改到标签末尾，盖住状态标记，悬停提示里加上状态文字。这里和 T3 不同，T3 是图标变成 `×`。每个标签都为这个位置留出宽度，悬停时宽度不变。
- Active 为空时留白，和 T3 一样，不再显示 `Nothing needs you.`。只有整个列表为空才居中提示；筛选后没有内容时，提示里会写出空间名。
- 窗格背后改用和标签栏相同的 `chrome`：在 `canvas` 不同色的主题里，窗格上方不再露出一道 2px 窄条。Herdr T3 自带主题的外观不变。

### 交互

- 悬停标签时，图标变成 ×，并用一个安静的悬停提示显示完整名字，时机与 Inbox 行一致。
- 工作区窄于 1024px 时，动作和 Review 栏收成图标和数字。
- mod 窗格可以给所在的标签和窗格标题栏提供标题、图标和状态；评审窗格就这样显示分析状态。
- `cmd-]` / `cmd-[` 照 T3 在 Inbox 里走：按画出来的行的顺序，到两端停住；折叠的区只算当前查看的那一行。显示 Lists 时照旧用 Herdr 的 `agent.next`。更新后，在 `keys.json` 的 `layout:herdr-t3` 分区加上 `"cmd-]": "t3-chrome.next"` 和 `"cmd-[": "t3-chrome.prev"`。
- **Snooze**，照 T3：鼠标移到卡片上，点时钟打开菜单（In 1 hour、In 3 hours、This evening、Tomorrow、Next week、Custom…）。agent 进 Snoozed 收纳区等待，到点回到原位并标 `Woke`；需要你时会提前出现，撤销、Wake 或把它拖出收纳区都能立刻叫回。
- 已置顶的卡片也能 Settle，和 T3 相同：Settle 会取消置顶，Undo 放回原位。
- 查看没有自己行的子 agent 时，点亮它父 agent 的卡片，Settle 也作用在这张卡片上。
- 从别处切到被 space 筛选隐藏的 agent 时，筛选会放宽为全部 space。
- 关闭标签或窗格时，里面有程序在运行就先确认，空 shell 直接关闭：包括 × 和 `cmd-w` / `cmd-shift-w`。更新后，把仓库 `keys.json` 里的 `cmd-w`、`ctrl-alt-shift-x`、`cmd-shift-w`、`ctrl-alt-x` 四行加进你的 `layout:herdr-t3` 分区。Agent 和右键菜单的关闭不变。

### 修复

- 折叠或展开收起区时，区标题和行一起滑动，卡片不会再从它上面滑过。
- 撤销提示条里的 Undo 改成中粗，悬停时加下划线，和 T3 一致。
- 窗格标题栏里的长名字会用满标题栏的空间，不再止于 260px。

## 2026-11-04

一大堆修复和视觉打磨，更贴近 T3 Code。

### 远程机器

- **添加机器**：侧栏底部 Settings 那一行末尾的服务器图标，Lists 和 Inbox 里都有。
- **重连**：重建过的机器会显示 Connect，用原来的名字重新配对；配对失败会留在列表里并写明原因。
- 机器标题上的 `+` 和 New space there 会在那台机器上新建 Space，本机也一样。
- 其他机器上的 Inbox 卡片带服务器图标，悬停显示机器名，和 T3 一样。
- New 菜单会标出远程 Space，新建 Space 时先问建在哪台机器上。
- Space 图标在它所在的机器上查找。

### 视觉

- Space 显示仓库自己的 favicon；没有的话，按名字从 T3 的 18 种颜色里取色，在同色浅底上显示首字母，不再是实色方块上的白色首字母。中文名显示第一个字。
- Inbox 里需要你处理、已完成或正在看的标题会亮起，其余变暗。
- 卡片的程序图标和机器图标放到第三行末尾，标题独占一行。
- 已 Settle 的条目开头显示项目图标。
- 悬停按钮时，图标和文字一起变亮。
- 窗格按钮不再把标题栏挤动。

### 交互

- 所有图标和控件悬停都会显示 T3 风格的提示，带快捷键和补充说明；靠近窗口底部时向上弹出。
- 悬停 Inbox 条目，旁边会淡入它的详情，条目上的时间和按钮交叉淡入淡出。
- Inbox 条目会滑到新位置，新条目淡入、移除的淡出；拖放松手后从松手处滑回。
- Settle 和 Unpin 之后显示撤销提示，持续 5 秒。
- New 菜单改成 T3 命令面板的样式：只列 Space，列表跟着高亮项滚动，New space 和快捷键提示放在底部。
- 菜单、对话框和拖动行为统一：每个菜单都能用方向键，Clear 通过 Herdr 自带的确认框确认，拖动中的标签页变半透明，指针离开即结束拖动。

### 修复

- Space 的顺序和 `ctrl-N` 跟随嵌套显示，挂在主仓库下的 worktree 和快捷键顺序一致（来自 Herdr 官方 spaces mod 的修复）。
- 关掉 Clear 的确认框后，按钮不再一直亮着。
- pulls.review 扩展：不再弹出 Opening… 提示。

### 移除

- agent view。更新后从 `keys.json` 删掉 `"cmd-shift-a": "t3-tabs.view"`。
