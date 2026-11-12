// Loads the menu in a fake `herdr`: a tab's and a pane's Close go through the tab bar; the rest is Herdr's own; its list moves as every popup's.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// An element that keeps what it's given: its id, children, handlers and style.
function el() {
  const node = { items: [], handlers: {}, style: {} };
  const proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === "when") { if (args[0]) args[1](proxy); }
      else if (key === "child") node.items.push(args[0]);
      else if (key === "children") node.items.push(...args[0]);
      else if (key === "id") node.key = args[0];
      else if (key.startsWith("on_")) node.handlers[key] = args[0];
      else node.style[key] = args.length === 1 ? args[0] : args;
      return proxy;
    };
  } });
  return proxy;
}
const find = (node, id) => !node || typeof node !== "object" ? null : node.key === id ? node : node.items.map((c) => find(c, id)).find(Boolean) ?? null;
const theme = { selected: "#selected", hover: "#hover", foreground: "#fg", ansi1: "#red" };
let target = {}, calls = [], state = {}, list = "inbox";
let terms = [{ address: "t1", labels: {} }], agentList = [];
const context = vm.createContext({
  View: class {}, div: el, svg: el, v_flex: el, h_flex: el,
  run: (name, args) => calls.push(args === undefined ? [name] : [name, args]), props: () => target, closeOverlay() {}, openOverlay: (spec) => calls.push(["overlay", spec]),
  theme: () => theme, keys: () => [], settings: () => ({ zoom: 1 }), terminals: () => terms, agents: () => agentList, spaces: () => [{ id: "s1", folder: "/work/p1", tabs: [{ id: "b1" }] }], panes: () => [{ pane: "p1", tab: "b1", cwd: "/work/s1" }], exec: async () => ({ code: 1 }),
  shared: (k) => state[k], setShared: (k, v) => { state[k] = v; }, hc: async () => ({ code: 0 }), notify() {},
  layout: () => ({ id: "root", children: [{ id: "sidebar-lists", active: list, children: [] }] }),
});
const src = ["store.js", "labels.js", "pins.js", "tree.js", "sidebar.js", "menu.js", "project.js", "list.js", "snooze-presets.js", "main.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n")
  .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Menu = class").replace(/^export /gm, "");
vm.runInContext(src, context);
const cx = { notify() {}, stop_propagation() {}, spawn() {}, focus_handle: () => ({ focus() {} }) };
const menu = new context.Menu();
const choose = (props, label) => {
  target = props; calls = [];
  const i = vm.runInContext("items", context)(props, null).findIndex((it) => it[0] === label);
  menu.choose(i, { stop_propagation() {}, write_to_clipboard: (text) => calls.push(["clipboard", text]) });
  return JSON.parse(JSON.stringify(calls));
};

assert.deepEqual(choose({ tab: "tab", target: { id: "b1", space: "s1" } }, "Close"), [["t3-tabs.close-tab:b1"]], "a tab's Close asks and leaves first");
assert.deepEqual(choose({ tab: "pane", target: { pane: "p1", terminal: "t1" } }, "Close pane"), [["t3-tabs.close-pane:p1"]], "so does a pane's");
assert.deepEqual(choose({ tab: "pane", target: { pane: "p1", terminal: "t1" } }, "Copy address"), [["clipboard", "t1"]], "Copy address puts the terminal's address on the clipboard");
assert.ok(!vm.runInContext("items", context)({ tab: "pane", target: { pane: "p1" } }, null).some((it) => it[0] === "Copy address"), "a mod pane has no address to copy");
const block = vm.runInContext("items", context)({ tab: "pane", target: { pane: "block", terminal: "t1" } }, null).map((it) => it[0]);
assert.ok(block.includes("Copy address") && !["Split right", "Split down", "Zoom", "Close pane"].some((l) => block.includes(l)), "a terminal outside a tab has no pane to split, zoom or close");
assert.deepEqual(choose({ tab: "tab", target: { id: "b1", space: "s1" } }, "Rename"), [["tab.rename", { id: "b1" }]], "the rest is Herdr's");
assert.deepEqual(choose({ tab: "tab", target: { id: "b1", space: "s1" } }, "New tab"), [["tab.new", { space: "s1", folder: "/work/s1" }]], "New tab opens where the space's terminals are, not where it was made");
assert.deepEqual(choose({ tab: "space", target: { id: "s1" } }, "Close"), [["space.close", { id: "s1" }]], "a space's Close is Herdr's, which asks itself");

