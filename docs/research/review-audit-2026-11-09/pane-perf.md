> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1 项：本仓库 `ebd9a5e` 限制入口；pulls.review `5524d19`、`dca544c` 限制响应并支持续读。
- 第 2–5 项：分别已修于本仓库 `20a7458`（首帧补修 `ea924dc`）、`0ca6fd6`（文件片段缓存补修 `e227489`）、`d064f81`、`9a2ad1a`。
- 第 6 项：按既定决定保留；后续实测纯 QuickJS 大组约 1 ms/tick，未把这项列为必须优化。

---

What this change does: 本次审查 Review pane 如何读取、缓存和绘制大仓库的 diff，并检查定时器中的重复工作。范围仅为 `extras/mods/review/` 的性能；未修改实现，也未审查正确性 bug。

负载假设是一个人本机使用，但一次会打开上千文件的 branch 或 compare。审查代码来自起始 HEAD `19296eb24cefb0b69aac14a480add7d8a62d83b0`，Review 目录最后修改提交为 `06439d7`，目录 tree 为 `45d15201d82cc01aac3ebe2312eebb7935acea3e`；审查期间其他路径有提交，Review 目录内容未变。

**Must fix**

1. **显示整个文件仍可能一次取得超过 Herdr 上限的数据**（`extras/mods/review/diff.js:79–95, 227`）
   - **What this is:** 文件头的“整个文件”按钮和 `f` 键调用 `/api/review/file`，把该文件的所有行一次读回；常规 diff 的 rows 分批不经过这里。
   - **Problem:** 在真实 `/branch/sample-feature` 中，对 `dist/large-bundle.js` 触发此操作，返回 84,888 行、**10,096,467 字节**，超过 Herdr 的 **8,388,608 字节**单响应上限。该文件虽然默认折叠且普通 diff 已截断，按钮仍可触发整个文件读取；1000 列截行没有限制总行数。
   - **Fix:** 给整个文件读取设置服务端行数和字节上限，并让 pane 显示“过大，无法展开”；pane 在已知 `truncated` 的文件上先禁用这一入口，就能挡住本例，服务端上限负责其他大文件。
   - **If we skip it:** 大文件的一次普通操作就会产生宿主收不下的响应；后续在 pane 中裁剪、折叠或虚拟绘制都来不及生效。证据及只读复现见 E1。

**Should fix**

2. **文件树每次渲染创建整个组的所有行**（`extras/mods/review/files.js:43, 49–95`）
   - **What this is:** 宽度至少 1024 时，diff 旁的文件列表使用普通滚动容器；`fileTree()` 每次重建路径树，再给每个文件和文件夹创建元素及事件处理函数。
   - **Problem:** 真实 branch 的 Code 组有 **1164 个文件、68 个文件夹行**，即使 diff 只画 40 个虚拟项，这 1232 个树行仍全部创建。稳定渲染中位数 **8.868ms Node**，其中 aside **6.113ms**；仅在临时环境省去 aside，整帧降至 **2.361ms**，按 30–50 倍估算，文件树本身约 **183–306ms QuickJS**。
   - **Fix:** 文件列表改用现有虚拟列表或项目已有的 `scrollList()`，只创建可见行；路径树结构在组、路径或布局改变时重建即可，reviewed 状态和在视野内的高亮仍从当前数据取。
   - **If we skip it:** 悬停、进度轮询、滚动引起的整 pane 重绘，都会重新支付上千个不可见行的成本；大组会持续卡顿。compare 的 626 文件 Docs 组也复现了相同问题，见 E2。

3. **无关操作使未变大文件的所有 token 再次量宽**（`extras/mods/review/main.js:160–171`；`extras/mods/review/rows.js:18, 62–68`）
   - **What this is:** `items()` 的缓存键包含全局 `version`；任何文件折叠、reviewed 操作或新的 rows 到达后，都会重新构建当前组，并用 `contentWidth()` 对其所有已加载行重新执行 token 遍历、制表符替换及宽字符匹配。
   - **Problem:** 真实 branch 中的 `LargeReader.cs` 有 **7461 行**，单文件可作为批次首项越过 3000 行预算；加载后重建 items 的中位数为 **4.380ms Node**，其中仅该文件量宽就是 **3.088ms**。即使它的内容未变，折叠组内另一个文件也会重复这部分工作，约 **93–154ms QuickJS**。
   - **Fix:** 在 rows 到达或首次量宽时缓存每行列数，或缓存每个文件各侧的最大列数；折叠其他文件时只汇总已有值，不再处理这些未变 token 的文本。
   - **If we skip it:** 分批只限制单次获取量，已获取的行仍会留在缓存；审查越往后，后续折叠、标记和调整视图触发的重建越贵。真实单文件复现及与完整文件的区分见 E3。

