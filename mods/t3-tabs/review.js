// The Review bar, shown once the pulls.review extra is installed: the focused worktree's
// uncommitted files and its commits ahead of and behind its upstream, each opening that diff.
// The counts read the remote-tracking refs as they are; fetching is left to you.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, focused, exec, appHome, readTextFile, watchFolder, window, openOverlay } from "herdr";

// Same lookup as the shipped `changes` mod.
function reviewLocation() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  return { cwd: pane?.cwd || f?.cwd || space?.folder, on };
}

// Reads write nothing under .git, so the folder watch doesn't wake on them.
const git = (cwd, args) => exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", ...args], { cwd });

// Each location keeps its last read, so switching back shows it at once and switching away never shows the old one.
// Focus is checked every 250 ms (memory reads only); git is read on a new location, a change in the worktree, else every 10 s.
export function watchReview(view, cx) {
  view.reviews = new Map();
  view.reviewAt = new Map();
  view.reviewBusy = new Set();
  view.reviewWatching = new Set();
  cx.timer.every(250, (cx) => {
    const where = reviewLocation(), key = JSON.stringify(where);
    if (key !== view.reviewKey) { view.reviewKey = key; cx.notify(); }
    if (!window()?.active || view.reviewBusy.has(key) || Date.now() - (view.reviewAt.get(key) ?? 0) < 10000) return;
    view.reviewBusy.add(key);
    view.reviewAt.set(key, Date.now());
    cx.spawn(async (cx) => {
      try {
        const review = where.cwd && !where.on && await readTextFile(`${appHome()}/mods/pulls-review/mod.json`) !== null
          ? await readReview(where.cwd) : null;
        view.reviews.set(key, review);
        // One watch per repo: focus moving A → B → A before A changes keeps A's first watch.
        const root = review?.root;
        if (root && !view.reviewWatching.has(root)) {
          view.reviewWatching.add(root);
          cx.spawn(async () => {
            try { while (view.reviews.get(view.reviewKey)?.root === root) { await watchFolder(root); view.reviewAt.clear(); } }
            catch {} // The next read watches it again.
            finally { view.reviewWatching.delete(root); }
          });
        }
      } catch { view.reviews.set(key, null); }
      finally { view.reviewBusy.delete(key); cx.notify(); }
    });
  });
}

async function readReview(cwd) {
  const top = await git(cwd, ["rev-parse", "--show-toplevel"]);
  if (top.code !== 0) return null;
  const root = top.stdout.trim(), status = await git(root, ["status", "--porcelain=v2", "--branch"]);
  if (status.code !== 0) return null;
  const review = { root, branch: null, upstream: null, base: null, changed: 0, ahead: 0, behind: 0, unmerged: 0, newer: 0, gone: false };
  let ab = false;
  for (const line of status.stdout.split("\n")) {
    if (line.startsWith("# branch.head ")) review.branch = line.slice(14);
    else if (line.startsWith("# branch.upstream ")) review.upstream = line.slice(18);
    else if (line.startsWith("# branch.ab ")) { ab = true; [review.ahead, review.behind] = line.slice(12).split(" ").map(n => Math.abs(parseInt(n, 10)) || 0); }
    else if (line && !line.startsWith("#")) review.changed++; // One line per file, staged or not, renames included.
  }
  // git leaves out branch.ab when the upstream is set but gone, as after a merged PR's branch is deleted.
  review.gone = Boolean(review.upstream) && !ab;
  // The default branch as the CLI resolves it (resolveDefaultBranch): origin/HEAD, else main or master.
  const originHead = (await git(root, ["symbolic-ref", "--short", "-q", "refs/remotes/origin/HEAD"])).stdout.trim();
  const names = originHead ? [originHead.replace(/^origin\//, "")] : ["main", "master"];
  for (const ref of names.flatMap(name => [`origin/${name}`, name])) {
    const count = await git(root, ["rev-list", "--left-right", "--count", `${ref}...HEAD`]);
    if (count.code !== 0) continue; // No such ref.
    review.base = ref.replace(/^origin\//, "");
    // On the default branch or a detached HEAD the CLI opens its ref picker instead: nothing to show.
    if (review.branch !== review.base && review.branch !== "(detached)") {
      [review.newer, review.unmerged] = count.stdout.trim().split(/\s+/).map(n => parseInt(n, 10) || 0);
      // A branch tracking the default branch: its ↑ is the same commits as N commits vs base.
      if (review.upstream === `origin/${review.base}`) review.ahead = 0;
    }
    break;
  }
  return review;
}

export function reviewBar(view, t, stop) {
  // Looked up on each render, so the frame that shows another space already shows its own counts.
  const r = view.reviews?.get(JSON.stringify(reviewLocation()));
  if (!r || !(r.unmerged || r.changed || r.ahead || r.behind)) return null;
  const n = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  // The accessibility label says what each count compares, which the short label can't.
  const item = (id, label, color, name, args) => div().id(id).h(26).px(6).flex_none().flex().items_center().rounded(6)
    .text_size(12).text_color(color).hover(s => s.bg(t.hover)).role("button").accessibility_label(name)
    .on_mouse_down("left", stop)
    .on_click(() => openOverlay({ mod: "pulls-review", kind: "popup", at: "top", offset: 40, width: 320, height: 44, props: { cwd: r.root, args, analyze: true } }))
    .child(label);
  return h_flex().id("pulls-review").flex_none().items_center()
    .when(r.unmerged > 0, el => el.child(item("review-open", `${n(r.unmerged, "commit")} vs ${r.base}`, t.foreground, `Review the branch: ${n(r.unmerged, "commit")} on ${r.branch}, not on ${r.base}`
      + (r.newer ? ` · ${r.base} has ${n(r.newer, "newer commit")}` : "") + (r.gone ? ` · ${r.upstream} is gone, likely merged` : ""), [])))
    .when(r.changed > 0, el => el.child(item("review-changes", `${n(r.changed, "file")} uncommitted`, t.ansi3, `Review ${n(r.changed, "uncommitted file")}: staged, unstaged and new`, ["--worktree"])))
    .when(r.ahead > 0, el => el.child(item("review-ahead", `↑${r.ahead}`, t.ansi2, `Review ${n(r.ahead, "commit")} to push: on ${r.branch}, not on ${r.upstream}`, [`${r.upstream}...${r.branch}`])))
    .when(r.behind > 0, el => el.child(item("review-behind", `↓${r.behind}`, t.ansi1, `Review ${n(r.behind, "commit")} to pull: on ${r.upstream} as of your last fetch, not on ${r.branch}`, [`${r.branch}...${r.upstream}`])));
}
