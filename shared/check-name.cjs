// What a terminal is on (name.js) in a fake herdr: the one rule for Inbox cards, the agents list, tabs and pane headers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { strip } = require("./check-kit.js");

const program = { name: "Pi", key: "pi", agent: true };
const pane = { pane: "p2", terminal: "t2", tab: "b", title: "pi", cwd: "/home/me/project", program, status: "working" };
const shell = { pane: "p3", terminal: "t3", tab: "b", title: "me@mac: ~/project", cwd: "/home/me/project", program: { name: "zsh", key: "shell", shell: true }, status: null };
const review = { pane: "p4", terminal: null, mod: "review-pane", tab: "b", title: "review-pane", cwd: null };
const tab = { id: "b", name: "Release", named: true };
let tabList = [tab];
let terms = [{ address: "t2", state: "live", status: "working", program, labels: {} }, { address: "t3", state: "live", status: null, program: shell.program, labels: {} }], agentList = [];
const sharedValues = {}, reads = { terminals: 0, spaces: 0, agents: 0 };
const lists = {
  terminals: () => { reads.terminals++; return [...terms]; },
  spaces: () => { reads.spaces++; return [{ id: "s1", name: "project", tabs: tabList }]; },
  agents: () => { reads.agents++; return agentList; },
};
const context = vm.createContext({ ...lists, shared: (k) => sharedValues[k] ?? null });
vm.runInContext(strip(fs.readFileSync(path.join(__dirname, "name.js"), "utf8")) + "\nglobalThis.name = { namer, programOf, modStatus };", context);
const { namer, programOf, modStatus } = context.name;
const named = (x = pane) => namer()(x);

// A caller that has read the lists for its own draw hands them in: each read copies every terminal, space or agent, and a
// pane header, a tab bar and both sidebars each name what they draw.
{
  const held = { terminals: lists.terminals(), spaces: lists.spaces(), agents: lists.agents() };
  reads.terminals = reads.spaces = reads.agents = 0;
  assert.equal(namer(held)(pane), "Release");
  assert.deepEqual(reads, { terminals: 0, spaces: 0, agents: 0 }, "handed the draw's lists, it reads none again");
  assert.equal(namer({ terminals: held.terminals })(pane), "Release");
  assert.deepEqual(reads, { terminals: 0, spaces: 1, agents: 1 }, "it reads only what it wasn't handed");
  reads.terminals = reads.spaces = reads.agents = 0;
  assert.equal(namer()(pane), "Release");
  assert.deepEqual(reads, { terminals: 1, spaces: 1, agents: 1 }, "handed nothing, it reads each once");
}

// Pi's session, else (agents only) a named tab, else a telling title, else the program.
// When alone in a named tab, the tab's name beats a telling title.
pane.title = "✳ Review PR";
agentList = [{ address: "t2", tab: "b" }];
assert.equal(named(), "Release", "lone top-level agent in a named tab keeps the tab name over a telling title");
terms[0].labels["pi.session"] = "Fix login";
assert.equal(named(), "Fix login");
delete terms[0].labels["pi.session"];

