import { div, svg, image } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { fileRows } from "./rows.js";
import { LU, CAT, MONO, HOVER, ACTIVE, FADED, pref, isLight, checkMark, diffStats } from "./controls.js";
import { groupStats, categoryIcon, criticalMark, donut } from "./groups.js";

// As the app's FileStatus: a letter in its status's color (success, error, warning, blue at 500).
const FILE_STATUS = { added: ["A", "#22c55e"], removed: ["D", "#ef4444"], modified: ["M", "#f59e0b"], renamed: ["R", "#3b82f6"], copied: ["C", "#3b82f6"] };
// As @antfu/design's file and folder icons (catppuccin, in cat/): the first matching rule wins, else the plain file.
const FILE_ICONS = [[/\.vue$/, "vue"], [/\.tsx$/, "typescript-react"], [/\.jsx$/, "javascript-react"], [/\.d\.[cm]?ts$/, "typescript-def"],
  [/\.[cm]?ts$/, "typescript"], [/\.[cm]?js$/, "javascript"], [/\.json5?$/, "json"], [/\.ya?ml$/, "yaml"], [/\.toml$/, "toml"], [/\.md$/, "markdown"],
  [/\.html?$/, "html"], [/\.(?:css|postcss)$/, "css"], [/\.s[ac]ss$/, "sass"], [/\.svg$/, "svg"], [/\.(?:png|jpe?g|gif|webp|avif|ico)$/, "image"],
  [/\.(?:woff2?|ttf|otf|eot)$/, "font"], [/package\.json$/, "npm"], [/\.(?:test|spec)\.[cm]?[jt]sx?$/, "typescript-test"]];
const fileIcon = (path) => FILE_ICONS.find(([match]) => match.test(path))?.[1] ?? "file";
const FOLDER_ICONS = { src: "folder-src", dist: "folder-dist", node_modules: "folder-node", test: "folder-tests", tests: "folder-tests", public: "folder-public",
  components: "folder-components", utils: "folder-utils", config: "folder-config", assets: "folder-images", scripts: "folder-scripts", styles: "folder-styles", lib: "folder-lib" };
// A chain of folders (`packages/cli/src`) is named by its last. Always closed, as the app's FileTree draws them.
const folderIcon = (name) => FOLDER_ICONS[name.split("/").pop().toLowerCase()] ?? "folder";

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
    .child(v_flex().id("review-files").flex_1().min_h(0).overflow_y_scrollbar().children(fileTree(view, t, g)));
}

// As T3's ChangedFilesTree, 8 in and 14 a level: a folder's box, icon and name; a file's box, its icon and path in the code
// font (the folder dimmed, listed), test and critical marks, counts and status; a file in view on the active tone.
function fileTree(view, t, g) {
  const byPath = new Map(view.review.files.map(f => [f.path, f])), inView = view.visibleFiles(), light = isLight(t.background);
  const checkbox = (id, state, label, toggle) => checkMark(t, state).id(id).role("check_box").accessibility_label(label)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); toggle(cx); });
  // As the app's DisplayFilePath: its icon faded, the folder dimmed only listed. Herdr can't truncate mixed colors as one
  // text, so the folder gives way before the name.
  const path = (row, struck) => {
    const parts = row.name.split("/"), name = parts.pop();
    return h_flex().flex_1().min_w(0).items_center().font_family(MONO)
      .child(image(`${CAT}/${fileIcon(row.path)}.svg`).w(14).h(14).mr(8).flex_none().opacity(FADED))
      .when(parts.length > 0, el => el.child(div().min_w(0).flex_shrink(100).truncate().when(struck, el => el.line_through()).when(pref("fileList") === "list", el => el.opacity(0.4)).child(`${parts.join("/")}/`)))
      .child(div().min_w(0).flex_shrink_1().truncate().when(struck, el => el.line_through()).child(name));
  };
  return fileRows(g.files, g.missing, pref("fileList")).map(row => {
    const base = h_flex().h(28).flex_none().pl(8 + row.depth * 14).pr(8).gap(8).items_center().rounded(6).text_size(12);
    if (row.type === "folder") {
      const files = row.paths.map(path => byPath.get(path)).filter(Boolean), done = files.filter(f => f.reviewed).length;
      const state = !done ? "none" : done === files.length ? "all" : "some";
      return base.id(`tree-d-${row.key}`)
        .child(checkbox(`tree-dcheck-${row.key}`, state, `${row.name}: ${done} of ${files.length} reviewed`, (cx) => view.setReviewed(files, state !== "all", cx)))
        .child(image(`${CAT}/${folderIcon(row.name)}.svg`).w(14).h(14).flex_none().opacity(FADED))
        .child(div().min_w(0).truncate().font_family(MONO).text_size(11).opacity(FADED).child(row.name));
    }
    if (row.type === "missing")
      return base.id(`tree-m-${row.key}`).opacity(0.5)
        .child(div().w(16).flex_none())
        .child(path(row, true))
        .child(div().flex_none().text_size(10).child("removed"));
    const f = byPath.get(row.path);
    if (!f) return null;
    const state = f.changed ? "changed" : f.reviewed ? "all" : "none";
    const critical = [g, ...g.children].some(x => (x.notes[f.path] ?? []).some(note => note.critical));
    return base.id(`tree-f-${row.path}`)
      .when(inView.has(row.path), el => el.bg(ACTIVE))
      .when(!inView.has(row.path) && f.test, el => el.bg(t.ansi2 + "14"))
      // A file's row shows it: the app gives it no hover, but every other thing to press here has one.
      .when(!inView.has(row.path), el => el.hover(s => s.bg(HOVER)))
      .on_click((_e, cx) => view.select(row.path, cx))
      .child(checkbox(`tree-check-${row.path}`, state, f.reviewed ? `${row.path}: reviewed` : `${row.path}: not reviewed`, (cx) => view.setReviewed(f, !f.reviewed, cx)))
      .child(path(row, false))
      .when(f.test, el => el.child(svg(`${LU}/flask-conical.svg`).size(14).flex_none().text_color(light ? "#15803d" : "#4ade80")))
      .when(critical, el => el.child(criticalMark(t, 14)))
      .child(div().flex_none().text_size(10).child(diffStats(t, f.additions, f.deletions)))
      .child(fileStatus(f.status));
  }).filter(Boolean);
}

// As the app's FileStatus: the letter in its status's color, on a tenth of it. Measured as T3's sm Badge.
export function fileStatus(status) {
  const [letter, color] = FILE_STATUS[status] ?? FILE_STATUS.modified;
  return div().h(16).min_w(16).px(3).flex_none().flex().items_center().justify_center().rounded(4).font_family(MONO).font_medium().text_size(10).text_color(color).bg(color + "1a").child(letter);
}
