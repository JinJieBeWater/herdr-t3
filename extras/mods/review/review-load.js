import { theme } from "herdr";
import { review } from "./daemon.js";
import { clipRows } from "./rows.js";
import { TREE } from "./files.js";
import { pathEntries, sortEntries } from "./file-tree.js";
import { pref } from "./controls.js";

// How long a read may take before the pane says it didn't answer and offers Retry; its answer still counts if it comes.
const LOAD_TIMEOUT = 30000;

// Syntax kinds in the theme's own colors, as the shipped files mod colors code.
export function colors(t) {
  const kinds = { foreground: t.foreground, keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6, boolean: t.ansi6 };
  return Object.fromEntries(Object.entries(kinds).filter(([, color]) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color ?? "")));
}

// A read of the page shown. Only the latest counts: one that doesn't answer in LOAD_TIMEOUT says so and offers Retry.
function startRead(view, cx) {
  const id = ++view.loadId;
  view.loading = { root: view.root, page: view.page }; view.again = false;
  cx.timer.after(LOAD_TIMEOUT, (cx) => {
    if (id !== view.loadId || !view.loading) return;
    view.loading = null; view.error = `jin.review didn't answer in ${LOAD_TIMEOUT / 1000} s`;
    // Not under the new page's title.
    if (view.switching) view.forget();
    cx.notify();
  });
  return id;
}

function endRead(view, cx, id) {
  if (id !== view.loadId) return;
  view.loading = null;
  view.report();
  cx.notify();
  if (view.again) view.load(cx);
}

// Rows come only for the group shown (a large diff's run to megabytes), and none while polling a run:
// apply() keeps the rows of files whose sha didn't change. With no group yet, the first group's rows come with the read;
// a daemon too old for `firstRows` ignores it, and the group's rows are asked for once it shows.
// Only the latest read counts: a read of the page being read waits for it (a burst of changes can't restart it forever),
// a read of another starts at once and the old one's answer is dropped.
export function loadReview(view, cx, poll = false) {
  // Evicted (main.js evict): read when shown again.
  if (view.evicted) { view.dirty = true; return; }
  if (!view.root || !view.page) return;
  if (view.loading?.root === view.root && view.loading.page === view.page) { view.again = true; return; }
  // Switching, the group shown is the old page's: the new page's first group comes with the read instead.
  const { root, page } = view, switched = view.switching, t = theme(), group = switched ? null : view.group(), marks = view.marks, id = startRead(view, cx);
  view.dirty = false;
  // Rows only for the files in view or just after that have none: apply() keeps the rest, and each asked-for file is highlighted anew.
  const rows = poll || !group ? [] : view.rowsWanted();
  const key = JSON.stringify(colors(t));
  cx.spawn(async (cx) => {
    try {
      const r = await review(root, "/api/review", { page, colors: colors(t), rows, firstRows: !group });
      if (id !== view.loadId) return;
      // The theme changed meanwhile: these rows have the old colors, and later reads ask only for files without rows.
      if (JSON.stringify(colors(theme())) !== key) { view.again = true; return; }
      // Read before a reviewed mark landed, it would undo the mark on screen: the mark's own read follows.
      if (view.marking || marks !== view.marks) return;
      view.apply(r);
      // The list is built here, in the read's task, and not in the next render: cutting a group's wrapped lines can take most of
      // the ~50ms Herdr gives a render, past which it's interrupted, and a task has ~500.
      view.items();
      view.error = null; view.stale = false;
      // Back from eviction, on the file it was reading.
      if (view.restoreTo) { const path = view.restoreTo; view.restoreTo = null; if (view.fileAt(path)) view.select(path, cx); }
      // A rows read changes no commit, and the base's whole read can outweigh it. Nor does stepping to another page of the
      // same diff: a new base clears its commits (main.js), and a refresh still reads them.
      if (!rows.length && !(switched && view.baseCommits)) loadBaseCommits(view, cx);
      // Only a count's click starts a run, on a page with no analysis. An outdated one waits for Re-analyze: every commit
      // on the branch would otherwise start another. The setting is off by default: the app never starts a paid, slow AI run by itself.
      if (view.analyzeFor === page) {
        view.analyzeFor = null;
        const a = r.analysis;
        if (pref("autoAnalyze") === true && a.agent && !a.error && a.state === "none") view.analyze(cx, false);
      }
    } catch (e) {
      if (id === view.loadId) {
        view.error = e?.message ?? String(e);
        if (view.switching) view.forget();
        // No daemon to ask: a run shown as going would poll, and each poll try to start the daemon, until it answers.
        else if (view.review?.analysis.state === "running") view.review.analysis = { ...view.review.analysis, state: "none", error: view.error };
      }
    }
    // A file can come back without rows, past the bytes one read carries: it's left for the next.
    finally { endRead(view, cx, id); }
  });
}

