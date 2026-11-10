// The layout's settings dialog, opened by t3-tabs (`t3-tabs.settings`). Herdr's own Settings copied (frame/settings/main.js):
// its sizes, type and theme colors as they are there, not T3's, so it reads as Herdr's. What it holds is t3.settings (docs/adr/0009).
import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, props, closeOverlay, run, shared, setShared, spaces, panes } from "herdr";
import { SETTINGS, t3Settings } from "./layout-settings.js";
import { stopsInit, stop, focusRoot } from "./focus.js";

const SECTIONS = [{ id: "home", title: "Home", icon: "mods/t3-chrome/icons/house.svg" }];
const ROWS = [
  { key: "afterAway", title: "After putting away", about: "Settling, snoozing or dragging away the agent in view.", options: [["home", "Home"], ["next", "Next card"]] },
  { key: "homeShows", title: "Home shows", about: "What an empty Home opens with.", options: [["page", "Page"], ["terminal", "Terminal"]] },
];

// Home has something other than this setting's lone default: t3-tabs leaves it be until it's emptied.
function homeWaits(shows) {
  const tabs = spaces().find((s) => s.id === shared("t3-home.space"))?.tabs.map((c) => c.id);
  if (!tabs) return false;
  const mine = panes().filter((p) => tabs.includes(p.tab));
  return !(mine.length === 1 && (shows === "page" ? mine[0].mod === "t3-home" : mine[0].terminal && !mine[0].mod));
}

export function initSettings(view, cx) {
  view.keys = cx.focus_handle();
  view.keys.focus();
  stopsInit(view, cx, "modal");
}

export function settingsView(view) {
  const t = theme(), now = t3Settings(), done = () => closeOverlay(props().overlay);
  const pick = (key, value) => {
    setShared(SETTINGS, { ...shared(SETTINGS), [key]: value });
    if (key === "homeShows") run("t3-tabs.home-shows");
  };
  // Herdr's row: what it is on the left, the control on the right.
  const row = (r) => {
    const about = r.key === "homeShows" && homeWaits(now.homeShows) ? "Home is in use: this applies once it's cleared." : r.about;
    return h_flex().w_full().gap(16).py(12).items_center().border_b(1).border_color(t.border)
      .child(v_flex().flex_1().min_w(0).gap(3)
        .child(div().text_size(14).text_color(t.foreground).child(r.title))
        .child(div().text_size(12.5).line_height("18px").text_color(t.dim).child(about)))
      // Herdr's appearance picker.
      .child(h_flex().flex_none().p(2).gap(2).rounded(8).border_1().border_color(t.border).bg(t.background)
        .children(r.options.map(([value, label]) => {
          const id = `st-${r.key}-${value}`, on = now[r.key] === value;
          return stop(view, t, id, div().id(id).px(12).py(4).rounded(6).text_size(13).cursor_pointer()
            .when(on, (el) => el.bg(t.raised).text_color(t.foreground).border_1().border_color(t.border))
            .when(!on, (el) => el.text_color(t.muted).hover((s) => s.text_color(t.foreground)))
            .role("radio_button").accessibility_label(`${r.title}: ${label}`)
            .on_click((_e, cx) => { if (!on) pick(r.key, value); cx.notify(); })
            .child(label), 6);
        })));
  };
  const nav = v_flex().flex_none().w(190).h_full().p(10).gap(2).border_r(1).border_color(t.border)
    .child(div().px(10).pt(6).pb(12).text_size(16).font_semibold().text_color(t.foreground).child("Herdr T3"))
    .children(SECTIONS.map((s) => h_flex().id(`st-s-${s.id}`).gap(10).px(10).py(7).items_center().rounded(7).bg(t.raised)
      .child(svg(s.icon).size(15).text_color(t.accent))
      .child(div().flex_1().text_size(13.5).text_color(t.foreground).child(s.title))));
  return focusRoot(view, h_flex().id("settings").track_focus(view.keys).w_full().h(620).min_h(0).items_start()
    .on_key_down((e, cx) => {
      if (e.key !== "escape") return;
      done();
      cx.stop_propagation();
    })
    .child(nav)
    .child(div().flex_1().min_w(0).h_full().px(28).py(22)
      .child(div().pt(6).pb(8).text_size(12).font_semibold().text_color(t.dim).child("HOME"))
      .children(ROWS.map(row))));
}
