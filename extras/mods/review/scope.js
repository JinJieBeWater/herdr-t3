// What the review compares, as T3's DiffPanel header shows it: a scope button naming it, what it compares (`head → base`),
// a commit's short sha with ‹ › through its diff's commits, and the scope menu. The menu's counts, commits and branches are
// read from git when it opens (review-git.js, read-only, as the Review bar's); a pick is a request as the bar's count's.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { setShared } from "herdr";
import { scrollList } from "./list.js";
import { readReview, readPicks, argPage } from "./review-git.js";
import { PANE, LU, MONO, COMPACT, MODEL_ROW, hover, iconButton, pickMark, searchField, popover } from "./controls.js";

// A conventional commit's type and scope (`fix(t3-tabs): `), dimmed so the words after it lead.
const PREFIX = /^[a-z]+(\([^)]*\))?!?: /;
// A commit's age as the Review bar's menu reads it.
function ago(ms, now) {
  const m = Math.floor((now - ms) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return `${Math.floor(m / 1440)}d`;
}
// As T3's disabled menu items: there, greyed, inert.
const GREYED = 0.5;
const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

// The diff's commits, oldest first: on one commit's page, still its base's.
export function diffCommits(view) { return view.baseCommits ?? (view.switching ? null : view.review?.commits) ?? []; }

// The last read of this review's repository, while it's the one shown.
const repo = (view) => view.scopeGit?.root === view.root ? view.scopeGit : null;

/** What the page shown compares: its kind, the button's words, and for a branch's diff its head and base. */
export function scopeOf(view) {
  const page = view.page ?? "", r = repo(view), [, kind, ...rest] = page.split("/"), value = decodeURIComponent(rest.join("/"));
  if (kind === "worktree") return { kind: "uncommitted", label: "Uncommitted" };
  if (kind === "branch") return { kind: "changes", label: "Changes", head: value, base: (!view.switching && view.review?.base?.ref) || r?.baseRef || null };
  if (kind === "commit") {
    const c = diffCommits(view).find(c => c.sha === value) ?? view.picks?.commits.find(c => c.sha === value);
    return { kind: "commit", label: c?.subject ?? ((!view.switching && view.review?.title) || value.slice(0, 7)), sha: value };
  }
  // A branch against its upstream is what there is to push or to pull, as the Review bar's arrows count them.
  const [from, to] = value.split("...");
  if (kind === "compare" && to) {
    const push = (r && from === r.upstream && to === r.branch) || from.endsWith(`/${to}`);
    const pull = (r && from === r.branch && to === r.upstream) || to.endsWith(`/${from}`);
    return { kind: push ? "push" : pull ? "pull" : "branch", label: push ? "Outgoing" : pull ? "Incoming" : to, head: to, base: from };
  }
  return { kind: "other", label: value || page };
}

// The counts, commits and branches, read afresh on each opening; the last read shows meanwhile.
function readScope(view, cx) {
  const root = view.root;
  cx.spawn(async (cx) => {
    const r = await readReview(root).catch(() => null);
    if (root !== view.root) return;
    view.scopeGit = r; cx.notify();
    const picks = r ? await readPicks(r).catch(() => null) : null;
    if (root === view.root && view.scopeGit === r) { view.picks = picks; cx.notify(); }
  });
}

/** The menu's first page: the scopes as radios, each with its count (none: greyed, kept), then the pages of commits and branches. */
export function scopeRows(view) {
  const r = repo(view), p = repo(view) && view.picks, { kind } = scopeOf(view);
  const radio = (id, k, label, count, detail, page) => ({ id, kind: k, label, count, detail: r ? detail : "", page, on: page ? view.page === page : kind === k });
  return [
    radio("scope-changes", "changes", "Changes", r?.unmerged, r?.base ? `${r.unmerged} ahead of ${r.base}` : "", r && r.base && argPage([], r.branch)),
    radio("scope-uncommitted", "uncommitted", "Uncommitted", r?.changed, plural(r?.changed ?? 0, "file"), "/worktree"),
    // Only with an upstream: there's nothing to push to or pull from without one.
    ...r?.upstream && !r.gone ? [
      radio("scope-push", "push", "Outgoing", r.ahead, `↑${r.ahead}`, argPage([`${r.upstream}...${r.branch}`])),
      radio("scope-pull", "pull", "Incoming", r.behind, `↓${r.behind}`, argPage([`${r.branch}...${r.upstream}`])),
    ] : [],
    { id: "scope-commits", label: "Commits", count: p?.commits.length, sub: "commits" },
    { id: "scope-branches", label: "Branches", count: p?.branches.length, sub: "branches" },
  ];
}

/** A second page's rows, as its search narrows them: this branch's commits, or the other branches against the default. */
export function scopeList(view) {
  const query = view.scopeSearch.value().trim().toLowerCase(), r = repo(view), p = r && view.picks;
  if (view.scopePage === "branches") return (p?.branches ?? []).filter(b => b.name.toLowerCase().includes(query) || (b.subject ?? "").toLowerCase().includes(query))
    .map(b => ({ id: `scope-branch-${b.name}`, page: argPage([`${r.baseRef}...${b.name}`]), branch: b }));
  return (p?.commits ?? []).filter(c => c.sha.startsWith(query) || c.subject.toLowerCase().includes(query))
    .map(c => ({ id: `scope-commit-${c.sha}`, page: `/commit/${c.sha}`, commit: c }));
}

// A request as the Review bar's count's, handled with those in render. The menu is going, and the keyboard back on the pane.
function ask(view, page, cx, { analyze = false, base = undefined } = {}) {
  view.closePopup(cx);
  view.handle.focus();
  setShared(PANE, { space: view.space, root: view.root, page, ...base && { base }, n: Math.max(Date.now(), view.handled + 1), analyze });
  cx.notify();
}

// Another page of this diff (‹ ›): its base keeps the commits, and it has no `analyze`.
export function showPage(view, page, cx) {
  view.closePopup(cx);
  view.handle.focus();
  setShared(PANE, { space: view.space, root: view.root, page, base: view.base, n: Math.max(Date.now(), view.handled + 1) });
  cx.notify();
}

// A radio asks as a count's click, the analysis included; Commits and Branches open their page.
export function pickScopeRow(view, row, cx) {
  if (!row.count) return;
  if (row.sub) return openScopePage(view, row.sub, cx);
  ask(view, row.page, cx, { analyze: true });
}

// Browsing commits and branches mustn't start and bill a run per pick. A commit of the diff shown, or of this branch's
// Changes, keeps that diff as its base so ‹ › step through it.
export function pickListed(view, item, cx) {
  if (!item) return;
  if (item.branch) return ask(view, item.page, cx);
  const r = repo(view), sha = item.commit.sha;
  const ofDiff = !view.base?.startsWith("/commit/") && diffCommits(view).some(c => c.sha === sha);
  ask(view, item.page, cx, { base: ofDiff ? view.base : r?.unmerged ? argPage([], r.branch) : undefined });
}

export function openScopePage(view, page, cx) {
  view.scopePage = page; view.scopeSearch.set_value(""); view.scrollTop = { ...view.scrollTop, "scope-list": 0 };
  view.scopeAt = scopeList(view).findIndex(item => item.page === view.page);
  view.scopeSearch.focus();
  cx.notify();
}

/** Back to the first page, on the row that opened the one left. */
export function scopeBack(view, cx) {
  const from = view.scopePage;
  view.scopePage = null; view.scopeSearch.set_value("");
  view.scopeAt = scopeRows(view).findIndex(row => row.sub === from);
  view.handle.focus();
  cx.notify();
}

/** Opening the menu: the shown scope lit, and git read again. */
export function openScope(view, cx) {
  view.scopePage = null;
  view.scopeAt = scopeRows(view).findIndex(row => row.on);
  readScope(view, cx);
}

// As T3's scope trigger: an xs secondary button, its words truncating, a chevron at 70%.
function scopeButton(view, t, s) {
  return h_flex().id("review-scope").h(24).min_w(0).px(7).gap(4).items_center().rounded(8).text_size(12).font_medium().text_color(t.foreground)
    .bg(view.popup === "scope" ? t.selected : t.foreground + "08").hover(el => el.bg(hover(t)))
    .role("button").accessibility_label(`Diff scope: ${s.label}`)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); view.togglePopup("scope", cx); })
    .child(div().id("review-scope-label").min_w(0).truncate().child(s.label))
    .child(svg(`${LU}/chevron-down.svg`).size(14).flex_none().opacity(0.7));
}