// An agent's menu, the same from a card, an Agents row or the tab bar's title: what it can do now, read from the agent itself.
{
  const items = vm.runInContext("items", context), labels = () => JSON.parse(JSON.stringify(items({ tab: "agent", target: { address: "t1" } }, null).map((it) => it[0])));
  const groups = () => JSON.parse(JSON.stringify(items({ tab: "agent", target: { address: "t1" } }, null).map((it) => it[4])));
  const agent = (more = {}, labels = {}) => {
    agentList = [{ address: "t1", pane: "p1", tab: "b1", status: "done", focused: true, ...more }];
    terms = [{ address: "t1", state: "live", turn: 2, labels }];
  };
  agent();
  assert.deepEqual(labels(), ["Pin", "Settle", "Snooze", "Rename", "Copy address", "Close"]);
  assert.deepEqual(groups(), [0, 0, 0, 1, 1, 2], "state, then names and copies, then Close: a rule between");
  agent({ status: "working" });
  assert.deepEqual(labels(), ["Pin", "Snooze", "Rename", "Copy address", "Close"], "busy: no Settle");
  agent({ status: "blocked" });
  assert.deepEqual(labels(), ["Pin", "Rename", "Copy address", "Close"], "needing you: neither Settle nor Snooze");
  agent({}, { settled: "1:2" });
  assert.ok(labels().includes("Un-settle"), "settled since its last turn");
  agent({}, { snoozed: String(Date.now() + 3600000) });
  assert.deepEqual(labels().slice(0, 3), ["Pin", "Settle", "Wake"], "snoozed: Wake");
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Wake"), [["t3-tabs.wake:t1", {}]]);
  agent({}, { "pi.session": "x" });
  assert.ok(!labels().includes("Rename"), "Pi names the tab");
  agent();
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Settle"), [["t3-tabs.settle:t1", {}]], "the agent it was opened on, in view or not");
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Pin"), [["t3-tabs.pin:t1", {}]]);
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Close"), [["t3-tabs.close-pane:p1"]], "its pane, asking first");
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Copy address"), [["clipboard", "t1"]]);
  state["t3.pins"] = ["t1"];
  assert.equal(labels()[0], "Unpin");
  assert.deepEqual(choose({ tab: "agent", target: { address: "t1" } }, "Unpin"), [["t3-tabs.unpin:t1", {}]], "Unpin with its Undo");
  delete state["t3.pins"];
  list = "lists";
  assert.deepEqual(labels(), ["Pin", "Rename", "Copy address", "Close"], "Settle and Snooze are the Inbox's (docs/adr/0002)");
  list = "inbox";
  // A sub-agent kept in the tab beside its parent: no pin or rename of its own, and it can go back.
  agentList = [{ address: "t1", pane: "p1", tab: "b1", status: "working" }, { address: "t2", pane: "p2", tab: "b1", status: "done", focused: true }];
  terms = [{ address: "t1", name: "lead", state: "live", labels: {} }, { address: "t2", parent: "t1", state: "live", labels: {} }];
  assert.deepEqual(JSON.parse(JSON.stringify(items({ tab: "agent", target: { address: "t2" } }, null).map((it) => it[0]))), ["Settle", "Snooze", "Copy address", "Send back to lead", "Close"]);
  // One with no pane (a sub-agent the parent still holds): only its address.
  terms = [{ address: "t1", state: "live", labels: {} }, { address: "t3", parent: "t1", state: "live", labels: {} }];
  assert.deepEqual(JSON.parse(JSON.stringify(items({ tab: "agent", target: { address: "t3" } }, null).map((it) => it[0]))), ["Copy address", "Send back to t1"]);
  terms = [{ address: "t1", labels: {} }]; agentList = [];
  const snooze = choose({ tab: "agent", target: { address: "t1" } }, "Snooze");
  assert.deepEqual(snooze, [], "gone: nothing");
  agent();
  assert.deepEqual(JSON.parse(JSON.stringify(choose({ tab: "agent", target: { address: "t1" } }, "Snooze").map((c) => [c[0], c[1].mod, c[1].props]))), [["overlay", "t3-menu", { tab: "snooze", target: { address: "t1" } }]], "its times, as the card's Snooze menu");
  const times = items({ tab: "snooze", target: { address: "t1" } }, null);
  // Soonest first, so from 5 to 6 pm This evening leads: compare with the presets at this time, not a fixed label.
  assert.equal(times[0][0], vm.runInContext("presets", context)(Date.now())[0].label);
  assert.ok(times.some((t) => t[0] === "In 1 hour"));
  assert.match(times[0][1], /^t3-tabs\.snooze:t1:\d+$/);
  assert.ok(times[0][3], "the time it wakes, on the right");
  assert.deepEqual(choose({ tab: "snooze", target: { address: "t1" } }, "Custom…").map((c) => [c[1].mod, c[1].props]), [["t3-inbox", { customSnooze: "t1", answer: "t3-tabs.snooze" }]], "Custom is the Inbox's dialog, answering the tab bar");
  terms = [{ address: "t1", labels: {} }]; agentList = [];
}

