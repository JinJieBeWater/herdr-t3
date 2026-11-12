# 数据存在哪里、怎么取名、怎么读写

布局里凡是要保留到下一帧之后的数据，都按本文存放、取名和读写。本文是唯一出处：新增一种数据、改一个键名，先改这里。

## 六个地方

先问两件事：谁要看到它，它要留多久。答案决定存放位置。

| 存在哪里 | 放什么 | 谁看得到 | 留多久 | 例子 |
|---|---|---|---|---|
| 终端标签 | 某个终端（agent）自己的事实 | 每个窗口、每台机器 | 和终端一样长 | `settled`、`snoozed` |
| 共享状态 `shared()` | 本机几个 mod 共用的数据 | 本机所有 mod、所有窗口 | 重启后保留 | `t3.pins`、`t3.settings` |
| `localStorage` | 一个 mod 自己的界面状态（折叠、筛选、收纳区开合） | 只有这个 mod 副本 | 重启后保留 | Inbox 的 `scope`、`settled.open` |
| 内存 | 本次运行的记忆 | 只有这个 mod 副本 | 重启就没了 | `navigation.js` 的 `trail`、`lastIn`、`fresh` |
| 布局文件 | Herdr 没有命令能改的布局字段 | Herdr | 直到下次更新覆盖 | `traffic_lights` |
| 用户文件夹 | 用户放进来的文件，和由它们生成的缓存 | 读它的 mod，以及用户本人 | 直到用户删除 | `<appHome>/asciicn-wallpaper/*.ans` |

- **终端标签**只经 `shared/labels.js` 的 `writeLabel` 写：它统一报错（`Couldn't update the agent`），返回是否写成；`quiet` 用于会重试的写入，只在第一次失败时提示。
- **内存**里的记忆在代码注释里写明「只记本次运行」，必要时附 `shortcut:` 说明何时改为持久。
- **用户文件夹**放在 `<appHome>/<用途>/`，不放进 mod 文件夹：`scripts/update.sh` 用 `rsync --delete` 更新 mod，会把它冲掉。生成的缓存放在其中的隐藏子目录（`asciicn-wallpaper/.tiles/`），以源文件的 `cksum` 加生成代码的版本号为键，最后写完成标记，所以源文件改了、生成中断、或生成代码换了，都会重新生成；源文件没了，缓存一起删。
- **布局文件**只用 `writeTextFile` 带 `expected` 写，在文本里只替换那一个字段，替换后和解析结果核对。`layout.set` 会清空 Herdr 记的点击状态（侧栏宽度、当前 stack、选过的主题），不用于外观字段（[ADR 0009](../adr/0009-settings-hold-real-preferences.md)）。

## 共享状态的键名

布局 mod（`mods/`）带数据的键都列在 `shared/store.js` 的 `KEY` 里，代码只写 `KEY.<名字>`，不写字面量；`extras/` 里的 mod 按同一取名规则管理自己的键（`review.shown`）。取名按写入方：

- **`<mod>.<name>`**：只有一个 mod 写，其他 mod 可以读。`t3-tabs.home`、`t3-inbox.rows`。
- **`t3.<name>`**：几个 mod 都写，或者属于整个布局。`t3.pins`、`t3.notice`、`t3.settings`。
- `<name>` 用 lowerCamel：`t3.spaceIcons`、`t3.agentOrder`。

两类按约定取名，不进 `KEY`：

- **弹窗关闭时间戳**：mod 整个就是一个弹窗时用 `<mod>.closed`（`t3-picker.closed`）；mod 平时是别的东西、另外还会以某种弹窗打开时用 `<mod>.<那种弹窗>Closed`（`t3-agents.sortClosed`）。由弹窗的 `close()` 写，打开它的控件用 `focus.js` 的 `justClosed` 读。
- **名字由别人定的键**，照用：和 Herdr 自带 mod 共用的 `layout`、`space.colors`、`agents.sort`；Inbox 的 mod 卡片约定 `<mod>.program`、`<mod>.status`、`<mod>.titles`。

## 读写

- 几个 mod 都要读写的数据，经 `shared/` 里的一个模块读写，默认值也写在那里：置顶经 `shared/pins.js`（`pinList`、`pin`、`unpin`、`putBack`），布局设置经 `shared/layout-settings.js`。所以 Pin 不管从哪里点，都会结束 Snooze；Undo 不管从哪里点，都会把置顶放回原位。
- 只有一个 mod 读写的键，在那个 mod 里写 `shared(KEY.x) ?? 默认值`。

## `localStorage` 的键名

小写单词，用点连接，写成 `<东西>.<状态>`：`settled.open`、`repos.folded`；只有一个词就够时用一个词：`scope`、`changes`。每个 mod 副本各有一份，不加 mod 前缀。

Files 和 Review 各自保存 `lines.wrap`（布尔字符串）、`nav.width`（逻辑 px）和 `nav.open`。两页复用读写函数，但只访问自己副本的 `localStorage`。`migratePagePrefs()` 在各页初始化时，从旧 `t3.wrap`、`t3.navWidth` 复制尚未设置的初值；更早的 `review.prefs.wrap` 作为换行初值的后备。旧共用偏好暂留作尚未启动页面的迁移来源，不再写入，也不参与已迁移页面的日常读取。跨页请求 `review.reveal`、`t3-files.reveal` 已退休，迁移只清理它们。

两页的完整 space 数据都是本次运行的缓存，每页最多保留最近三个。较早的 space 只留轻量的选择、展开和评审范围等阅读设置；文件内容、Editor、diff 行、换行和布局缓存都要释放。驱逐时使已发出的异步读取失效；迟到的结果不能重新填满已释放的数据。两页使用仅可见时的有界刷新，不保留不可退订的目录监听。关闭 space 时一并清理它的内存记录。

## 改名

布局有真实用户（[ADR 0008](../adr/0008-change-behaviour-without-toggles.md)），所以改持久的名字必须带迁移：

- 共享状态的键：在 `shared/store.js` 的 `RENAMED` 里加一条 `[旧名, 新名, 是否带走值]`。只是缓存或转瞬即逝的值不带走，只删旧键。新名下已有值时以新名为准，但空值（`null`、空数组、空对象）不算有值。`t3-tabs`、`t3-inbox`、`t3-actions` 在 `init` 里调 `migrate()`，它们任何一个都可能单独运行。
- `localStorage` 的键：读它的 mod 在 `init` 里调 `migrateLocal([[旧名, 新名]])`。
- 终端标签不改名：它们分布在各台机器上活着的终端里，没有地方能一次迁完。所以 `settled`、`snoozed` 不带前缀，和 `herdr.seen`、`pi.session` 不同，这是本规则之前就有的例外。

迁移条目保留到确定所有安装都已更新过一次后再删。
