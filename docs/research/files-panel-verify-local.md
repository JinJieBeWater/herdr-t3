# Files 面板本机验证

验证日期：2026-11-10。Herdr Core 0.1.20，macOS Apple Silicon。所有 live mod、仓库副本、测试文件和窗口均在 `/private/tmp/herdr-t3-verify-local`；没有访问或修改用户自己的 Herdr。探针结果在 app home 的 `files-probe-results.json`，结束时 demo 会清理。截图：

- [Editor 语言探针](./files-panel-verify/editor-languages.png)
- [图片格式与 writeFile 图片探针](./files-panel-verify/images.png)

## 1. 路径搜索：uFuzzy

**结论：有条件可用。** 单 ESM bundle 成功加载。小仓库和 VS Code 的前缀增量正常；50k 路径下每键 CPU 延迟偏高；100k uFuzzy 查询在 live mod 中触发 `interrupted`。单纯把任务放入 `cx.spawn` 不会绕开同步计算的中断限制。100k 子串匹配分块并在每 5k 项后 `await cx.sleep(1)` 可完成。

**重现配方：** 在临时 mod 目录执行：

```sh
bun add @leeoniya/ufuzzy@1.0.19
bun build ./node_modules/@leeoniya/ufuzzy/dist/uFuzzy.mjs --format esm --outfile ./vendor-ufuzzy.js
```

bundle 为 21,781 bytes；`bun build` 约 9 ms。`uFuzzy` 不建索引；100k 路径数组构造约 24 ms。路径来源用 `exec("git", ["ls-files", "-co", "--exclude-standard", "-z"], {cwd})`，只对 real path list 计数和查询，不把 `herdr-app check` 的结果当作异步完成证明。

**规模与计时（单次实测，非统计基准）：**

| 清单 | 数量 | 列表/准备 | 冷 `filter` | `review diff` 逐键 `filter(haystack, prefix, previousIdxs)` | `info` + `sort` |
|---|---:|---:|---:|---|---:|
| demo 内 herdr-t3 副本 | 590 | Git 列表 13 ms | 1 ms | 每键 0–1 ms | 0 ms |
| 浅克隆 microsoft/vscode | 21,018 | Git 列表 158 ms | 14 ms | 6, 12, 6, 1, 0, 0, 0, 0, 0, 0, 0 ms | 0 ms |
| 合成路径 | 50,000 | 构造 24 ms | 52 ms | 搜索 `component-419` 共 13 字符：10, 20, 19, 21, 19, 20, 21, 20, 20, 20, 42, 26, 2 ms | 2 ms，取前 200 |
| 合成路径 | 100,000 | 构造 24 ms | **中断** | 未到逐键阶段 | 未执行 |

最后一行在 live mod 的 `uFuzzy.filter` 内记录 QuickJS `interrupted`；此中断发生在 `herdr-app check` 之外。没有在文档中找到具体预算数字。单独用 live mod 测试连续忙循环，5–100 ms 均完成，所以中断不能简单解释为固定墙钟超时；确切指令/工作预算仍未知。50k 逐键查询个别键达到 42 ms，仍可能造成输入卡顿。

100k 简单子串预筛的完整配方是：生成路径清单；对每个 5k slice 做 `toLowerCase().includes(term)`；每片后 `await cx.sleep(1)` 让出执行；最后截断显示项。构造约 24 ms，100k 扫描约 91 ms，找到 111 项（`component-419` 会匹配 `component-4190` 等前缀）。它不会中断，但不是模糊匹配，也需限定结果数和多词规则。

**10 个真实查询的排名观察**（清单为上述两仓库合并；uFuzzy 默认排序）：

| 查询 | 数量 | 前列结果 / 判断 |
|---|---:|---|
| `t3tab main` | 0 | 当前路径没有匹配 |
| `readme zh` | 1 | `README.zh-CN.md`，合适 |
| `review diff` | 5 | 首位 `extras/mods/review/diff.js`，合适；之后有 `file-diff.svg` 和 VS Code diff 实现 |
| `files panel` | 0 | 没有匹配 |
| `editor language` | 48 | 前列为 `languageFeatureRegistry.ts`、`languageSelector.ts` 等，有关但不完全满足“文件面板”意图 |
| `icons folder` | 29 | 前列为 `t3-inbox/icons/folder-plus.svg` 等，相关 |
| `git status` | 27 | 前列是 VS Code agent-host 捕获样例，相关但搜索范围较宽 |
| `space panel` | 0 | 没有匹配 |
| `changelog` | 3 | 前列为两个根 changelog，合适 |
| `inbox agent` | 0 | 没有匹配 |

