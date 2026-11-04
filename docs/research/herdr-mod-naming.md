# Herdr App mod 命名研究

## 结论先行

- **发布前必须定：** `pulls-review`（Review 栏）可以保留；通用 `review`（评审窗格）建议改为 `pulls-review-pane`，以免安装到已有同名 mod 的用户环境时被自动改名，破坏栏与窗格间的约定。**依据：** Herdr 安装规则明确要求同名时改目录名并同步布局 mod 名和代码路径；该栏硬编码 `pane.mod === "review"`，并依赖 `review.*` shared key。[1][2]
- **发布前必须定：** `herdr-actions` 建议保留。这个目录名有明确项目归属，且样本/Herdr 自带 mod 名单里没有同名项；`Actions` 是合适的显示标题。**依据：** 官方规则以 mod 目录名作为冲突判断和安装身份；本地 installed.json 的 mod 名单没有 `herdr-actions` 或 `actions`。[1][3]
- **以后再说：** shared key `bar.compact` 适合继续作为跨 mod 的接口；这是刻意共享的全局语义，不应因某一 mod 改名而重命名。**依据：** t3-tabs 写入它，herdr-actions 与 pulls-review 都读取它。[4]

## 官方规则与社区惯例

- **官方没有要求目录名必须带 `herdr-`、布局前缀或 owner 前缀。** 指南规定 mod 位于 `mods/<name>/`，分享时按 `herdr-mod` topic 收录；安装遇到重名（包括 Herdr 自带 mod）就改新 mod 的文件/目录名、布局里的 `mod` 名和代码中的 `mods/<name>/` 路径。文档没有规定仓库名、目录名和 title 必须一致。[1]
- **title 是展示名，目录名是运行时身份。** Gallery 通过公开仓库的 `herdr-mod` topic 收录，推荐命名上目录名取稳定、区分度高的 kebab-case 标识，title 可用产品品牌或可读名称；仓库名可表示产品、集合或布局，不必与单个 mod 同名。样本中存在 `herdr-atuin-threads` → `mods/atuin-threads/` → `Threads`、`herdr-space-folders` → `mods/space-folders/` → `Space folders`、`herdr-git-graph` → `mods/git-graph/`（无 title）等关系。[1][5]
- **实际样本里有三类目录风格，并无统一强制前缀：** ①通用/功能名：`space-folders`、`git-graph`、`issues`、`reviewer`；②产品/项目带前缀：`atuin-threads`、`forge-ci`、`forge-issues`；③按布局/项目组织的目录，例如 `herdr-layout-examples` 中多组 layout 各自带 `t4-*`、`tmux-prefix` 等 mod。owner 前缀不是主要模式。抽样仓库星数从 1 到 33；Herdr T3 仓库在 topic 搜索中为 128 星，按已有真实安装用户评估改名影响。[5][6]
- **仓库名与 mod 目录名可以不同。** 多 mod 仓库尤其明显：`herdr-forge` 包含 `forge-*` 多个目录；示例仓库下也按布局分组。Gallery 卡片主要展示项目/布局名和作者，`herdr.dev/mods` 与 Gallery 的入口相同。[5][7]

## 冲突、自动改名会影响什么

Mod 名会成为布局块里的 `mod` 值、命令名 `<mod>.<command>` 和 keys.json 的 `mod:<name>` 标识，也常被代码用于 `openOverlay({mod})`、共享 key 前缀及资源路径。Herdr 指南只承诺改名时改目录、布局 mod 名和代码路径；没有说明会迁移 `data/<mod>` 或自动改写 keys.json。因此应假定这些依赖都要人工同步，旧路径下的数据可能留在原处。`shared.json` 是按 key 持久化的；保持 key 时数据可继续读，换 key 则旧值不会自动合并。[1][8]

