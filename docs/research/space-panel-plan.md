# Space 面板方案：Review 和 Files（定稿待批，2026-11-11）

把 Review 从「标签里的窗格」改成窗口右侧唯一的 space 面板，新增核心 mod `t3-files` 作为面板的 Files 页。决策见 [ADR 0011](../adr/0011-one-space-panel.md)。本文每个技术选择都有实测依据：

- [依赖调研：监听与 git](files-panel-deps-watch-git.md)、[依赖调研：JS 库](files-panel-deps-js.md)
- [本机验证](files-panel-verify-local.md)、[远程验证](files-panel-verify-remote.md)、截图在 [files-panel-verify/](files-panel-verify/)

测量环境：本机 macOS arm64；远程 `kvm`（Ubuntu 24、git 2.43，没有 watchexec、inotifywait）；大仓库是 microsoft/vscode 浅克隆（21,019 个路径，另加 2 万个被忽略文件和 5 千个未跟踪文件），50k–200k 用合成路径。

## 1. 形状

```text
root (row)
├── sidebar
├── work（tab 区，不变）
└── panel (column, hidden, weight 1, min 480)      ← 新增，全高，id 同 Herdr 自带布局
    ├── panel-head  40px   t3-chrome {part: "panel"}：[Review] [Files] … ⤢ ×
    ├── panel-body (stack)
    │   ├── files  → t3-files（核心）
    │   └── review → review（extra；update.sh 在装了 extra 时插入）
    └── panel-bottom-inset 8px
```

- 窗口里只有一个面板；Review 和 Files 互斥。开关和宽度全局一份（Herdr 记在布局点击状态里）。
- 内容跟随当前 space；切同一 space 的 tab 不变。
- 页内一律内容在左、导航在右：Files 是文件内容 | 文件树，Review 是 diff | 组和文件栏。
- 切换只用原生命令 `layout.select` / `layout.show` / `layout.hide`；`⤢` 是 `layout.hide {id: "work"}`。已在 demo 验证：全高面板显示正常，`layout()` 读得出 stack 子块和当前页。stack 引用未安装的 mod 会显示报错，所以 Review 块只能由 `update.sh` 在装了 extra 时加入。
- 公用函数在 `shared/panel.js`：`panelState`、`showPage`、`hidePanel`、`togglePanel`、`toggleWide`。

## 2. 入口

| 入口 | 行为 |
|---|---|
| 标签栏右组的 Files 按钮、`cmd-shift-e` | 打开面板到 Files；已在 Files 页就关闭 |
| Review 栏的计数 | 打开面板到 Review，显示那段 diff |
| Files 里改动文件的 `Review ↗` | `setShared("review.reveal", {space, file, n})` 后 `showPage("review")`；只在面板有 review 页时出现 |
| 面板头 × / 再按入口 | `hidePanel()`，面板放大过的同时恢复 work |

## 3. Files 页：本机和远程

一个 mod 副本服务所有 space：按 space id 存展开文件夹、选中文件、搜索词、Preview/Code 选择。每次异步读取前记下 `generation` 和 space，返回后不一致就丢弃（实测：切 space 不取消进行中的 `exec`，结果照样回到旧副本）。

