import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Input } from "gpui-base";
import { settings, setShared, shared } from "herdr";
import { subPlace } from "./submenu.js";

export const PANE = "review";

// Preferences every review pane shares: a pane's localStorage is its own, so a new pane would start from the defaults.
const PREFS = `${PANE}.prefs`;
export const pref = (key) => shared(PREFS)?.[key];
export const setPref = (key, value) => setShared(PREFS, { ...shared(PREFS), [key]: value });
// The code's font, the window's terminal font: only the diff's code and hunk headers are in it.
export const mono = () => /** @type {string} */ (settings().font_family);

// Herdr scales what a script sets by its zoom, but reports sizes and positions scaled already: they come back divided by it,
// and a path, painted unscaled, goes out multiplied by it.
export const zoom = () => Number(settings()?.zoom) || 1;
// A light theme takes the darker hues, as the app's `dark:` variants switch them.
export const isLight = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5; };

// The layout's tones: a hover is Home's 6% tint of `foreground` (a theme's `hover` can be the pane's own color), translucent so a
// hovered button reads over a hovered row; what's selected, open or in view, and a popup list's highlighted row, take `selected`.
export const hover = (t) => t.foreground + "0f";
// @antfu/design's opacities: op-fade for what waits for a hover, op-disabled; and its segment track and raised pill.
export const FADED = 0.65, DISABLED = 0.3;

export const MODEL_ROW = 28; // T3's select and combobox rows, with no gap between them

// Responsive widths, the app's: split from SPLIT_MIN of diff (its MIN_SPLIT_WIDTH_PX; narrower, unified, the choice kept).
// Under COMPACT the header's text buttons are icons.
export const SPLIT_MIN = 640, COMPACT = 640;

// Lucide's icons, the layout's one set; the catppuccin file icons in icons/cat/ are file-icons.js's.
export const LU = `mods/${PANE}/icons`;

// A list's pick mark, as T3's MenuRadioItemIndicator, its slot kept so the rows line up.
export function pickMark(t, on) { return div().w(14).flex_none().text_color(t.accent).when(on, el => el.child(svg("mods/review/icons/check.svg").size(14))); }

// As T3's ComboboxSearchInput and MenuSearchInput, past the insets, which differ: a 26 field, 6 to the rule, its text 20 from the icon's start.
export function searchField(t, state) {
  return h_flex().h(33).pb(6).gap(4).flex_none().items_center().border_b_1().border_color(t.border)
    .child(svg(`${LU}/search.svg`).size(16).flex_none().text_color(t.dim))
    .child(Input.new(state).flex_1().h_full().text_size(14).text_color(t.foreground));
}

// A popup's frame. It floats over the diff, and Herdr hands a press or a wheel to what's under it too: they stop here.
// A press outside closes it, unless it lands in the popup's open submenu (`closes` false: the submenu's own frame).
export function popover(view, t, id, closes = true) {
  return v_flex().id(id).rounded(8).bg(t.popover).border_1().border_color(t.border).text_size(14).shadow_lg()
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_scroll_wheel((_e, cx) => cx.stop_propagation())
    .when(closes, el => el.on_mouse_down_out((e, cx) => { if (!inSub(view, e)) view.closePopup(cx, true); }));
}

// A pointer event's position and bounds in the pane, in its own units: Herdr reports them in the window's, zoomed. The
// pane's origin is noted as the pointer moves over it (main.js).
export function toPane(view, e) {
  const z = zoom(), o = view.paneAt ?? { x: 0, y: 0 }, b = e.bounds;
  return { position: { x: (e.position.x - o.x) / z, y: (e.position.y - o.y) / z },
    bounds: b && { x: (b.x - o.x) / z, y: (b.y - o.y) / z, width: b.width / z, height: b.height / z } };
}