| 名字 | 撞车风险 | 若安装器改名，具体影响 |
|---|---|---|
| `herdr-actions` | 低：项目/品牌前缀明确，Herdr 内置名单无同名项；社区样本也未见此目录。[3][5] | 改目录需同步 `MOD` 常量、`openOverlay` 的 mod、`mods/<name>/action-*.svg` 路径、README/布局引用、keys.json 的 `mod:herdr-actions` 与命令引用，以及可能的 `data/<mod>`；继续使用 `t3-actions` 则用户动作仍在原 shared key 下。仓库注释明确 key 改名会丢用户已存动作。[9] |
| `pulls-review` | 低：有产品语义且不泛化；仓库、目录和 bar id 都明确指向产品。[5][10] | 改名需同步 `MOD`、overlay 的 `mod`、`mods/<name>/logo.svg`、配置读取路径、README/布局引用和 `mod:pulls-review` / `<mod>.<command>`；`pulls-review.root` 是 hc label，不会自动随目录改名，需另行保持或迁移。[10] |
| `review` | 中高：通用名，用户自建或其他评审 mod 使用同名并不意外。此轮本地 installed.json 中没有内置 `review`，抽样公开目录中也未命中 `review`；这只能说明抽样未见冲突，不能保证用户配置不存在。[3][5] | 若被改名，`bar.js` 的 `pane?.mod === "review"` 会无法识别评审窗格；窗格 `PANE`、`openOverlay`/`pane.split` 目标和 logo 路径必须同步。若将 shared key 从 `review.*` 换掉，已有窗格状态与栏数据不会自动迁移；`keys.json` 的 `mod:review` 及 `<mod>.<command>` 也需更新。[2][11] |
| `pulls.review` title | 低 | 只是标题，不是运行时 mod ID；保留可加强品牌识别。无需因目录名采用 `pulls-review-pane` 而改 title，显示名可用 `Review` 或更明确的 `pulls.review`。[1][10] |
| `Actions` title | 低 | 只是显示名，和 `herdr-actions` 对应清楚；无需改。[1][9] |

## 逐项建议与所需动作

### P0：发布 pulls.review 前把窗格目录定为 `pulls-review-pane`

建议双 mod 的最终身份为 `pulls-review`（bar，title `pulls.review`）和 `pulls-review-pane`（pane，title `Review`）。保留仓库名 `pulls.review` 和 npm 包 `jin.review`，它们是产品分发名，不构成 Herdr 内部冲突。`pulls-review` 已是描述清楚、低冲突的名字；`review` 则值得在首次公开安装前加上项目限定词。[1][5][10]

改名要点：重命名 `mods/review/`；把所有 `PANE` / pane mod 目标、bar 里的硬编码 `pane?.mod` 与 pane 筛选值改成 `pulls-review-pane`；将 `review.shown/status/titles/program` 等 pane 状态 key 一并换成新前缀，且同步两边读写处；更新 `mods/review` 路径、logo 图标路径、README、安装说明、示例 layout 和 `mod:review`/命令绑定（若 keys.json 中存在）。保留 `pulls-review.root` 标签及 `bar.compact` 跨 mod key。[2][4][11]

对已有 Herdr T3 用户：当前 T3 有 128 星，已按真实用户看待。此 pulls.review fork 的 Herdr mods 位于公开 fork 的 `multi-repo` 分支；暂未发现该 pane 已被 T3 用户安装的证据。若实际已有安装者，首次升级目录改名会被 Herdr 视作新 mod：布局仍指向旧名时新 pane 不会显示，旧 `review.*` shared 数据和 `data/review` 不会自动迁移。首次公开前改名成本最低；若已安装用户，则应先决定是否做显式兼容迁移。[1][6][10]

### P1：保留 `herdr-actions`，锁定 shared key

保留目录 `herdr-actions`、title `Actions`、shared key `t3-actions` 和 action 图标名。目录带 Herdr 前缀且在目标机器内置 mod 名单未冲突；将来同名再冲突的概率低于 `actions` 这类通用目录名。README 已解释 shared key 沿用 T3 旧标识以保留数据，应维持该承诺。[3][9]

若未来因用户配置确有重名而不得不改名，应一起更新目录名、代码中的 `MOD`、overlay 目标、SVG 资源路径、布局引用、`keys.json` 命令标识及 `data/<mod>` 相关路径；**不要**改 shared key。这样用户动作数据仍在原 `shared.json` key 下。首次安装若冲突被自动改名，用户布局若引用原名、快捷键若绑定旧 `mod:<name>`，功能入口会失效；需要安装说明列出绑定调整。[1][8][9]