| 关注点 | 本机 space | 远程 space | 依据 |
|---|---|---|---|
| 根目录 | space 的 `folder` | 同，`on: space.machine` | — |
| 列一个文件夹 | `exec("sh", 列目录脚本)`（同 Herdr 自带 files），展开时按需读 | 同，带 `on` | 远程一次往返中位数 69 ms |
| 被忽略的项 | 对一个文件夹的直接子项批量 `git check-ignore --stdin`，显示变暗 | 同 | 2 万条一次要 3–3.7 s，只对展开文件夹的子项批量查，不逐行 |
| git 标记 | `git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z --untracked-files=all`，A/M/D/R 用 Review 的颜色，折叠文件夹带点 | 同 | 噪声仓库本机 0.26 s、远程 0.15 s；fsmonitor 实测无提速，保持关闭 |
| 变化感知 | `watchFolder(root)`，事件合并 300 ms 后：刷新 git 状态，只重读事件路径所在且已展开的文件夹；60 s 定时器兜底 | 面板显示 Files 页且窗口在前台时，每 10 s 一次状态和已展开文件夹刷新；切回面板或窗口时立即刷新一次 | 本机写入到事件 152 ms；git status 不产生事件（无循环）；`node_modules` 下每个文件一条事件，所以要合并。远程没有可用 watcher（`watchFolder` 不支持 `on`），10 s 轮询约占远端一个核的 3% |
| 搜索数据 | 打开搜索时取一次 `git ls-files -co --exclude-standard -z`，变化后失效；非 git 目录用 `find` | **在远端过滤**：每次输入（防抖 200 ms）跑一条 `exec`：`git ls-files -co --exclude-standard -z \| tr '\0' '\n' \| awk -v q=<查询>`，awk 要求每个词（小写）都是路径子串，最多回 1,000 条；查询作参数传入，不拼进 shell | 本机列 21k 路径 0.11 s。远程把 1.5 MB 清单经 mod `exec` 传回要 6–12 s，所以不传整份。远端过滤在 kvm 的 vscode 仓库实测 160 ms（含往返）。`tr` 换行是为了兼容 mawk 和 BSD awk；路径里含换行的文件搜不到 |
| 搜索算法 | 小写快照；每词都是子串；新字符只在上次候选里过滤；每 5,000 条 `await cx.sleep(0)` 让出；候选 ≤1,000 时用 uFuzzy `info`+`sort` 排序取前 200 并高亮，否则先显示前 200 条未排序结果 | 远端回来的 ≤1,000 条用同样的 uFuzzy 排序 | 200k 路径每键最高 61 ms、不被打断；全量 uFuzzy 在 100k 会被打断；排序 1,000 条约 6 ms |
| 读文本 | `readTextFile`：不存在 → `null`；二进制、非 UTF-8、超过 1 MiB、目录 → 抛错，按错误文字分别提示 | 先 `exec` 读大小和前 8 KB 有无 NUL；超过 1 MiB 或二进制就不读；否则 `readTextFile(path, {on})`，再检查 U+FFFD | 远程读二进制不抛错而是返回带 U+FFFD 的串；远程读超过 1 MiB 的文件要 8–26 s 才报错 |
| 代码预览 | gpui-base `Editor` 只读，主题色，语言按下表 | 同 | 截图验证见 editor-languages.png |
| Markdown | `TextView.markdown`，默认 Preview，可切 Code，记住上次选择 | 同 | — |
| 图片（png/jpg/svg/gif/webp） | 复制到 `cache/t3-files/` 后 `image()` | ≤512 KiB：`exec("base64")` → `atob` → `fs.writeFile` 到 cache 后显示；更大的提示在远端过大不预览 | 五种格式都能显示；远程 2.17 MB 传输要 12–28 s |
| 缓存清理 | `close()` 删自己写的 cache 文件；启动时清掉上次遗留 | 同 | close 有 250 ms 预算，崩溃时不会调用 |
| 右键 | Copy path、Copy relative path、Mention in agent、Reveal in Finder、Open in default app | Copy path（标出机器名）、Copy relative path、Mention in agent | 远程路径在本机打不开 |
| Mention in agent | 剪贴板是文本时：保存 → 写入 `@相对路径 ` → `pane.focus {terminal}` → `terminal.paste` → 等 150 ms → 恢复。剪贴板不是文本时不碰它，提示改用 Copy relative path。目标是本 space 当前查看的 agent，没有 agent 就不显示这一项 | 同（粘贴发生在本机窗口里） | 实测 bracketed paste、不回车、能跨 tab；立即恢复会粘进旧内容 |
| 文件名排序 | 文件夹在前；自写自然排序（数字段按数值，不分大小写） | 同 | 运行时没有 `Intl`；`localeCompare` 不是自然排序 |

### Editor 语言表（截图验证）

