# Home 是一个隐形 space

Home 是全局一个、放在本机的真实 space，在 Spaces、新建菜单和 Inbox 的范围筛选里都不显示；`ctrl-1…9` 和切换 space 的键改由 `t3-tabs` 处理并跳过它，项目序号不变。它是真实位置，所以焦点离开 agent，所有跳转也都能自然离开 Home。识别只靠 `shared("t3-home.space")` 里的 id，不看里面有什么。里面只放一样东西：一个 mod（默认 `t3-home`，设置里可换），或者一个 shell；没有窗格标题栏，不能 split、关闭。Home 里不放 agent：早先 Home 的窗格任人摆放，结果在 Home 的 shell 里起的 agent 占住了 Home，此后回 Home、Settle、Snooze 都落在它上面，Home 不再是安静的落脚点。所以 Home 的 shell 里一出现 agent，这个 space 就原地变成普通 space，下次回 Home 新建一个。跳转逻辑放在 `t3-tabs`，因为标签栏一直显示，而品牌栏会随侧栏隐藏。

## Considered Options

- **`stack` 叠加页**：不占 space，但焦点仍在被盖住的窗格上，每个作用于当前窗格的键和每条跳转路径都要额外处理，漏一处就可能改到看不见的终端。

## Consequences

- 切到其他布局或执行 `herdr-app ls` 时能看到它；从另一台机器看，它是一个普通的远程 space。
- 想要别的 Home，换掉那个 mod 或改成终端（见 [0009](0009-settings-hold-real-preferences.md)），不在 Home 里摆放。设置页只列 `mod.json` 写了 `"home": true` 的 mod：已装的 mod 大多是侧栏、标题栏和弹层，全列出来没法选。Herdr 自带的 split 键和命令面板拦不住，这样加进来的窗格照常能关，Home 自己的最后一个窗格不能用快捷键关。
- 回 Home 永远落在 Home 自己的标签上。Home 里出现 agent 时，改的是 Home 的身份，不动 agent：清掉记住的 id，把名字改成空，Herdr 按目录命名。最初做法是把 agent 挪到同目录的 space（先 `terminal.park` 再改 `herdr.space`/`herdr.tab` 标签），但要先给 Home 建新标签、卡片会先消失再出现、画面跳一次，起一次 pi 闪三下，代码也多。代价：不会并进已有的同目录 space，每次在 Home 起 agent 多一个 space。
- 不靠拦住来防：没法阻止人在 shell 里敲 `pi`，放掉比拦更省事，也不会丢东西。
- 默认页带框、居中放三个按钮、不放水印：去掉边框时 Home 像窗口塌掉了一块；房子图标、Herdr 图标和羊的剪影做水印都不好看。