### P2：保持 `bar.compact` 为共享接口

此 key 表达窗口栏的紧凑状态，被 `t3-tabs` 写入，pulls-review 和 herdr-actions 读取；它跨 mod 共用是合理的，不需要前缀化。未来其他布局若要采用，应沿用同一约定，确保写入方明确且未设置时读者正常工作。[4]

## 全量复核（2026-11-05）

**决定：** 评审窗格保持 `review` 不改（目前没有撞名，`pulls-review-pane` 太长）。`herdr-actions` 放进 herdr-t3 仓库随布局发布，由 `scripts/sync.sh` 同步到单独的仓库。之后它改名为 mod `t3-actions`、仓库 `herdr-t3-actions`，取代上面“保留 `herdr-actions`”的建议：发布前没有用户，改名不需要迁移；它和 herdr-t3-focus 里的 `t3-inbox` 同一套规则，也和保存动作的 shared key 同名。改名前扫描了 184 个仓库（含 fork）的 715 个 mod 目录，没有撞名。

上面的结论基于约 8 个代表仓库。之后扫描了 `topic:herdr-mod` 和 `topic:herdr-layout` 各前 100 个结果（去掉 herdr-t3 和 herdr-t3-focus 后共 181 个仓库，179 个含 mod，639 个不同目录名），修正和补充如下：

- **撞名：** `review`、`actions`、`herdr-actions`、`pulls-review`、`pulls-review-pane` 都是 0 命中；`reviewer` 2 个，含 review 的还有 `branch-review`、`commit-review`、`metro-review`、`ship-it-review` 等。所以 `review` 目前没有实际撞名，“中高”指它过于通用，而不是已有冲突。改名的理由是通用名加上 `bar.js` 的硬编码，以及现在改成本最低。
- **`herdr-` 前缀：** 639 个目录中只有 17 个（2.7%）带它。样本里的常见做法是仓库带 `herdr-`、目录不带。`herdr-actions` 不符合多数习惯，但换成 `actions` 太通用，仍建议保留。
- **`pulls.review` 未被收录：** 这个仓库没有 `herdr-mod` topic，按官方说明不会出现在 herdr.dev/mods。这也支持“暂无 Gallery 安装者、现在改名成本低”的判断，但它不是安装量数据。
- **`t3-*` 不用改代码：** `t3-tabs`、`t3-pane` 按 `${x.mod}.titles` 等规则读取，窗格改名不影响它们，只需改 herdr-t3 README 里提到 `shared("review.status")` 的说明。
- **布局带不带依赖：** 官方指南说布局文件夹包含“它需要的 `mods/<name>/`”，安装时复制每个 mod 文件夹。星数前 45 的布局（去掉 herdr-t3 后）里，只有 3 个引用了仓库外的非自带 mod：`herdr-relevo`（`issues`、`space-folders`）、`herdr-rooms` 和 `herdr-layout-catppuccin`（`git-graph`）。所以 herdr-t3 应把 `herdr-actions` 放进仓库一起发布，而不是只靠 README 让人另装。

## 样本方法与边界

样本通过只读 `gh search repos topic:herdr-mod`、`topic:herdr-layout` 搜索（各最多 100 条），确认指南规定的 topic 名；再从公开仓库递归 Git tree 中识别 `mods/*/mod.json` 并读取代表性 mod.json。抽样包括 `atuinsh/herdr-atuin-threads`（33 星）、`jankeesvw/herdr-space-folders`（26）、`rabeeh-ta/herdr-git-graph`（25）、`DnzzL/herdr-automations`（25）、`vytasgavelis/herdr-reviewer`（9）、`jankeesvw/herdr-issues`（17）、`greenflagged/herdr-forge`（9，多个 mod）、`herdrdev/herdr-layout-examples`（10，多布局）。仓库列表有混合 topic、空 title、子目录放 mod 等情况，因此样本只用于观察命名风格，不将 title/仓库名当成目录名的替代指标。[5]

对撞名的结论仅代表本机内置名单与上述样本；未逐一检查每个 Gallery 用户的 `~/.config/herdr-app/mods/`，也不据此断言全球没有同名 mod。[3][5][7]

