// The Review bar, shown once the pulls.review extra is installed: the focused worktree's
// uncommitted files and its commits ahead of and behind its upstream, each opening that diff.
// The counts read the remote-tracking refs as they are; fetching is left to you.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, focused, exec, appHome, readTextFile, watchFolder, window, openOverlay } from "herdr";

// The shipped `changes` mod's lookup, except for a mod pane (below).
function reviewLocation() {
  const space = spaces().find((s) => s.active), f = focused();
  const ps = panes(), pane = f?.pane ? ps.find(p => p.pane === f.pane) : null;
  const on = f?.pane === null ? (f.terminal?.includes("/") ? f.terminal.split("/")[0] : null) : space?.machine ?? null;
  // A mod pane has no folder (the review pane itself): its tab's terminals stand in for it.
  const beside = pane && !pane.cwd ? ps.find(p => p.tab === pane.tab && p.cwd)?.cwd : null;
  return { cwd: pane?.cwd || beside || f?.cwd || space?.folder, on };
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
  // File by file, as the page it opens lists them: plain status folds a new folder into one line.
  const root = top.stdout.trim(), status = await git(root, ["status", "--porcelain=v2", "--branch", "--untracked-files=all"]);
  if (status.code !== 0) return null;
  const review = { root, branch: null, upstream: null, base: null, baseRef: null, changed: 0, ahead: 0, behind: 0, unmerged: 0, newer: 0, gone: false };
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
    // `base` is the branch name; `baseRef` is what was compared, named in the label so a fork's stale origin/main reads as itself.
    review.base = ref.replace(/^origin\//, "");
    review.baseRef = ref;
    // On the default branch or a detached HEAD the CLI opens its ref picker instead: nothing to show.
    if (review.branch !== review.base && review.branch !== "(detached)") {
      [review.newer, review.unmerged] = count.stdout.trim().split(/\s+/).map(n => parseInt(n, 10) || 0);
      // A branch tracking the default branch: its ↑ is the same commits as N ahead of base.
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
  // The count carries the color; what it counts stays quiet beside it.
  const item = (id, count, noun, ansi, name, args) => h_flex().id(id).h_full().px(6).gap(4).flex_none().items_center().rounded(5)
    .text_size(12).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground)).role("button").accessibility_label(name)
    // Herdr has no group hover. Entering the next segment can report before leaving this one.
    .on_hover((on, cx) => { if (on) view.reviewHover = id; else if (view.reviewHover === id) view.reviewHover = null; cx.notify(); })
    .on_mouse_down("left", stop)
    .on_click(() => openOverlay({ mod: "pulls-review", kind: "popup", at: "top", offset: 40, width: 320, height: 44, props: { cwd: r.root, args, analyze: true } }))
    // Hovered, the label turns foreground: the count takes its bright twin (ansi + 8) to stay the lead, same hue.
    .child(div().font_medium().text_color(t[`ansi${view.reviewHover === id ? ansi + 8 : ansi}`]).child(count))
    .when(Boolean(noun), el => el.child(noun));
  const segments = [
    // A squash merge leaves the count standing, so a deleted upstream is the visible hint it may be done.
    r.unmerged > 0 && item("review-open", String(r.unmerged), `ahead of ${r.base}${r.gone ? " · merged?" : ""}`, 4, `Review the branch: ${n(r.unmerged, "commit")} on ${r.branch}, not on ${r.baseRef}`
      + (r.newer ? ` · ${r.baseRef} has ${n(r.newer, "newer commit")}` : "") + (r.gone ? ` · ${r.upstream} is gone, likely merged` : ""), []),
    r.changed > 0 && item("review-changes", String(r.changed), "uncommitted", 3, `Review ${n(r.changed, "uncommitted file")}: staged, unstaged and new`, ["--worktree"]),
    r.ahead > 0 && item("review-ahead", `↑${r.ahead}`, null, 2, `Review ${n(r.ahead, "commit")} to push: on ${r.branch}, not on ${r.upstream}`, [`${r.upstream}...${r.branch}`]),
    r.behind > 0 && item("review-behind", `↓${r.behind}`, null, 1, `Review ${n(r.behind, "commit")} to pull: on ${r.upstream} as of your last fetch, not on ${r.branch}`, [`${r.branch}...${r.upstream}`]),
  ].filter(Boolean);
  // Outlined, not filled: a fill would read as the active tab.
  return h_flex().id("pulls-review").h(26).mr(4).pr(2).flex_none().items_center().rounded(6).border(1).border_color(t.border)
    .child(svg("mods/workspace-chrome/git-branch.svg").size(13).ml(7).mr(1).flex_none().text_color(t.dim))
    .children(segments.flatMap((s, i) => i ? [div().w(1).h(14).mx(2).flex_none().bg(t.border), s] : [s]));
}
