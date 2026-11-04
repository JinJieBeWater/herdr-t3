import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, run, props, updates, layout, nextCommand } from "herdr";
import { tip } from "./tip.js";

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
    // Only the brand bar's copy takes `t3-chrome.sidebar`; the footer's has nothing to switch.
    if (props()?.footer) return;
    cx.spawn(async (cx) => {
      for (;;) {
        if (await nextCommand() === "sidebar") switchSidebar();
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
      const row = (id, icon, label, action) => h_flex().id(id).relative().h(30).px(8).gap(8).items_center().rounded(8)
        .role("button").accessibility_label(label)
        .text_color(lit(id, t.muted)).hover(s => s.bg(t.hover)).on_hover(glow(id))
        .on_click(action).child(h_flex().size(18).flex_none().items_center().justify_center()
          .child(svg(`mods/t3-chrome/${icon}.svg`).size(16)))
        .child(div().flex_1().min_w(0).truncate().child(label));
      return v_flex().size_full().bg(t.chrome).border_t(1).border_color(t.border).px(8).pt(4).pb(6).text_size(13)
        .child(h_flex().gap(2).items_center()
          // Each opens over its button, before the pointer can report leaving it.
          .child(row("settings", "settings", "Settings", (_e, cx) => { this.hot = null; run("app.settings"); cx.notify(); }).flex_1().min_w(0)
            .when(Boolean(updates().app.ready), el => el.child(div().size(6).rounded_full().bg(t.accent))))
          .child(tip(this.hot, t, "add-machine", "Add machine", div().id("add-machine").size(26).flex_none().flex().items_center().justify_center().rounded(6)
            .text_color(lit("add-machine")).hover(s => s.bg(t.hover)).on_hover(glow("add-machine"))
            .role("button").accessibility_label("Add machine")
            .on_click((_e, cx) => { this.hot = null; run("mod.open", { name: "machine-add" }); cx.notify(); })
            .child(svg("mods/workspace-chrome/server.svg").size(14)), { above: true })));
    }
    // Room for the macOS window buttons (layout traffic_lights), a place to drag the window, and the
    // sidebar toggle at its right edge; while the sidebar is hidden, t3-tabs shows it after the buttons.
    const inbox = inboxShown();
    return h_flex().id("brand").size_full().bg(t.chrome).pr(10).gap(2).items_center().justify_end()
      .child(tip(this.hot, t, "sidebar-mode", inbox ? "Show lists" : "Show inbox", div().id("sidebar-mode").size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .text_color(lit("sidebar-mode")).hover(s => s.bg(t.hover)).on_hover(glow("sidebar-mode"))
        .role("button").accessibility_label(inbox ? "Show lists" : "Show inbox")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click(switchSidebar)
        .child(svg(`mods/workspace-chrome/${inbox ? "layers" : "circle-check"}.svg`).size(14)), { action: "t3-chrome.sidebar" }))
      .child(tip(this.hot, t, "sidebar-toggle", "Hide sidebar", div().id("sidebar-toggle").size(26).flex_none().flex().items_center().justify_center().rounded(6)
        .text_color(lit("sidebar-toggle")).hover(s => s.bg(t.hover)).on_hover(glow("sidebar-toggle"))
        .role("button").accessibility_label("Hide sidebar")
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        // It goes with the sidebar, before the pointer can report leaving it.
        .on_click(() => { this.hot = null; run("layout.toggle", { id: "sidebar" }); })
        .child(svg("mods/workspace-chrome/sidebar.svg").size(14)), { action: "layout.toggle:sidebar" }));
  }
}
