import { View, div, svg, image } from "gpui-kit";
import { h_flex, Popup } from "gpui-base";
import { spaces, panes, agents, terminals, run, openOverlay, closeOverlay, focused, hc, theme, window, layout, settings, props, nextCommand } from "herdr";
import { namer } from "./name.js";
import { ownStatus, subAgents, treeStatus } from "./tree.js";
import { tip, tipMark } from "./tip.js";
import { projectMark } from "./project.js";
import { programIcon, detailsFor, detailsLine, detailsCard } from "./details.js";
import { control, menu, initMenu, initEditor, editorView, deleteAction, glow, lit } from "./actions.js";

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
// A tab's name gives way to T3's 144px at most, the active one's to 240px; past that the strip scrolls.
const TAB_FLOOR = 144, TAB_ACTIVE = 240;
// A tab around its name: padding, the icon's slot and the gaps; a status mark's slot on top.
const TAB_CHROME = 33, TAB_MARK = 18;

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
function fit(name, room = 30) {
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
    const overlay = props()?.actions;
    if (overlay === "edit") initEditor(this);
    if (overlay === "menu") initMenu(this, cx);
    // The tab bar's copy answers an action's delete dialog: `t3-tabs.delete-action:<id>`, and every person's way to close.
    if (!overlay) cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command.startsWith("delete-action:")) deleteAction(command.slice("delete-action:".length));
        // One at a time: a second press finds the first's pane gone.
        else if (command === "close-tab") await this.closeTab(focused()?.tab, cx);
        else if (command === "close-pane") await this.closePane(focused()?.pane, cx);
        else if (command.startsWith("close-tab:")) await this.closeTab(command.slice("close-tab:".length), cx);
        else if (command.startsWith("close-pane:")) await this.closePane(command.slice("close-pane:".length), cx);
      }
    });
  }

  // As T3's confirmTerminalClose: `Close terminal "Pi"?`, then what that ends. A held cmd-w replaces the dialog rather than stacking it.
  ask(what, name, detail, command, args, cx) {
    // The dialog hides the pointer's leaving, and the × stops the press that would close the card.
    this.overTab = null;
    detailsFor(this, null, cx);
    cx.notify();
    if (this.asking) closeOverlay(this.asking);
    this.asking = openOverlay({ mod: "confirm", kind: "dialog", width: 400, height: 170, props: { title: `Close ${what} "${fit(name)}"?`, detail, command: { name: command, args } } });
  }

  // Ending a program asks first; empty panes have none to lose, and Herdr still asks if it's the space's last tab.
  async closeTab(id, cx) {
    const space = spaces().find(s => s.tabs.some(c => c.id === id));
    if (!space) return;
    const c = space.tabs.find(c => c.id === id), mine = panes().filter(p => p.tab === id);
    const ends = (await Promise.all(mine.filter(p => p.terminal).map(p => atPrompt(p.terminal)))).filter(empty => !empty).length;
    if (ends === 0) return run("tab.close", { id });
    const stops = ends === 1 ? "This stops its running process and clears its history." : `This stops its ${ends} running processes and clears their histories.`;
    this.ask("tab", nameOf(c, leadOf(mine)), stops + (space.tabs.length === 1 ? " It's the space's last tab, so the space closes too." : ""), "tab.close", { id, confirmed: true }, cx);
  }

  async closePane(pane, cx) {
    const ps = panes(), p = ps.find(p => p.pane === pane);
    if (!p) return;
    const tabs = spaces().find(s => s.tabs.some(c => c.id === p.tab))?.tabs.map(c => c.id) ?? [];
    // A space's last pane closes the space, and Herdr asks that itself.
    if (!p.terminal || ps.filter(q => tabs.includes(q.tab)).length === 1 || await atPrompt(p.terminal)) return run("pane.close", { pane });
    this.ask("pane", namer()(p), "This stops its running process and clears its history.", "pane.close", { pane }, cx);
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
    const room = this.room ?? 0, i = shown.findIndex(c => c.active), width = (c) => widths.get(c.id);
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
  sidebarToggle(t, stop, live, st) {
    const counts = ["blocked", "working", "done"].map(s => [s, live.filter(a => st(a) === s).length]).filter(([, n]) => n > 0);
    const words = { blocked: "needing you", working: "working", done: "done" };
    const summary = counts.map(([s, n]) => `${n} ${words[s]}`).join(" · ");
    return tip(this.hot, t, "sidebar-toggle", "Show sidebar", h_flex().id("sidebar-toggle").h(24).px(6).gap(8).flex_none().items_center().rounded(6)
      .text_size(12).text_color(lit(this, "sidebar-toggle")).hover(s => s.bg(t.hover)).on_hover(glow(this, "sidebar-toggle"))
      .role("button").accessibility_label(summary ? `Show sidebar, ${summary}` : "Show sidebar")
      // It goes when the sidebar shows, before the pointer can report leaving it.
      .on_mouse_down("left", stop).on_click(() => { this.hot = null; run("layout.toggle", { id: "sidebar" }); })
      .child(svg("mods/workspace-chrome/sidebar.svg").size(14).flex_none())
      .children(counts.map(([s, n]) => h_flex().id(`agents-${s}`).gap(4).items_center().child(mark(t, s)).child(div().text_color(t.muted).child(String(n))))), { action: "layout.toggle:sidebar" });
  }

  render() {
    // Opened as an overlay by the actions control.
    const overlay = props()?.actions;
    if (overlay === "menu") return menu(this);
    if (overlay === "edit") return editorView(this);
    const t = theme();
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const live = awake();
    // Each agent with its sub-agents (tree.js).
    const every = agents(), all = terminals(), under = subAgents(every, all);
    const st = (a) => treeStatus(ownStatus(a.status, a.address, all), under(a.address));
    const ps = panes();
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, glyph, label, action, key) => tip(this.hot, t, id, label, div().id(id).size(24).flex_none().flex().items_center().justify_center().rounded(6).text_color(lit(this, id)).hover(s => s.bg(t.hover)).on_hover(glow(this, id))
      .role("button").accessibility_label(label)
      .on_mouse_down("left", stop).on_click(action).child(glyph), { action: key });
    // The tab's most urgent agent, ranked as the app ranks tabs; a done one only while it's still news.
    const statusOf = (c) => {
      const words = every.filter(a => a.tab === c.id).map(st);
      return words.includes("blocked") ? "blocked"
        : live.some(a => a.tab === c.id && st(a) === "done") ? "done"
        : words.includes("working") ? "working" : null;
    };
    const widths = this.tabWidths(shown, (c) => this.nameW[c.id] ? Math.ceil(this.nameW[c.id]) + TAB_CHROME + (statusOf(c) ? TAB_MARK : 0) : TAB_FLOOR);
    const item = (c, i) => {
      const lead = leadOf(ps.filter(p => p.tab === c.id));
      const program = lead?.program;
      const name = nameOf(c, lead);
      const status = statusOf(c), label = c.zoomed ? `${name} Z` : name;
      // As T3's panel tabs: 24px, 12px words. The icon's slot is the close button: hovering the tab turns it to ×.
      const over = this.overTab === c.id;
      const glyph = !program?.icon ? svg("mods/workspace-chrome/terminal.svg").size(12).text_color(t.muted)
        : program.tint ? svg(program.icon).size(12).text_color(t.muted) : image(program.icon).size(12);
      // Its details, as an Inbox row's: under the tab, a Popup hanging from a 1px anchor at its bottom left. Up from the hover on: a Popup must
      // have measured its anchor before the frame a card starts to fade in. A status mark lit in the tab speaks for itself instead.
      const pic = programIcon(program, 12, t.muted);
      const details = Popup.new(`details-${c.id}`, div()).absolute().bottom(0).left(0).size(1)
        .when((this.details === c.id || this.detailsOut === c.id) && !this.hot && this.pressed === null, pop => pop.content(detailsCard(this, t, c.id, name, [
          space?.name && detailsLine(t, projectMark(space, 12, t, ps), space.name),
          space?.machine && detailsLine(t, svg("mods/workspace-chrome/server.svg").size(12).flex_none().text_color(t.muted), space.machine),
          lead?.branch && detailsLine(t, svg("mods/workspace-chrome/git-branch.svg").size(12).flex_none().text_color(t.muted), lead.branch),
          pic && program.name && detailsLine(t, div().flex_none().opacity(0.6).child(pic), program.name),
        ]).mt(4)));
      const tab = h_flex().id(`tab-${c.id}`).relative().h(24).w(widths.get(c.id)).pl(6).pr(8).gap(2).rounded(6).items_center().flex_none().text_size(12)
        .bg(c.active ? t.selected : t.chrome).text_color(c.active || over ? t.foreground : t.muted)
        .role("button").accessibility_label(name)
        .on_hover((on, cx) => {
          if (on) { this.overTab = c.id; detailsFor(this, c.id, cx); }
          else if (this.overTab === c.id) { this.overTab = null; detailsFor(this, null, cx); }
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
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); detailsFor(this, null, cx); this.pressed = this.over = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
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
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); detailsFor(this, null, cx); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .child(div().id(`close-${c.id}`).size(16).flex_none().flex().items_center().justify_center().rounded(4).hover(s => s.bg(t.raised))
          .role("button").accessibility_label(`Close ${name}`)
          .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run(`t3-tabs.close-tab:${c.id}`); })
          .child(over ? svg("mods/pane/close.svg").size(12).text_color(t.foreground) : glyph))
        // Its name's whole width, whatever the tab's: clipped to nothing, it only measures.
        .child(div().id(`name-${c.id}`).absolute().top(0).left(0).h(0).overflow_hidden().whitespace_nowrap().child(label)
          .on_size_change((size, cx) => { this.nameW[c.id] = size.width / settings().zoom; cx.notify(); }))
        .child(div().flex_1().min_w(0).truncate().child(label))
        .when(status != null, el => el.child(div().pl(2).flex_none().child(tipMark(this, t, `mark-${c.id}`, WORDS[status], mark(t, status)))))
        .when([this.overTab, this.details, this.detailsOut].includes(c.id), el => el.child(details));
      return tab;
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(8, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 8;
    return h_flex().size_full().min_w(0).px(8).pl(lightsPadding).gap(4).items_center().bg(t.chrome)
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
        .child(h_flex().id("tab-strip").flex_none().h_full().items_center().gap(TAB_GAP).ml(-this.stripAt(shown, widths)).children(shown.map(item))))
      // Actions before +, so + keeps its spot however long the action's name is.
      .child(div().mr(4).flex_none().child(control(this, t, stop)))
      .child(button("tab-new", svg("mods/workspace-chrome/plus.svg").size(14), "New tab", () => run("tab.new"), "tab.new"))
      .when(w?.buttons, el => el.child(button("minimize", w.platform === "windows" ? svg("mods/t3-tabs/win-min.svg").size(16) : "−", "Minimize", () => run("window.minimize")))
        .child(button("maximize", w.platform === "windows" ? svg(`mods/t3-tabs/${w.maximized ? "win-restore" : "win-max"}.svg`).size(16) : "□", w.maximized ? "Restore" : "Maximize", () => run("window.maximize")))
        .child(button("close-window", w.platform === "windows" ? svg("mods/t3-tabs/win-close.svg").size(16) : svg("mods/pane/close.svg").size(13), "Close window", () => run("window.close"))));
  }
}