4. **每一行都扫描文件的全部注释，成本是行数乘注释数**（`extras/mods/review/rows.js:186–195`）
   - **What this is:** `buildItems()` 为每行寻找应接在其后的 AI 行注释；它在行循环内再遍历一次该文件的全部 notes，连不带 anchor 的整文件注释也会参加检查。
   - **Problem:** 在真实 7461 行 C# 文件上，仅在本地假环境加入 30 条合法行注释，单文件构建中位数由 **0.250ms** 增至 **3.046ms Node**；100 条为 **9.567ms**，约 **287–478ms QuickJS**。本次 daemon 三页均为规则分组，**这条是合成注释的容量复现，并非现有 AI 结果已经包含这些注释**。
   - **Fix:** 先把带 anchor 的注释按 `(side, line)` 建立 Map，每行只查自己的注释；保留同一位置多个注释的原有顺序。
   - **If we skip it:** 一次较详细的分析就会使大文件的首次构建和其后每次重建显著变慢；每次取多少 rows 不会消除这个乘法。复现代码见 E4。

5. **每次读取单个 commit，随后都重读整个 base diff，只取 commits**（`extras/mods/review/review-load.js:74, 148–155`）
   - **What this is:** 在 branch 的提交列表里打开某个 commit 后，每次 `loadReview()` 成功都会启动 `loadBaseCommits()`；后者再次请求 base 的 `/api/review`，仅保留返回的 `commits`。
   - **Problem:** 真实 commit `SAMPLE_COMMIT` 的一次刷新只读 **3422 字节、89.308ms**，紧接着又后台读 branch 的 **566,718 字节、377.310ms**，其中 1554 个文件及分组随即被丢弃。即便 `baseCommits` 已有 203 个提交，这个调用仍发生；补取 rows 成功也走同一入口。
   - **Fix:** rows 补取和同页状态读取复用当前 `baseCommits`；只在 base 改变、相关仓库变化或明确刷新提交列表时读一次 base，并合并同一 base 的在途读取。
   - **If we skip it:** 审查一个小提交也会反复让 daemon 重读大 branch、传输并解码大量不用的数据；这是额外后台工作，不应把 377ms 全算作提交展示的阻塞时间。证据见 E5。

6. **150ms scroll spy 在视野未变时仍从头尾扫描当前列表**（`extras/mods/review/main.js:64, 360–395`）
   - **What this is:** 每个前台 pane 的 scroll spy 每 150ms 计算 `asideGroup()` 和 `visibleGroups()`：前者从视野起点反向找组头，后者从列表开头走到视野末尾，最后才比较 `lastSpied`。
   - **Problem:** 真实 branch Code 组加载部分 rows 后有 **2424 项**，停在底部不滚动，每个 tick 仍发生 **4850 次列表数字下标读取**，中位数 **0.171ms Node**，顶部仅 **0.006ms**。按给定倍率，底部每 150ms 空转约 **5.1–8.6ms QuickJS**，约占一个核 **3.4%–5.7%**；普通渲染也会调用这两个扫描函数。
   - **Fix:** 先比较列表版本和 `visible.start/end`，均未改变时复用上一次 spy；列表构建时记录各项所属组，范围改变时也无需从开头找组。
   - **If we skip it:** 大 diff 会在用户停住阅读时继续消耗 CPU，多个前台 Review pane 的成本相加。计时与下标访问计数见 E6；这里的 CPU 比例是倍率估算，不是实机功耗读数。

**证据与复现**

临时探针从 `check-pane.cjs` 取 `source()/load()`、rows API 及原有假元素环境，把 `review()` 换成真实 daemon 的只读请求；进程执行和其他请求被禁用，虚拟 diff 列表最多绘制 40 项。用 Node **v24.22.1** 运行了三轮 `node --cpu-prof`：三页全组、渲染分项、大文件边界；计时均先预热 5 次，表内稳定值为重复 30–60 次的中位数，scroll spy 为 500 次。

