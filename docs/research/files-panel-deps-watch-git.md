# Files 面板：目录监听、路径检索与 Git 状态依赖评估

调研日期：2026-11-11。建议面向 `mods/t3-files` 第一版，不把可选外部 watcher、`fd` 或 `rg` 设为必装依赖。

## 结论

- **本地目录更新继续使用 Herdr 的 `watchFolder`。** 当前 runtime 的实现使用 Rust `notify` crate 7 的 `RecommendedWatcher`，macOS 用原生递归监听；Linux 逐目录使用非递归 inotify，并过滤 Git 忽略目录及 Git 对象目录。文档所述 4096 非忽略目录上限来自实现中的保护阈值。无需为本地 Files 再加一套 watcher。依据：[Herdr `src/files.rs`，commit `865d2fa`（2026-11-01）](https://github.com/JinJieBeWater/herdr-app/blob/865d2fa170ea152ee6cb8935aef4c625aa9fdfa9/src/files.rs)、[`notify = "7"` 依赖声明](https://github.com/JinJieBeWater/herdr-app/blob/865d2fa170ea152ee6cb8935aef4c625aa9/Cargo.toml)。
- **远端 Linux 首选“可用则事件、否则轮询”。** 如果远端已装 `watchexec`，可试验用 `hc run --bg --on <machine>` 启动 `watchexec --only-emit-events`，用 JSON 事件让面板刷新；安装和读取链路还未在 Herdr 实测，不能把它当硬依赖。没有该 CLI、启动失败、终端输出丢失或远端文件系统不支持事件时，用 10 秒左右的刷新兜底。`watchexec` v2.8.0 在 2026-10-06 发布并提供 Linux 发布包；其手册定义 `--only-emit-events` 输出 JSON 事件。依据：[发布页（2026-10-06）](https://github.com/watchexec/watchexec/releases)、[watchexec 手册 `--only-emit-events` / JSON（2026-11-11 查阅）](https://github.com/watchexec/watchexec/blob/main/doc/watchexec.1.md)、[本机 Herdr runtime `AGENTS.md`（0.1.14，2026-11-11 查阅）](/Users/jinjiebewater/.config/herdr-app/AGENTS.md)。
- **文件清单由 Git 定义，搜索在 mod 内过滤已加载清单。** `git ls-files -co --exclude-standard -z` 同时给出 tracked 与未忽略的 untracked 路径，并保留 Git ignore 语义；之后按输入路径做子串匹配、截断 200 项。`--others` 必须遍历未跟踪树，忽略规则可剪掉 ignored 路径，但大型且 untracked 很多的目录仍会比较贵。`fd` 和 `rg --files` 可作人工或诊断工具，不保证机器上有安装，且默认隐藏/忽略规则与 Git 并不完全相同。依据：[Git `ls-files` 手册（最新版 2.55，2026-06-29）](https://git-scm.com/docs/git-ls-files)、[ripgrep 文件遍历规则](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)、[`fd` 手册](https://github.com/sharkdp/fd/blob/master/doc/fd.1)。
- **机器读取 Git 状态用 `git status --porcelain=v2 -z --untracked-files=all`。** `-z` 的 NUL 分隔可安全处理空格、换行等路径名；rename/copy 记录可能带两个 NUL 分隔的路径，解析器需按 v2 格式处理。继续加 `--no-optional-locks` 避免后台 status 刷新 index；在没有真实大仓库基准前，保留 `-c core.fsmonitor=false`。依据：[Git `status` 手册（最新版 2.56，相关章节最后更新于 2.53/2026-02-02）](https://git-scm.com/docs/git-status)。

## 1. 目录监听

### 运行时现状与本地选择

Herdr 的 `watchFolder(path)` 是共享的异步 watcher：返回下一批路径；事件会先合并，待处理路径有上限，溢出时退化成根路径全量失效。`src/files.rs` 使用 `notify::recommended_watcher`；依赖锁定为 notify 7。macOS/Windows 对根目录递归；Linux 因 inotify 每个目录需要一个 watch，改成对目录逐个安装非递归 watch，并在新增目录时更新 watch 集合。Linux 扫描会调用 Git 找 ignored directory，跳过 Git objects，最多接受 4096 个目录。说明和源码一致；若遇到 ignored、objects 或上限行为，实际刷新覆盖范围按这些规则理解。[Herdr `files.rs`（2026-11-01）](https://github.com/JinJieBeWater/herdr-app/blob/865d2fa170ea152ee6cb8935aef4c625aa9fdfa9/src/files.rs)；[本机 Herdr App `herdr.d.ts`（runtime 0.1.14，2026-11-11 查阅）](/Users/jinjiebewater/.config/herdr-app/herdr.d.ts)。

**推荐保持原样。** 这已是成熟跨平台原生后端，不受 mod 的 JS API 限制，也复用了 Herdr 管理 watcher 的事件合并和生命周期。只需针对实际 Files 场景做首次扫描、目录增删、watcher 失败后的刷新兜底；不要把 watcher 更换成本地实现任务。

### 候选能力与实际边界

| 候选 | 当前能力 | 对本 mod 的适用性 |
|---|---|---|
| `@parcel/watcher` | Parcel 的原生 Node module，可订阅和查询目录事件。 | mod 不能加载 Node native module；单文件 ESM bundle 也不能把平台 native binding 变成可用的 Herdr API。可作为 Node 宿主的 watcher，不能直接成为本项目依赖。[源码仓库](https://github.com/parcel-bundler/watcher)（官方 README，2026-11-11 查阅）。 |
| `chokidar` | Node 文件监听库。v4 移除 glob 支持、减少依赖；v5 改为 ESM-only 并要求 Node 20.19+；截至调研日 Releases 最新是 v6.0.0（2026-10-19）。 | 它是 JS 库，不是常见独立 watcher CLI；还需在 Herdr JS 模块体系之外运行 Node，mod 本身不能直接用。[v4 发布说明](https://github.com/paulmillr/chokidar/releases/tag/4.0.0)（2024-09-13）、[v5/v6 发布记录](https://github.com/paulmillr/chokidar/releases)（v5：2025-11-25；v6：2026-10-19）。 |
| Node / Bun `fs.watch` | Node 的 `fs.watch` 在 macOS、Windows、Linux 等系统上基于系统事件；递归选项目前仅部分平台/版本支持。Bun 提供 watcher API，可用递归模式。 | 两者是宿主 runtime API；Herdr mod runtime 不等于 Node/Bun，没有这些 `fs` API 可直接调用。也不是独立 CLI。[Node API 手册](https://nodejs.org/api/fs.html)（2026-11-11 查阅）、[Bun watcher 指南](https://bun.sh/guides/read-file/watch)（2026-11-11 查阅）、[本机 Herdr runtime 类型定义](/Users/jinjiebewater/.config/herdr-app/herdr.d.ts)（runtime 0.1.14，2026-11-11 查阅）。 |
| Watchman | 常驻 daemon，可通过 `watchman -j --server-encoding=json -p` 订阅；订阅持续推送带 root、clock 和文件列表的 JSON packet。 | 功能成熟、事件游标设计强，但需安装并维护 daemon。适合组织已有 Watchman 部署的环境；不假定远端机器已装。[订阅协议](https://facebook.github.io/watchman/docs/cmd/subscribe)（2026-11-11 查阅）、[安装文档](https://facebook.github.io/watchman/docs/install.html)（2026-11-11 查阅）。 |
| `watchexec` | 活跃维护的跨平台 CLI；`--only-emit-events` 会停止启动命令而持续发 JSON 事件；官方 release 提供 Linux 预构建包。 | 对 `hc` 远端持久终端来说，是最贴近“监视并输出事件”的现成 CLI。发布包可下载不等于系统预装；没有确认所有 Linux 构建是静态链接，部署时应先探测 `command -v watchexec`，不在线下载、不把它设成必备。[手册](https://github.com/watchexec/watchexec/blob/main/doc/watchexec.1.md)（2026-11-11 查阅）、[v2.8.0 发布页](https://github.com/watchexec/watchexec/releases/tag/v2.8.0)（2026-10-06）。 |
| `fswatch` | 多平台 CLI，可递归监听、选择事件源并输出可配置文本记录。 | 能当备选 CLI，但不是 JSON 事件协议；事件字段需自行约定/解析。Linux 下递归 inotify 对目录数量和系统 watch 限额敏感。[官方仓库与 man page](https://github.com/emcrisostomo/fswatch)（2026-11-11 查阅）。 |
| `inotifywait` | Linux inotify-tools CLI，支持递归和格式化输出；上游发布 x86_64/aarch64 Linux 静态构建。 | Linux-only，输出可配置但不是 JSON。可用于精简机器上的备选，不如 watchexec 的结构化事件适合直接接入；递归 watch 依赖 inotify watch 限额。[上游构建说明](https://github.com/inotify-tools/inotify-tools)（2026-11-11 查阅）、[`inotifywait` 手册](https://manpages.debian.org/testing/inotify-tools/inotifywait.1.en.html)（2026-11-11 查阅）。 |
| Rust `notify` | 跨平台 Rust 文件系统通知库；`RecommendedWatcher` 依平台选择后端。网络挂载（如 NFS）可能不产生可靠事件。 | Herdr 已经用它，不需在 mod 外再运行一份。若未来必须自制 CLI，可基于成熟库而非写 inotify parser；这仍会多一个要分发的二进制。[crate 文档](https://docs.rs/notify/latest/notify/)（最新版 8.2.2，2026-11-11 查阅）。 |

### 远端 Linux

`exec(cmd, args, { on })` 是单次命令并有最多 10 分钟超时；远端长期 watcher 应通过 `hc run --bg --on <machine>` 放在 Herdr Core 管理的持久终端里。用 `watchexec --only-emit-events` 可输出 JSON 事件；mod 可通过 `hc([...])` 读终端文本，再增量解析新事件。Herdr 的 `hc` 文档说明远端 `run` 会在远端机器启动终端、`read` 可取终端文本。本设计仍有两处待实现验证：终端输出被保留/截断的策略，以及读游标是否能避免重复消费；若消费端只能取屏幕快照，不能将它当作可靠、无损消息队列。[本机 Herdr runtime `AGENTS.md`（2026-11-11 查阅）](/Users/jinjiebewater/.config/herdr-app/AGENTS.md)、[Herdr `hc` 远程示例](https://github.com/JinJieBeWater/herdr-app/blob/865d2fa170ea152ee6cb8935aef4c625aa9fdfa9/defaults/AGENTS.md)（2026-11-04 版本）。

所以建议分层：远端 `watchexec` 可用时用它减少刷新延迟；否则 10 秒间隔执行低成本状态刷新，watcher 意外退出或断线后回退轮询。确认远端文件树位于本机 Linux 文件系统：NFS/网络挂载可能不可靠地产生内核事件；Git 官方对自己的 fsmonitor daemon 也明确把网络挂载列作默认拒绝/实验性支持，`notify` 同样列有网络文件系统限制。[Git fsmonitor 手册](https://git-scm.com/docs/git-fsmonitor--daemon)（最新版 2.55，2026-06-29）、[`notify` 文档](https://docs.rs/notify/latest/notify/)（2026-11-11 查阅）。

## 2. 快速文件枚举与路径搜索

`git ls-files` 默认列 index 中 tracked 路径；加入 `--others --exclude-standard` 才列未跟踪且未忽略的路径。`--exclude-standard` 会采用 `.gitignore`、`.git/info/exclude` 和用户级全局 ignore。用 `-z` 取 NUL 分隔，避免路径名含特殊字符时拆错。读取全部 tracked paths 只需要读取 Git index；加入 `--others` 后 Git 必须扫描工作树里未被 ignore 规则剪掉的未跟踪目录，所以大多数已有文件都 untracked 的生成目录会显著增加成本。可用 `git status --porcelain=v2 -z --untracked-files=all` 同时取得变动状态和每个 untracked 文件，但它也需要枚举未跟踪树，且 status 输出不含 clean tracked files。依据：[Git `ls-files`](https://git-scm.com/docs/git-ls-files)（最新版 2.55，2026-06-29）、[Git `status`](https://git-scm.com/docs/git-status)（最新版 2.56，2026-02-02）。

对当前方案建议：进入 Files 时加载一份 `git ls-files -co --exclude-standard -z` 路径快照并在 200 条结果上限内匹配输入；文件增删、`.gitignore` 更新、Git 状态刷新或定时刷新时使快照失效。先不要为每个键入字符再启动 Git 命令。若扫描巨大 untracked 树实测超预算，可分成 tracked 快速首屏与 untracked 延后枚举，但需要明确首屏搜索暂未覆盖 untracked 文件。

`rg --files` 和 `fd` 是遍历目录的高性能工具，但部署不能依赖它们存在；它们的规则与 Git 也不相等。ripgrep 默认忽略隐藏文件及 `.gitignore`、`.ignore`、`.rgignore`，`fd` 默认隐藏/ignore 过滤且支持 `.fdignore`。这样会漏掉被 Git track 的 dotfile 或遵循额外 `.ignore` 规则的路径，无法作为 Git 面板的权威全量清单。可以在用户机器已有时用于诊断或 CLI 搜索；核心路径来源仍应使用 Git，非 Git 目录按草案退回递归文件枚举 / `find`。依据：[ripgrep 官方指南](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)（2026-11-11 查阅）、[`fd` 手册](https://github.com/sharkdp/fd/blob/master/doc/fd.1)（2026-11-11 查阅）。

Git untracked cache 缓存未跟踪目录信息，可减少每次 `status` 重新走目录树的成本，但依赖目录 mtime 正常变化；遇到 mtime 不可靠的文件系统会有正确性风险，应按 Git 文档建议确认后再启用。`feature.manyFiles` 会启用此缓存，还会设 `index.version=4` 与 `index.skipHash=true`；后者对老 Git 版本兼容有要求。因此不要在只读 Files mod 里私自改用户仓库配置；可观察现有 Git 配置，随后报告实测收益供安装文档推荐。依据：[Git config `core.untrackedCache` 与 `feature.manyFiles`](https://git-scm.com/docs/git-config)（最新版 2.56，2026-09-28 更新）、[Git `update-index`](https://git-scm.com/docs/git-update-index)（2026-11-11 查阅）。

## 3. 快速 Git 状态和只读边界

### fsmonitor、cache 和解析格式

Git 内置 `git fsmonitor--daemon` 是后台服务。Git 当前 `core.fsmonitor` 文档将内置 daemon 的支持平台列为 macOS、Windows；daemon 文档另有 Linux/inotify 限额说明，因此部署到远端 Linux 前不能假定其可用。fsmonitor 启用时 Git status 向 daemon 要变动路径，减少检查未变文件。Git 官方源码说明 daemon 也会收到 `.git` 活动，cookie 文件用于与事件流同步；daemon 把 cookie 路径视作同步信号，不把 `.git` 内部路径作为普通工作树改动返回。Git CLI 用户的 `status` 默认仍可能刷新并写 index 的 stat cache；`--no-optional-locks` 可以关闭这类可选的后台 index 写入。依据：[Git config `core.fsmonitor`](https://git-scm.com/docs/git-config)（2.56 手册，2026-11-11 查阅）、[daemon 文档](https://git-scm.com/docs/git-fsmonitor--daemon)（最新版 2.55，2026-06-29）、[daemon 对 `.git`/cookie 的分类源码](https://github.com/git/git/blob/master/fsmonitor--daemon.h)（2026-11-11 查阅）、[`git status` 后台刷新章节](https://git-scm.com/docs/git-status)（最新版 2.56，2026-02-02）。

在本项目的面板里，fsmonitor cookie 可能被 `watchFolder` 当作 `.git` 下的普通变动唤醒，因此仅开 `core.fsmonitor=true` 仍可能带来“状态查询—cookie 事件—再次查询”的刷新循环。**如果以后实测需要启用，mod 侧应只过滤已识别的 fsmonitor cookie 临时路径，同时继续响应 index、HEAD、refs 等真正影响状态的 Git 元数据事件；不要忽略整个 `.git`。** 不建议通过禁用 watcher 来阻止循环，因为那会丢掉外部暂存、切分支等状态更新。项目当前命令覆盖了 `core.fsmonitor=false` 与 `--no-optional-locks`，是保守的只读边界；在评估提速收益和 cookie 事件过滤之前保持此设置。

`core.untrackedCache` 可与 fsmonitor 同时减少未跟踪树和 tracked 文件检查工作量，但它仍是写入 index 的缓存配置；保留纯只读执行时不应自动启用。状态输出建议用 `git status --porcelain=v2 -z --untracked-files=all`；机器解析稳定，未跟踪文件不只给目录名。v2 rename/copy 有双路径记录，删除可由 `D` 状态给 Files 标记。依据同上。[Git config](https://git-scm.com/docs/git-config)（最新版 2.56；2026-06-29）、[Git status porcelain / `-z`](https://git-scm.com/docs/git-status)（2026-02-02）。

### 本机计时

| 项目 | 值 |
|---|---|
| 机器 | Darwin 27.0，Apple Silicon arm64（2026-11-11）；Git 2.54.0 `Apple Git-157` |
| 仓库 | 本机 `herdr-mygo`；1667 tracked files，0 untracked files |
| 设置 | 每项先 warm-up，再以 `/usr/bin/time -p` 单次计时；`--no-optional-locks -c core.fsmonitor=false`；输出送 `/dev/null` |
| `git ls-files -z` | 0.00 s |
| `git ls-files -co --exclude-standard -z` | 0.01 s |
| `git status --porcelain=v2 -uno -z` | 0.00 s |
| `git status --porcelain=v2 -uall -z` | 0.01 s |

这个机器上没有合适的数万/数十万 tracked files 本地仓库；该结果只有低规模基线价值，计时精度也只有百分之一秒，不应据此推断大型仓库里 `--others`、fsmonitor 或缓存的相对收益。没有改仓库配置或 index。

## 对照：现计划与推荐

| concern | current plan | recommended | why | risk |
|---|---|---|---|---|
| 本地目录 watch | `watchFolder`，变化时刷新，10 秒 timer 辅助 | 继续使用；refresh 时合并事件并支持失败/上限情况下 timer 兜底 | Herdr 已用 `notify` 原生 backend；无需额外依赖 | Linux 忽略 ignored dirs，最多 4096 dirs；大树或事件丢失要全量刷新 |
| 远端 Linux watch | API 只能本地 watch，远端需轮询 | 可检测到时用 `hc run --bg --on` + `watchexec --only-emit-events`；轮询作为安装缺失、断线和网络挂载降级 | 现成 CLI 能输出 JSON 事件，`hc` 能保活远端进程 | 机器不一定安装；`hc read` 流消费语义需要原型验证；NFS 可能漏事件 |
| Git 文件枚举 | `git ls-files -co --exclude-standard`；非 Git 用 `find` | Git 命令只在打开/树变更时跑，缓存快照后对 query 做本地过滤；`fd`/`rg` 不作硬依赖 | Git index/ignore 是 tracked 与 untracked 的准确基准 | `--others` 仍遍历所有未忽略 untracked 树；超大目录会有初始成本 |
| 路径搜索 | 过滤所有路径，最多 200 条 | 防抖 query，已加载路径在内存匹配并截断 200 | 无需每次按键重新启动 CLI | 巨量清单 JS 匹配仍有 CPU 开销；应以大仓库实测校准 |
| Git 状态 | 强制 `core.fsmonitor=false --no-optional-locks` | 目前保持；格式用 `--porcelain=v2 -z --untracked-files=all`；将来只有验证 cookie 过滤后再评估 macOS fsmonitor | 保住只读边界并避免 `.git` 写入反馈；v2 NUL 输出适合机器读 | 无 fsmonitor 时大仓库 status 慢；untracked cache 也会写 index 且依赖可靠 mtime |

## 来源日期说明

优先查阅截至 2026-11-11 的上游官方手册、发布页与 Git 源码。Git 官方手册页面显示最新版 2.56；fsmonitor 手册在 2.55（2026-06-29）更新，status 文档最近的实质更新为 2.53（2026-02-02）。各项目当前手册未标发布日期的，表内标为“2026-11-11 查阅”。Herdr 行为以本机 Herdr App 0.1.14 runtime 手册及 2026-11-01 的 `files.rs` 实现核对。
