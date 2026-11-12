# Files 面板依赖评估

核对日期：2026-11-11。优先查官方文档、上游源码和 npm registry metadata；性能探针在 `/private/tmp/files-panel-research/mod` 用 `herdr-app check` 执行，结尾已清理临时目录。项目现有草稿：[space-panel-plan.md](./space-panel-plan.md)。

## 结论

- 路径模糊搜索推荐 **`@leeoniya/ufuzzy` 1.0.19**。它是候选中唯一在 Herdr check 内完成 50,000 条合成路径搜索的一项：`component-419` 用时 202.9 ms，返回 200 个结果和高亮范围。此延迟对逐键搜索偏高，需用它的 `preFiltered` 前缀复用，并在真实路径集上测交互表现；本探针没有证明真实目录上的排名质量。[uFuzzy API/源码](https://github.com/leeoniya/uFuzzy)；[npm metadata](https://registry.npmjs.org/@leeoniya/ufuzzy/1.0.19)（访问：2026-11-11）
- 图标继续用 **Catppuccin 的关联数据和 SVG**，符合现有 Review 图标风格。优先级按 VS Code 文件图标规则实现；逐层抽取数据和 SVG，不打包完整主题。它的上游关联表只提供文件名、扩展名、语言 ID 和文件夹名；没有逐文件夹的展开态映射。[Catppuccin fileIcons.ts](https://github.com/catppuccin/vscode-icons/blob/main/src/defaults/fileIcons.ts)、[folderIcons.ts](https://github.com/catppuccin/vscode-icons/blob/main/src/defaults/folderIcons.ts)；[VS Code 规则](https://code.visualstudio.com/api/extension-guides/file-icon-theme)（访问：2026-11-11）
- 文件语言映射保留小型显式表；`EditorState.language` 是 `string`，Herdr 没有公布它支持的语言 ID 清单。GitHub Linguist 或 VS Code 语言表可以补充扩展名/文件名分类，但不能证明生成的 ID 会被 GPUI Editor 高亮。[gpui-kit.d.ts](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:21430>)；[Herdr 自带 t4-files](</Users/jinjiebewater/.config/herdr-app/mods/t4-files/main.js:16>)（核对：2026-11-11）
- 文件预览用 `readTextFile` 和 NUL 字节/字符启发式；处理好 `null` 与 1 MiB 上限即可，不引入二进制识别依赖。`fs/promises` 的 `readFile` 声明返回 `Uint8Array`，但 `stat` 未出现在 Herdr 的类型声明中；异步文件 API 探针未能从 `herdr-app check` 取得结果，所以不能据此确认运行时 `stat` 可用或比较读目录速度。[Herdr API](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:24>)；[gpui-kit.d.ts](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:22126>)（核对：2026-11-11）
- 列表仍推荐用现有的 `exec("git", …, { cwd, on })` / `exec("rg", …, { cwd, on })`。它们支持远程 space；`fs/promises` 只在本机可用。方案里的 `git ls-files -co --exclude-standard` 会排除 ignored 路径，因此不能同时把这些路径列出并变暗，除非另加 ignored 查询。[Herdr API](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:14>)；[Git `ls-files`](https://git-scm.com/docs/git-ls-files)（访问：2026-11-11）

## 1. 模糊路径搜索

| 包（检查版本） | 许可、体积、维护线索 | Herdr 50k 探针 | 判断 |
|---|---|---|---|
| [`fzf`](https://github.com/ajitid/fzf-for-js) 0.5.2 | BSD-3-Clause；npm unpacked 70.6 KB；registry 最后修改 2023-04-25；零依赖。近三年无发布，维护停滞。Fzf 结果有 `positions` 集，可直接高亮。[registry](https://registry.npmjs.org/fzf/0.5.2)、[README](https://fzf.netlify.app/)（访问：2026-11-11） | `Fzf(paths)` 初始化索引时被中断，未得到耗时。 | 算法和位置输出适合搜索，但维护停滞且当前运行时没通过 50k 探针；不选。若复制源码/输出，随包带 BSD-3-Clause license notice。 |
| [`fuzzysort`](https://github.com/farzher/fuzzysort) 3.1.0 | MIT；npm unpacked 45.6 KB；当前上游已到 4.0.2（registry 修改于 2026-08-13），2025–26 有维护。结果 `indexes` 可高亮。[registry v3](https://registry.npmjs.org/fuzzysort/3.1.0)、[registry v4](https://registry.npmjs.org/fuzzysort/4.0.2)、[README/changelog](https://github.com/farzher/fuzzysort)（访问：2026-11-11） | v3 在 50k 与 5k 的首次 `go()` 预处理时均被中断。v4 的 `snapshot()` 直接报 `setTimeout is not available`；绕过 snapshot 的 50k `go()` 仍在预处理时被中断。 | v4 是新维护的版本，但当前包依赖 `setTimeout` 的 snapshot 路径与 Herdr 冲突。v3 也未通过小规模 probe；不建议沿用。MIT notice 随 vendor 保留。 |
| [`@leeoniya/ufuzzy`](https://github.com/leeoniya/uFuzzy) 1.0.19 | MIT；npm unpacked 134.5 KB，实际 Bun ESM bundle 21.83 KB；registry 修改于 2025-08-22，过去 15 个月没有新发布，维护活跃度不明。[registry](https://registry.npmjs.org/@leeoniya/ufuzzy/1.0.19)、[README/API](https://github.com/leeoniya/uFuzzy)（访问：2026-11-11） | `search()` 构造器加 50k 搜索 202.9 ms，返回 200 个匹配；结果信息带 `ranges`，探针首个范围为 `[21, 30, 42, 45]`。 | 推荐。候选里它唯一通过 50k runtime check，且有排序和范围结果。用上一次匹配索引缩小后续前缀查询；实际更新节奏是风险。 |
| [`@nozbe/microfuzz`](https://github.com/Nozbe/microfuzz) 1.0.0 | MIT；npm unpacked 82.6 KB，Bun ESM bundle 9.74 KB；registry 修改于 2024-06-14，近两年无新发布，维护节奏慢。README 的作者数据是约 4,500 个短 label 首次查询约 7 ms，后续低于 1.5 ms；这是作者机器上的旧 benchmark，不可外推到 50k 路径。[registry](https://registry.npmjs.org/@nozbe/microfuzz/1.0.0)、[README](https://github.com/Nozbe/microfuzz)（访问：2026-11-11） | 初始化 50k 路径预处理时被中断。其结果设计提供匹配字符区间。 | 体积最小且 API 简单，但场景定位是几千个短 label；本探针规模不通过。MIT notice 随 vendor 保留。 |

探针用相同的 50,000 条合成路径 `packages/pkg-n/src/components/component-n/file-n.tsx`，搜索 `component-419`。Herdr check 对长同步工作会抛 `interrupted`；失败的条目没有可报告的耗时，不能把它们解释为跑完后“很慢”。为让 `herdr-app check` 输出被捕获的计时，uFuzzy 探针在搜索完成后故意抛出包含计时和结果的 `Error`；所以这一项的 check 退出码为 1 是探针取数方式，不是搜索失败。202.9 ms 是这次冷启动全量搜索的实测，不代表热查询或真实路径分布。uFuzzy 上游公开 `filter(haystack, needle, idxs?)`，可把上一次结果传回以做前缀增量；其 `info.ranges` 和 `sort` 支持匹配区间及排名。[uFuzzy 类型与实现](https://github.com/leeoniya/uFuzzy/blob/main/dist/uFuzzy.d.ts)（访问：2026-11-11）。

## 2. 文件与文件夹图标

### 数据选择与匹配

Catppuccin 当前源文件按图标键组织关联。核对时有 392 种文件图标键，含 1,087 个文件名关联和 733 个扩展名关联；文件夹表有 113 种图标键、421 个文件夹名关联。`icons/mocha/` 有 656 个 SVG。源文件含有带父目录前缀的文件名，例如 `.github/...`；生成数据时应保留这些路径关联，而不能只取 basename。其 `package.json` 标为 `private`，不应假设可从 npm 安装；开发期应从固定上游 revision 生成已提交的 JSON/资产，并记录 revision。[Catppuccin `fileIcons.ts`](https://github.com/catppuccin/vscode-icons/blob/main/src/defaults/fileIcons.ts)、[`folderIcons.ts`](https://github.com/catppuccin/vscode-icons/blob/main/src/defaults/folderIcons.ts)、[repo package.json](https://github.com/catppuccin/vscode-icons/blob/main/package.json)（v1.26.0；上游最近提交 2025-10-12；访问：2026-11-11）。

按 VS Code 的顺序解析：先尝试带父目录前缀的精确文件名，再不带父目录的精确文件名；随后扩展名（先测试最长多段后缀，例如 `d.ts`，再 `ts`）；最后才是语言 ID/default。VS Code 明确规定 file name 强于 extension、extension 强于 language，并支持诸如 `lib.d.ts` 的多段 extension；“最长后缀优先”是建议的确定性 tie-break，文档未规定同类重叠后缀顺序。文件夹用 basename 对 `folderNames` 查表；展开时查 `folderNamesExpanded`，缺失就回退到 `folderExpanded` 或闭合态图标。匹配不区分大小写。[VS Code file icon theme 文档](https://code.visualstudio.com/api/extension-guides/file-icon-theme)（访问：2026-11-11）。

Catppuccin 数据可在开发期导成瘦 JSON：保留 `fileNames`、`fileExtensions`、`languageIds`、`folderNames` 和其 icon key；从选定主题只复制被 JSON 引用到的 SVG，再加上默认 file/folder/root/open 图标。不要把整个 656 图标主题复制进 mod。Catppuccin 关联数据没有 folder expanded 的单独关联，因此第一版对具体文件夹展开时沿用同一 icon；若要每个特定文件夹都有开合两种图，应改用 Material manifest，或后续为数据补映射。

Catppuccin repo 和包声明 MIT。复制 SVG/数据时保留完整 LICENSE，并在 vendor 说明中注明：

```text
File icon associations and SVG assets are derived from Catppuccin/vscode-icons.
Copyright (c) 2023 Catppuccin; Copyright (c) 2023 thang-nm.
Licensed under the MIT License. See LICENSE.
```

上游 LICENSE 的 MIT 条款要求在软件副本或重要部分中附上版权和许可声明。[Catppuccin package metadata](https://github.com/catppuccin/vscode-icons/blob/main/package.json)、[LICENSE](https://github.com/catppuccin/vscode-icons/blob/main/LICENSE)（访问：2026-11-11）。

### Material Icon Theme 对照

Material Icon Theme 5.40.0（上游最近提交 2026-11-07）更接近完整 VS Code manifest：支持 `fileNames`、`fileExtensions`、`folderNames`、`folderNamesExpanded`、root folder 和 open variants，仓库用 `generateJson` / `generateOpenFolders` 生成这些数据。它声明 MIT，README 列出 Material Design Icons 与 Material Symbols 作为图标来源；若选它，需按上游 icon/source license 一并核对，不要只复制顶层 manifest。[manifest 类型](https://github.com/material-extensions/vscode-material-icon-theme/blob/main/src/core/models/manifest.ts)、[package scripts](https://github.com/material-extensions/vscode-material-icon-theme/blob/main/package.json)、[README 的 icon sources](https://github.com/material-extensions/vscode-material-icon-theme#icon-sources)、[LICENSE](https://github.com/material-extensions/vscode-material-icon-theme/blob/main/LICENSE)（访问：2026-11-11）。

**建议仍选 Catppuccin**：Review 已使用其风格，数据和资产足以覆盖这一页；Material 的优势主要是更完整的开合文件夹 manifest 与更近期上游活动，当前需求不值得引入另一套视觉和额外资产授权清点。

## 3. 文件扩展名到 Editor language

`gpui-kit.d.ts` 把 `EditorState.new({ language?: string })` 声明为开放字符串，没有 union、枚举或支持名称列表。Herdr 自带的 `files` 与 `t4-files` 显式把 `ts/tsx/mts/cts/jsx/mjs` 映射为 `js`，`toml` 为 `yaml`，`jsonc` 为 `json`，`svelte/vue` 为 `html`；其它扩展名直接作为 `language` 传入，`t4-files` 无扩展名用 `txt`。这些调用只证明参数被接受，不能逐项证明高亮 grammar 存在。[gpui-kit.d.ts](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:21430>)；[runtime guide](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:938>)；[files](</Users/jinjiebewater/.config/herdr-app/mods/files/main.js:13>)；[t4-files](</Users/jinjiebewater/.config/herdr-app/mods/t4-files/main.js:16>)（核对：2026-11-11）。

GitHub Linguist 的 `languages.yml` 面向 GitHub 语言识别，含 extension、filename、`tm_scope` 等分类信息；Linguist 文档说明它按 extension、filename 和其它信号识别语言。它没有 GPUI Editor grammar 注册表，`tm_scope` 也不是 `EditorState.language` 的已证实映射。体积约 590 KB 的 `linguist-languages` npm 包在 2026-08-30 更新，做映射仍不能解决目标语言名未知的问题。[Linguist languages.yml](https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml)、[Linguist 工作方式](https://github.com/github-linguist/linguist/blob/main/docs/how-linguist-works.md)、[npm metadata](https://registry.npmjs.org/linguist-languages)（访问：2026-11-11）。

因此保留显式扩展名/特殊文件名到已验证 Editor language 的小表；先复用 `files`/`t4-files` 映射。不要为了扩展名识别引入 Linguist 数据包。可用 `EditorState.language` 的逐项 demo 截图确认高亮名单，但本次研究不改 demo、不声称已有名单完整。

## 4. 文本、二进制和编码

Herdr `readTextFile(path, { on })` 读取 UTF-8，最多 1 MiB，文档明确说文件不存在时返回 `null`；它没有承诺 `null` 表示二进制，也没有承诺大文件的特定返回行为。因此调用方要区分“读不到/超限”和文本，不能把 `null` 直接标成二进制。[Herdr API](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:24>)（核对：2026-11-11）。

`fs/promises.readFile(path)` 的声明返回 `Uint8Array`，可读取前若干字节检查 NUL、BOM 或常见图片 magic bytes；`readTextFile` 的 UTF-8 字符串可做 `text.includes("\0")` 的轻量拒绝判断。NUL 检查是启发式，不能鉴定所有二进制，也不能检测所有文本编码；源码预览先以 UTF-8 为产品边界，遇到 NUL 或已知图片类型切到专用预览，避免做通用编码猜测。[Herdr `fs/promises` declarations](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:22126>)（核对：2026-11-11）。

候选库不划算：`isbinaryfile` 6.0.0 MIT，2025-12-05 更新；README 的算法读取开头若干千字节，结合 NUL 和“异常字符”阈值，但包按 Node 文件路径/Node 运行时设计。`istextorbinary` 9.5.0 是 Artistic-2.0、带 3 个依赖，2023-12-29 更新。`file-type` 22.3.0 是 MIT、Node `>=22`、约 137 KB unpacked，目标是 magic-byte 文件类型识别而不是文本编码识别；在无 Node API 的 Herdr 中不适合作为轻量预览依赖。[isbinaryfile README](https://github.com/gjtorikian/isBinaryFile)、[isbinaryfile metadata](https://registry.npmjs.org/isbinaryfile)、[istextorbinary README](https://github.com/bevry/istextorbinary)、[istextorbinary metadata](https://registry.npmjs.org/istextorbinary)、[file-type README](https://github.com/sindresorhus/file-type)、[file-type metadata](https://registry.npmjs.org/file-type)（访问：2026-11-11）。

## 5. 文件系统 API 与文件列表来源

Herdr 的生成类型声明有 `fs/promises.readdir(path)` 和 `readdir(path, { withFileTypes: true })`，后者 `Dirent` 只声明 `name` 和 `isDirectory()`；`readFile(path)` 返回 `Uint8Array`，可加 `"utf8"` 返回 `string`。类型声明未列出 `stat`。本次在 throwaway mod 中尝试从 `init`/`cx.spawn` await `readdir`、`stat`、`readFile`，但 `herdr-app check` 在异步操作完成前已返回；未把声明外的 `stat` 当作可用 API，也未测出文件系统速度。[gpui-kit.d.ts](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:22126>)；[Herdr mod runtime guide](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:1002>)（核对：2026-11-11）。

列表方面，`fs.readdir` 可以直接得到子项和目录标记，不用启动 shell、解析 stdout；但 API 是本机本地文件系统。Herdr 的 `exec` 支持 `on: space.machine` 远程执行，现有 `t4-files` 正用 `git ls-files` / `rg --files` 处理 space 路径，所以为了本机与远程一致，当前更简单的是继续走 `exec`。这是基于 API 能力与已有实现的选择，不是速度 benchmark；若以后只针对本机超大目录验证出瓶颈，再对本地展开使用 `fs`。[Herdr API](</Users/jinjiebewater/.config/herdr-app/herdr.d.ts:14>)；[t4-files](</Users/jinjiebewater/.config/herdr-app/mods/t4-files/main.js:64>)（核对：2026-11-11）。

草稿的 `git ls-files -co --exclude-standard` 包含 tracked 与非忽略 untracked 文件，按 Git 的 `--exclude-standard` 规则忽略标准 ignore 来源；它不会给 ignored 文件列表。若树要显示忽略项并变暗，需要另外用 `git ls-files --others --ignored --exclude-standard` 或 `git status --ignored=matching` 取数，并评估诸如 `node_modules` 的规模；否则删去“显示 ignored 项”的 UI 约定。项目外目录仍可用 `rg --files`，无需自己实现 glob walker。[Git `ls-files` options](https://git-scm.com/docs/git-ls-files)；[Git status ignored mode](https://git-scm.com/docs/git-status)（访问：2026-11-11）。

## 6. 其它依赖与小算法

- **Gitignore**：git 仓库交给 Git；项目外 fallback 使用 `rg --files`。只有将来必须在纯 JS 遍历目录并完整应用 `.gitignore` 时才加 [`ignore`](https://github.com/kaelzhang/node-ignore)：它是零依赖、MIT、2026-10-23 更新，按 Git ignore 语义匹配，但自身不负责找文件、递归读取各层 `.gitignore` 或处理 submodule。当前加它只会重复 Git/ripgrep 的职责。[npm metadata](https://registry.npmjs.org/ignore)（访问：2026-11-11）。
- **路径/相对路径**：Herdr 没有声明 Node `path` API；Git 输出用 `/` 分隔。连接根路径与相对路径可用小 helper，并处理重复 `/`、`.`、Windows 盘符和父目录边界；不为几个字符串操作引入 path/glob 包。路径规则自身要先确定 Windows 本地目录如何表示，这次没有在 Windows Herdr 上实测。[Herdr API declarations](</Users/jinjiebewater/.config/herdr-app/gpui-kit.d.ts:22126>)（核对：2026-11-11）。
- **自然排序**：`Intl.Collator` 不可用；npm `natural-compare` 1.4.0 为 MIT，但 registry 最后修改于 2023-06-22，已多年无版本更新。树名排序不是复杂算法，建议写少量 ASCII 数字段比较（`file2` 在 `file10` 前），避免引入停更依赖；Unicode locale 排序需求暂不扩展。[natural-compare metadata](https://registry.npmjs.org/natural-compare)（访问：2026-11-11）。
- **代码高亮/Markdown**：使用 Herdr 已有 `Editor` 和 `TextView.markdown`；不再引入 Shiki。项目运行时指南描述了这两种内置预览 API，已有工作上下文也记录 Shiki 4 在单行 tokenization 上触发运行时中断。[Herdr runtime guide](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:938>)（核对：2026-11-11）。

## 7. Vendor 构建建议

在根 `package.json` 固定需要的开发依赖版本，脚本将入口构建为每个 mod 自己的单 ESM 文件（如 `mods/t3-files/vendor/ufuzzy.js`），不做代码分块；一份生成的 `LICENSES.md` 或 `vendor/<pkg>/LICENSE` 记录 package/version/source/license 和上游 license notice。运行时只用相对路径 import。实际探针中 Bun 将 uFuzzy 入口打成 21.83 KB，Catppuccin 源关联本身可在开发期转 JSON、只复制引用 SVG。[Bun bundler](https://bun.sh/docs/bundler)；[Bun format 说明](https://bun.sh/docs/bundler#target)（访问：2026-11-11）。

检查生成文件而不是只看 build exit code：确认没有裸 npm imports、Node built-ins、`process`/`Buffer`/`__dirname` 等未替换 Node 全局；在 Herdr mod check 中加载实际 bundle。Bun 文档提醒 `process.env.*` 可能被 inline；不要用全量环境变量 inline，避免把本机环境值写进 mod；检查输出中残留 `process.env`，并对 `setTimeout`、`setInterval`、Worker、WASM 等 Herdr 禁用能力做静态扫描和 `herdr-app check`。实测 fuzzysort 4 的 `snapshot()` 就因 `setTimeout` 缺失而失败，说明“能被 Bun 打成 ESM”不等于“能在 Herdr 跑”。[Bun bundler env handling](https://bun.sh/docs/bundler/html-static#inline-environment-variables)；[Herdr mod restrictions](</Users/jinjiebewater/.config/herdr-app/AGENTS.md:892>)；[fuzzysort v4 source](https://github.com/farzher/fuzzysort/blob/main/fuzzysort.js)（访问：2026-11-11）。

## 摘要表

| 关注点 | 当前计划 | 建议 | 原因 | 风险 |
|---|---|---|---|---|
| 路径搜索 | fzf-for-js / 已验证 fzf | `@leeoniya/ufuzzy` 1.0.19，前缀查询复用 | MIT，21.83 KB bundle；50k cold query 实测 203 ms 且有 `ranges` | 203 ms 对每键搜索较高；真实目录与增量查询尚未测 |
| 图标 | Catppuccin association data 转 JSON | 保持 Catppuccin；按 VS Code 优先级解析；只复制使用的 SVG | 与 Review 一致；MIT；数据已有 filename/extension/folder associations | 上游 folder map 没有逐名 open variants；更新节奏低于 Material |
| Editor language | 扩展名映射后传 `EditorState.language` | 保留显式映射；逐项以 Herdr Editor 验证 | Herdr API 是开放字符串，没有公开支持清单 | 未知 language ID 可能无高亮；Linguist ID 不等于 GPUI ID |
| 文本/二进制 | `readTextFile` 预览 | UTF-8、1 MiB 上限；NUL 启发式，图片按 magic/已知类型分流 | 检测包增加成本且没有编码全解；`readFile` 已给 bytes | NUL 检查会漏检部分二进制；`null` 不能当作二进制标记 |
| 目录遍历 | Git/rg 命令；考虑 fs | 为远程一致继续 `exec(git/rg)`；仅本地瓶颈后试 `fs` | `exec` 支持远程，`fs` API 本机限定；已有 t4-files 模式 | 没有文件 API 速度读数；`stat` 未被声明/探针未确认 |
| 忽略/路径/排序 | Git 忽略，排序自行写 | git repo 用 Git；fallback 用 rg；路径和数字排序用小 helper | 零依赖，复用系统语义；自然排序库较旧 | `--exclude-standard` 不列 ignored 文件，和“忽略项变暗”需求冲突 |
| Vendor | 根依赖 + bun build + 许可笔记 | 固定版本，单 ESM；扫描全局引用并用 `herdr-app check` | npm imports 必须 bundle；真实 runtime check 能抓缺失 API | ESM 不保证 runtime 兼容；环境变量和上游图标 license 需逐项核查 |

## 来源日期

在线链接均于 2026-11-11 核对；npm metadata 的版本和修改时间取 registry。上游代码的提交日期在相应图标项中列出。Herdr API 链接指当前安装的生成声明和运行时指南，核对日期为 2026-11-11。
