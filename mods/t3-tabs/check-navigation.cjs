const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function bundle(file, seen = new Set()) {
  if (seen.has(file)) return "";
  seen.add(file);
  const src = fs.readFileSync(path.join(__dirname, file), "utf8");
  const needs = [...src.matchAll(/^import [^;]*? from "\.\/(.+?)";/gm)].map(m => bundle(m[1], seen)).join("\n");
  return needs + "\n" + src.replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ");
}
const source = bundle("navigation.js");
const plain = value => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(setImmediate);

// twice: every frame() runs twice, as the tab strip and the keys copy both track one navigation each frame (main.js).
let twice = false;
// A fake Herdr core: tests change platform facts, advance time, and observe commands and labels.
function fixture() {
  const program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
  const tabs = ["local task", "second task", "remote task"].map((name, i) => ({ id: `b${i}`, name, named: true }));
  const spaces = tabs.map((tab, i) => ({ id: `s${i}`, name: `project ${i}`, active: i === 0, folder: `/work/p${i}`, machine: i === 2 ? "vps" : null, tabs: [tab] }));
  const agents = [0, 2].map(i => ({ address: i === 2 ? "vps/t2" : "t0", pane: `p${i}`, space: `s${i}`, space_name: spaces[i].name, tab: `b${i}`, title: tabs[i].name, program, focused: i === 0, status: i === 0 ? "working" : "blocked" }));
  const terminals = agents.map(a => ({ ...a, state: "live" }));
  const panes = agents.map(a => ({ ...a, terminal: a.address, cwd: `/work/${a.space}` }));
  const machines = [{ name: null, layout: "ready" }, { name: "vps", layout: "ready" }];
  const slots = { sidebar: { id: "sidebar" } }, state = {}, shown = { agent: "child" };
  const calls = [], labelled = [], overlays = [], closed = [], notifications = [], timers = [], events = [];
  let now = 1000000, hcAnswer = () => ({ code: 0 });
  const cx = { notify() {}, timer: { after(ms, fn) { const t = { ms, fn }; timers.push(t); return t; } } };
  const core = {
    spaces: () => spaces, agents: () => agents, terminals: () => terminals, panes: () => panes, machines: () => machines,
    focused: () => shown, shared: key => state[key], setShared: (key, value) => { state[key] = value; },
    layout: () => ({ children: Object.values(slots) }), home: () => "/home/test", window: () => ({ active: true }),
    run: (name, args) => calls.push([name, plain(args ?? {})]),
    hc: args => { labelled.push([...args]); return Promise.resolve(hcAnswer(args)); },
    notify: n => notifications.push(n),
    openOverlay: spec => { events.push("open"); overlays.push(spec); return overlays.length; },
    closeOverlay: id => { events.push("close"); closed.push(id); },
  };
  const scope = vm.createContext({ ...core, Date: { now: () => now } });
  vm.runInContext(source, scope, { filename: "navigation.js" });
  Object.assign(core, vm.runInContext("({ namer, programOf, focusAgent, focusPane, writeLabel })", scope));
  return { ...core, cx, slots, state, shown, calls, labelled, overlays, closed, notifications, timers, events,
    navigation: (beforeAsk, over = {}) => {
      const view = scope.navigation(beforeAsk, { ...core, ...over }), frame = view.frame;
      if (twice) view.frame = (track) => { frame(track); return frame(track); };
      return view;
    },
    answerHc: fn => { hcAnswer = fn; }, advance: ms => { now += ms; },
    async tick() { assert.equal(timers.at(-1).ms, 25); timers.at(-1).fn(); await flush(); },
  };
}

