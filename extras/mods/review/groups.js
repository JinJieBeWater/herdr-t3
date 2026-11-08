import { div, svg, PathBuilder } from "gpui-kit";
import { v_flex, h_flex, TextView } from "gpui-base";
import { groupFiles } from "./rows.js";
import { hoverKept } from "./tip.js";
import { LU, FADED, zoom, hover, isLight, caretButton, diffStats } from "./controls.js";

// The app's category icons (Lucide here, for one icon set across the layout; the app's are Phosphor duotone, in its own shapes) and hues (Tailwind's 300 on dark, 800 on light), by category.
const CATEGORY = {
  ui: ["drafting-compass", "#f9a8d4", "#9d174d"], api: ["plug-zap", "#93c5fd", "#1e40af"], core: ["code", "#c4b5fd", "#5b21b6"],
  data: ["database", "#fcd34d", "#92400e"], cli: ["terminal", "#bef264", "#3f6212"], security: ["shield-check", "#fca5a5", "#991b1b"],
  tests: ["flask-conical", "#86efac", "#166534"], docs: ["book-open", "#7dd3fc", "#075985"], examples: ["circle-play", "#67e8f9", "#155e75"],
  deps: ["package", "#fdba74", "#9a3412"], build: ["hammer", "#fde047", "#854d0e"], scripts: ["wrench", "#6ee7b7", "#065f46"],
  config: ["sliders-horizontal", "#5eead4", "#115e59"], i18n: ["languages", "#a5b4fc", "#3730a3"], assets: ["image", "#f0abfc", "#86198f"],
  other: ["circle-ellipsis", "#d4d4d4", "#262626"],
};

// As CSS's saturate(0), which the app puts on a group's icon until it's shown or hovered: a hue's luminance, as grey.
const grey = (hex) => { const n = parseInt(hex.slice(1, 7), 16), y = Math.round(0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)); return `#${y.toString(16).padStart(2, "0").repeat(3)}`; };

/**
 * The sidebar, as the app's DiffGroupSidebar: each group a row of its category icon, label and critical mark over its counts,
 * its donut and, with subgroups, a caret that hides them; its subgroups under it, one step in. The files are the aside's.
 */
export function groupSidebar(view, t) {
  const visible = view.visibleGroups(), rows = [];
  const id = (g, depth) => `${depth}:${g.key}`;
  const open = (g, depth) => !view.folded.has(id(g, depth));
  const groupRow = (g, depth, top) => {
    const active = depth === 0 ? g.key === view.groupKey : top.key === view.groupKey && visible.has(g.key);
    const stats = groupStats(view, g), critical = g.critical || (g.children ?? []).some(c => c.critical), key = `side-g-${depth}-${g.key}`;
    // A subgroup shows itself in the list; a group shows itself and its subgroups.
    const pick = (cx) => {
      if (top.key !== view.groupKey) { view.groupKey = top.key; view.version++; }
      const index = depth ? view.items().findIndex(item => item.key === `g:${g.key}`) : 0;
      if (index >= 0) view.scrollToTop(index, cx);
      cx.notify();
    };
    // As T3's SidebarMenuButton at lg; a subgroup in by what its SidebarMenuSub comes to, 24 to the text.
    return hoverable(view, h_flex().id(key).h(48).flex_none().items_center().pr(10).gap(8).rounded(8), key)
      .when(depth > 0, el => el.ml(14))
      .when(active, el => el.bg(t.selected)).when(!active, el => el.hover(s => s.bg(hover(t))))
      .child(v_flex().id(`side-gb-${depth}-${g.key}`).flex_1().min_w(0).h_full().justify_center().items_start().pl(10).text_size(14).font_medium()
        .opacity(active ? 1 : FADED).hover(s => s.opacity(1))
        .role("button").accessibility_label(g.label).on_click((_e, cx) => pick(cx))
        .child(h_flex().w_full().gap(8).items_center()
          .child(categoryIcon(t, g.category, active || view.hovered === key))
          .child(div().min_w(0).truncate().child(g.label))
          .when(critical, el => el.child(criticalMark(t))))
        .child(h_flex().ml(24).gap(4).items_center().text_size(11)
          .child(diffStats(t, stats.added, stats.deleted))
          .child(div().opacity(0.4).child(`・${stats.count} ${stats.count === 1 ? "file" : "files"}`))))
      .when(stats.progress !== 0, el => el.child(donut(t, stats.progress)))
      // As the app's: only a group with subgroups has a caret, and it shows or hides them.
      .when(depth === 0 && g.children.length > 0, el => el.child(caretButton(t, `side-fold-${g.key}`)
        .role("button").accessibility_label(open(g, depth) ? "Hide subgroups" : "Show subgroups")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => { cx.stop_propagation(); const k = id(g, depth); view.folded.has(k) ? view.folded.delete(k) : view.folded.add(k); cx.notify(); })
        .child(svg(`${LU}/chevron-${open(g, depth) ? "down" : "right"}.svg`).size(14))));
  };
  for (const g of view.review.groups) {
    rows.push(groupRow(g, 0, g));
    if (open(g, 0)) for (const child of g.children) rows.push(groupRow(child, 1, g));
  }
  return v_flex().id("review-sidebar").size_full().border_r(1).border_color(t.border)
    .child(v_flex().id("review-sidebar-rows").flex_1().min_h(0).p(8).gap(4).overflow_y_scrollbar().children(rows));
}

