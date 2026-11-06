// Agents in grouped or priority views; a parent reads with its sub-agents (tree.js).
// A viewed done agent stays in Done until left.

import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex, Popup } from "gpui-base";
import { agents, terminals, panes, spaces, focused, run, theme, shared, setShared, setAgentOrder, openOverlay, closeOverlay, props, layout, nextCommand } from "herdr";
import { namer } from "./name.js";
import { kidStatus, ownStatus, subAgents, treeStatus } from "./tree.js";
import { projectMark } from "./project.js";
import { tip, tipMark } from "./tip.js";
import { programIcon, detailsLive, detailsFor, detailsLine, detailsCard } from "./details.js";
import { stopsInit, stop, focusRoot, within, enter, menuJump } from "./focus.js";
const MOTION = { duration: 150, easing: "ease-out" };
// T3's one-line row and shelf or folder header.
const ROW = 36, HEAD = 32, HEAD_GAP = 8;
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
const SORTS = [
  { id: "priority", label: "Priority", icon: "clock" },
  { id: "grouped", label: "Grouped by space", icon: "layers" },
];
const sortOf = () => SORTS.find((s) => s.id === shared("agents.sort")) ?? SORTS[0];
const SECTION = { 4: "Needs you", 3: "Done", 2: "Working", 1: "Idle" };

// The agent's icon from the app's program table: a one-color glyph or a picture.
function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