async function check() {
  // Closing one split keeps the surviving panes in view, both through T3 and when a program ends itself.
  for (const external of [false, true]) {
    for (const kind of ["shell", "agent", "mod"]) {
      const f = fixture(), view = f.navigation(), tabs = f.spaces()[0].tabs;
      tabs[0].active = true;
      tabs.push({ id: "previous", active: false });
      f.spaces().push({ id: "h", name: "Home\u200b", named: true, machine: null, tabs: [] });
      f.panes().push({ pane: "sibling", tab: "b0", ...(kind === "mod" ? { mod: "review" } : { terminal: "sibling-terminal" }) });
      if (kind === "agent") {
        const sibling = { ...f.agents()[0], address: "sibling-terminal", pane: "sibling", focused: false, status: "done" };
        f.agents().push(sibling); f.terminals().push({ ...sibling, turn: 1, labels: { "herdr.seen": "0" } });
      }
      tabs[0].active = false; tabs[1].active = true; view.frame();
      tabs[0].active = true; tabs[1].active = false;
      Object.assign(f.shown, { tab: "b0", pane: "p0", agent: "t0" });
      view.frame(); f.calls.length = 0;
      if (!external) {
        await view.handle("close-pane-now:p0", f.cx);
        assert.deepEqual(plain(f.calls.splice(0)), [["pane.close", { pane: "p0" }]], "a split closes without selecting Home");
      }
      f.panes().splice(f.panes().findIndex(p => p.pane === "p0"), 1);
      f.agents().splice(0, 1);
      Object.assign(f.shown, { pane: "sibling", agent: kind === "agent" ? "sibling-terminal" : null });
      view.frame();
      assert.deepEqual(f.calls, [], "the next frame keeps the surviving split in view");
      assert.deepEqual(f.labelled, [], "a surviving split was intentionally left in view");
    }
  }

  // Review's tab returns to the preceding tab; its split returns focus to the agent in that tab.
  for (const split of [false, true]) {
    const f = fixture(), view = f.navigation(), tabs = f.spaces()[0].tabs;
    tabs[0].active = true;
    Object.assign(f.shown, { tab: "b0", pane: "p0", agent: "t0" }); view.frame();
    const reviewTab = split ? "b0" : "review";
    if (!split) { tabs[0].active = false; tabs.push({ id: reviewTab, active: true }); }
    f.panes().push({ pane: "pr", tab: reviewTab, mod: "review", terminal: null });
    f.state["review.program"] = { inbox: true };
    Object.assign(f.shown, { tab: reviewTab, pane: "pr" }); view.frame(); f.calls.length = 0;
    await view.handle("close-pane-now:pr", f.cx);
    assert.deepEqual(plain(f.calls), split
      ? [["agent.focus", { terminal: "t0" }], ["pane.close", { pane: "pr" }]]
      : [["tab.select", { id: "b0" }], ["pane.close", { pane: "pr" }]], "Review returns before closing");
    assert.deepEqual(f.labelled, [], "closing Review writes no agent labels");
  }
  // A second view gets its own history; a non-strip frame only reads the tabs.
  {
    const f = fixture(), first = f.navigation(), tabs = f.spaces()[0].tabs;
    tabs.push({ id: "prog", active: false }); tabs[0].active = true; first.frame();
    tabs[0].active = false; tabs[1].active = true; first.frame();
    const second = f.navigation(); second.frame(false);
    tabs.pop(); tabs[0].active = true; f.calls.length = 0;
    second.frame(); assert.deepEqual(f.calls, [], "another view cannot inherit a close landing");
    first.frame(); assert.deepEqual(plain(f.calls), [["tab.select", { id: "b0" }]], "the first view keeps its own history");
    const h = { id: "h", machine: null, name: "Home\u200b", named: true, tabs: [] };
    f.spaces().push(h); second.frame(false);
    assert.equal(f.state["t3-tabs.home"], undefined, "a drawing-only copy does not claim Home");
    second.frame(); assert.equal(f.state["t3-tabs.home"], "h");
  }
  // Home: a space of its own, in no list, and the keys that walk spaces go around it.
  {
    const f = fixture(), list = f.spaces(), view = f.navigation();
    let pending;
    const say = async command => { pending = view.handle(command, f.cx); await flush(); };
    const made = () => plain(f.calls.splice(0));
    // spaces() catches up after a command: a step waits to see the one before.
    const tick = () => f.tick();
    f.calls.length = 0;
    // Before this computer's layout is read, a Home that exists would read as missing.
    f.machines()[0].layout = "loading";
    await say("home");
    assert.deepEqual(made(), [], "too soon to tell: no second Home");
    f.machines()[0].layout = "ready";
    await say("home");
    assert.deepEqual(made(), [["space.new", { name: "Home\u200b", machine: "", folder: "/home/test" }]]);
    // A slow core: past 2s it still counts as the Home it asked for, or it'd be an orphan in the lists.
    for (let i = 0; i < 100; i++) await tick();
    assert.equal(f.state["t3-tabs.home"], undefined, "not known until it's seen");
    // In the model's middle: its place doesn't change the keys' count or the spaces' rows.
    const home = { id: "h", name: "Home\u200b", named: true, active: true, machine: null, folder: "/home/test", tabs: [{ id: "shell", name: "1" }] };
    list[0].active = false; list.splice(1, 0, home);
    await tick();
    assert.equal(f.state["t3-tabs.home"], "h");
    assert.deepEqual(made(), [["tab.new", { space: "h", name: "Home", mod: "t3-home" }]]);
    assert.ok(f.spaces().find(s => s.id === "h").tabs.some(c => c.id === "shell"), "the page goes in before the shell leaves");
    home.tabs.push({ id: "page", name: "Home", active: true });
    await tick();
    assert.deepEqual(made(), [["tab.close", { id: "shell", confirmed: true }]]);
    home.tabs.shift();
    await say("home");
    assert.deepEqual(made(), [["space.select", { id: "h" }]], "there's one Home");

    await pending;
    assert.deepEqual(plain(view.frame()), { tabs: [], atHome: true, context: null }, "Home has no visible tabs");
    await say("new");
    assert.deepEqual(made(), [["mod.open", { name: "t3-new-menu" }]], "New picks the space");
    f.shown.tab = "page";
    await say("close-tab");
    assert.deepEqual([made(), f.overlays.length], [[], 0], "a key pressed out of habit doesn't close Home");
    const panes = f.panes();
    // Home's last pane stays; a pane split in beside it (Herdr's own keys) closes as any.
    panes.push({ pane: "ph", tab: "page", mod: "t3-home", title: "Home" });
    await say("close-pane:ph");
    assert.deepEqual(made(), [], "Home's last pane stays");
    panes.push({ pane: "pb", tab: "page", terminal: "t9" });
    f.answerHc(() => ({ code: 0, stdout: JSON.stringify({ pid: 1, foreground: { pid: 1, name: "zsh" } }) }));
    await say("close-pane:pb");
    assert.deepEqual(made(), [["pane.close", { pane: "pb" }]]);
    panes.splice(-2);

    // Its last program ending takes the space with it, past the × above: back to a new Home, not wherever Herdr landed.
    {
      const strip = f.navigation();
      strip.frame();
      made();
      list.splice(list.indexOf(home), 1); home.active = false; list[0].active = true;
      strip.frame();
      assert.deepEqual(made(), [["t3-tabs.home", {}]]);
      strip.frame();
      assert.deepEqual(made(), [], "once");
      list[0].active = false; list.splice(1, 0, home); home.active = true;
    }

    // The spaces the keys count and walk leave Home out, wherever it sits, and wrap.
    for (const [command, id] of [["space:1", "s0"], ["space:2", "s1"], ["space:3", "s2"], ["space-next", "s0"], ["space-prev", "s2"]]) {
      await say(command);
      assert.deepEqual(made(), [["space.select", { id }]], `${command} from Home`);
    }
    await say("space:4");
    assert.deepEqual(made(), [], "past the last, nothing");

    // Going Home: the layout takes Home's shape in the same go as the select, before spaces() shows it, and not once left.
    {
      home.active = false; list[0].active = true;
      panes.push({ pane: "ph", tab: "page", mod: "t3-home", title: "Home" });
      view.arrive = () => f.calls.push(["arrive", view.atHome]);
      await say("home"); await pending;
      assert.deepEqual(made(), [["arrive", true], ["tab.select", { id: "page" }]], "laid out for Home, then shown");
      assert.equal(view.atHome, true, "spaces() hasn't caught up: still Home's shape");
      home.active = true; list[0].active = false;
      assert.equal(view.atHome, true);
      home.active = false; list[0].active = true;
      assert.equal(view.atHome, false, "left straight after: not still coming");
      home.active = true; list[0].active = false;
      panes.pop(); delete view.arrive;
    }
    home.active = false; list.find(s => s.id === "s1").active = true;
    await say("space-next");
    assert.deepEqual(made(), [["space.select", { id: "s2" }]]);
    await say("space-prev");
    assert.deepEqual(made(), [["space.select", { id: "s0" }]], "s0, not Home between");
    for (const [from, command, to] of [["s0", "space-prev", "s2"], ["s2", "space-next", "s0"]]) {
      list.forEach(s => { s.active = s.id === from; });
      await say(command);
      assert.deepEqual(made(), [["space.select", { id: to }]], `${command} wraps at ${from}`);
    }
    await say("new");
    assert.deepEqual(made(), [["tab.new", { space: "s2", folder: "/work/s2" }]], "elsewhere New is a tab there, where its terminals are");
  }

  // With the Inbox showing, the bar holds the agent in view and what's around it; the sidebar says what needs the person.
  {
    const f = fixture();
    const program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["prog", "other", "mine", "kid", "rev"].map(id => ({ id, name: id, named: true, active: false })));
    const agent = (address, tab, status, parent) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status, program, parent, state: "live", focused: false });
    const list = [agent("A", "mine", "working"), agent("B", "other", "blocked"), agent("K", "kid", "working", "A")];
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })),
      { pane: "p-prog", terminal: "sh", tab: "prog", title: "lazygit" }, { pane: "p-rev", terminal: null, mod: "review", tab: "rev", title: "review" });
    const view = f.navigation(), say = command => view.handle(command, f.cx);
    const taken = () => plain(f.calls.splice(0));
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; };
    const shown = () => plain(view.frame().tabs.map(c => c.id));
    f.slots.lists = { id: "sidebar-lists", active: "inbox" };
    pick("mine", "A");
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"]);
    pick("prog");
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "gone to a tool's tab from the bar, the agent last looked at stays: the tool is its work's");
    pick("kid", "K");
    assert.deepEqual(shown(), ["mine", "kid", "prog", "rev"], "a sub-agent counts as the agent at its top");
    pick("other", "B");
    assert.deepEqual(shown(), ["other", "prog", "rev"], "another agent takes the place");
    pick("prog");
    assert.deepEqual(shown(), ["other", "prog", "rev"]);

    // Keys go by what's shown, around the ends; Lists keeps Herdr's own.
    pick("mine", "A"); view.frame(); taken();
    await say("tab:3");
    assert.deepEqual(taken(), [["tab.select", { id: "prog" }]], "the third shown, not the third of the space");
    await say("tab:9");
    assert.deepEqual(taken(), [], "past the end, nothing");
    await say("tab-prev");
    assert.deepEqual(taken(), [["tab.select", { id: "rev" }]], "round the start");
    await say("tab-next");
    assert.deepEqual(taken(), [["tab.select", { id: "kid" }]], "the other agent's tab between them is skipped");
    f.slots.lists.active = "lists"; view.frame(); taken();
    await say("tab:3");
    assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "in Lists, the third of the space");
    await say("tab-next");
    assert.deepEqual(taken(), [["tab.select", { id: "kid" }]]);
    f.slots.lists.active = "inbox";

  }

  // The Inbox's bar names who's in view, the lit card: a tab's agents side by side, the one last looked at held while a program
  // has the focus, a sub-agent under its parent. Everything comes from the frame; the one memory is checked against it.
  {
    const f = fixture();
    const program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["mine", "kid", "prog"].map(id => ({ id, name: id, named: true, active: false })));
    const agent = (address, tab, parent) => ({ address, pane: `p-${address}`, tab, space: "s0", space_name: "project 0", title: address, status: "idle", program, parent, state: "live", focused: false });
    const list = [agent("A", "mine"), agent("C", "mine"), agent("K", "kid", "A")];
    f.agents().splice(0, Infinity, ...list);
    f.terminals().splice(0, Infinity, ...list.map(a => ({ ...a })));
    f.panes().splice(0, Infinity, ...list.map(a => ({ ...a, terminal: a.address })),
      { pane: "p-git", terminal: "git", tab: "mine", title: "lazygit" }, { pane: "p-prog", terminal: "sh", tab: "prog", title: "vite" });
    f.slots.lists = { id: "sidebar-lists", active: "inbox" };
    let view = f.navigation();
    const at = (tab, pane) => {
      tabs.forEach(c => { c.active = c.id === tab; });
      const p = f.panes().find(p => p.pane === pane);
      f.agents().forEach(a => { a.focused = a.pane === pane; });
      Object.assign(f.shown, { tab, pane, terminal: p.terminal, agent: null });
      const c = view.frame().context;
      return c && plain({ ...c, space: c.space.id, kin: c.kin.map(t => t.id), programs: c.programs.map(t => t.id) });
    };
    const who = (heads, head, more = {}) => ({ space: "s0", tab: "mine", parent: null, heads, head, sub: null, held: false, away: false, kin: ["kid"], programs: ["prog"], ...more });

    assert.deepEqual(at("mine", "p-A"), who(["A", "C"], "A"), "a tab's agents are side by side; the focused one is in view");
    assert.deepEqual(at("mine", "p-C"), who(["A", "C"], "C", { kin: [] }), "focusing the other moves which is in view, and the family is its own");
    assert.deepEqual(at("mine", "p-git"), who(["A", "C"], "C", { held: true, kin: [] }), "a program beside them holds the one last looked at");
    assert.deepEqual(at("prog", "p-prog"), who(["A", "C"], "C", { held: true, away: true, kin: [] }), "a tool's tab: the agent last looked at stays, away");
    assert.deepEqual(at("kid", "p-K"), who(["K"], "K", { tab: "kid", parent: "A", kin: [] }), "a sub-agent's own tab: its parent leads back");

    // A sub-agent split beside its parent isn't a peer: it shows under the one it belongs to.
    const k2 = agent("K2", "mine", "C");
    f.agents().push(k2); f.terminals().push({ ...k2 }); f.panes().push({ ...k2, terminal: "K2" });
    assert.deepEqual(at("mine", "p-K2"), who(["A", "C"], "C", { sub: "K2", kin: [] }), "its family is C's, which has no other tab");

    // The one held ends: the tab's first stands for it. Its parent ending leaves a sub-agent at the top.
    at("mine", "p-C");
    for (const l of [f.agents(), f.terminals(), f.panes()]) l.splice(l.findIndex(x => x.address === "C"), 1);
    assert.deepEqual(at("mine", "p-git"), who(["A", "K2"], "A", { held: true }), "a gone agent isn't held");
    f.terminals().find(k => k.address === "A").state = "exited";
    f.agents().splice(f.agents().findIndex(a => a.address === "A"), 1);
    assert.deepEqual(at("kid", "p-K"), who(["K"], "K", { tab: "kid", kin: [] }), "with its parent gone, a sub-agent has none to lead back to");

    // After a restart nothing is remembered: the tab's first agent is held.
    f.terminals().find(k => k.address === "A").state = "live";
    f.agents().unshift(list[0]);
    view = f.navigation();
    assert.deepEqual(at("mine", "p-git"), who(["A", "K2"], "A", { held: true }));
    // Lists has its own bar.
    f.slots.lists.active = "lists";
    assert.equal(at("mine", "p-A"), null);
  }

  // Starting something new in the space (its name in the breadcrumb, cmd-t) leaves the agent behind: tabs with no agent read as the
  // space alone, gone to by the bar or not, until an agent is looked at again.
  for (const command of ["open-empty", "new"]) {
    const f = fixture(), tabs = f.spaces()[0].tabs, view = f.navigation();
    tabs.splice(0, Infinity, ...["mine", "prog", "fresh"].map(id => ({ id, name: id, named: true, active: id === "mine" })));
    f.agents()[0].tab = "mine"; f.panes()[0].tab = "mine";
    f.panes().splice(1, Infinity, { pane: "p-prog", tab: "prog", terminal: "t-prog" }, { pane: "p-fresh", tab: "fresh", terminal: "t-fresh" });
    f.slots.lists = { id: "sidebar-lists", active: "inbox" };
    f.answerHc(() => ({ code: 0, stdout: JSON.stringify({ pid: 1, foreground: { pid: 1, name: "zsh" } }) }));
    const show = (id, agent) => { tabs.forEach(c => { c.active = c.id === id; }); f.agents()[0].focused = Boolean(agent); Object.assign(f.shown, { tab: id, agent: agent ?? null }); return view.frame().context; };
    show("mine", "t0");
    assert.equal(show("prog").head, "t0", "a tool's tab: still the agent's");
    await view.handle(command, f.cx);
    assert.deepEqual([show("fresh").head, show("prog").head], [null, null], `${command}: the space alone, the tools' tabs too`);
    show("mine", "t0");
    assert.equal(show("prog").head, "t0", "looking at an agent again picks it back up");
  }

  // The breadcrumb's space opens a tab to work in: one already waiting, a shell alone at its prompt, the latest shown first;
  // else a new one. A press after a press finds the first one's tab, so they don't pile up.
  {
    const f = fixture(), tabs = f.spaces()[0].tabs, view = f.navigation(), say = command => view.handle(command, f.cx);
    tabs.splice(0, Infinity, ...["mine", "busy", "e1", "e2", "pair"].map(id => ({ id, name: id, active: id === "mine" })));
    f.panes().splice(1, Infinity, ...["busy", "e1", "e2"].map(id => ({ pane: `p-${id}`, tab: id, terminal: `t-${id}` })),
      { pane: "p-pair1", tab: "pair", terminal: "t-pair1" }, { pane: "p-pair2", tab: "pair", terminal: "t-pair2" });
    f.panes()[0].tab = f.agents()[0].tab = "mine";
    const shell = { pid: 1, foreground: { pid: 1, name: "zsh" } }, busy = { pid: 1, foreground: { pid: 2, name: "vite" } };
    f.answerHc(args => ({ code: 0, stdout: JSON.stringify(args[1] === "t-busy" ? busy : shell) }));
    const taken = () => plain(f.calls.splice(0)), show = id => { tabs.forEach(c => { c.active = c.id === id; }); view.frame(); };
    show("e2"); show("mine"); taken();
    await say("open-empty");
    assert.deepEqual(taken(), [["tab.select", { id: "e2" }]], "the empty tab last shown; not a busy one, an agent's or a split's");
    tabs.splice(2, 2);
    await say("open-empty");
    assert.deepEqual(taken(), [["tab.new", { space: "s0", folder: "/work/s0" }]], "none waiting: a new one");
  }

  {
    // A person's close asks when it ends terminals, as T3's; only the dialog's command closes.
    const f = fixture();
    f.spaces().splice(0, Infinity,
      { id: "s", active: true, tabs: [{ id: "a", name: "Alpha", named: true, active: true }, { id: "b", name: "Beta", named: true }] },
      { id: "solo", tabs: [{ id: "c", name: "Solo", named: true }] });
    f.panes().splice(0, Infinity, { pane: "p1", tab: "a", terminal: "t1" }, { pane: "p2", tab: "a", terminal: "t2" },
      { pane: "m", tab: "b", mod: "board" }, { pane: "p4", tab: "c", terminal: "t4" });
    Object.assign(f.shown, { tab: "a", pane: "p1" });
    const view = f.navigation(() => f.events.push("prepare"));
    const say = command => view.handle(command, f.cx);
    // What `hc get` says: its own shell at the prompt, a program it started, a program that is the terminal, or no answer.
    const shell = { pid: 1, foreground: { pid: 1, name: "zsh" } }, program = { pid: 1, foreground: { pid: 2, name: "sleep" } }, own = { pid: 1, foreground: { pid: 1, name: "sleep" } };
    let fg = () => program;
    f.answerHc(args => ({ code: 0, stdout: JSON.stringify(fg(args[1])) }));
    f.calls.length = 0;
    await say("close-tab");
    let asked = f.overlays.pop();
    assert.deepEqual([asked.mod, asked.frame, asked.props.actions, asked.props.title, asked.props.yes], ["t3-actions", "none", "confirm", "Close 2 terminals?", "Close"], "as T3's: what ends, counted; the button says it");
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
    await say("close-tab");
    f.overlays.pop();
    assert.deepEqual(f.events.slice(-3), ["prepare", "close", "open"], "prepare the dialog before replacing the previous one");
    Object.assign(f.shown, { tab: "c", pane: "p4" });
    await say("close-tab");
    asked = f.overlays.pop();
    assert.equal(asked.props.title, 'Close terminal "Solo"?', "a lone pane by its tab's name, as T3's");
    assert.match(asked.props.detail, /^This stops the running process.*space closes too/, "the last tab says its space goes too");
    assert.equal(f.overlays.length, 0);
    f.spaces()[1].tabs[0].name = "x".repeat(41);
    await say("close-tab");
    assert.equal(f.overlays.pop().props.title, `Close terminal "${"x".repeat(41)}"?`, "a long name stays whole: the title wraps, as T3's");
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

  // Another window on the core finds Home by its own name, and nothing that only looks like it.
  {
    const f = fixture(), list = f.spaces(), tabs = f.navigation();
    const place = (id, name, extra) => list.push({ id, name, named: true, active: false, machine: null, tabs: [], ...extra });
    place("mine", "Home");
    place("plain", "Home\u200b", { named: false });
    place("far", "Home\u200b", { machine: "kvm" });
    tabs.frame();
    assert.equal(f.state["t3-tabs.home"], undefined, "a space someone calls Home, an unnamed one, another machine's: none is this Home");
    place("h", "Home\u200b");
    tabs.frame();
    assert.equal(f.state["t3-tabs.home"], "h");
    f.state["t3-tabs.home"] = "mine"; f.calls.length = 0;
    tabs.frame(); tabs.frame();
    assert.deepEqual(plain(f.calls.filter(([name]) => name === "space.rename")), [["space.rename", { id: "mine", name: "Home\u200b" }]], "a Home made before gets the name, once");
    assert.equal(f.state["t3-tabs.home"], "mine", "the Home it knows stays");
  }

  // A focus or a zoom this mod didn't go ahead of (a toast, hc, the zoom button): the later of the two wins, once, and what the stale zoom showed gets its done back.
  {
    const f = fixture(), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["away", "two"].map(id => ({ id, name: id, named: true, active: false })));
    const list = [["E", "away", "idle"], ["Z", "two", "done"], ["Y", "two", "idle"]].map(([address, tab, status]) => ({ address, pane: `p${address}`, tab, space: "s0", space_name: "project 0", title: tab, status, program, state: "live", focused: false, turn: 1, labels: { "herdr.seen": "0" } }));
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
    const view = f.navigation(), zooms = () => f.calls.filter(([name]) => ["pane.zoom", "pane.focus"].includes(name));
    const frame = (tab, on, zoomed) => {
      tabs.forEach(c => { c.active = c.id === tab; });
      f.panes().forEach(p => { p.focused = p.pane === `p${on}`; p.zoomed = p.pane === `p${zoomed}`; });
      f.agents().forEach(a => { a.focused = a.address === on; });
      f.shown.agent = on; view.frame();
    };
    frame("away", "E", "Z");
    assert.deepEqual(zooms(), [], "a zoom in a tab out of view asks nothing");
    // The stale frame shows Z, and in the focus's own step Herdr marks it seen.
    list[1].status = "idle"; list[1].labels["herdr.seen"] = "1";
    frame("two", "Y", "Z");
    assert.deepEqual(zooms(), [["pane.zoom", { pane: "pY" }]], "the focus moved: the zoom follows");
    frame("two", "Y", "Z");
    assert.equal(zooms().length, 1, "once: a repeat would toggle it off");
    assert.deepEqual(f.labelled, [], "still on screen: nothing yet");
    frame("two", "Y", "Y");
    assert.deepEqual(f.labelled.map(a => a.join(" ")), ["label Z herdr.seen=0"], "zoomed away from is out of view: its done is back");
    f.calls.length = 0;
    frame("two", "Y", "Z");
    assert.deepEqual(zooms(), [["pane.focus", { pane: "pZ" }]], "the zoom moved, the focus didn't: the focus follows");
    f.calls.length = 0;
    frame("two", "Z", "Z");
    assert.deepEqual(zooms(), [], "agreeing, nothing to do");
  }


  // A close this mod can't go ahead of (the program ending, a menu's Close): Herdr showed its pick and marked it seen, so an agent
  // that was unread a frame before gets its done back once it's out of view, Herdr's own Mark unread.
  {
    const f = fixture(), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    let view;
    const setup = () => {
      tabs.splice(0, tabs.length, ...["prog", "mine", "next"].map(id => ({ id, name: id, named: true, active: false })));
      const list = [["A", "mine", "idle"], ["N", "next", "done"]].map(([address, tab, status]) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status, program, state: "live", focused: false, turn: 1, labels: { "herdr.seen": "0" } }));
      f.agents().splice(0, f.agents().length, ...list);
      f.terminals().splice(0, f.terminals().length, ...list);
      f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
      f.labelled.splice(0); f.calls.splice(0);
      view = f.navigation();
      return list;
    };
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); f.agents().forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; view.frame(); };
    // Herdr's pick: the tab goes, its right neighbour shows and, the window active, is seen.
    const exit = (id, to) => { const n = f.agents().find(a => a.tab === to); tabs.splice(tabs.findIndex(c => c.id === id), 1); f.agents().splice(f.agents().findIndex(a => a.tab === id), 1); if (n) { n.status = "idle"; n.labels["herdr.seen"] = "1"; } pick(to, n?.address); };
    const labels = () => f.labelled.map(a => a.join(" "));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };

    let [, n] = setup();
    pick("mine", "A"); exit("mine", "next");
    assert.deepEqual(labels(), [], "nothing while it's still on screen");
    pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0"], "out of view, its done is back");
    pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0"], "once");

    [, n] = setup(); n.labels.snoozed = "1";
    pick("mine", "A"); exit("mine", "next"); delete n.labels.snoozed; pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0", "label N snoozed=1"], "a woken snooze the showing cleared comes back too");

    [, n] = setup(); n.labels.snoozed = "1";
    pick("mine", "A"); exit("mine", "next"); pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0"], "the snooze's clearing not back yet: it waits");
    delete n.labels.snoozed; pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0", "label N snoozed=1"]);

    [, n] = setup();
    pick("mine", "A"); exit("mine", "next"); n.labels["herdr.seen"] = "0"; pick("prog");
    assert.deepEqual(labels(), [], "its seen not back from the core yet: the lower write would land first, so it waits");
    n.labels["herdr.seen"] = "1"; pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0"]);

    [, n] = setup();
    pick("mine", "A"); exit("mine", "next");
    pick("next", "N"); f.advance(3001); pick("next", "N"); pick("prog");
    assert.deepEqual(labels(), [], "staying on it, it was seen after all");

    [, n] = setup();
    pick("mine", "A"); exit("mine", "next");
    f.advance(3000); pick("next", "N"); pick("prog");
    assert.deepEqual(labels(), ["label N herdr.seen=0"], "the debt still belongs to the unread turn at exactly three seconds");


    await new Promise(setImmediate);
    const pending = [];
    f.answerHc(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
    [, n] = setup(); n.labels.snoozed = "1";
    pick("mine", "A"); exit("mine", "next"); delete n.labels.snoozed; pick("prog");
    assert.equal(pending.length, 2, "the unread done and Woke both start repayment");
    pick("prog"); pick("prog");
    assert.equal(pending.length, 2, "each label has at most one request in flight across frames");
    pending[0].resolve({ code: 1, stderr: "offline" }); pending[1].reject(new Error("disconnected"));
    await new Promise(setImmediate);
    assert.equal(pending.length, 2, "failed writes wait for the next frame before retrying");
    assert.deepEqual(f.notifications.map(n => n.body), ["offline", "Error: disconnected"], "both failures use writeLabel's visible error path");
    pick("prog");
    assert.equal(pending.length, 4, "a later frame retries both labels");
    pending[2].resolve({ code: 1, stderr: "still offline" }); pending[3].reject(new Error("still disconnected"));
    await new Promise(setImmediate);
    assert.equal(f.notifications.length, 2, "repeated repayment failures do not repeat either error toast");
    pick("prog");
    assert.equal(pending.length, 6, "both labels keep retrying after a repeated failure");
    pending[4].resolve({ code: 0 }); pending[5].resolve({ code: 0 });
    await new Promise(setImmediate);
    pick("prog");
    assert.deepEqual(labels(), Array.from({ length: 3 }, () => ["label N herdr.seen=0", "label N snoozed=1"]).flat(), "each retry keeps the original unread turn and snooze");
    assert.equal(pending.length, 6, "success stops retries");
  }


  // Closing a tab with no agent goes back where the person was, not to the neighbour Herdr picks, which isn't somewhere they went.
  {
    const f = fixture(), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["mine", "prog", "new", "other"].map(id => ({ id, name: id, named: true, active: false })));
    const list = [["A", "mine"], ["B", "other"]].map(([address, tab]) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status: "idle", program, state: "live", focused: false }));
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
    const view = f.navigation();
    const taken = () => JSON.parse(JSON.stringify(f.calls.splice(0)));
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; view.frame(); };
    const shown = () => plain(view.frame().tabs.map(c => c.id));
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
      const closer = f.navigation();
      const say = command => closer.handle(command, f.cx);
      const see = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; closer.frame(); };
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
      f.state["t3-tabs.home"] = "h"; f.spaces().push({ id: "h", name: "Home", active: false, tabs: [{ id: "hp", name: "Home" }] });
      see("mine", "A"); taken();
      await say("close-tab-now:mine");
      assert.deepEqual(taken(), [["space.select", { id: "h" }], ["tab.close", { id: "mine", confirmed: true }]], "the agent in view: Home first, then the close");
      see("mine", "A"); taken();
      const all = tabs.splice(0, tabs.length, ...tabs.filter(c => c.id === "mine"));
      await say("close-tab-now:mine");
      assert.deepEqual(taken(), [["space.select", { id: "h" }], ["tab.close", { id: "mine", confirmed: true }]], "its space's last tab too: Herdr would show another space's");
      tabs.splice(0, tabs.length, ...all);
      // Herdr moved the space's own active tab to the closed one's neighbour, out of sight: a key back mustn't show it, which would cost it its unread done.
      see("prog"); see("mine", "A"); taken();
      f.spaces()[0].active = false; f.spaces().at(-1).active = true; closer.frame();
      tabs.forEach(c => { c.active = c.id === "other"; });
      await say("space:1");
      assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "back to the tab last shown there, without its active tab showing on the way");
      await say("space-next");
      assert.deepEqual(taken(), [["tab.select", { id: "mine" }]], "walking there too");
      f.spaces()[0].active = true; f.spaces().at(-1).active = false;
      f.spaces().pop(); delete f.state["t3-tabs.home"]; f.panes().pop(); gone("new");
    }

    // Nowhere to go back to, as after a restart: Herdr's pick stands.
    const fresh = f.navigation();
    fresh.frame(); taken();
    gone("prog"); tabs.forEach(c => { c.active = c.id === "mine"; }); fresh.frame();
    assert.deepEqual(taken(), [], "no memory, no jump");
  }


  // The agent in view closed by what this mod doesn't make (its menu, its program ending): the neighbour Herdr shows for a frame isn't somewhere the person went.
  {
    const f = fixture(), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["was", "mine", "next", "prog"].map(id => ({ id, name: id, named: true, active: false })));
    const list = [["W", "was"], ["A", "mine"], ["N", "next"]].map(([address, tab]) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status: "idle", program, state: "live", focused: false }));
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "inbox" };
    const view = f.navigation();
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; view.frame(); };
    pick("was", "W"); pick("mine", "A"); f.calls.length = 0;
    tabs.splice(tabs.findIndex(c => c.id === "mine"), 1); f.agents().splice(f.agents().findIndex(a => a.address === "A"), 1);
    pick("next", "N");
    assert.deepEqual(plain(f.calls.splice(0)), [["t3-tabs.home", {}]]);
    pick("prog");
    assert.deepEqual(plain(view.frame().tabs.map(c => c.id)), ["was", "prog"], "the agent last looked at is still the one the bar holds, not Herdr's pick of a neighbour");
  }

  // In Lists, the agent in view closed goes back where the person was, as any tab: landing on Home is the Inbox's.
  for (const external of [true, false]) {
    const f = fixture(), program = { key: "pi", name: "Pi", agent: true, tint: true, icon: "icons/pi.svg" };
    const tabs = f.spaces()[0].tabs;
    tabs.splice(0, tabs.length, ...["was", "mine", "next"].map(id => ({ id, name: id, named: true, active: false })));
    const list = [["W", "was"], ["A", "mine"], ["N", "next"]].map(([address, tab]) => ({ address, pane: `p-${tab}`, tab, space: "s0", space_name: "project 0", title: tab, status: "idle", program, state: "live", focused: false }));
    f.agents().splice(0, f.agents().length, ...list);
    f.terminals().splice(0, f.terminals().length, ...list);
    f.panes().splice(0, f.panes().length, ...list.map(a => ({ ...a, terminal: a.address })));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "lists" };
    f.state["t3-tabs.home"] = "h"; f.spaces().push({ id: "h", name: "Home\u200b", named: true, machine: null, active: false, tabs: [{ id: "hp", name: "Home" }] });
    const view = f.navigation();
    const pick = (id, address) => { tabs.forEach(c => { c.active = c.id === id; }); list.forEach(a => { a.focused = a.address === address; }); f.shown.agent = address ?? null; view.frame(); };
    pick("was", "W"); pick("mine", "A"); f.calls.length = 0;
    if (external) {
      tabs.splice(tabs.findIndex(c => c.id === "mine"), 1); f.agents().splice(f.agents().findIndex(a => a.address === "A"), 1);
      pick("next", "N");
      assert.deepEqual(plain(f.calls.splice(0)), [["tab.select", { id: "was" }]], "Lists: a program ending goes back, not Home");
    } else {
      await view.handle("close-tab-now:mine", f.cx);
      assert.deepEqual(plain(f.calls.splice(0)), [["tab.select", { id: "was" }], ["tab.close", { id: "mine", confirmed: true }]], "Lists: back first, then the close");
    }
  }

  // A snooze ends on a failure in its tree or a new turn given in view, in either sidebar, though the Inbox copy hasn't started.
  {
    const f = fixture(), [a] = f.agents(), [k] = f.terminals(), view = f.navigation();
    const snoozes = () => f.labelled.filter(l => l[2].startsWith("snoozed=")).map(l => l.join(" "));
    f.slots["sidebar-lists"] = { id: "sidebar-lists", active: "lists" };
    Object.assign(a, { status: "idle" }); k.labels = { snoozed: String(Date.now() + 3600000) };
    view.frame();
    a.status = "working"; view.frame();
    assert.deepEqual(snoozes(), ["label t0 snoozed="], "put to work in view: the snooze ends");
    view.frame();
    assert.equal(snoozes().length, 1, "once while the label comes back");

    const g = fixture(), [b] = g.agents(), [kb] = g.terminals(), quiet = g.navigation();
    const said = () => g.labelled.filter(l => l[2].startsWith("snoozed=")).length;
    b.status = "idle"; b.focused = false; kb.labels = { snoozed: String(Date.now() + 3600000) };
    quiet.frame(); b.status = "working"; quiet.frame();
    assert.equal(said(), 0, "work out of view isn't the person's: it stays snoozed");
    kb.status = "error"; quiet.frame();
    assert.equal(said(), 1, "a failure ends it");

    // A peek at its sub-agent is it in view, as in the Inbox: the work given there ends the parent's snooze.
    const h = fixture(), [p] = h.agents(), [kp] = h.terminals(), peek = h.navigation();
    p.status = "idle"; p.focused = false; kp.labels = { snoozed: String(Date.now() + 3600000) };
    const kid = { address: "kid", parent: "t0", state: "live", status: "idle", program: p.program };
    h.terminals().push(kid); Object.assign(h.shown, { agent: "kid", pane: undefined, terminal: undefined });
    peek.frame(); kid.status = "working"; peek.frame();
    assert.deepEqual(h.labelled.filter(l => l[2].startsWith("snoozed=")).map(l => l.join(" ")), ["label t0 snoozed="], "peeked at: the snooze ends");
  }
  // The layout's settings (t3.settings): a dialog of t3-chrome's, opened by the key this bar answers; one at a time.
  {
    const f = fixture(), view = f.navigation();
    await view.handle("settings", f.cx);
    assert.deepEqual(plain(f.overlays), [{ mod: "t3-chrome", kind: "dialog", width: 880, props: { view: "settings" } }]);
    await view.handle("settings", f.cx);
    assert.deepEqual([f.closed, f.overlays.length], [[1], 2], "pressed again, it replaces the open one");
  }

  // Home is the mod the person named (t3.settings): it's what a new Home gets and what an emptied one goes back to.
  {
    const f = fixture(), list = f.spaces(), view = f.navigation();
    f.state["t3.settings"] = { homeMod: "review" };
    const pending = view.handle("home", f.cx); await flush();
    assert.deepEqual(plain(f.calls.splice(0)), [["space.new", { name: "Home\u200b", machine: "", folder: "/home/test" }]]);
    list[0].active = false;
    list.push({ id: "h", name: "Home\u200b", named: true, active: true, machine: null, folder: "/home/test", tabs: [{ id: "shell", name: "1" }] });
    await f.tick();
    assert.deepEqual(plain(f.calls.splice(0)), [["tab.new", { space: "h", name: "Home", mod: "review" }]]);
    list.at(-1).tabs.push({ id: "page", name: "Home" }); await f.tick(); await pending;
    f.calls.length = 0; list.at(-1).tabs.shift();
    f.panes().push({ pane: "pr", tab: "page", mod: "review" });
    await view.handle("close-pane:pr", f.cx);
    assert.deepEqual(plain(f.calls.splice(0)), [], "Home's mod stays");
  }

  // Home is one thing alone: its own tab, a lone pane that's the setting's mod or, set so, a shell. Another mod there, or an
  // idle shell when a mod is wanted, gives way to it; a busy shell keeps its tab and Home gets a new one.
  {
    const f = fixture(), ps = f.panes(), list = f.spaces(), every = f.agents();
    f.state["t3-tabs.home"] = "h";
    const home = { id: "h", name: "Home\u200b", named: true, machine: null, tabs: [] };
    list.push(home);
    let n = 0, busy = false;
    const tabOf = (pane) => ps.find(p => p.pane === pane)?.tab;
    // Herdr, as far as Home needs it: a new tab, a split, a close.
    const run = (name, args = {}) => {
      f.run(name, args);
      const extra = args.mod ? { mod: args.mod } : { terminal: `tn${++n}` };
      if (name === "tab.new") { const id = `new${++n}`; home.tabs.push({ id }); ps.push({ pane: `pn${n}`, tab: id, ...extra }); }
      if (name === "pane.split") ps.push({ pane: `px${++n}`, tab: tabOf(args.pane), ...extra });
      if (name === "pane.close") ps.splice(ps.findIndex(p => p.pane === args.pane), 1);
    };
    const hc = () => Promise.resolve({ code: 0, stdout: JSON.stringify({ pid: 1, foreground: busy ? { pid: 2, name: "lazygit" } : { pid: 1, name: "zsh" } }) });
    const view = f.navigation(undefined, { run, hc });
    // A step waits to see the one before: time moves until the command is through.
    const say = async (command, mod, panes, tabs = [...new Set(panes.map(p => p.tab))]) => {
      ps.splice(2, Infinity, ...panes.map(p => ({ ...p }))); home.tabs = tabs.map(id => ({ id })); f.calls.length = 0;
      f.state["t3.settings"] = { homeMod: mod };
      let done = false;
      const pending = view.handle(command, f.cx).then(() => { done = true; });
      for (let i = 0; i < 40 && !done; i++) { await flush(); if (!done && f.timers.length) f.timers.pop().fn(); }
      await pending;
      return plain(f.calls);
    };
    const page = { pane: "ph", tab: "ht", mod: "t3-home" }, shell = { pane: "ps", tab: "ht", terminal: "t9" };
    assert.deepEqual(await say("home", "t3-home", [page]), [["tab.select", { id: "ht" }]]);
    assert.deepEqual(await say("home-mod", "review", [page]), [["pane.split", { direction: "right", pane: "ph", mod: "review" }], ["pane.close", { pane: "ph" }]], "a change shows at once, staying where you are");
    assert.deepEqual(await say("home-mod", null, [page]), [["pane.split", { direction: "right", pane: "ph" }], ["pane.close", { pane: "ph" }]]);
    assert.deepEqual(await say("home", "review", [page]), [["pane.split", { direction: "right", pane: "ph", mod: "review" }], ["pane.close", { pane: "ph" }], ["tab.select", { id: "ht" }]], "the setting changed");
    assert.deepEqual(await say("home", "t3-home", [shell]), [["pane.split", { direction: "right", pane: "ps", mod: "t3-home" }], ["pane.close", { pane: "ps" }], ["tab.select", { id: "ht" }]], "an idle shell gives way");
    busy = true;
    assert.deepEqual(await say("home", "t3-home", [shell]), [["tab.new", { space: "h", name: "Home", folder: "/home/test", mod: "t3-home" }]], "a program running stays; a new tab shows itself");
    busy = false;
    // Home as a terminal: the page gives way to a shell, a new tab of it has the home folder, and the shell stays.
    assert.deepEqual(await say("home", null, [page]), [["pane.split", { direction: "right", pane: "ph" }], ["pane.close", { pane: "ph" }], ["tab.select", { id: "ht" }]]);
    assert.deepEqual(await say("home", null, [shell]), [["tab.select", { id: "ht" }]]);

    // An agent started in Home turns it into an ordinary space where it is, renamed for its folder: nothing moves or parks.
    // Its old name doesn't make it Home again before the rename shows; going Home makes a new one.
    {
      const strip = f.navigation(undefined, { run });
      list.forEach(s => { s.active = s.id === "h"; });
      ps.splice(2, Infinity, { pane: "pq", tab: "ht", terminal: "t6" }); home.tabs = [{ id: "ht", active: true, named: true, name: "Home" }]; every.push({ address: "t6", tab: "ht", status: "working" });
      f.calls.length = 0; strip.frame(); strip.frame();
      assert.deepEqual(plain(f.calls), [["space.rename", { id: "h", name: "" }], ["tab.rename", { id: "ht", name: "" }]], "once, and the view stays; the tab's Home name goes too");
      assert.equal(f.state["t3-tabs.home"], null);
      assert.equal(strip.frame().atHome, false, "an ordinary space now: its tabs show");
      f.calls.length = 0;
      strip.handle("home", f.cx); await flush();
      assert.deepEqual(plain(f.calls), [["space.new", { name: "Home\u200b", machine: "", folder: "/home/test" }]], "a new Home");
      every.pop();
    }
  }

  // Settled with the key, the agent in view gives way to the Inbox's next card, going around, if the person chose that;
  // the rows say which are cards. No card left, or Home chosen: the caller goes Home.
  {
    const f = fixture(), view = f.navigation();
    const as = (fn) => { f.calls.length = 0; fn(); return plain(f.calls.splice(0)); };
    f.state["t3-inbox.rows"] = { order: ["A", "pane:pm", "S"], view: "A", cards: 2 };
    assert.deepEqual([view.nextCard("A"), f.calls], [false, []], "Home by default");
    f.state["t3.settings"] = { afterAway: "next" };
    assert.deepEqual(as(() => assert.equal(view.nextCard("A"), true)), as(() => f.focusPane("pm")));
    assert.deepEqual(as(() => assert.equal(view.nextCard("pane:pm"), true)), as(() => f.focusAgent("A")), "from the last, the first");
    f.state["t3-inbox.rows"] = { order: ["A", "S"], view: "A", cards: 1 };
    assert.deepEqual([view.nextCard("A"), f.calls], [false, []], "a settled row isn't a card");
  }
}

(async () => {
  await check();
  twice = true;
  await check();
  console.log("ok: navigation Home, close order, history, visible tabs, zoom, unread repayment and retries; the same tracked twice a frame.");
})().catch(e => { console.error(e); process.exit(1); });
