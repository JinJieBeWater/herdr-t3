// The space panel's navigation column, one for the Files and Review pages (docs/adr/0013): right of the content, ruled off
// on its left, its left edge dragged, a 40 head over what it lists. As T3's FileExplorerPane: 256 to start, 160 at least,
// at most 560 and never leaving the content less than 256. Both pages share one width (`t3.navWidth`); each page keeps
// whether its column is open in its own localStorage (`nav.open`). scripts/sync.sh copies this to both mods.
import { div, svg } from "gpui-kit";
import { v_flex, h_flex, h_resizable, resizable_panel } from "gpui-base";
import { shared, setShared, settings } from "herdr";
import { KEY } from "./store.js";

export const NAV = 256, NAV_MIN = 160, NAV_MAX = 560, CONTENT_MIN = 256;

/** How wide the column may be in a page `body` wide: [least, most]. */
export const navRange = (body) => [NAV_MIN, Math.max(NAV_MIN, Math.min(NAV_MAX, body - CONTENT_MIN))];
/** The column's width in a page `body` wide: the shared one, kept within navRange. */
export function navWidth(body, kept = shared(KEY.navWidth)) {
  const [least, most] = navRange(body);
  return Math.min(most, Math.max(least, Number(kept) || NAV));
}

// Open until closed on this page.
export const navOpen = () => localStorage.getItem("nav.open") !== "false";
export const setNavOpen = (open) => localStorage.setItem("nav.open", String(open));

/**
 * The page's `content`, and right of it, while `open`, the column: `head` in its 40 head, `list` under it. `id` names it;
 * `body` is the page's width. The divider drags, and the width it lands at is the one both pages show.
 */
/** @param {any} t @param {string} id @param {number} body @param {{ content: any, head: any, list: any, open: boolean }} parts */
export function withNav(t, id, body, { content, head, list, open }) {
  if (!open) return div().id(`${id}-solo`).size_full().min_w(0).child(content);
  const width = navWidth(body), [least, most] = navRange(body), z = Number(settings()?.zoom) || 1;
  // A panel's sizes, set and reported, are the window's points, not zoomed as the rest of what a script sets.
  // Herdr keeps a group's sizes under its id, and grows them with the page: named by the width and the page's, the group
  // starts again at the width the other page set, and stays at it as the page widens.
  return h_resizable(`${id}-${Math.round(width)}-${Math.round(body)}`).size_full()
    .on_resize((sizes) => { const to = Math.round(sizes.at(-1) / z); if (to !== Math.round(width)) setShared(KEY.navWidth, to); })
    .child(resizable_panel().child(content))
    .child(resizable_panel().size(width * z).size_range(least * z, most * z)
      .child(v_flex().id(`${id}-nav`).size_full().min_w(0).border_l(1).border_color(t.border)
        .child(h_flex().id(`${id}-nav-head`).h(40).flex_none().px(8).gap(4).items_center().border_b(1).border_color(t.border).child(head))
        .child(div().flex_1().min_h(0).pt(4).child(list))));
}

/** T3's xs ghost icon button, as the toolbars and the column's head have them: 24, a 14 icon, `on` lit, greyed when `disabled`. */
/** @param {any} t @param {string} mod @param {string} id @param {string} icon @param {string} label @param {any} press @param {{ on?: boolean, disabled?: boolean }} [state] */
export function ghostButton(t, mod, id, icon, label, press, { on = false, disabled = false } = {}) {
  return div().id(id).size(24).flex_none().flex().items_center().justify_center().rounded(8)
    .role("button").accessibility_label(label)
    .when(disabled, (el) => el.opacity(0.3).text_color(t.muted))
    .when(!disabled, (el) => el.text_color(on ? t.foreground : t.muted).when(on, (el) => el.bg(t.foreground + "1f"))
      .hover((s) => s.bg(t.foreground + "12").text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); press(cx); }))
    .child(svg(`${mod}/icons/${icon}.svg`).size(14));
}

/** The toolbar's switch for the column, last at its right, on while open; greyed when `disabled`. */
/** @param {any} t @param {string} mod @param {string} id @param {boolean} open @param {any} toggle @param {boolean} [disabled] */
export function navToggle(t, mod, id, open, toggle, disabled = false) {
  return ghostButton(t, mod, id, "folder-tree", open ? "Hide the file tree" : "Show the file tree", toggle, { on: open, disabled });
}

/** The head's Collapse all / Expand all: `folded` says which it does now. */
/** @param {any} t @param {string} mod @param {string} id @param {boolean} folded @param {any} press */
export function foldAllButton(t, mod, id, folded, press) {
  return ghostButton(t, mod, id, folded ? "chevrons-up-down" : "chevrons-down-up", folded ? "Expand all" : "Collapse all", press);
}
