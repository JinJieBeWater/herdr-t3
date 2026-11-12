import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { fileRows } from "./rows.js";
import { scrollList } from "./list.js";
import { PANE, LU, MONO, FADED, hover, pref, isLight, checkMark, diffStats } from "./controls.js";
import { fileIcon, folderIcon } from "./file-icons.js";
import { groupStats, categoryIcon, criticalMark, donut } from "./groups.js";

// As the app's FileStatus: a letter in its status's color (success, error, warning, blue at 500).
const FILE_STATUS = { added: ["A", "#22c55e"], removed: ["D", "#ef4444"], modified: ["M", "#f59e0b"], renamed: ["R", "#3b82f6"], copied: ["C", "#3b82f6"] };
// File and folder icons are the Files page's (file-icons.js, catppuccin). Folders always closed, as the app's FileTree draws them.

/**
 * As the app's group aside at `lg`, beside the diffs: for a subgroup or a group without subgroups, its header (a subgroup's
 * parent to go back to, its icon, label and critical mark over its counts and donut) and summary; then its own files.
 */
export function aside(view, t) {
  const top = view.group(), g = view.asideGroup();
  if (!g) return div().id("review-aside");
  const parent = g === top ? null : top, stats = groupStats(view, g);
  return v_flex().id("review-aside").size_full().min_h(0).p(12).gap(12)
    .when(Boolean(parent) || !top.children.length, el => el.child(v_flex().id("aside-header").flex_none().w_full()
      .when(Boolean(parent), el => el.child(div().id("aside-parent").pb(4).pl(8).text_size(11).truncate().opacity(FADED).hover(s => s.opacity(1))
        .role("button").on_click((_e, cx) => { view.scrollToTop(0, cx); cx.notify(); }).child(`${parent?.label} ›`)))
      .child(v_flex().px(8).py(4).gap(4)
        .child(h_flex().gap(8).items_center()
          .child(categoryIcon(t, g.category, true))
          .child(div().flex_1().min_w(0).truncate().text_size(14).font_medium().child(g.label))
          .when(Boolean(g.critical), el => el.child(criticalMark(t))))
        .child(h_flex().gap(8).items_center().text_size(11)
          .child(diffStats(t, stats.added, stats.deleted))
          .child(div().opacity(FADED).child(`${stats.count} ${stats.count === 1 ? "file" : "files"}`))
          .child(donut(t, stats.progress))))
      .when(Boolean(g.summary), el => el.child(div().pb(8).pl(8).border_b(1).border_color(t.border).opacity(FADED)
        .child(TextView.markdown(`aside-summary-${g.key}`, g.summary).selectable(true).scrollable(false).text_size(12))))))
    .child(fileTree(view, t, g).flex_1().min_h(0));
}