**实现建议：** 100k 清单不要对每个键运行全量 uFuzzy。优先采用可让出的分块扫描，限制并展示最多 200 项；对结果小的候选集再用 uFuzzy 排序/取高亮区间。若必须保留 50k 全量模糊搜索，需接受当前每键最高 42 ms，或另行优化候选集。

## 2. `EditorState.language` 高亮与扩展名

**结论：开放字符串并不代表每个名字都有对应 grammar。** 表中结论来自 [Editor 探针截图](./files-panel-verify/editor-languages.png)，每项用该语言自己的短代码样例；“高亮”表示截图里至少一个语法 token（关键字、类型、标点等）有语法色。未着色只表示当前样例没有观察到高亮。

| 扩展名 / 文件名 | 建议 `language` | 本机观察 |
|---|---|---|
| `.js`, `.mjs`, `.cjs`, `.jsx` | `js`（或 `javascript`） | 高亮；两种都实测 |
| `.ts`, `.mts`, `.cts`, `.tsx` | `js` | `ts`、`tsx`、`typescript` 的 TS 样例均未见高亮；沿用 Herdr 现有的 TS→JS 映射 |
| `.json` | `json` | JSON 样例高亮 |
| `.jsonc` | `json` | `jsonc` 未见高亮；用已验证的 JSON grammar |
| `.md`, `.mdx` | `md` | `md`、`markdown` 的 Markdown 样例未见代码高亮；Markdown 内容应走 `TextView.markdown` |
| `.yaml`, `.yml` | `yaml` | 高亮 |
| `.toml` | `toml` | 接受但样例未见高亮；勿伪装成 YAML |
| `.rs` | `rust` | `rust`、`rs` 都高亮；规范名用 `rust` |
| `.go` | `go` | 高亮 |
| `.py` | `python` | `python`、`py` 都高亮；规范名用 `python` |
| `.sh` | `sh`（bash/zsh 脚本可用 `bash` / `zsh`） | 三者都高亮 |
| `.css` | `css` | 高亮 |
| `.scss` | `scss` | 样例未见高亮；若接受 CSS 子集可用 `css` |
| `.html` | `html` | 样例未见高亮 |
| `.vue`, `.svelte` | `html` | `vue`、`svelte` 均未见高亮；`html` 样例也未见高亮 |
| `.c`, `.h` | `c` | 高亮 |
| `.cpp`, `.cc`, `.cxx`, `.hpp` | `cpp` | 高亮 |
| `.java` | `java` | 高亮 |
| `.kt`, `.kts` | `kotlin` | 高亮 |
| `.swift` | `swift` | 样例未见高亮 |
| `.rb` | `ruby` | 高亮 |
| `.php` | `php` | 高亮 |
| `.sql` | `sql` | 高亮 |
| `.lua` | `lua` | 高亮 |
| `Dockerfile`, `*.dockerfile` | `dockerfile` | 样例未见高亮 |
| `Makefile`, `GNUmakefile` | `makefile` | 有部分高亮 |
| `.diff`, `.patch` | `diff` | 样例未见行级 diff 着色 |
| `.xml` | `xml` | 样例未见高亮 |
| `.graphql`, `.gql` | `graphql` | 高亮 |
| `.nix` | `nix` | 样例未见高亮 |
| `.zig` | `zig` | 样例未见高亮 |
| `.ex`, `.exs` | `elixir` | 样例未见高亮 |

探针还传入了 `javascript`、`typescript`、`jsonc`、`markdown`、`rs`、`py`、`vue`、`svelte`、`bash`、`zsh` 这些名字。不要因为构造 Editor 没抛错，就假定 grammar 已注册。未测试的扩展名继续按扩展名映射补充，不要仅凭 Linguist 名称推断 GPUI grammar 名。

## 3. `readTextFile` 边界

**结论：** UTF-8 读取错误会抛异常；只有缺失文件返回 `null`。配方是在 live mod 中逐项 `await readTextFile(path)`，把返回类型、长度、错误文字写到 app home 的结果 JSON。

