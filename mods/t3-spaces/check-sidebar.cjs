const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element(kind = "div", source) {
  const node = { kind, source, items: [], handlers: {}, style: {}, hoverStyle: {} };
  const proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === "when") { if (args[0]) args[1](proxy); }
      else if (key === "child" || (key === "trigger" && kind === "hovercard")) node.items.push(args[0]);
      else if (key === "children") node.items.push(...args[0]);
      else if (key === "on_mouse_down" || key === "on_mouse_up") node.handlers[`${key}:${args[0]}`] = args[1];
      else if (key.startsWith("on_")) node.handlers[key] = args[0];
      else if (key === "id") node.key = args[0];
      else if (key === "hover") { const hovered = element(); args[0](hovered); node.hoverStyle = hovered.style; }
      else node.style[key] = args.length === 1 ? args[0] : args;
      return proxy;
    };
  } });
  return proxy;
}

// Mods run in their own vm context: a plain copy compares with this one's objects.
const plain = v => JSON.parse(JSON.stringify(v));
// A row's laid-out children, without the absolutely placed tree lines.
const inFlow = row => row.items.filter(n => !("absolute" in n.style));

function find(node, id) {
  if (!node || typeof node !== "object") return null;
  if (node.key === id) return node;
  for (const child of node.items) { const found = find(child, id); if (found) return found; }
  return null;
}
function strings(node) {
  if (typeof node === "string") return [node];
  return node && typeof node === "object" ? node.items.flatMap(strings) : [];
}
function walk(node) {
  return node && typeof node === "object" ? [node, ...node.items.flatMap(walk)] : [];
}
function fire(node, event, ...args) {
  assert.ok(node, `missing event target: ${event}`);
  assert.equal(typeof node.handlers[event], "function", event);
  return node.handlers[event](...args);
}

const modRoot = path.dirname(__dirname);
const cx = { notify() {}, stop_propagation() {}, spawn() {}, bind_keys() {}, timers: [], timer: { every() {}, after(ms, fn) { const t = { ms, fn, cancel() { t.gone = true; } }; cx.timers.push(t); return t; } }, focus_handle: () => { let gone = false; return { focus() { assert.ok(!gone, "a released FocusHandle throws when used"); }, is_focused: () => false, release() { gone = true; return true; } }; } };
function fixture(width) {
  const program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
  const tabs = ["local task", "second task", "remote task"].map((name, i) => ({ id: `b${i}`, name, named: true }));
  const spaces = tabs.map((tab, i) => ({ id: `s${i}`, name: `project ${i}`, active: i === 0, folder: `/work/p${i}`, machine: i === 2 ? "vps" : null, status: "working", tabs: [tab] }));
  const agents = [0, 2].map((i) => ({ address: i === 2 ? "vps/t2" : "t0", pane: `p${i}`, space: `s${i}`, space_name: spaces[i].name, tab: `b${i}`, title: tabs[i].name, seq: i, program, focused: i === 0, status: i === 0 ? "working" : "blocked" }));
  const terminals = [...agents.map(a => ({ ...a, state: "live" })),
    { address: "child", parent: "t0", name: "child task", state: "live", status: "error", program },
    { address: "grandchild", parent: "child", name: "grandchild task", state: "live", status: "working", program }];
  const panes = agents.map(a => ({ ...a, terminal: a.address, cwd: `/work/${a.space}` }));
  const slots = { sidebar: { id: "sidebar", size: { px: width } }, spaces: { id: "spaces", size: { px: 90 } } };
  const state = { "agents.sort": "grouped" };
  const calls = [], overlays = [], stores = new Map(), scopes = new Map(), labelled = [], shown = { agent: "child" }, commands = [], closed = [];
  // What a test may change about the window and the app: the window, the layout's root fields, the update state.
  const ui = { window: { platform: "macos" }, root: {}, updates: { app: {} } };
  let hcAnswer = () => ({ code: 0 });
  const theme = new Proxy({ selected: "#2c2c2f", hover: "#202024", working: "#6b93ff", blocked: "#f0a33a", done: "#ececf0", muted: "#a9a9b4", foreground: "#f4f4f6", dim: "#77777f", ansi3: "#c8a84b", ansi4: "#5f8fe0", ansi11: "#e8cf7a", ansi12: "#8fb4f2" }, { get: (t, k) => t[k] ?? "#a9a9b4" });
  const env = {
    View: class {}, div: () => element(), h_flex: () => element("h"), v_flex: () => element("v"),
    Button: { new: id => element("button").id(id) },
    Popover: { new: id => element("popover").id(id) }, HoverCard: { new: id => element("hovercard").id(id) }, Popup: { new: (id, trigger) => element("popup").id(id).child(trigger) }, Input: { new: () => element("input") },
    InputState: { new: () => ({ on() {}, value: () => "", set_value() {}, focus() {} }) },
    svg: source => element("svg", source), image: source => element("image", source),
    spaces: () => spaces, agents: () => agents, terminals: () => terminals, panes: () => panes,
    machines: () => [{ name: null, layout: "ready" }, { name: "vps", layout: "ready" }], focused: () => shown,
    exec: async () => ({ code: 1, stdout: "" }), readTextFile: async () => null,
    window: () => ui.window, props: () => ({}), theme: () => theme,
    settings: () => ({ zoom: 1 }), home: () => "/home/test",
    layout: () => ({ ...ui.root, children: Object.values(slots) }), shared: key => state[key],
    setShared: (key, value) => { state[key] = value; }, setAgentOrder() {},
    hc: (args) => { labelled.push([...args]); return Promise.resolve(hcAnswer(args)); }, notify() {},
    run: (name, args) => {
      calls.push([name, JSON.parse(JSON.stringify(args ?? {}))]);
      if (name === "layout.resize" && slots[args.id]) slots[args.id].size = { px: args.px };
    },
    openOverlay: spec => overlays.push(spec), closeOverlay: id => closed.push(id), updates: () => ui.updates,
    nextCommand: () => commands.length ? Promise.resolve(commands.shift()) : new Promise(() => {}),
    keys: () => [{ section: "layout:herdr-t3", keys: "cmd-t", action: "t3-tabs.new" }, { section: "global", keys: "cmd-n", action: "space.new" }],
  };
  function load(name, props = {}) {
    const storage = stores.get(name) ?? new Map();
    stores.set(name, storage);
    const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
    const read = file => fs.readFileSync(path.join(modRoot, name, file), "utf8");
    // name.js, tree.js, project.js, tip.js, details.js, focus.js, list.js and motion.js, the shared naming, status, space-mark, hover-label, details, keyboard, list and motion rules, are inlined as the mod's own modules are.
    const shared = ["name.js", "tree.js", "project.js", "tip.js", "details.js", "focus.js", "list.js", "motion.js"].filter(f => fs.existsSync(path.join(modRoot, name, f))).map(f => read(f) + "\n").join("");
    const source = (shared + read("main.js"))
      .replace(/^import .*;\r?\n/gm, "").replace(/export (function|const) /g, "$1 ")
      .replace("export default class", "globalThis.Mod = class");
    const context = vm.createContext({ ...env, localStorage, props: () => props, fs: fs.promises, appHome: () => path.dirname(modRoot) });
    vm.runInContext(source, context, { filename: name });
    scopes.set(name, context);
    const mod = new context.Mod();
    mod.init?.(props, cx);
    return mod;
  }
  return { ...env, load, slots, state, calls, overlays, stores, scopes, labelled, shown, commands, closed, ui, answerHc: fn => { hcAnswer = fn; } };
}

