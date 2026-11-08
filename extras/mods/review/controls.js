import { div, svg } from "gpui-kit";
import { v_flex, h_flex, Input } from "gpui-base";
import { settings, setShared, shared } from "herdr";

export const PANE = "review";

// Preferences every review pane shares: a pane's localStorage is its own, so a new pane would start from the defaults.
const PREFS = `${PANE}.prefs`;
export const pref = (key) => shared(PREFS)?.[key];
export const setPref = (key, value) => setShared(PREFS, { ...shared(PREFS), [key]: value });
export const MONO = "JetBrains Mono";

// Herdr scales what a script sets by its zoom, but reports sizes and positions scaled already: they come back divided by it,
// and a path, painted unscaled, goes out multiplied by it.
export const zoom = () => Number(settings()?.zoom) || 1;
// A light theme takes the darker hues, as the app's `dark:` variants switch them.
export const isLight = (hex) => { const n = parseInt(String(hex).slice(1, 7), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.5; };

// The app's hover and active tones (bg-hover, bg-active): translucent grey, so a hovered button reads over a hovered row.
// Every hover in the pane takes HOVER; what's selected, open or in view takes ACTIVE.
export const HOVER = "#99999915", ACTIVE = "#99999920";
// @antfu/design's opacities: op-fade for what waits for a hover, op-disabled; and its segment track and raised pill.
export const FADED = 0.65, DISABLED = 0.3;

export const MODEL_ROW = 28; // T3's select and combobox rows, with no gap between them

// Responsive widths, the app's: the sidebar from WIDE (its `lg`; narrower, the groups are tabs over the diff), split from
// SPLIT_MIN of diff (its MIN_SPLIT_WIDTH_PX; narrower, unified, the choice kept). Under COMPACT the header's text buttons are icons.
export const WIDE = 1024, SPLIT_MIN = 640, COMPACT = 640;

// Lucide's icons (lucide/), the layout's one set, and the catppuccin file icons (cat/), as the app draws them.
export const LU = `mods/${PANE}/icons`, CAT = `mods/${PANE}/icons/cat`;

// A list's pick mark, as T3's MenuRadioItemIndicator, its slot kept so the rows line up.
export function pickMark(t, on) { return div().w(14).flex_none().text_color(t.accent).when(on, el => el.child(svg("mods/review/icons/check.svg").size(14))); }

// As T3's ComboboxSearchInput and MenuSearchInput, past the insets, which differ: a 26 field, 6 to the rule, its text 20 from the icon's start.
export function searchField(t, state) {
  return h_flex().h(33).pb(6).gap(4).flex_none().items_center().border_b_1().border_color(t.border)
    .child(svg(`${LU}/search.svg`).size(16).flex_none().text_color(t.dim))
    .child(Input.new(state).flex_1().h_full().text_size(14).text_color(t.foreground));
}

// A popup's frame. It floats over the diff, and Herdr hands a press or a wheel to what's under it too: they stop here.
// A press outside closes it.
export function popover(view, t, id) {
  return v_flex().id(id).rounded(8).bg(t.popover).border_1().border_color(t.border).text_size(14).shadow_lg()
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_scroll_wheel((_e, cx) => cx.stop_propagation())
    .on_mouse_down_out((_e, cx) => view.closePopup(cx, true));
}

// The reviewed box, drawn as the app's ReviewCheckbox: checked, partly (a folder), or not. Handlers are the caller's.
// State "all", "some", "none", or "changed" (reviewed, then changed: the app's orange half mark).
export function checkMark(t, state) {
  const fill = state === "changed" ? "#f97316" : state === "none" ? null : t.accent;
  return div().size(16).flex_none().rounded(4).border_1().border_color(fill ?? t.border).bg(fill ?? t.raised)
    .flex().items_center().justify_center().text_color("#ffffff")
    .when(state === "all", el => el.child(svg("mods/review/icons/check.svg").size(12)))
    .when(state === "some" || state === "changed", el => el.child(svg("mods/review/icons/minus.svg").size(12)));
}

// The pane's buttons, text or icon, share one 24px height so a toolbar's controls line up.
// As the app's ActionButton: bordered, faded until hovered (`btn-action`); `primary` filled; `note` dim words after the label.
export function button(t, id, label, action, { color, icon, after, primary, note } = /** @type {{ color?: any, icon?: any, after?: any, primary?: boolean, note?: any }} */ ({})) {
  // As T3's xs button: 7 in past its border.
  return h_flex().id(id).h(24).px(7).gap(4).flex_none().items_center().rounded(8).text_size(12).font_medium().border_1()
    .when(!primary, el => el.border_color(t.border).text_color(color ?? t.foreground).opacity(0.75).hover(s => s.opacity(1).bg(HOVER)))
    .when(Boolean(primary), el => el.border_color(t.accent).bg(t.accent).text_color("#ffffff").hover(s => s.opacity(0.9)))
    .role("button").on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); action(cx); })
    .when(Boolean(icon), el => el.child(svg(icon).size(14).flex_none()))
    .child(label)
    .when(Boolean(note), el => el.child(div().opacity(FADED).child(note)))
    .when(Boolean(after), el => el.child(svg(after).size(14).flex_none()));
}

// As T3's icon-sm in DiffPanel's header (`size` 24: its icon-xs, beside an xs button), faded until hovered as the app's
// ActionIconButton; `active` (its popup open) on the active tone.
export function iconButton(t, id, icon, label, action, { color, disabled, active, size = 28 } = /** @type {{ color?: any, disabled?: any, active?: any, size?: number }} */ ({})) {
  return div().id(id).size(size).flex_none().flex().items_center().justify_center().rounded(8).text_color(color ?? t.foreground)
    .when(Boolean(disabled), el => el.opacity(DISABLED))
    .when(!disabled, el => el.opacity(active ? 1 : FADED).when(Boolean(active), el => el.bg(ACTIVE)).hover(s => s.opacity(1).bg(HOVER)))
    .role("button").accessibility_label(label)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation()).on_click((_e, cx) => { cx.stop_propagation(); if (!disabled) action(cx); })
    .child(svg(icon).size(14));
}

// As T3's icon-xs, faded until hovered as the app's ActionIconButton, then on the app's translucent hover tone, which
// stacks over a hovered row's. Handlers and icon are the caller's.
export function caretButton(id) {
  return div().id(id).size(24).flex_none().flex().items_center().justify_center().rounded(8)
    .opacity(FADED).hover(s => s.opacity(1).bg(HOVER));
}

// As the app's DiffStats, each only when there are any, measured as T3's DiffStatLabel.
export function diffStats(t, added, deleted) {
  return h_flex().flex_none().gap(4).font_family(MONO)
    .when(added > 0, el => el.child(div().text_color(t.ansi2).child(`+${added.toLocaleString()}`)))
    .when(deleted > 0, el => el.child(div().text_color(t.ansi1).child(`-${deleted.toLocaleString()}`)));
}