// How long it's been in its state, as the shipped agents list says it.
function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export default class Agents extends View {
  init(_props, cx) {
    if (props()?.sortMenu) {
      // It takes the keyboard, as the shipped menu does. As T3's menus: nothing's lit until a key or the pointer arrives, and it fades in.
      this.at = -1;
      this.keys = cx.focus_handle();
      this.keys.focus();
      cx.timer.after(16, (cx) => { this.shown = true; cx.notify(); });
      return;
    }
    stopsInit(this, cx, "entry");
    // pane.go onto this list (mod.json's "focusable"): the keyboard starts at the heading's button.
    cx.spawn(async (cx) => {
      for (;;) if (await nextCommand() === "focus") enter(this, cx, "ag-sort");
    });
    this.folded = JSON.parse(localStorage.getItem("folded") ?? "{}");
    // Each agent's last state and when it changed (ms), kept across restarts.
    this.changed = JSON.parse(localStorage.getItem("changed") ?? "{}");
    // Older installs kept pins in this list's storage; move them over once, before the inbox writes any.
    if (shared("agents.pins") == null && localStorage.getItem("pins")) setShared("agents.pins", JSON.parse(localStorage.getItem("pins")));
  }

  // Shared with the inbox (t3-inbox): one set of pins.
  get pins() {
    return shared("agents.pins") ?? [];
  }

  isFolded(id, initial = true) {
    return this.folded[id] ?? initial;
  }

  toggleFold(id, cx, initial = true) {
    this.folded[id] = !this.isFolded(id, initial);
    localStorage.setItem("folded", JSON.stringify(this.folded));
    cx.notify();
  }

  // Stamps agents whose state changed. Done and idle count as one: looking at a
  // finished agent turns done into idle, and looking isn't the agent doing anything.
  track(list, now) {
    let dirty = false;
    for (const a of list) {
      const s = a.status === "done" ? "idle" : a.status;
      if (this.changed[a.address]?.s === s) continue;
      this.changed[a.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    // Gone and old: the list alone is empty right after a start.
    const listed = new Set(list.map((a) => a.address));
    for (const [k, c] of Object.entries(this.changed)) if (!listed.has(k) && now - c.at > 30 * 86400000) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }

  setPins(pins) {
    setShared("agents.pins", pins);
  }

  // Drops pins and fold choices of agents that ended. Only for machines the list has heard from:
  // right after a start, or while a machine connects, its agents aren't listed yet.
  prune(all) {
    const machine = (addr) => (addr.includes("/") ? addr.split("/")[0] : "");
    const heard = new Set(all.map((k) => machine(k.address)));
    const live = new Set(all.filter((k) => k.state === "live").map((k) => k.address));
    const kept = this.pins.filter((p) => !heard.has(machine(p)) || live.has(p));
    if (kept.length !== this.pins.length) this.setPins(kept);
    // Group headers (sp-…, sec-…, pinned) fold under the same store; only agents' entries end.
    const ended = Object.keys(this.folded).filter((k) => !/^(sp-|sec-|pinned$)/.test(k) && heard.has(machine(k)) && !live.has(k));
    for (const k of ended) delete this.folded[k];
    if (ended.length) localStorage.setItem("folded", JSON.stringify(this.folded));
  }

  since(a) {
    return this.changed[a.address]?.at ?? 0;
  }

  // Looking at a done agent makes it idle; it stays with Done until you leave
  // it rather than drop away under you. Any other change moves it at once.
  hold(list) {
    const cur = list.find((a) => a.focused);
    const same = cur && cur.address === this.held?.address;
    // Arriving, or any change but done turning idle, sets what it was.
    if (!same || cur.status !== "idle") this.held = cur ? { address: cur.address, rank: RANK[cur.status] ?? 0 } : null;
  }

  word(a) {
    const sawDone = a.address === this.held?.address && this.held.rank === RANK.done && a.status === "idle";
    return sawDone ? "done" : a.status;
  }

  sortMenu(t) {
    const on = sortOf().id;
    const choose = (s) => {
      setShared("agents.sort", s.id);
      closeOverlay(props().overlay);
    };
    return v_flex()
      .id("sort-menu")
      .w_full()
      .p(4)
      .bg(t.popover)
      .text_size(13)
      .opacity(this.shown ? 1 : 0).transition("opacity", MOTION)
      .track_focus(this.keys).on_key_down((e, cx) => {
        if (e.key === "down") this.at = (this.at + 1) % SORTS.length;
        else if (e.key === "up") this.at = (this.at + SORTS.length - 1) % SORTS.length;
        else if (e.key === "enter") { if (this.at >= 0) choose(SORTS[this.at]); }
        else if (e.key === "escape") closeOverlay(props().overlay);
        else {
          const to = menuJump(this, e, SORTS.map((s) => s.label), this.at);
          if (to < 0) return;
          this.at = to;
        }
        cx.stop_propagation();
        cx.notify();
      })
      .child(div().px(8).py(4).text_size(12).font_medium().text_color(t.muted).child("Sort agents"))
      .children(SORTS.map((s, i) => h_flex()
        .id(`sort-${s.id}`)
        .h(28)
        .px(8)
        .gap(8)
        .rounded(6)
        .items_center()
        .text_color(t.foreground)
        .role("button").accessibility_label(s.label)
        .when(i === this.at, el => el.bg(t.selected))
        .on_hover((over, cx) => { if (over && this.at !== i) { this.at = i; cx.notify(); } })
        .on_click(() => choose(s))
        .child(svg(`mods/t3-agents/${s.icon}.svg`).size(14).flex_none().text_color(t.muted))
        .child(div().flex_1().child(s.label))
        .when(s.id === on, (el) => el.child(svg("mods/t3-agents/check.svg").size(14).flex_none().text_color(t.foreground)))));
  }

  peek(addr) {
    run("terminal.peek", { terminal: addr });
  }

  // Live sub-agents of `addr`, depth first, each with the tree lines in front of it.
  tree(all, addr, lead = []) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k, i) => {
      const last = i === kids.length - 1;
      return [
        { t: k, depth: lead.length + 1, lines: [...lead, last ? "└" : "├"] },
        ...this.tree(all, k.address, [...lead, last ? "" : "│"]),
      ];
    });
  }

  subRow(t, s, shown, card) {
    const k = s.t;
    const st = kidStatus(k, this.listed);
    const pic = icon(k.program, 14, t.foreground);
    const on = k.address === shown;
    const name = k.name || k.template || k.program?.name || k.address;
    const rowId = `sub-${k.address}`;
    const over = this.hovered === rowId || within(this, [rowId]);
    return stop(this, t, rowId, h_flex()
      .id(rowId)
      .relative()
      .pl(10 + s.depth * 20)
      .pr(8)
      .rounded(6)
      .h(ROW)
      .flex_none()
      .items_center()
      .gap(10)
      .text_size(13)
      .role("button").accessibility_label(name)
      .when(on, (el) => el.bg(t.selected))
      .when(!on, el => el.hover(s => s.bg(t.hover)))
      .on_hover((over, cx) => {
        if (over) { this.hovered = rowId; detailsFor(this, rowId, cx); }
        else if (this.hovered === rowId) { this.hovered = null; detailsFor(this, null, cx); }
        cx.notify();
      })
      .on_click((_e, cx) => {
        // The peek opens where the card stands: no fade, or the two overlap.
        detailsFor(this, null, cx);
        this.detailsOut = null;
        cx.notify();
        this.peek(k.address);
      })
      .when([this.hovered, this.details, this.detailsOut].includes(rowId), (el) => el.child(card(name, rowId)))
      // Upstream's 9px turn, hung from each ancestor's icon center (18px, then every 20px), ending 4px short of this icon.
      .children(s.lines.flatMap((l, j) => [
        l === "│" || l === "├" ? div().absolute().left(17.25 + 20 * j).top(0).bottom(0).w(1.5).bg(t.input) : null,
        l === "├" || l === "└" ? div().absolute().left(17.25 + 20 * j).top(-4).h(22).w(9.75).border_l(1.5).border_b(1.5).rounded_bl(6).border_color(t.input) : null,
      ].filter(Boolean)))
      .child(h_flex().size(16).flex_none().items_center().justify_center()
        .when(Boolean(pic), el => el.child(pic)))
      .child(h_flex().flex_1().min_w(0).overflow_hidden()
        .child(div().min_w(0).truncate().text_color(on || over ? t.foreground : t.muted).child(name)))
      .child(this.status(t, { status: st }, "", `sub-status-${k.address}`)), 6);
  }

  status(t, a, note = "", id) {
    const color = t[a.status] ?? t.dim;
    let mark;
    if (a.status === "working") mark = svg("mods/workspace-chrome/spinner.svg").size(12).mx(1).flex_none().text_color(t.working).spin(900);
    else if (a.status === "blocked") mark = div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(11).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    // Idle: a ring; done: a dot. Every mark is 14 wide, flush right, so the column ends where Spaces' git info does.
    else if (a.status === "idle") mark = div().size(7).mx(3.5).flex_none().rounded_full().border(1.5).border_color(t.idle ?? t.dim);
    else mark = div().size(7).mx(3.5).flex_none().rounded_full().bg(a.status === "done" ? color : t.dim + "00");
    const label = (SECTION[RANK[a.status]] ?? "Unknown") + note;
    const el = h_flex().size(20).flex_none().items_center().justify_end()
      .role("status").accessibility_label(label).child(mark);
    return id ? tipMark(this, t, `${id}-mark`, label, el.id(id)) : el;
  }

  render(cx) {
    const t = theme();
    if (props()?.sortMenu) return this.sortMenu(t);
    const sort = sortOf();
    let list = agents();
    this.listed = new Map(list.map((a) => [a.address, a.status]));
    const all = terminals();
    const shown = focused()?.agent;
    const ps = panes();
    const now = Date.now();
    // A sub-agent folded away from view lights its nearest listed ancestor, as T3's resolveSidebarRowThreadId does.
    const ancestor = (() => {
      const byAddress = new Map(all.map((k) => [k.address, k])), seen = new Set();
      let k = byAddress.get(shown);
      while (k && !this.listed.has(k.address) && !seen.has(k.address)) { seen.add(k.address); k = byAddress.get(k.parent); }
      return k && this.listed.has(k.address) ? k.address : null;
    })();
    const viewing = (a) => a.focused || (a.address === ancestor && this.isFolded(a.address));
    this.track(list, now);
    this.hold(list);
    const byPriority = sort.id === "priority";
    const under = subAgents(list, all);
    const kidsOf = new Map(list.map((a) => [a.address, under(a.address)]));
    // As shown: its own word with its sub-agents'. Sorted, a viewed done agent keeps Done.
    const own = (a) => ownStatus(a.status, a.address, all);
    const shownStatus = (a) => treeStatus(own(a), kidsOf.get(a.address));
    const urgency = new Map(list.map((a) => [a.address, RANK[treeStatus(ownStatus(this.word(a), a.address, all), kidsOf.get(a.address))] ?? 0]));
    const rankOf = (a) => urgency.get(a.address);
    if (byPriority) list = [...list].sort((x, y) => rankOf(y) - rankOf(x) || this.since(y) - this.since(x) || y.seq - x.seq);
    this.prune(all);
    const pinned = this.pins.map((p) => list.find((a) => a.address === p)).filter(Boolean);
    const rest = list.filter((a) => !this.pins.includes(a.address));
    list = [...pinned, ...rest];
    // Only while this list shows: the inbox (t3-inbox) sets its own.
    const find = (n) => n?.id === "sidebar-lists" ? n : (n?.children ?? []).map(find).find(Boolean);
    if (find(layout())?.active !== "inbox") setAgentOrder(list.map((a) => a.address));

    const withKids = (a, i) => {
      const subs = this.tree(all, a.address);
      const r = { key: a.address, h: ROW, el: row(a, i, subs) };
      // A sub-agent with no pane of its own isn't in agents(): it's placed by the agent it hangs from, and has no branch to name, as its folder may be another worktree.
      const sub = (s) => ({ key: `sub-${s.t.address}`, h: ROW, el: this.subRow(t, s, shown, (name, key) => details(list.find((x) => x.address === s.t.address) ?? { ...s.t, space: a.space, space_name: a.space_name }, name, key)) });
      if (!this.isFolded(a.address)) return [r, ...subs.map(sub)];
      // Folded, a sub-agent that needs the person still shows, hung straight from its parent.
      const stuck = subs.filter((s) => kidStatus(s.t, this.listed) === "blocked");
      return [r, ...stuck.map((s, j) => sub({ t: s.t, depth: 1, lines: [j === stuck.length - 1 ? "└" : "├"] }))];
    };

    // A button's icon and text brighten together: a hover style reaches the text but not the svg, so it's state,
    // as in the inbox. Inside a hovered row a button's own hover fill doesn't show, so this is the cue.
    const glow = (id) => (on, cx) => {
      if (on) this.hot = id;
      else if (this.hot === id) this.hot = null;
      cx.notify();
    };
    const lit = (id) => (this.hot === id ? t.foreground : t.dim);
    // As the shipped agents list: a parent's fold arrow, and folded, the count. Dim: the row's status
    // carries any hidden child's urgency.
    const fold = (a, subs) => {
      const open = !this.isFolded(a.address), id = `fold-${a.address}`;
      return tip(this.hot, t, id, open ? "Collapse sub-agents" : "Expand sub-agents", stop(this, t, id, div()
        .id(id)
        .h(20).min_w(20).flex_none()
        .px(4)
        .gap(3)
        .flex()
        .items_center()
        .justify_center()
        .rounded(4)
        .text_size(11)
        // As T3's row controls, hover only lights it: no ground.
        .role("button").accessibility_label(open ? "Collapse sub-agents" : "Expand sub-agents")
        .text_color(lit(id))
        .on_hover(glow(id))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          this.toggleFold(a.address, cx);
        })
        .child(svg(`mods/t3-agents/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none().text_color(lit(id)))
        .when(!open, (el) => el.child(String(subs.length))), 4));
    };

    // A row's detail is what the agent is on, as the inbox, tabs and pane headers name it.
    const label = namer();
    const detail = new Map(list.map(a => [a.address, /^\d+$/.test(label(a)) ? null : label(a)]));
    const seen = {};
    for (const a of list) { const k = `${a.space_name}\u0000${detail.get(a.address) ?? ""}`; seen[k] = (seen[k] ?? 0) + 1; }
    for (const a of list) {
      if (detail.get(a.address) == null && seen[`${a.space_name}\u0000`] > 1) detail.set(a.address, label(a));
    }

    // A row's details, as t3-inbox's and T3's thread card: on the row's right from its top. A control lit in the row speaks for itself instead.
    // `key`: a sub-agent with a pane is also listed on its own, and each of its rows goes by itself.
    const details = (a, name, key = a.address) => {
      const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
      const branch = ps.find((p) => p.pane === a.pane)?.branch, pic = programIcon(a.program, 12, t.muted);
      const up = this.details === key || this.detailsOut === key;
      return Popup.new(`details-${key}`, div()).absolute().top(-1).right(-1).size(1)
        .when(up && !this.hot, (pop) => pop.content(detailsCard(this, t, key, name, [
          a.space_name && detailsLine(t, projectMark(spaces().find((s) => s.id === a.space) ?? { name: a.space_name }, 12, t, ps), a.space_name),
          machine && detailsLine(t, svg("mods/t3-agents/server.svg").size(12).flex_none().text_color(t.muted), machine),
          branch && detailsLine(t, svg("mods/t3-agents/git-branch.svg").size(12).flex_none().text_color(t.muted), branch),
          pic && detailsLine(t, div().flex_none().opacity(0.6).child(pic), a.program.name),
        ]).ml(4)));
    };

    const row = (a, i, subs = []) => {
      const pic = icon(a.program, 16, t.foreground);
      const more = detail.get(a.address);
      // An agent on another machine (`vps/t7`) says which.
      const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
      const st = shownStatus(a), on = viewing(a);
      const isPinned = this.pins.includes(a.address);
      const pinId = `pin-${a.address}`, rowId = `ag-${a.address}`;
      // Hovered, or with the keyboard on the row or inside it.
      const offer = this.hovered === a.address || within(this, [rowId, pinId, `fold-${a.address}`]);
      // As T3's rows: what you're on or what wants you leads; the rest recede until hovered, a working one fainter still.
      const leads = on || offer || st === "blocked" || st === "done";
      // Over the time's slot on hover, as in the shipped list; the two cross-fade, as T3's corner. Faded out it's no button.
      const pin = div().id(pinId)
        .size(20).flex_none().flex().items_center().justify_center()
        .rounded(4)
        .opacity(offer ? 1 : 0).transition("opacity", MOTION)
        .when(offer, (el) => stop(this, t, pinId, el.role("button")
          .accessibility_label(isPinned ? "Unpin" : "Pin")
          .on_hover(glow(pinId))
          .on_click((_e, cx) => {
            cx.stop_propagation();
            // The row's about to move from under the pointer.
            this.hovered = this.hot = null;
            detailsFor(this, null, cx);
            this.setPins(isPinned ? this.pins.filter((p) => p !== a.address) : [...this.pins, a.address]);
            cx.notify();
          }), 4))
        .child(svg(`mods/t3-agents/${isPinned ? "pin-off" : "pin"}.svg`).size(12).flex_none().text_color(lit(pinId)));
      // A row leads with what the agent is on; an automatic tab number says nothing.
      // Without a space header above (priority, pinned) the space follows, dim, and gives way first.
      const full = byPriority || isPinned;
      const name = full ? more ?? (a.space_name || label(a)) : more ?? (/^\d+$/.test(label(a)) ? a.program?.name || label(a) : label(a));
      const where = full && more && a.space_name && a.space_name !== more ? a.space_name : null;
      // Its sub-agents' word, when it isn't its own, is marked as theirs.
      const fromKid = st !== own(a);
      const when = this.since(a);
      return stop(this, t, rowId, h_flex()
        .id(rowId)
        .relative()
        .w_full().min_w(0)
        // 8 on the right: the status marks stand in the column of the heading's button.
        .pl(10).pr(8)
        .h(ROW)
        .flex_none()
        .rounded(6)
        .items_center()
        .gap(10)
        .opacity(st === "working" && !on && !offer ? 0.7 : 1).transition("opacity", MOTION)
        .when(on, (el) => el.bg(t.selected))
        .role("button").accessibility_label(label(a) || a.program?.name || a.address)
        .when(!on, el => el.hover(s => s.bg(t.hover)))
        .when([this.hovered, this.details, this.detailsOut].includes(a.address), (el) => el.child(details(a, name)))
        .on_hover((over, cx) => {
          if (over) { this.hovered = a.address; detailsFor(this, a.address, cx); }
          else if (this.hovered === a.address) { this.hovered = null; detailsFor(this, null, cx); }
          cx.notify();
        })
        .on_click((_e, cx) => {
          // As a T3 tooltip, a click takes its card down until the pointer comes back.
          detailsFor(this, null, cx);
          run("agent.focus", { terminal: a.address });
        })
        .child(h_flex().id(`agent-fold-${a.address}`).size(16).flex_none().items_center().justify_center()
          .when(subs.length > 0, el => el.role("button").accessibility_label(this.isFolded(a.address) ? "Expand sub-agents" : "Collapse sub-agents").on_click((_e, cx) => {
            cx.stop_propagation();
            this.toggleFold(a.address, cx);
          })).when(Boolean(pic), el => el.child(pic)))
        .child(h_flex().flex_1().min_w(0).gap(8).items_center()
          .child(div().min_w(0).truncate().text_color(leads ? t.foreground : t.muted).child(name))
          .when(Boolean(where), el => el.child(div().flex_1().flex_shrink(1000).min_w(0).truncate().text_size(12).text_color(t.dim).child(where))))
        // As Inbox's cards and T3's: a server mark, the machine named on hover.
        .when(Boolean(machine), el => el.child(tipMark(this, t, `machine-${a.address}`, machine, svg("mods/t3-agents/server.svg").size(12).flex_none().text_color(t.dim))))
        .child(h_flex().id(`controls-${a.address}`).flex_none().items_center().gap(4)
          .when(subs.length > 0, el => el.child(fold(a, subs)))
          // The time and the pin share one slot at least the pin's width, so hovering moves nothing else.
          .child(h_flex().id(`when-${a.address}`).relative().h(20).min_w(20).flex_none().items_center().justify_end()
            .child(div().flex_none().text_size(12).text_color(t.dim).opacity(offer ? 0 : 1).transition("opacity", MOTION).when(Boolean(when), el => el.child(duration(now - when))))
            .child(div().absolute().top(0).right(0).child(tip(this.hot, t, pinId, isPinned ? "Unpin" : "Pin", pin))))
          .child(this.status(t, { status: st }, fromKid ? " (sub-agent)" : "", `status-${a.address}`))), 6);
    };

    // Groups in list order: spaces (grouped) or priority sections. Agents of a
    // space are next to each other in agents(), so neighbours make a group.
    const groups = pinned.length ? [{ id: "pinned", label: "Pinned", status: null, members: pinned }] : [];
    for (const a of rest) {
      const r = rankOf(a) || RANK.idle;
      const id = byPriority ? `sec-${r}` : `sp-${a.space}`;
      if (groups.at(-1)?.id === id) groups.at(-1).members.push(a);
      else groups.push({ id, label: byPriority ? SECTION[r] : a.space_name || "", space: byPriority ? null : a.space, members: [a] });
    }

    const groupHover = (g) => (on, cx) => {
      if (on) this.overGroup = g.id;
      else if (this.overGroup === g.id) this.overGroup = null;
      cx.notify();
    };
    const chevron = (g, open) => div().w(26).flex_none().flex().items_center().justify_center().text_color(this.overGroup === g.id ? t.foreground : t.dim)
      .child(svg(`mods/t3-agents/chevron-${open ? "down" : "right"}.svg`).size(12).flex_none());
    // Drawn as Inbox's shelves, T3's: a dim label, then at the far edge the count and the chevron, in the status column
    // (a 26px slot 2px in, as a machine's), an indicator that lights with its row.
    const shelf = (g, open) => stop(this, t, g.id, h_flex()
      .id(g.id)
      .pl(10).pr(2)
      .h(HEAD)
      .flex_none()
      .gap(4)
      .items_center()
      .text_size(12)
      .font_medium()
      .text_color(t.dim)
      .role("button").accessibility_label(`${open ? "Collapse" : "Expand"} ${g.label}`)
      .on_hover(groupHover(g))
      .on_click((_e, cx) => this.toggleFold(g.id, cx, g.id === "sec-1"))
      .child(div().flex_1().min_w(0).truncate().child(g.label))
      .child(div().flex_none().font_normal().child(String(g.members.length)))
      .child(chevron(g, open)));
    // A space's group, as T3's project folder: its mark and name; closed, how many it hides and a dot if one of them wants you.
    // Right-click: the space's menu, as in Spaces.
    const folder = (g, open) => {
      const hiding = open ? [] : g.members.filter((a) => !viewing(a));
      const top = hiding.map(shownStatus).reduce((m, s) => ((RANK[s] ?? 0) > (RANK[m] ?? 0) ? s : m), null);
      const dot = top && top !== "idle";
      const space = spaces().find((s) => s.id === g.space) ?? { name: g.label };
      return stop(this, t, g.id, h_flex()
        .id(g.id)
        .pl(10).pr(2)
        .h(HEAD)
        .flex_none()
        .gap(10)
        .items_center()
        .rounded(8)
        .hover((s) => s.bg(t.hover))
        .role("button").accessibility_label(`${open ? "Collapse" : "Expand"} ${g.label}`)
        .on_hover(groupHover(g))
        .on_click((_e, cx) => this.toggleFold(g.id, cx, false))
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: g.space } } }))
        .child(projectMark(space, 16, t, ps))
        .child(div().flex_1().min_w(0).truncate().font_medium().text_color(t.foreground + "e6").child(g.label))
        .when(Boolean(dot), (el) => el.child(div().size(6).flex_none().rounded_full().bg(t[top]).role("status").accessibility_label(SECTION[RANK[top]])))
        .when(hiding.length > 0, (el) => el.child(div().flex_none().text_size(12).text_color(t.dim).child(String(hiding.length))))
        .child(chevron(g, open)), 8);
    };
    // A closed group still shows the row you're on, as T3's route row, and hints at the rest.
    const entries = groups.flatMap((g, i) => {
      const open = !this.isFolded(g.id, g.id === "sec-1");
      const head = g.space ? { key: `m:${g.id}`, h: HEAD + (i ? HEAD_GAP : 0), el: div().flex_none().when(i > 0, (el) => el.pt(HEAD_GAP)).child(folder(g, open)) }
        : { key: `m:${g.id}`, h: HEAD, el: shelf(g, open) };
      return [head, ...(open ? g.members : g.members.filter(viewing)).flatMap(withKids)];
    });

    // The list's motion, as t3-inbox's and T3's (Sidebar.motion.ts): when the rows' order changes, a row that moved slides from where
    // it was and a new one fades in from above; 150ms ease-out. Not when a fold or the sort did it, and a change of more than 40 just
    // shows. Herdr eases only later changes to an element: a row that moves gets a new id, first drawn where it was, then let go.
    // shortcut: a row that left just goes, without t3-inbox's fading clone; add one if ended agents' rows feel abrupt here.
    {
      let y = 0;
      const at = new Map(entries.map((e) => { const top = y; y += e.h; return [e.key, top]; }));
      const sig = [...at.keys()].join("\n"), mode = JSON.stringify([sort.id, this.folded]), m = this.motion;
      const fresh = m ? [...at.keys()].filter((k) => !m.at.has(k)) : [];
      if (!m || sig === m.sig || mode !== m.mode || fresh.length > 40) this.motion = { ...m, gen: m?.gen ?? {}, fly: sig === m?.sig && mode === m?.mode ? m.fly : {}, sig, mode, at };
      else {
        const fly = {}, gen = m.gen;
        let riding;
        for (const [k, top] of at) {
          const was = m.at.get(k);
          if (was === undefined) {
            gen[k] = (gen[k] ?? 0) + 1;
            fly[k] = { top: riding ?? -40, fade: true };
            continue;
          }
          riding = was - top;
          if (riding === 0) continue;
          gen[k] = (gen[k] ?? 0) + 1;
          fly[k] = { top: riding };
        }
        const step = (m.step ?? 0) + 1;
        this.motion = { sig, mode, at, gen, fly, step };
        // A frame drawn where they were, then let go.
        cx.timer.after(16, (cx) => { if (this.motion.step !== step) return; this.motion.fly = {}; cx.notify(); });
      }
    }
    // A row no longer drawn has no hover listener, so it never reports the pointer leaving it: forget it, or its card comes back with it.
    const gone = this.hovered;
    if (gone && !entries.some((e) => e.key === gone)) {
      this.hovered = this.hot = null;
      this.detailsWait?.cancel();
      if (this.details === gone) this.details = null;
      if (this.detailsOut === gone) this.detailsOut = null;
    }
    const rows = entries.map((e) => {
      const f = this.motion.fly[e.key];
      return div().id(`fly-${e.key}-${this.motion.gen[e.key] ?? 0}`).flex_none().relative()
        .top(f?.top ?? 0).opacity(f?.fade ? 0 : 1).transition("top", MOTION).transition("opacity", MOTION)
        .child(e.el);
    });

    return focusRoot(this, v_flex()
      .id("t3-agents-root")
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(13)
      .child(
          h_flex()
            .id("agents-heading")
            .pl(18).pr(10)
            .h(31)
            .flex_none()
            .items_center()
            .justify_between()
            .child(div().text_size(12).font_medium().text_color(t.muted).child("Agents"))
            .child(
              tip(this.hot, t, "ag-sort", `Sort agents: ${sort.label}`, stop(this, t, "ag-sort", div()
                .id("ag-sort")
                .size(26).flex_none().flex().items_center().justify_center().rounded(6)
                .role("button").accessibility_label("Sort agents")
                .text_size(11)
                .text_color(lit("ag-sort"))
                .hover((s) => s.bg(t.hover))
                .on_hover(glow("ag-sort"))
                .on_click((_e, cx) => {
                  this.hot = null; // The menu covers it, before the pointer can report leaving it.
                  openOverlay({ mod: "t3-agents", kind: "popup", width: 200, height: 140, props: { sortMenu: true } });
                  cx.notify();
                })
                .child(svg(`mods/t3-agents/${sort.icon}.svg`).size(14)))),
            ),
      )
      .when(list.length === 0, (el) =>
        el.child(div().px(16).text_size(12).text_color(t.dim).child("No agent status yet. Agents show up here when they report their status. Older versions and agents inside tmux may not.")),
      )
      .child(v_flex().id("ag-list").flex_1().min_h(0).px(8).overflow_y_scroll().children(rows)));
  }
}