for (const width of [208, 240, 256, 320, 480]) {
  const f = fixture(width);
  const sp = f.load("t3-spaces"), ag = f.load("t3-agents");
  const st = sp.render(cx);
  let at = ag.render(cx);
  assert.ok(find(at, "fold-t0") && !find(at, "sub-grandchild"), "sub-agents start folded");
  // The child is in error: folded, it still shows, one step in, hung from the parent.
  assert.equal(find(at, "sub-child").style.pl, 30, "a stuck sub-agent shows under its folded parent");
  f.terminals().find(k => k.address === "grandchild").status = "blocked";
  const stuck = ag.render(cx);
  assert.deepEqual([find(stuck, "sub-child").style.pl, find(stuck, "sub-grandchild").style.pl], [30, 30], "every stuck one hangs straight from the parent");
  f.terminals().find(k => k.address === "grandchild").status = "working";
  ag.toggleFold("t0", cx);
  Object.assign(ag.folded, { gone: false, "vps/gone": false, "far/t1": false, "sp-gone": true });
  ag.render(cx);
  assert.deepEqual(Object.keys(ag.folded).sort(), ["far/t1", "sp-gone", "t0"], "an ended agent's fold goes; a quiet machine's and group headers stay");
  at = ag.render(cx);
  const space = find(st, "space-s0"), agent = find(at, "ag-t0");
  assert.ok(strings(space).includes("project 0"), `space identity at ${width}`);
  assert.ok(strings(agent).includes("local task"), `agent identity at ${width}`);
  assert.equal(space.style.bg, "#2c2c2f");
  assert.equal(agent.style.bg, "#2c2c2f");
  const child = find(at, "sub-child"), grandchild = find(at, "sub-grandchild");
  assert.ok(child.style.pl > agent.style.pl, "child is indented from its parent");
  assert.ok(grandchild.style.pl > child.style.pl, "each descendant level is indented");
  assert.ok(strings(child).includes("child task"), "sub-agent keeps its name");
  assert.equal(child.style.bg, f.theme().selected, "parent and peeked child share the selection color");
  for (const row of [space, agent, child]) assert.equal(row.hoverStyle.bg, undefined, "hover preserves a selected row");
  for (const row of [find(st, "space-s1"), find(at, "ag-vps/t2"), grandchild]) assert.equal(row.hoverStyle.bg, f.theme().hover);
  assert.equal(child.style.pl, 30, "first child sits one 20px step in, its turn hung from the parent icon");
  assert.equal(grandchild.style.pl - child.style.pl, 20);
  assert.equal(child.style.text_size, 13);
  for (const row of [agent, child, grandchild]) {
    assert.equal(inFlow(row)[0].style.size, 16, "icons share a fixed column");
    assert.equal(row.style.gap, 10);
    assert.equal(row.style.h, 36, "T3's one-line row");
  }
  const lines = row => row.items.filter(n => "absolute" in n.style).map(n => [n.style.left, "border_b" in n.style ? "elbow" : "line"]);
  assert.deepEqual(lines(child), [[17.25, "elbow"]], "a last child turns in from under its parent's icon");
  assert.deepEqual(lines(grandchild), [[37.25, "elbow"]], "no line continues past a last child");
  f.terminals().push({ address: "child2", parent: "t0", name: "second child", state: "live", status: "idle", program: f.agents()[0].program });
  const branched = ag.render(cx);
  assert.deepEqual(lines(find(branched, "sub-child")), [[17.25, "line"], [17.25, "elbow"]], "a middle child keeps the line going");
  assert.deepEqual(lines(find(branched, "sub-grandchild")), [[17.25, "line"], [37.25, "elbow"]], "descendants carry their ancestors' lines");
  assert.deepEqual(lines(find(branched, "sub-child2")), [[17.25, "elbow"]]);
  const elbow = find(child, "sub-child").items.find(n => "border_b" in n.style).style;
  assert.deepEqual([elbow.w, elbow.rounded_bl], [9.75, 6], "upstream-size turn: ends 4px before the icon, 6px radius");
  assert.equal(elbow.left + 1.5 / 2, agent.style.pl + inFlow(agent)[0].style.size / 2, "the line runs down the parent icon's center");
  assert.equal(elbow.left + elbow.w + 4, child.style.pl + (16 - 14) / 2, "the turn stops 4px before the child icon");
  f.terminals().pop();
  assert.equal(space.items[0].style.gap, 10);
  assert.equal(space.style.h, 32, "a space's row is T3's project row");
  assert.equal(find(st, "spaces-heading").style.pr, find(at, "agents-heading").style.pr, "header actions share a right edge");
  assert.equal(find(at, "controls-t0").style.gap, 4);
  for (const id of ["status-t0", "status-vps/t2", "sub-status-child", "sub-status-grandchild"]) assert.equal(find(at, id).style.size, 20);
  assert.equal(find(agent, "pin-t0").handlers.on_click, undefined, "faded out, the pin has no click target");
  assert.equal(find(agent, "pin-t0").style.opacity, 0);
  assert.deepEqual(find(at, "controls-t0").items.map(n => n.key), ["tip-fold-t0", "when-t0", "tip-status-t0-mark"], "a parent shows its fold arrow and time before the status, as the shipped list");
  // T3 turns its arrow; here the two directions cross-fade in one slot.
  const arrow = (tree, id) => ["down", "right"].filter(w => find(tree, `${id}-${w}`)?.style.opacity === 1);
  assert.deepEqual(arrow(at, "fold-t0-arrow"), ["down"]);
  assert.deepEqual(strings(find(at, "when-t0")), ["<1m"], "time in its state, as the shipped list");
  fire(agent, "on_hover", true, cx);
  const hoveredTree = ag.render(cx);
  assert.notEqual(find(hoveredTree, "agent-fold-t0").items[0]?.source, "mods/t3-agents/chevron-down.svg", "hover leaves the icon alone");
  assert.equal(find(hoveredTree, "agent-fold-t0").style.size, 16);
  assert.equal(find(hoveredTree, "pin-t0").style.size, 20, "pin is as wide as the time's slot");
  assert.equal(find(hoveredTree, "pin-t0").style.border, undefined, "pin is borderless like fold");
  fire(find(hoveredTree, "pin-t0"), "on_hover", true, cx);
  assert.equal(find(ag.render(cx), "pin-t0").items[0].style.text_color, f.theme().foreground, "hovered, the pin brightens");
  fire(find(hoveredTree, "pin-t0"), "on_hover", false, cx);
  assert.deepEqual(find(hoveredTree, "controls-t0").items.map(n => n.key), ["tip-fold-t0", "when-t0", "tip-status-t0-mark"], "pin shares the time's slot, the status stays, as the shipped list");
  assert.deepEqual([find(hoveredTree, "pin-t0").style.opacity, find(hoveredTree, "when-t0").items[0].style.opacity], [1, 0], "time and pin cross-fade, as T3's corner");
  assert.equal(find(at, "when-t0").style.min_w, 20, "the time's slot is the pin's width, so hovering moves nothing");
  fire(find(hoveredTree, "ag-t0"), "on_hover", false, cx);
  assert.equal(find(ag.render(cx), "when-t0").items[0].style.opacity, 1, "leaving restores the time");
  assert.equal(find(at, "agent-menu-t0"), null, "no extra context menu");
  assert.equal(space.items[0].style.justify_center, undefined, "space content stays left aligned");
  assert.equal(agent.style.justify_center, undefined, "agent content stays left aligned");
  assert.equal(find(st, "sidebar-collapse"), null, "no inline sidebar toggle");
  assert.equal(find(at, "collapse"), null, "no sidebar expand control");
  assert.ok(find(at, "sp-s0"), "space group remains visible");
  fire(find(at, "agent-fold-t0"), "on_click", {}, cx);
  at = ag.render(cx);
  assert.equal(find(at, "sub-grandchild"), null, "descendants fold in place");
  assert.equal(find(at, "fold-t0").style.min_w, 20);
  assert.equal(find(at, "fold-t0").style.h, 20);
  assert.ok(strings(find(at, "fold-t0")).includes("2"), "folded badge counts descendants");
  assert.deepEqual(arrow(at, "fold-t0-arrow"), ["right"], "folded, the arrow points right");
  assert.equal(find(at, "fold-t0").style.text_color, f.theme().dim, "count is dim");
  // Inside a hovered row a button's own fill doesn't show: its arrow and count brighten together instead.
  fire(find(at, "fold-t0"), "on_hover", true, cx);
  const lit = find(ag.render(cx), "fold-t0");
  assert.deepEqual([lit.style.text_color, find(lit, "fold-t0-arrow-right").items[0].style.text_color], [f.theme().foreground, f.theme().foreground], "hovered, the arrow and the count brighten together");
  fire(lit, "on_hover", false, cx);
  assert.equal(find(ag.render(cx), "fold-t0-arrow-right").items[0].style.text_color, f.theme().dim);
  assert.equal(find(at, "status-t0").style.accessibility_label, "Needs you (sub-agent)", "folded status carries a more urgent hidden child");
  f.agents()[0].status = "blocked";
  assert.equal(find(ag.render(cx), "status-t0").style.accessibility_label, "Needs you", "a row as urgent as its children shows its own status");
  f.agents()[0].status = "idle";
  assert.equal(find(ag.render(cx), "status-t0").style.accessibility_label, "Needs you (sub-agent)");
  f.agents()[0].status = "working";
  const t0 = f.terminals().find(k => k.address === "t0");
  t0.labels = { "pi.session": "mine" };
  assert.ok(strings(find(ag.render(cx), "ag-t0")).includes("mine"), "a lone agent reads as its session, as in the inbox");
  f.agents().push({ ...f.agents()[0], address: "t1", pane: "p1", seq: 1, focused: false });
  f.terminals().push({ address: "t1", state: "live", labels: { "pi.session": "theirs" } });
  const shared = ag.render(cx);
  assert.ok(strings(find(shared, "ag-t0")).includes("mine") && strings(find(shared, "ag-t1")).includes("theirs"), "agents sharing a tab read as their own sessions");
  f.terminals().at(-1).labels = {};
  assert.ok(strings(find(ag.render(cx), "ag-t1")).includes("local task"), "without a session label it falls back to the tab");
  f.agents().pop(); f.terminals().pop(); delete t0.labels;
  assert.equal(f.slots.sidebar.size.px, width, "folding preserves sidebar width");
  fire(find(at, "fold-t0"), "on_click", {}, cx);
  at = ag.render(cx);
  assert.ok(find(at, "sub-child") && !strings(find(at, "fold-t0")).includes("2"), "the fold unfolds and drops its count");
  fire(find(at, "sub-child"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["terminal.peek", { terminal: "child" }]);
  fire(agent, "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["agent.focus", { terminal: "t0" }]);
  assert.equal(f.state["agents.pins"], undefined, "ordinary row click does not pin");
  fire(space, "on_mouse_down:left", {}, cx);
  fire(space, "on_mouse_up:left", {}, cx);
  assert.deepEqual(f.calls.pop(), ["space.select", { id: "s0" }]);
  fire(find(st, "space-s2"), "on_mouse_down:right", {}, cx);
  assert.deepEqual(JSON.parse(JSON.stringify(f.overlays.pop().props.target)), { id: "s2" });
  fire(find(at, "ag-sort"), "on_click", {}, cx);
  assert.equal(f.overlays.pop().mod, "t3-agents");
  fire(find(at, "agent-fold-t0"), "on_click", {}, cx);
  assert.equal(find(ag.render(cx), "sub-grandchild"), null);
  fire(find(ag.render(cx), "agent-fold-t0"), "on_click", {}, cx);
  assert.ok(find(ag.render(cx), "sub-child"));
  // Moving down, the next row reports before the last one's leaving: a sub-agent's row takes over from its parent's card, up or still on its way.
  const settle = () => { while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); } };
  for (const opened of [true, false]) {
    fire(find(ag.render(cx), "ag-t0"), "on_hover", true, cx);
    if (opened) { settle(); assert.ok(find(ag.render(cx), "details-t0")?.style.content, "a row's card opens"); }
    fire(find(ag.render(cx), "sub-child"), "on_hover", true, cx);
    fire(find(ag.render(cx), "ag-t0"), "on_hover", false, cx);
    settle();
    const open = ag.render(cx);
    assert.equal(find(open, "details-t0"), null, "a parent's card doesn't stay over its sub-agent's row");
    assert.deepEqual(strings(find(open, "details-sub-child").style.content), ["child task", "P", "project 0", "Pi"], "a sub-agent's card: its name, and the space it hangs in");
    fire(find(open, "sub-child"), "on_hover", false, cx);
    settle();
    assert.equal(find(ag.render(cx), "details-sub-child"), null, "and it goes with the pointer");
  }
  // Its click opens the peek where the card stands: the card goes at once, with no fade under it, and the row redraws to show that.
  fire(find(ag.render(cx), "sub-child"), "on_hover", true, cx);
  settle();
  let redrawn = false;
  fire(find(ag.render(cx), "sub-child"), "on_click", {}, { ...cx, notify() { redrawn = true; } });
  assert.ok(redrawn, "the click redraws the row");
  assert.equal(find(ag.render(cx), "details-sub-child").style.content, undefined, "no card under the peek");
  assert.deepEqual(f.calls.pop(), ["terminal.peek", { terminal: "child" }]);
  fire(find(ag.render(cx), "sub-child"), "on_hover", false, cx);
  settle();
  // A row that goes from under the pointer never reports its leaving: its card doesn't come back with it.
  const kid = f.terminals().find(k => k.address === "child");
  fire(find(ag.render(cx), "agent-fold-t0"), "on_click", {}, cx);
  fire(find(ag.render(cx), "sub-child"), "on_hover", true, cx);
  settle();
  kid.status = "working";
  assert.equal(find(ag.render(cx), "sub-child"), null, "folded, a sub-agent that's fine again has no row");
  kid.status = "error";
  assert.equal(find(ag.render(cx), "details-sub-child")?.style.content, undefined, "its row is back, with the pointer long gone: no card");
  fire(find(ag.render(cx), "agent-fold-t0"), "on_click", {}, cx);
  // A sub-agent with a pane has two rows: hovering one isn't hovering the other, and the next one reporting first keeps the hover and the card.
  f.agents().push({ address: "child", pane: "pn", space: "s1", space_name: "project 1", tab: "b1", title: "child task", seq: 9, program: f.agents()[0].program, focused: false, status: "working" });
  fire(find(ag.render(cx), "sub-child"), "on_hover", true, cx);
  settle();
  let both = ag.render(cx);
  assert.equal(find(both, "pin-child").style.opacity, 0, "its listed row doesn't look hovered");
  assert.equal(find(both, "details-child")?.style.content, undefined);
  assert.ok(find(both, "details-sub-child").style.content, "only the row hovered has a card");
  fire(find(both, "ag-child"), "on_hover", true, cx);
  fire(find(ag.render(cx), "sub-child"), "on_hover", false, cx);
  settle();
  both = ag.render(cx);
  assert.equal(find(both, "pin-child").style.opacity, 1, "the row now hovered keeps its hover");
  assert.ok(find(both, "details-child").style.content, "and shows its card");
  assert.equal(find(both, "details-sub-child")?.style.content, undefined);
  fire(find(both, "ag-child"), "on_hover", false, cx);
  settle();
  f.agents().pop();
  ag.render(cx);
  settle();
  const beforePin = f.calls.length;
  let stopped = false;
  fire(find(ag.render(cx), "ag-t0"), "on_hover", true, cx);
  fire(find(ag.render(cx), "pin-t0"), "on_click", {}, { ...cx, stop_propagation() { stopped = true; } });
  assert.ok(stopped, "pin button stops propagation to the row");
  assert.ok(f.state["agents.pins"].includes("t0"));
  assert.equal(find(ag.render(cx), "pin-t0").style.opacity, 0, "pinning does not leave a stale hover after reordering");
  fire(find(ag.render(cx), "ag-t0"), "on_hover", true, cx);
  assert.equal(find(ag.render(cx), "pin-t0").items[0].source, "mods/t3-agents/pin-off.svg", "pinned rows offer unpin");
  fire(find(ag.render(cx), "ag-t0"), "on_hover", false, cx);
  assert.equal(find(ag.render(cx), "pin-t0").style.opacity, 0, "pinned rows also hide their pin outside hover");
  fire(find(ag.render(cx), "ag-t0"), "on_hover", true, cx);
  fire(find(ag.render(cx), "pin-t0"), "on_click", {}, cx);
  assert.equal(f.state["agents.pins"].includes("t0"), false, "unpin still persists");
  assert.equal(f.calls.length, beforePin, "pin and unpin do not focus a pane");
  fire(find(ag.render(cx), "ag-vps/t2"), "on_hover", true, cx);
  fire(find(ag.render(cx), "ag-t0"), "on_hover", false, cx);
  assert.equal(find(ag.render(cx), "pin-t0").handlers.on_click, undefined);
  fire(find(ag.render(cx), "pin-vps/t2"), "on_click", {}, cx);
  assert.deepEqual([...f.state["agents.pins"]], ["vps/t2"], "pin acts on the selected remote button");
  const header = f.load("t3-chrome").render(cx);
  assert.deepEqual(header.items.map(n => n.key), ["tip-home", "tip-sidebar-mode", "tip-sidebar-toggle"], "the header holds Home, the sidebar switch and toggle; search is a shortcut");
  assert.equal(header.style.pr + (26 - 14) / 2, 16, "the toggle's icon ends on the same line as the + and status column");
  fire(find(header, "sidebar-toggle"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["layout.toggle", { id: "sidebar" }]);
  const footer = f.load("t3-chrome", { footer: true });
  const settings = find(footer.render(cx), "settings");
  assert.deepEqual([settings.style.size, settings.items[0].style.size, settings.style.accessibility_label], [32, 16, "Settings"], "as T3's footer: 32px icon buttons");
  assert.equal(find(footer.render(cx), "app-update"), null, "no update, no restart");
  f.ui.updates = { app: { ready: "0.9.1" } };
  const update = find(footer.render(cx), "app-update");
  assert.deepEqual(strings(update), ["Update"]);
  fire(update, "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["app.update", {}]);
  f.ui.updates = { app: {} };
  // The inbox's undo notice, in the footer's free space as T3's: short, then Undo, which the inbox does.
  f.state["t3-inbox.notice"] = { action: "Settled", count: 2, gen: 3, shown: true, live: true, at: Date.now() };
  assert.equal(find(footer.render(cx), "undo-notice-3"), null, "with Lists showing its Undo couldn't reach the Inbox");
  f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
  const note = find(footer.render(cx), "undo-notice-3");
  assert.deepEqual([strings(note), "flex_1" in note.style, note.style.text_size], [["Settled 2,", "Undo"], true, 11]);
  assert.ok("flex_none" in find(note, "undo-notice-undo").style && "truncate" in note.items[0].style, "short of room the summary is cut, never Undo");
  fire(find(note, "undo-notice-undo"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["t3-inbox.undo", {}]);
  f.state["t3-inbox.notice"].count = 1;
  assert.deepEqual(strings(find(footer.render(cx), "undo-notice-3")), ["Settled,", "Undo"]);
  f.state["t3-inbox.notice"].at = Date.now() - 60000;
  assert.equal(find(footer.render(cx), "undo-notice-3"), null, "one left from before a restart doesn't show");
  delete f.state["t3-inbox.notice"];
  delete f.slots["sidebar-lists"];
  const groups = ["pinned", "sp-s0"].map(id => find(ag.render(cx), id).style);
  assert.deepEqual([groups[0].h, groups[1].h], [32, 32], "T3's shelf and folder header");
  fire(settings, "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["app.settings", {}]);
}

{
  const f = fixture(208), ag = f.load("t3-agents");
  for (const status of ["working", "blocked", "idle", "done"]) {
    const slot = ag.status(f.theme(), { status });
    assert.equal(slot.style.size, 20, `${status} keeps the same status column`);
    const mark = slot.items[0];
    assert.equal(mark.style.size + 2 * (mark.style.mx ?? 0), 14, `${status} mark is 14 wide, so centers line up`);
    assert.ok("justify_end" in slot.style && !("justify_center" in slot.style), "marks sit flush right in the slot");
    assert.equal(slot.handlers.on_click, undefined, "status remains an indicator, not a pin target");
  }
  const at = ag.render(cx), heading = find(at, "agents-heading");
  // Header icon: 14 inside a 26 button, inset by pr. Status mark: flush right inside list px 8 + row px 8.
  assert.equal(heading.style.pr + (26 - 14) / 2, 8 + find(at, "ag-t0").style.pr, "status column ends under the header icons");
  assert.equal(heading.items[0].style.text_color, f.theme().muted, "section titles are a step brighter than group labels");
  // A space's group is T3's project folder: its mark and name, the chevron in the status column.
  const group = find(at, "sp-s0"), chevron = inFlow(group).at(-1);
  assert.deepEqual([group.style.pr + chevron.style.w / 2, group.style.rounded], [find(at, "ag-t0").style.pr + 14 / 2, 8]);
  assert.deepEqual(["down", "right"].map(w => find(chevron, `chevron-sp-s0-${w}`).style.opacity), [1, 0], "open, it points down, as T3's");
  assert.ok(strings(group).includes("project 0") && !strings(group).includes("1"), "open, it holds no count");
  fire(group, "on_hover", true, cx);
  const lit = find(ag.render(cx), "sp-s0");
  assert.equal(inFlow(lit).at(-1).style.text_color, f.theme().foreground, "it lights with its row");
  fire(lit, "on_mouse_down:right", {}, cx);
  assert.deepEqual(plain(f.overlays.pop().props), { tab: "space", target: { id: "s0" } }, "right-click is the space's menu");
  fire(group, "on_hover", false, cx);
  // Closed, it says how many it hides and whether one wants you, and still shows the row you're on.
  f.agents().splice(1, 0, { ...f.agents()[0], address: "t9", pane: "p9", seq: 9, focused: false, status: "blocked", title: "stuck" });
  f.terminals().push({ address: "t9", state: "live", status: "blocked" });
  ag.toggleFold("sp-s0", cx, false);
  const shut = ag.render(cx), closed = find(shut, "sp-s0");
  assert.ok(find(shut, "ag-t0") && !find(shut, "ag-t9"), "a closed folder keeps the row in view, and only it");
  assert.ok(strings(closed).includes("1"), "the count leaves out the row still showing");
  assert.equal(inFlow(closed).find(n => n.style.size === 6).style.bg, f.theme().blocked, "the dot speaks for what's hidden");
  ag.toggleFold("sp-s0", cx, false);
  f.agents().splice(1, 1); f.terminals().pop();
  // The list's motion: a row that moved is drawn where it was under a new id, then let go; one that left fades out where it
  // was, drawn inert; folds and the sort play it too, as this list starts at the top (T3 skips only a bottom shelf's opening).
  const y = (tree, id) => walk(tree).find(n => String(n.key).startsWith(`fly-${id}-`));
  const leaving = (tree, key) => walk(tree).find(n => String(n.key).startsWith(`leaving-${key}-`));
  const fireTimers = ms => { const due = cx.timers.filter(t => t.ms === ms); cx.timers = cx.timers.filter(t => t.ms !== ms); for (const t of due) if (!t.gone) t.fn(cx); };
  // Drawn for its leaving: no handlers, no tooltip, and no id the list uses.
  const inert = n => walk(n.items[0]).every(c => !Object.keys(c.handlers).length && typeof c.key !== "string");
  cx.timers.length = 0;
  const remote = f.agents().find(a => a.address === "vps/t2"), wasStatus = remote.status;
  remote.status = "working";
  f.state["agents.sort"] = "priority";
  const folder = leaving(ag.render(cx), "m:sp-s0");
  assert.ok(folder && strings(folder).includes("project 0") && inert(folder), "a space's folder leaves inert");
  const before = y(ag.render(cx), "t0");
  remote.status = "blocked";
  const moved = y(ag.render(cx), "t0");
  assert.ok(moved.key !== before.key && moved.style.top < 0, "the moved row starts from above, where it was");
  fireTimers(16);
  assert.equal(y(ag.render(cx), "t0").style.top, 0, "then it's let go");
  remote.status = wasStatus;
  f.state["agents.sort"] = "grouped";
  const sorted = ag.render(cx), head = leaving(sorted, "m:sec-4");
  assert.ok(head && strings(head).includes("Needs you") && inert(head), "switching the sort, the old headers fade out");
  assert.ok("relative" in find(sorted, "ag-content").style && find(sorted, "ag-content").items.includes(head), "in the rows' box, so they scroll with it");
  assert.equal(y(sorted, "m:sp-s0").style.opacity, 0, "and the new ones fade in");
  fireTimers(16);
  assert.deepEqual([leaving(ag.render(cx), "m:sec-4").style.opacity, y(ag.render(cx), "m:sp-s0").style.opacity], [0, 1]);
  fireTimers(200);
  assert.equal(leaving(ag.render(cx), "m:sec-4"), undefined, "faded, they go");
  // Unfolding sub-agents: the new one fades in, the rows under it slide down from where they were.
  const below = y(ag.render(cx), "m:sp-s2").key;
  ag.toggleFold("t0", cx);
  const unfolded = ag.render(cx);
  assert.equal(y(unfolded, "sub-grandchild").style.opacity, 0, "a fold fades its rows in");
  assert.ok(y(unfolded, "m:sp-s2").key !== below && y(unfolded, "m:sp-s2").style.top < 0, "and slides the rows under it");
  fireTimers(16);
  ag.toggleFold("t0", cx);
  const gone = leaving(ag.render(cx), "sub-grandchild");
  assert.ok(gone && strings(gone).includes("grandchild task") && inert(gone), "folding, they fade out");
  fireTimers(16);
  fireTimers(200);
  // Closing a space's folder, its rows leave inert too.
  ag.toggleFold("sp-s2", cx, false);
  assert.ok(inert(leaving(ag.render(cx), "vps/t2")), "an agent's row leaves inert too");
  fireTimers(16); fireTimers(200);
  ag.toggleFold("sp-s2", cx, false);
  ag.render(cx); fireTimers(16); fireTimers(200);
  // The sort menu, as T3's: nothing lit until a key or the pointer arrives.
  const f2 = fixture(256), menu = f2.load("t3-agents", { sortMenu: true, overlay: "o" });
  const m0 = menu.render(cx);
  assert.equal(find(m0, "sort-priority").style.bg, undefined, "no highlight on opening");
  assert.equal(find(m0, "sort-priority").style.h, 28);
  assert.equal(find(f.load("t3-spaces").render(cx), "spaces-heading").items[0].style.text_color, f.theme().muted);
}

{
  // A card from another machine says so as T3's does: a server mark before its program, the machine named on hover.
  const f = fixture(256), root = f.load("t3-inbox").render(cx);
  const card = find(root, "card-vps/t2"), mark = find(card, "machine-vps/t2");
  assert.ok(strings(find(root, "tip-machine-vps/t2")).includes("vps") === false && find(root, "tip-machine-vps/t2"), "its card waits for the hover");
  assert.ok(walk(mark).some(n => n.source === "mods/t3-inbox/server.svg"));
  assert.ok(!strings(card).some(s => s.includes("vps")), "the machine isn't spelled out on the card");
  assert.equal(find(find(root, "card-t0"), "machine-t0"), null, "this computer's cards carry no mark");
}
{
  // The inbox: Working holds busy trees; Settle is by hand, undone by new work, never by looking.
  const f = fixture(256), inbox = f.load("t3-inbox"), run = { ...cx, spawn: fn => { fn(run); } };
  const remote = f.agents()[1], k = f.terminals().find(k => k.address === "vps/t2"), child = f.terminals().find(c => c.address === "child");
  child.status = "idle";
  assert.deepEqual(strings(find(inbox.render(run), "working-header")), ["Working", "1"], "a working tree moves down to Working");
  fire(find(inbox.render(run), "card-t0"), "on_hover", true, run);
  // Settle sits in the corner faded out, fading in over the state when it's offered (T3's group-hover crossfade).
  const hidden = find(inbox.render(run), "settle-t0"), labels = f.labelled.length;
  assert.ok(hidden.style.opacity === 0 && !("role" in hidden.style) && !hidden.handlers.on_click && !hidden.handlers["on_mouse_down:left"], "a working tree can't be settled: faded, its button takes no press");
  assert.equal(f.labelled.length, labels);
  assert.deepEqual(JSON.parse(JSON.stringify(hidden.style.transition)), ["opacity", { duration: 150, easing: "ease-out" }]);
  assert.equal(find(find(inbox.render(run), "card-t0"), "state-t0").style.opacity ?? 1, 1);
  remote.status = "done"; k.turn = 4;
  fire(find(inbox.render(run), "card-vps/t2"), "on_hover", true, run);
  const offered = inbox.render(run);
  assert.equal(find(offered, "settle-vps/t2").style.opacity, 1);
  assert.equal(find(offered, "settle-vps/t2").hoverStyle.bg, undefined, "as T3's, a card's button only lights up: no ground");
  assert.equal(walk(find(offered, "corner-vps/t2")).find(n => n.style.opacity === 0 && walk(n).some(c => c.key === "state-vps/t2" || strings(c).length)) != null, true, "the state fades out under it");
  fire(find(inbox.render(run), "settle-vps/t2"), "on_click", {}, run);
  const [, , value] = f.labelled.pop();
  assert.match(value, /^settled=\d+:4$/, "the label keeps when and the turn it was settled at");
  k.labels = { settled: value.slice(8) };
  const at = inbox.render(run);
  assert.ok(!find(at, "card-vps/t2") && strings(find(at, "settled-header")).includes("1"), "settled leaves the cards for the tail");
  {
    // The settle key (t3-inbox.settle) acts on the agent in view: a busy one stays, a settled one comes back, then goes again.
    const t0 = f.agents()[0], n = f.labelled.length;
    inbox.render(run); inbox.settleKey(run);
    assert.equal(f.labelled.length, n, "the key doesn't settle a working agent");
    t0.focused = false; remote.focused = true;
    inbox.render(run); inbox.settleKey(run);
    assert.deepEqual(f.labelled.pop(), ["label", "vps/t2", "settled="], "on a settled agent the key brings it back");
    inbox.render(run); inbox.settleKey(run);
    const [, , again] = f.labelled.pop();
    assert.match(again, /^settled=\d+:4$/, "and settles it again");
    k.labels = { settled: again.slice(8) };
    t0.focused = true; remote.focused = false;
  }
  {
    // Clear asks through Herdr's confirm dialog; only its answer closes settled panes.
    const n = f.calls.length;
    f.spaces()[0].tabs[0].active = true;
    fire(find(inbox.render(run), "settled-clear"), "on_hover", true, run);
    assert.equal(find(inbox.render(run), "settled-clear").style.text_color, "#f4f4f6", "lit under the pointer");
    fire(find(inbox.render(run), "settled-clear"), "on_click", {}, run);
    assert.equal(f.calls.length, n, "the click only asks");
    assert.notEqual(find(inbox.render(run), "settled-clear").style.text_color, "#f4f4f6", "the dialog covers it and the pointer may not move: it doesn't stay lit");
    const { mod, kind, props } = f.overlays.pop();
    assert.deepEqual([mod, kind, props.title, props.command.name], ["confirm", "dialog", "Close 1 pane?", "t3-inbox.clear"]);
    f.panes().push({ pane: "p9", tab: "b2", terminal: "t9" });
    inbox.render(run); inbox.clearSettled();
    assert.deepEqual(f.calls.splice(n), [["pane.close", { pane: "p2" }], ["space.select", { id: "s0" }], ["tab.select", { id: "b0" }]], "another pane keeps the space");
    f.panes().pop();
    inbox.render(run); inbox.clearSettled();
    assert.deepEqual(f.calls.splice(n), [["tab.new", { space: "s2", folder: "/work/s2" }], ["pane.close", { pane: "p2" }],
      ["space.select", { id: "s0" }], ["tab.select", { id: "b0" }]], "an emptied space keeps a fresh shell tab where its terminal was, not where the space began");
    remote.focused = true;
    assert.equal(find(inbox.render(run), "settled-clear"), null, "the agent in view is never cleared");
    remote.focused = false;
  }
  remote.focused = true;
  inbox.render(run);
  assert.equal(f.labelled.length, 0, "looking doesn't bring it back");
  k.turn = 5;
  inbox.render(run);
  assert.deepEqual(f.labelled.pop(), ["label", "vps/t2", "settled="], "a turn ended since brings it back");
  // The space filter, as T3's project scope: picking a space hides the others' agents; All spaces brings them back.
  const scope = (id) => fire(find(find(inbox.render(run), "inbox-scope-menu").style.content, `scope-${id}`), "on_click", { modifiers: {} }, run);
  scope("s2");
  assert.ok(find(inbox.render(run), "card-vps/t2") && !find(inbox.render(run), "working-header"), "only the chosen space's agents");
  scope("all");
  assert.ok(find(inbox.render(run), "working-header"), "all spaces again");
  // The brand bar switches the sidebar, its icon the mode a click shows; with the inbox showing, a settled agent's done is no news.
  assert.equal((walk(find(f.load("t3-chrome").render(cx), "sidebar-mode")).find(n => n.kind === "svg")?.source), "mods/t3-chrome/inbox.svg", "in Lists it offers the Inbox");
  fire(find(f.load("t3-chrome").render(cx), "sidebar-mode"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["layout.select", { stack: "sidebar-lists", child: "inbox" }]);
  f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
  assert.equal((walk(find(f.load("t3-chrome").render(cx), "sidebar-mode")).find(n => n.kind === "svg")?.source), "mods/t3-chrome/layout-list.svg", "in the Inbox it offers the lists");
  f.spaces()[0].tabs[0].status = "done"; f.agents()[0].status = "done";
  for (const k of f.terminals()) if (k.parent) k.status = "idle";
  f.terminals().find(c => c.address === "t0").labels = { settled: "1:0" };
  assert.equal(walk(find(f.load("t3-tabs").render(cx), "tab-b0")).some(n => n.style.rounded_full), false, "no done dot for a settled agent's tab");
  f.terminals().find(c => c.address === "t0").labels = { snoozed: String(Date.now() + 60000) };
  assert.equal(walk(find(f.load("t3-tabs").render(cx), "tab-b0")).some(n => n.style.rounded_full), false, "nor for a snoozed one's");
  // Snoozed with a sub-agent stuck, the Inbox shows it as needing the person, so the hidden sidebar's toggle counts it.
  f.terminals().find(c => c.address === "child").status = "error"; f.slots.sidebar.hidden = true;
  const stuck = () => strings(find(f.load("t3-tabs").render(cx), "agents-blocked"));
  const snoozedCount = stuck();
  f.terminals().find(c => c.address === "t0").labels = {};
  assert.deepEqual(snoozedCount, stuck(), "the same count, snoozed or not");
  // A hidden Inbox doesn't draw, so nothing clears a settled label: new work must count all the same.
  f.terminals().find(c => c.address === "t0").labels = { settled: "1:0" };
  assert.deepEqual(stuck(), snoozedCount, "settled, with its sub-agent stuck, it needs the person");
  f.terminals().find(c => c.address === "child").status = "idle"; f.terminals().find(c => c.address === "grandchild").status = "idle";
  f.agents()[1].status = "idle";
  const counted = (s) => find(f.load("t3-tabs").render(cx), `agents-${s}`);
  assert.ok(!counted("done"), "settled and quiet, its done isn't news");
  f.terminals().find(c => c.address === "t0").turn = 1;
  assert.ok(counted("done"), "a turn ended since it was settled: its done is");
  f.terminals().find(c => c.address === "t0").turn = 0;
  f.agents()[0].status = "working";
  assert.ok(counted("working"), "and so is working again");
  f.agents()[0].status = "done";
  delete f.slots.sidebar.hidden;
}

{
  // A parent's unread reply shows first, its working sub-agents beside it; once read, waiting on them is
  // working, everywhere, for as long as the longest-working one has worked.
  const f = fixture(256), inbox = f.load("t3-inbox");
  f.agents()[0].status = "idle"; f.terminals().find(c => c.address === "child").status = "idle";
  f.terminals().find(c => c.address === "grandchild").status_ms = Date.now() - 90000;
  assert.deepEqual(strings(find(inbox.render(cx), "state-t0")), ["Working", "1m"], "the waiting parent shows its sub-agent's working time");
  f.agents()[0].status = "done"; f.panes()[0].status = "done";
  const drawn = inbox.render(cx);
  assert.ok(strings(find(drawn, "state-t0")).includes("Done") && strings(drawn).includes("1 sub-agent working"), "an unread reply isn't hidden by a working sub-agent");
  assert.equal(find(f.load("t3-agents").render(cx), "status-t0").style.accessibility_label, "Done");
  assert.ok(walk(find(f.load("t3-tabs").render(cx), "tab-b0")).some(n => n.style.rounded_full), "its tab shows the done dot");
  f.agents()[0].status = "idle"; f.panes()[0].status = "idle";
  assert.deepEqual(strings(find(inbox.render(cx), "state-t0")), ["Working", "1m"], "read, the run goes on from its start");
  assert.equal(find(f.load("t3-agents").render(cx), "status-t0").style.accessibility_label, "Working (sub-agent)", "a read parent waiting on a sub-agent is working");
  const spins = tree => walk(tree).some(n => n.source === "mods/workspace-chrome/spinner.svg");
  assert.ok(spins(find(f.load("t3-tabs").render(cx), "tab-b0")) && spins(f.load("t3-pane", { pane: "p0" }).render(cx)), "its tab and pane header show it working");
}

{
  // A mod pane's word marks its tab as an agent's would; a closed pane's says nothing.
  const f = fixture(256);
  const spins = tree => walk(tree).some(n => n.source === "mods/workspace-chrome/spinner.svg");
  f.spaces()[0].tabs.push({ id: "bx", name: "review", named: true, active: false });
  f.panes().push({ pane: "p9", terminal: null, mod: "review", tab: "bx", title: "review" });
  const tab = () => find(f.load("t3-tabs").render(cx), "tab-bx");
  assert.ok(!spins(tab()) && !strings(tab()).includes("!") && !walk(tab()).some(n => n.style.rounded_full), "nothing reported, no mark");
  f.state["review.status"] = { bx: "working" };
  assert.ok(spins(tab()), "a run shows the spinner");
  f.state["review.status"] = { bx: "blocked" };
  assert.ok(strings(tab()).includes("!"), "a failure shows the badge");
  f.state["review.status"] = { bx: "done" };
  assert.ok(walk(tab()).some(n => n.style.rounded_full), "a finished run shows the dot");
  f.state["review.status"] = { bx: "working" };
  f.panes().pop();
  assert.ok(!spins(tab()), "its pane closed, its word is left behind");
}

{
  // Dragging, as T3's sidebar: labels and gaps open only while a row is lifted; Pinned pins and reorders,
  // Active unpins and unsettles, Settled settles; empty sections take drops; Esc, leaving, or a row
  // vanishing put it back; Working never lifts; a sweep from Settle or undo takes a run of rows along.
  const f = fixture(256), run = { ...cx, spawn: fn => { fn(run); } }, inbox = f.load("t3-inbox");
  for (const a of f.agents()) { a.status = "done"; a.focused = false; }
  for (const k of f.terminals()) if (k.parent) k.status = "idle";
  const t0 = f.terminals().find(k => k.address === "t0");
  const pins = () => [...(f.state["agents.pins"] ?? [])];
  const root = () => inbox.render(run);
  const h = (id) => find(root(), id)?.style.h;
  const badge = (v) => find(find(root(), "drag-ghost"), `badge-${v}`);
  // Press 10px into an 80px row, then move: the sidebar sees the pointer at y.
  const lift = (from, y = 20) => {
    fire(find(root(), from), "on_mouse_down:left", { position: { x: 0, y: 0 }, local_position: { x: 0, y: 10 }, bounds: { height: 80 } }, run);
    fire(root(), "on_mouse_move", { position: { x: 0, y }, local_position: { x: 0, y: 100 + y } }, run);
  };
  const over = (to, y = 10) => fire(find(root(), to), "on_mouse_move", { local_position: { x: 0, y }, bounds: { height: 80 } }, run);
  const release = () => fire(root(), "on_mouse_up:left", {}, run);
  const drag = (from, to, y) => { lift(from); over(to, y); release(); };

  assert.equal(h("pinned"), 0, "no Pinned or Active label until something is lifted");
  f.shown.pane = "p9";
  lift("card-t0", 5);
  assert.equal(find(root(), "drag-ghost"), null, "under 6px it's still a click");
  release();
  lift("card-vps/t2");
  assert.ok(find(find(root(), "drag-ghost"), "ghost-card-vps/t2"), "the lifted card follows the pointer");
  assert.equal(find(root(), "drag-ghost").style.top, 110, "the pressed spot stays under the pointer");
  assert.equal(h("pinned"), 24); assert.equal(h("active"), 24, "the labels open while it's lifted");
  assert.equal(h("hold-vps/t2"), 82, "it holds its place, spacing included");
  assert.equal(badge("pin"), null, "over its own section it says nothing");
  over("pinned");
  assert.equal(h("hold-vps/t2"), 0, "headed elsewhere, its place folds");
  assert.equal(h("gap-head-pinned"), 82, "and empty Pinned opens a gap under its label");
  assert.ok(badge("pin"), "the lifted card says Pin");
  release();
  assert.deepEqual(pins(), ["vps/t2"]);
  assert.ok(find(f.load("t3-agents").render(cx), "pinned"), "the agents list shows the same pin");
  assert.deepEqual(f.calls.pop(), ["pane.focus", { pane: "p9" }], "letting go hands the keyboard back to the pane that had it");
  assert.equal(h("pinned"), 0, "the labels close again");
  assert.ok(walk(find(root(), "card-vps/t2")).some(n => n.source === "mods/t3-inbox/pin.svg"), "a pin shows its glyph");

  lift("card-t0"); over("card-vps/t2", 10);
  assert.equal(h("gap-vps/t2"), 82, "the upper half of a pin opens a gap above it");
  over("card-vps/t2", 60);
  assert.equal(h("gap-vps/t2"), 0);
  assert.equal(h("gap-end-pinned"), 82, "the lower half opens it below");
  assert.deepEqual(JSON.parse(JSON.stringify(find(root(), "gap-end-pinned").style.transition)), ["height", { duration: 150, easing: "ease-out" }], "gaps slide natively");
  release();
  assert.deepEqual(pins(), ["vps/t2", "t0"]);
  lift("card-t0"); over("card-vps/t2", 10);
  assert.equal(badge("pin"), null, "reordering pins says nothing");
  release();
  assert.deepEqual(pins(), ["t0", "vps/t2"], "within Pinned it reorders");
  drag("card-t0", "card-t0", 70);
  assert.deepEqual(pins(), ["t0", "vps/t2"], "back over its own place, nothing changes");

  lift("card-t0");
  assert.ok(find(root(), "active-placeholder"), "empty Active shows a dashed drop target");
  over("active-placeholder");
  assert.equal(find(root(), "active-placeholder"), null);
  assert.equal(h("gap-head-active"), 82, "targeted, it opens a gap instead");
  assert.ok(badge("unpin"));
  release();
  assert.deepEqual(pins(), ["vps/t2"], "onto Active unpins");

  lift("card-t0");
  assert.ok(find(root(), "settled-header") && find(root(), "settled-placeholder"), "Settled shows while dragging, even empty");
  over("settled-header");
  assert.ok(badge("settle"));
  release();
  const [, addr, value] = f.labelled.pop();
  assert.equal(addr, "t0");
  assert.match(value, /^settled=\d+:/, "dropped on Settled, it's settled");
  t0.labels = { settled: value.slice(8) };
  inbox.open = true;
  // As T3's settled rows, it leads with its project's mark, the one its card shows, not its program's icon.
  const mark = find(root(), "slim-mark-t0");
  assert.deepEqual(strings(mark), ["P"], "project 0's monogram");
  assert.ok(!walk(mark).some(n => n.kind === "svg" && n.source === "icons/pi.svg"), "no program icon");
  lift("slim-t0");
  assert.ok(find(find(root(), "drag-ghost"), "ghost-slim-t0"), "a settled row lifts as its row");
  over("card-vps/t2", 10);
  assert.equal(h("gap-vps/t2"), 80, "the gap is the destination's: a card");
  assert.ok(badge("pin"), "a settled row can be pinned");
  over("active-rest");
  assert.equal(h("gap-head-active"), 80, "the empty space above the shelves counts as Active");
  assert.ok(badge("unsettle"));
  release();
  assert.deepEqual(f.labelled.pop(), ["label", "t0", "settled="], "dropped on Active, it's unsettled");
  assert.deepEqual(pins(), ["vps/t2"]);
  lift("card-t0");
  assert.equal(find(root(), "drag-ghost"), null, "a row whose change hasn't landed yet stays put");
  release();
  t0.labels = {};

  f.state["agents.pins"] = [];
  fire(find(root(), "card-t0"), "on_hover", true, run);
  const settleButton = find(root(), "settle-t0");
  fire(settleButton, "on_mouse_down:left", { position: { x: 0, y: 0 } }, { ...run, stop_propagation() {} });
  fire(root(), "on_mouse_move", { position: { x: 0, y: 20 }, local_position: { x: 0, y: 120 } }, run);
  over("card-vps/t2");
  assert.ok(find(find(root(), "card-t0"), "badge-settle") && find(find(root(), "card-vps/t2"), "badge-settle"), "a sweep from Settle marks the run");
  assert.equal(find(root(), "drag-ghost"), null, "a sweep lifts nothing");
  release();
  assert.deepEqual(f.labelled.splice(0).map(([, a, v]) => [a, v.split("=")[0]]).sort(), [["t0", "settled"], ["vps/t2", "settled"]], "letting go settles every marked row");
  fire(settleButton, "on_click", {}, run);
  assert.equal(f.labelled.length, 0, "the button's click after a sweep doesn't settle again");
  // As core writes them back: the label the settle set, else the row stays pending and won't lift (its stamp is ms).
  for (const k of [t0, f.terminals().find(k => k.address === "vps/t2")]) k.labels = { settled: inbox.pending.settled[k.address] ?? `${Date.now()}:0` };

  const n = f.labelled.length;
  lift("slim-vps/t2"); over("active");
  fire(root(), "on_key_down", { keystroke: "escape" }, run);
  assert.equal(find(root(), "drag-ghost"), null, "Esc puts it back");
  release();
  lift("slim-vps/t2"); over("active");
  fire(root(), "on_hover", false, run);
  assert.equal(find(root(), "drag-ghost"), null, "leaving off a side puts it back");
  release();
  const before = f.calls.length;
  lift("slim-vps/t2"); over("active");
  assert.ok(find(root(), "drag-ghost"), "the drag is under way before its row leaves");
  const gone = f.agents().splice(1, 1)[0];
  assert.equal(find(root(), "drag-ghost"), null, "a row that leaves the list ends the drag");
  f.agents().push(gone);
  release();
  assert.deepEqual(f.calls.slice(before), [["pane.focus", { pane: "p9" }]], "and the release still hands the keyboard back");
  assert.equal(f.labelled.length, n, "none of those changed anything");
  // Off the bottom edge, past the Settled shelf, it lands where the badge said (Herdr reports no release outside).
  fire(root(), "on_size_change", { width: 256, height: 900 }, run);
  for (const k of f.terminals()) if (k.address === "vps/t2") k.labels = {};
  lift("card-vps/t2");
  fire(root(), "on_mouse_move", { position: { x: 0, y: 40 }, local_position: { x: 130, y: 895 } }, run);
  over("settled-header");
  fire(root(), "on_hover", false, run);
  assert.equal(find(root(), "drag-ghost"), null);
  assert.deepEqual(f.labelled.pop()?.slice(0, 2), ["label", "vps/t2"], "leaving off the bottom settles it");
  const calls = f.calls.length;
  lift("slim-vps/t2"); over("slim-vps/t2");
  fire(find(root(), "slim-vps/t2"), "on_click", {}, run);
  release();
  assert.ok(!f.calls.slice(calls).some(([name]) => name === "agent.focus"), "a drag's release doesn't open the row");

  const old = fixture(256);
  old.stores.set("t3-agents", new Map([["pins", '["t0"]']]));
  old.load("t3-agents");
  assert.deepEqual([...old.state["agents.pins"]], ["t0"], "older pins move to the shared set, so a drag in the inbox keeps them");

  const w = fixture(256), wf = w.load("t3-inbox");
  for (const k of w.terminals()) if (k.parent) k.status = "idle";
  fire(find(wf.render(cx), "card-t0"), "on_mouse_down:left", { position: { x: 0, y: 0 }, local_position: { x: 0, y: 10 }, bounds: { height: 80 } }, cx);
  fire(wf.render(cx), "on_mouse_move", { position: { x: 0, y: 30 }, local_position: { x: 0, y: 130 } }, cx);
  assert.equal(find(wf.render(cx), "drag-ghost"), null, "a working card doesn't lift");
}

{
  const f = fixture(256), sp = f.load("t3-spaces"), ag = f.load("t3-agents");
  let root = sp.render(cx);
  // The Spaces/Agents divider is the layout's own, as upstream: neither list sizes it.
  for (const tree of [root, ag.render(cx)]) assert.equal(walk(tree).filter(n => "on_size_change" in n.handlers).length, 0, "no list measures itself to move the divider");
  assert.ok(!f.calls.some(([name]) => name === "layout.resize"), "rendering never resizes the layout");
  // Dragging, as the inbox's: rows are 32px, this computer's header, s0, s1, then vps's header and s2.
  const press = (id, y = 0) => fire(find(sp.render(cx), id), "on_mouse_down:left", { position: { x: 0, y } }, cx);
  const move = (y, x = 0) => fire(find(sp.render(cx), "space-list"), "on_mouse_move", { position: { x, y } }, cx);
  const release = () => fire(find(sp.render(cx), "space-list"), "on_mouse_up:left", {}, cx);
  const keyOf = n => "key" in n ? n.key : null;
  const rows = tree => find(tree, "space-rows").items.filter(n => keyOf(n)?.startsWith("fly-")).map(n => keyOf(n.items[0]) ?? `gap-${n.items[0].style.h}`);
  const fly = (tree, key) => walk(tree).find(n => keyOf(n)?.startsWith(`fly-${key}-`));
  const moves = () => f.calls.filter(([name]) => name === "space.move");
  press("space-s0"); move(4, 3);
  assert.equal(find(sp.render(cx), "space-lifted"), null, "under 6px it's still a click");
  const still = find(sp.render(cx), "space-s0");
  fire(still, "on_mouse_up:left", {}, cx);
  assert.deepEqual(f.calls.pop(), ["space.select", { id: "s0" }], "a press that didn't move selects");
  release();
  // The first frame lifted is the list as it was, the gap in its place, nothing fading; the next opens the gap where it lands.
  press("space-s0"); move(40);
  root = sp.render(cx);
  assert.deepEqual(rows(root), ["machine-local", "gap-32", "space-s1", "machine-vps", "space-s2"]);
  assert.ok(!find(root, "space-rows").items.some(n => keyOf(n)?.startsWith("leaving-")), "nothing leaves: the lifted row is still there");
  root = sp.render(cx);
  assert.deepEqual([rows(root)[2], fly(root, "space-s1").style.top], ["gap-32", 32], "then the rows make way, sliding");
  release();
  f.calls.splice(0); sp.landing = null;
  press("space-s0"); move(10);
  root = sp.render(cx);
  assert.deepEqual(rows(root), ["machine-local", "gap-32", "space-s1", "machine-vps", "space-s2"], "lifted, its place holds a gap");
  const lifted = find(root, "space-lifted");
  assert.equal(lifted.style.top, 42, "it rides the pointer");
  assert.ok(strings(lifted).includes("project 0"));
  sp.hot = "space-new"; sp.overMachine = "machine-local";
  root = sp.render(cx);
  assert.deepEqual([sp.hot, sp.overMachine, find(root, "space-s1").hoverStyle.bg, find(root, "space-s1").style.active], [null, null, undefined, undefined], "while lifted, nothing lights under it");
  fire(still, "on_mouse_up:left", {}, cx);
  assert.ok(!f.calls.some(([name]) => name === "space.select"), "a drag's release doesn't select");
  // Past s1's middle, measured from the rows without the lifted one, s1 makes way, sliding up.
  move(24);
  root = sp.render(cx);
  assert.deepEqual(rows(root), ["machine-local", "space-s1", "gap-32", "machine-vps", "space-s2"], "the list opens where it would land");
  assert.equal(fly(root, "space-s1").style.top, 32, "s1 slides up from where it was");
  assert.equal(find(root, "space-lifted").style.top, 56);
  // Half a row onto vps's rows: no machine takes another's space, so it goes back where it was.
  move(60);
  assert.deepEqual(rows(sp.render(cx)), ["machine-local", "gap-32", "space-s1", "machine-vps", "space-s2"], "over another machine, the gap goes home");
  release();
  assert.deepEqual(moves(), [], "cross-machine drag remains rejected");
  assert.equal(fly(sp.render(cx), "space-s0").style.top, 92 - 32, "and it slides back from where it was let go");
  press("space-s0"); move(10); sp.render(cx); move(24); sp.render(cx);
  release();
  assert.deepEqual(moves(), [["space.move", { id: "s0", index: 2 }]], "let go, it lands where the gap was");
  root = sp.render(cx);
  assert.deepEqual(rows(root), ["machine-local", "space-s1", "space-s0", "machine-vps", "space-s2"], "until the move's echo, the rows stay as they were let go");
  assert.deepEqual([fly(root, "space-s0").style.top, fly(root, "space-s0").style.opacity], [56 - 64, 1], "it slides from where it was let go to its place");
  f.spaces().splice(1, 0, f.spaces().shift()); // The move's echo.
  assert.deepEqual(rows(sp.render(cx)), ["machine-local", "space-s1", "space-s0", "machine-vps", "space-s2"]);
  assert.equal(sp.landing, null, "once it's arrived the model's order is the list's");
  f.spaces().splice(0, 0, f.spaces().splice(1, 1)[0]);
  sp.render(cx);
  // vps's one space has nowhere to go in its machine; pulled up into this computer's rows, it stays.
  press("space-s2", 0); move(-10); sp.render(cx); move(-60); sp.render(cx);
  assert.deepEqual(rows(sp.render(cx)), ["machine-local", "space-s0", "space-s1", "machine-vps", "gap-32"]);
  release();
  assert.deepEqual(moves().length, 1, "nor into another machine from below");
  // Leaving the list puts it back.
  press("space-s1"); move(-10); sp.render(cx); move(-30); sp.render(cx);
  fire(find(sp.render(cx), "space-list"), "on_hover", false, cx);
  assert.equal(sp.drag, null, "leaving ends the drag");
  assert.equal(moves().length, 1, "and moves nothing");
  assert.equal(fly(sp.render(cx), "space-s1").style.top, 34 - 64, "it slides back");
  // A space that leaves the list while lifted ends the drag.
  press("space-s1"); move(20); sp.render(cx);
  sp.folded.add(null);
  assert.equal(find(sp.render(cx), "space-lifted"), null);
  assert.equal(sp.drag, null);
  sp.folded.delete(null);
}

{
  // The list's motion, as T3's: a row that comes fades in riding the kept row above it, one that goes fades out as an inert
  // ghost of itself, the rest slide; 150ms ease-out.
  const f = fixture(256), sp = f.load("t3-spaces"), list = f.spaces();
  const keyOf = n => "key" in n ? n.key : null;
  const fly = (tree, key) => walk(tree).find(n => keyOf(n)?.startsWith(`fly-${key}-`));
  const leaving = (tree, key) => find(tree, "space-rows").items.find(n => keyOf(n)?.startsWith(`leaving-${key}-`));
  const settle = () => cx.timers.filter(t => t.ms === 16 && !t.gone).forEach(t => { t.gone = true; t.fn(cx); });
  let tree = sp.render(cx);
  assert.deepEqual([fly(tree, "space-s1").style.opacity, fly(tree, "space-s1").style.top], [1, 0], "the first frame plays nothing");
  // A new space joins when it's shown (its git known, or a moment gone), and its fade starts then.
  list.splice(2, 0, { id: "s3", name: "project 3", active: false, folder: "/work/p3", machine: null, tabs: [] });
  tree = sp.render(cx);
  assert.equal(fly(tree, "space-s3"), undefined, "waiting for its git, it isn't drawn");
  sp.born.s3 = Date.now() - 2000;
  tree = sp.render(cx);
  assert.deepEqual([fly(tree, "space-s3").style.opacity, fly(tree, "space-s3").style.top], [0, 0], "shown, it starts clear, riding s1 (still)");
  assert.equal(fly(tree, "machine-vps").style.top, -32, "the rows below make room");
  settle();
  tree = sp.render(cx);
  assert.deepEqual([fly(tree, "space-s3").style.opacity, fly(tree, "machine-vps").style.top], [1, 0], "then let go");
  // Closed, it fades out where it was, lined up with the rows inside the list's padding.
  list.splice(2, 1);
  tree = sp.render(cx);
  const gone = leaving(tree, "space-s3");
  assert.deepEqual([gone.style.top, gone.style.opacity], [96, 1]);
  assert.ok("relative" in find(tree, "space-rows").style && find(tree, "space-content").items[0] === find(tree, "space-rows"), "clones are placed in the rows' own box");
  assert.equal(fly(tree, "machine-vps").style.top, 32, "the rows below close up");
  settle();
  assert.equal(leaving(sp.render(cx), "space-s3").style.opacity, 0, "it fades out");
  // A machine folding: its rows go the same way, its header stays.
  fire(find(sp.render(cx), "machine-vps"), "on_click", {}, cx);
  tree = sp.render(cx);
  assert.ok(leaving(tree, "space-s2") && fly(tree, "machine-vps") && !fly(tree, "space-s2"), "its spaces leave");
}

{
  // A ghost (a lifted or leaving row) is drawn as its row, without the list's ids, handlers, labels or keyboard stops.
  const o = fixture(256), view = o.load("t3-spaces"), list = o.spaces(), repo = JSON.stringify([null, "/w/E/.git"]);
  const keyOf = n => "key" in n ? n.key : null;
  o.state["t3-focus"] = "elsewhere"; // Keyboard mode: the list's rows are stops.
  list[2].machine = null;
  const wt = { repo, linked: true, name: "E", branch: "x", ahead: 0, behind: 0 };
  view.git[JSON.stringify([null, "/work/p1"])] = wt;
  view.git[JSON.stringify([null, "/work/s2"])] = { ...wt, branch: "y" };
  view.git[JSON.stringify([null, "/work/s0"])] = { repo: "r0", linked: false, name: "p", branch: "feat", ahead: 2, behind: 1 };
  view.machines = [{ name: "busy", state: "connected" }, { name: "spare", state: "asleep" }];
  view.render(cx);
  assert.deepEqual(plain(view.rows.map(e => e.key)), ["machine-local", "space-s0", `repo-${repo}`, "space-s1", "space-s2", "machine-busy", "machine-loading-busy", "machine-spare", "machine-new-spare"]);
  for (const e of view.rows.filter(e => e.ghost)) {
    const ghost = e.ghost();
    assert.ok(walk(ghost).every(n => !Object.keys(n.handlers).length && !("track_focus" in n.style) && !keyOf(n)), `${e.key}'s ghost is inert`);
    assert.deepEqual(strings(ghost), strings(e.el), `${e.key}'s ghost reads as its row`);
  }
}

{
  const f = fixture(240), ag = f.load("t3-agents"), sp = f.load("t3-spaces");
  const worktree = sp.row({ w: f.spaces()[1], i: 1, g: null, tree: "└─" }, f.theme());
  assert.equal(inFlow(worktree)[0].style.pl, 20, "worktree icon lines up with a sub-agent's");
  assert.equal(inFlow(worktree)[0].items[0].style.size, 16);
  const treeLines = row => row.items.filter(n => "absolute" in n.style && "left" in n.style).map(n => [n.style.left, "border_b" in n.style ? "elbow" : "line"]);
  assert.deepEqual(treeLines(worktree), [[17.25, "elbow"]], "last worktree turns in from under its checkout");
  assert.deepEqual(treeLines(sp.row({ w: f.spaces()[1], i: 1, g: null, tree: "├─" }, f.theme())), [[17.25, "line"], [17.25, "elbow"]], "a middle worktree keeps the line going");
  assert.deepEqual(treeLines(sp.row({ w: f.spaces()[1], i: 1, g: null, tree: null }, f.theme())), [], "checkouts draw no lines");
  {
    // project 1 is a worktree of project 0's repo.
    const g = { repo: "/r", linked: false, name: "project 0", branch: "main", ahead: 0, behind: 0 };
    sp.git[JSON.stringify([null, "/work/s0"])] = g;
    sp.git[JSON.stringify([null, "/work/p1"])] = { ...g, linked: true, branch: "x" };
    const ids = () => [...sp.ordered().map(r => r.w.id)];
    assert.deepEqual(ids(), ["s0", "s1", "s2"]);
    const arrow = find(sp.render(cx), "space-fold-s0");
    assert.equal(8 + 8 + arrow.style.mr + arrow.style.min_w / 2, 23, "its center is the column of the heading's last button");
    // T3 turns its arrow; Herdr can't, so the two directions cross-fade in one slot, ids stable so the fade plays.
    const way = (tree, name) => find(tree, `space-fold-s0-${name}`);
    assert.deepEqual([way(arrow, "down").items[0].source, way(arrow, "down").style.opacity, way(arrow, "right").style.opacity, arrow.items.length], ["mods/t3-spaces/chevron-down.svg", 1, 0, 1], "a checkout shows its fold arrow at the end, as an agent parent");
    assert.equal(arrow.style.text_color, f.theme().dim, "the arrow is dim");
    assert.equal(arrow.hoverStyle.bg, undefined, "no ground, as T3's row controls");
    fire(arrow, "on_hover", true, cx);
    assert.equal(way(find(sp.render(cx), "space-fold-s0"), "down").items[0].style.text_color, f.theme().foreground, "hovered, it brightens");
    fire(arrow, "on_hover", false, cx);
    let stopped = false;
    fire(arrow, "on_mouse_down:left", {}, { ...cx, stop_propagation() { stopped = true; } });
    assert.ok(stopped, "pressing the arrow neither selects nor drags the space");
    const before = f.calls.length;
    fire(arrow, "on_click", {}, cx);
    assert.deepEqual(ids(), ["s0", "s2"], "folding hides the worktrees");
    assert.equal(f.calls.length, before, "folding runs no command");
    assert.equal(f.stores.get("t3-spaces").get("repos.folded"), JSON.stringify(["/r"]), "folding persists");
    const count = find(sp.render(cx), "space-fold-s0");
    assert.deepEqual([way(count, "down").style.opacity, way(count, "right").style.opacity], [0, 1], "folded, it points right");
    assert.deepEqual([count.items[1], count.style.text_color], ["1", f.theme().dim], "folded, a dim count says how many");
    fire(count, "on_click", {}, cx);
    assert.deepEqual(ids(), ["s0", "s1", "s2"], "the count unfolds them");
    assert.equal(find(sp.render(cx), "space-fold-s0").items.length, 1);
    sp.git = {};
  }
  {
    // A repo's worktrees hang together with its checkout closed, under a dim row standing for it.
    const o = fixture(256), list = o.spaces(), view = o.load("t3-spaces"), repo = JSON.stringify([null, "/w/Engineer/.git"]);
    list[2].machine = null;
    const set = (id, g) => { view.git[JSON.stringify([null, `/work/${id}`])] = g; };
    const tree = { repo, linked: true, name: "Engineer", branch: "x", ahead: 0, behind: 0 };
    set("p1", tree); set("s2", { ...tree, branch: "y" });
    const headId = `repo-${repo}`, rows = () => [...view.ordered().map(r => r.w.id)];
    assert.deepEqual(rows(), ["s0", headId, "s1", "s2"], "the head takes its first worktree's place");
    assert.deepEqual([...view.ordered().map(r => r.tree ?? null)], [null, null, "├─", "└─"]);
    const moves = () => o.calls.filter(([name]) => name === "space.move");
    assert.deepEqual(moves(), [], "a row with no space never reaches the model's order");
    // Dragged past it, a space goes past the whole group: its worktrees count, though the head isn't a space.
    fire(find(view.render(cx), "space-s0"), "on_mouse_down:left", { position: { x: 0, y: 0 } }, cx);
    for (const y of [10, 100]) fire(find(view.render(cx), "space-list"), "on_mouse_move", { position: { x: 0, y } }, cx);
    view.render(cx);
    fire(find(view.render(cx), "space-list"), "on_mouse_up:left", {}, cx);
    assert.deepEqual(moves(), [["space.move", { id: "s0", index: 3 }]], "after the group's last worktree");
    view.landing = null;
    let root = view.render(cx), head = find(root, headId);
    assert.ok(strings(head).includes("Engineer"), "named for its repo");
    // Its arrow is a checkout's: dim until itself hovered, in the same column.
    const foldId = `${headId}-fold`;
    assert.equal(find(root, foldId).style.text_color, o.theme().dim, "the arrow is dim, as a checkout's");
    assert.equal(find(root, foldId).style.mr, -3);
    // Its arrow folds, and makes nothing.
    const before = o.calls.length;
    let halted = false;
    fire(find(root, foldId), "on_click", {}, { ...cx, stop_propagation() { halted = true; } });
    assert.ok(halted, "the arrow's click isn't the row's");
    assert.equal(o.calls.length, before, "folding makes no space");
    assert.deepEqual(rows(), ["s0", headId], "folded, its worktrees go");
    assert.ok(strings(find(view.render(cx), headId)).includes("2"), "and it says how many");
    // Closed, the worktree you're on still shows, last in the tree, and isn't counted.
    list.forEach(s => { s.active = s.id === "s2"; });
    assert.deepEqual(rows(), ["s0", headId, "s2"], "the worktree in view stays");
    assert.equal(view.ordered().at(-1).tree, "└─");
    assert.ok(strings(find(view.render(cx), headId)).includes("1"));
    list.forEach(s => { s.active = s.id === "s0"; });
    fire(find(view.render(cx), foldId), "on_click", {}, cx);
    // No tab to go to: the click opens the checkout, once however often it's pressed.
    assert.equal(find(view.render(cx), headId).style.accessibility_label, "Open Engineer");
    const opens = () => o.calls.filter(([name]) => name === "space.new").length;
    fire(find(view.render(cx), headId), "on_click", {}, cx);
    assert.deepEqual(o.calls.at(-1), ["space.new", { folder: "/w/Engineer", machine: "" }]);
    fire(find(view.render(cx), headId), "on_click", {}, cx);
    assert.equal(opens(), 1, "a second press doesn't make a second space");
    // It arrives last, and takes the head's place, the fold kept: the group doesn't jump to the end.
    fire(find(view.render(cx), foldId), "on_click", {}, cx);
    list.push({ id: "s9", name: "Engineer", active: false, folder: "/w/Engineer", machine: null, tabs: [] });
    view.shown.add("s9");
    view.git[JSON.stringify([null, "/w/Engineer"])] = { ...tree, linked: false, branch: "main" };
    assert.deepEqual(rows(), ["s0", "s9"], "with its checkout open the head is gone, the fold kept");
    assert.deepEqual(moves().at(-1), ["space.move", { id: "s9", index: 2 }], "the checkout moves to where the head was");
    list.splice(1, 0, list.pop());
    assert.deepEqual(rows(), ["s0", "s9"]);
    assert.equal(view.opening, null, "in place, it's done");
    fire(find(view.render(cx), "space-fold-s9"), "on_click", {}, cx);
    assert.deepEqual(rows(), ["s0", "s9", "s1", "s2"]);
    list.splice(1, 1);
    delete view.git[JSON.stringify([null, "/w/Engineer"])];
    // One worktree alone stays a plain row.
    set("s0", null);
    delete view.git[JSON.stringify([null, "/work/s2"])];
    assert.deepEqual(rows(), ["s0", "s1", "s2"], "one alone gets no row over it");
    assert.equal(view.ordered()[1].tree, null);
    // No .git folder (a bare repo): nothing to open, so no pen.
    const bare = JSON.stringify([null, "/w/bare.git"]);
    set("p1", { ...tree, repo: bare }); set("s2", { ...tree, repo: bare });
    const made = opens();
    fire(find(view.render(cx), `repo-${bare}`), "on_click", {}, cx);
    assert.equal(opens(), made, "there the click folds");
    assert.ok(view.foldedRepos.has(bare));
  }
  {
    // A worktree away from its checkout: the model moves to the rows' order, so space keys go down the list.
    const o = fixture(256), list = o.spaces(), view = o.load("t3-spaces");
    list[2].machine = null;
    const g = { repo: "/r", linked: false, name: "project 0", branch: "main", ahead: 0, behind: 0 };
    view.git[JSON.stringify([null, "/work/s0"])] = g;
    view.git[JSON.stringify([null, "/work/s2"])] = { ...g, linked: true, branch: "x" };
    const moves = () => o.calls.filter(([name]) => name === "space.move");
    const ids = () => [...view.ordered().map(r => r.w.id)];
    assert.deepEqual(ids(), ["s0", "s2", "s1"]);
    assert.deepEqual(moves(), [["space.move", { id: "s2", index: 2 }]], "the worktree moves under its checkout");
    ids();
    assert.equal(moves().length, 1, "a move is queued once");
    view.ordering.at -= 1000;
    ids();
    assert.equal(moves().length, 2, "a write that lost a sync conflict is retried");
    list.splice(1, 0, list.splice(2, 1)[0]); // The move's echo.
    ids();
    assert.equal(view.ordering, null, "in order, nothing is pending");
    view.foldedRepos.add("/r");
    assert.deepEqual(ids(), ["s0", "s1"], "folding hides the worktree");
    assert.equal(moves().length, 2, "folding moves nothing");
    list.push(list.splice(1, 1)[0]);
    assert.deepEqual(ids(), ["s0", "s1"]);
    assert.deepEqual(moves().pop(), ["space.move", { id: "s2", index: 2 }], "a folded worktree still keeps its place");
    list.splice(1, 0, list.splice(2, 1)[0]);
    view.foldedRepos.clear();
    // Dragging: rows are 32px, and the model moves as the rows did, worktrees after their checkout.
    const keyOf = n => "key" in n ? n.key : null;
    const order = tree => find(tree, "space-rows").items.filter(n => keyOf(n)?.startsWith("fly-")).map(n => keyOf(n.items[0]) ?? `gap-${n.items[0].style.h}`);
    const lift = (id, ...ys) => {
      fire(find(view.render(cx), id), "on_mouse_down:left", { position: { x: 0, y: 0 } }, cx);
      for (const y of [Math.sign(ys[0]) * 10, ...ys]) fire(find(view.render(cx), "space-list"), "on_mouse_move", { position: { x: 0, y } }, cx);
      return view.render(cx);
    };
    const drop = () => fire(find(view.render(cx), "space-list"), "on_mouse_up:left", {}, cx);
    assert.deepEqual(list.map(s => s.id), ["s0", "s2", "s1"]);
    // A checkout lifts with its worktrees and lands as a group, between groups.
    let tree = lift("space-s0", 40);
    assert.deepEqual(order(tree), ["space-s1", "gap-64"], "the gap is the group's");
    assert.equal(find(tree, "space-lifted").style.top, 32, "it stays inside the list");
    assert.deepEqual(find(tree, "space-lifted").items.map(n => strings(n).find(x => x.startsWith("project"))), ["project 0", "project 2"], "its worktree rides with it");
    // A drag holds its space, not an index a move can shift under it.
    const up = find(view.render(cx), "space-list");
    list.unshift(list.pop());
    fire(up, "on_mouse_up:left", {}, cx);
    assert.deepEqual(moves().pop(), ["space.move", { id: "s0", index: 2 }], "after s1, in the model as it is when let go");
    list.splice(0, Infinity, ...["s0", "s2", "s1"].map(id => list.find(s => s.id === id)));
    view.landing = null;
    tree = lift("space-s1", -40);
    assert.deepEqual(order(tree), ["gap-32", "space-s0", "space-s2"], "a space goes over a group, not into it");
    drop();
    assert.deepEqual(moves().pop(), ["space.move", { id: "s1", index: 1 }]);
    view.landing = null;
    tree = lift("space-s1", -20);
    assert.deepEqual(order(tree), ["space-s0", "space-s2", "gap-32"], "halfway into a group it stays below it");
    drop();
    // A worktree moves among its own: past the group's ends it stops at them, as ordered() would put it back there.
    view.git[JSON.stringify([null, "/work/p1"])] = { ...g, linked: true, branch: "y" };
    assert.deepEqual(ids(), ["s0", "s2", "s1"]);
    tree = lift("space-s2", 60);
    assert.deepEqual(order(tree), ["space-s0", "space-s1", "gap-32"], "below its last sibling");
    drop();
    assert.deepEqual(moves().pop(), ["space.move", { id: "s2", index: 3 }]);
    view.landing = null;
    tree = lift("space-s1", -90);
    assert.deepEqual(order(tree), ["space-s0", "gap-32", "space-s2"], "never above its checkout");
    drop();
    assert.deepEqual(moves().pop(), ["space.move", { id: "s1", index: 2 }]);
    view.landing = null;
    delete view.git[JSON.stringify([null, "/work/p1"])];
    tree = lift("space-s2", 60);
    assert.deepEqual(order(tree), ["space-s0", "gap-32", "space-s1"], "a lone worktree has nowhere else to go");
    const n = moves().length;
    drop();
    assert.equal(moves().length, n, "so it moves nothing");
    // Without worktrees, a space dropped between two lands between them.
    for (const id of ["s0", "s2"]) delete view.git[JSON.stringify([null, `/work/${id}`])];
    tree = lift("space-s0", 40);
    assert.deepEqual(order(tree), ["space-s2", "gap-32", "space-s1"]);
    drop();
    assert.deepEqual(moves().pop(), ["space.move", { id: "s0", index: 2 }]);
    // Folded, a group's hidden worktrees still count: a space dropped after it goes after them all.
    const s3 = { id: "s3", name: "project 3", active: false, folder: "/work/p3", machine: null, tabs: [] };
    list.splice(0, Infinity, s3, ...["s0", "s2", "s1"].map(id => list.find(s => s.id === id)));
    view.shown.add("s3");
    view.git[JSON.stringify([null, "/work/s0"])] = g;
    for (const k of ["/work/s2", "/work/p1"]) view.git[JSON.stringify([null, k])] = { ...g, linked: true };
    view.foldedRepos.add("/r");
    list.forEach(s => { s.active = s.id === "s2"; });
    view.landing = null;
    assert.deepEqual(ids(), ["s3", "s0", "s2"]);
    tree = lift("space-s3", 70);
    assert.deepEqual(order(tree), ["space-s0", "space-s2", "gap-32"]);
    drop();
    assert.deepEqual(moves().pop(), ["space.move", { id: "s3", index: 4 }]);
  }
  delete f.agents()[0].program.icon;
  ag.toggleFold("t0", cx);
  const tree = ag.render(cx);
  assert.equal(find(tree, "ag-t0").items[0].style.size, 16, "missing icons do not shift names");
  assert.equal(inFlow(find(tree, "sub-child"))[0].style.size, 16);
  fire(find(tree, "agent-fold-t0"), "on_click", {}, cx);
  assert.equal(find(ag.render(cx), "sub-grandchild"), null, "missing icons do not disable folding");
  const menu = f.load("t3-agents", { sortMenu: true }).render(cx);
  assert.equal(find(menu, "sort-grouped").style.bg, undefined, "as T3's menus, nothing's lit until a key or the pointer arrives");
  assert.ok(walk(find(menu, "sort-grouped")).some(n => n.source === "mods/t3-agents/check.svg"), "the current sort keeps its check");
  fire(find(menu, "sort-priority"), "on_click", {}, cx);
  assert.equal(f.state["agents.sort"], "priority");
  const byPriority = find(ag.render(cx), "ag-t0"), names = byPriority.items[1];
  assert.deepEqual(strings(names), ["local task", "project 0"], "without a space header the task leads and its space follows; the address stays in the pane header");
  assert.deepEqual([names.items[1].style.text_color, names.items[1].style.text_size, names.items[1].style.flex_shrink], [f.theme().dim, 12, 1000], "the space is dim, smaller, and gives way first");
}

{
  const f = fixture(256), first = f.spaces()[0].tabs[0];
  Object.assign(first, { active: true, status: "working" });
  f.spaces()[0].tabs.push({ id: "other", name: "other task", active: false });
  const tabs = f.load("t3-tabs"), root = tabs.render(cx);
  assert.equal(find(root, "tab-b0").hoverStyle.bg, undefined);
  assert.equal(find(root, "tab-other").hoverStyle.bg, f.theme().hover);
  assert.equal(find(root, "tab-strip").style.gap, 4);
  // Tabs take their whole names while the room allows, the longest give way first; past that the strip keeps the active tab in view.
  {
    const strip = f.spaces()[0].tabs, kept = strip.splice(0), view = f.load("t3-tabs");
    strip.push(...["a", "b", "c", "d"].map(id => ({ id, name: id, active: id === "a" })));
    const at = () => Math.abs(find(view.render(cx), "tab-strip").style.ml);
    const w = (id) => find(view.render(cx), `tab-${id}`).style.w;
    const pick = (id) => strip.forEach(c => { c.active = c.id === id; });
    const room = (width) => fire(find(view.render(cx), "tab-scroll"), "on_size_change", { width }, cx);
    const wheel = (x, y) => fire(view.render(cx), "on_scroll_wheel", { delta: { x, y } }, cx);
    // A name's width, so its tab is `whole` wide: 47 around the name.
    const name = (id, whole) => fire(find(view.render(cx), `name-${id}`), "on_size_change", { width: whole - 47 }, cx);
    assert.equal(w("a"), 144, "before its name is measured");
    assert.equal(find(view.render(cx), "name-a").style.h, 0, "the measure doesn't show");
    for (const id of "abcd") name(id, 300);
    room(1212);
    assert.deepEqual([..."abcd"].map(w), [300, 300, 300, 300], "room for them all: every name whole");
    room(1012);
    assert.deepEqual([..."abcd"].map(w), [250, 250, 250, 250], "too little: they share it");
    name("b", 100);
    room(812);
    assert.deepEqual([..."abcd"].map(w), [240, 100, 230, 230], "a short name keeps its width, the active tab holds 240, the long ones share the rest");
    room(500);
    assert.deepEqual([..."abcd"].map(w), [240, 100, 144, 144], "squeezed: the active tab stops at 240, the rest at 144, and the strip scrolls");
    pick("b");
    assert.deepEqual([..."abcd"].map(w), [144, 100, 144, 144], "a short active tab asks for no more");
    name("b", 47 + 14);
    assert.equal(w("b"), 96, "a name as short as `Pi` still gets a tab 96px wide");
    for (const id of "abcd") name(id, 100);
    pick("a");
    room(250);
    assert.equal(at(), 0, "the first tab is at its place");
    pick("d");
    assert.equal(at(), 162, "the last tab lands at the right edge: 4 tabs, 3 gaps, 250 of room");
    pick("b");
    assert.equal(at(), 104, "an earlier tab lands at the left edge");
    pick("c");
    assert.equal(at(), 104, "one already in view doesn't move the strip");
    wheel(-30, 0);
    assert.equal(at(), 134, "a swipe moves the strip");
    assert.equal(at(), 134, "and the next render doesn't pull it back");
    f.calls.length = 0;
    wheel(0, 3);
    assert.deepEqual(f.calls.splice(0), [["tab.prev", {}]], "the wheel still walks the tabs");
    assert.equal(at(), 134);
    wheel(-10000, 0);
    assert.equal(at(), 162, "a swipe stops at the last tab");
    wheel(10000, 0);
    assert.equal(at(), 0, "and at the first");
    // Its name lengthening moves the strip for its new end; another tab's doesn't.
    pick("d");
    assert.equal(at(), 162);
    name("d", 200);
    assert.equal(at(), 262, "the active tab's end stays in view");
    name("a", 120);
    assert.equal(at(), 262, "another tab's width doesn't move the strip");
    name("a", 100);
    pick("b");
    room(60);
    assert.equal(at(), 104, "a tab wider than the room shows its start");
    room(1000);
    pick("d");
    assert.equal(at(), 0, "with room for every tab the strip stays put");
    strip.splice(0, strip.length, ...kept);
  }
  // A tab nobody named reads as its agent, the name its pane header and inbox card show.
  Object.assign(first, { name: "1", named: false });
  f.terminals().find(k => k.address === "t0").labels = { "pi.session": "mine" };
  assert.ok(strings(find(f.load("t3-tabs").render(cx), "tab-b0")).includes("mine"), "an unnamed tab reads as its agent's session");
  assert.ok(strings(f.load("t3-pane", { pane: "p0" }).render(cx)).includes("mine"), "its pane header reads the same");

  // New opens a terminal tab in the space picked: no agent step.
  const menu = f.load("t3-new-menu"); f.calls.length = 0;
  menu.choose(menu.items().find(item => item.space?.id === f.spaces()[0].id));
  assert.deepEqual(f.calls.splice(0), [["tab.new", { space: f.spaces()[0].id }]], "New opens a tab");
  // Two machines: New space asks which, as T3's Add project asks for an environment.
  fire(find(menu.render(cx), "space-new"), "on_click", {}, cx);
  assert.deepEqual(f.calls, [], "New space asks first");
  menu.choose(menu.items().find(item => item.machine === "vps"));
  assert.deepEqual(f.calls.pop(), ["space.new", { machine: "vps" }], "New space opens a space there");
  f.calls.length = 0;
  {
    // The sidebar's way to a new machine, in the footer both Lists and Inbox keep.
    const f = fixture(256);
    const add = find(f.load("t3-chrome", { footer: true }).render(cx), "add-machine");
    assert.equal(add.style.accessibility_label, "Add machine");
    fire(add, "on_click", {}, cx);
    assert.deepEqual(f.calls.pop(), ["mod.open", { name: "machine-add" }]);
  }
  {
    // "+" on a machine's header names that machine, this computer included: without one the focused space's machine wins.
    const f = fixture(256), sp = f.load("t3-spaces");
    sp.machines = [{ name: "vps", state: "connected" }];
    fire(find(sp.render(cx), "machine-add-local"), "on_click", {}, cx);
    assert.deepEqual(f.calls.pop(), ["space.new", { machine: "" }]);
    fire(find(sp.render(cx), "machine-add-vps"), "on_click", {}, cx);
    assert.deepEqual(f.calls.pop(), ["space.new", { machine: "vps" }]);
  }
  assert.equal(find(root, "sidebar-toggle"), null, "with the sidebar shown its own header has the toggle");
  f.slots.sidebar.hidden = true;
  const bare = tabs.render(cx);
  assert.deepEqual(bare.items.slice(0, 2).map(n => n.key), ["tip-sidebar-toggle", "tab-scroll"], "hidden, the toggle sits first, after the window buttons");
  const toggle = find(bare, "sidebar-toggle");
  // t0 works, but its sub-agent is stuck: it needs the person too.
  assert.deepEqual(toggle.items.slice(1).map(n => [n.key, strings(n)]), [["agents-blocked", ["!", "2"]]], "hidden, the toggle sums up agents most urgent first, idle left out");
  assert.equal(toggle.style.accessibility_label, "Show sidebar, 2 needing you");
  {
    // One look across the preset: the same "needs you" mark everywhere, no scrollbars, English throughout.
    f.spaces()[0].tabs[0].status = "blocked";
    f.panes()[0].status = "blocked";
    const all = () => [tabs.render(cx), f.load("t3-agents").render(cx), f.load("t3-spaces").render(cx), f.load("t3-chrome").render(cx), f.load("t3-pane", { pane: "p0" }).render(cx)].flatMap(walk);
    const look = n => { const { accessibility_label, ...s } = n.style; return JSON.stringify([s, strings(n)]); };
    const marks = all().filter(n => strings(n).join("") === "!" && n.style.size === 14);
    assert.ok(marks.length >= 3, "tabs, the agents list and the pane header all show needs-you");
    assert.equal(new Set(marks.map(look)).size, 1, "needs-you is drawn the same everywhere");
    assert.ok(!all().some(n => Object.keys(n.style).some(k => k.includes("scrollbar"))), "lists scroll without a painted bar");
    assert.ok(!all().some(n => /\p{Script=Han}/u.test(strings(n).join("") + (n.style.accessibility_label ?? ""))), "UI text and labels are English");
    delete f.spaces()[0].tabs[0].status; f.panes()[0].status = "working";
  }
  const saved = f.agents().map(a => a.status);
  f.agents().forEach(a => { a.status = "idle"; });
  for (const k of f.terminals()) if (k.parent) k.status = "idle";
  assert.deepEqual(find(tabs.render(cx), "sidebar-toggle").items.length, 1, "with nothing to report it is just the icon");
  f.agents().forEach((a, i) => { a.status = saved[i]; });
  fire(find(bare, "sidebar-toggle"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["layout.toggle", { id: "sidebar" }]);
  delete f.slots.sidebar.hidden;
  fire(find(root, "tab-b0"), "on_mouse_down:left", { click_count: 1, position: { x: 10, y: 10 } }, cx);
  fire(find(root, "tab-other"), "on_mouse_move", { position: { x: 15, y: 10 } }, cx);
  fire(find(root, "tab-other"), "on_mouse_up:left", {}, cx);
  assert.deepEqual(f.calls.pop(), ["tab.select", { id: "b0" }], "under 6px, as T3's, a press is no drag: it selects the tab pressed, not the one let go over");
  fire(find(root, "tab-b0"), "on_mouse_down:left", { click_count: 1, position: { x: 10, y: 10 } }, cx);
  fire(find(root, "tab-other"), "on_mouse_move", { position: { x: 16, y: 10 } }, cx);
  fire(find(root, "tab-other"), "on_mouse_up:left", {}, cx);
  assert.deepEqual(f.calls.pop(), ["tab.move", { id: "b0", index: 2 }]);
  fire(find(root, "tab-other"), "on_mouse_down:right", {}, cx);
  assert.equal(f.overlays.pop().props.target.id, "other");
  // + and the window's buttons are the bar's end, a block of their own after the other mods' controls, sized to fit.
  assert.equal(find(root, "tab-new"), null);
  const end = f.load("t3-tabs", { part: "end", block: "tabs-end" });
  fire(find(end.render(cx), "tab-new"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["tab.new", {}], "the tab bar's + opens a tab in its space");
  f.calls.length = 0;
  fire(find(end.render(cx), "tabs-end"), "on_size_change", { width: 34 }, cx);
  fire(find(end.render(cx), "tabs-end"), "on_size_change", { width: 34 }, cx);
  assert.deepEqual(f.calls.splice(0), [["layout.resize", { id: "tabs-end", px: 34 }]], "once per change");
  f.scopes.get("t3-tabs").window = () => ({ platform: "windows", buttons: true });
  assert.deepEqual(find(end.render(cx), "tabs-end").items.map(n => n.key), ["tip-tab-new", "tip-minimize", "tip-maximize", "tip-close-window"], "the window's buttons stay last");
  // The strip under the work column says whether the bar's controls fold, at 1024.
  const measure = f.load("t3-tabs", { part: "measure" });
  fire(find(measure.render(cx), "bar-measure"), "on_size_change", { width: 1023 }, cx);
  assert.equal(f.scopes.get("t3-tabs").shared("bar.compact"), true);
  fire(find(measure.render(cx), "bar-measure"), "on_size_change", { width: 1024 }, cx);
  assert.equal(f.scopes.get("t3-tabs").shared("bar.compact"), false);
  fire(find(measure.render(cx), "bar-measure"), "on_size_change", { width: 0 }, cx);
  measure.close();
  assert.equal(f.scopes.get("t3-tabs").shared("bar.compact"), false, "gone with its layout, it leaves no bar compact");
  fire(find(root, "close-b0"), "on_click", {}, cx);
  assert.deepEqual(f.calls.pop(), ["t3-tabs.close-tab:b0", {}], "the × goes through the tab bar's answer");
  const pane = f.load("t3-pane", { pane: "p0" });
  pane.hovered = true;
  const head = pane.render(cx);
  const spinner = tree => walk(tree).find(n => n.source === "mods/workspace-chrome/spinner.svg");
  const open = f.load("t3-agents");
  for (const tree of [tabs.render(cx), head, open.render(cx)]) assert.equal(spinner(tree).style.text_color, f.theme().working);
  for (const id of ["ph-r-p0", "ph-d-p0", "ph-z-p0", "ph-x-p0"]) assert.equal(find(head, id).style.size, 26);
  const actions = walk(head).find(n => n.items.some(child => child?.key === "tip-ph-r-p0"));
  assert.equal(actions.style.gap, 4);
  assert.ok("flex_none" in actions.style, "narrow panes keep the action targets at their full size");
  assert.ok("absolute" in actions.style, "hovering a pane's header moves nothing else");
}
{
  // Icons: every UI glyph drawn is a file that exists.
  const f = fixture(256);
  f.spaces()[0].tabs[0].status = "blocked";
  const trees = [f.load("t3-tabs").render(cx), f.load("t3-tabs", { part: "end" }).render(cx), f.load("t3-agents").render(cx), f.load("t3-spaces").render(cx), f.load("t3-chrome").render(cx), f.load("t3-chrome", { footer: true }).render(cx), f.load("t3-pane", { pane: "p0" }).render(cx)].flatMap(walk);
  const glyphs = trees.filter(n => n.kind === "svg").map(n => n.source).filter(s => !s.endsWith("/spinner.svg") && s !== "icons/pi.svg");
  assert.ok(glyphs.length >= 5);
  for (const s of glyphs) {
    assert.ok(fs.existsSync(path.join(path.dirname(modRoot), s)), `icon on disk: ${s}`);
  }
}
(async () => {
  {
    // A rebuilt machine: one click forgets it and pairs again, and a failed pairing can be retried without forgetting twice.
    const f = fixture(256);
    let done;
    const run = { ...cx, spawn: fn => { done = fn(run); } };
    const sp = f.load("t3-spaces"), vps = { name: "vps", target: "me@vps:2222", session: "main", state: "unreachable", why: 'a different core answers there ("c2")' };
    sp.machines = [{ ...vps, why: "connection refused" }];
    assert.equal(find(sp.render(run), "machine-connect-vps"), null, "only a different core offers Connect");
    assert.ok(find(sp.render(run), "space-s2"), "a machine that's merely away keeps its spaces");
    sp.machines = [vps];
    assert.equal(find(sp.render(run), "space-s2"), null, "a rebuilt machine's old spaces aren't offered");
    assert.ok(!("tooltip" in find(sp.render(run), "machine-connect-vps").style), "Connect says itself, no hover tooltip");
    const asks = () => f.labelled.splice(0).filter(a => a[1] !== "ls");
    const add = ["machine", "add", "me@vps:2222", "--name", "vps", "--session", "main", "--json"];
    f.answerHc(a => a[1] === "add" ? { code: 1, stdout: '{"error":{"message":"no route"}}' } : { code: 0, stdout: '{"machines":[]}' });
    fire(find(sp.render(run), "machine-connect-vps"), "on_click", {}, run);
    await done;
    assert.deepEqual(asks(), [["machine", "rm", "vps", "--json"], add]);
    assert.ok(strings(find(sp.render(run), "machine-vps")).includes("no route"), "it stays listed, saying why, though the machine is forgotten");
    f.answerHc(() => ({ code: 0, stdout: '{"machines":[]}' }));
    fire(find(sp.render(run), "machine-connect-vps"), "on_click", {}, run);
    await done;
    assert.deepEqual(asks(), [add], "a retry doesn't forget it again");
    assert.deepEqual(Object.keys(sp.reconnecting), [], "paired, nothing's left to repair");
  }
  {
    // A hover style's color reaches text but never an svg: Herdr colors an icon as it builds the tree. So a button with an icon brightens by state.
    const f = fixture(256), views = [f.load("t3-chrome"), f.load("t3-chrome", { footer: true }), f.load("t3-tabs"), f.load("t3-pane", { pane: "p0" }), f.load("t3-spaces"), f.load("t3-agents"), f.load("t3-inbox"), f.load("t3-tabs", { part: "end" })];
    fire(views[3].render(cx), "on_hover", true, cx); // A pane's buttons show while its header is hovered.
    for (const view of views) for (const n of walk(view.render(cx))) if (n.hoverStyle.text_color) assert.ok(!walk(n).some(c => c.kind === "svg"), `${n.key}: a hover style can't brighten its icon`);
    const rest = f.theme().dim, bright = f.theme().foreground;
    for (const [view, id] of [[views[0], "sidebar-mode"], [views[1], "add-machine"], [views[7], "tab-new"], [views[4], "space-new"], [views[5], "ag-sort"]]) {
      const color = () => find(view.render(cx), id).style.text_color;
      assert.equal(color(), rest, `${id} at rest`);
      fire(find(view.render(cx), id), "on_hover", true, cx);
      assert.equal(color(), bright, `${id} hovered`);
      fire(find(view.render(cx), id), "on_hover", false, cx);
      assert.equal(color(), rest, `${id} left`);
    }
    const pane = () => find(views[3].render(cx), "ph-x-p0");
    fire(pane(), "on_hover", true, cx);
    assert.equal(pane().style.text_color, bright, "a pane button too");
    fire(pane(), "on_hover", false, cx);
    const toggle = () => find(views[0].render(cx), "sidebar-toggle");
    fire(toggle(), "on_hover", true, cx);
    fire(toggle(), "on_click", {}, cx);
    assert.equal(toggle().style.text_color, rest, "the toggle goes with the sidebar, so it can't wait for the pointer to report leaving");
  }
  {
    // Every control says what it is. A pane's header focuses it; it's no control.
    // As in T3, an icon alone says it on hover too; words may, naming what they do. A row's own fold and the editor's icon picks explain themselves.
    const f = fixture(256);
    const pane = f.load("t3-pane", { pane: "p0" });
    pane.hovered = true;
    const views = [f.load("t3-chrome"), f.load("t3-chrome", { footer: true }), f.load("t3-tabs"), pane, f.load("t3-spaces"), f.load("t3-agents"), f.load("t3-inbox"),
      f.load("t3-tabs", { part: "end" }), f.load("t3-agents", { sortMenu: true }), f.load("t3-new-menu")];
    for (const view of views) for (const n of walk(view.render(cx))) {
      if (n.handlers.on_click && !String(n.key).startsWith("pane-head")) assert.equal(n.style.role, "button", `${n.key}: a role`);
      if (n.style.role !== "button") continue;
      assert.ok(n.style.accessibility_label, `${n.key}: a label`);
      assert.ok(!("tooltip" in n.style), `${n.key}: the shell's tooltip isn't T3's`);
      const tipped = walk(view.render(cx)).some(c => String(c.key).startsWith("tip-over-") && c.items.some(i => i.key === n.key));
      const icon = n.items.length === 1 && n.items[0].kind === "svg", plain = /agent-fold|^(icon|sub|ag|card|slim|close-b|close-o)/.test(n.key);
      if (icon && !plain) assert.ok(tipped, `${n.key}: an icon alone has a hover label`);
    }
  }
  {
    // A mark with no words says what it is on hover; what sits at the window's bottom opens upward, as a Popup doesn't flip.
    const f = fixture(256), ag = f.load("t3-agents"), footer = f.load("t3-chrome", { footer: true });
    const mark = () => find(ag.render(cx), "tip-status-t0-mark");
    assert.equal(strings(mark().style.content).length, 0, "its card waits for the hover");
    const over = (on) => { fire(find(ag.render(cx), "status-t0-mark"), "on_hover", on, cx); fire(find(ag.render(cx), "tip-over-status-t0-mark"), "on_hover", on, cx); while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); } };
    over(true);
    assert.ok(strings(mark().style.content).length > 0);
    assert.equal(find(ag.render(cx), "status-t0").style.accessibility_label, strings(mark().style.content)[0]);
    over(false);
    assert.equal(strings(mark().style.content).length, 0);
    assert.equal(find(footer.render(cx), "tip-add-machine").style.anchor, "bottom_center");
  }
  {
    // Whatever opens over its button covers it, and the pointer may not move: it doesn't stay lit.
    const f = fixture(256), footer = f.load("t3-chrome", { footer: true }), agents = f.load("t3-agents"), inbox = f.load("t3-inbox");
    for (const [view, id] of [[footer, "settings"], [footer, "add-machine"], [agents, "ag-sort"], [inbox, "inbox-search"], [inbox, "inbox-new-tab"]]) {
      fire(find(view.render(cx), id), "on_hover", true, cx);
      assert.equal(view.hot, id);
      fire(find(view.render(cx), id), "on_click", {}, cx);
      assert.equal(view.hot, null, `${id} doesn't stay lit`);
    }
  }
  {
    // Lists and Inbox make the same things the same way: with two machines New space asks, in the layout's menu; docked alone it can't.
    const f = fixture(256), menu = { newMenu: "t3-new-menu" };
    for (const [mod, space, tab] of [["t3-spaces", "space-new", "space-new-tab"], ["t3-inbox", "inbox-new-space", "inbox-new-tab"]]) {
      const view = f.load(mod, menu);
      f.calls.length = f.overlays.length = 0;
      fire(find(view.render(cx), space), "on_click", {}, cx);
      assert.deepEqual(f.calls, [], `${space} asks first`);
      assert.deepEqual(plain(f.overlays), [{ mod: "t3-new-menu", kind: "popup", at: "top", offset: 40, width: 576, height: 420, props: { pick: true } }], `${space} opens on the machines`);
      fire(find(view.render(cx), tab), "on_click", {}, cx);
      assert.deepEqual(f.calls.splice(0), [["mod.open", { name: "t3-new-menu" }]], `${tab} picks a space`);
      f.overlays.length = 0;
      fire(find(f.load(mod).render(cx), space), "on_click", {}, cx);
      assert.deepEqual(f.calls.splice(0), [["space.new", {}]], `${space} docked alone`);
      assert.equal(f.overlays.length, 0);
    }
    // A machine's + and chevron stand under the heading's two buttons: centers 51 and 23 from the sidebar's edge. Its dot follows its name.
    const lists = f.load("t3-spaces", menu), heading = find(lists.render(cx), "spaces-heading").style, row = find(lists.render(cx), "machine-local");
    const add = find(row, "machine-add-local").style, slots = row.items.at(-1).style, chevron = 8 + row.style.pr + add.w / 2, plus = 8 + row.style.pr + add.w + slots.gap + add.w / 2;
    assert.deepEqual([chevron, plus], [heading.pr + 13, heading.pr + 26 + 2 + 13]);
    assert.equal(row.style.text_size, 12, "the same size as the agents' group headers and Inbox's shelves");
    assert.ok(row.items.findIndex(n => find(n, "machine-state-local")) < row.items.findIndex(n => find(n, "machine-add-local")), "the dot is before the +");
    // Hover labels name the control, and its key only when the key does the same.
    lists.machines = [{ name: "spare", state: "asleep" }];
    const blank = find(lists.render(cx), "machine-new-spare");
    assert.deepEqual([blank.style.pl, blank.items[0].style.size, blank.style.gap], [10, 16, 10], "New space here lays out as a space's row");
    lists.machines = [{ name: "vps", state: "connected" }];
    const label = (id) => { lists.hot = id; fire(find(lists.render(cx), `tip-over-${id}`), "on_hover", true, cx); while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); } return strings(find(lists.render(cx), `tip-${id}`).style.content); };
    assert.deepEqual(label("space-new"), ["New space"], "⌘N doesn't ask, as this does");
    assert.deepEqual(label("space-new-tab"), ["New tab"]);
    assert.deepEqual(label("machine-add-local"), ["New space here (⌘N)"], "⌘N makes it on this space's machine");
    assert.deepEqual(label("machine-add-vps"), ["New space here"], "and not on another");
    assert.deepEqual(label("machine-state-local"), ["Connected"]);
    // Three kinds: a button does what the row doesn't (a ground on hover, a label); an indicator is the row's (it lights with it);
    // a mark only says (a label, no ground).
    const fold = () => find(lists.render(cx), "machine-fold-local");
    assert.equal(find(lists.render(cx), "tip-machine-fold-local"), null, "the chevron has no label: the row folds");
    assert.deepEqual([fold().hoverStyle.bg, fold().style.text_color], [undefined, f.theme().dim]);
    fire(find(lists.render(cx), "machine-local"), "on_hover", true, cx);
    assert.equal(fold().style.text_color, f.theme().foreground, "it lights with its row");
    fire(find(lists.render(cx), "machine-local"), "on_hover", false, cx);
    assert.equal(fold().style.text_color, f.theme().dim, "and dims when the pointer leaves");
    assert.equal(find(lists.render(cx), "machine-add-local").hoverStyle.bg, undefined, "a button in a row only lights up, as T3's");
    assert.equal(find(lists.render(cx), "machine-state-local").hoverStyle.bg, undefined, "a mark: no ground");
    lists.hot = null;
  }
  {
    // A row's details, as T3's thread card: at the row's top right, with T3's tooltip group for timing and fade.
    const f = fixture(256), inbox = f.load("t3-inbox");
    f.panes()[0].branch = "feat/x";
    f.panes()[1].branch = "main";
    const anchor = (a) => find(inbox.render(cx), `details-${a}`);
    const card = (a) => anchor(a)?.style.content;
    const row = (a) => find(inbox.render(cx), `card-${a}`);
    const hover = (a, on) => fire(row(a), "on_hover", on, cx);
    cx.timers.length = 0; // Other tests' hovers left theirs.
    const due = (ms) => cx.timers.filter(t => t.ms === ms && !t.gone);
    const pass = (ms) => { for (const t of due(ms)) { t.gone = true; t.fn(cx); } };
    assert.equal(anchor("t0"), null, "nothing until hovered");
    hover("t0", true);
    assert.deepEqual([anchor("t0").style.top, anchor("t0").style.right, anchor("t0").style.size], [-1, -1, 1], "its bottom left, where a Popup hangs from, is the row's top right");
    assert.equal(card("t0"), undefined, "the first waits, its anchor already measured");
    assert.equal(due(150).length, 1);
    hover("t0", false);
    assert.equal(due(150).length, 0, "leaving first cancels it");
    assert.equal(anchor("t0"), null);
    hover("t0", true);
    pass(150);
    assert.equal(card("t0").style.opacity, 0, "drawn clear first: a transition adopts the first value it sees");
    assert.ok(card("t0").key && "transition" in card("t0").style, "and it needs an id to sample by");
    pass(34);
    assert.equal(card("t0").style.opacity, 1, "then it fades in");
    assert.equal(card("t0").style.ml, 4);
    assert.ok(row("t0").style.relative !== undefined);
    assert.deepEqual(strings(card("t0")).slice(1), ["P", "project 0", "feat/x", "Pi"], "its mark and project, branch, program; no machine on this one");
    assert.equal(strings(card("t0"))[0], row("t0").style.accessibility_label, "led by the title the row shows");
    // The pointer can report entering the next row before leaving this one.
    hover("vps/t2", true);
    assert.equal(card("t0").style.opacity, 0, "the one it replaces fades under it");
    assert.equal(card("vps/t2").style.opacity, 1, "unfaded");
    assert.deepEqual(strings(card("vps/t2")).slice(1), ["P", "project 2", "vps", "main", "Pi"], "another machine's names it");
    const labelDelay = (id) => { fire(find(inbox.render(cx), `tip-over-${id}`), "on_hover", true, cx); const { ms } = cx.timers.at(-1); fire(find(inbox.render(cx), `tip-over-${id}`), "on_hover", false, cx); return ms; };
    assert.equal(labelDelay("machine-vps/t2"), 0, "a control's label in the row opens at once too");
    hover("t0", false);
    assert.ok(card("vps/t2"), "the late leave of the row before doesn't close it");
    hover("vps/t2", false);
    assert.equal(card("vps/t2").style.opacity, 0, "the last one fades out");
    assert.equal(due(150).length, 1);
    pass(150);
    assert.equal(anchor("vps/t2"), null, "then it's gone");
    hover("t0", true);
    assert.equal(card("t0").style.opacity, 1, "within 400ms the next still opens at once");
    inbox.hot = "machine-t0";
    assert.deepEqual([card("t0").style.opacity, card("t0").style.left], [0, -4], "a lit control's own label speaks instead: the card fades back toward the row");
    inbox.hot = null;
    assert.equal(card("t0").style.opacity, 1, "and it's back with the pointer on the row");
    fire(row("t0"), "on_click", {}, cx);
    assert.equal(card("t0").style.opacity, 0, "a click takes it down");
    pass(150);
    assert.equal(card("t0"), undefined);
    hover("t0", false);
    inbox.detailsClosed = Date.now() - 400;
    assert.equal(labelDelay("machine-vps/t2"), 150, "past 400ms a label waits again");
    hover("t0", true);
    assert.equal(card("t0"), undefined, "and so does the card");
    pass(150);
    assert.equal(card("t0").style.opacity, 0);
    hover("t0", false);
    hover("t0", true);
    assert.equal(card("t0").style.opacity, 1, "coming back while it fades out lifts it again");
  }
  {
    // A hover label, as T3's: the label with its bound key, a dim hint, and nothing up unless the button is lit.
    const f = fixture(256), tabs = f.load("t3-tabs", { part: "end" }), inbox = f.load("t3-inbox");
    f.spaces()[0].active = true;
    const card = (view, id) => find(view.render(cx), `tip-${id}`).style.content;
    const lit = (view, id) => { fire(find(view.render(cx), id), "on_hover", true, cx); fire(find(view.render(cx), `tip-over-${id}`), "on_hover", true, cx); while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); } };
    assert.deepEqual(strings(card(tabs, "tab-new")), [], "not while unlit");
    lit(tabs, "tab-new");
    assert.deepEqual(strings(card(tabs, "tab-new")), ["New tab (⌘T)"]);
    assert.equal(card(tabs, "tab-new").style.text_size, 12);
    fire(find(tabs.render(cx), "tab-new"), "on_click", {}, cx);
    lit(inbox, "inbox-new-tab");
    assert.deepEqual(strings(card(inbox, "inbox-new-tab")), ["New tab"], "a label names its control; what opens says the rest");
    fire(find(inbox.render(cx), "inbox-new-tab"), "on_click", {}, cx);
    assert.deepEqual(strings(card(inbox, "inbox-new-tab")), [], "what opens over it takes its label down");
    inbox.hot = "inbox-scope";
    fire(find(inbox.render(cx), "tip-over-inbox-scope"), "on_hover", true, cx);
    while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); }
    assert.deepEqual(strings(card(inbox, "inbox-scope")), ["Filter by space", "Shift+click to pick several"], "a second line only for what can't be seen");
    // A program's icon has no label of its own, as T3's rows.
    f.panes()[0].program = f.agents()[0].program;
    for (const [name, view] of Object.entries({ tabs: f.load("t3-tabs"), inbox, agents: f.load("t3-agents"), pane: f.load("t3-pane", { pane: "p0" }) })) {
      const nodes = walk(view.render(cx));
      assert.ok(nodes.some(n => n.source === "icons/pi.svg"), `${name}: the icon is there`);
      // A label whose trigger is the icon alone; a tab's, with its name, is the tab's.
      assert.ok(!nodes.some(n => String(n.key).startsWith("tip-") && strings(n.items[0]).length === 0 && walk(n).some(c => c.source === "icons/pi.svg")), `${name}: no label on a program's icon`);
    }
  }
  {
    // A tab as T3's panel tab: 24px, 12px; unlike T3's its icon stays, and × comes at its end, over the status mark, while the tab is hovered.
    // A tab drags as a space does, and leaving ends either.
    const f = fixture(256), tabs = f.load("t3-tabs"), spaces = f.load("t3-spaces");
    f.spaces()[0].active = f.spaces()[0].tabs[0].active = true;
    f.spaces()[0].tabs.push({ id: "other", index: 2, name: "other", named: true });
    const tab = find(tabs.render(cx), "tab-other").style;
    assert.deepEqual([tab.h, tab.text_size, tab.pl, tab.pr, tab.gap], [24, 12, 6, 4, 2]);
    const close = () => find(tabs.render(cx), "close-other");
    assert.deepEqual([close().style.size, close().style.accessibility_label], [16, "Close other"], "every tab has it, not only the active one");
    assert.equal(close().items.length, 0, "at rest it's empty, with no status to show");
    assert.ok(walk(find(tabs.render(cx), "tab-other")).some(n => n.source === "mods/t3-tabs/terminal.svg"), "the tab's icon, a terminal's when it has no program");
    // The pointer on a tab's name is on the tab too; the card goes by the name, the × by the tab.
    const hoverName = (id, on) => { fire(find(tabs.render(cx), `tab-${id}`), "on_hover", on, cx); fire(find(tabs.render(cx), `label-${id}`), "on_hover", on, cx); };
    hoverName("other", true);
    assert.equal(close().items[0].source, "mods/t3-tabs/x.svg", "hovered, a ×");
    assert.ok(walk(find(tabs.render(cx), "tab-other")).some(n => n.source === "mods/t3-tabs/terminal.svg"), "and the icon stays");
    assert.equal(find(tabs.render(cx), "tab-other").style.text_color, f.theme().foreground);
    // Its whole name and nothing else, with an Inbox row's timing: after 150ms for the first and at once for the next.
    const tabCard = (id) => find(tabs.render(cx), `details-${id}`)?.style.content;
    assert.equal(tabCard("other"), undefined, "the first waits");
    cx.timers.filter(t => t.ms === 150 && !t.gone).forEach(t => { t.gone = true; t.fn(cx); });
    assert.equal(tabCard("other").style.opacity, 0, "drawn clear first");
    cx.timers.filter(t => t.ms === 34 && !t.gone).forEach(t => { t.gone = true; t.fn(cx); });
    assert.equal(tabCard("other").style.opacity, 1, "then it fades in");
    assert.equal(tabCard("other").style.mt, 4);
    assert.deepEqual(strings(tabCard("other")), ["other"], "only its whole name: the project and branch are in the sidebar");
    assert.deepEqual([find(tabs.render(cx), "details-other").style.bottom, find(tabs.render(cx), "details-other").style.left, find(tabs.render(cx), "details-other").style.size], [0, 15, 1], "a Popup hangs from the tab's bottom, its words under the tab's name");
    hoverName("b0", true);
    assert.equal(tabCard("b0").style.opacity, 1, "the next tab's opens at once");
    hoverName("b0", false);
    hoverName("other", true);
    fire(find(tabs.render(cx), "tab-other"), "on_mouse_down:left", { click_count: 1 }, cx);
    assert.equal(tabCard("other").style.opacity, 0, "a press fades it away");
    fire(find(tabs.render(cx), "tab-other"), "on_mouse_up:left", {}, cx);
    f.calls.pop();
    assert.ok(walk(find(tabs.render(cx), "tab-other")).some(n => "truncate" in n.style && n.style.min_w === 0), "the name truncates in the tab itself");
    hoverName("other", false);
    assert.equal(close().items.length, 0, "the × goes with the pointer");
    fire(close(), "on_click", {}, cx);
    assert.deepEqual(f.calls.pop(), ["t3-tabs.close-tab:other", {}], "the × goes through the tab bar's answer");
    cx.timers.filter(t => t.ms === 150 && !t.gone).forEach(t => { t.gone = true; t.fn(cx); });
    assert.equal(find(tabs.render(cx), "details-other"), null, "not when the pointer is away, once it has faded");
    fire(find(tabs.render(cx), "tab-b0"), "on_mouse_down:left", { click_count: 1, position: { x: 0, y: 0 } }, cx);
    assert.equal(find(tabs.render(cx), "tab-b0").style.opacity, undefined, "a press alone doesn't lift it");
    fire(find(tabs.render(cx), "tab-other"), "on_mouse_move", { position: { x: 40, y: 0 } }, cx);
    assert.equal(find(tabs.render(cx), "tab-b0").style.opacity, 0.5, "the dragged tab fades");
    assert.ok(walk(find(tabs.render(cx), "tab-other")).some(n => "absolute" in n.style && n.style.w === 2), "a line shows where it lands");
    fire(tabs.render(cx), "on_hover", false, cx);
    assert.equal(tabs.pressed, null, "leaving the bar ends the drag");
    assert.equal(find(tabs.render(cx), "tab-b0").style.opacity, undefined);
    const id = `space-${f.spaces()[0].id}`;
    fire(find(spaces.render(cx), id), "on_mouse_down:left", {}, cx);
    fire(find(spaces.render(cx), "space-list"), "on_hover", false, cx);
    assert.equal(spaces.drag, null, "leaving the list ends a space's drag");
  }
  {
    // On the way to a tab's ×, nothing in the way: the name's card goes, and its own label waits.
    const f = fixture(256), tabs = f.load("t3-tabs");
    f.spaces()[0].tabs.push({ id: "other", index: 2, name: "other", named: true });
    const pending = () => cx.timers.filter(t => !t.gone).forEach(t => { t.gone = true; t.fn(cx); });
    const card = () => find(tabs.render(cx), "details-other")?.style.content;
    const hoverName = (on) => { fire(find(tabs.render(cx), "tab-other"), "on_hover", on, cx); fire(find(tabs.render(cx), "label-other"), "on_hover", on, cx); };
    tabs.room = 2000;
    tabs.nameW = Object.fromEntries(f.spaces().flatMap(s => s.tabs).map(c => [c.id, 40]));
    hoverName(true);
    pending();
    assert.equal(card(), undefined, "a name the tab shows whole has no card: it would only repeat it");
    assert.equal(tabs.details ?? null, null, "nor does it open the next tab's at once");
    hoverName(false);
    tabs.room = 300;
    tabs.nameW.other = 400;
    hoverName(true);
    pending();
    assert.deepEqual(strings(card()), ["other"], "a name cut short does");
    // The pointer moves on within the tab: off the name, onto the ×.
    fire(find(tabs.render(cx), "label-other"), "on_hover", false, cx);
    fire(find(tabs.render(cx), "close-other"), "on_hover", true, cx);
    assert.deepEqual([card().style.opacity, card().style.top], [0, -4], "the × fades the card away");
    fire(find(tabs.render(cx), "tip-over-close-other"), "on_hover", true, cx);
    assert.equal(cx.timers.at(-1).ms, 500, "its label waits long enough for a straight click");
    while (cx.timers.length) { const t = cx.timers.shift(); if (!t.gone) t.fn(cx); }
    const label = find(tabs.render(cx), "tip-close-other");
    assert.deepEqual(strings(label.style.content), ["Close tab"], "and it has no key: it closes the active tab only");
    assert.equal(label.style.anchor, "top_center");
    fire(find(tabs.render(cx), "close-other"), "on_hover", false, cx);
    fire(find(tabs.render(cx), "label-other"), "on_hover", true, cx);
    pending();
    assert.deepEqual(strings(card()), ["other"], "back on the name, it returns");
    // A tab gone from under the pointer reports no leaving; every other tab's card still has to open.
    tabs.hot = "close-gone";
    tabs.render(cx);
    assert.equal(tabs.hot, null);
  }
  {
    // A person's close asks when it ends terminals, as T3's; only the dialog's command closes.
    const f = fixture(256), jobs = [], spawn = cx.spawn;
    f.spaces().splice(0, Infinity,
      { id: "s", active: true, tabs: [{ id: "a", name: "Alpha", named: true, active: true }, { id: "b", name: "Beta", named: true }] },
      { id: "solo", tabs: [{ id: "c", name: "Solo", named: true }] });
    f.panes().splice(0, Infinity, { pane: "p1", tab: "a", terminal: "t1" }, { pane: "p2", tab: "a", terminal: "t2" },
      { pane: "m", tab: "b", mod: "board" }, { pane: "p4", tab: "c", terminal: "t4" });
    Object.assign(f.shown, { tab: "a", pane: "p1" });
    cx.spawn = fn => jobs.push(fn);
    const view = f.load("t3-tabs");
    f.load("t3-tabs", { part: "end", block: "tabs-end" });
    f.load("t3-tabs", { part: "measure" });
    cx.spawn = spawn;
    assert.equal(jobs.length, 1, "of the layout's three copies only the tab strip answers, or one close opens three dialogs");
    const say = async command => { f.commands.push(command); jobs[0](cx); await new Promise(resolve => setImmediate(resolve)); };
    // What `hc get` says: its own shell at the prompt, a program it started, a program that is the terminal, or no answer.
    const shell = { pid: 1, foreground: { pid: 1, name: "zsh" } }, program = { pid: 1, foreground: { pid: 2, name: "sleep" } }, own = { pid: 1, foreground: { pid: 1, name: "sleep" } };
    let fg = () => program;
    f.answerHc(args => ({ code: 0, stdout: JSON.stringify(fg(args[1])) }));
    f.calls.length = 0;
    await say("close-tab");
    let asked = f.overlays.pop();
    assert.deepEqual([asked.mod, asked.props.title], ["confirm", "Close 2 terminals?"], "as T3's: what ends, counted");
    assert.match(asked.props.detail, /^This stops their running processes and clears their histories: ".+", ".+"\.$/);
    assert.doesNotMatch(asked.props.detail, /space closes/);
    assert.deepEqual(plain(asked.props.command), { name: "t3-tabs.close-tab-now:a" });
    await say("close-tab-now:a");
    assert.deepEqual(f.calls.pop(), ["tab.close", { id: "a", confirmed: true }], "so the space's own ask can't follow");
    await say("close-pane");
    assert.deepEqual(f.closed.length, 1, "a second ask replaces the first");
    asked = f.overlays.pop();
    assert.deepEqual(plain(asked.props.command), { name: "t3-tabs.close-pane-now:p1" });
    await say("close-pane-now:p1");
    assert.deepEqual(f.calls.pop(), ["pane.close", { pane: "p1" }]);
    await say("close-pane:p2");
    assert.deepEqual(plain(f.overlays.pop().props.command), { name: "t3-tabs.close-pane-now:p2" }, "the pane header's × names its pane");
    assert.deepEqual(f.calls, [], "nothing closes before the answer");
    Object.assign(view, { overTab: "a", details: "a" });
    await say("close-tab");
    f.overlays.pop();
    assert.deepEqual([view.overTab, view.details], [null, null], "cmd-w over a hovered tab takes its card too");
    Object.assign(f.shown, { tab: "c", pane: "p4" });
    await say("close-tab");
    asked = f.overlays.pop();
    assert.equal(asked.props.title, 'Close terminal "Solo"?', "a lone pane by its tab's name, as T3's");
    assert.match(asked.props.detail, /^This stops the running process.*space closes too/, "the last tab says its space goes too");
    assert.equal(f.overlays.length, 0);
    f.spaces()[1].tabs[0].name = "x".repeat(41);
    await say("close-tab");
    assert.equal(f.overlays.pop().props.title, `Close terminal "${"x".repeat(26)}…"?`, "a long name is cut to fit the title, which doesn't wrap");
    f.spaces()[1].tabs[0].name = "feat(herdr-t3): 关闭标签与窗格二次确认";
    await say("close-tab");
    assert.equal(f.overlays.pop().props.title, 'Close terminal "feat(herdr-t3): 关闭标签与…"?', "a wide character counts twice");
    Object.assign(f.shown, { tab: "b", pane: "m" });
    await say("close-tab");
    assert.deepEqual(f.calls.pop(), ["tab.close", { id: "b" }], "a tab of mods has no terminal to lose");
    await say("close-pane");
    assert.deepEqual(f.calls.pop(), ["pane.close", { pane: "m" }], "nor has a mod's pane");
    await say("close-pane:p4");
    assert.deepEqual(f.calls.pop(), ["pane.close", { pane: "p4" }], "a space's last pane closes the space, which Herdr asks about itself");
    assert.equal(f.overlays.length, 0);
    // Empty panes have nothing to lose: nothing asks, and the same goes for a tab of them.
    f.calls.length = 0;
    fg = () => shell;
    await say("close-pane:p1");
    assert.deepEqual(f.calls.pop(), ["pane.close", { pane: "p1" }], "a shell at its prompt closes at once");
    await say("close-tab:a");
    assert.deepEqual(f.calls.pop(), ["tab.close", { id: "a" }], "and so does a tab of them");
    assert.equal(f.overlays.length, 0);
    fg = t => t === "t1" ? program : shell;
    await say("close-tab:a");
    assert.equal(f.overlays.pop().props.title.startsWith("Close terminal "), true, "only what's running counts");
    fg = () => own;
    await say("close-pane:p1");
    assert.ok(f.overlays.pop().props.command.name.startsWith("t3-tabs.close-pane-now:"), "a program that is the terminal is no prompt");
    fg = () => { throw new Error("no answer"); };
    await say("close-pane:p1");
    assert.ok(f.overlays.pop().props.command.name.startsWith("t3-tabs.close-pane-now:"), "no answer asks");
    Object.assign(f.shown, { tab: undefined, pane: undefined });
    f.calls.length = 0;
    await say("close-tab"); await say("close-pane");
    assert.deepEqual([f.calls, f.overlays.length], [[], 0], "with nothing focused, nothing to close");
  }
  {
    // cmd-] and cmd-[ (t3-tabs.next / .prev): with the Inbox showing, T3's traversal over the rows it draws, from the
    // one in view, stopping at either end; Lists keep Herdr's agent.next.
    const f = fixture(256), jobs = [], spawn = cx.spawn;
    cx.spawn = fn => jobs.push(fn);
    f.load("t3-tabs"); f.load("t3-tabs", { part: "end" }); f.load("t3-tabs", { part: "measure" });
    cx.spawn = spawn;
    assert.equal(jobs.length, 1, "only the tab strip's copy listens");
    f.slots.lists = { id: "sidebar-lists", active: "inbox" };
    const press = async (command, rows) => {
      f.state["t3-inbox.rows"] = rows; f.calls.length = 0; f.commands.push(command);
      jobs[0](cx); await new Promise(resolve => setImmediate(resolve));
      return f.calls.slice();
    };
    const order = ["t0", "vps/t2", "t5"];
    assert.deepEqual(await press("next", { order, view: "vps/t2" }), [["agent.focus", { terminal: "t5" }]]);
    assert.deepEqual(await press("prev", { order, view: "vps/t2" }), [["agent.focus", { terminal: "t0" }]]);
    assert.deepEqual(await press("next", { order, view: "t5" }), [], "at the end it stays, as T3's");
    assert.deepEqual(await press("prev", { order, view: "t0" }), []);
    assert.deepEqual(await press("next", { order, view: null }), [["agent.focus", { terminal: "t0" }]], "none in view: the first");
    assert.deepEqual(await press("prev", { order, view: null }), [["agent.focus", { terminal: "t5" }]], "or the last");
    const mixed = ["t0", "pane:p9", "t5"];
    assert.deepEqual(await press("next", { order: mixed, view: "t0" }), [["pane.focus", { pane: "p9" }]], "a mod pane's row has no agent to focus");
    assert.deepEqual(await press("next", { order: mixed, view: "pane:p9" }), [["agent.focus", { terminal: "t5" }]], "and the walk goes on from it");
    f.slots.lists.active = "lists";
    assert.deepEqual(await press("next", { order, view: "t0" }), [["agent.next", {}]], "Lists keep agent.next");
    f.slots.lists.active = "inbox"; f.slots.sidebar.hidden = true;
    assert.deepEqual(await press("next", { order, view: "t0" }), [["agent.next", {}]], "so does a hidden sidebar: the Inbox draws nothing, and its rows go stale");
    assert.deepEqual(await press("prev", { order, view: "t0" }), [["agent.prev", {}]]);
    delete f.slots.sidebar.hidden; f.slots.lists.active = "lists";
  }
  {
    // Every menu goes by arrows and Enter, and says when a search finds nothing.
    const f = fixture(256), key = (view, id, k) => fire(find(view.render(cx), id), "on_key_down", { key: k }, cx);
    const sort = f.load("t3-agents", { sortMenu: true });
    assert.equal(find(sort.render(cx), "sort-grouped").style.bg, undefined, "it opens with nothing lit");
    key(sort, "sort-menu", "down");
    assert.equal(find(sort.render(cx), "sort-priority").style.bg, f.theme().selected, "down lights the first row");
    key(sort, "sort-menu", "enter");
    assert.equal(f.state["agents.sort"], "priority");
    const inbox = f.load("t3-inbox");
    const panel = () => find(inbox.render(cx), "inbox-scope-menu").style.content;
    fire(find(panel(), "inbox-scope-panel"), "on_key_down", { key: "down" }, cx);
    assert.equal(inbox.scopeAt, 1);
    assert.equal(find(panel(), "scope-all").style.bg, undefined);
    {
      // Past the rows that show, ↑/↓ keep the highlight in view, round the ends too; the rows keep their clicks.
      f.spaces().push(...Array.from({ length: 12 }, (_, i) => ({ id: `x${i}`, name: `extra ${i}`, active: false, folder: `/work/x${i}`, machine: null, tabs: [] })));
      const rows = () => walk(find(panel(), "inbox-scope-list")).filter((n) => String(n.key).startsWith("scope-")).map((n) => n.key);
      assert.equal(rows().length, 9, "nine show");
      const down = () => fire(find(panel(), "inbox-scope-panel"), "on_key_down", { key: "down" }, cx);
      while (inbox.scopeAt < 9) down();
      assert.ok(rows().includes(`scope-${inbox.matches()[9].id}`), "the highlight's row is drawn");
      assert.equal(find(panel(), `scope-${inbox.matches()[9].id}`).style.bg, f.theme().selected);
      fire(find(panel(), "inbox-scope-panel"), "on_key_down", { key: "up" }, cx);
      inbox.scopeAt = 0;
      fire(find(panel(), "inbox-scope-panel"), "on_key_down", { key: "up" }, cx);
      assert.ok(rows().includes(`scope-${inbox.matches().at(-1).id}`), "up from the first shows the last");
      f.spaces().splice(-12);
      inbox.scopeAt = 0;
    }
    // As T3's: hangs from the button's left edge, 288 wide.
    assert.deepEqual([find(inbox.render(cx), "inbox-scope-menu").style.anchor, find(panel(), "inbox-scope-panel").style.w], ["top_left", 288]);
    const spaces = f.load("t3-new-menu");
    spaces.filter = "no such space";
    assert.ok(strings(spaces.render(cx)).includes("No matching spaces."));
  }
  {
    // The keyboard's way round (check-focus.cjs has its rules): no control is a stop until the mode's on; then each is, a row
    // shows with the keyboard on it what it shows hovered, and Enter does what the pointer does.
    const f = fixture(256), tabs = f.load("t3-tabs"), ag = f.load("t3-agents"), sp = f.load("t3-spaces"), footer = f.load("t3-chrome", { footer: true }), brand = f.load("t3-chrome");
    const on = (mod, id) => { mod.fs.keyboard = true; mod.fs.handles.set(id, { focus() {}, is_focused: () => true }); };
    for (const [view, id] of [[tabs, "tab-b0"], [tabs, "sidebar-toggle"], [ag, "ag-t0"], [ag, "ag-sort"], [sp, "space-s0"], [sp, "space-new"], [footer, "settings"], [brand, "sidebar-mode"]]) {
      const node = find(view.render(cx), id);
      if (node) assert.equal(node.style.tab_index, undefined, `${id} takes no keyboard from a terminal when pressed`);
    }
    f.state["t3-focus"] = "on";
    for (const [view, id] of [[ag, "ag-t0"], [ag, "ag-sort"], [ag, "fold-t0"], [sp, "space-s0"], [sp, "space-new"], [footer, "settings"], [footer, "add-machine"], [brand, "sidebar-mode"], [brand, "sidebar-toggle"], [tabs, "tab-b0"]])
      assert.equal(find(view.render(cx), id).style.tab_index, 0, `${id} is a stop`);
    assert.equal(find(f.load("t3-tabs", { part: "end" }).render(cx), "tab-new").style.tab_index, 0);
    // Tab's × and the pin come with the keyboard, as with the pointer.
    assert.equal(find(tabs.render(cx), "close-b0").style.tab_index, undefined);
    on(tabs, "tab-b0");
    const tab = find(tabs.render(cx), "tab-b0");
    assert.equal(find(tab, "close-b0").style.tab_index, 0);
    assert.ok(walk(find(tab, "close-b0")).some((n) => n.source === "mods/t3-tabs/x.svg"), "the × shows");
    assert.ok(tab.items.some((n) => n.style?.border === 2 && n.style.border_color === f.theme().accent), "the ring is on the tab");
    // A tab and a space go by their mouse-ups: a key has to say so itself.
    fire(tab, "on_key_down", { keystroke: "enter" }, cx);
    assert.deepEqual(f.calls.pop(), ["tab.select", { id: "b0" }]);
    on(sp, "space-s0");
    fire(find(sp.render(cx), "space-s0"), "on_key_down", { keystroke: "space" }, cx);
    assert.deepEqual(f.calls.pop(), ["space.select", { id: "s0" }]);
    assert.equal(find(ag.render(cx), "pin-t0").style.tab_index, undefined);
    on(ag, "ag-t0");
    assert.equal(find(ag.render(cx), "pin-t0").style.tab_index, 0, "a hidden control is there once the keyboard's on its row");
    // Menus: Home, End and typing, with the same highlight the arrows move.
    const sort = f.load("t3-agents", { sortMenu: true }), key = (e) => fire(find(sort.render(cx), "sort-menu"), "on_key_down", e, cx), lit = () => find(sort.render(cx), "sort-priority").style.bg === f.theme().selected ? "priority" : "grouped";
    key({ key: "home" });
    assert.equal(lit(), "priority");
    key({ key: "end" });
    assert.equal(lit(), "grouped");
    key({ key: "p", key_char: "p", modifiers: {} });
    assert.equal(lit(), "priority");
  }
  // Home: a space of its own, in no list, and the keys that walk spaces go around it.
  {
    const f = fixture(256), list = f.spaces(), jobs = [], spawn = cx.spawn;
    cx.spawn = fn => jobs.push(fn);
    f.load("t3-tabs");
    cx.spawn = spawn;
    const say = async command => { f.commands.push(command); jobs[0](cx); await new Promise(resolve => setImmediate(resolve)); };
    const made = () => plain(f.calls.splice(0));
    // spaces() catches up after a command: a step waits to see the one before.
    const tick = async () => { cx.timers.at(-1).fn(cx); await new Promise(resolve => setImmediate(resolve)); };
    f.calls.length = 0;
    await say("home");
    assert.deepEqual(made(), [["space.new", { name: "Home", machine: "", folder: "/home/test" }]]);
    assert.equal(f.state["t3-home.space"], undefined, "not known until it's seen");
    // In the model's middle: its place doesn't change the keys' count or the spaces' rows.
    const home = { id: "h", name: "Home", active: true, machine: null, folder: "/home/test", tabs: [{ id: "shell", name: "1" }] };
    list[0].active = false; list.splice(1, 0, home);
    await tick();
    assert.equal(f.state["t3-home.space"], "h");
    assert.deepEqual(made(), [["tab.new", { space: "h", name: "Home", mod: "t3-home" }]]);
    assert.ok(f.spaces().find(s => s.id === "h").tabs.some(c => c.id === "shell"), "the page goes in before the shell leaves");
    home.tabs.push({ id: "page", name: "Home", active: true });
    await tick();
    assert.deepEqual(made(), [["tab.close", { id: "shell", confirmed: true }]]);
    home.tabs.shift();
    await say("home");
    assert.deepEqual(made(), [["space.select", { id: "h" }]], "there's one Home");

    const view = f.load("t3-spaces");
    view.render(cx);
    assert.ok(!view.rows.some(e => e.key === "space-h"), "no row");
    assert.ok(view.rows.some(e => e.key === "space-s1"));
    assert.ok(!f.calls.some(([name]) => name === "space.move"), "and the rows' order still counts it: nothing moves");
    f.calls.length = 0;

    // At Home the bar is empty, the button says so, and what the bar's keys would do elsewhere stays out of it.
    const strip = f.load("t3-tabs", { part: "strip" }).render(cx);
    assert.equal(find(strip, "tab-page"), null, "no tab");
    assert.equal(find(f.load("t3-tabs", { part: "end" }).render(cx), "tab-new"), null, "no +");
    assert.equal(find(f.load("t3-chrome").render(cx), "home").style.bg, f.theme().selected);
    fire(find(f.load("t3-chrome").render(cx), "home"), "on_click", {}, cx);
    assert.deepEqual(made(), [["t3-tabs.home", {}]]);
    await say("new");
    assert.deepEqual(made(), [["mod.open", { name: "t3-new-menu" }]], "New picks the space");
    f.shown.tab = "page";
    await say("close-tab");
    assert.deepEqual([made(), f.overlays.length], [[], 0], "a key pressed out of habit doesn't close Home");

    // The page: what can be done next as buttons, each stroke of a bound key on a cap of its own.
    {
      f.slots.lists = { id: "sidebar-lists", active: "inbox" };
      f.state["t3-inbox.rows"] = { order: ["t0"], view: null };
      f.calls.length = 0;
      const page = f.load("t3-home"), tree = () => page.render(cx);
      assert.deepEqual(strings(tree()), ["Next agent", "Go to", "New tab", "⌘", "T"], "an unbound action stays a button, with no caps");
      fire(find(tree(), "home-next"), "on_click", {}, cx);
      fire(find(tree(), "home-goto"), "on_click", {}, cx);
      fire(find(tree(), "home-new"), "on_click", {}, cx);
      assert.deepEqual(plain(f.calls.splice(0)), [["t3-tabs.next", {}], ["mod.open", { name: "t3-picker" }], ["t3-tabs.new", {}]]);
      f.state["t3-inbox.rows"] = { order: [], view: null };
      assert.equal(find(tree(), "home-next").handlers.on_click, undefined, "nowhere to go: no button");
      assert.ok(find(tree(), "home-next").style.opacity < 1);
      assert.ok(find(tree(), "home-goto").handlers.on_click, "and the others stay");
      f.slots.lists.active = "lists";
      assert.ok(find(tree(), "home-next").handlers.on_click, "Lists go by the agents");
      f.slots.lists.active = "inbox"; f.slots.sidebar.hidden = true;
      assert.ok(find(tree(), "home-next").handlers.on_click, "and so does a hidden sidebar");
      delete f.slots.sidebar.hidden;
      delete f.slots.lists;
      delete f.state["t3-inbox.rows"];
    }

    // Its pane's header says nothing of it: the brand bar's button tells where this is.
    const panes = f.panes();
    panes.push({ pane: "ph", tab: "page", mod: "t3-home", title: "t3-home" });
    assert.ok(!strings(f.load("t3-pane", { pane: "ph" }).render(cx)).includes("t3-home"));
    panes.pop();

    // A pane goes as any does; the last gives way to the default page, which itself stays.
    const last = { pane: "pb", tab: "page", terminal: "t9" };
    panes.push(last);
    f.answerHc(() => ({ code: 0, stdout: JSON.stringify({ pid: 1, foreground: { pid: 1, name: "zsh" } }) }));
    await say("close-pane:pb");
    assert.deepEqual(made(), [["pane.split", { direction: "right", pane: "pb", mod: "t3-home" }], ["pane.close", { pane: "pb" }]]);
    panes.pop(); panes.push({ pane: "ph", tab: "page", mod: "t3-home", title: "Home" });
    await say("close-pane:ph");
    assert.deepEqual(made(), [], "Home always has a page");
    panes.pop();

    // The spaces the keys count and walk leave Home out, wherever it sits, and wrap.
    for (const [command, id] of [["space:1", "s0"], ["space:2", "s1"], ["space:3", "s2"], ["space-next", "s0"], ["space-prev", "s2"]]) {
      await say(command);
      assert.deepEqual(made(), [["space.select", { id }]], `${command} from Home`);
    }
    await say("space:4");
    assert.deepEqual(made(), [], "past the last, nothing");
    home.active = false; list.find(s => s.id === "s1").active = true;
    await say("space-next");
    assert.deepEqual(made(), [["space.select", { id: "s2" }]]);
    await say("space-prev");
    assert.deepEqual(made(), [["space.select", { id: "s0" }]], "s0, not Home between");
    await say("new");
    assert.deepEqual(made(), [["tab.new", {}]], "elsewhere New is a tab there");
  }
  // With the Inbox showing, the bar holds the agent in view and what's around it; the sidebar says what needs the person.
  {
    const f = fixture(256), spawn = cx.spawn, jobs = [];
    const program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["prog", "other", "mine", "kid", "rev"].map(id => ({ id, name: id, named: true, active: false })));
    const agent = (address, tab, status, parent) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status, program, parent, state: "live", focused: false });
    const list = [agent("A", "mine", "working"), agent("B", "other", "blocked"), agent("K", "kid", "working", "A")];
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })),
      { pane: "p-prog", terminal: "sh", tab: "prog", title: "lazygit" }, { pane: "p-rev", terminal: null, mod: "review", tab: "rev", title: "review" });
    cx.spawn = fn => jobs.push(fn);
    const view = f.load("t3-tabs");
    cx.spawn = spawn;
    const say = async command => { f.commands.push(command); jobs[0](cx); await new Promise(resolve => setImmediate(resolve)); };
    const taken = () => JSON.parse(JSON.stringify(f.calls.splice(0)));
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; };
    const shown = () => find(view.render(cx), "tab-strip").items.map(n => walk(n).map(x => x.key).find(k => /^tab-/.test(k ?? "")).slice(4));
    const inbox = (on) => { f.slots["sidebar-lists"] = { id: "sidebar-lists", active: on ? "inbox" : "lists" }; };
    const spins = () => walk(find(view.render(cx), "tab-strip")).some(n => n.source === "mods/workspace-chrome/spinner.svg");
    const bang = () => strings(find(view.render(cx), "tab-strip")).includes("!");

    pick("mine", "A"); inbox(false);
    assert.deepEqual(shown(), ["prog", "other", "mine", "kid", "rev"], "Lists keeps every tab in its order");
    assert.ok(spins() && bang(), "and every mark");
    inbox(true);
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "the agent in view first, its sub-agent, then tabs with no agent; no other agent");
    assert.ok(!spins() && !bang(), "no marks: that's the sidebar's");
    f.slots.sidebar.hidden = true;
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "the same with the sidebar hidden");
    assert.ok(!spins() && !bang(), "no marks there either");
    assert.ok(find(view.render(cx), "agents-blocked"), "its toggle still counts");
    delete f.slots.sidebar.hidden;

    pick("prog");
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "in a program's tab, the agent last looked at stays");
    pick("kid", "K");
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "a sub-agent counts as the agent at its top");
    pick("other", "B");
    assert.deepEqual(shown(), ["other", "prog", "rev"], "another agent takes the place");
    pick("prog");
    assert.deepEqual(shown(), ["other", "prog", "rev"]);

    // Keys and the wheel go by what's shown, around the ends; Lists keeps Herdr's own.
    pick("mine", "A"); view.render(cx); taken();
    await say("tab:3");
    assert.deepEqual(taken(), [["tab.select", { id: "prog" }]], "the third shown, not the third of the space");
    await say("tab:9");
    assert.deepEqual(taken(), [], "past the end, nothing");
    await say("tab-prev");
    assert.deepEqual(taken(), [["tab.select", { id: "rev" }]], "round the start");
    await say("tab-next");
    assert.deepEqual(taken(), [["tab.select", { id: "kid" }]], "the other agent's tab between them is skipped");
    fire(view.render(cx), "on_scroll_wheel", { delta: { x: 0, y: -3 } }, cx);
    assert.deepEqual(taken(), [["tab.select", { id: "kid" }]], "the wheel too");
    inbox(false); view.render(cx); taken();
    await say("tab:3");
    assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "in Lists, the third of the space");
    await say("tab-next");
    assert.deepEqual(taken(), [["tab.next", {}]]);
    inbox(true);

    // Only tabs with no agent drag, and among themselves.
    const press = (id) => fire(find(view.render(cx), `tab-${id}`), "on_mouse_down:left", { position: { x: 0, y: 0 }, click_count: 1 }, cx);
    const over = (id) => fire(find(view.render(cx), `tab-${id}`), "on_mouse_move", { position: { x: 50, y: 0 } }, cx);
    const release = (id) => fire(find(view.render(cx), `tab-${id}`), "on_mouse_up:left", {}, cx);
    view.render(cx); taken();
    press("mine"); over("prog"); release("prog");
    assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "an agent's tab doesn't drag");
    press("rev"); over("prog"); release("prog");
    assert.deepEqual(taken(), [["tab.move", { id: "rev", index: 1 }]], "to its place in the space's real order");
    press("rev"); over("prog"); over("mine"); release("mine");
    assert.deepEqual(taken(), [["tab.move", { id: "rev", index: 1 }]], "an agent's tab takes no drop: it lands at the line it showed");

    // Closing the agent in view lands on Home, however it went; nothing else does.
    const close = (id) => { const i = tabs.findIndex(c => c.id === id); tabs.splice(i, 1); const a = list.findIndex(x => x.tab === id); if (a >= 0) { f.agents().splice(f.agents().findIndex(x => x.tab === id), 1); f.terminals().splice(f.terminals().findIndex(x => x.tab === id), 1); list.splice(a, 1); } };
    pick("mine", "A"); view.render(cx); taken();
    close("other"); view.render(cx);
    assert.deepEqual(taken(), [], "another tab closing stays put");
    pick("prog"); view.render(cx); close("rev"); view.render(cx);
    assert.deepEqual(taken(), [], "so does a tab with no agent that isn't in view");
    pick("mine", "A"); view.render(cx);
    close("mine"); pick("prog"); view.render(cx);
    assert.deepEqual(taken(), [["t3-tabs.home", {}]], "the agent in view closing goes Home, past Herdr's neighbour");
    view.render(cx);
    assert.deepEqual(taken(), [], "once");
    inbox(false); pick("kid", "K"); view.render(cx); close("kid"); pick("prog"); view.render(cx);
    assert.deepEqual(taken(), [], "Lists keeps Herdr's neighbour");
  }

  // Closing a tab with no agent goes back where the person was, not to the neighbour Herdr picks, which isn't somewhere they went.
  {
    const f = fixture(256), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs, ctx = cx;
    tabs.splice(0, tabs.length, ...["mine", "prog", "new", "other"].map(id => ({ id, name: id, named: true, active: false })));
    const list = [["A", "mine"], ["B", "other"]].map(([address, tab]) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status: "idle", program, state: "live", focused: false }));
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
    const view = f.load("t3-tabs");
    const taken = () => JSON.parse(JSON.stringify(f.calls.splice(0)));
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; view.render(ctx); };
    const shown = () => find(view.render(ctx), "tab-strip").items.map(n => walk(n).map(x => x.key).find(k => /^tab-/.test(k ?? "")).slice(4));
    const gone = (id) => tabs.splice(tabs.findIndex(c => c.id === id), 1);

    pick("mine", "A"); pick("new"); taken();
    gone("new"); pick("prog");
    assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "opened from the agent, closed: back to the agent");
    pick("mine", "A"); taken();

    tabs.splice(2, 0, { id: "new", name: "new", named: true, active: false });
    pick("prog"); pick("new"); taken();
    gone("new"); pick("other", "B");
    assert.deepEqual(taken(), [["tab.select", { id: "prog" }]], "the neighbour's an agent: still back to where they were");
    assert.deepEqual(shown(), ["mine", "prog"], "and while it goes, the neighbour doesn't take the bar's place");
    pick("prog"); taken();
    assert.deepEqual(shown(), ["mine", "prog"], "the agent the bar holds is still the one they last looked at");

    // A close this mod makes goes first, so Herdr's neighbour is never shown: that would cost an agent its unread done.
    {
      const spawn = ctx.spawn, jobs = [];
      ctx.spawn = fn => jobs.push(fn);
      const closer = f.load("t3-tabs");
      ctx.spawn = spawn;
      const say = async command => { f.commands.push(command); jobs[0](ctx); await new Promise(resolve => setImmediate(resolve)); };
      const see = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; closer.render(ctx); };
      tabs.splice(2, 0, { id: "new", name: "new", named: true, active: false });
      f.panes().push({ pane: "p-new", terminal: null, mod: "x", tab: "new", title: "x" });
      see("mine", "A"); see("new"); taken();
      await say("close-tab:new");
      assert.deepEqual(taken(), [["tab.select", { id: "mine" }], ["tab.close", { id: "new" }]], "back first, then the close");
      await say("close-pane:p-new");
      assert.deepEqual(taken(), [["tab.select", { id: "mine" }], ["pane.close", { pane: "p-new" }]], "a tab's lone pane too");
      see("prog"); taken();
      await say("close-tab:new");
      assert.deepEqual(taken(), [["tab.close", { id: "new" }]], "out of view, closing it moves nothing");
      f.state["t3-home.space"] = "h"; f.spaces().push({ id: "h", name: "Home", active: false, tabs: [{ id: "hp", name: "Home" }] });
      see("mine", "A"); taken();
      await say("close-tab-now:mine");
      assert.deepEqual(taken(), [["space.select", { id: "h" }], ["tab.close", { id: "mine", confirmed: true }]], "the agent in view: Home first, then the close");
      f.spaces().pop(); delete f.state["t3-home.space"]; f.panes().pop(); gone("new");
    }

    // Nowhere to go back to, as after a restart: Herdr's pick stands.
    const fresh = f.load("t3-tabs");
    fresh.render(ctx); taken();
    gone("prog"); tabs.forEach(c => { c.active = c.id === "mine"; }); fresh.render(ctx);
    assert.deepEqual(taken(), [], "no memory, no jump");
  }

  console.log("ok: sidebar widths 208/240/256/320/480, pins, tree, colors, space drag, search/settings, tabs and pane controls, inbox Working/Settle, Home.");
})().catch(e => { console.error(e); process.exit(1); });
