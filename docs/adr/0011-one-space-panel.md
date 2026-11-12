# Review 和 Files 在唯一的 space 面板里

开关只有一份、不按 space 记这一条，已由 [0012](0012-each-space-keeps-its-panel.md) 取代。

[0007](0007-review-belongs-to-the-space.md) 让 Review 属于 space，但它实际是某个标签里的窗格，于是要靠规则补：别的标签已开着就跳过去、标签和分屏都有卡片、关闭或 Settle 回到打开前的地方，而切到同一 space 的别的标签就看不见它。现在 Review 和新的 Files 都放进窗口右侧唯一的 space 面板：全高、和侧栏对称，跨标签固定，内容跟随当前 space。两者是面板的两页，同时只显示一页；面板只有一个，开关和宽度也只有一份，不按 space 记。

面板沿用 Herdr 自带布局的结构和 id：`panel` 列里一个 `panel-body` stack，用 `layout.select`、`layout.show`、`layout.hide` 切换。顶上 40px 的面板头由 `t3-chrome` 画，列出 stack 里实际有的页。Review 是 extra，安装时把自己的块加进 `panel-body`；没装就只有 Files。

面板里内容在左、导航在右：导航贴窗口外沿、内容贴标签区，和左侧栏对称。Files 是右边文件树、左边文件内容；Review 的组侧栏和文件栏也移到 diff 右边，和 pulls.review 网页版方向相反。

Inbox 的卡片只代表一个 agent 或一个窗格。Review 不再是窗格，也就没有卡片；它的状态（AI 分析中、分析好了还没看）显示在标签栏的 Review 栏和面板头的 Review 页签上。

## Considered Options

- **Review 留在标签里，再加一个右侧 Files 栏**：两套位置规则，Review 的补救规则全部留着。
- **面板放在标签栏下面（Herdr 自带布局的位置）**：看起来属于当前标签，和“跨标签固定”相反。
- **每个 space 记自己的面板开关**（Herdr 自带布局的做法）：面板只有一个位置，切 space 时忽开忽关，人得猜它会不会在。
- **Review 保留 Inbox 卡片**：卡片的单位是 agent 和窗格，space 的状态放进去，卡片就不再一一对应焦点能去的地方。

## Consequences

- 一个 mod 副本服务所有 space：Review 和 Files 按 space id 记各自的状态（Review 的页、Files 的展开和选中文件）。
- Review 的位置改用 space 的 folder，不再跟焦点窗格的 cwd。
- Review 的 `Open in`（窗格或标签）设置项删除。
- 面板默认和标签区一样宽，可以拖；窄时 Review 按原有规则改用页签和 unified diff。
- 单独发布的 herdr-pulls-review 也改成面板：在 Herdr 自带布局里，把 `review` 块加进它的 `panel-body`。
