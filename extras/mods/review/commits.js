import { div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { setShared } from "herdr";
import { scrollList } from "./list.js";
import { PANE, LU, COMPACT, hover, MODEL_ROW, iconButton, pickMark, searchField, popover } from "./controls.js";

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

// The diff's commits, oldest first: on one commit's page, still its base's.
export function diffCommits(view) { return view.baseCommits ?? (view.switching ? null : view.review?.commits) ?? []; }

// The commit shown on its own within the diff; none for the whole diff, or for a commit opened as its own diff.
function shownCommit(view) { return view.page?.startsWith("/commit/") && view.page !== view.base ? view.page.slice("/commit/".length) : null; }

// Another page of this diff: a request as the Review bar's, handled with those in render. Its base keeps the commits, and
// it has no `analyze`. The list's search has the keyboard and is going, and an arrow's press stops short of the pane.
export function showPage(view, page, cx) {
  view.closePopup(cx);
  view.handle.focus();
  setShared(PANE, { tab: view.tab, root: view.root, page, base: view.base, n: Math.max(Date.now(), view.handled + 1) });
  cx.notify();
}

// The list's rows, newest first as a log's, under All changes until a search hides it.
export function commitRows(view) {
  const query = view.commitSearch.value().trim().toLowerCase();
  return [
    ...(query ? [] : [{ id: "commit-all", label: "Review all changes", page: view.base }]),
    ...[...view.diffCommits()].reverse().filter(c => c.sha.startsWith(query) || c.subject.toLowerCase().includes(query))
      .map(c => ({ id: `commit-${c.sha}`, label: `Review commit ${c.subject}`, page: `/commit/${c.sha}`, commit: c })),
  ];
}

// `‹ Commit 2 of 5 ›`, whose words open the list, only with somewhere else in this diff to go. Short of room its words give
// way first, then what's left of it: the header clips.
export function commitSwitch(view, t) {
  const list = view.diffCommits(), sha = shownCommit(view);
  if (!sha && list.length < 2) return null;
  // The whole diff sits before its oldest commit. A commit no longer listed, as after an amend, has no neighbours.
  const at = sha ? list.findIndex(c => c.sha === sha) : -1, gone = sha && at < 0;
  const go = (id, icon, label, c) => iconButton(t, id, icon, label, (cx) => showPage(view, `/commit/${c.sha}`, cx), { disabled: !c, size: 24 });
  const place = !sha ? "All changes" : gone ? sha.slice(0, 7) : view.width < COMPACT ? `${at + 1}/${list.length}` : `Commit ${at + 1} of ${list.length}`;
  return h_flex().id("review-commit-switch").min_w(0).flex_shrink_1().overflow_hidden().gap(2).items_center()
    .child(go("commit-older", "mods/review/icons/chevron-left.svg", "Older commit", at > 0 ? list[at - 1] : null))
    .child(h_flex().id("commit-pick").h(24).min_w(0).flex_shrink_1().px(8).gap(4).items_center().rounded(8).text_size(12).font_medium().text_color(t.foreground)
      .when(view.popup === "commits", el => el.bg(t.selected)).hover(s => s.bg(hover(t)))
      .role("button").accessibility_label(`Pick another commit of this review, ${place} shown`)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); view.togglePopup("commits", cx); })
      .child(div().id("commit-place").min_w(0).truncate().child(place))
      .child(svg(`${LU}/chevron-down.svg`).size(14).flex_none().text_color(t.dim)))
    .child(go("commit-newer", "mods/review/icons/chevron-right.svg", "Newer commit", gone ? null : list[at + 1]));
}

// The commits of this review and All changes, as the settings' model page: a search, ↑/↓ (`key`), Enter, Escape.
export function commitMenu(view, t) {
  const rows = view.commitRows(), now = Date.now(), all = rows[0]?.id === "commit-all" ? 1 : 0, count = rows.length - all;
  const row = (r, i) => {
    const c = r.commit, prefix = c ? PREFIX.exec(c.subject)?.[0] ?? "" : "", on = r.page === view.page;
    return h_flex().id(r.id).h(28).px(8).gap(8).flex_none().items_center().rounded(4)
      .when(i === view.commitAt, el => el.bg(t.selected)).on_hover((over, cx) => { if (over && view.commitAt !== i) { view.commitAt = i; cx.notify(); } })
      .role("button").accessibility_label(r.label + (on ? ", shown" : "")).on_click((_e, cx) => showPage(view, r.page, cx))
      .child(pickMark(t, on))
      .when(!c, el => el.child(div().flex_1().child("All changes")))
      .when(Boolean(c), el => el
        .child(h_flex().flex_1().min_w(0).gap(4)
          .when(Boolean(prefix), el => el.child(div().flex_none().text_color(t.dim).child(prefix.trim())))
          .child(div().flex_1().min_w(0).truncate().child(c.subject.slice(prefix.length))))
        .when(Boolean(c.date), el => el.child(div().flex_none().ml(4).text_size(12).text_color(t.dim).child(ago(new Date(c.date).getTime(), now)))));
  };
  // As T3's combobox over its commit list: 384 wide, at most 368 tall, of which the search takes 42 and the list's padding 8.
  return popover(view, t, "review-commit-menu").w(Math.min(384, view.width - 32))
    .child(searchField(t, view.commitSearch).mx(12).mt(9))
    .child(v_flex().p(4).flex_none()
      // Outside the list, so All changes stays put.
      .when(Boolean(all), el => el.child(row(rows[0], 0)))
      .child(scrollList(view, "commit-list", { count, row: MODEL_ROW, height: Math.min(count * MODEL_ROW, Math.max(MODEL_ROW * 3, Math.min(318 - all * MODEL_ROW, view.height - 140))), at: view.commitAt - all,
        draw: (i) => row(rows[i + all], i + all), wheeled: (keep) => { if (keep >= 0) view.commitAt = keep + all; } }))
      .when(!rows.length, el => el.child(div().p(8).flex_none().text_center().text_color(t.dim).child("No matches"))));
}
