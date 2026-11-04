import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, agents, terminals, run, openOverlay, theme, window, layout, settings, props, setShared } from "herdr";
import { modStatus, namer, programOf } from "./name.js";
import { ownStatus, subAgents, treeStatus } from "./tree.js";
import { tip, tipMark } from "./tip.js";

// With the inbox showing (t3-inbox), an agent settled there isn't news: its done is left out.
// One that works or gets stuck is unsettled there, so only done needs leaving out.
function awake() {
  if (find(layout(), "sidebar-lists")?.active !== "inbox") return agents();
  const put = new Set(terminals().filter((k) => k.labels?.settled).map((k) => k.address));
  return agents().filter((a) => !put.has(a.address));
}

// "Needs you", drawn as the agents list and pane headers draw it.
const blockedMark = (t) => div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(11).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
const mark = (t, s) => s === "working" ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)
  : s === "blocked" ? blockedMark(t)
  : div().size(7).flex_none().rounded_full().bg(t.done);

const WORDS = { working: "Working", blocked: "Needs you", done: "Done" };
const TAB_GAP = 4;

// A button's icon and text brighten together: a hover style reaches the text but not the svg, so it's state, as in the inbox.
const glow = (view, id) => (on, cx) => {
  if (on) view.hot = id;
  else if (view.hot === id) view.hot = null;
  cx.notify();
};
const lit = (view, id, color = theme().dim) => (view.hot === id ? theme().foreground : color);

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.over = null;
    this.strip = 0;
    this.tabW = {};
  }

  // Where the tab strip sits: the active tab in view with the least move, as T3's scrollIntoView({ inline: "nearest" }).
  // Herdr's scroll areas can't be moved from a script, so the strip is a clipped row this offsets itself.
  // Only when the active tab or the room changes: a swipe to another tab isn't pulled back.
  stripAt(shown) {
    const room = this.room ?? 0, width = (c) => this.tabW[c.id] ?? 0, i = shown.findIndex(c => c.active);
    const key = `${shown[i]?.id}:${i}:${room}`;
    if (shown[i]?.id !== this.activeId) { this.wasActive = this.activeId; this.activeId = shown[i]?.id; }
    if (i >= 0 && room > 0 && key !== this.revealed && shown.every(width)) {
      this.revealed = key;
      const left = shown.slice(0, i).reduce((sum, c) => sum + width(c) + TAB_GAP, 0), right = left + width(shown[i]);
      if (left < this.strip) this.strip = left;
      // Wider than the room, its start shows: that's where its icon and the name begin.
      else if (right > this.strip + room) this.strip = Math.min(left, right - room);
    }
    const all = shown.reduce((sum, c) => sum + width(c) + TAB_GAP, -TAB_GAP);
    this.strip = Math.max(0, Math.min(this.strip, all - room));
    return this.strip;
  }

  // With the sidebar hidden, its toggle also says how the agents are doing, with the sidebar's own marks.
  // Idle agents aren't counted: nothing to look at.
  sidebarToggle(t, stop, live, st) {
    const counts = ["blocked", "working", "done"].map(s => [s, live.filter(a => st(a) === s).length]).filter(([, n]) => n > 0);
    const words = { blocked: "needing you", working: "working", done: "done" };
    const summary = counts.map(([s, n]) => `${n} ${words[s]}`).join(" · ");
    return tip(this.hot, t, "sidebar-toggle", "Show sidebar", h_flex().id("sidebar-toggle").h(26).px(6).gap(8).flex_none().items_center().rounded(6)
      .text_size(12).text_color(lit(this, "sidebar-toggle")).hover(s => s.bg(t.hover)).on_hover(glow(this, "sidebar-toggle"))
      .role("button").accessibility_label(summary ? `Show sidebar, ${summary}` : "Show sidebar")
      // It goes when the sidebar shows, before the pointer can report leaving it.
      .on_mouse_down("left", stop).on_click(() => { this.hot = null; run("layout.toggle", { id: "sidebar" }); })
      .child(svg("mods/workspace-chrome/sidebar.svg").size(14).flex_none())
      .children(counts.map(([s, n]) => h_flex().id(`agents-${s}`).gap(4).items_center().child(mark(t, s)).child(div().text_color(t.muted).child(String(n))))), { action: "layout.toggle:sidebar" });
  }

  // With props.block, sizes that block to `size`: layout.resize, which Herdr keeps with the layout's clicks.
  // on_size_change reports zoomed pixels; a layout's are logical.
  fit(size) {
    const id = props()?.block, px = Math.ceil(size.width / (Number(settings()?.zoom) || 1));
    if (!id || px === this.fitted) return;
    this.fitted = px;
    run("layout.resize", { id, px });
  }

  // Another layout's bar shouldn't stay compact because this one was narrow when it went.
  async close() {
    if (props()?.part === "measure") setShared("bar.compact", false);
  }

  render() {
    // The work column's width, in a strip the bar's controls can't change: measured in the bar, their collapsing would undo itself.
    // on_size_change reports zoomed pixels. Past T3's 768 for the same controls: here they share the row with the tabs.
    if (props()?.part === "measure") return div().id("bar-measure").size_full()
      .on_size_change((size) => setShared("bar.compact", size.width / (Number(settings()?.zoom) || 1) < 1024));
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const live = awake();
    // Each agent with its sub-agents (tree.js).
    const every = agents(), all = terminals(), under = subAgents(every, all);
    const st = (a) => treeStatus(ownStatus(a.status, a.address, all), under(a.address));
    const ps = panes(), title = namer();
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, glyph, label, action, key) => tip(this.hot, t, id, label, div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(lit(this, id)).hover(s => s.bg(t.hover)).on_hover(glow(this, id))
      .role("button").accessibility_label(label)
      .on_mouse_down("left", stop).on_click(action).child(glyph), { action: key });
    const item = (c, i) => {
      // A tab nobody named reads as its lead pane: the agent in it, else the focused one.
      const mine = ps.filter(p => p.tab === c.id);
      const lead = mine.find(p => p.status != null) ?? mine.find(p => p.focused) ?? mine[0];
      const program = lead && programOf(lead);
      const name = c.named ? c.name : lead ? title(lead) : "Terminal";
      // The tab's most urgent agent, ranked as the app ranks tabs; a done one only while it's still news.
      const modWords = mine.filter(p => p.mod).map(p => modStatus(p));
      const words = [...every.filter(a => a.tab === c.id).map(st), ...modWords];
      const status = words.includes("blocked") ? "blocked"
        : modWords.includes("done") || live.some(a => a.tab === c.id && st(a) === "done") ? "done"
        : words.includes("working") ? "working" : null;
      // As T3's panel tabs: 24px, 12px words, 144px at most; the active one, past T3, 240px, to read more of its name without a hover. The icon's slot is the close button: hovering the tab turns it to ×.
      const over = this.overTab === c.id;
      const glyph = !program?.icon ? svg("mods/workspace-chrome/terminal.svg").size(12).text_color(t.muted)
        : program.tint ? svg(program.icon).size(12).text_color(t.muted) : image(program.icon).size(12);
      const tab = h_flex().id(`tab-${c.id}`).relative().h(24).max_w(c.active ? 240 : 144).pl(6).pr(8).gap(2).rounded(6).items_center().flex_none().text_size(12)
        .bg(c.active ? t.selected : t.chrome).text_color(c.active || over ? t.foreground : t.muted)
        .role("button").accessibility_label(name)
        // A tab changes width as it's picked or left, a frame after the strip moved for it: place the strip again.
        .on_size_change((size, cx) => {
          this.tabW[c.id] = size.width / settings().zoom;
          if (c.active || c.id === this.wasActive) this.revealed = null;
          cx.notify();
        })
        .on_hover((on, cx) => {
          if (on) this.overTab = c.id;
          else if (this.overTab === c.id) this.overTab = null;
          cx.notify();
        })
        .when(!c.active, el => el.hover(s => s.bg(t.hover)))
        // Dragged as a space is: the source fades, a line shows where it lands.
        .when(this.pressed === i && this.over !== i, el => el.opacity(0.5))
        .when(this.pressed !== null && this.over === i && this.pressed !== i, el => el.child(
          div().absolute().top(0).bottom(0).w(2).bg(t.accent)
            .when(this.pressed < i, line => line.right(0))
            .when(this.pressed > i, line => line.left(0)),
        ))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = this.over = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_move((_e, cx) => {
          if (this.pressed === null || this.over === i) return;
          this.over = i;
          cx.notify();
        })
        .on_mouse_up("left", (_e, cx) => {
          const from = this.pressed; this.pressed = this.over = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
          cx.notify();
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .child(div().id(`close-${c.id}`).size(16).flex_none().flex().items_center().justify_center().rounded(4).hover(s => s.bg(t.raised))
          .role("button").accessibility_label(`Close ${name}`)
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); })
          .child(over ? svg("mods/pane/close.svg").size(12).text_color(t.foreground) : glyph))
        .child(div().min_w(0).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(status != null, el => el.child(div().pl(2).flex_none().child(tipMark(this, t, `mark-${c.id}`, WORDS[status], mark(t, status)))));
      // Its whole name on hover, as T3's: a tab is cut short. On the tab, as a card's wrapper won't shrink for a name to truncate.
      return tip(over && this.pressed === null ? `tab-${c.id}` : null, t, `tab-${c.id}`, name, tab);
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // The bar's end, a block of its own after the controls other mods put in the bar (Actions, Review): + keeps its spot
    // however wide they are, and the window's own buttons stay last.
    if (props()?.part === "end") return h_flex().size_full().items_center().justify_end().bg(t.chrome)
      .child(h_flex().id("tabs-end").flex_none().pr(8).gap(4).items_center().on_size_change((size) => this.fit(size))
        .child(button("tab-new", svg("mods/workspace-chrome/plus.svg").size(14), "New tab", () => run("tab.new"), "tab.new"))
        .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/t3-tabs/win-min.svg").size(16) : "−", "Minimize", () => run("window.minimize")))
          .child(button("maximize", w.platform === "windows" ? svg(`mods/t3-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", w.maximized ? "Restore" : "Maximize", () => run("window.maximize")))
          .child(button("close-window", w.platform === "windows" ? svg("mods/t3-tabs/win-close.svg").size(16) : svg("mods/pane/close.svg").size(13), "Close window", () => run("window.close")))));
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(8, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 8;
    return h_flex().size_full().min_w(0).pl(lightsPadding).pr(4).gap(4).items_center().bg(t.chrome)
      .on_mouse_up("left", (_e, cx) => { this.pressed = this.over = null; cx.notify(); })
      // Herdr reports no release outside the bar, so leaving ends a drag, as in the inbox.
      .on_hover((on, cx) => {
        if (on || this.pressed === null) return;
        this.pressed = this.over = null;
        cx.notify();
      })
      .on_scroll_wheel((e, cx) => {
        if (Math.abs(e.delta.x) > Math.abs(e.delta.y)) { this.strip -= e.delta.x / settings().zoom; cx.notify(); }
        else if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next");
      })
      .when(Boolean(sidebar?.hidden), el => el.child(this.sidebarToggle(t, stop, live, st)))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().overflow_hidden()
        .on_size_change((size, cx) => { this.room = size.width / settings().zoom; cx.notify(); })
        .child(h_flex().id("tab-strip").flex_none().h_full().items_center().gap(TAB_GAP).ml(-this.stripAt(shown)).children(shown.map(item))));
  }
}
