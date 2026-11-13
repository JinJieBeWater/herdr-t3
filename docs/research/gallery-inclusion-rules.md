# Herdr Gallery 收录规则与本次「Herdr T3 消失」相关限值

调查基线：`git rev-parse HEAD` = `c3c62de1cf7830990896681d59e0892b7653ddbb`（2026-11-13T13:50:29+08:00）。
取证时间：2026-11-13（主要样本生成于 UTC 09:00；再次核对 09:30:16.196Z 索引，T3 仍未收录且同一超限 warning 仍存在）。只新增本调查报告，未修改布局、配置或 RECIPE。
分工：本文只负责**官方收录规则、可公开验证的限值与数据通路**；实时 Gallery/T3 元数据与首次超限历史由主 agent 核查，其结论在 §6 汇总。

---

## 1. 结论摘要

1. Herdr Gallery 的收录完全由 **GitHub topic + 仓库文件结构**触发，没有投稿表单、没有人工审核内容：官方明确写「Layouts aren't reviewed by Herdr」「Mods aren't reviewed by Herdr」。
2. 两套 topic：layout 用 `herdr-layout`，mod 用 `herdr-mod`。官方承诺「within the hour」出现（https://herdr.dev/gallery/ 的 Share yours；https://github.com/herdrdev/herdr-app/blob/master/defaults/AGENTS.md#L469-L473）。
3. 服务端采集器读仓库文件后产出**公开实时索引** `https://assets.herdr.dev/layouts/index.json`（以及 `https://assets.herdr.dev/mods/index.json`），静态 HTML 只是预渲染快照，页面加载后由 `/live/gallery-cards.js` 用索引对齐（增/删/改卡片）。
4. 采集器有一条 **RECIPE.md 体积上限**，超限的 RECIPE.md 被跳过，进而**整条 layout/mod 不进入索引**（我们的情形）。索引里给出 warning：`RECIPE.md skipped: RECIPE.md exceeds 64 KB or has an unknown size.` 本次未找到采集器源码，无法确认 64 KB 的具体口径（KiB=65536 还是按 KB=1000 计）；本仓库当前大小超过两者。
5. 这次现象不是「排序变了」也不是「卡片过期」：是索引里**不存在**我们的 layout 条目，客户端 `reconcileCommunity` 于是删掉预渲染的旧卡片（主 agent 已回放验证，见 §6）。

---

## 2. 收录条件（页面明文规则）

来源：https://herdr.dev/gallery/ 的「Share yours」两段（同一 HTML 内含 layouts / mods 两套文案；mods 视图为 https://herdr.dev/gallery/?type=mods）。

### 2.1 Layout

> 1. Ask your agent to write it up… It writes a `RECIPE.md`.
> 2. Push it to a public GitHub repo with the topic `herdr-layout`. Each layout is a folder with `layouts/<name>.json`, its `mods/`, the `RECIPE.md` and a `preview.png`. One repo can hold several.
> 3. It shows up here within the hour, under Community.
>
> Layouts aren't reviewed by Herdr: your agent reads every file before it adds one. Community pictures are screened before they appear.

即：layout 需要 `layouts/<name>.json` + 它依赖的 `mods/` + `RECIPE.md` + `preview.png`，仓库公开并打 topic `herdr-layout`。

### 2.2 Mod

> 2. Push it to a public GitHub repo with the topic `herdr-mod`. Each mod is a folder with `mods/<name>/`, the `RECIPE.md`, a `preview.png` and, if needed, a `keys.json` snippet. **No `layouts/` folder.** One repo can hold several.
>
> Mods aren't reviewed by Herdr… Community pictures are screened before they appear.

即：mod 只有 `mods/<name>/`，可带 `keys.json`，**不能**带 `layouts/`，topic 为 `herdr-mod`。

### 2.3 官方 guide 中的同一规则（可引用的一手文件）

`defaults/AGENTS.md` 是随 app 下发的 agent 指南；这里引用公开仓库版本：

- https://github.com/herdrdev/herdr-app/blob/master/defaults/AGENTS.md#L441-L473 「Layouts and mods other people made」：layout = `layouts/<name>.json` + 所需 `mods/<name>/`；mod = 只有 `mods/<name>/` 并可带 `keys.json`；两者都有 `RECIPE.md` 与 `preview.png`；「put that folder in a public GitHub repo (one folder each if there are several)… add the repo topic `herdr-layout` for a layout or `herdr-mod` for a mod. It shows up at herdr.dev/layouts or herdr.dev/mods within the hour.」
- https://github.com/herdrdev/herdr-app/blob/master/defaults/AGENTS.md#L475-L492 `RECIPE.md` 的六段结构：`# Name` + 一段所见 + `![Name](preview.png)`、**What you see**、**How it behaves**、**Built from**、**Watch out**、**Done when**。这是规格要求（会影响读者与 agent 的可用性），但采集器是否校验这六段，公开材料没有说明（见 §8）。

