// Loads Go to in a fake `herdr`: a row a pane, the ones you were in lately first, found by its name and program, not an unnamed tab's.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element() {
  const node = { items: [], handlers: {} };
  const proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === "when") { if (args[0]) args[1](proxy); }
      else if (key === "child") node.items.push(args[0]);
      else if (key === "children") node.items.push(...args[0]);
      else if (key === "on_key_down") node.handlers.key = args[0];
      else if (key === "on_click") node.handlers.click = args[0];
      else if (key === "id") node.key = args[0];
      else if (key === "opacity") node.opacity = args[0];
      else if (key === "bg") node.fill = args[0];
      else if (key === "tab_index") node.tabIndex = args[0];
      return proxy;
    };
  } });
  return proxy;
}
const find = (node, id) => {
  if (!node || typeof node !== "object") return null;
  if (node.key === id) return node;
  for (const child of node.items) { const found = find(child, id); if (found) return found; }
  return null;
};

const pi = { name: "Pi", key: "pi", agent: true }, git = { name: "Git Changes", key: "lazygit", agent: false };
const zsh = { name: "zsh", key: "shell", shell: true }, vite = { name: "Vite", key: "vite", agent: false };
// The current space comes first wherever it is in the list.
const spaces = [
  { id: "s2", name: "api", machine: null, active: false, tabs: [{ id: "c2", name: "herdr worktree", named: false, active: true }] },
  { id: "s1", name: "web", machine: null, active: true, tabs: [{ id: "c1", name: "Fix login", named: true, active: true }] },
];
const panes = [
  { pane: "p4", tab: "c2", terminal: "t4", program: vite, focused: true },
  { pane: "p1", tab: "c1", terminal: "t1", program: pi, status: "working", focused: true },
  { pane: "p2", tab: "c1", terminal: "t2", program: git, focused: false },
  { pane: "p3", tab: "c1", terminal: "t3", program: zsh, focused: false },
];
const shared = {}, calls = [];
let terms = [];
const cx = { notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() {}, is_focused: () => false }) };
const context = vm.createContext({
  View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element, Input: { new: element },
  InputState: { new: () => { const on = {}; let value = ""; return { on: (e, f) => { on[e] = f; }, value: () => value, focus() {}, type(v) { value = v; on.change({}, cx); }, submit() { on.submit(); } }; } },
  settings: () => ({ zoom: 1 }),
  spaces: () => spaces, panes: () => panes, agents: () => [], terminals: () => terms, window: () => ({ platform: "macos" }),
  focused: () => ({ pane: panes.find((p) => p.focused && spaces.find((s) => s.active).tabs.some((c) => c.id === p.tab)).pane }),
  run: (name, args) => calls.push([name, args]), theme: () => ({ done: "#done" }), props: () => ({ overlay: "o" }), closeOverlay() {},
  shared: (k) => shared[k], setShared: (k, v) => { shared[k] = v; },
  namer: () => (p) => p.program.name, programOf: (p) => p.program, modStatus: () => null, projectMark: element,
});
const src = ["store.js", "tree.js", "list.js", "zoom.js", "focus.js", "program.js", "main.js"].map((f) => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n").replace(/^import .*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ").replace("export default class", "globalThis.Mod = class");
vm.runInContext(src, context);
const open = () => { const m = new context.Mod(); m.init({}, cx); return m; };
const keys = (m) => find(m.render(), "picker-rows")?.items.map((n) => n.key) ?? [];
const take = () => JSON.parse(JSON.stringify(calls.splice(0)));

// Every pane has a row: the ones you were in lately first, newest first, then the current space's, then the rest; the pane you're in
// last. With none kept yet, Enter goes to the first other pane, not nowhere.
let m = open();
assert.deepEqual(keys(m), ["pane:p2", "pane:p3", "pane:p4", "pane:p1"]);
m.input.submit();
assert.deepEqual(take(), [["pane.focus", { pane: "p2" }]]);
// The tab bar keeps where you were (t3-tabs.recent, the pane you're in first): ⌘P, Enter goes back to the one before, however you left it.
shared["t3-tabs.recent"] = ["p1", "p4", "p9", "p3"];
m = open();
assert.deepEqual(keys(m), ["pane:p4", "pane:p3", "pane:p2", "pane:p1"], "a pane that's gone is skipped");
m.input.submit();
assert.deepEqual(take(), [["pane.focus", { pane: "p4" }]]);
assert.equal(shared["t3-picker.back"], undefined, "Go to keeps nothing of its own");
delete shared["t3-tabs.recent"];

// Typing its program picks its row; Enter goes to its pane.
m = open(); m.input.type("lazygit"); m.render(); m.input.submit();
assert.deepEqual(take(), [["pane.focus", { pane: "p2" }]]);
// A name that matches goes before a folder or space that does.
panes[0].cwd = "/work/pi-tools";
m = open(); m.input.type("pi");
assert.deepEqual(keys(m), ["pane:p1", "pane:p4"]);
delete panes[0].cwd;

// Another space's program by its program; an unnamed tab's name finds nothing; a named tab's finds its panes.
m = open(); m.input.type("vite"); m.render(); m.input.submit();
assert.deepEqual(take(), [["pane.focus", { pane: "p4" }]]);
m = open(); m.input.type("worktree");
assert.deepEqual(keys(m), []);
m = open(); m.input.type("fix login");
assert.deepEqual(keys(m), ["pane:p2", "pane:p3", "pane:p1"]);

// A click goes to its row's pane.
m = open(); find(m.render(), "pane:p3").handlers.click({}, cx);
assert.deepEqual(take(), [["pane.focus", { pane: "p3" }]]);

// ctrl+d closes the pane through the tab bar, which asks first.
m = open(); m.input.type("lazygit"); m.render().handlers.key({ key: "d", modifiers: { control: true } }, cx);
assert.deepEqual(take(), [["t3-tabs.close-pane:p2", null]]);

// Home has no row, mod or shell.
shared["t3-tabs.home"] = "s1";
panes.push({ pane: "ph", tab: "c1", mod: "review", title: "Home", program: {}, focused: false }, { pane: "pb", tab: "c1", terminal: "t5", program: vite, focused: false });
{ const rows = keys(open()); assert.ok(!rows.includes("pane:ph")); assert.ok(!rows.includes("pane:pb")); }
panes.splice(-2); delete shared["t3-tabs.home"];
// Its contents are there from the first frame: a fade leaves the popup blank.
assert.notEqual(typeof open().render().opacity, "number");
// Closing says so, for the buttons that open it to toggle.
{ const before = Date.now(); open().close(); assert.ok(shared["t3-picker.closed"] >= before); }

// Status follows the shared attention rule in either mode: quiet labels hide done, new work or waking brings it back.
panes[1].status = "done";
terms = [{ address: "t1", turn: 1, labels: {} }];
const hasDone = n => Boolean(n && typeof n === "object" && (n.fill === "#done" || n.items.some(hasDone)));
const done = () => hasDone(find(open().render(), "pane:p1"));
assert.ok(done());
terms[0].labels.settled = "1:1"; assert.equal(done(), false);
terms[0].turn = 2; assert.ok(done());
terms[0].labels = { snoozed: String(Date.now() + 60000) }; assert.equal(done(), false);
terms[0].labels.snoozed = String(Date.now() - 1); assert.ok(done());
// Tab reaches the footer's New tab, as every control in a popup.
assert.equal(find(open().render(), "picker-new").tabIndex, 0);
console.log("ok picker");