const rowCount = (hunks) => hunks.reduce((n, hunk) => n + hunk.rows.length, 0);

// After the open, a batch's rows, or the next page of a file cut short as its end nears the view, come on their own: a read
// of the whole page for them weighed half a megabyte a batch, nearly all of it the files and groups already shown. The daemon
// serves them from the diff shown; one it no longer holds is `stale`, and the whole page is read again, rows and all.
export function loadRows(view, cx) {
  const rows = view.rowsWanted(), more = rows.length ? null : view.pageWanted();
  if (!rows.length && !more) return;
  if (view.stale || view.loading) return view.load(cx);
  const { root, page, review: shown } = view, t = theme(), key = JSON.stringify(colors(t)), id = startRead(view, cx);
  const whole = more && view.full.get(more);
  cx.spawn(async (cx) => {
    try {
      const r = whole
        ? await review(root, "/api/review/file", { page, file: more, colors: colors(t), from: whole.rows.length })
        : await review(root, "/api/review/rows", { page, colors: colors(t), files: more ? [more] : rows, base: shown.base?.sha ?? "", head: shown.head?.sha ?? "", ...more ? { from: rowCount(view.fileAt(more).hunks) } : {} });
      if (id !== view.loadId) return;
      if (JSON.stringify(colors(theme())) !== key) { view.again = true; return; }
      if (r.stale) { view.stale = view.again = true; return; }
      // shortcut: a whole file changed between its pages goes on from the new text until the read that drops it, a second at most; the answer could name its sha.
      if (whole) {
        if (view.full.get(more) !== whole) return;
        whole.rows = whole.rows.concat(clipRows(r.rows)); whole.truncated = r.truncated;
        whole.stuck = Boolean(r.truncated) && !r.rows.length;
      } else {
        const file = more && view.fileAt(more), before = file ? rowCount(file.hunks) : 0;
        for (const got of r.files) {
          const file = view.fileAt(got.path);
          if (file?.sha !== got.sha) continue;
          for (const hunk of got.hunks ?? []) clipRows(hunk.rows);
          if (!more) { Object.assign(file, { hunks: got.hunks, clipped: got.clipped, stuck: false }); continue; }
          // A page's first hunk without a header goes on from the last one shown.
          for (const hunk of got.hunks ?? []) { const last = file.hunks.at(-1); if (hunk.header === undefined && last) last.rows = last.rows.concat(hunk.rows); else file.hunks.push(hunk); }
          file.clipped = got.clipped;
        }
        // A page that brings nothing more can't be got: the rest stays out.
        if (file?.clipped && rowCount(file.hunks) === before) file.stuck = true;
      }
      view.version++;
      view.items();
    } catch (e) {
      // A batch a daemon without the route (an older one) or a failed read didn't bring: the whole page brings it, or says why.
      if (id === view.loadId) { if (more) view.error = e?.message ?? String(e); else view.stale = view.again = true; }
    } finally { endRead(view, cx, id); }
  });
}

// A run's state, without reading the diff: running, it updates in place; ended, or failed anew, the diff is read; not
// started yet, nothing. A daemon without the route, or any failure, reads the diff as before. One call at a time.
export function pollReview(view, cx) {
  if (view.polling) return;
  const { root, page } = view;
  view.polling = true;
  // Without a review (evicted, main.js), the run's state kept is all there is to end; the diff is read once it shows.
  const ended = (cx, error) => { if (!view.review) { view.awayAnalysis = { state: "none", error }; view.report(); cx.notify(); } view.load(cx, true); };
  cx.spawn(async (cx) => {
    try {
      const s = await review(root, "/api/review/status", { page });
      const a = view.runState();
      if (root !== view.root || page !== view.page || !a) return;
      if (s.running) {
        const run = { ...a, state: "running", progress: s.progress };
        if (view.review) view.review.analysis = run; else view.awayAnalysis = { state: "running", error: a.error ?? null };
        view.startingUntil = 0; view.report(); cx.notify();
      } else if (a.state === "running" || (s.error && s.error !== a.error)) ended(cx, s.error ?? null);
    } catch (e) { if (root === view.root && page === view.page) ended(cx, e?.message ?? String(e)); }
    finally { view.polling = false; }
  });
}

