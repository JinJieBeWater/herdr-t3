> 历史审查归档（2026-11-09 整理，截至 herdr-t3 `684eb4f` / pulls.review `d1f982f`）。正文、行号、实验与结论均对应下文原始基线；以下是按后续提交核对的处理状态，本轮未重跑实验。样本仓库路径、分支、提交和内部文件名已匿名化，复现代码中的占位值需替换为实际样本。

- 第 1 项：已修，见本仓库 `f0100f7`；后续同 blob 与超时重试遗漏由 `9e1c66f` 修正。
- 第 2–6 项：分别已修于 `fb1a72f`、`be7c28d`、`125d459`、`7f16a15`、`422858f`。

---

What this change does: 本次只读审查检查 Review pane 的页面与分组切换、异步读取、reviewed 标记、whole file、设置和 watch 循环。按“本机单人使用，但 diff 可能很大”的负载判断；不评估性能，也不重复报告已经修好的问题。

审查基线：`herdr-t3` 的 `19296eb`，包括 rows 分批修复 `06439d7`；契约与调用端核对到 `pulls.review` 的 `20a7c28`。以下 6 项均用当前 pane 源码和现有 `check-pane.cjs` 的模拟环境执行并断言，复现代码完整保存在本文末尾。

**Must fix:**

1. **[P1] rows 请求失败后，Retry 不再取缺失行，错误消失但 Loading… 留下**（`extras/mods/review/review-load.js:53–54,82–95`；`extras/mods/review/rows.js:25–36`）
   - **What this is:** 首次未带回的文件行在进入视野或分组后按需读取，Retry 应能重试这次读取。
   - **Problem:** 发出请求时就把文件 sha 放进 `asked`，失败时没有撤销，而 `rowsToAsk()` 会跳过它；具体触发是已显示某组、`a.ts` 尚无 `hunks`、请求失败一次，然后点 Retry，第二次请求的 `rows` 是 `[]`。
   - **Fix:** 失败、超时或因 reviewed 标记而丢弃回复时，释放本次请求的 `asked` 项；只有成功应用的行才算已完成。
   - **If we skip it:** 网络或 daemon 的一次暂时错误会让文件一直显示 `Loading…`，后续定时读取也无法补齐，须切页或重开才恢复。

   实测：`retried=[[]]`，`error=null`，`loading=["e:a.ts"]`，`rowsWanted=[]`。这也是 `06439d7` 的实际回归：现在 `loadReview()` 也经过 `rowsWanted()` 的 `asked` 过滤，显式 Retry 同样跳过失败文件。

2. **[P1] whole file 的旧回复能覆盖已更新文件，显示错误版本的代码**（`extras/mods/review/diff.js:82–97`；`extras/mods/review/review-load.js:135`）
   - **What this is:** 点击 whole file 会读取文件全文；正常 diff 更新会按 sha 清掉旧全文缓存。
   - **Problem:** 在同一 `/worktree` 或 branch 页面，先为 sha 为 v1 的文件发出全文请求，再收到 v2 的 diff，最后 v1 全文回复到达；回调只检查 `root/page`，会把已经清掉的旧内容重新放进 `full`。
   - **Fix:** 应用全文回复前核对当前文件 sha，并确认本次展开请求仍有效；切页、`forget()` 或版本变化应使旧请求失效。
   - **If we skip it:** 文件标题、计数和 reviewed 标记属于 v2，正文却是 v1，用户可能按旧代码完成审查；普通刷新还会继续保留这个错误缓存。

   实测：当前 `a.ts` 的 sha 已是 `a.ts-v2`，新 diff 的正文为 `NEW`，最终 items 中仍出现 `OLD`，没有 `NEW`。`applyReview()` 确实先删除了旧缓存，旧回复随后又把它插回。