// As T3's ChangedFilesTree, 8 in and 14 a level: a folder's box, icon and name; a file's box, its icon and path in the code
// font (the folder dimmed, listed), test and critical marks, counts and status; a file in view on `selected`, a test on a green
// tint. Rows next to each other on the same tone read as one block, rounded only at its ends.
// Only the rows in view are drawn: a group runs to a thousand files, and every render would build them all.
function fileTree(view, t, g) {
  const inView = view.visibleFiles(), light = isLight(t.background);
  const checkbox = (id, state, label, toggle) => checkMark(t, state).id(id).role("check_box").accessibility_label(label)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); toggle(cx); });
  // As the app's DisplayFilePath: its icon faded, the folder dimmed only listed. Herdr can't truncate mixed colors as one
  // text, so the folder gives way before the name.
  const path = (row, struck) => {
    const parts = row.name.split("/"), name = parts.pop();
    return h_flex().flex_1().min_w(0).items_center().font_family(MONO)
      .child(image(`mods/${PANE}/${fileIcon(row.path)}`).w(14).h(14).mr(8).flex_none().opacity(FADED))
      .when(parts.length > 0, el => el.child(div().min_w(0).flex_shrink(100).truncate().when(struck, el => el.line_through()).when(pref("fileList") === "list", el => el.opacity(0.4)).child(`${parts.join("/")}/`)))
      .child(div().min_w(0).flex_shrink_1().truncate().when(struck, el => el.line_through()).child(name));
  };
  // Made again only for another group, read or layout.
  const layout = pref("fileList");
  if (view.treeOf?.g !== g || view.treeOf.layout !== layout) {
    // Another group's files, or another list's (applyReview drops the tree), start at their top.
    if (view.treeOf?.g.key !== g.key) view.scrollTop = { ...view.scrollTop, "review-files": 0 };
    view.treeOf = { g, layout, rows: fileRows(g.files, g.missing, layout) };
  }
  const rows = view.treeOf.rows;
  const tone = (row) => row?.type !== "file" ? null : inView.has(row.path) ? t.selected : view.fileAt(row.path)?.test ? t.ansi2 + "14" : null;
  const draw = (i) => {
    const row = rows[i], base = h_flex().h(28).flex_none().pl(8 + row.depth * 14).pr(8).gap(8).items_center().rounded(6).text_size(12);
    if (row.type === "folder") {
      const files = row.paths.map(path => view.fileAt(path)).filter(Boolean), done = files.filter(f => f.reviewed).length;
      const state = !done ? "none" : done === files.length ? "all" : "some";
      return base.id(`tree-d-${row.key}`)
        .child(checkbox(`tree-dcheck-${row.key}`, state, `${row.name}: ${done} of ${files.length} reviewed`, (cx) => view.setReviewed(files, state !== "all", cx)))
        .child(image(`mods/${PANE}/${folderIcon(row.name)}`).w(14).h(14).flex_none().opacity(FADED))
        .child(div().min_w(0).truncate().font_family(MONO).text_size(11).opacity(FADED).child(row.name));
    }
    if (row.type === "missing")
      return base.id(`tree-m-${row.key}`).opacity(0.5)
        .child(div().w(16).flex_none())
        .child(path(row, true))
        .child(div().flex_none().text_size(10).child("removed"));
    const f = view.fileAt(row.path);
    if (!f) return base.id(`tree-f-${row.path}`);
    const state = f.changed ? "changed" : f.reviewed ? "all" : "none";
    const critical = [g, ...g.children].some(x => (x.notes[f.path] ?? []).some(note => note.critical));
    const bg = tone(row);
    return base.id(`tree-f-${row.path}`)
      .when(Boolean(bg), el => el.bg(bg).rounded(0).when(tone(rows[i - 1]) !== bg, el => el.rounded_t(6)).when(tone(rows[i + 1]) !== bg, el => el.rounded_b(6)))
      // A file's row shows it: the app gives it no hover, but every other thing to press here has one.
      .when(!inView.has(row.path), el => el.hover(s => s.bg(hover(t))))
      .on_click((_e, cx) => view.select(row.path, cx))
      .child(checkbox(`tree-check-${row.path}`, state, f.reviewed ? `${row.path}: reviewed` : `${row.path}: not reviewed`, (cx) => view.setReviewed(f, !f.reviewed, cx)))
      .child(path(row, false))
      .when(f.test, el => el.child(svg(`${LU}/flask-conical.svg`).size(14).flex_none().text_color(light ? "#15803d" : "#4ade80")))
      .when(critical, el => el.child(criticalMark(t, 14)))
      .child(div().flex_none().text_size(10).child(diffStats(t, f.additions, f.deletions)))
      .child(fileStatus(f.status));
  };
  return scrollList(view, "review-files", { count: rows.length, row: 28, draw, wheeled: () => {} });
}

// As the app's FileStatus: the letter in its status's color, on a tenth of it. Measured as T3's sm Badge.
export function fileStatus(status) {
  const [letter, color] = FILE_STATUS[status] ?? FILE_STATUS.modified;
  return div().h(16).min_w(16).px(3).flex_none().flex().items_center().justify_center().rounded(4).font_family(MONO).font_medium().text_size(10).text_color(color).bg(color + "1a").child(letter);
}