/** The header's left end: the scope, a commit's sha and ‹ › within its diff, then `head → base` (narrow, `vs base`). */
export function scopeHeader(view, t) {
  const s = scopeOf(view), list = diffCommits(view), at = s.sha ? list.findIndex(c => c.sha === s.sha) : -1;
  // A commit opened as its own diff, or no longer listed (as after an amend), has nowhere to step.
  const steps = s.sha && view.page !== view.base && at >= 0;
  const go = (id, icon, label, c) => iconButton(t, id, icon, label, (cx) => showPage(view, `/commit/${c.sha}`, cx), { disabled: !c, size: 24 });
  return h_flex().id("review-scope-row").min_w(0).gap(12).items_center()
    .child(scopeButton(view, t, s))
    .when(Boolean(s.sha), el => el.child(h_flex().flex_none().gap(2).items_center()
      .child(div().id("review-sha").mr(4).font_family(MONO).text_size(12).text_color(t.dim).child(s.sha.slice(0, 7)))
      .when(steps, el => el
        .child(go("commit-older", `${LU}/chevron-left.svg`, "Older commit", list[at - 1]))
        .child(go("commit-newer", `${LU}/chevron-right.svg`, "Newer commit", list[at + 1])))))
    // As T3's refs, which drop the head below 20rem: here below COMPACT, where the header's buttons turn to icons.
    .when(Boolean(s.head && s.base), el => el.child(h_flex().id("review-refs").min_w(0).gap(8).items_center().overflow_hidden().text_size(12).text_color(t.dim)
      .when(view.width >= COMPACT, el => el
        .child(div().id("review-ref-head").min_w(0).max_w(192).truncate().child(s.head))
        .child(svg(`${LU}/arrow-right.svg`).size(14).flex_none().opacity(0.7)))
      .when(view.width < COMPACT, el => el.child(div().id("review-ref-vs").flex_none().child("vs")))
      .child(div().id("review-ref-base").min_w(0).truncate().child(s.base))));
}