| 输入 | 观察到的结果 |
|---|---|
| 缺失文件 | `null`，0 ms |
| PNG（二进制） | 抛 `stream did not contain valid UTF-8`，0 ms |
| 1 MiB + 9 bytes 文本 | 抛 `Text file exceeds 1 MiB`，0 ms |
| 非法 UTF-8 | 抛 `stream did not contain valid UTF-8`，0 ms |
| 空文件 | `""`，不是 `null`，0 ms |
| 指向空文件的 symlink | 读取目标内容，`""`，0 ms |
| 目录 | 抛 `Is a directory (os error 21)`，0–1 ms |

因此 `null` 不能表示二进制或超限；图片应按扩展名/MIME 走图片预览，其他失败按读错误处理。

## 4. 图片、字节写入与缓存清理

**结论：** app home 下可用 `image("mods/<name>/...")` 显示 PNG、JPG、SVG、GIF、WebP。截图 [images.png](./files-panel-verify/images.png) 显示五种格式均渲染。live mod 中 `atob` 存在；将 base64 解码成 `Uint8Array` 后 `fs.writeFile(path, bytes)` 成功，生成的 PNG 通过 `image("cache/files-probe/decoded.png")` 显示。

**配方：** 将文件写进 app home 的 `cache/<mod>/`；`close()` 中 `await fs.unlink(path)`。本探针关闭 pane 后确认 cache PNG 已删除，close marker 写入成功。runtime guide 说明 close 共享清理预算为 250 ms、退出时可能被取消；实现应只清理自己写出的临时文件，且不依赖崩溃时一定调用 close。

## 5. 不按 Enter 地输入路径

**结论：** `hc send` 的定义是粘贴文本并按 Enter，不能用于 Mention 的“填入但不提交”。`hc keys` 可发不含 Enter 的字符，但一次调用按键粒度发送，不适合长路径：本机发 78 个字母键约 2.48 秒（约 32 ms/键）。在 demo 的普通 zsh 终端，字符保留在提示符输入行中，没有执行。

具体限制：`/`、`.` 和空格可按相应键名发出；`@` 作为字符会被 `hc keys` 拒绝，`shift+2` 在本机键盘上实际写入 `2`，不是 `@`。所以 `@docs/adr/x.md ` 不能由 `hc keys` 可靠构造。本次没有把整段目标字符串成功打入；失败发生在按键解析器，不是 terminal 已提交。

**实现建议：** 不循环发按键。将完整文本交给终端的粘贴通道并把焦点放回 agent 输入框，确保不发送 Enter。当前 mod API 未见可直接把任意文本写入系统剪贴板的接口；“copy + focus”所需的文本注入/剪贴板接口仍需在产品实现前明确。不要以 `hc send` 替代。

## 6. `localeCompare` 和自然排序

**结论：** `Intl` / `Intl.Collator` 不存在，但字符串 `localeCompare` 存在。配方：live mod 读取 `typeof Intl`，并评估 `"file2".localeCompare("file10")`、大小写对。

结果：`Intl === undefined`；`file2.localeCompare("file10") === 1`，所以普通字符串比较会把 `file2` 排在 `file10` 后，不是自然数字序。`"a".localeCompare("A") === 1`、`"A".localeCompare("a") === -1`，大写在小写前。文件树用小型 ASCII 数字段比较器；不要依赖 `Intl`。

## 7. macOS `watchFolder`

**结论：** 单文件事件可以到达；Git status 的只读运行没有造成 `.git` 事件；ignored 的 `node_modules` 子路径会被递归 watcher 上报，事件量需要压制/合并。

**配方与数字：** live mod 先 await `watchFolder(dir)`，稍等订阅建立后用 `fs.writeFile` 写一个新文件，再记录 promise 完成时间；在独立 demo Git 仓库根目录上监听时，单文件写入到 promise 返回为 152 ms。不同负载下单次样本不等同于稳定延迟保证。

在同一 demo 仓库监听期间，执行：

```sh
git --no-optional-locks -c core.fsmonitor=false status --porcelain=v2 -z --untracked-files=all
```

300 ms 内没有 watcher 事件。之后在被 Git 忽略的 `node_modules/volume-probe/` 下创建 100 个文件，watcher 收到 100 条路径；`watchFolder` 不会替 Files 面板过滤 ignored 路径。实测 burst 约 100–133 ms，事件包含 `node_modules` 子项。

**实现建议：** 保持 `--no-optional-locks` 和 `core.fsmonitor=false`；不要让 status 查询触发面板刷新循环。树是否显示 ignored 项按产品规则决定；watch 事件对同一批路径做 debounce/去重，并从“仅需要刷新 Git 状态”的路径中排除 `node_modules` 等大型 ignored 子树。不要因此屏蔽 `.git/index`、HEAD 等真实状态变化。