// A space's, a checkout's and a machine's.
{
  const items = vm.runInContext("items", context), labels = (p, git = null) => JSON.parse(JSON.stringify(items(p, git).map((it) => it[0])));
  assert.deepEqual(labels({ tab: "space", target: { id: "s1" } }), ["New tab", "Rename", "Copy path", "Close"]);
  assert.deepEqual(labels({ tab: "space", target: { id: "s1" } }, "linked"), ["New tab", "Rename", "Copy path", "New worktree", "Open worktree", "Remove worktree", "Close"]);
  assert.deepEqual(choose({ tab: "space", target: { id: "s1" } }, "Copy path"), [["clipboard", "/work/s1"]], "where it is now");
  assert.deepEqual(choose({ tab: "space", target: { id: "s1" } }, "New tab"), [["tab.new", { space: "s1", folder: "/work/s1" }]]);
  assert.deepEqual(labels({ tab: "checkout", target: { folder: "/work/r", machine: null } }), ["Open", "Copy path"]);
  assert.deepEqual(choose({ tab: "checkout", target: { folder: "/work/r", machine: null } }, "Open"), [["space.new", { folder: "/work/r", machine: "" }]]);
  assert.deepEqual(labels({ tab: "machine", target: { machine: "vps", connected: true, connect: false } }), ["New space here"]);
  assert.deepEqual(choose({ tab: "machine", target: { machine: "vps", connected: false, connect: true } }, "Connect"), [["t3-spaces.reconnect:vps", {}]]);
  assert.deepEqual(labels({ tab: "global" }), [], "no menu for nothing in particular");
  // Drawn: a rule between groups only, and only Remove worktree in red.
  const m = new context.Menu();
  m.git = "linked";
  target = { tab: "space", target: { id: "s1" } };
  const tree = m.render(), rows = tree.items;
  assert.deepEqual(rows.map((r) => r.items.length), [1, 2, 1, 2, 1, 2, 1], "a rule before Rename, New worktree and Remove worktree");
  assert.deepEqual(rows.map((r) => r.items.at(-1).style.text_color), ["#fg", "#fg", "#fg", "#fg", "#fg", "#red", "#fg"]);
}

// A tab's menu (New tab, Rename, Close), opened by a right-click, moves as every popup's list (shared/list.js).
{
  target = { tab: "tab", target: { id: "b1", space: "s1" } };
  const m = new context.Menu();
  m.init(target, cx);
  const lit = () => [0, 1, 2].filter((i) => find(m.render(), `mi-${i}`).style.bg === theme.selected);
  const key = (e) => { calls = []; find(m.render(), "menu").handlers.on_key_down(e, cx); return JSON.parse(JSON.stringify(calls)); };
  assert.deepEqual(lit(), [], "as T3's, nothing lit until a key or the pointer gets there");
  assert.deepEqual(key({ key: "enter" }), [], "so Enter runs nothing");
  // The pointer on Close lights Close alone, and Enter runs what's lit.
  find(m.render(), "mi-2").handlers.on_hover(true, cx);
  assert.deepEqual(lit(), [2], "one row lit, the pointer's");
  assert.equal(find(m.render(), "mi-2").style.hover, undefined, "no second light of its own");
  assert.deepEqual(key({ key: "enter" }), [["t3-tabs.close-tab:b1"]]);
  find(m.render(), "mi-2").handlers.on_hover(false, cx);
  assert.deepEqual(lit(), [], "leaving the row clears it, as the Snooze menu's");
  key({ key: "end" });
  assert.deepEqual(lit(), [2]);
  key({ key: "home" });
  assert.deepEqual(lit(), [0]);
  key({ key: "r", key_char: "r", modifiers: {} });
  assert.deepEqual(lit(), [1], "typing finds Rename");
  key({ key: "up" });
  assert.deepEqual(lit(), [0]);
}
console.log("ok menu");