这里测到的是 JavaScript 与假元素构造成本；未包含 Herdr 原生布局、绘制及输入响应。**30–50 倍是任务给定的 QuickJS 风险估算，不能据此断言实机一定触发 `interrupted`。** CPU profiles 中能看到 `fileTree/fileRows`、`visibleGroups` 和 `contentWidth` 的样本；主要结论同时由隔离计时和实际元素/数据数量支撑。

```text
render
  aside → fileTree → 全组 fileRows + 全组元素             # 2
  diffView → items(version 变化)
               buildItems → 每行 × 全部 notes             # 4
               contentWidth → 所有已加载行的 token 文本    # 3
150ms tick → spied → 反向找组 + 从头扫描至视野末尾          # 6
loadReview(commit) → loadBaseCommits → 整个 branch 元数据   # 5
toggleFull → /api/review/file → 整个文件                    # 1
```

初次打开三页的数据与稳定渲染：

| 页面 / 组 | 全页文件数 | 组内文件 / 文件夹行 | 初次响应字节 | 整帧 ms | aside ms | 省去 aside 后整帧 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/worktree` / Code | 65 | 65 / 7 | 886,545 | 0.857 | 0.307 | 0.459 |
| `/branch/sample-feature` / Code | 1554 | 1164 / 68 | 1,036,040 | 8.868 | 6.113 | 2.361 |
| `/compare/origin/sample-feature...sample-feature` / Docs | 1264 | 626 / 142 | 1,039,776 | 4.253 | 3.333 | 0.764 |

branch Code 的稳定渲染数据包括切组后真实取得的 14 个文件；全页缓存共 5875 行，diff 仍只画 40 项。省去 aside 仅是临时探针中的函数替换，没有修改仓库或安装目录。

E1、E3、E5 的 daemon 请求可以用下列脚本重新核对；脚本只打印长度、行数及耗时，不打印 session 或文件内容：

```sh
node <<'NODE'
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { port, session } = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.pulls.review/daemon.pid'), 'utf8'));
const origin = `http://127.0.0.1:${port}`;
const root = '/path/to/benchmark-repo';
const page = '/branch/sample-feature';
async function read(route, body) {
  const t = performance.now();
  const res = await fetch(origin + route, { method: 'POST', headers: {
    Cookie: `pulls_session=${session}`, Origin: origin, 'Content-Type': 'application/json',
  }, body: JSON.stringify({ path: root, page, colors: { foreground: '#cccccc' }, rows: [], ...body }) });
  if (!res.ok) throw Error(`${route}: ${res.status}`);
  const text = await res.text(), data = JSON.parse(text);
  console.log({ route, page: body.page ?? page, bytes: Buffer.byteLength(text),
    rows: data.rows?.length, files: data.files?.length, commits: data.commits?.length,
    ms: +(performance.now() - t).toFixed(3) });
  return data;
}
(async () => {
  await read('/api/review/file', { file: 'dist/large-bundle.js' });
  const file = 'src/LargeReader.cs';
  const r = await read('/api/review', { rows: [file] });
  console.log({ sourceFileRows: r.files.find(f => f.path === file).hunks.reduce((n, h) => n + h.rows.length, 0) });
  await read('/api/review', { page: '/commit/SAMPLE_COMMIT' });
  await read('/api/review', {}); // loadBaseCommits 发出的第二次读取
})().catch(e => { console.error(e); process.exitCode = 1; });
NODE
```

E1：`/api/review/file` 两次实测均为 10,096,467 字节、84,888 行；Node 读取耗时 489–514ms，单独 JSON 解码 46–70ms。普通 `/api/review` 对同一文件返回的 `hunks` 为空，因为 diff 已标记 `truncated`；**没有把它误报为常规 rows 分批后仍返回 84,888 行**。

E2：在上述 fake env 中把 `pane.width = 1200`、`pane.view = 900`，选中 branch 的 `code` 组；先完成其 `pane.load(cx)`，然后暂停后台加载，只计同步 `pane.render(cx)`。用 `drawn` 统计 `tree-f-` 和 `tree-d-` 前缀，得到 1164 和 68；通过 `vm.runInContext('aside = () => div()', mainScope)` 暂时省去 aside 后重复同一计时。

E3：对 C# 文件的 rows 请求只返回 1,290,487 字节，7461 行确实能进入正常 pane 数据路径。把 `pane.version++` 后的 `pane.items()` 单独计时，中位数 4.380ms；对同一文件生成的 runs 单独执行 `contentWidth(items)` 为 3.088ms，反复只构建 runs、没有 notes 时为 0.250ms。

84,888 行完整文件在 Node 内单独量宽为 37.261ms、items 重建为 40.773ms；这说明简单放宽 HTTP 上限还会留下大的同步工作，**但它尚未通过当前 Herdr 响应上限，因此这两个数不作为“现有宿主实际已渲染”的证据**。

E4：在 `check-pane.cjs` 的 rows 环境中使用下列数据，或者用 E3 的真实 C# 文件替换 `f`，均能重现行数乘注释数的扫描；无需调用 AI：

```js
const f = { path: 'probe.cs', status: 'added', hunks: [{ header: '@@', rows:
  Array.from({ length: 7461 }, (_, i) => ({ kind: '+', new: i + 1, tokens: [['code']] })) }] };