3. **[P2] 分批 rows 返回后，延迟滚动会定位到另一个文件**（`extras/mods/review/main.js:211–226`；`extras/mods/review/review-load.js:143–145`）
   - **What this is:** 点击文件后，`scrollToTop()` 分两次滚动，把其标题放到视野顶端；两次之间可能收到尚未加载的 rows。
   - **Problem:** 它保存的是旧列表的数值 index，普通 rows 更新不会使 `settling` 失效；具体触发是在前面 11 个文件读取中点击第 16 个文件，然后前面的 rows 在第二次滚动前返回，旧 index 已指向其他文件。
   - **Fix:** 保存目标 item 的稳定 key，第二次滚动前从当前 items 重新找 index；目标已消失则取消。
   - **If we skip it:** 大组刚切入或正在补行时，点击文件会跳到其他文件，滚动高亮和用户选定的目标不一致。

   实测：目标 `f:f15.ts` 起初是 index `30`，rows 返回后变为 `74`，但延迟回调仍滚到 `30`；当前该位置是 `f:f5.ts`。复现使用 20 个文件、每文件 100 行，请求只取前 11 个文件，共 1100 行，在当前预算内。

4. **[P2] 同一 pane 切换仓库后再返回，会留下多个有效 watch 循环**（`extras/mods/review/review-load.js:25–37`；`extras/mods/review/main.js:270`）
   - **What this is:** pane 用 `watchFolder()` 等待当前 root 的变动；切换 root 时把 `watching` 清空，再为新 root 启动循环。
   - **Problem:** 循环身份只是一条 root 字符串，无法区分两次进入同一 root；具体触发是旧 A watch 尚未返回时走 A→B→A，新 A 循环已启动，此时 A 的变动会同时唤醒旧、新循环，两者都继续订阅。
   - **Fix:** 每次启动 watch 使用独立 token，等待返回后和再次订阅前都核对 token；旧循环只能结束自身，也只能清理自己的身份。
   - **If we skip it:** 每次这样往返都能多留一个 JS 循环，重复处理同一批变动并触发刷新，直到 pane 关闭。

   实测：起初 A 一个等待，往返后 A 两个等待；同批变动和 1000 ms timer 结束后，两个循环各自新增下一次等待，累计调用为 `A,B,A,A,A`。宿主 `src/files.rs` 会把同一批事件交给该 root 的全部等待者；它共用一个 OS watcher，故这里确认的是 JS 循环/订阅泄漏，没有声称会增加 OS watcher。

5. **[P2] 设置的旧读取会覆盖已经保存的新选择**（`extras/mods/review/settings.js:24–31,46–57`）
   - **What this is:** 每次打开设置会重新读取 daemon；上次打开的 `shared/agents` 仍留在 pane 中，因此重开时立即可以操作。
   - **Problem:** 打开时的 GET 没有版本检查；具体触发是重开设置，GET 读取到旧语言 `en` 后回复延迟，用户保存 `ja`，随后旧 GET 回复，`view.shared` 又被替换为 `en`。
   - **Fix:** 打开和保存设置时使旧读取失效，只让仍有效的读取更新界面；保存后的本地状态不能被较早的 GET 覆盖。
   - **If we skip it:** daemon 实际保存的语言或模型与设置面板显示的不一致，用户无法确认下一次分析会使用什么配置。

   实测：PUT 已完成，模拟 daemon 的 `locale` 是 `ja`；旧 GET 到达后，pane 的 `locale` 变回 `en`。现有保存队列避免了写入相互覆盖，但没有保护这个读取回写。

6. **[P2] 文件名包含冒号时，代码行关联到错误路径，sticky header 和视野识别失效**（`extras/mods/review/main.js:176,369–382`；`extras/mods/review/rows.js:183–187`）
   - **What this is:** items 的 key 带文件路径，`itemFile` 用它找出每行属于哪个文件，供 sticky header、代码区点击和 rows 视野判断使用。
   - **Problem:** 文件标题之外的 item 使用 `item.key.split(":")[1]` 提取路径；合法路径 `a:b.ts` 的代码行被解析成 `a`，代码行滚到顶端后找不到该文件。
   - **Fix:** 构建 item 时保留原始 `path`，映射直接读取该字段，不从拼接的 key 反解析路径。
   - **If we skip it:** 这些文件的 sticky header 消失、代码区点击不能选中文件；分批读取也得不到正确的可见文件路径。

   实测：视野只含 `a:b.ts` 的代码行时，`visibleFiles=["a"]`，`stickyFile=null`。文件标题自身有 `item.file.path`，所以标题初看正常，问题在滚入正文后才出现。

