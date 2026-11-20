import { View, div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, agents, terminals, run, openOverlay, focused, notify, theme, window, layout, settings, props, shared, setShared, nextCommand } from "herdr";
import { modStatus, namer, programOf } from "./name.js";
import { notNews, ownStatus, stillSettled, subAgents, treeStatus } from "./tree.js";
import { statusMark } from "./status-mark.js";
import { tip, glow, undoLabel } from "./tip.js";
import { detailsFor, detailsAt } from "./details.js";
import { programIcon } from "./program.js";
import { focusAgent, focusPane } from "./zoom.js";
import { registerSpaceArrival } from "./space-arrival.js";
import { stopsInit, stopsEnd, stop, focusRoot, within } from "./focus.js";
import { opener, popupOpen, hang } from "./trigger.js";
import { litProp } from "./list.js";
import { sidebarParts, toggleLeft } from "./sidebar.js";
import { navigation } from "./navigation.js";
import { projectMark } from "./project.js";
import { KEY, closedKey } from "./store.js";
import { pinList, pin, unpin, putBack } from "./pins.js";
import { writeLabel } from "./labels.js";
import { openMenu } from "./menu.js";
import { panelState, togglePanel, toggleWide, syncPanel, restorePanel, reviewRepo, layoutNode } from "./panel.js";
import { rememberTerminal } from "./terminal-context.js";
import { stripAt, stripWheel, stripFades } from "./scroll-strip.js";
import { button as drawButton, radiusOf, tint as ghostTint, GROUP_GAP } from "./button.js";
import { nameText, named as namedLabel } from "./measured-text.js";
import { tab } from "./tab.js";

const inboxShown = () => sidebarParts(layout()).stack?.active === "inbox";
// The tab bar's row, as layouts/herdr-t3.json has it.
const ROW_PX = 40;

const TAB_GAP = 4;
// A tab's name gives way to T3's 144px at most, the active one's to 240px; past that the strip scrolls.
// Unlike T3's, a tab has a floor, so a short name (`Pi`) stays big enough to aim at.
const TAB_FLOOR = 144, TAB_ACTIVE = 240, TAB_MIN = 96;
// A tab around its name: padding, the icon's slot (× covers it hovered, tab.js), the gaps and the end slot its status mark keeps.
const TAB_CHROME = 51;
// With the Inbox, the tools at the right hug their icon and name: they have no status mark (docs/adr/0002), so no end slot.
const SNUG_CHROME = 32;
// A zoomed tab's pane segment around its name: a tab's padding, icon slot and gap, with no ×. The rule between the Inbox's groups.
const SEG_CHROME = 32, RULE_W = 9;
// With the Inbox showing, the breadcrumb shows whole while it can: the strip beside it gives way first, down to
// nothing (it scrolls), and the names shorten only when the breadcrumb alone is wider than the row; under NARROW, a parent's
// name turns to `…`.
const NARROW = 360;

// The panes you were in, the one you're in first, for Go to's order (T3's recent threads): kept by the `keys` copy, as it
// always shows, so every way of moving counts. A closed pane leaves it.
const RECENT = 30;
function keepRecent() {
  const here = focused()?.pane, open = new Set(panes().map(p => p.pane)), was = shared(KEY.recent) ?? [];
  const next = [...(here ? [here] : []), ...was.filter(p => p !== here)].filter(p => open.has(p)).slice(0, RECENT);
  if (next.length !== was.length || next.some((p, i) => p !== was[i])) setShared(KEY.recent, next);
}

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

// One navigation for every copy (navigation.js), so what the strip draws and what the keys do can't disagree. The `keys` copy, a
// floating block that draws nothing and always shows, answers every t3-tabs command and lays the window out; the blocks need no
// draw order (check-navigation.cjs).
let brain = null;
const nav = () => brain ??= navigation();

// A tab nobody named reads as its lead pane: the agent in it, else the focused one.
const leadOf = (mine) => mine.find(p => p.status != null) ?? mine.find(p => p.focused) ?? mine[0];
const nameOf = (c, lead, name) => c.named ? c.name : lead ? name(lead) : "Terminal";

// Home's shown tab's pane when it is one mod's pane alone, the surface that can take the whole right side; else null.
function homeLone(home) {
  const tab = spaces().find((s) => s.id === home)?.tabs?.find((x) => x.active)?.id, here = panes().filter((p) => p.tab === tab);
  return tab && here.length === 1 && here[0].mod ? here[0] : null;
}
const homeWhole = (home) => Boolean(homeLone(home));

export default class Tabs extends View {
  /** @type {{ space?: string }} */
  panelPending = null; // Written by panel.js on this block only.

