import { exec, theme, watchFolder } from "herdr";
import { review } from "./daemon.js";
import { clipRows, groupFiles } from "./rows.js";
import { pref } from "./controls.js";

// How long a read may take before the pane says it didn't answer and offers Retry; its answer still counts if it comes.
const LOAD_TIMEOUT = 30000;

// Syntax kinds in the theme's own colors, as the shipped files mod colors code.
export function colors(t) {
  const kinds = { foreground: t.foreground, keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6, boolean: t.ansi6 };
  return Object.fromEntries(Object.entries(kinds).filter(([, color]) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color ?? "")));
}

// Worth a read? Of Git's own files only HEAD and refs, and nothing Git ignores: macOS reports those too.
// `git check-ignore` exits 0 when some are ignored, listing them, 1 when none are, 128 when it can't judge.
async function touchesDiff(root, paths) {
  if (paths.some(p => /\/\.git\/(HEAD|refs\/)/.test(p))) return true;
  const files = paths.filter(p => !/\/\.git(\/|$)/.test(p));
  if (!files.length) return false;
  const r = await exec("git", ["--no-optional-locks", "check-ignore", "--", ...files], { cwd: root }).catch(() => null);
  return r?.code !== 0 || r.stdout.trim().split("\n").length < files.length;
}

function watchReview(view, cx) {
  const root = view.root;
  if (view.watching === root) return;
  view.watching = root;
  cx.spawn(async (cx) => {
    try {
      while (view.watching === root) {
        const paths = await watchFolder(root);
        if (view.watching === root && await touchesDiff(root, paths)) view.refresh(cx);
        // At most one change read a second: what changes meanwhile comes in the next batch.
        await new Promise(resolve => cx.timer.after(1000, resolve));
      }
    } catch { view.watching = null; }
  });
}

// Rows come only for the group shown (a large diff's run to megabytes), and none while polling a run:
// apply() keeps the rows of files whose sha didn't change. With no group yet, the first group's rows come with the read;
// a daemon too old for `firstRows` ignores it, and the group's rows are asked for once it shows.
// Only the latest read counts: a read of the page being read waits for it (a burst of changes can't restart it forever),
// a read of another starts at once and the old one's answer is dropped.
export function loadReview(view, cx, poll = false) {
  if (!view.root || !view.page) return;
  if (view.loading?.root === view.root && view.loading.page === view.page) { view.again = true; return; }
  // Switching, the group shown is the old page's: the new page's first group comes with the read instead.
  const { root, page } = view, t = theme(), group = view.switching ? null : view.group(), marks = view.marks, id = ++view.loadId;
  view.loading = { root, page }; view.again = false; view.dirty = false;
  // Rows only for the group's files that have none: apply() keeps the rest, and each asked-for file is highlighted anew.
  const rows = poll || !group ? [] : groupFiles(group).filter(path => view.review.files.some(f => f.path === path && !f.hunks));
  for (const file of view.review?.files ?? []) if (rows.includes(file.path)) view.asked.add(file.sha);
  const key = JSON.stringify(colors(t));
  cx.timer.after(LOAD_TIMEOUT, (cx) => {
    if (id !== view.loadId || !view.loading) return;
    view.loading = null; view.error = `jin.review didn't answer in ${LOAD_TIMEOUT / 1000} s`;
    // Not under the new page's title.
    if (view.switching) view.forget();
    cx.notify();
  });
  cx.spawn(async (cx) => {
    try {
      const r = await review(root, "/api/review", { page, colors: colors(t), rows, firstRows: !group });
      if (id !== view.loadId) return;
      // The theme changed meanwhile: these rows have the old colors, and later reads ask only for files without rows.
      if (JSON.stringify(colors(theme())) !== key) { view.again = true; return; }
      // Read before a reviewed mark landed, it would undo the mark on screen: the mark's own read follows.
      if (view.marking || marks !== view.marks) return;
      view.apply(r);
      view.error = null;
      watchReview(view, cx);
      loadBaseCommits(view, cx);
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
    finally {
      if (id === view.loadId) {
        view.loading = null;
        view.report();
        cx.notify();
        if (view.again) view.load(cx);
      }
    }
  });
}

// A run's state, without reading the diff: running, it updates in place; ended, or failed anew, the diff is read; not
// started yet, nothing. A daemon without the route, or any failure, reads the diff as before. One call at a time.
export function pollReview(view, cx) {
  if (view.polling) return;
  const { root, page } = view;
  view.polling = true;
  cx.spawn(async (cx) => {
    try {
      const s = await review(root, "/api/review/status", { page });
      const a = view.review?.analysis;
      if (root !== view.root || page !== view.page || !a || view.switching) return;
      if (s.running) {
        view.review.analysis = { ...a, state: "running", progress: s.progress }; view.startingUntil = 0;
        view.report(); cx.notify();
      } else if (a.state === "running" || (s.error && s.error !== a.error)) view.load(cx, true);
    } catch { if (root === view.root && page === view.page) view.load(cx, true); }
    finally { view.polling = false; }
  });
}

export function applyReview(view, r) {
  // Noisy and reviewed files start collapsed, the first time each version of them shows.
  for (const file of r.files) {
    if (view.seen.has(file.sha)) continue;
    view.seen.add(file.sha);
    if (file.noisy || file.reviewed) view.collapsed.add(file.path);
  }
  for (const file of r.files) for (const hunk of file.hunks ?? []) clipRows(hunk.rows);
  const old = new Map(view.review?.files.map(file => [file.path, file]));
  for (const file of r.files) if (!file.hunks && old.get(file.path)?.sha === file.sha) file.hunks = old.get(file.path).hunks;
  // A read that says what the one shown does changes nothing: the list isn't rebuilt, and its files stay the ones marks change.
  const said = (x) => JSON.stringify([x.key, x.title, x.base, x.head, x.commits, x.source, x.groups, x.analysis,
    x.files.map(f => [f.path, f.sha, f.reviewed, f.changed, Boolean(f.hunks)])]);
  if (view.review && !view.switching && said(r) === said(view.review)) return;
  for (const path of view.full.keys()) if (old.get(path)?.sha !== r.files.find(file => file.path === path)?.sha) view.full.delete(path);
  const switched = view.switching;
  if (switched) { view.forget(); view.scrolledDownBy = 0; view.settling = null; }
  view.review = r;
  if (r.analysis.state === "running") view.startingUntil = 0;
  // The diff's commits, for stepping through them while one is shown on its own (its page lists only itself).
  if (view.page === view.base) view.baseCommits = r.commits;
  if (!r.groups.some(g => g.key === view.groupKey)) view.groupKey = r.groups[0]?.key ?? null;
  view.version++;
  // The old page's list was kept on screen, scrolled: the new one starts at its top.
  if (switched) view.scroll.scroll_to_item(0);
}

// One commit's page lists only itself: the diff's commits come from its base, read without rows after each read, so a new
// commit reaches the header's list. A failed read leaves the list as it was.
function loadBaseCommits(view, cx) {
  const { root, base } = view;
  if (view.page === base) return;
  cx.spawn(async (cx) => {
    const r = await review(root, "/api/review", { page: base, colors: colors(theme()), rows: [] }).catch(() => null);
    if (r && root === view.root && base === view.base) { view.baseCommits = r.commits; cx.notify(); }
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