// Paths in the order the file tree shows them: in each folder its folders first, then its files, by name as Files sorts them.
function treeOrder(paths) {
  const kids = pathEntries(paths.map(path => ({ path }))), out = [];
  const walk = (dir) => { for (const e of sortEntries(kids.get(dir))) e.dir ? walk(e.path) : out.push(e.path); };
  walk("");
  return out;
}

export function applyReview(view, r) {
  // Each group's files once per read in the tree's order, which the diff, its reads and the keys follow (rows.js groupFiles).
  const order = (g) => { g.files = treeOrder(g.files); g.children.forEach(order); };
  r.groups.forEach(order);
  // Noisy and reviewed files start collapsed, the first time each version of them shows.
  for (const file of r.files) {
    if (view.seen.has(file.sha)) continue;
    view.seen.add(file.sha);
    if (file.noisy || file.reviewed) view.collapsed.add(file.path);
  }
  for (const file of r.files) for (const hunk of file.hunks ?? []) clipRows(hunk.rows);
  const old = new Map(view.review?.files.map(file => [file.path, file]));
  // With its pages so far, and whether more can come.
  for (const file of r.files) if (!file.hunks && old.get(file.path)?.sha === file.sha) { const o = old.get(file.path); Object.assign(file, { hunks: o.hunks, clipped: o.clipped, stuck: o.stuck }); }
  // A read that says what the one shown does changes nothing: the list isn't rebuilt, and its files stay the ones marks change.
  const said = (x) => JSON.stringify([x.key, x.title, x.base, x.head, x.commits, x.source, x.groups, x.analysis,
    x.files.map(f => [f.path, f.sha, f.reviewed, f.changed, Boolean(f.hunks)])]);
  if (view.review && !view.switching && said(r) === said(view.review)) return;
  for (const path of view.full.keys()) if (old.get(path)?.sha !== r.files.find(file => file.path === path)?.sha) view.full.delete(path);
  const switched = view.switching;
  if (switched) { view.forget(); view.settling = null; }
  view.review = r;
  if (r.analysis.state === "running") view.startingUntil = 0;
  // The diff's commits, for stepping through them while one is shown on its own (its page lists only itself).
  if (view.page === view.base) view.baseCommits = r.commits;
  // Another list - another page or worktree, a read after a failed one, an analysis's groups - starts at its top: the
  // scroll handle keeps the old list's place. forget() leaves no group, so every one of them comes through here.
  if (!r.groups.some(g => g.key === view.groupKey)) { view.groupKey = r.groups[0]?.key ?? null; view.scroll.scroll_to_item(0); view.treeOf = null; view.scrollTop = { ...view.scrollTop, [TREE]: 0 }; }
  view.version++;
}

// One commit's page lists only itself: the diff's commits come from its base, read without rows after each read of none, so a new
// commit reaches the header's list. A failed read leaves the list as it was.
function loadBaseCommits(view, cx) {
  const { root, base } = view;
  if (view.page === base) return;
  cx.spawn(async (cx) => {
    const r = await review(root, "/api/review", { page: base, colors: colors(theme()), rows: [] }).catch(() => null);
    if (r && !view.evicted && root === view.root && base === view.base) { view.baseCommits = r.commits; cx.notify(); }
  });
}

export function analyzeReview(view, cx, force) {
  const { root, page } = view;
  // shortcut: 10 s is a guess at the slowest start, and a start that fails says nothing; replace it once the worktree server answers when it has started.
  view.startingUntil = Date.now() + 10000; view.analyzeError = null;
  cx.timer.after(10000, (cx) => { view.report(); cx.notify(); });
  cx.notify();
  cx.spawn(async (cx) => {
    try { await review(root, "/api/review/analyze", { page, force }); }
    catch (e) { if (root === view.root && page === view.page) { view.startingUntil = 0; view.analyzeError = e?.message ?? String(e); } }
    cx.notify();
    view.load(cx);
  });
}