// Hovering an element colors the category icon in it, as the app's `group-hover:saturate-100`: Herdr has no group hover.
function hoverable(view, el, key) { return hoverKept(view, "hovered", key, el); }

// A group's category icon in its hue (Tailwind's 300 on dark, 800 on light); unless `lit`, grey, as the app's `saturate-0`.
export function categoryIcon(t, category, lit) {
  const [icon, dark, light] = CATEGORY[category] ?? CATEGORY.other, hue = isLight(t.background) ? light : dark;
  return svg(`${LU}/${icon}.svg`).size(16).flex_none().text_color(lit ? hue : grey(hue));
}

export function criticalMark(t, size = 16) {
  return svg(`${LU}/badge-alert.svg`).size(size).flex_none().text_color(isLight(t.background) ? "#d97706" : "#fbbf24");
}

export function groupHeader(view, t, g) {
  return v_flex().id("group-header").flex_none().max_h(220).overflow_hidden().px(16).py(10).gap(6).border_b(1).border_color(t.border)
    .child(h_flex().gap(8).items_center()
      // As T3's Badge.
      .when(g.critical, el => el.child(div().h(18).px(3).flex_none().flex().items_center().rounded(4).bg(t.blocked + "26").text_size(12).font_medium().text_color(t.blocked).child("Needs care")))
      .child(div().text_size(14).font_semibold().child(g.label)))
    .when(Boolean(g.summary), el => el.child(TextView.markdown(`summary-${g.key}`, g.summary).selectable(true).scrollable(false).text_size(12).text_color(t.muted)))
    // Without the sidebar, as the app's chapter header: its subgroups to jump to, in one row as the tabs', unless its tab's
    // caret folded them. Scrolled away, they stick under the tabs instead.
    .when(!view.sidebarShown() && g.children.length > 0 && view.expandedTab === g.key, el => el.child(h_flex().id("group-sub-row").pt(1).gap(6).overflow_x_scroll()
      .children(g.children.map(child => groupTab(view, t, `group-sub-${child.key}`, { ...child, children: [] }, { pick: (cx) => showSubgroup(view, g, child, cx) })))));
}

// As the app's countGroupStats, countGroupFiles and groupProgress: a group's own files and its subgroups'.
export function groupStats(view, g) {
  const files = groupFiles(g).map(path => view.fileAt(path)).filter(Boolean);
  return {
    added: files.reduce((n, f) => n + f.additions, 0), deleted: files.reduce((n, f) => n + f.deletions, 0), count: files.length,
    progress: files.length ? files.filter(f => f.reviewed).length / files.length : 1,
  };
}

// As the app's DisplayDonut: a faint ring, and from the top, clockwise, an arc as far as `value`.
export function donut(t, value) {
  const size = 14, z = zoom(), c = size / 2 * z, r = (size / 2 - 2) * z, ring = (b) => b.move_to(c, c - r).arc_to(r, r, 0, false, true, c, c + r).arc_to(r, r, 0, false, true, c, c - r);
  const a = 2 * Math.PI * Math.min(value, 1), arc = value >= 1 ? ring(PathBuilder.stroke(2 * z))
    : PathBuilder.stroke(2 * z).move_to(c, c - r).arc_to(r, r, 0, value > 0.5, true, c + r * Math.sin(a), c - r * Math.cos(a));
  return div().size(size).flex_none().relative()
    .child(window.paint_path(ring(PathBuilder.stroke(2 * z)).build(), t.border).absolute().top(0).left(0).size_full())
    .when(value > 0, el => el.child(window.paint_path(arc.build(), t.foreground).absolute().top(0).left(0).size_full()));
}

/**
 * One group as the app's DiffGroupNavItem: a tab, bordered but for its foot, which is 2px and the category's hue when the
 * tab is the one shown (raised a pixel, on a shadow). Its category icon (grey until shown), label and critical mark over
 * its counts; its progress as a donut; with subgroups and a `toggle`, a caret that opens them.
 */