## 来源

1. 本机 Herdr 官方安装指南：`~/.config/herdr-app/AGENTS.md`，“Layouts and mods other people made”段：公开分享入口、topic `herdr-layout` / `herdr-mod`、安装禁止覆盖及重名处理规则；同文件的 Mods 段：目录布局、默认内置 mods、SVG 引用方式；State 段：`shared.json` 持久化。
2. pulls.review fork 本地只读源码：`mods/pulls-review/bar.js`（`pane?.mod === "review"`）、`mods/review/main.js`（`PANE`、`review.*` keys、pane state）；`mods/README.md`（两个 mod 分工和安装路径）。本地 checkout 分支 `multi-repo`。
3. 本机 `~/.config/herdr-app/installed.json`：Herdr 已安装 mod 目录清单，不含 `review`、`actions`、`herdr-actions`。
4. Herdr T3：`mods/t3-tabs/main.js` 写 `bar.compact`；herdr-actions 的 `RECIPE.md` 和 pulls.review `mods/pulls-review/bar.js` 读取。
5. GitHub 只读 topic 搜索和仓库文件：[`topic:herdr-mod` 搜索](https://github.com/search?q=topic%3Aherdr-mod&type=repositories)、[`topic:herdr-layout` 搜索](https://github.com/search?q=topic%3Aherdr-layout&type=repositories)；代表仓库的 `mod.json`：[`atuin-threads`](https://github.com/atuinsh/herdr-atuin-threads/blob/main/mods/atuin-threads/mod.json)、[`space-folders`](https://github.com/jankeesvw/herdr-space-folders/blob/main/mods/space-folders/mod.json)、[`git-graph`](https://github.com/rabeeh-ta/herdr-git-graph/blob/main/mods/git-graph/mod.json)、[`automations`](https://github.com/DnzzL/herdr-automations/blob/main/app/mods/automations/mod.json)、[`reviewer`](https://github.com/vytasgavelis/herdr-reviewer/blob/main/mods/reviewer/mod.json)、[`issues`](https://github.com/jankeesvw/herdr-issues/blob/main/mods/issues/mod.json)、[`forge`](https://github.com/greenflagged/herdr-forge/tree/main/mods)、[`layout examples`](https://github.com/herdrdev/herdr-layout-examples/tree/main)。星数来自 `gh search repos` 结果（2026-11-04）。
6. GitHub 搜索结果：`JinJieBeWater/herdr-t3` 的 `topic:herdr-layout` 搜索结果为 128 星；本地仓库工作区分支为 `main`，同目录研究报告将 Herdr T3 标记为 100+ 星真实用户项目。
7. [herdr.dev/mods](https://herdr.dev/mods)（跳转 Gallery）和 [Gallery mods 页](https://herdr.dev/gallery/?type=mods)：展示社区项目及星数，入口对应官方指南分享流程。
8. 官方指南同上：Mod 是 `mods/<name>/`；运行时命令写作 `<mod>.<command>`；SVG 路径写作 `mods/<name>/...`；keys.json 合并规则；不覆盖安装和重名改名要求。`keys.json` 使用具体 `<mod>:<name>` 标识是本报告需要检查的安装依赖项，是否实际绑定以各项目文件为准。
9. herdr-actions 本地只读文件：`mods/herdr-actions/mod.json`、`main.js`（`KEY = "t3-actions"`、`MOD`、action SVG 路径及 overlay mod）、`README.md` 与 `README.zh-CN.md`（改 key 会丢已存动作；该 key 为兼容 Herdr T3 沿用）。
10. pulls.review fork：`mods/pulls-review/mod.json`（title `pulls.review`）、`mods/review/mod.json`（title `Review`）、`mods/README.md`（包名、安装 URL、mod 目录用途）；仓库 `package.json` 与安装说明中 `jin.review`。
11. pulls.review fork 本地 `mods/review/main.js`（`PANE = "review"`、共享状态 `review.shown/status/titles/program`）；`mods/pulls-review/bar.js`（硬编码窗格检测及共享状态）；命名和冲突为基于这些调用的影响推断。
