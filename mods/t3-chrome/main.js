import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, updates, layout, nextCommand, shared, spaces } from "herdr";
import { tip } from "./tip.js";
import { stopsInit, stop, focusRoot } from "./focus.js";

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar shows either Lists (Spaces and Agents) or the Inbox (t3-inbox): a stack in the layout.
const inboxShown = () => find(layout(), "sidebar-lists")?.active === "inbox";
const switchSidebar = () => run("layout.select", { stack: "sidebar-lists", child: inboxShown() ? "lists" : "inbox" });
export default class WorkspaceChrome extends View {
  init(_props, cx) {
    stopsInit(this, cx);
    // Only the brand bar's copy takes `t3-chrome.sidebar`; the footer's would do it twice.
    if (props()?.footer) return;
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "sidebar") switchSidebar();
        cx.notify();
      }
    });
  }

  render() {
    const t = theme();
    // A button's icon and text brighten together: a hover style reaches the text but not the svg, so it's state, as in the inbox.
    const glow = (id) => (on, cx) => {
      if (on) this.hot = id;
      else if (this.hot === id) this.hot = null;
      cx.notify();
    };
    const lit = (id, color = t.dim) => (this.hot === id ? t.foreground : color);
    if (props()?.footer) {
      // As T3's footer: a row of 32px icon buttons, and at its end, once Herdr has downloaded an update, its restart.
      const ready = updates().app.ready;
      // T3's undo notice, the inbox's (t3-inbox.notice), in this row's free space so it covers nothing: "Settled," or
      // "Settled 2," then Undo, which the inbox does. It fades in and out over 200ms, Undo inert while it goes. One older than
      // its 5s and the fade is left from before a restart.
      // Only with the Inbox showing: its Undo reaches the Inbox only then, as cmd-shift-s does.
      const n = inboxShown() && shared("t3-inbox.notice");
      // Short of room the summary is cut, never Undo: GPUI's flex doesn't do T3's two wraps, which squeezed Undo to nothing.
      const notice = n && Date.now() - n.at < 6000 && h_flex().id(`undo-notice-${n.gen}`).flex_1().min_w(0).h(24).justify_end().gap(4).items_center()
        .text_size(11).text_color(t.dim).opacity(n.shown ? 1 : 0).transition("opacity", { duration: 200, easing: "ease-out" })
        .child(div().min_w(0).truncate().child(`${n.action}${n.count === 1 ? "" : ` ${n.count}`},`))
        // As T3's InlineButton: medium, foreground, underlined on hover.
        .child(h_flex().id("undo-notice-undo").flex_none().h(24).items_center().font_medium().text_color(t.foreground)
          .when(n.live, (el) => el.hover((s) => s.underline()).role("button").accessibility_label(`Undo: ${n.action} ${n.count} agent${n.count === 1 ? "" : "s"}`)
            .on_click(() => run("t3-inbox.undo")))
          .child("Undo")
          .when(n.live, (el) => stop(this, t, "undo-notice-undo", el, 4)));
      const button = (id, glyph, label, action, key) => tip(this, t, id, label, stop(this, t, id, div().id(id).size(32).flex_none().flex().items_center().justify_center().rounded(8)
        .text_color(lit(id)).hover(s => s.bg(t.hover)).on_hover(glow(id))
        .role("button").accessibility_label(label)
        // Each opens over its button, before the pointer can report leaving it.
        .on_click((_e, cx) => { this.hot = null; action(); cx.notify(); })
        .child(glyph), 8), { action: key });
      return focusRoot(this, h_flex().size_full().bg(t.chrome).px(8).gap(2).items_center()
        .child(button("settings", svg("mods/t3-chrome/settings.svg").size(16), "Settings", () => run("app.settings"), "app.settings"))
        .child(button("add-machine", svg("mods/t3-inbox/server.svg").size(16), "Add machine", () => run("mod.open", { name: "machine-add" })))
        .child(notice || div().flex_1())
        .when(Boolean(ready), el => el.child(tip(this, t, "app-update", `Update ${ready} downloaded. Click to restart`, stop(this, t, "app-update", div().id("app-update").h(24).px(10).flex_none().flex().items_center()
          .rounded_full().bg(t.accent + "26").text_size(12).font_medium().text_color(t.accent).hover(s => s.bg(t.accent + "40")).on_hover(glow("app-update"))
          .role("button").accessibility_label(`Restart into Herdr ${ready}`)
          .on_click(() => run("app.update")).child("Update"), 12)))));
    }
    // Room for the macOS window buttons (layout traffic_lights), a place to drag the window, and the
    // sidebar toggle at its right edge; while the sidebar is hidden, t3-tabs shows it after the buttons.
    const inbox = inboxShown();
    // Lit while there: with no tabs showing, it says where this is.
    const atHome = spaces().some((s) => s.active && s.id === shared("t3-home.space"));
    return focusRoot(this, h_flex().id("brand").size_full().bg(t.chrome).pr(10).gap(2).items_center().justify_end()
      .child(tip(this, t, "home", "Home", stop(this, t, "home", div().id("home").size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .text_color(atHome ? t.foreground : lit("home")).hover(s => s.bg(t.hover)).on_hover(glow("home"))
        .when(atHome, (el) => el.bg(t.selected))
        .role("button").accessibility_label("Home")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(() => run("t3-tabs.home"))
        .child(svg("mods/t3-chrome/house.svg").size(14))), { action: "t3-tabs.home", below: true }))
      .child(tip(this, t, "sidebar-mode", inbox ? "Show lists" : "Show inbox", stop(this, t, "sidebar-mode", div().id("sidebar-mode").size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .text_color(lit("sidebar-mode")).hover(s => s.bg(t.hover)).on_hover(glow("sidebar-mode"))
        .role("button").accessibility_label(inbox ? "Show lists" : "Show inbox")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(switchSidebar)
        // The mode a click shows, as its label says: a tray for the Inbox, rows with their marks for the lists. Not circle-check or layers: those are Settle and Grouped by space.
        .child(svg(`mods/t3-chrome/${inbox ? "layout-list" : "inbox"}.svg`).size(14))), { action: "t3-chrome.sidebar", below: true }))
      .child(tip(this, t, "sidebar-toggle", "Hide sidebar", stop(this, t, "sidebar-toggle", div().id("sidebar-toggle").size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .text_color(lit("sidebar-toggle")).hover(s => s.bg(t.hover)).on_hover(glow("sidebar-toggle"))
        .role("button").accessibility_label("Hide sidebar")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        // It goes with the sidebar, before the pointer can report leaving it.
        .on_click(() => { this.hot = null; run("layout.toggle", { id: "sidebar" }); })
        .child(svg("mods/t3-chrome/panel-left.svg").size(14))), { action: "layout.toggle:sidebar", below: true })));
  }
}