---

## 3. 采集产物：公开实时索引的字段

- Layouts 索引：https://assets.herdr.dev/layouts/index.json
- Mods 索引：https://assets.herdr.dev/mods/index.json

2026-11-13T09:00:16.375Z 这一版的实际内容（本次抓取）：

```
layouts/index.json
  schemaVersion 1, generatedAt 2026-11-13T09:00:16.375Z,
  layoutCount 416, repositoryCount 378,
  source: { provider github, query "topic:herdr-layout is:public",
            totalCount 393, collectedCount 393,
            blacklistedCount 0, skippedCount 15, truncated false,
            warnings: [3 条，全部是 "RECIPE.md skipped: … exceeds 64 KB or has an unknown size."] }
  layouts[]: owner, repo, fullName, url, defaultBranch, stars, pushedAt, headCommit,
             path, name, blurb, layoutFiles[], hasPreview, recipeBytes, previewUrl

mods/index.json
  modCount 750,
  source.query "topic:herdr-mod is:public", totalCount 678, skippedCount 93,
  blacklistedCount 0, truncated false,
  mods[]: 同上，但用 modNames[] / hasKeys 取代 layoutFiles[]
```

由此可确认的规则（均为该 JSON 自身的字段语义，可直接对照）：

| 维度 | 观测 | 含义 |
|---|---|---|
| 入口 | `source.query = topic:herdr-layout is:public` | 只认公开仓库 + topic；私有/无 topic 不会出现 |
| 一个仓库多条 | `layoutCount 416` > `repositoryCount 378`；127 条 `path` 非空 | 一个仓库可放多个 layout，每条对应一个子目录（`path`） |
| 名称 | `name` + `blurb`（必填字符串，见 §4 空值校验） | 来自仓库内容，不是 GitHub 简介（T3 的 `blurb` 与 repo description 不同） |
| 预览图 | `hasPreview` + `previewUrl`（重托管到 `https://assets.herdr.dev/previews/<sha256 样式哈希>.png`） | 图片被重新托管与筛选；`hasPreview=false` 的条目仍然被收录（layouts 17 条、mods 38 条），说明没有可显示的预览图不阻止文字条目收录 |
| 体积 | `recipeBytes` | 采集器确实读取并记录 RECIPE.md 大小 |
| 黑名单 | `blacklistedCount 0` | 存在黑名单机制，本次为 0，名单内容未公开 |

页面要求投稿包含 `preview.png`；索引里的 `hasPreview=false` 只能证明无可显示图片的条目仍可收录，不能据此判断源仓库是否缺少该文件。

---

## 4. 元数据与显示规则

- 卡片文案由 `name` + `blurb` + `owner` 拼成（`/live/gallery-cards.js`：`text: \`${e.name} ${e.blurb} ${e.owner}\`.toLowerCase()`），搜索结果按这段文本匹配。
- `blurb` 长度上限实测：416 条中最大 500 字符，且 93 条以 `…` 结尾（同一 500 上限处即截断），说明采集器把简介截到 ~500 字符。T3 在预渲染快照里的 blurb 就止于 `…`。
- 排序：`/live/gallery.js` 只按 `data-stars` 或 `data-updated`（= `pushedAt`）排序；Stars 来自索引里的 `stars` 快照，因此**页面显示的星数与 GitHub 实时值会滞后**（本次快照 152，同期 GitHub API 为 164）。这不是收录问题。
- 图片尺寸：预渲染卡片 `<img width="960" height="600">`；这是显示属性，不能据此推断上传图片的尺寸要求。
- 点开卡片：`page` 指向 `herdr.dev/layouts/<owner>/<name>/`（本次 T3 的旧快照为 `/layouts/JinJieBeWater/herdr-t3/`），`gh` 指向 `https://github.com/<fullName>/tree/<defaultBranch>/<path>`。

---

## 5. 更新频率与缓存