## 后续验证 A：Mention 粘贴，不提交

**结论：可用。** `cx.write_to_clipboard(text)` 设置文本；`run("pane.focus", {terminal})` 会把焦点切到指定终端，跨 tab 也会切换当前 tab；随后 `run("terminal.paste")` 将文本粘入输入行，不按 Enter。zsh 行在 paste 后仍处于编辑状态，没有提交。

live mod 保存了原 clipboard 文本，只记录其是否存在与长度；为避免测试时把原内容粘进终端，测试轮次用安全 sentinel 模拟旧 clipboard，并在所有轮次结束后恢复真实原文，`read_from_clipboard() === saved` 得到 `true`。原文长度为 7；报告不记录内容。

**恢复顺序有竞态：** 写入目标后调用 paste、紧接着立刻恢复 sentinel，终端输入行收到的是 sentinel，说明 paste 命令稍后才读取系统 clipboard。目标文本在 paste 后等待 150 ms 再恢复时成功落入输入行。实际文本为 `@docs/adr/x.md `，包括末尾空格；`hc read` 的普通屏幕文本会裁掉末尾空格，但下面的 raw PTY 试验确认了它确实到达。

**bracketed paste：** 在 demo PTY 中启用 bracketed-paste mode，并让 raw Python 程序读取输入字节。`terminal.paste` 收到的字节为 `ESC [ 200 ~` + `@docs/adr/x.md ` + `ESC [ 201 ~`，没有换行；因此是 bracketed paste，不会执行 shell 命令。跨 tab 试验中 `focused()` 变为第二 tab 的 `t2`，该终端也收到完整输入行。

**推荐 recipe：**

```js
const previous = cx.read_from_clipboard();
if (previous === undefined) return; // Preserve a possibly non-text clipboard.
try {
  cx.write_to_clipboard(mention);
  run("pane.focus", { terminal });
  run("terminal.paste");
  await cx.sleep(150); // paste 异步读取系统 clipboard；立即恢复会粘入旧值
} finally {
  if (previous !== undefined) cx.write_to_clipboard(previous);
}
```

只有文本 clipboard 可以按此方式逐字恢复；`read_from_clipboard()` 对非文本内容返回 `undefined`，探针遇到这种情况会跳过写入，避免覆盖可能存在的图片 clipboard。本机原 clipboard 是文本，所以完成后确认已恢复。150 ms 是成功值，不是已测出的最短安全延迟。

## 后续验证 B：可让出的搜索与安全排序上限

**结论：推荐分块子串预筛 + 小候选集 uFuzzy 排序。** 用 lower-case path 快照；每个新字符只过滤前一个字符留下的候选；query 按空格切词，要求每个 token 都是路径子串。每处理最多 5k 个候选 `await cx.sleep(0)`。这个零毫秒 sleep 在 live mod 中确实让出执行；100k、200k 都完成且没有 `interrupted`。筛完后，候选数 `<= 1,000` 才调用 `uFuzzy.info` / `sort`，再取前 200 和其 `ranges`。

验证数据先由 shell 从只读浅克隆执行 `git ls-files -co --exclude-standard -z`，生成 21,019 路径的 JS fixture，mod 在 live 窗口搜索；Git 命令输出约 1.48 MB，shell 计时 276 ms。合成 `packages/pkg-n/src/components/component-n/file-n.tsx` 清单构造 200k 条约 48 ms。lower-case 快照构造单独计时；以下每键结果均是字符追加时的实测毫秒数。单次观测，没有 warm-up / 多轮统计。

| 清单 | 查询 | lower-case 准备 | 每键 ms | 总查询 ms | 最终候选 |
|---|---|---:|---|---:|---:|
| VS Code 21,019 | `review diff` | 5 ms | 10, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0 | 30 | 3 |
| 合成 50k | `component-419` | 11 ms | 13, 14, 13, 14, 14, 13, 14, 14, 13, 15, 15, 3, 1 | 169 | 111 |
| 合成 100k | `component-419` | 22 ms | 23, 26, 26, 27, 28, 26, 27, 27, 27, 31, 31, 3, 1 | 328 | 111 |
| 合成 200k | `component-419` | 43 ms | 46, 52, 52, 52, 52, 55, 54, 53, 53, 59, 61, 3, 0 | 643 | 111 |

