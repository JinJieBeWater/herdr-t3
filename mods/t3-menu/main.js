// Context menus, one per thing (docs/research/context-menu-plan.md). Opened as a popup with
// props { tab: "pane" | "tab" | "space" | "agent" | "snooze" | "checkout" | "machine", target }: which thing, not what it offers.
// ↑/↓, Home, End and typeahead move, Enter runs, Esc closes. An item is [label, command, args, hint, group];
// a command "worktree" opens the worktree dialog instead.
// t3-menu: Herdr's menu (mod.clone), with a tab's and a pane's Close going through the tab bar (t3-tabs), which asks first
// while a program runs and leaves first, so Herdr's pick of a neighbour never shows. Beyond the shipped one: T3's measures and
// groups, the list's moves (shared/list.js, the one way every popup's list moves), Copy address and path, close()'s stamp, and
// the agent's, a checkout's and a machine's menus with the Snooze times.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, props, closeOverlay, openOverlay, theme, keys, terminals, agents, spaces, panes, exec, setShared, layout } from "herdr";
import { menuJump } from "./list.js";
import { openMenu } from "./menu.js";
import { placeOf } from "./project.js";
import { presets } from "./snooze-presets.js";
import { ownStatus, stillSettled, subAgents, treeStatus } from "./tree.js";
import { pinList } from "./pins.js";
import { sidebarParts } from "./sidebar.js";

// Where a space is now: its first terminal's live folder, else where it was made.
function place(s) {
  const tabs = new Set((s.tabs ?? []).map((c) => c.id));
  return panes().find((p) => tabs.has(p.tab) && p.cwd)?.cwd || s.folder;
}

// A space's checkout: "main" (a repo's own), "linked" (a worktree), or null.
async function checkout(folder, on) {
  const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: folder, on });
  const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd: folder, on });
  if (top.code !== 0 || common.code !== 0) return null;
  return common.stdout.trim() === `${top.stdout.trim()}/.git` ? "main" : "linked";
}

// The nearest live agent above `address`, through what isn't one (a shell between them), as the tab bar reads it.
function above(address, all, every) {
  const byAddress = new Map(all.map((k) => [k.address, k])), seen = new Set();
  let k = byAddress.get(byAddress.get(address)?.parent);
  while (k?.state === "live" && !seen.has(k.address)) {
    const a = every.find((x) => x.address === k.address);
    if (a) return a;
    seen.add(k.address);
    k = byAddress.get(k.parent);
  }
  return null;
}

// An agent's menu, wherever it's right-clicked (an Inbox card, an Agents row, the tab bar's title): what it can do now, as
// T3's thread actions. Settle and Snooze are the Inbox's (docs/adr/0002): with Lists chosen they aren't offered.
function agentItems(address) {
  const all = terminals(), every = agents(), k = all.find((t) => t.address === address), a = every.find((x) => x.address === address);
  if (!k) return [];
  const inbox = sidebarParts(layout()).stack?.active !== "lists";
  const kids = subAgents(every, all)(address), own = ownStatus(a?.status, address, all);
  const busy = [own, ...kids].some((s) => s === "working" || s === "blocked");
  const parent = k.parent && all.find((t) => t.address === k.parent);
  const head = a && above(address, all, every);
  // Rename names the tab: only for its lone agent, whose name the tab's would be, and not when Pi names it (name.js).
  const heads = a ? every.filter((x) => x.tab === a.tab && above(x.address, all, every)?.tab !== a.tab) : [];
  const rename = heads.length === 1 && heads[0] === a && !k.labels?.["pi.session"];
  const pinned = pinList().includes(address), napping = Number(k.labels?.snoozed) > Date.now();
  // The settle key acts on the agent in view, so its key shows only there.
  const inView = every.find((x) => x.focused)?.address === address;
  return grouped(
    [
      ...(a && !head ? [[pinned ? "Unpin" : "Pin", `t3-tabs.${pinned ? "unpin" : "pin"}:${address}`, {}]] : []),
      ...(inbox && a && !busy ? [[stillSettled(k, own, kids) ? "Un-settle" : "Settle", `t3-tabs.settle:${address}`, {}, inView ? shortcut("t3-tabs.settle") : ""]] : []),
      ...(inbox && a ? napping ? [["Wake", `t3-tabs.wake:${address}`, {}]] : treeStatus(own, kids) !== "blocked" ? [["Snooze", "snooze", { address }]] : [] : []),
    ],
    [
      ...(rename ? [["Rename", "tab.rename", { id: a.tab }]] : []),
      ["Copy address", "copy", { text: address }],
      ...(parent ? [[`Send back to ${parent.name || parent.address}`, "terminal.park", { terminal: address }]] : []),
    ],
    a ? [["Close", "pane.close", { pane: a.pane }]] : [],
  );
}

