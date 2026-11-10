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
const theme = { selected: "#selected", hover: "#hover" };
let target = {}, calls = [];
const context = vm.createContext({
  View: class {}, div: el, svg: el, v_flex: el, h_flex: el,
  run: (name, args) => calls.push(args === undefined ? [name] : [name, args]), props: () => target, closeOverlay() {}, openOverlay: (spec) => calls.push(["overlay", spec]),
  theme: () => theme, keys: () => [], settings: () => ({ zoom: 1 }), terminals: () => [{ address: "t1", labels: {} }], spaces: () => [{ id: "s1", folder: "/work/p1", tabs: [{ id: "b1" }] }], panes: () => [{ pane: "p1", tab: "b1", cwd: "/work/s1" }], exec: async () => ({ code: 1 }),
});
const src = ["project.js", "list.js", "snooze-presets.js", "main.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n")
  .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Menu = class").replace(/^export /gm, "");
vm.runInContext(src, context);
const cx = { notify() {}, stop_propagation() {}, spawn() {}, focus_handle: () => ({ focus() {} }) };
const menu = new context.Menu();
const choose = (props, label) => {
  target = props; calls = [];
  const i = vm.runInContext("items", context)(props, null).findIndex((it) => it[0] === label);
  menu.choose(i, { write_to_clipboard: (text) => calls.push(["clipboard", text]) });
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

// The Inbox breadcrumb title's menu: what the agent's card offers, by what t3-tabs found it can do; Snooze opens its times.
{
  const items = vm.runInContext("items", context), labels = (p) => JSON.parse(JSON.stringify(items(p, null).map((it) => it[0]))), agent = (more) => ({ tab: "agent", target: { address: "t1", settle: "Settle", snooze: true, pinned: false, rename: null, ...more } });
  assert.deepEqual(labels(agent()), ["Pin", "Snooze", "Settle"]);
  assert.deepEqual(labels(agent({ settle: null, snooze: false, pinned: true, rename: "b1" })), ["Rename", "Unpin"], "busy and needing you: neither Settle nor Snooze");
  assert.deepEqual(choose(agent(), "Settle"), [["t3-tabs.settle", {}]], "Settle is the key's, on the agent in view");
  assert.deepEqual(choose(agent({ settle: "Un-settle" }), "Un-settle"), [["t3-tabs.settle", {}]]);
  assert.deepEqual(choose(agent(), "Pin"), [["t3-tabs.pin:t1", {}]]);
  assert.deepEqual(choose(agent({ pinned: true }), "Unpin"), [["t3-tabs.unpin:t1", {}]], "Unpin with its Undo");
  const snooze = choose(agent(), "Snooze");
  assert.deepEqual(JSON.parse(JSON.stringify(snooze.map((c) => [c[0], c[1].mod, c[1].props]))), [["overlay", "t3-menu", { tab: "snooze", target: { address: "t1" } }]], "its times, as the card's Snooze menu");
  const times = items({ tab: "snooze", target: { address: "t1" } }, null);
  // Soonest first, so from 5 to 6 pm This evening leads: compare with the presets at this time, not a fixed label.
  assert.equal(times[0][0], vm.runInContext("presets", context)(Date.now())[0].label);
  assert.ok(times.some((t) => t[0] === "In 1 hour"));
  assert.match(times[0][1], /^t3-tabs\.snooze:t1:\d+$/);
  assert.ok(times[0][3], "the time it wakes, on the right");
  assert.deepEqual(choose({ tab: "snooze", target: { address: "t1" } }, "Custom…").map((c) => [c[1].mod, c[1].props]), [["t3-inbox", { customSnooze: "t1", answer: "t3-tabs.snooze" }]], "Custom is the Inbox's dialog, answering the tab bar");
}

// A tab's menu (Rename, New tab, Close), opened by a right-click, moves as every popup's list (shared/list.js).
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
  key({ key: "n", key_char: "n", modifiers: {} });
  assert.deepEqual(lit(), [1], "typing finds New tab");
  key({ key: "up" });
  assert.deepEqual(lit(), [0]);
}
console.log("ok menu");