每个 query 的前几字符会留下大量候选；过滤持续扩展，最后三个计数分别为 `11,111 → 1,111 → 111`。最慢的 200k 字符耗时 61 ms，虽然不会中断，仍可能短暂阻塞 UI；应继续以低频 debounce 降低频繁重绘/重复扫描。

比较 uFuzzy 自身的 5k 分块过滤：在 200k 清单上每片后 `await cx.sleep(0)`，逐键耗时为 `51, 91, 92, 91, 93, 92, 93, 93, 95, 93, 184, 92, 12 ms`，完整 13 字符约 1,172 ms，没有中断；最终 600 个候选，`info` + `sort` 4 ms，返回 200 个且 `info.ranges` 覆盖 600 个匹配。它安全但明显慢于子串分块预筛。此前单次 100k 全量 uFuzzy filter 会中断；本次确认分块 filter 5k 并让出可完成 200k。没有单次调用全量 200k uFuzzy filter。

**排序上限实验：** 在同一 200k 路径集对已匹配的候选做 `info` + `sort`，候选 100/500/1k/2k/5k/10k 均完成，耗时约 0/3/6/13/33/67 ms，`ranges` 均返回。推荐 N=1,000（约 6 ms）；2k 的 13 ms 已接近单帧预算，5k 的 33 ms 不适合每键排序。高于 N 时显示子串候选前 200 项，不做排序；最终候选进入 N 后才排序并附 ranges。

**推荐算法 recipe：** 缓存每条路径的小写副本；以候选索引数组做 prefix reuse；新 query token 逐个追加，分片过滤每个候选索引，块大小 5,000，每块后 `await cx.sleep(0)`；query 结束时若候选不超过 1,000，用 uFuzzy 对这些候选计算 `info` / `sort`，取排序前 200，并使用 `info.ranges` 高亮。`cx.sleep(0)` 已实测可用且是当前最便宜的让出方式；这里没有必要用 1 ms timer。

## 未决事项

- Herdr QuickJS 的 `interrupted` 具体工作量预算没有公开数字；100 ms 忙循环可完成，单次 100k uFuzzy filter 会中断，但分块 `cx.sleep(0)` 搜索至 200k 没有中断，限制无法精确定位为指令数或时间上限。
- 搜索的大仓库真实清单只到 VS Code 的 21,019 项；50k–200k 使用合成路径。不同目录分布、Unicode 路径、查询分布和设备性能会改变过滤候选数及耗时。
- 150 ms clipboard restore 延迟已成功，尚未测最短安全值；没有用真实 Pi agent 测输入，但 zsh 与启用 bracketed-paste 的 raw PTY 均已验证。
- Editor 的未着色结论仍基于截图和指定短样例；某些 grammar 可能对其他 token/多行结构着色。Markdown 高亮应结合 `TextView.markdown` 决策。
- watcher 和搜索计时均为单机单次观测；远程 machine、网络文件系统及其他仓库规模未测。

## 汇总：实现应采取的行为

| 项目 | 判定 | 实现应做 |
|---|---|---|
| uFuzzy / 搜索 | 分块可用 | lower-case 子串前缀预筛，5k chunk 后 `cx.sleep(0)`；100k/200k 无中断。候选 `<=1,000` 才 uFuzzy 排序并附 ranges，否则先显示前 200。 |
| Editor 语言 | 部分支持 | 用上表高亮名单和别名映射；TS 系映射到 `js`，`jsonc` 映射到 `json`；无高亮时降级纯文本，Markdown 走 markdown viewer。 |
| `readTextFile` | 已确定 | 缺失为 `null`；UTF-8 错误、超 1 MiB、目录均抛错；空文件/symlink 可正常读。 |
| 图片/缓存 | 已确定 | 五种格式 `image()` 可显示；base64→`Uint8Array`→`writeFile` 可显示；`close()` 删除自有 cache 文件。 |
| Mention 输入 | 已验证 | 保存 clipboard，写 mention，`pane.focus`，`terminal.paste`，等 150 ms 后恢复 clipboard；可跨 tab，bracketed paste 不含 Enter。 |
| 排序 | 不支持自然排序 | 不依赖 `Intl`；自行实现数字段比较并测试大小写策略。 |
| `watchFolder` | 可用，事件面需节流 | 用 watcher 更新本地目录；忽略 status 查询引发的循环；去重 burst 并压制大型 ignored 路径事件。 |