// Groups in T3's order (where to, state, names and copies, worktrees, ending), a rule between two that show. An item is
// [label, command, args, hint, group]; a hint of "" shows none.
const grouped = (...groups) => groups.flatMap((g, n) => g.map((it) => [it[0], it[1], it[2], it[3], n]));

function items(p, git) {
  p = p ?? {};
  const tg = p.target ?? {};
  switch (p.tab) {
    case "pane": {
      // A kept sub-agent can go back under its parent, still running.
      const all = terminals();
      const term = all.find((t) => t.address === tg.terminal);
      const parent = term?.parent && all.find((t) => t.address === term.parent);
      // Once they go to the program, Shift+right-click still opens this menu.
      const toProgram = term?.labels?.["herdr.right-click"] === "program";
      // A terminal shown outside a tab (a layout terminal block, a window) has
      // no pane to split, zoom or close: its pane is the block's id.
      const inTab = panes().some((pane) => pane.pane === tg.pane);
      return grouped(
        inTab
          ? [
              ["Split right", "pane.split", { direction: "right", pane: tg.pane }],
              ["Split down", "pane.split", { direction: "down", pane: tg.pane }],
              ["Zoom", "pane.zoom", { pane: tg.pane }],
            ]
          : [],
        [
          // To tell an agent which terminal: the address shows where a key would.
          ...(term ? [["Copy address", "copy", { text: term.address }]] : []),
          ...(term
            ? [
                toProgram
                  ? ["Use Herdr right-click menu", "terminal.right_click", { terminal: term.address, to: "menu" }]
                  : ["Send right-clicks to pane", "terminal.right_click", { terminal: term.address, to: "program" }],
              ]
            : []),
          ...(parent ? [[`Send back to ${parent.name || parent.address}`, "terminal.park", { terminal: term.address }]] : []),
        ],
        inTab ? [["Close pane", "pane.close", { pane: tg.pane }]] : [],
      );
    }
    case "tab": {
      // Where its space is now, as the space's mark and folder say; with no space named, tab.new takes the active one.
      const sp = spaces().find((s) => (tg.space ? s.id === tg.space : s.active));
      return grouped(
        [["New tab", "tab.new", { space: tg.space, folder: sp && placeOf(sp, panes()) }]],
        [["Rename", "tab.rename", { id: tg.id }]],
        [["Close", "tab.close", { id: tg.id }]],
      );
    }
    case "agent":
      return agentItems(tg.address);
    // Its Snooze: the card's times, when each wakes on the right, then Custom (the Inbox's dialog).
    case "snooze":
      return grouped(presets(Date.now()).map((p) => [p.label, `t3-tabs.snooze:${tg.address}:${p.at}`, {}, p.when]), [["Custom…", "custom-snooze", { address: tg.address }]]);
    case "space": {
      const s = spaces().find((s) => s.id === tg.id);
      const folder = s && place(s);
      return grouped(
        [["New tab", "tab.new", { space: tg.id, folder }]],
        [["Rename", "space.rename", { id: tg.id }], ...(folder ? [["Copy path", "copy", { text: folder }, ""]] : [])],
        git ? [["New worktree", "worktree", { space: tg.id, action: "new" }], ["Open worktree", "worktree", { space: tg.id, action: "open" }]] : [],
        [...(git === "linked" ? [["Remove worktree", "worktree", { space: tg.id, action: "remove" }]] : []), ["Close", "space.close", { id: tg.id }]],
      );
    }
    // A repo's checkout with no space open: the dim row in Spaces, as T3's project folder (New thread, Copy path).
    case "checkout":
      return grouped([["Open", "space.new", { folder: tg.folder, machine: tg.machine ?? "" }]], [["Copy path", "copy", { text: tg.folder }, ""]]);
    // A machine's heading in Spaces: its + and, when its core was rebuilt, its Connect.
    case "machine":
      return grouped([
        ...(tg.connected ? [["New space here", "space.new", { machine: tg.machine ?? "" }]] : []),
        ...(tg.connect ? [["Connect", `t3-spaces.reconnect:${tg.machine}`, {}]] : []),
      ]);
    default:
      return [];
  }
}

// Null: a Snooze time, drawn as the card's menu draws them, with none.
function menuIcon(command, label, args) {
  if (command === "copy") return "mods/t3-menu/icons/copy.svg";
  if (command.startsWith("t3-tabs.snooze:") || command === "custom-snooze") return null;
  const own = command.startsWith("t3-tabs.settle") ? (label === "Settle" ? "check" : "undo") : command.startsWith("t3-tabs.pin:") ? "pin"
    : command.startsWith("t3-tabs.unpin:") ? "pin-off" : command === "snooze" ? "alarm-clock" : command.startsWith("t3-tabs.wake:") ? "alarm-clock-off" : null;
  if (own) return `mods/t3-menu/icons/${own}.svg`;
  const name = command.endsWith(".close") ? "x" : command.endsWith(".rename") ? "square-pen" : command === "space.new" && args?.folder ? "folder"
    : command.endsWith(".new") ? "plus" : command === "worktree" ? (args?.action === "remove" ? "x" : "git-branch") : command.startsWith("t3-spaces.reconnect:") ? "server"
    : command === "pane.split" ? "panel-right" : command === "pane.zoom" ? "square" : "terminal";
  return `mods/workspace-chrome/${name}.svg`;
}

