import { View, div, svg, image } from "gpui-kit";
import { h_flex, Popup } from "gpui-base";
import { spaces, panes, agents, terminals, run, openOverlay, closeOverlay, focused, hc, theme, window, layout, settings, props, setShared, nextCommand } from "herdr";
import { modStatus, namer, programOf } from "./name.js";
import { ownStatus, subAgents, treeStatus } from "./tree.js";
import { tip } from "./tip.js";
import { detailsFor } from "./details.js";
import { stopsInit, stop, focusRoot, within } from "./focus.js";

// With the inbox showing (t3-inbox), an agent settled there isn't news: its done is left out.
// One that works or gets stuck is unsettled there, so only done needs leaving out. A snoozed one, until it
// wakes, isn't news either, working or done; while it or what's under it needs the person it shows there, so it
// counts here too.
function awake(st) {
  if (find(layout(), "sidebar-lists")?.active !== "inbox") return agents();
  const now = Date.now(), labels = new Map(terminals().map((k) => [k.address, k.labels]));
  return agents().filter((a) => {
    const l = labels.get(a.address);
    return !l?.settled && (!(Number(l?.snoozed) > now) || st(a) === "blocked");
  });
}

// "Needs you", drawn as the agents list and pane headers draw it.
const blockedMark = (t) => div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(11).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
const mark = (t, s) => s === "working" ? svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)
  : s === "blocked" ? blockedMark(t)
  : div().size(7).flex_none().rounded_full().bg(t.done);

const WORDS = { working: "Working", blocked: "Needs you", done: "Done" };
const TAB_GAP = 4;
// A tab's name gives way to T3's 144px at most, the active one's to 240px; past that the strip scrolls.
// Unlike T3's, a tab is 96px at least: a short name (`Pi`) left one too small to aim at.
const TAB_FLOOR = 144, TAB_ACTIVE = 240, TAB_MIN = 96;
// A tab around its name: padding, the icon's slot, the gaps and the slot its status mark and × share.
const TAB_CHROME = 47;

// The widest a tab may be for `wants` to fill `room`: the shorter keep all they want, the longest share what's left.
function fairCap(wants, room) {
  const sorted = [...wants].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const share = room / (sorted.length - i);
    if (sorted[i] > share) return share;
    room -= sorted[i];
  }
  return Infinity;
}

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

// A tab nobody named reads as its lead pane: the agent in it, else the focused one.
const leadOf = (mine) => mine.find(p => p.status != null) ?? mine.find(p => p.focused) ?? mine[0];
const nameOf = (c, lead) => c.named ? c.name : lead ? namer()(lead) : "Terminal";

// A pane is empty when its own shell holds the foreground. No answer counts as busy: better to ask.
// shortcut: a shell's background jobs read as empty, upgrade if Herdr ever reports them.
const SHELL = /^-?(zsh|bash|fish|sh|dash|ksh|tcsh|nu)$/;
async function atPrompt(terminal) {
  try {
    const k = JSON.parse((await hc(["get", terminal, "--json"])).stdout);
    return k.foreground?.pid === k.pid && SHELL.test(k.foreground.name);
  } catch { return false; }
}

// The confirm dialog's title doesn't wrap: a long name is cut to what fits, a wide (CJK) character counting twice.
// shortcut: counts characters rather than measuring them, upgrade if a name of wide Latin letters still clips.
function fit(name, room = 26) {
  let used = 0, out = "";
  for (const ch of name) {
    used += ch.codePointAt(0) > 0x2e7f ? 2 : 1;
    if (used > room) return out.trimEnd() + "…";
    out += ch;
  }
  return out;
}

