// New: pick the space (or a new one) and open a terminal tab there.
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex, InputState, Input } from "gpui-base";
import { theme, spaces, panes, run, closeOverlay, props, window, keys, home } from "herdr";
import { projectMark } from "./project.js";

function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

// Where a space is now, as t3-spaces says it.
function place(s, ps) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return ps.find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}
const NEW = { id: "new", name: "New space" };

export default class NewMenu extends View {
  init() {
    this.at = 0;
    this.filter = "";
    this.input = InputState.new({ placeholder: "Search spaces…" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; cx.notify(); });
    this.input.on("submit", () => { this.choose(this.items()[this.at]); });
    this.input.focus();
  }

  items() {
    const ps = panes(), cur = spaces().find(s => s.active), q = this.filter.toLowerCase();
    return [cur, ...spaces().filter(s => s.id !== cur?.id)].filter(Boolean)
      .filter(s => `${s.name} ${place(s, ps)}`.toLowerCase().includes(q));
  }

  choose(s) {
    if (!s) return;
    closeOverlay(props().overlay);
    if (s === NEW) run("space.new");
    else run("tab.new", { space: s.id });
  }

  row(id, i, icon, name, sub, hint, pick) {
    const t = theme(), on = this.at === i;
    return h_flex().id(id).h(sub ? 46 : 32).px(8).gap(8).rounded(6).items_center().flex_none()
      .role("button").accessibility_label(name)
      .when(on, el => el.bg(t.selected))
      .on_hover((over, cx) => { if (over && this.at !== i) { this.at = i; cx.notify(); } })
      .on_click(pick)
      .child(h_flex().size(16).flex_none().items_center().justify_center().child(icon))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_color(t.foreground).child(name))
        .when(Boolean(sub), el => el.child(div().truncate().text_size(11.5).text_color(t.dim).child(sub))))
      .child(div().flex_none().text_size(12).font_medium().text_color(t.muted).child(hint));
  }

  render() {
    const t = theme(), ps = panes(), h = home();
    const short = (p) => (p && h && p.startsWith(h) ? "~" + p.slice(h.length) : p ?? "");
    const items = this.items();
    const rows = items.map((s, i) => this.row(`space-${s.id}`, i,
      projectMark(s, 16, t, ps),
      s.name, [s.machine, short(place(s, ps))].filter(Boolean).join(" · "), i < 9 ? `⌘${i + 1}` : "", () => this.choose(s)));
    const key = (label) => div().flex_none().px(5).py(1).rounded(4).bg(t.foreground + "14").text_color(t.foreground).child(label);
    const hint = (label, what) => h_flex().gap(6).items_center().child(key(label)).child(what);
    const newKey = shortcut("space.new");
    return v_flex().id("new-menu").size_full().min_h(0).bg(t.popover).text_size(13)
      .on_key_down((e, cx) => {
        if (e.key === "escape") return closeOverlay(props().overlay);
        if (e.key === "down") this.at = (this.at + 1) % items.length;
        else if (e.key === "up") this.at = (this.at + items.length - 1) % items.length;
        else if (/^[1-9]$/.test(e.key) && e.modifiers.platform) { cx.stop_propagation(); return this.choose(items[Number(e.key) - 1]); }
        else return;
        cx.stop_propagation();
        cx.notify();
      })
      .child(h_flex().h(36).mt(6).flex_none().px(16).gap(8).items_center()
        .child(svg("mods/workspace-chrome/search.svg").size(16).flex_none().text_color(t.dim))
        .child(Input.new(this.input).flex_1().h_full().text_size(13).text_color(t.foreground)))
      .child(v_flex().id("new-spaces").flex_1().min_h(0).overflow_y_scroll().p(8)
        .child(div().px(8).py(6).flex_none().text_size(12).font_medium().text_color(t.muted).child("Spaces"))
        .children(rows)
        .when(rows.length === 0, el => el.child(div().px(8).py(6).text_color(t.dim).child("No matching spaces."))))
      .child(h_flex().flex_none().px(16).py(8).gap(12).items_center().justify_between().bg(t.foreground + "06").text_size(12).font_medium().text_color(t.muted)
        .child(h_flex().gap(12).items_center()
          .child(hint("↑ ↓", "Navigate"))
          .child(hint("Enter", "New tab"))
          .child(hint("Esc", "Close")))
        .child(h_flex().id("space-new").gap(6).px(6).py(2).mr(-6).rounded(6).items_center().flex_none()
          .role("button").accessibility_label("New space").hover(s => s.bg(t.selected))
          .on_click(() => this.choose(NEW))
          .child(svg("mods/workspace-chrome/folder-plus.svg").size(14).text_color(t.muted))
          .child("New space")
          .when(Boolean(newKey), el => el.child(key(newKey)))));
  }
}