// The key bound to a command, for the hint on the right.
function shortcut(name, args) {
  // `pane.split:right` binds pane.split with { direction: "right" }.
  const value = args && Object.values(args)[0];
  // A layout's own keys too: Settle's is the herdr-t3 layout's.
  const k = keys().find((b) => (b.section === "global" || b.section?.startsWith("layout:")) && (b.action === name || b.action === `${name}:${value}`));
  return k ? k.keys : "";
}

export default class Menu extends View {
  init(_props, cx) {
    // As T3's, nothing is lit until a key or the pointer gets there.
    this.at = -1;
    this.git = null;
    this.handle = cx.focus_handle();
    this.handle.focus();
    const p = props();
    const space = p?.tab === "space" && spaces().find((s) => s.id === p.target?.id);
    const folder = space && place(space);
    if (folder)
      cx.spawn(async (cx) => {
        this.git = await checkout(folder, space.machine).catch(() => null);
        cx.notify();
      });
  }

  // For the control that opened it: a press on it that closed this mustn't reopen it (justClosed in focus.js).
  async close() {
    setShared("t3-menu.closed", Date.now());
  }

  choose(i, cx) {
    const it = /** @type {any} */ (items(props(), this.git)[i]);
    if (!it) return;
    closeOverlay(props()?.overlay);
    if (it[1] === "worktree") openOverlay({ mod: "worktree", kind: "dialog", ...(it[2].action === "open" ? { width: 560, height: 480 } : { width: 440, height: 260 }), props: it[2] });
    // The item keeps Herdr's command, for its icon, its divider and its key; only where it goes changes.
    else if (it[1] === "tab.close") run(`t3-tabs.close-tab:${it[2].id}`);
    else if (it[1] === "pane.close") run(`t3-tabs.close-pane:${it[2].pane}`);
    else if (it[1] === "copy") cx.write_to_clipboard(it[2].text);
    // Its times, where the pointer is: on this row.
    else if (it[1] === "snooze") openMenu(null, "snooze", { address: it[2].address }, cx);
    else if (it[1] === "custom-snooze") openOverlay({ mod: "t3-inbox", kind: "dialog", frame: "none", width: 384, props: { customSnooze: it[2].address, answer: "t3-tabs.snooze" } });
    else run(it[1], it[2]);
  }

  render() {
    const t = theme();
    const list = items(props(), this.git);
    return v_flex()
      .id("menu")
      .track_focus(this.handle)
      .w_full()
      .min_h(0)
      .p(4)
      .bg(t.popover)
      .text_size(14)
      .on_key_down((e, cx) => {
        if (e.key === "enter") { if (this.at >= 0) this.choose(this.at, cx); }
        else if (e.key === "escape") closeOverlay(props().overlay);
        else {
          const to = menuJump(this, e, list.map((it) => it[0]), this.at);
          if (to < 0) return;
          this.at = to;
        }
        cx.notify();
      })
      .children(
        list.map((it, i) =>
          v_flex()
            .when(i > 0 && list[i - 1][4] !== it[4], el => el.child(div().mx(8).my(4).h(1).bg(t.border)))
            .child(h_flex()
            .id(`mi-${i}`)
            .h(28)
            .px(8)
            .gap(8)
            .rounded(4)
            .items_center()
            .justify_between()
            // Only what deletes something is red, in words, as T3's destructive item: a Close asks first while a program runs.
            .text_color(it[1] === "worktree" && it[2].action === "remove" ? t.ansi1 : t.foreground)
            .when(i === this.at, (el) => el.bg(t.selected))
            .on_hover((on, cx) => { const to = on ? i : this.at === i ? -1 : this.at; if (to !== this.at) { this.at = to; cx.notify(); } })
            .on_click((_e, cx) => this.choose(i, cx))
            // As T3's MenuItem: the icon hangs 2px into each side's padding and gap.
            .when(Boolean(menuIcon(it[1], it[0], it[2])), (el) => el.child(svg(menuIcon(it[1], it[0], it[2])).size(16).mx(-2).flex_none().text_color(t.muted)))
            .child(div().flex_1().min_w(0).truncate().child(it[0]))
            .child(div().flex_none().text_size(12).font_medium().text_color(t.dim).child(it[3] ?? (it[1] === "copy" ? it[2].text : shortcut(it[1], it[2]))))),
        ),
      );
  }
}