/** The scope menu, as T3's: radios, a rule, Commits › and Branches ›, whose pages (back, search, list) open in the same popover. */
export function scopeMenu(view, t) {
  const page = view.scopePage, now = Date.now();
  const lit = (i) => (over, cx) => { if (over && view.scopeAt !== i) { view.scopeAt = i; cx.notify(); } };
  const frame = popover(view, t, "review-scope-menu").w(Math.min(page ? 384 : 320, view.width - 32)).p(4);
  if (!page) {
    const rows = scopeRows(view);
    // As T3's MenuRadioItem and MenuSubTrigger: 28 tall, 8 in, the mark's slot kept on every row so the words line up.
    const row = (r, i) => h_flex().id(r.id).h(MODEL_ROW).px(8).gap(8).flex_none().items_center().rounded(4)
      .when(Boolean(r.count), el => el.when(i === view.scopeAt, el => el.bg(t.selected)).on_hover(lit(i)))
      .when(!r.count, el => el.opacity(GREYED))
      .role(r.sub ? "button" : "radio_button").accessibility_label(`${r.label}${r.detail ? `, ${r.detail}` : ""}${r.on ? ", shown" : ""}`)
      .on_click((_e, cx) => pickScopeRow(view, r, cx))
      .child(pickMark(t, Boolean(r.on)))
      .child(div().flex_1().min_w(0).truncate().child(r.label))
      .when(Boolean(r.detail), el => el.child(div().id(`${r.id}-detail`).flex_none().ml(16).text_size(12).text_color(t.dim).child(r.detail)))
      .when(Boolean(r.sub), el => el.child(svg(`${LU}/chevron-right.svg`).size(16).mr(-2).flex_none().text_color(t.dim)));
    const radios = rows.filter(r => !r.sub).length;
    return frame
      .children(rows.slice(0, radios).map(row))
      // As T3's MenuSeparator.
      .child(div().h(1).my(4).mx(8).flex_none().bg(t.border))
      .children(rows.slice(radios).map((r, i) => row(r, radios + i)));
  }
  const items = scopeList(view), branches = page === "branches";
  const draw = (i) => {
    const item = items[i], on = item.page === view.page, tail = (id, text) => div().id(`${item.id}-${id}`).flex_none().text_size(12).text_color(t.dim).child(text);
    const el = h_flex().id(item.id).h(MODEL_ROW).px(8).gap(8).flex_none().items_center().rounded(4)
      .when(i === view.scopeAt, el => el.bg(t.selected)).on_hover(lit(i))
      .on_click((_e, cx) => pickListed(view, item, cx))
      .child(pickMark(t, on));
    if (branches) {
      const b = item.branch;
      return el.role("button").accessibility_label(`Review branch ${b.name}${b.count === undefined ? "" : `, ${b.count} ahead`}${on ? ", shown" : ""}`)
        .child(h_flex().flex_1().min_w(0).gap(8)
          .child(div().flex_none().max_w(160).truncate().child(b.name))
          .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(b.subject ?? "")))
        .when(b.count !== undefined, el => el.child(tail("detail", `${b.count} ahead`)))
        .when(Boolean(b.time), el => el.child(tail("time", ago(b.time, now))));
    }
    const c = item.commit, prefix = PREFIX.exec(c.subject)?.[0] ?? "", out = view.picks.unpushed.includes(c.sha);
    return el.role("button").accessibility_label(`Review commit ${c.subject}${on ? ", shown" : ""}${out ? ", not pushed" : ""}`)
      .child(h_flex().flex_1().min_w(0).gap(4)
        .when(Boolean(prefix), el => el.child(div().flex_none().text_color(t.dim).child(prefix.trim())))
        .child(div().flex_1().min_w(0).truncate().child(c.subject.slice(prefix.length))))
      .when(out, el => el.child(div().flex_none().text_size(12).text_color(t.ansi2).child("↑")))
      .when(Boolean(c.time), el => el.child(tail("time", ago(c.time, now))));
  };
  // As T3's commit submenu, at most 320 tall, its search and back row above the list.
  return frame
    .child(h_flex().id("scope-back").h(MODEL_ROW).px(8).gap(8).flex_none().items_center().rounded(4).hover(el => el.bg(t.selected))
      .role("button").accessibility_label("Back").on_click((_e, cx) => scopeBack(view, cx))
      .child(svg(`${LU}/chevron-left.svg`).size(16).mx(-2).flex_none().text_color(t.dim))
      .child(div().font_medium().child(branches ? "Branches" : "Commits"))
      .child(div().flex_1())
      .when(branches && Boolean(repo(view)?.base), el => el.child(div().flex_none().text_size(12).text_color(t.dim).child(`vs ${repo(view).base}`))))
    .child(searchField(t, view.scopeSearch).mx(8).mt(5).mb(5))
    .child(v_flex().flex_none()
      .child(scrollList(view, "scope-list", { count: items.length, row: MODEL_ROW, at: view.scopeAt, draw,
        height: Math.min(items.length * MODEL_ROW, Math.max(MODEL_ROW * 3, Math.min(320, view.height - 180))), wheeled: (keep) => { if (keep >= 0) view.scopeAt = keep; } }))
      .when(!items.length, el => el.child(div().id("scope-none").p(8).flex_none().text_center().text_color(t.dim).child(view.picks ? "No matches" : "Reading…"))));
}