export default class Tabs extends View {
  init(_props, cx) {
    this.pressed = null;
    this.over = null;
    this.strip = 0;
    this.nameW = {};
    if (props()?.part !== "measure") stopsInit(this, cx);
    // Only the tab strip's copy answers every person's way to close: the layout's other parts would each open a dialog.
    if (!props()?.part) cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        // One at a time: a second press finds the first's pane gone.
        if (command === "close-tab") await this.closeTab(focused()?.tab, cx);
        else if (command === "close-pane") await this.closePane(focused()?.pane, cx);
        else if (command.startsWith("close-tab:")) await this.closeTab(command.slice("close-tab:".length), cx);
        else if (command.startsWith("close-pane:")) await this.closePane(command.slice("close-pane:".length), cx);
      }
    });
  }

  // As T3's confirmTerminalClose: `Close terminal "Pi"?` or `Close 2 terminals?`, then what that ends. A held cmd-w replaces the dialog rather than stacking it.
  ask(names, more, command, args, cx) {
    // The dialog hides the pointer's leaving, and the × stops the press that would close the card.
    this.overTab = this.hot = null;
    detailsFor(this, null, cx);
    cx.notify();
    if (this.asking) closeOverlay(this.asking);
    const [title, detail] = names.length === 1
      ? [`Close terminal "${fit(names[0])}"?`, "This stops the running process and clears its history."]
      : [`Close ${names.length} terminals?`, `This stops their running processes and clears their histories: ${names.map(n => `"${n}"`).join(", ")}.`];
    this.asking = openOverlay({ mod: "confirm", kind: "dialog", width: 400, height: 170, props: { title, detail: detail + more, command: { name: command, args } } });
  }

  // Ending a program asks first; empty panes have none to lose, and Herdr still asks if it's the space's last tab.
  async closeTab(id, cx) {
    const space = spaces().find(s => s.tabs.some(c => c.id === id));
    if (!space) return;
    const c = space.tabs.find(c => c.id === id), mine = panes().filter(p => p.tab === id);
    const live = mine.filter(p => p.terminal), empty = await Promise.all(live.map(p => atPrompt(p.terminal)));
    // A lone pane goes by its tab's name, as the tab shows it.
    const names = live.filter((_, k) => !empty[k]).map(p => mine.length === 1 ? nameOf(c, p) : namer()(p));
    if (names.length === 0) return run("tab.close", { id });
    this.ask(names, space.tabs.length === 1 ? " It's the space's last tab, so the space closes too." : "", "tab.close", { id, confirmed: true }, cx);
  }

  async closePane(pane, cx) {
    const ps = panes(), p = ps.find(p => p.pane === pane);
    if (!p) return;
    const tabs = spaces().find(s => s.tabs.some(c => c.id === p.tab))?.tabs.map(c => c.id) ?? [];
    // A space's last pane closes the space, and Herdr asks that itself.
    if (!p.terminal || ps.filter(q => tabs.includes(q.tab)).length === 1 || await atPrompt(p.terminal)) return run("pane.close", { pane });
    this.ask([namer()(p)], "", "pane.close", { pane }, cx);
  }

  // Each tab's width: its whole name while the room allows, else the longest names give way first.
  tabWidths(shown, want) {
    const room = (this.room ?? 0) - TAB_GAP * (shown.length - 1), active = shown.find(c => c.active);
    let cap = fairCap(shown.map(want), room), held = active && want(active);
    if (active && held > cap) {
      held = Math.min(held, Math.max(cap, TAB_ACTIVE));
      cap = fairCap(shown.filter(c => c !== active).map(want), room - held);
    }
    return new Map(shown.map(c => [c.id, c === active ? held : Math.min(want(c), Math.max(cap, TAB_FLOOR))]));
  }

  // Where the tab strip sits: the active tab in view with the least move, as T3's scrollIntoView({ inline: "nearest" }).
  // Herdr's scroll areas can't be moved from a script, so the strip is a clipped row this offsets itself.
  // Only when the active tab or the room changes: a swipe to another tab isn't pulled back.
  stripAt(shown, widths) {
    // The tab the keyboard's on, else the active one: a stop off the strip's end can't be seen.
    const walked = shown.findIndex(c => within(this, [`tab-${c.id}`, `close-${c.id}`]));
    const room = this.room ?? 0, i = walked >= 0 ? walked : shown.findIndex(c => c.active), width = (c) => widths.get(c.id);
    const key = `${shown[i]?.id}:${i}:${room}:${i >= 0 ? width(shown[i]) : 0}`;
    if (i >= 0 && room > 0 && key !== this.revealed && shown.every(c => this.nameW[c.id])) {
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
  sidebarToggle(t, stopPress, live, st) {
    const counts = ["blocked", "working", "done"].map(s => [s, live.filter(a => st(a) === s).length]).filter(([, n]) => n > 0);
    const words = { blocked: "needing you", working: "working", done: "done" };
    const summary = counts.map(([s, n]) => `${n} ${words[s]}`).join(" · ");
    return tip(this.hot, t, "sidebar-toggle", "Show sidebar", stop(this, t, "sidebar-toggle", h_flex().id("sidebar-toggle").h(24).px(6).gap(8).flex_none().items_center().rounded(6)
      .text_size(12).text_color(lit(this, "sidebar-toggle")).hover(s => s.bg(t.hover)).on_hover(glow(this, "sidebar-toggle"))
      .role("button").accessibility_label(summary ? `Show sidebar, ${summary}` : "Show sidebar")
      // It goes when the sidebar shows, before the pointer can report leaving it.
      .on_mouse_down("left", stopPress).on_click(() => { this.hot = null; run("layout.toggle", { id: "sidebar" }); })
      .child(svg("mods/t3-tabs/panel-left.svg").size(14).flex_none())
      .children(counts.map(([s, n]) => h_flex().id(`agents-${s}`).gap(4).items_center().child(mark(t, s)).child(div().text_color(t.muted).child(String(n)))))), { action: "layout.toggle:sidebar", below: true });
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
    // A tab that goes under the pointer reports no leaving, and a lit × would keep every tab's card away.
    if (this.hot?.startsWith("close-") && !shown.some(c => this.hot === `close-${c.id}`)) this.hot = null;
    // Each agent with its sub-agents (tree.js).
    const every = agents(), all = terminals(), under = subAgents(every, all);
    const st = (a) => treeStatus(ownStatus(a.status, a.address, all), under(a.address));
    const live = awake(st);
    const ps = panes();
    const stopPress = (_e, cx) => cx.stop_propagation();
    // `on` for a toggle that's on: a `selected` ground and a lit icon, as a tab that's active.
    const button = (id, glyph, label, action, key, on) => tip(this.hot, t, id, label, stop(this, t, id, div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(lit(this, id, on ? t.foreground : undefined)).when(on, el => el.bg(t.selected)).hover(s => s.bg(t.hover)).on_hover(glow(this, id))
      .role("button").accessibility_label(label)
      .on_mouse_down("left", stopPress).on_click(action).child(glyph)), { action: key, below: true });
    // The tab's most urgent agent, ranked as the app ranks tabs; a done one only while it's still news.
    const statusOf = (c) => {
      const modWords = ps.filter(p => p.tab === c.id && p.mod).map(p => modStatus(p));
      const words = [...every.filter(a => a.tab === c.id).map(st), ...modWords];
      return words.includes("blocked") ? "blocked"
        : modWords.includes("done") || live.some(a => a.tab === c.id && st(a) === "done") ? "done"
        : words.includes("working") ? "working" : null;
    };
    const widths = this.tabWidths(shown, (c) => this.nameW[c.id] ? Math.max(TAB_MIN, Math.ceil(this.nameW[c.id]) + TAB_CHROME) : TAB_FLOOR);
    const item = (c, i) => {
      const lead = leadOf(ps.filter(p => p.tab === c.id));
      const program = lead && programOf(lead);
      const name = nameOf(c, lead);
      const status = statusOf(c), label = c.zoomed ? `${name} Z` : name;
      // As T3's panel tabs: 24px, 12px words. Unlike T3's, the icon stays: it tells tabs apart, so hovering puts × over the status mark instead.
      const tabId = `tab-${c.id}`, closeId = `close-${c.id}`;
      const over = this.overTab === c.id || within(this, [tabId, closeId]);
      const glyph = !program?.icon ? svg("mods/t3-tabs/terminal.svg").size(12).text_color(t.muted)
        : program.tint ? svg(program.icon).size(12).text_color(t.muted) : image(program.icon).size(12);
      // Its whole name, in a hover label's quiet style: the project, branch and program are already in the sidebar and the pane's header.
      // A Popup hanging from a 1px anchor at the tab's bottom, with an Inbox row's timing; the label's words start where the tab's name does
      // (the tab's 6px padding, 16px icon slot and 2px gap, less the label's 1px border and 8px padding). Up from the hover on: a Popup must
      // have measured its anchor before the frame a label starts to fade in. It says the status too, as × covers the mark while it shows.
      // Only what the tab isn't showing: a name cut short or that status. Not yet measured counts as cut.
      const says = status || !(widths.get(c.id) >= Math.ceil(this.nameW[c.id]) + TAB_CHROME);
      const details = Popup.new(`details-${c.id}`, div()).absolute().bottom(0).left(6 + 16 + 2 - (1 + 8)).size(1)
        .when((this.details === c.id || this.detailsOut === c.id) && !this.hot && this.pressed === null, pop => pop.content(div().id(`details-card-${c.id}`)
          .mt(4).max_w(320).px(8).py(4).rounded(6).border(1).border_color(t.border).bg(t.chrome).shadow_md().text_size(12).text_color(t.foreground)
          .opacity(this.details === c.id && this.detailsIn ? 1 : 0).transition("opacity", { duration: 150, easing: "ease-out" })
          .child(status ? `${name} · ${WORDS[status]}` : name)));
      const tab = h_flex().id(tabId).relative().h(24).w(widths.get(c.id)).pl(6).pr(4).gap(2).rounded(6).items_center().flex_none().text_size(12)
        .bg(c.active ? t.selected : t.chrome).text_color(c.active || over ? t.foreground : t.muted)
        .role("button").accessibility_label(name)
        .on_hover((on, cx) => {
          if (on) this.overTab = c.id;
          else if (this.overTab === c.id) { this.overTab = null; detailsFor(this, null, cx); }
          cx.notify();
        })
        .when(!c.active, el => el.hover(s => s.bg(t.hover)))
        // Dragged as a space is: the source fades, a line shows where it lands. `over` is null until the drag starts.
        .when(this.pressed === i && this.over !== null && this.over !== i, el => el.opacity(0.5))
        .when(this.pressed !== null && this.over === i && this.pressed !== i, el => el.child(
          div().absolute().top(0).bottom(0).w(2).bg(t.accent)
            .when(this.pressed < i, line => line.right(0))
            .when(this.pressed > i, line => line.left(0)),
        ))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); detailsFor(this, null, cx); this.pressed = i; this.over = null; this.pressAt = e.position; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_move((e, cx) => {
          if (this.pressed === null || this.over === i) return;
          // As T3's tabs: a drag starts 6px from the press, so a click's wobble only selects.
          if (this.over === null && Math.hypot(e.position.x - this.pressAt.x, e.position.y - this.pressAt.y) < 6 * settings().zoom) return;
          this.over = i;
          cx.notify();
        })
        .on_mouse_up("left", (_e, cx) => {
          const from = this.pressed, dragged = this.over !== null; this.pressed = this.over = null;
          if (dragged && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          // Short of a drag it was a click on the pressed tab, wherever the release lands.
          else run("tab.select", { id: shown[from ?? i].id });
          cx.notify();
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); detailsFor(this, null, cx); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        // Its name's whole width, whatever the tab's: clipped to nothing, it only measures.
        .child(div().id(`name-${c.id}`).absolute().top(0).left(0).h(0).overflow_hidden().whitespace_nowrap().child(label)
          .on_size_change((size, cx) => { this.nameW[c.id] = size.width / settings().zoom; cx.notify(); }))
        // The card belongs to the icon and name, as T3's and Zed's: on the way to the × it goes.
        .child(h_flex().id(`label-${c.id}`).flex_1().min_w(0).h_full().gap(2).items_center()
          .on_hover((on, cx) => { detailsFor(this, on && says ? c.id : null, cx); cx.notify(); })
          .child(div().size(16).flex_none().flex().items_center().justify_center().child(glyph))
          .child(div().flex_1().min_w(0).truncate().child(label)))
        // Its label waits longer than a card's 150ms, so a straight click never meets it. Its key closes the active tab only.
        .child(tip(this.hot, t, closeId, "Close tab", div().id(closeId).size(16).flex_none().flex().items_center().justify_center().rounded(4).hover(s => s.bg(t.raised)).on_hover(glow(this, closeId))
          .role("button").accessibility_label(`Close ${name}`)
          .on_mouse_down("left", stopPress).on_click((_e, cx) => { cx.stop_propagation(); run(`t3-tabs.close-tab:${c.id}`); })
          .when(over, el => el.child(svg("mods/t3-tabs/x.svg").size(12).text_color(t.foreground)))
          .when(!over && status != null, el => el.child(mark(t, status)))
          .when(over, el => stop(this, t, closeId, el, 4)), { action: c.active ? "t3-tabs.close-tab" : undefined, below: true, delay: 500 }))
        .when([this.overTab, this.details, this.detailsOut].includes(c.id), el => el.child(details));
      // A tab goes by its mouse-up, which a key isn't.
      return stop(this, t, tabId, tab, 6, { enter: () => run("tab.select", { id: c.id }) });
    };
    const root = layout(), sidebar = find(root, "sidebar"), panel = find(root, "panel"), w = window();
    // The bar's end, a block of its own after the controls other mods put in the bar (Actions, Review): + keeps its spot
    // however wide they are, and the window's own buttons stay last.
    // Before +, with a `panel` in the layout: Herdr's own Files and Changes, as Herdr's tab bar has them, behind one button.
    if (props()?.part === "end") return focusRoot(this, h_flex().size_full().items_center().justify_end().bg(t.chrome)
      .child(h_flex().id("tabs-end").flex_none().pr(10).gap(4).items_center().on_size_change((size) => this.fit(size))
        .when(Boolean(panel), el => el.child(button("panel-toggle", svg("mods/t3-tabs/panel-right.svg").size(14), panel.hidden ? "Show Files and Changes" : "Hide Files and Changes", () => run("layout.toggle", { id: "panel" }), "layout.toggle:panel", !panel.hidden)))
        .child(button("tab-new", svg("mods/t3-tabs/plus.svg").size(14), "New tab", () => run("tab.new"), "tab.new"))
        .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/t3-tabs/win-min.svg").size(16) : "−", "Minimize", () => run("window.minimize")))
          .child(button("maximize", w.platform === "windows" ? svg(`mods/t3-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", w.maximized ? "Restore" : "Maximize", () => run("window.maximize")))
          .child(button("close-window", w.platform === "windows" ? svg("mods/t3-tabs/win-close.svg").size(16) : svg("mods/t3-tabs/x.svg").size(13), "Close window", () => run("window.close"))))));
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(8, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 8;
    return focusRoot(this, h_flex().size_full().min_w(0).pl(lightsPadding).pr(4).gap(4).items_center().bg(t.chrome)
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
      .when(Boolean(sidebar?.hidden), el => el.child(this.sidebarToggle(t, stopPress, live, st)))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().overflow_hidden()
        .on_size_change((size, cx) => { this.room = size.width / settings().zoom; cx.notify(); })
        .child(h_flex().id("tab-strip").flex_none().h_full().items_center().gap(TAB_GAP).ml(-this.stripAt(shown, widths)).children(shown.map(item)))));
  }
}