/** @param {any} view @param {any} t @param {string} id @param {any} g @param {{ active?: boolean, expanded?: boolean, toggle?: any, pick: any }} options */
function groupTab(view, t, id, g, { active = false, expanded = false, toggle, pick }) {
  const [, darkHue, lightHue] = CATEGORY[g.category] ?? CATEGORY.other, hue = isLight(t.background) ? lightHue : darkHue;
  const stats = groupStats(view, g), subgroups = g.children?.length ?? 0, critical = g.critical || (g.children ?? []).some(c => c.critical);
  return hoverable(view, v_flex().id(id), id).flex_none().rounded_t(6).border_t(1).border_l(1).border_r(1).border_color(t.border).bg(t.background)
    .when(active, el => el.relative().top(-1).shadow_sm())
    .child(h_flex().id(`${id}-button`).px(8).py(2).gap(8).items_center().text_size(14).font_medium().text_color(t.foreground)
      .opacity(active ? 1 : FADED).hover(s => s.opacity(1).bg(hover(t)))
      .role("tab").accessibility_label(g.label).on_click((_e, cx) => pick(cx))
      .child(v_flex().items_start()
        .child(h_flex().gap(8).items_center()
          .child(categoryIcon(t, g.category, active || view.hovered === id))
          .child(g.label)
          .when(critical, el => el.child(criticalMark(t))))
        .child(h_flex().items_center().text_size(11)
          .child(diffStats(t, stats.added, stats.deleted))
          .child(div().text_color(t.dim).child(`・${stats.count} ${stats.count === 1 ? "file" : "files"}`))
          .when(subgroups > 0, el => el.child(div().text_color(t.dim).child(`・${subgroups} ${subgroups === 1 ? "subgroup" : "subgroups"}`)))))
      .when(stats.progress !== 0, el => el.child(donut(t, stats.progress)))
      // Not the app's `mr--1`: a negative margin here has Herdr's layout squeeze the whole tab under its neighbour.
      .when(subgroups > 0 && Boolean(toggle), el => el.child(caretButton(t, `${id}-caret`)
        .role("button").accessibility_label(expanded ? "Hide subgroups" : "Show subgroups")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); toggle(cx); })
        .child(svg(`${LU}/chevron-${expanded ? "up" : "down"}.svg`).size(14)))))
    .child(div().h(2).w_full().bg(active ? hue : t.border));
}

// Shows a subgroup: its group first, if another is shown, then its header at the top.
function showSubgroup(view, parent, child, cx) {
  if (parent.key !== view.groupKey) { view.groupKey = parent.key; view.version++; }
  const index = view.items().findIndex(item => item.key === `g:${child.key}`);
  if (index >= 0) view.scrollToTop(index, cx);
  cx.notify();
}

/**
 * Narrower than WIDE, as the app's DiffGroupNav below `lg`: the groups as tabs over the diff, but one row that scrolls
 * sideways rather than wrapping, so they keep to one line. Picking one shows it and opens its subgroups in a row under
 * them ("subgroups of …"), as its caret does; for the group shown, only once its header has scrolled away.
 */
export function groupTabs(view, t) {
  // Not the group shown while its header, at the list's top, lists them: one place at a time, as a sticky header.
  const open = view.review.groups.find(g => g.key === view.expandedTab && g.children.length && !(g.key === view.groupKey && view.atTop()));
  // The shown tab is raised a pixel: each row's top pixel keeps it from the clip. Each row has the bar's inset in it, so a
  // tab scrolled aside is cut at the pane's edge, not 16px in.
  const row = (id) => h_flex().id(id).px(16).pt(1).gap(6).overflow_x_scroll();
  return v_flex().id("group-tabs").flex_none().pt(9).pb(8).gap(6).border_b(1).border_color(t.border)
    .child(row("group-tab-row").children(view.review.groups.map(g => groupTab(view, t, `group-tab-${g.key}`, g, {
      active: g.key === view.groupKey, expanded: view.expandedTab === g.key,
      toggle: (cx) => { view.expandedTab = view.expandedTab === g.key ? null : g.key; cx.notify(); },
      pick: (cx) => {
        if (g.key !== view.groupKey) { view.groupKey = g.key; view.version++; view.scrollToTop(0, cx); }
        view.expandedTab = g.key;
        cx.notify();
      },
    }))))
    .when(Boolean(open), el => el
      .child(h_flex().px(16).gap(4).items_center()
        .child(svg(`${LU}/folder-open.svg`).size(14).flex_none().opacity(FADED))
        .child(div().opacity(FADED).child("subgroups of"))
        .child(div().child(open.label))
        .child(div().flex_1().h(1).bg(t.border)))
      .child(row("group-subtab-row").children(open.children.map(child => groupTab(view, t, `group-subtab-${child.key}`, { ...child, children: [] }, {
        active: view.visibleGroups().has(child.key), pick: (cx) => showSubgroup(view, open, child, cx),
      })))));
}