| 扩展名或文件名 | `language` |
|---|---|
| js mjs cjs jsx ts mts cts tsx | `js` |
| json jsonc | `json` |
| yaml yml | `yaml` |
| rs | `rust` |
| go | `go` |
| py | `python` |
| sh bash zsh | `sh` / `bash` / `zsh` |
| css | `css` |
| c h / cpp cc cxx hpp | `c` / `cpp` |
| java / kt kts / rb / php / sql / lua | `java` / `kotlin` / `ruby` / `php` / `sql` / `lua` |
| graphql gql | `graphql` |
| Makefile GNUmakefile | `makefile` |
| 其他（toml、html、vue、svelte、scss、swift、xml、diff、nix、zig、ex、Dockerfile、md 的 Code 视图……） | 纯文本（不传 language） |

## 4. Review 迁移（改现有 extras/mods/review、pulls-review）

- `main.js`：`h_resizable` 两个子块对调、`groupSidebar` 移到右边。
- 状态按 space id 存，不再用窗格 `props` 和 `localStorage`；仓库位置取 space 的 folder。
- 收 `review.reveal`：切到对应文件。
- `pulls-review/open.js`：找窗格、split、`tab.new` 改成 `showPage("review")`；删除 `openIn` 设置。
- `review.status` 按 space 记；分析状态显示在 Review 栏和面板头的页签上；Inbox 卡片随窗格消失，Inbox 代码不改。
- 远程 space 没有 Review（daemon 只听本机），面板头也就只有 Files。
- 图标匹配改用 `shared/file-icons.js`。

## 5. 依赖

| 依赖 | 用途 | 接入方式 |
|---|---|---|
| `@leeoniya/ufuzzy` 1.0.19（MIT） | 候选 ≤1,000 时排序和高亮 | 根 `package.json` 固定版本，`bun build --format esm` 成 `mods/t3-files/vendor/ufuzzy.js`（约 22 KB） |
| catppuccin/vscode-icons（MIT，固定 revision） | 文件和文件夹图标映射 | 开发时从 `fileIcons.ts` / `folderIcons.ts` 生成 `file-icons.json`，只复制用到的 SVG；按 VS Code 顺序匹配：带父目录的完整名 → 完整名 → 最长扩展名 → 默认；Review 共用 |

- `scripts/vendor.sh` 生成以上产物和 LICENSE 声明，产物入库，用户安装不需要 bun。
- `scripts/check.sh` 新增：vendor 产物里不得有裸 import、`process`、`Buffer`、`setTimeout`、`Worker`、WASM。

不用的：Shiki（一行 TS 就超时）、`@pierre/*`（要 DOM 或 WASM）、fzf / fuzzysort / microfuzz（5 万条建索引被打断）、watchexec（远端通常没装，`hc read` 会重放旧事件）、`ignore`、isbinaryfile、Linguist（理由见调研报告）。

## 6. 不做

编辑、新建、改名、删除；改动行着色（`Editor` 不能标行，看 Review）；内容搜索；远程实时监听；设置项。

## 7. 验证计划

- `mods/t3-files/check-files.cjs`（假 herdr + render-guard）：porcelain v2 解析（含重命名双路径）、check-ignore 合并、搜索过滤与前缀复用、自然排序、语言表、图标匹配顺序、generation 丢弃过期结果。
- `herdr-app check`、`tsc`、`scripts/check.sh`。
- demo 窗口按默认宽度整窗截图：Files 页（本机仓库）、Review 页翻转后、面板关闭、`⤢` 放大；远程用 demo core 加 kvm（远程验证报告里的步骤）截 Files 页。
- 点击、拖动分隔线无法用 `herdr-app do` 驱动，交付时标为未验证。

## 8. 已知限制（写进用户文档）

- 远程 space 的变化最多晚 10 s 出现，大于 512 KiB 的远程图片不预览。
- 文本预览上限 1 MiB；`Editor` 只给上表的语言着色。
- 搜索只按路径，不搜内容；Git 忽略的文件不进搜索。
- 远程 space 没有 Review。