  init(_props, cx) {
    this.pressed = null;
    this.over = null;
    this.tabStrip = {};
    this.nameW = {};
    this.dragKeys = cx.focus_handle();
    const part = props()?.part;
    if (part !== "measure" && part !== "keys") stopsInit(this, cx);
    // A close may ask first: the dialog covers the strip, and nothing reports the pointer's leaving until it moves, so the
    // strip, which hears the commands too, clears its hover then. Herdr's own wait, so a reload ends it.
    if (!part) cx.spawn(async (cx) => {
      for (;;) {
        if (!(await nextCommand()).startsWith("close-")) continue;
        this.overTab = this.hot = null;
        detailsFor(this, null, cx);
        cx.notify();
      }
    });
    if (part !== "keys") return;
    this.releaseArrival = registerSpaceArrival(nav().arrive = (space) => {
      const source = spaces().find(s => s.active)?.id, pending = this.panelPending;
      this.fitRow(window(), space === shared(KEY.home), Boolean(pending));
      if (space !== source || pending?.space) restorePanel(this, space, source);
    });
    // Only this copy answers: every other copy would open its own dialog.
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        // One at a time: a second press finds the first's pane gone.
        if (command === "sidebar") this.switchSidebar();
        else if (command === "toggle-sidebar") this.toggleSidebar();
        else if (command === "settle") await this.settle(cx);
        // The space panel (docs/adr/0017), keyed as VS Code's: a surface opens on it, or puts away the panel showing it; `panel` keeps it as it was.
        else if (command === "files") togglePanel("files");
        else if (command === "review") {
          const p = panelState(), sp = spaces().find(s => s.active);
          if (!p.pages.includes("review")) continue;
          if (p.open && p.active === "review") { togglePanel("review"); continue; }
          const { problem } = await reviewRepo(sp?.id);
          if (spaces().find(s => s.active)?.id !== sp?.id) continue;
          if (!problem) togglePanel("review");
          else notify({ title: "Review unavailable", body: problem, level: "warning" });
        }
        else if (command === "panel") togglePanel();
        else if (command === "details") {
          if (this.navigation.atHome) continue;
          if (!panelState().wide) { run("t3-actions.details"); continue; }
          // Maximized, the panel hides the bar that answers, and a hidden copy hears no command: it comes back first.
          toggleWide();
          cx.timer.after(50, () => run("t3-actions.details"));
        }
        // An agent's menu (t3-menu): Settle, Un-settle or Wake the agent it was opened on, in view or not.
        else if (command.startsWith("settle:")) await this.settle(cx, command.slice("settle:".length));
        else if (command.startsWith("wake:")) await writeLabel(command.slice("wake:".length), "snoozed", "");
        else if (command.startsWith("unpin:")) this.unpin(command.slice("unpin:".length), cx);
        // The Inbox breadcrumb title's menu (t3-menu).
        else if (command.startsWith("pin:")) pin(command.slice("pin:".length));
        else if (command.startsWith("snooze:")) await this.snooze(command.slice("snooze:".length), cx);
        else if (command.startsWith("unread:")) await this.unread(command.slice("unread:".length));
        else if (command === "undo") await this.undo();
        else await this.navigation.handle(command, cx);
      }
    });
  }

  get navigation() { return nav(); }

  // `given`: an agent's menu names it; the key takes the agent in view.
  async settle(cx, given = null) {
    // Settle is the Inbox's: Lists has no Settled to put it in (docs/adr/0002).
    // At Home the key has nothing in view to settle, and Undo has its own key, as T3's; a menu still names its agent.
    if ((!given && this.navigation.atHome) || sidebarParts(layout()).stack?.active === "lists") return;
    const f = { ...focused() }, ps = panes(), p = ps.find(p => p.pane === f.pane), every = agents(), all = terminals();
    if (!given && p?.mod && programOf(p)?.inbox) {
      if (!["working", "blocked"].includes(modStatus(p))) await this.navigation.handle(`close-pane-now:${p.pane}`, cx);
      return;
    }
    const byAddress = new Map(all.map(k => [k.address, k]));
    let address = given ?? (f?.pane && !f.terminal ? (every.find(a => a.tab === f.tab && a.address === f.agent) ?? every.find(a => a.tab === f.tab))?.address
      : f?.terminal ?? f?.agent ?? every.find(a => a.focused)?.address);
    // One settled from its menu in the background moves nothing, as its card's Settle.
    const inView = !given || f.terminal === given || every.find(a => a.focused)?.address === given;
    const seen = new Set();
    while (address && !every.some(a => a.address === address) && !seen.has(address)) { seen.add(address); address = byAddress.get(address)?.parent; }
    const a = every.find(a => a.address === address), k = byAddress.get(address);
    if (!a) return;
    const kids = subAgents(every, all)(address), own = ownStatus(a.status, address, all);
    if ([own, ...kids].some(s => s === "working" || s === "blocked")) return;
    if (stillSettled(k, own, kids)) {
      await this.unsettle(address, all);
      return;
    }
    const snoozed = k?.labels?.snoozed ?? "";
    if (!await writeLabel(address, "settled", `${Date.now()}:${k?.turn ?? 0}`)) return;
    if (snoozed) await writeLabel(address, "snoozed", "");
    const pins = pinList();
    unpin([address]);
    this.remember("Settled", { address, snoozed, pins, viewed: inView }, cx);
    const current = focused();
    if (inView && ["space", "tab", "pane", "terminal", "agent"].every(key => current?.[key] === f[key]) && !this.navigation.nextCard(address)) run("t3-tabs.home");
  }

  // `<address>:<wake ms>`, as an Inbox card's Snooze: the label, an Undo that wakes it, and the agent in view put away as Settle
  // puts it. Snooze is the Inbox's (docs/adr/0002). A time gone by is refused, as the card refuses it.
  async snooze(arg, cx) {
    const i = arg.lastIndexOf(":"), address = arg.slice(0, i), at = Number(arg.slice(i + 1));
    if (!(at > Date.now())) return notify({ title: "Couldn't snooze the agent", body: "That time has passed. Choose another.", level: "warning" });
    if (sidebarParts(layout()).stack?.active === "lists") return;
    // The menu or dialog may still be open when the agent or something under it starts needing the person.
    const every = agents(), all = terminals(), a = every.find(a => a.address === address), k = all.find(k => k.address === address);
    if (!a || !k || treeStatus(ownStatus(a.status, address, all), subAgents(every, all)(address)) === "blocked") return;
    const f = { ...focused() }, was = k.labels?.snoozed ?? "";
    const inView = f.terminal === address || a.focused;
    if (!await writeLabel(address, "snoozed", String(at))) return;
    this.remember("Snoozed", { address, snoozed: was, viewed: inView }, cx);
    const current = focused();
    if (inView && ["space", "tab", "pane", "terminal", "agent"].every(key => current?.[key] === f[key]) && !this.navigation.nextCard(address)) run("t3-tabs.home");
  }

  async unsettle(address, all) {
    if (!await writeLabel(address, "settled", "")) return false;
    // Kept for live terminals only, so the record doesn't grow with every agent ever brought back.
    const unsettled = Object.fromEntries(Object.entries(shared(KEY.unsettled) ?? {}).filter(([at]) => all.some(t => t.address === at)));
    setShared(KEY.unsettled, { ...unsettled, [address]: Math.max(Date.now(), (unsettled[address] ?? 0) + 1) });
    return true;
  }

  // Mark unread is the Inbox's (docs/adr/0002): puts an idle agent back to Done in place by rolling `herdr.seen` back a turn.
  async unread(address) {
    if (sidebarParts(layout()).stack?.active === "lists") return;
    const every = agents(), all = terminals(), a = every.find(a => a.address === address), k = all.find(k => k.address === address);
    if (!a || !k) return;
    const kids = subAgents(every, all)(address), own = ownStatus(a.status, address, all), turn = Number(k.turn);
    if (treeStatus(own, kids) !== "idle" || !(turn > 0)) return;
    if (!await writeLabel(address, "herdr.seen", String(turn - 1))) return;
    if (k.labels?.settled && !await this.unsettle(address, all)) return;
    if (k.labels?.snoozed) await writeLabel(address, "snoozed", "");
  }

  unpin(address, cx) {
    const pins = pinList();
    if (!pins.includes(address)) return;
    unpin([address]);
    this.remember("Unpinned", { address, pins }, cx);
  }

  remember(action, undo, cx) {
    const old = shared(KEY.notice), now = Date.now();
    const joined = old?.owner === "tabs" && old.action === action && old.live && now - old.at < 5000;
    const n = { owner: "tabs", action, count: (joined ? old.count : 0) + 1, gen: (old?.gen ?? 0) + 1,
      live: true, shown: joined, at: now, undos: [...(joined ? old.undos : []), undo] };
    setShared(KEY.notice, n);
    const update = (change) => {
      const current = shared(KEY.notice);
      if (current?.owner === "tabs" && current.gen === n.gen && current.at === n.at) setShared(KEY.notice, change && { ...current, ...change });
    };
    if (!joined) cx.timer.after(16, () => update({ shown: true }));
    cx.timer.after(5000, () => update({ live: false, shown: false }));
    cx.timer.after(5250, () => update(null));
  }

  async undo() {
    const n = shared(KEY.notice);
    if (!n?.live || Date.now() - n.at >= 5000) return;
    if (n.owner !== "tabs") {
      setShared(KEY.undo, { gen: n.gen, at: n.at, requestedAt: Date.now(), request: (shared(KEY.undo)?.request ?? 0) + 1 });
      return;
    }
    // Gone while the writes run, so a second press can't repeat them; back with what failed, so it can be tried again.
    setShared(KEY.notice, null);
    // One put away from view is gone back to, while Home is still where that left the person; one never in view stays where it is.
    let back;
    const failed = [];
    for (const u of [...n.undos].reverse()) {
      // A snooze undone wakes it: the label back as it was.
      if (n.action === "Snoozed") {
        if (!await writeLabel(u.address, "snoozed", u.snoozed)) failed.unshift(u);
        else if (u.viewed) back = u.address;
        continue;
      }
      if (n.action !== "Unpinned") {
        if (!await writeLabel(u.address, "settled", "")) { failed.unshift(u); continue; }
        if (u.viewed) back = u.address;
        if (Number(u.snoozed) > Date.now()) await writeLabel(u.address, "snoozed", u.snoozed);
      }
      putBack(u.pins, [u.address]);
    }
    if (failed.length) setShared(KEY.notice, { ...n, count: failed.length, undos: failed });
    if (back && this.navigation.atHome) focusAgent(back);
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

  // Where the tab strip sits (scroll-strip.js): the tab the keyboard's on, else the active one, in view. The Inbox's strip
  // stands at the right, beside Actions, so it holds its place from its end.
  stripAt(shown, widths, fromEnd = false) {
    const walked = shown.findIndex(c => within(this, [`tab-${c.id}`, `tab-${c.id}-close`])), i = walked >= 0 ? walked : shown.findIndex(c => c.active);
    // A rule or a zoomed tab's panes has no name of its own to wait for.
    return stripAt(this.tabStrip, { widths: shown.map(c => widths.get(c.id)), gap: TAB_GAP, room: this.room ?? 0, focus: i, focusKey: shown[i]?.id ?? "",
      ready: shown.every(c => c.rule || c.group || this.nameW[`tab-${c.id}`]), fromEnd });
  }

  // With the sidebar hidden the row holds only its toggle, where the brand bar has it, as T3's collapsed sidebar leaves its trigger.
  // How agents are doing is the sidebar's and Herdr's notice's to show, so the row says none of it (docs/adr/0010).
  sidebarToggle(t, stopPress) {
    return tip(this, t, "sidebar-toggle", "Show sidebar", stop(this, t, "sidebar-toggle", drawButton(t, "sidebar-toggle", {
      size: "sm", icon: "mods/t3-tabs/icons/panel-left.svg", label: "Show sidebar", hot: this.hot === "sidebar-toggle" })
      .mr(4).on_hover(glow(this, "sidebar-toggle"))
      // It goes when the sidebar shows, before the pointer can report leaving it.
      .on_mouse_down("left", stopPress).on_click(() => { this.hot = null; run("t3-tabs.toggle-sidebar"); }), radiusOf("sm")), { action: "t3-tabs.toggle-sidebar", below: true });
  }

  // Home's row (`home-row` in `work-home`) wears Home's colour so the two are one surface; with the wallpaper as Home it draws the
  // same picture, offset by the row's height and cut to itself, from where Home reports it (KEY.homeShown). Another Home's value,
  // or Home now another mod or split, draws nothing. Sidebar hidden, the toggle floats here and the Undo notice gets a chrome pill.
  homeRow(t, w, stopPress, windowButtons) {
    const home = shared(KEY.home), shown = shared(KEY.homeShown), lone = homeLone(home);
    const pic = shown?.path && shown.home === home && lone?.mod === "asciicn-wallpaper" ? shown : null;
    const root = layout(), hidden = Boolean(sidebarParts(root).rail?.hidden), notice = hidden && this.undoNotice(t);
    return focusRoot(this, h_flex().id("home-row").size_full().min_w(0).relative().overflow_hidden()
      .pl(hidden ? toggleLeft(w, root, settings().zoom) : 8).pr(4).gap(4).items_center().bg(t.background)
      .when(Boolean(pic), el => el.child(div().id("home-picture").absolute().right(pic.right).top(pic.top + ROW_PX).w(pic.w).h(pic.h)
        .opacity(pic.opacity).child(image(pic.path).size_full())))
      .when(hidden, el => el.child(this.sidebarToggle(t, stopPress)))
      .when(Boolean(notice), el => el.child(h_flex().id("home-notice").flex_none().h(28).px(8).items_center().rounded(8).bg(t.chrome).child(notice)))
      .child(div().flex_1())
      // The panel open, its head has the window buttons, as away (`window-end`).
      .when(Boolean(w?.buttons) && !panelState().open, el => el.child(windowButtons())));
  }

  // With props.block, sizes that block to `size`: layout.resize, which Herdr keeps with the layout's clicks.
  // on_size_change reports zoomed pixels; a layout's are logical.
  fit(size) {
    // The window snaps a zoomed width to whole pixels: up to half a px over its logical width isn't more room needed.
    const z = Number(settings()?.zoom) || 1, id = props()?.block, px = Math.ceil(size.width / z - 0.5);
    if (!id || px === this.fitted) return;
    this.fitted = px;
    run("layout.resize", { id, px });
  }

  // At Home the bar has nothing to show, so its row folds to the panes' gap, unless the sidebar is hidden (it holds the toggle and the
  // macOS window buttons) or the bar has its own window buttons. Run on layout clicks, so it corrects the row whatever left it so.
  // Home's pane shows in `home-main`, a frame with no header, since a blank one still takes 28px; a Home of one mod's pane is the
  // whole right side, `work-home` (docs/adr/0021). `work-away` keeps its row and frame set for Home, so leaving changes only the branch.
  fitRow(w, atHome, force = false, hidden = null) {
    const root = layout(), row = layoutNode(root, "tabs-row"), work = layoutNode(root, "work-main"), stack = layoutNode(root, "work-view");
    const branch = atHome && homeWhole(shared(KEY.home)) ? "work-home" : "work-away";
    if (stack && (force || stack.active !== branch)) run("layout.select", { stack: "work-view", child: branch });
    const child = atHome ? "home-main" : "main";
    if (work && (force || work.active !== child)) run("layout.select", { stack: "work-main", child });
    if (!row) return;
    const px = atHome && !(hidden ?? sidebarParts(root).rail?.hidden) && !w?.buttons ? 8 : ROW_PX;
    if (force || row.size?.px !== px) run("layout.resize", { id: "tabs-row", px });
  }

  // ⌘B and both sidebar buttons: the row's height goes in the same layout change as the toggle, so the work area moves once.
  toggleSidebar() {
    const hidden = !sidebarParts(layout()).rail?.hidden, space = spaces().find(s => s.active)?.id;
    run("layout.toggle", { id: "sidebar" });
    this.fitRow(window(), Boolean(space) && space === shared(KEY.home), false, hidden);
  }

  switchSidebar() {
    if (sidebarParts(layout()).rail?.hidden) return; // as T3's sidebar keys: nothing on screen to switch
    run("layout.select", { stack: "sidebar-lists", child: inboxShown() ? "lists" : "inbox" });
  }

  // One redraw at `at` (Infinity: none), when what's drawn changes with nothing else changing; a day at most, as the Inbox's
  // wake timer: a longer wait is armed again then.
  redrawAt(at, cx) {
    if (at === this.redrawDue) return;
    this.redrawTimer?.cancel();
    this.redrawDue = at;
    this.redrawTimer = at < Infinity ? cx.timer.after(Math.min(at - Date.now(), 86400000), (cx) => { this.redrawDue = null; cx.notify(); }) : null;
  }

  // Another layout's bar shouldn't stay compact because this one was narrow when it went.
  async close() {
    stopsEnd(this);
    this.redrawTimer?.cancel();
    if (props()?.part === "measure") setShared(KEY.compact, false);
    // Another layout starts its own memory.
    if (props()?.part === "keys") { this.releaseArrival?.(); brain = null; }
  }

  endDrag() {
    const moved = this.over !== null;
    this.pressed = this.over = null;
    const back = moved ? focused() : null;
    if (back?.pane) run("pane.focus", { pane: back.pane });
    else if (back?.terminal) run("pane.focus", { terminal: back.terminal });
  }

  render(cx) {
    const part = props()?.part;
    // The work column's width, in a strip the bar's controls can't change: measured in the bar, their collapsing would undo itself.
    // on_size_change reports zoomed pixels. Past T3's 768 for the same controls: here they share the row with the tabs.
    if (part === "measure") return div().id("bar-measure").size_full()
      .on_size_change((size) => setShared(KEY.compact, size.width / (Number(settings()?.zoom) || 1) < 1024));
    const t = theme(), w = window();
    if (part === "keys") {
      this.navigation.advance();
      rememberTerminal();
      const space = syncPanel(this);
      keepRecent();
      this.fitRow(w, Boolean(space) && space === shared(KEY.home));
      return div();
    }
    const stopPress = (_e, cx) => cx.stop_propagation();
    // As T3's titlebar controls, with the brand bar's chrome hover.
    const button = (id, icon, label, action, key, glyph = undefined) => tip(this, t, id, label, stop(this, t, id,
      drawButton(t, id, { icon, label, size: "sm", surface: "chrome", hot: this.hot === id })
        .on_hover(glow(this, id)).on_mouse_down("left", stopPress).on_click(action)
        .when(Boolean(glyph), el => el.child(glyph)), radiusOf("sm")), { action: key, below: true });
    // The work header's end: Lists' terminal + before Details (t3-actions' block), so it never moves Details; after Details the panel's
    // toggle while no panel head owns it, then the window's buttons. tabs-end-inset keeps the toggle where the open panel's head puts
    // it (t3-tokens「规则」P3, R1). At Home neither: its row folds (fitRow); ⌥⌘B still opens the panel there.
    const windowButtons = () => h_flex().flex_none().ml(8).items_center()
      .child(button("minimize", w.platform === "windows" ? "mods/t3-tabs/icons/win-min.svg" : undefined, "Minimize", () => run("window.minimize"), undefined, w.platform === "windows" ? undefined : "−"))
      .child(button("maximize", w.platform === "windows" ? `mods/t3-tabs/icons/${w.maximized ? "win-restore" : "win-max"}.svg` : undefined, w.maximized ? "Restore" : "Maximize", () => run("window.maximize"), undefined, w.platform === "windows" ? undefined : "□"))
      .child(button("close-window", w.platform === "windows" ? "mods/t3-tabs/icons/win-close.svg" : "mods/t3-tabs/icons/x.svg", "Close window", () => run("window.close")));
    if (part === "end") {
      // With the Inbox, the breadcrumb's space is the way to a new tab.
      const newTabShown = !this.navigation.atHome && !inboxShown();
      return focusRoot(this, h_flex().size_full().items_center().justify_end().bg(t.chrome)
        .child(h_flex().id("tabs-end").flex_none().items_center().when(newTabShown, el => el.pr(GROUP_GAP)).on_size_change((size) => this.fit(size))
          // One size with the panel toggle beside it (「规则」R2).
          .when(newTabShown, el => el.child(button("tab-new", "mods/t3-tabs/icons/plus.svg", "New tab", () => run("t3-tabs.new"), "t3-tabs.new")))));
    }
    if (part === "window") {
      const panel = panelState(), toggleShown = !this.navigation.atHome && panel.pages.length > 0 && !panel.open;
      return focusRoot(this, h_flex().size_full().items_center().justify_end().bg(t.chrome)
        .child(h_flex().id("window-end").flex_none().items_center().when(toggleShown, el => el.pl(GROUP_GAP)).on_size_change((size) => this.fit(size))
          // The space panel's toggle, over where it opens: the sidebar's panel-left, mirrored. Only while closed: open, the panel's head has it.
          .when(toggleShown, el => el.child(button("panel-toggle", "mods/t3-tabs/icons/panel-right.svg",
            "Show panel", () => togglePanel(), "t3-tabs.panel")))
          .when(w?.buttons && !panel.open, el => el.child(windowButtons()))));
    }
    if (part === "home") return this.homeRow(t, w, stopPress, windowButtons);
    const space = spaces().find(p => p.active);
    const root = layout(), { rail: sidebar, stack: sidebarMode } = sidebarParts(root);
    // At Home, none: Home itself tells where this is.
    const { tabs: shown, context: ctx } = this.navigation.frame(), inbox = sidebarMode?.active === "inbox";
    // With the Inbox, the breadcrumb holds the tab in view and the parent's: the strip has the rest.
    const strip = ctx ? [...ctx.kin, ...ctx.programs] : shown;
    // Each agent with its sub-agents (tree.js).
    const every = agents(), all = terminals(), under = subAgents(every, all);
    const st = (a) => treeStatus(ownStatus(a.status, a.address, all), under(a.address));
    const ps = panes(), tabName = namer({ terminals: all, agents: every }), now = Date.now();
    // In Lists a snooze's end brings a done mark back (statusOf) with nothing else changing: the earliest one redraws the strip.
    this.redrawAt(inbox ? Infinity : all.reduce((at, k) => { const wake = Number(k.labels?.snoozed); return wake > now && wake < at ? wake : at; }, Infinity), cx);
    // The tab's most urgent agent, ranked as the app ranks tabs; a done one only while it's still news.
    const statusOf = (c) => {
      const words = [...every.filter(a => a.tab === c.id).map(a => st(a) === "done" && notNews(all.find(k => k.address === a.address), a.status, under(a.address)) ? "idle" : st(a)), ...ps.filter(p => p.tab === c.id && p.mod).map(p => modStatus(p))];
      return words.includes("blocked") ? "blocked"
        : words.includes("done") ? "done"
        : words.includes("working") ? "working" : null;
    };
    // A zoomed tab with more than one pane shows them, a segment each (paneGroup): in Lists the tab in view; with the Inbox a
    // program tab in view, or beside the agents in view the panes that aren't theirs, as its agents are in the breadcrumb.
    const zoomedIn = (tab) => {
      const mine = ps.filter(p => p.tab === tab), z = mine.find(p => p.zoomed);
      return mine.length > 1 && z ? { mine, z } : null;
    };
    /** @type {any[]} Tabs, zoomed tabs' panes and rules. */
    const entries = strip.map(c => {
      const zi = c.active && zoomedIn(c.id);
      // In Lists it keeps the tab's status mark, as the tab did.
      return { id: c.id, active: c.active, c, group: zi && { panes: zi.mine, z: zi.z, status: inbox ? null : statusOf(c) } };
    });
    const work = ctx?.tab && !ctx.away ? zoomedIn(ctx.tab) : null;
    if (ctx) {
      // With the Inbox, a rule between what's the work's (a zoomed tab's other panes, its sub-agents' tabs) and the space's programs.
      const tools = work ? work.mine.filter(p => !every.some(a => a.address === p.terminal)) : [], rule = (n) => ({ id: `rule-${n}`, rule: true });
      if (ctx.kin.length && ctx.programs.length) entries.splice(ctx.kin.length, 0, rule(2));
      if (tools.length) entries.unshift({ id: `tools-${ctx.tab}`, active: tools.includes(work.z), group: { panes: tools, z: work.z } }, ...(entries.length ? [rule(1)] : []));
    }
    const segWant = (p, on) => Math.min(on ? TAB_ACTIVE : TAB_FLOOR, this.nameW[`seg-${p.pane}`] ? Math.ceil(this.nameW[`seg-${p.pane}`]) + SEG_CHROME : TAB_FLOOR);
    const want = (e) => e.rule ? RULE_W
      : e.group ? e.group.panes.reduce((sum, p) => sum + segWant(p, p === e.group.z), 2 + (e.group.status ? 16 : 0))
      : this.nameW[`tab-${e.id}`] ? (ctx ? Math.ceil(this.nameW[`tab-${e.id}`]) + SNUG_CHROME : Math.max(TAB_MIN, Math.ceil(this.nameW[`tab-${e.id}`]) + TAB_CHROME)) : TAB_FLOOR;
    // With the Inbox the strip asks for what its tabs want and gets what the breadcrumb leaves (measured: stripW); in Lists, the row.
    const area = this.area ?? 0, stripWant = Math.max(0, entries.reduce((sum, e) => sum + want(e) + TAB_GAP, -TAB_GAP));
    this.room = ctx ? this.stripW ?? Math.min(stripWant, area) : area;
    const widths = this.tabWidths(entries, want), at = this.stripAt(entries, widths, Boolean(ctx));
    // With the Inbox showing, agents' tabs hold their place at the front: only the rest drag, among themselves.
    const loose = (c) => !inbox || !every.some(a => a.tab === c.id);
    // A press holds a tab's id: an agent starting or a tab closing can change the bar under it.
    const pressedAt = strip.findIndex(c => c.id === this.pressed);
    const item = (c, i) => {
      const lead = leadOf(ps.filter(p => p.tab === c.id));
      const program = lead && programOf(lead);
      const name = nameOf(c, lead, tabName);
      // With the Inbox showing, what needs the person is the sidebar's to say, shown or hidden.
      const status = inbox ? null : statusOf(c);
      const glyph = programIcon(program, 12, t.muted) ?? svg("mods/t3-tabs/icons/terminal.svg").size(12).text_color(t.muted);
      // Shared with the panel's tabs (tab.js); the drag, double-click rename and the click that selects are the bar's own.
      // A Lists tab keeps its end slot for its status, so its width doesn't move with it; the Inbox's tools have none (docs/adr/0002).
      return tab(this, t, `tab-${c.id}`, { mod: "mods/t3-tabs", label: name, icon: glyph, active: c.active, width: widths.get(c.id), mark: status && statusMark("mods/t3-tabs", t, status, 14),
        slot: !ctx, closeLabel: "Close tab", closeAction: c.active ? "t3-tabs.close-tab" : undefined, quiet: this.pressed !== null,
        close: () => run(`t3-tabs.close-tab:${c.id}`), menu: (cx) => openMenu(this, "tab", { id: c.id, space: space.id }, cx), enter: () => run("tab.select", { id: c.id }),
        dragMove: (e, cx) => {
          if (this.pressed === null || this.over === c.id) return;
          const held = strip.find(x => x.id === this.pressed);
          if (!held || !loose(held) || !loose(c)) return;
          // As T3's tabs: a drag starts 6px from the press, so a click's wobble only selects.
          if (this.over === null && Math.hypot(e.position.x - this.dragFrom.x, e.position.y - this.dragFrom.y) < 6 * settings().zoom) return;
          if (this.over === null) this.dragKeys.focus();
          this.over = c.id;
          cx.notify();
        } }, el => el
        // Dragged as a space is: the source fades, a line shows where it lands. `over` is null until the drag starts.
        .when(pressedAt === i && this.over !== null && this.over !== c.id, el => el.opacity(0.5))
        .when(pressedAt >= 0 && this.over === c.id && pressedAt !== i, el => el.child(
          div().absolute().top(0).bottom(0).w(2).bg(t.accent)
            .when(pressedAt < i, line => line.right(0))
            .when(pressedAt > i, line => line.left(0)),
        ))
        .on_mouse_down("left", (e, cx) => { this.pressed = c.id; this.over = null; this.dragFrom = e.position; if (e.click_count === 2) run("tab.rename", { id: c.id }); cx.notify(); })
        .on_mouse_up("left", (_e, cx) => {
          const from = this.pressed, to = this.over;
          if (from === null) return;
          this.endDrag();
          // To the line it shows: past a tab that can't take a drop, the last one that can.
          if (from !== to && strip.some(x => x.id === from) && strip.some(x => x.id === to)) run("tab.move", { id: from, index: space.tabs.findIndex(x => x.id === to) + 1 });
          // Short of a drag it was a click on the pressed tab, wherever the release lands. A tab gone from the bar took its press along.
          else if (strip.some(x => x.id === from)) run("tab.select", { id: from });
          cx.notify();
        }));
    };
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    // Hidden, leave room for the window controls before the sidebar toggle's padded 28px button.
    const lights = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights;
    // Hidden, the toggle stands where the brand bar has it (sidebar.js toggleLeft), as T3's stays put shown or hidden.
    const lightsPadding = sidebar?.hidden ? toggleLeft(w, root, settings().zoom)
      : lights ? Math.max(8, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.size?.px ?? 0)) : 8;
    const notice = sidebar?.hidden && this.undoNotice(t);
    return focusRoot(this, h_flex().size_full().min_w(0).pl(lightsPadding).pr(4).gap(4).items_center().bg(t.chrome)
      .when(this.over !== null, el => el.track_focus(this.dragKeys).on_key_down((e, cx) => {
        if (e.keystroke !== "escape" || this.over === null) return;
        cx.stop_propagation();
        this.endDrag();
        cx.notify();
      }))
      .on_mouse_up("left", (_e, cx) => { this.endDrag(); cx.notify(); })
      // Herdr reports no release outside the bar, so leaving ends a drag, as in the inbox.
      .on_hover((on, cx) => {
        if (on || this.pressed === null) return;
        this.endDrag();
        cx.notify();
      })
      // The wheel only scrolls the strip, either way; a click is what goes to a tab.
      .on_scroll_wheel((e, cx) => {
        stripWheel(this.tabStrip, e);
        cx.notify();
      })
      .when(Boolean(sidebar?.hidden), el => el.child(this.sidebarToggle(t, stopPress)))
      .when(Boolean(notice), el => el.child(notice))
      // The tabs' row, measured whole: with the Inbox the breadcrumb and the strip share it.
      .child(h_flex().id("tab-area").flex_1().min_w(0).h_full().items_center().gap(8)
        .on_size_change((size, cx) => { this.area = size.width / settings().zoom; cx.notify(); })
        .when(Boolean(ctx), el => el.child(this.crumb(t, ctx, { every, ps, name: tabName, narrow: area - this.room - 8 < NARROW, stopPress })))
        .child(h_flex().id("tab-scroll").relative().h_full().items_center().overflow_hidden()
          // 8 from Actions, as from the breadcrumb: the bar's 4 and these 4.
          .when(Boolean(ctx), el => el.w(stripWant).flex_shrink(1).min_w(0).mr(4)
            .on_size_change((size, cx) => { this.stripW = size.width / settings().zoom; cx.notify(); }))
          .when(!ctx, el => el.flex_1().min_w(0))
          .child(h_flex().id("tab-strip").flex_none().h_full().items_center().gap(TAB_GAP).ml(-at)
            .children(entries.map(e => e.rule ? div().id(e.id).w(1).h(16).mx(4).flex_none().bg(t.border)
              : e.group ? this.paneGroup(t, e, widths.get(e.id), { name: tabName, stopPress })
              : item(e.c, strip.indexOf(e.c)))))
          // A cut end fades out, in both modes: one way for the strip to run out of room, and a tab cut short reads as cut, not as
          // a narrow tab. 16px of the bar's own color in steps, there being no gradient fill for an element.
          .children(stripFades(t.chrome, this.tabStrip)))));
  }

  // With the Inbox showing, who's in view, as T3's thread header: the space, a sub-agent's parent, then the agent in view
  // (docs/internals/specs/tab-bar.md). Held or away, the title dims and leads back.
  crumb(t, ctx, { every, ps, name, narrow, stopPress }) {
    const space = ctx.space, dim = ctx.held || ctx.away, agentOf = (address) => every.find(a => a.address === address);
    const nameOf = (address) => { const a = agentOf(address); return a ? name(a) : address; };
    // The title's menu is the agent's (t3-menu's "agent"), hung under the title as T3's thread actions; a click while it's open closes
    // it. The space crumb's menu has its own close stamp, so the two never block each other.
    const titled = ctx.sub ?? ctx.head, spaceClosed = closedKey("t3-menu", "space");
    const menu = (b) => {
      openOverlay({ mod: "t3-menu", kind: "popup", width: 220, height: 260, ...hang(b, 220, { align: "start" }), props: { tab: "agent", target: { address: titled }, ...litProp(!b) } });
    };
    const spaceMenu = (b) => {
      openOverlay({ mod: "t3-menu", kind: "popup", width: 280, ...hang(b, 280, { align: "start" }), props: { tab: "space-switch", target: { id: space.id }, ...litProp(!b) } });
    };
    // Its menu up: the item stays lit, its ⌄ shown and its label down, as the layout's other buttons that open one (trigger.js).
    const menuOn = (id) => popupOpen(this, id, id === "crumb-space" ? spaceClosed : closedKey("t3-menu"));
    // A right-click is the menu of what's under it, on the pointer, as everywhere: the space's (as in Spaces), an agent's (as
    // its card's).
    const context = (kind, target) => (_e, cx) => { detailsFor(this, null, cx); openMenu(this, kind, target, cx); };
    const sep = (id) => div().id(id).flex_none().text_color(t.dim).child("/");
    const press = (e, cx) => { stopPress(e, cx); detailsFor(this, null, cx); };
    const act = (action) => (_e, cx) => { action(); cx.notify(); };
    // A name shown whole has no label, as a tab's (T3's title only repeats it). Cut short, or down to its icon or `…`, the tab's
    // hover label holds it whole, under it, its words where the name starts (`at`, from the item's left; the label's 1 + 8 in).
    const text = (id, label) => nameText(this, id, label, { size: 14, weight: "medium" });
    // `action` null: opens its menu below itself (`onOpen`, `closed`, `right`).
    const named = (id, label, el, action, { agent, shown = true, at = 0, radius = 4, onOpen = menu, closed = closedKey("t3-menu"), right = ["agent", { address: titled }] } = /** @type {{ agent?: string, shown?: boolean, at?: number, radius?: number, onOpen?: any, closed?: string, right?: [string, any] }} */ ({})) => {
      const wired = action ? el.on_mouse_down("left", press).on_click(act(action)) : opener(this, { id, closed, onOpen, press })(el);
      const rightTarget = action && agent ? ["agent", { address: agent }] : right;
      return stop(this, t, id, namedLabel(this, t, id, label, wired.id(id).role("button").accessibility_label(label)
        .on_mouse_down("right", context(rightTarget[0], rightTarget[1])), {
        shown, at, onHover: (hovered, cut, cx) => { glow(this, id)(hovered, cx); detailsFor(this, hovered && cut && !menuOn(id) ? id : null, cx); },
        onMove: e => detailsAt(this, id, e),
      }), radius);
    };
    // As T3's title: its ⌄ is part of it, there only while the item is hovered, focused or open.
    const chevron = (id) => {
      const shown = this.hot === id || within(this, [id]) || menuOn(id);
      return div().id("crumb-menu").flex_none().opacity(shown ? 1 : 0).transition("opacity", { duration: 150, easing: "ease-out" })
        .child(svg("mods/t3-tabs/icons/chevron-down.svg").size(14).text_color(t.muted));
    };
    // The title: the agent in view alone, the card the Inbox lights. Another agent in its tab is reached as any is, by its card
    // or its pane. In view it opens its menu, as T3's title; held or away it's dim, and leads back.
    const title = (address) => {
      const lit = !dim && !ctx.sub, id = `peer-${address}`, label = nameOf(address);
      const el = h_flex().h(24).gap(4).rounded(6).items_center().min_w(0).flex_shrink(1)
        .text_color(lit || this.hot === id ? t.foreground : t.muted)
        .child(text(id, label))
        .when(lit, e => e.child(chevron(id)));
      return named(id, label, el, lit ? null : () => focusAgent(address), { agent: address, radius: 6 });
    };
    const sub = ctx.sub && named(`peer-${ctx.sub}`, nameOf(ctx.sub), h_flex().min_w(0).flex_shrink(1).gap(4).items_center().rounded(4)
      .text_color(dim ? t.muted : t.foreground).child(text(`peer-${ctx.sub}`, nameOf(ctx.sub)))
      .when(!dim, e => e.child(chevron(`peer-${ctx.sub}`))), dim ? () => focusAgent(ctx.sub) : null, { agent: ctx.sub });
    const spaceLit = this.hot === "crumb-space" || within(this, ["crumb-space"]) || menuOn("crumb-space");
    // Its own width and no less, as flex weighting alone lets the strip win; capped at the row, where its names shorten.
    return h_flex().id("crumb").flex_grow(1).flex_shrink(0).min_w(0).when(this.area > 0, el => el.max_w(this.area)).h_full().gap(12).items_center().text_size(14).font_medium()
      .child(named("crumb-space", space.name, h_flex().h(24).gap(6).rounded(6).items_center().min_w(0).flex_shrink(1)
        .text_color(spaceLit ? t.foreground : t.muted)
        .child(projectMark("mods/t3-tabs", space, 14, t, ps))
        .child(text("crumb-space", space.name)), null, {
        at: 20, radius: 6, onOpen: spaceMenu, closed: spaceClosed, right: ["space", { id: space.id }],
      }))
      .when(Boolean(ctx.parent), el => el.child(sep("crumb-sep-parent")).child(named("crumb-parent", nameOf(ctx.parent),
        h_flex().min_w(0).flex_shrink(1).items_center().text_color(this.hot === "crumb-parent" ? t.foreground : t.muted)
          .child(narrow ? div().child("…") : text("crumb-parent", nameOf(ctx.parent))),
        () => focusAgent(ctx.parent), { agent: ctx.parent, shown: !narrow })))
      .when(Boolean(ctx.head), el => el.child(sep("crumb-sep")).child(title(ctx.head)))
      .when(Boolean(sub), el => el.child(sep("crumb-sep-sub")).child(sub));
  }

  // A zoomed tab's panes, a segment each with the zoomed one lit: a click moves the zoom there (zoom.js).
  // Dashed: what one tab holds, unlike the tabs beside it. shortcut: it doesn't drag as a tab does; upgrade if Lists wants that.
  paneGroup(t, e, width, { name, stopPress }) {
    const { panes: list, z, status } = e.group;
    const segment = (p) => {
      const on = p.pane === z.pane, id = `seg-${p.pane}`, label = name(p);
      const glyph = programIcon(programOf(p), 12, t.muted) ?? svg("mods/t3-tabs/icons/terminal.svg").size(12).text_color(t.muted);
      return stop(this, t, id, h_flex().id(id).relative().h_full().pl(6).pr(8).gap(2).rounded(6).items_center().min_w(0).flex_shrink(1)
        .max_w(on ? TAB_ACTIVE : TAB_FLOOR).text_size(12).text_color(on || this.hot === id ? t.foreground : t.muted)
        .when(on, el => el.bg(ghostTint(t, "chrome", true))).when(!on, el => el.hover(s => s.bg(ghostTint(t, "chrome", false)))).on_hover(glow(this, id))
        .role("button").accessibility_label(label)
        .on_mouse_down("left", stopPress).on_click(() => focusPane(p.pane))
        .on_mouse_down("right", (_e, cx) => openMenu(this, "pane", { pane: p.pane, terminal: p.terminal }, cx))
        .child(div().size(16).flex_none().flex().items_center().justify_center().child(glyph))
        .child(nameText(this, id, label).flex_1()), 6);
    };
    return h_flex().id(`group-${e.id}`).w(width).h(24).flex_none().rounded(6).border(1).border_dashed().border_color(t.border).items_center().overflow_hidden()
      .children(list.map(segment))
      .when(Boolean(status), el => el.child(div().w(16).flex_none().flex().items_center().justify_center().child(statusMark("mods/t3-tabs", t, status, 14))));
  }

  undoNotice(t) {
    const n = shared(KEY.notice);
    if (!n || Date.now() - n.at >= 6000) return null;
    const live = n.live && Date.now() - n.at < 5000;
    const button = h_flex().id("undo-notice-undo").flex_none().h(24).items_center().font_medium().text_color(t.foreground)
      .when(live, el => stop(this, t, "undo-notice-undo", el.hover(s => s.underline()).on_hover(glow(this, "undo-notice-undo"))
        .role("button").accessibility_label(`Undo: ${n.action} ${n.count} agent${n.count === 1 ? "" : "s"}`).on_click(() => run("t3-tabs.undo")), 4)).child(undoLabel("t3-tabs.undo"));
    return h_flex().id(`undo-notice-${n.gen}`).flex_none().h(24).gap(4).items_center().text_size(11).text_color(t.dim)
      .opacity(n.shown ? 1 : 0).transition("opacity", { duration: 200, easing: "ease-out" })
      .child(`${n.action}${n.count === 1 ? "" : ` ${n.count}`},`)
      .child(button);
  }
}