// Split tab with two top-level agents: telling titles beat the tab name so each shows its own,
// while unnamed agents (such as Pi without a session) fall back to the named tab.
{
  const claude = { name: "Claude Code", key: "claude", agent: true };
  const opencode = { name: "OpenCode", key: "opencode", agent: true };
  const piA = { pane: "p2", terminal: "t2", tab: "b", title: "π - project", cwd: "/home/me/project", program, status: "working" };
  const piB = { pane: "p5", terminal: "t5", tab: "b", title: "pi", cwd: "/home/me/project", program, status: "idle" };
  terms.push({ address: "t5", state: "live", status: "idle", program, labels: {} });
  agentList = [{ address: "t2", tab: "b" }, { address: "t5", tab: "b" }];
  assert.equal(named(piA), "Release", "first unnamed Pi in a split named tab keeps the tab name");
  assert.equal(named(piB), "Release", "second unnamed Pi in a split named tab keeps the tab name");

  // Two agents with telling titles each keep their own title instead of sharing the tab name.
  const tellingA = { ...piA, program: claude, title: "✳ Fix auth" };
  const tellingB = { ...piB, program: opencode, title: "OC | Review PR" };
  assert.equal(named(tellingA), "Fix auth", "telling title beats tab name in a shared tab");
  assert.equal(named(tellingB), "Review PR", "second telling title keeps its own name in a shared tab");

  // One telling title and one untitled: the telling one uses its title, the untitled falls back to the tab name.
  assert.equal(named(tellingA), "Fix auth");
  assert.equal(named(piB), "Release", "untitled peer still falls back to the named tab");

  // A Pi with pi.session in a split tab still prioritizes its session name.
  terms[0].labels["pi.session"] = "Fix login";
  assert.equal(named(piA), "Fix login", "pi.session still wins in a split tab");
  assert.equal(named(piB), "Release", "peer without session still falls back to the named tab");
  delete terms[0].labels["pi.session"];

  // A sub-agent beside its parent leaves the tab name to the parent and never inherits it.
  terms.at(-1).parent = "t2";
  assert.equal(named(tellingA), "Release", "parent stays lone top-level agent so tab name beats its telling title");
  assert.equal(named(piB), "Pi", "same-tab sub-agent never inherits its tab's name");

  // A sub-agent in its own separate named tab still never inherits the tab name.
  const kidTab = { id: "b2", name: "Worker tab", named: true };
  tabList = [tab, kidTab];
  agentList = [{ address: "t2", tab: "b" }, { address: "t5", tab: "b2" }];
  assert.equal(named({ ...piB, tab: "b2" }), "Pi", "separate-tab sub-agent never inherits its tab's name");
  assert.equal(named({ ...tellingB, tab: "b2" }), "Review PR", "separate-tab sub-agent uses its telling title");
  tabList = [tab];

  // An agent spawned from a live non-agent shell counts as a top-level agent.
  terms[0].parent = "t3";
  terms.pop();
  agentList = [{ address: "t2", tab: "b" }];
  assert.equal(named(tellingA), "Release", "shell-spawned agent alone in a named tab is top-level");
  delete terms[0].parent;

  // Grandchild agent whose root exited but whose middle pane-less parent is a live sub-agent stays a sub-agent.
  terms.push(
    { address: "t0", state: "exited", status: "idle", program, labels: {} },
    { address: "t1", parent: "t0", state: "live", status: "working", program, labels: {} },
    { address: "t6", parent: "t1", state: "live", status: "idle", program, labels: {} },
  );
  const grand = { pane: "p6", terminal: "t6", tab: "b2", title: "pi", cwd: "/home/me/project", program, status: "idle" };
  tabList = [tab, kidTab];
  agentList = [{ address: "t6", tab: "b2" }];
  assert.equal(named(grand), "Pi", "grandchild under a live pane-less sub-agent never inherits tab name");
  terms.splice(terms.length - 3, 3);
  tabList = [tab];

  // Parent cycle between non-agent shells terminates cleanly and treats the agent as top-level.
  terms.push({ address: "s-loop", parent: "t3", state: "live", status: null, program: shell.program, labels: {} });
  terms[1].parent = "s-loop";
  terms[0].parent = "s-loop";
  agentList = [{ address: "t2", tab: "b" }];
  assert.equal(named(tellingA), "Release", "cycle in non-agent parents does not loop or mark agent as sub-agent");
  delete terms[0].parent; delete terms[1].parent; terms.pop();
  agentList = [];
}
pane.title = "pi";

tab.named = false; pane.title = "π - Review PR - project";
assert.equal(named(), "Review PR");
pane.title = "π - project";
assert.equal(named(), "Pi", "Pi's unnamed title is only its folder, which the space already says");
pane.title = "⠋ project";
assert.equal(named(), "Pi", "nor Codex's: its spinner and project");
pane.title = "OC | Review PR";
assert.equal(named(), "OC | Review PR", "an agent's marks come off only its own titles");
pane.program = { name: "OpenCode", key: "opencode", agent: true };
assert.equal(named(), "Review PR");
pane.program = program;
pane.title = "✳ Review PR";
assert.equal(named(), "Review PR");
pane.title = "pi";
assert.equal(named(), "Pi");
terms[0].labels["pi.session"] = "Fix login"; pane.title = "π - Fix login - project";
pane.program = { name: "Git Changes", key: "lazygit", agent: false };
assert.equal(named(), "Git Changes", "lazygit after Pi in the same shell: Pi's session and title are left behind");
pane.program = program; delete terms[0].labels["pi.session"];

// A shell: its prompt's title and its own address tell nothing.
tab.named = true;
assert.equal(named(shell), "zsh");
shell.title = "t3";
assert.equal(named(shell), "zsh");

// A mod pane: the title, icon and status its mod gives for its tab; another tab's isn't its own.
assert.equal(named(review), "review-pane");
sharedValues["review-pane.titles"] = { a: "review · other", b: "review · fix" };
assert.equal(named(review), "review · fix");
assert.equal(programOf(review), null);
sharedValues["review-pane.program"] = { icon: "mods/review-pane/logo.svg", tint: false };
assert.equal(programOf(review).icon, "mods/review-pane/logo.svg");
assert.equal(programOf(pane), program);
sharedValues["review-pane.status"] = { a: "working" };
assert.equal(modStatus(review), null);
sharedValues["review-pane.status"] = { b: "blocked" };
assert.equal(modStatus(review), "blocked");

console.log("ok: one name for a terminal everywhere, from the lists its caller already read.");