function inSub(view, e) {
  const r = view.subRect, p = r && toPane(view, e).position;
  return Boolean(r) && p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

// The open popup's submenu's hover state, for submenu.js's hoverRow.
export const subState = (view) => (view.subHover ??= {});

// Where a submenu `h` tall goes beside `row` (in the pane), on the side subPlace picks for it `max` wide: as wide as
// that side has room for, 8 short of the pane's edge, down to `min`; narrower still, `min` wide and kept 8 inside the
// pane, over the menu. Noted for the safe triangle and for a press in it. The element to hold it, and its width.
export function subAt(view, row, [min, max], h) {
  const side = subPlace(row, max, 0, view.width).side, room = side === "right" ? view.width - 8 - (row.x + row.width) : row.x - 8;
  const w = Math.min(max, Math.max(min, room), view.width - 16), p = subPlace(row, w, 0, view.width);
  const x = Math.max(8, Math.min(p.x, view.width - w - 8)), y = Math.max(8, Math.min(p.y, view.height - h - 8));
  view.subRect = { x, y, width: w, height: h };
  Object.assign(subState(view), { sub: view.subRect, side: p.side });
  return { at: div().id("review-sub-at").absolute().left(x).top(y), w };
}

// The reviewed box, drawn as the app's ReviewCheckbox: checked, partly (a folder), or not. Handlers are the caller's.
// State "all", "some", "none", or "changed" (reviewed, then changed: the app's orange half mark).
export function checkMark(t, state) {
  const fill = state === "changed" ? "#f97316" : state === "none" ? null : t.accent;
  // Unchecked, as T3's Checkbox (border-input, dark:bg-input/32): `raised` would vanish on a `selected` row.
  return div().size(16).flex_none().rounded(4).border_1().border_color(fill ?? t.input).bg(fill ?? t.input + "52")
    .flex().items_center().justify_center().text_color(state === "changed" ? "#ffffff" : t.accent_foreground)
    .when(state === "all", el => el.child(svg("mods/review/icons/check.svg").size(12)))
    .when(state === "some" || state === "changed", el => el.child(svg("mods/review/icons/minus.svg").size(12)));
}

// The pane's buttons, text or icon, share one 24px height so a toolbar's controls line up.
// As T3's xs ghost button (docs/adr/0013): no border, the hover's tone behind it; `primary` filled as the layout's, in `solid`
// (a popup's own action, never the toolbar's); `note` dim words after the label.
export function button(t, id, label, action, { color, icon, after, primary, note } = /** @type {{ color?: any, icon?: any, after?: any, primary?: boolean, note?: any }} */ ({})) {
  // As T3's xs button: 8 in.
  return h_flex().id(id).h(24).px(8).gap(4).flex_none().items_center().rounded(8).text_size(12).font_medium()
    .when(!primary, el => el.text_color(color ?? t.foreground).hover(s => s.bg(hover(t))))
    .when(Boolean(primary), el => el.border_color(t.solid).bg(t.solid).text_color(t.solid_foreground).hover(s => s.opacity(0.9)))
    .role("button").on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); action(cx); })
    .when(Boolean(icon), el => el.child(svg(icon).size(14).flex_none()))
    .child(label)
    .when(Boolean(note), el => el.child(div().opacity(FADED).child(note)))
    .when(Boolean(after), el => el.child(svg(after).size(14).flex_none()));
}

// As T3's icon-xs ghost button, as nav-column.js's ghostButton: `muted` until hovered; `active` (its popup open) on `selected`.
export function iconButton(t, id, icon, label, action, { color, disabled, active, size = 24, press } = /** @type {{ color?: any, disabled?: any, active?: any, size?: number, press?: any }} */ ({})) {
  return div().id(id).size(size).flex_none().flex().items_center().justify_center().rounded(8).text_color(color ?? (active ? t.foreground : t.muted))
    .when(Boolean(disabled), el => el.opacity(DISABLED))
    .when(!disabled, el => el.when(Boolean(active), el => el.bg(t.selected)).hover(s => s.bg(hover(t)).text_color(color ?? t.foreground)))
    .role("button").accessibility_label(label)
    .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); press?.(e); }).on_click((_e, cx) => { cx.stop_propagation(); if (!disabled) action(cx); })
    .child(svg(icon).size(14));
}

// As the app's DiffStats, each only when there are any, measured as T3's DiffStatLabel.
export function diffStats(t, added, deleted) {
  return h_flex().flex_none().gap(4)
    .when(added > 0, el => el.child(div().text_color(t.ansi2).child(`+${added.toLocaleString()}`)))
    .when(deleted > 0, el => el.child(div().text_color(t.ansi1).child(`-${deleted.toLocaleString()}`)));
}