const opts = { collapsed: new Set(), full: new Map(), split: false, width: 900 };
for (const count of [0, 10, 30, 100]) {
  const notes = Array.from({ length: count }, (_, i) => ({ text: 'Review note',
    critical: false, anchor: { side: 'additions', line: (i + 1) * 50 } }));
  // 各 count 预热后，重复计时这一调用。
  buildItems({ files: [f] }, { files: [f.path], children: [], notes: { [f.path]: notes } }, opts);
}
```

| 真实 7461 行 C# 文件的本地注释数 | 0 | 10 | 30 | 100 |
| --- | ---: | ---: | ---: | ---: |
| 单文件 `buildItems()` 中位数 ms | 0.250 | 1.302 | 3.046 | 9.567 |

E5：探针保留真实 `loadReview()` 和 `loadBaseCommits()`，先从 branch 打开其最后一个 commit，再调用一次 `pane.load(cx, true)`；捕获的请求顺序为 commit 的 3422 字节，然后 branch 的 566,718 字节，两者均为 `rows: []`、`firstRows: false`。后者是源码自动发出的后台读取，不是仅凭两个手工请求推测调用链。

E6：把 `pane.visible` 设为当前列表末尾 40 项，重复调用 init 注册的 150ms timer；另一次用 Proxy 计数 `pane.itemList` 的数字下标读取：

```js
const list = pane.itemList;
let reads = 0;
pane.itemList = new Proxy(list, { get(target, key) {
  if (/^\d+$/.test(String(key))) reads++;
  return Reflect.get(target, key);
} });
spy(cx);
pane.itemList = list;
console.log(reads); // branch Code / 2424 项：4850
```

**其余已检查路径**

- 1500ms 分析轮询已使用 `/api/review/status`，有 `polling` 防重入，运行中不读取完整 diff；没有重复报告此前已修的全 diff 轮询问题。运行中每次响应仍 `notify()`，因此会触发第 2 条的开销。
- 15000ms 刷新及 1000ms dirty 检查会跳过不在前台的 pane；folder watch 合并到每秒最多一次读取。100ms hover watch 和横向滚动后的延迟关闭只处理各自状态，没有发现与文件数相乘的扫描。
- 每次 render 的 `rowsWanted()` 和 header counts 仍分别遍历路径/文件；branch 中位数分别约 0.023ms、0.020ms，未列成独立的性能问题。group stats 已通过 `fileAt()` 的 Map 查找文件，没有重复报告此前修复的逐文件全表查找。
- 无变化的 metadata 读取仍执行两次全量签名序列化和文件合并，branch `apply()` 中位数 1.048ms、compare 0.818ms；现有“相同数据不重建列表”确实生效，按当前 15s 周期未把这点单列为必须改动。
- commit 和设置 popup 只在打开时构建，popup 列表已有可见范围绘制。完整项目检查和 daemon 的 vitest 未重跑，本次没有实现变更；`node extras/mods/review/check-pane.cjs` 已通过。

原审查结论（基线时）：fix 1 first. 第 2、3 条是当前真实大仓库中最值得接着消除的渲染开销。

Not checked: 未操作 Herdr 窗口或实测 QuickJS、中断阈值和真实鼠标点击；合成注释未来自真实 AI 分析。未调用 analyze、写 reviewed、重启 daemon；未提交，本次仅新增报告，未改实现或删除项目文件，临时脚本和 profiles 已清理。