**验证与边界：**

- `node extras/mods/review/check-pane.cjs`：通过；其当前用例没有覆盖上述失败或交错顺序。
- 下方独立脚本：6 个 bug 断言通过；另检查了空 diff/0 个组、全部删除、二进制、纯重命名、只剩 Uncategorized 的渲染与 `j/k` 边界，未发现异常；删除和二进制的 whole file 操作被正确拒绝。
- 对照宿主文档确认模块级 `markWrites/saving` 会在 pane 副本之间共享，关闭或热重载时宿主取消各副本的任务、定时器；没有把缺少 `close()` 本身列为泄漏。宿主 fetch 已有 30 秒超时，没有报告永远不结束的网络请求。
- 全程未请求真实 `/api/review/analyze`、reviewed 或 settings 写入，未操作用户窗口、未改代码、未提交；只新增本报告。临时实验文件在验证后删除，执行代码保留如下。

**复现代码：** 在本机运行 `node <<'NODE'`，粘贴下列内容，最后以单独一行 `NODE` 结束即可。它只导入当前源码和原测试的 fake env，所有 HTTP、文件 watch、计时器及 reviewed/settings 写入均为内存替身。

```js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const dir = path.resolve('extras/mods/review');
const original = fs.readFileSync(path.join(dir, 'check-pane.cjs'), 'utf8');
const seed = new Function('require', '__dirname', original.slice(0, original.indexOf('const mainScope =')) + '\nreturn { load, env, review, file, row, groupFiles, handlers, drawn };')(require, dir);
const wait = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };
const clone = x => structuredClone(x);
const sample = clone(seed.review);
function reply(body, data = sample) {
  const r = clone(data);
  const wanted = new Set([...(body.rows ?? []), ...(body.firstRows && r.groups[0] ? seed.groupFiles(r.groups[0]) : [])]);
  for (const f of r.files) if (!wanted.has(f.path)) delete f.hunks;
  return r;
}
function make(extra = {}) {
  const timers = [], recurring = [], reads = [], scrolls = [];
  const api = async (_root, route, body) => {
    if (route === '/api/review') { reads.push(clone(body)); return reply(body); }
    if (route === '/api/review/status') return { running: false };
    throw new Error('unexpected fake route ' + route);
  };
  const scope = seed.load('main.js', {
    ...seed.env,
    localStorage: { getItem() { return null; }, setItem() {} },
    props: () => ({ root: '/repo', page: '/branch/fix', n: 1 }),
    shared: () => null, setShared() {},
    review: api,
    VirtualListScrollHandle: { new: () => ({ scroll_to_item: i => scrolls.push(i) }) },
    ...extra,
  });
  const cx = { spawn: f => f(cx), notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() {} }), timer: { after: (ms, f) => timers.push({ ms, f }), every: (ms, f) => recurring.push({ ms, f }) } };
  const pane = new scope.Mod();
  pane.init({}, cx);
  return { pane, scope, cx, timers, recurring, reads, scrolls, api };
}
async function main() {
  {
    const { pane, scope, cx, api } = make(); await wait();
    delete pane.fileAt('a.ts').hunks;
    scope.review = async () => { throw new Error('temporary failure'); };
    pane.load(cx); await wait();
    assert.equal(pane.error, 'temporary failure');
    assert.ok(pane.asked.has('a.ts'));
    const retried = [];
    scope.review = async (root, route, body) => { if (route === '/api/review') retried.push(body.rows); return api(root, route, body); };
    pane.load(cx); await wait();
    const loading = pane.items().filter(i => i.loading).map(i => i.key);
    assert.equal(pane.error, null);
    assert.deepEqual(JSON.parse(JSON.stringify(retried)), [[]]);
    assert.ok(loading.includes('e:a.ts'));
    assert.equal(pane.rowsWanted().length, 0);
    console.log('retry-after-error:', JSON.stringify({ retried, error: pane.error, loading, rowsWanted: pane.rowsWanted() }));
  }
  {
    const { pane, scope, cx } = make(); await wait();
    let resolve;
    scope.review = () => new Promise(r => { resolve = r; });
    const oldFile = pane.fileAt('a.ts');
    pane.toggleFull(oldFile, cx);
    const next = clone(pane.review);
    next.files.find(f => f.path === 'a.ts').sha = 'a.ts-v2';
    next.files.find(f => f.path === 'a.ts').hunks = [{ header: '@@', rows: [{ kind: '+', new: 1, tokens: [['NEW']] }] }];
    pane.apply(next);
    assert.equal(pane.full.has('a.ts'), false);
    resolve({ rows: [{ kind: '+', new: 1, tokens: [['OLD']] }] }); await wait();
    const shown = pane.items().flatMap(i => i.lines ?? []).flatMap(r => r.tokens ?? []).map(t => t[0]);
    assert.ok(shown.includes('OLD') && !shown.includes('NEW'));
    console.log('whole-file-stale-reply:', JSON.stringify({ currentSha: pane.fileAt('a.ts').sha, shown }));
  }
  {
    const watches = [];
    const { pane, cx, timers } = make({ watchFolder: root => new Promise((resolve, reject) => { watches.push({ root, resolve, reject }); }) });
    await wait();
    assert.equal(watches.length, 1);
    // Same reset performed by render() for a different root.
    pane.root = '/repo-B'; pane.watching = null; pane.forget(); pane.load(cx); await wait();
    pane.root = '/repo'; pane.watching = null; pane.forget(); pane.load(cx); await wait();
    assert.equal(watches.filter(w => w.root === '/repo').length, 2);
    for (const w of watches.filter(w => w.root === '/repo')) w.resolve(['/repo/.git/refs/heads/fix']); await wait();
    for (const pause of timers.filter(t => t.ms === 1000)) pause.f(cx); await wait();
    assert.equal(watches.filter(w => w.root === '/repo').length, 4);
    console.log('watch-return-to-root:', JSON.stringify({ watches: watches.map(w => w.root), watching: pane.watching }));
    // A late failure from B also clears the current A watch identity.
    watches.find(w => w.root === '/repo-B').reject(new Error('late B failure')); await wait();
    assert.equal(pane.watching, null);
    console.log('watch-old-root-failure:', JSON.stringify({ currentRoot: pane.root, watching: pane.watching }));
  }
  {
    const { pane, cx } = make(); await wait();
    const incoming = clone(pane.review);
    incoming.files = [seed.file('a:b.ts')];
    incoming.groups = [{ key: 'g', files: ['a:b.ts'], children: [], notes: {}, missing: [], label: 'G' }];
    pane.apply(incoming);
    const items = pane.items();
    const codeIndex = items.findIndex(i => i.kind === 'row');
    pane.visible = { start: codeIndex, end: codeIndex + 1 };
    assert.equal(pane.stickyFile(), null);
    assert.deepEqual([...pane.visibleFiles()], ['a']);
    console.log('colon-path:', JSON.stringify({ path: 'a:b.ts', visibleFiles: [...pane.visibleFiles()], stickyFile: pane.stickyFile() }));
  }
  {
    const deferred = [];
    const { pane, scope, cx, api, timers, scrolls } = make(); await wait();
    const many = clone(pane.review);
    many.files = Array.from({ length: 20 }, (_, i) => { const f = seed.file(`f${i}.ts`, { additions: 100, deletions: 0 }); delete f.hunks; return f; });
    many.groups = [{ key: 'g', files: many.files.map(f => f.path), children: [], notes: {}, missing: [], label: 'G' }];
    pane.apply(many); pane.items();
    scope.review = (_root, _route, body) => new Promise(resolve => deferred.push({ body, resolve }));
    pane.load(cx);
    pane.select('f15.ts', cx);
    const targetIndexBefore = pane.items().findIndex(i => i.key === 'f:f15.ts');
    const response = clone(many);
    for (const f of response.files) if (deferred[0].body.rows.includes(f.path)) f.hunks = [{ header: '@@', rows: Array.from({ length: 100 }, (_, i) => seed.row('+', undefined, i + 1)) }];
    deferred[0].resolve(response); await wait();
    const items = pane.items(); pane.frames++;
    timers.find(t => t.ms === 8).f(cx);
    const finalIndex = scrolls.at(-1), finalKey = items[finalIndex]?.key;
    assert.notEqual(finalKey, 'f:f15.ts');
    console.log('batch-scroll-target:', JSON.stringify({ expected: 'f:f15.ts', targetIndexBefore, targetIndexNow: items.findIndex(i => i.key === 'f:f15.ts'), finalIndex, finalKey }));
  }
  {
    let getN = 0, release;
    let settings = { locale: 'en', llm: { provider: 'local-agent', agent: 'pi' } };
    const { pane, scope, cx } = make({ request: async (_root, method, route, body) => {
      if (route === '/api/agents') return [{ name: 'pi', label: 'Pi', models: [] }];
      if (method === 'PUT') { settings = clone(body); return settings; }
      if (++getN === 1) return new Promise(resolve => { release = () => resolve({ locale: 'en', llm: { provider: 'local-agent', agent: 'pi' } }); });
      return clone(settings);
    } }); await wait();
    pane.agents = [{ name: 'pi', label: 'Pi', models: [] }]; pane.shared = clone(settings);
    pane.togglePopup('settings', cx);
    pane.settingsPage = 'language';
    pane.pageRows().find(r => r.id === 'locale-ja').pick(cx); await wait();
    assert.equal(settings.locale, 'ja');
    release(); await wait();
    assert.equal(pane.shared.locale, 'en');
    console.log('settings-old-load-overwrites-save:', JSON.stringify({ daemonLocale: settings.locale, paneLocale: pane.shared.locale }));
  }
  {
    const { pane, scope, cx } = make(); await wait();
    const cases = [
      { name: 'empty', files: [], groups: [] },
      { name: 'removed-only', files: [seed.file('gone.ts', { status: 'removed', additions: 0, hunks: [{ header: '@@', rows: [seed.row('-', 1)] }] })] },
      { name: 'binary-only', files: [seed.file('a.png', { isBinary: true, hunks: [] })] },
      { name: 'rename-only', files: [seed.file('new.ts', { previousPath: 'old.ts', status: 'renamed', additions: 0, deletions: 0, hunks: [] })] },
      { name: 'uncategorized-only', files: [seed.file('other.ts')], key: 'uncategorized' },
    ];
    for (const test of cases) {
      const data = clone(sample); data.files = test.files;
      data.groups = test.groups ?? [{ key: test.key ?? 'g', label: 'G', files: test.files.map(f => f.path), children: [], notes: {}, missing: [] }];
      scope.review = async () => clone(data);
      pane.apply(data); pane.render(cx);
      pane.step(1, cx); pane.step(-1, cx);
      if (test.name === 'removed-only' || test.name === 'binary-only') { pane.full.clear(); pane.toggleFull(pane.review.files[0], cx); assert.equal(pane.full.size, 0); }
      await wait();
      console.log('edge-pass:', test.name, 'items=' + pane.items().length);
    }
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
```

原审查结论（基线时）：fix 1–6 first.

Not checked: 真实鼠标点击、真实 QuickJS 布局和截图、真实 daemon 的写入行为与 fork 测试；这些用例验证的是 pane 的确定性状态和调用结果，尚未在窗口回放。主要风险是审查到旧版本正文，以及 Retry 后仍缺失行。