- 官方承诺：**within the hour**（§2 引文）。
- 部署侧证据：索引响应头 `cache-control: public, max-age=300, s-maxage=1800, stale-while-revalidate=3600`（Cloudflare），浏览器缓存 TTL 为 5 分钟，共享缓存 TTL 为 30 分钟，且允许在重新验证时继续使用旧响应。这些值不构成恢复收录的时间保证。
- 静态 HTML 与索引**不同源**：`https://herdr.dev/gallery/` 是构建期快照（本次 HTML 内 863 张卡片），运行时 `reconcileCommunity` 按索引增删改。所以「站点上看得到」可以只是快照残余，也可能是索引里真有；判断收录必须以 `assets.herdr.dev/layouts/index.json` 为准。
- **未知**：采集器的实际调度周期（每小时？多久一次 GitHub 全量扫描？）只有官方一句 within the hour，我们没有第二个 `generatedAt` 样本，不写成确定值。

客户端对齐逻辑（可引用）：https://herdr.dev/live/gallery-cards.js
- `communityCards()` 校验每条 `owner/repo/fullName/path/name/blurb/defaultBranch` 必须是字符串，否则整份索引用 `Invalid community index` 直接抛错；并且**过滤掉** `herdrdev/herdr-layout-examples`。
- `reconcileCommunity()` 把「索引里不再存在的 community 卡片」从 DOM 中移除（`card.remove()`），因此索引里缺一条，页面加载后该卡片就消失。

---

## 6. 本次「Herdr T3 从 Gallery 消失」的根因链（主 agent 已核部分）

以下为主 agent 已实时核对并回放过的证据（本报告只做规则侧归纳）：

1. 实时索引 `source.warnings` 含：`JinJieBeWater/herdr-t3:RECIPE.md skipped: RECIPE.md exceeds 64 KB or has an unknown size.`
2. GitHub contents API：`RECIPE.md` 当前 `size=111109`（sha `13df504946d231558adc5f2989391c96d8453790`），超出 64 KiB 共 45573 字节。
3. 在本仓库 RECIPE 历史中，首次超过 65536 B 的公开提交：https://github.com/JinJieBeWater/herdr-t3/commit/cf2a7cb6cc26d13a2a7592874907155eed6978c7 （2026-11-12T06:20:21Z，`feat(settings): configure put-away navigation and Home`）；该 ref 下 RECIPE 为 65629 B，前一次修改 RECIPE 的提交 `e6d56f2b787f4a8767b95c671fda7840b4973304` 为 63597 B。两处大小均通过 GitHub contents API 核实。
4. 本次索引的 `layouts[]`（416 条）中没有任何 owner 为 `JinJieBeWater` 的条目 —— 不是「收录了但缺 recipe 字段」，而是**整条被跳过**。
5. 用官网页面的原函数 + 当前索引回放（fake card）：`t3Listed=false`、`t3CardRemoved=true`、剩余卡片 409。

结论：RECIPE.md 越过采集器的 64 KB 上限 → 该 layout 被整体跳过 → 索引无条目 → 预渲染快照里的旧卡片被客户端移除。页面上的「第 3 个 / 152 stars」是快照残留，不代表当前收录状态。

---

## 7. 限值与采集器源码：查到什么、没查到什么

- **本次未找到公开的采集器/CI 代码**。检查了 `herdrdev` 的公开仓库入口（https://api.github.com/users/herdrdev/repos）及以下候选位置；这不证明代码一定未公开：
  - `herdr-app`（默认分支 `master`）全量文件树 1690 项里没有 gallery/collector/index.json 相关脚本（只有 `vendor/gpui-pre/examples/image_gallery.rs` 等无关同名文件）。
  - `https://github.com/herdrdev/herdr-gallery`、`/herdr-site`、`/website`、`/herdr-web` 均 404。
  - 站点是 Astro 静态站（`/_astro/...`），运行时代码只有 `/live/gallery.js`（筛选/抽屉）与 `/live/gallery-cards.js`（索引对齐），两者都不含 64 KB 逻辑 —— 采集发生在服务端（Cloudflare 之后，索引由 `assets.herdr.dev` 提供）。
  - GitHub Code Search 需鉴权，本次无法做全站字符串检索；没有找到任何公开的 `exceeds 64 KB` 字面量来源。
- **间接证据支持 64 KiB 口径**：索引中已收录条目 `recipeBytes` 的分布 —— layouts 最大 58496（`p988744/cyber-neon`），mods 最大 63697，全部 < 65536；416 + 750 条无一越线。这与「上限 65536 字节」一致。
- **未知（明确留白）**：
  1. 上限口径是 65536 B（KiB）还是 64000 B（KB）——warning 文本写 "64 KB"，但所有已收录值 < 65536 且我们 65629 已被拒，两个口径都能解释 65629 被拒；若想精确，可用一次受控实验（提交 64001–65535 B 区间）验证，本次未做。
  2. 上限作用对象：只针对 `RECIPE.md`（warning 明确点名），`preview.png` / `layouts/*.json` / `mods/**` 是否也有体积上限未知。
  3. `skippedCount 15` 与 `warnings` 只有 3 条并存 —— 说明除「RECIPE 超限」外还有别的跳过原因，或 warnings 被截断（如只留前 3 条）。哪一种未证实。
  4. `blacklistedCount` 的黑名单判定条件与名单内容未公开。
  5. 「Community pictures are screened before they appear」的**筛选标准**（内容、尺寸、是否含水印等）没有任何公开说明；只知道图片会被重新托管到 `assets.herdr.dev/previews/`。
  6. 采集器是否校验 `RECIPE.md` 的六段结构、是否要求 `hasPreview`、是否要求 topic 与文件结构匹配（layout 仓库必须真有 `layouts/*.json`）——公开材料只有文案，无校验器证据。
  7. 采集调度周期与索引 `generatedAt` 的具体节律（是否每小时、是否固定分钟）未验证。

---

## 8. 可复现的核查命令

```bash
# 索引是否收录、以及有没有针对本仓库的 warning（判断收录的唯一权威口径）
curl -s https://assets.herdr.dev/layouts/index.json \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["generatedAt"], d["layoutCount"]); print("\n".join(d["source"]["warnings"])); print([e["fullName"] for e in d["layouts"] if "t3" in e["fullName"].lower()])'

# RECIPE 当前字节数（采集器用的是 GitHub 侧大小）
curl -s https://api.github.com/repos/JinJieBeWater/herdr-t3/contents/RECIPE.md \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["size"], d["sha"])'

# 索引缓存策略
curl -sI https://assets.herdr.dev/layouts/index.json | rg -i 'cache-control|last-modified|etag'
```

---

## 9. 对后续处置的含义（建议，不含实施）

- 恢复方向：已证实的阻断条件是 `RECIPE.md` 越过 64 KB；精简后推送到默认分支，等待重新采集，再用实时索引确认是否恢复。本轮只诊断，未实施修改。
- 建议留余量：实现细节可移到 `docs/internals/`，RECIPE 保留官方六段规格中足以重建布局的必要信息，控制在 60000 字节以内，可同时避开 64000 / 65536 两种口径。后续修改前需按项目规则使用 writing-for-agents skill。
- 排查「看不到」时先看索引，不要看静态页：`/live/gallery.js` 的卡片来自索引对齐，HTML 快照可能长时间保留旧卡片。

---

## 10. 来源清单

| # | 来源 | 用途 |
|---|---|---|
| 1 | https://herdr.dev/gallery/ | Share yours：layout/mod 的 topic、文件结构、within the hour、不审核内容、图片筛选 |
| 2 | https://herdr.dev/gallery/?type=mods | mod 视图同款文案（`herdr-mod`、无 `layouts/`、可选 `keys.json`） |
| 3 | https://github.com/herdrdev/herdr-app/blob/master/defaults/AGENTS.md#L441-L492 | 随 app 下发的官方 guide：布局/mod 结构、分享三步、RECIPE 六段规格 |
| 4 | https://assets.herdr.dev/layouts/index.json | 实时索引：query、计数、warnings（含本仓库 64 KB 跳过）、字段集、recipeBytes 分布 |
| 5 | https://assets.herdr.dev/mods/index.json | mods 索引同构证据 |
| 6 | https://herdr.dev/live/gallery-cards.js | `communityCards` 字段校验、`herdrdev/herdr-layout-examples` 过滤、`reconcileCommunity` 移除逻辑 |
| 7 | https://herdr.dev/live/gallery.js | 排序（stars / updated）、标签页与抽屉行为；不含采集逻辑 |
| 8 | https://api.github.com/users/herdrdev/repos | 本次查找采集器源码的公开仓库入口 |
| 9 | https://api.github.com/repos/herdrdev/herdr-app/git/trees/master?recursive=1 | 本次查找采集器源码的文件树入口 |
| 10 | https://github.com/JinJieBeWater/herdr-t3/commit/cf2a7cb6cc26d13a2a7592874907155eed6978c7 | 首次越过 64 KB 的提交（主 agent 核） |
| 11 | https://api.github.com/repos/JinJieBeWater/herdr-t3/contents/RECIPE.md | 当前 111109 B / sha（主 agent 核） |
| 12 | https://herdr.dev/guide/ | 官方 guide 页：只讲「问 agent」，收录规则全在 #1/#3 |
