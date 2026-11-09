const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// rows.js runs as is; main.js runs on inert elements, to reach every render path with a review in hand.
// Follow a pane's imports once, before what needs them; rows, daemon and tips are supplied by its fake env.
function source(file, seen = new Set(file === "main.js" ? ["rows.js", "daemon.js", "tip.js"] : [])) {
  if (seen.has(file)) return "";
  seen.add(file);
  const src = fs.readFileSync(path.join(__dirname, file), "utf8");
  const needs = [...src.matchAll(/^import [^;]*? from "\.\/(.+?)";/gm)].map(m => source(m[1], seen)).join("\n");
  return needs + "\n" + src;
}

const load = (file, env) => {
  const src = source(file)
    .replace(/^import [^;]*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class").replace(/^export /gm, "");
  const context = vm.createContext(env);
  vm.runInContext(src, context, { filename: file });
  return context;
};
// Values made in another realm compare unequal to this one's: compare them as JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));
const rows = load("rows.js", {});
const { pairRows, buildItems, noteHeight, pageLabel, groupFiles, contentWidth, fileRows, codeInset, noteWidth, clipRows, rowsToAsk, LOOKAHEAD } = vm.runInContext("({ pairRows, buildItems, noteHeight, pageLabel, groupFiles, contentWidth, fileRows, codeInset, noteWidth, clipRows, rowsToAsk, LOOKAHEAD })", rows);

const row = (kind, old, next) => ({ kind, old, new: next, tokens: [[`${kind}${old ?? ""}:${next ?? ""}`]] });
// A run of deletions faces the additions after it; context faces itself.
const pairs = pairRows([row(" ", 1, 1), row("-", 2), row("-", 3), row("+", undefined, 2), row(" ", 4, 3), row("+", undefined, 4)]);
assert.deepEqual(plain(pairs.map(p => [p.left?.old ?? null, p.right?.new ?? null])), [[1, 1], [2, 2], [3, null], [4, 3], [null, 4]]);

const file = (p, extra = {}) => ({ path: p, sha: p, status: "modified", additions: 1, deletions: 1, isBinary: false, reviewed: false, changed: false, noisy: false, test: false, hunks: [{ header: "@@ -1,2 +1,2 @@", rows: [row(" ", 1, 1), row("-", 2), row("+", undefined, 2)] }], ...extra });
const review = {
  title: "t", base: { ref: "origin/main" }, head: { sha: "h" }, commits: [{ sha: "c1", subject: "one" }, { sha: "c2", subject: "two" }], source: "llm",
  files: [file("a.ts"), file("b.png", { isBinary: true, hunks: [] }), file("c.ts")],
  groups: [{ key: "g", label: "G", summary: "**why**", category: "core", critical: true, missing: ["gone.ts"], files: ["a.ts", "b.png"],
    notes: { "a.ts": [{ text: "whole file", critical: false }, { text: "on the new line 2", critical: true, anchor: { side: "additions", line: 2 } }] },
    children: [{ key: "k", label: "K", category: "tests", critical: false, missing: [], files: ["c.ts"], notes: {}, children: [] }] }],
  analysis: { state: "current", model: "pi/m", agent: true },
};
const kinds = (items) => plain(items).map(item => item.key.split(":")[0] + (item.kind === "note" ? `(${item.note.text})` : item.lines ? item.lines.length : ""));
const opts = { collapsed: new Set(), full: new Map(), split: false, width: 900 };
// Unanchored notes under the header, an anchored one under its line, children after their header.
assert.deepEqual(kinds(buildItems(review, review.groups[0], opts)), ["f", "n(whole file)", "h", "r3", "n(on the new line 2)", "f", "e", "g", "f", "h", "r3"]);
assert.deepEqual(plain(groupFiles(review.groups[0])), ["a.ts", "b.png", "c.ts"]);
// Collapsed files show only their header; a whole file replaces the hunks; split pairs the rows.
assert.deepEqual(kinds(buildItems(review, review.groups[0], { ...opts, collapsed: new Set(["a.ts", "c.ts"]) })), ["f", "f", "e", "g", "f"]);
assert.deepEqual(kinds(buildItems(review, review.groups[0], { ...opts, full: new Map([["a.ts", { rows: [row(" ", 1, 1), row("+", undefined, 2)] }]]), collapsed: new Set(["c.ts"]) })), ["f", "n(whole file)", "r2", "n(on the new line 2)", "f", "e", "g", "f"]);
// Rows that stop short of the file's end, past the bytes a read carries, say so after them: a whole file or a diff.
const cut = (items) => plain(items).filter(i => i.key.endsWith(":cut")).map(i => i.key);
assert.deepEqual(cut(buildItems(review, review.groups[0], { ...opts, full: new Map([["a.ts", { rows: [row("+", undefined, 1)], truncated: true }]]) })), ["e:a.ts:cut"]);
assert.deepEqual(cut(buildItems({ ...review, files: review.files.map(f => f.path === "c.ts" ? { ...f, clipped: true } : f) }, review.groups[0], opts)), ["e:c.ts:cut"]);
assert.deepEqual(cut(buildItems(review, review.groups[0], opts)), []);
assert.deepEqual(kinds(buildItems(review, review.groups[0], { ...opts, split: true, collapsed: new Set(["c.ts"]) })), ["f", "n(whole file)", "h", "r2", "n(on the new line 2)", "f", "e", "g", "f"]);
// Code lines go in runs of up to 32, a line's note ending one: a few thousand changed lines stay far under v_virtual_list's 10000 items.
const lines = (n) => Array.from({ length: n }, (_, i) => row("+", undefined, i + 1));
const one = (n, notes = {}) => buildItems({ ...review, files: [file("x.ts", { hunks: [{ header: "@@", rows: lines(n) }] })] }, { key: "x", files: ["x.ts"], notes, children: [] }, opts);
assert.deepEqual(kinds(one(70, { "x.ts": [{ text: "here", critical: false, anchor: { side: "additions", line: 40 } }] })), ["f", "h", "r32", "r8", "n(here)", "r30"]);
// A line's notes come by its side and number, in the file's order: a split pair holds both sides', a context line only the additions'.
const at = (side, line, text) => ({ text, critical: false, anchor: { side, line } });
const both = { key: "g", files: ["a.ts"], children: [], notes: { "a.ts": [at("additions", 2, "new 2"), at("deletions", 2, "old 2"), at("deletions", 1, "old 1"), at("additions", 2, "new 2 again")] } };
assert.deepEqual(kinds(buildItems(review, both, { ...opts, split: true })), ["f", "h", "r2", "n(new 2)", "n(old 2)", "n(new 2 again)"]);
assert.deepEqual(kinds(buildItems(review, both, opts)), ["f", "h", "r2", "n(old 2)", "r1", "n(new 2)", "n(new 2 again)"]);
{
  // A batch's rows, a page more, a fold, a whole file or a note rebuild only that file's items: kept from the last build in
  // `parts`, the others are the same objects. A group of a thousand files was rebuilt whole on every one.
  const files = [file("a.ts"), file("c.ts")], r = { ...review, files }, g = { key: "g", files: ["a.ts", "c.ts"], notes: {}, children: [] };
  const o = { ...opts, collapsed: new Set(), full: new Map(), parts: new Map() }, body = (list, path) => list.filter(i => i.path === path && i.kind !== "file");
  const kept = (before, after, path) => body(before, path).length > 0 && body(before, path).every((item, i) => item === body(after, path)[i]);
  const steps = [
    ["rows", "c.ts", () => { files[1].hunks = structuredClone(files[1].hunks); }],
    ["a page", "c.ts", () => { files[1].hunks.push({ rows: [row("+", undefined, 3)] }); }],
    ["a page of the last hunk", "c.ts", () => { const h = files[1].hunks.at(-1); h.rows = h.rows.concat([row("+", undefined, 4)]); }],
    ["cut short", "c.ts", () => { files[1].clipped = true; }],
    ["a note", "a.ts", () => { g.notes = { "a.ts": [{ text: "new", critical: false }] }; }],
    ["a whole file", "a.ts", () => { o.full.set("a.ts", { rows: [row(" ", 1, 1)] }); }],
    ["a fold", "c.ts", () => { o.collapsed.add("c.ts"); }],
  ];
  let last = buildItems(r, g, o), unfolded = last;
  for (const [what, path, change] of steps) {
    change();
    const next = buildItems(r, g, o), other = path === "a.ts" ? "c.ts" : "a.ts";
    assert.ok(kept(last, next, other), `${what}: the other file kept`);
    assert.ok(!kept(last, next, path), `${what}: its file rebuilt`);
    assert.deepEqual(plain(next), plain(buildItems(r, g, { ...o, parts: new Map() })), `${what}: as built afresh`);
    if (!o.collapsed.size) unfolded = next;
    last = next;
  }
  // Opened again, a folded file's items are the ones it had.
  o.collapsed.delete("c.ts");
  last = buildItems(r, g, o);
  assert.ok(kept(unfolded, last, "c.ts"), "opened again, kept");
  // A read that brings the same rows in new file objects keeps them, with the header on the new file.
  r.files = files.map(f => ({ ...f }));
  const reread = buildItems(r, g, o);
  assert.ok(kept(last, reread, "c.ts") && reread.find(i => i.key === "f:c.ts").file === r.files[1]);
}
const big = plain(one(20000));
assert.ok(big.length < 1000 && big.filter(item => item.lines).every(item => item.size === item.lines.length * 20));
assert.equal(big.reduce((n, item) => n + (item.lines?.length ?? 0), 0), 20000);
assert.ok(noteHeight("测".repeat(200), 900, true) > noteHeight("a".repeat(200), 900, true));
// A line's note is a card at most 800 wide, so it wraps sooner than a file's own note across a wide view.
assert.ok(noteHeight("a".repeat(400), 2000, true) > noteHeight("a".repeat(400), 2000, false));
// The file tree's two layouts, as the app's fileRows: a list of paths, or a tree whose single-child folder chains are one row.
const tree = plain(fileRows(["packages/cli/src/a.ts", "packages/cli/src/daemon/b.ts", "README.md"], ["gone/c.ts"], "tree"));
assert.deepEqual(tree.map(r => `${"  ".repeat(r.depth)}${r.type}:${r.name}`), ["folder:packages/cli/src", "  file:a.ts", "  folder:daemon", "    file:b.ts", "file:README.md", "folder:gone", "  missing:c.ts"]);
assert.deepEqual(tree[0].paths, ["packages/cli/src/a.ts", "packages/cli/src/daemon/b.ts"]);
assert.deepEqual(plain(fileRows(["x/a.ts"], [], "list")), [{ key: "file:x/a.ts", depth: 0, type: "file", name: "x/a.ts", path: "x/a.ts" }]);
// The code widens to its longest line (CJK counts double), unified rows or one split side.
const long = (text) => ({ kind: "row", lines: [{ kind: "+", tokens: [[text]] }] });
assert.equal(contentWidth([long("a".repeat(100))]), Math.ceil(92 + 100 * 7.25 + 16));
assert.equal(contentWidth([long("测".repeat(50))]), contentWidth([long("a".repeat(100))]));
const sides = [{ kind: "pair", lines: [{ left: { tokens: [["a".repeat(10)]] }, right: { tokens: [["a".repeat(100)]] } }, { left: { tokens: [["a"]] } }] }];
assert.deepEqual([contentWidth(sides, "left"), contentWidth(sides, "right"), contentWidth(sides)], [Math.ceil(52 + 10 * 7.25 + 16), Math.ceil(52 + 100 * 7.25 + 16), 108]);
// As wide as a cut line draws: its 1000 characters run to 2000 columns of CJK, or 4000 of tabs.
assert.equal(contentWidth([{ kind: "row", lines: clipRows([{ kind: "+", tokens: [["测".repeat(5000)]] }]) }]), Math.ceil(92 + 2000 * 7.25 + 16));
assert.equal(contentWidth([{ kind: "row", lines: clipRows([{ kind: "+", tokens: [["\t".repeat(5000)]] }]) }]), Math.ceil(92 + 4000 * 7.25 + 16));
// A row is measured once: the list is rebuilt, and measured again, on every batch of rows that arrives.
{
  let reads = 0;
  const measured = { kind: "+", get tokens() { reads++; return [["a".repeat(10)]]; } };
  const list = [{ kind: "row", lines: [measured] }];
  contentWidth(list); contentWidth(list);
  assert.equal(reads, 1);
}
// A log or minified line runs to megabytes, which Herdr's engine can't measure in time: rows are cut at 1000 columns on arrival.
const huge = [{ kind: "+", new: 1, tokens: [["{", "#fff"], ["x".repeat(100000), "#0f0"], ["}", "#fff"]] }];
clipRows(huge);
assert.deepEqual(plain(huge[0].tokens.map(([text, color]) => [text.length, color])), [[1, "#fff"], [999, "#0f0"]]);
assert.equal(contentWidth([{ kind: "row", lines: huge }]), contentWidth([long("a".repeat(1000))]));
// A big group's rows run past the 8 MB a read carries: a read asks for the files in view and the 10 after them that have
// none and aren't folded, while they fit in 3000 changed lines, the first one always.
const many = Array.from({ length: 40 }, (_, i) => ({ path: `f${i}`, sha: `s${i}`, additions: 500, deletions: 0 }));
const fileAt = (p) => many.find(f => f.path === p), paths = many.map(f => f.path);
assert.deepEqual(plain(rowsToAsk(paths, fileAt, new Set(), new Set())), ["f0", "f1", "f2", "f3", "f4", "f5"]);
many[0].hunks = []; many[1].hunks = [];
many[22].hunks = [];
assert.deepEqual(plain(rowsToAsk(paths, fileAt, new Set(["f20", "f21"]), new Set(["f24"]))), ["f20", "f21", "f23", "f25", "f26", "f27"]);
assert.deepEqual(plain(rowsToAsk(paths, fileAt, new Set(["f38"]), new Set())), ["f38", "f39"]);
many[30].additions = 9000;
assert.deepEqual(plain(rowsToAsk(paths, fileAt, new Set(["f30"]), new Set())), ["f30"]);
// Split, an added file isn't paired: its rows are "solo", the whole width, measured on their own.
const added = { ...review, files: [file("n.ts", { status: "added", hunks: [{ header: null, rows: [row("+", undefined, 1), row("+", undefined, 2)] }] })] };
const soloItems = plain(buildItems(added, { key: "n", files: ["n.ts"], notes: {}, children: [] }, { ...opts, split: true }));
assert.deepEqual(soloItems.map(item => [item.kind, item.lines?.length ?? 0]), [["file", 0], ["solo", 2]]);
assert.equal(contentWidth([{ kind: "solo", lines: [{ tokens: [["a".repeat(100)]] }] }, ...sides], "solo"), Math.ceil(52 + 100 * 7.25 + 16));
assert.equal(pageLabel("/branch/fix%2Fa", review), "fix/a vs origin/main");
assert.equal(pageLabel("/worktree", review), "Uncommitted changes");
// A range against its upstream reads as the commits flow, to push or to pull; else a branch against what it's compared to.
assert.equal(pageLabel("/compare/origin/fix...fix", review), "fix → origin/fix");
assert.equal(pageLabel("/compare/fix...origin/fix", review), "origin/fix → fix");
assert.equal(pageLabel("/compare/origin/main...other", review), "other vs origin/main");

// main.js: every state's render and every item kind, without a window.
// Elements record their ids and handlers (`id.on_name`), so a test can press one and see what the next render draws.
// They keep their words and styles too.
const drawn = new Set(), handlers = new Map(), texts = new Map(), styles = {};
const element = (named = null) => {
  let id = named;
  const el = new Proxy(function () {}, { get: (_t, key) => key === "when" ? function (c, f) { if (c) f(this); return this; }
    : key === "id" ? (v) => { id = v; drawn.add(v); return el; }
    : typeof key === "string" && key.startsWith("on_") ? (...args) => { handlers.set(`${id}.${key}`, args.at(-1)); return el; }
    : key === "child" ? function (v) { if (typeof v === "string" && id) texts.set(id, v); return this; }
    : function (...args) { if (id) (styles[id] ??= {})[key] = args[0] ?? true; return this; } });
  return el;
};
const press = (id) => { handlers.get(`${id}.on_click`)({}, cx); drawn.clear(); pane.render(cx); };
const store = new Map(), sharedStore = new Map();
const pref = (key) => sharedStore.get("review.prefs")?.[key], setPref = (key, value) => sharedStore.set("review.prefs", { ...sharedStore.get("review.prefs"), [key]: value });
let shownTab = "b", windowActive = true;
const calls = [], bodies = [], routes = [], puts = [], browsed = [], notes = [];
let daemonSettings = { locale: "zh-CN", llm: { provider: "local-agent", agent: "pi", agentModel: "my/model" } };
// A save reads the daemon's settings, then writes them back.
const put = async () => { await new Promise(setImmediate); return puts.at(-1); };
// A text field's state: its value, and its submit and blur handlers.
// Where the keyboard was last sent: the model field or the pane.
let keyboard = null;
const field = { text: "", events: {}, value() { return this.text; }, set_value(v) { this.text = v; }, on(event, h) { this.events[event] = h; return true; }, focus() { keyboard = "field"; } };
const commitField = { ...field, events: {}, focus() { keyboard = "commits"; } };
const env = {
  View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element, h_resizable: element, resizable_panel: element, Scrollbar: { vertical: element },
  Switch: { new: element }, settings: () => ({ zoom: 1 }),
  // tip.js's own; its watch on the pointer is checked in t3-spaces/check-sidebar.cjs.
  hoverKept: (view, key, id, el) => el.on_hover((on) => { if (on) view[key] = id; else if (view[key] === id) view[key] = null; }),
  // Paths build into nothing here; painting one is an element like any other.
  PathBuilder: (() => { const chain = new Proxy({}, { get: () => () => chain }); return { stroke: () => chain, fill: () => chain }; })(),
  window: { paint_path: () => element() }, appWindow: () => ({ platform: "macos", active: windowActive }), exec: (...args) => { browsed.push(args); return Promise.resolve({ code: 0 }); }, Input: { new: () => element() }, InputState: { new: (options) => options.placeholder === "Search commits" ? commitField : field },
  v_virtual_list: (_id, count, sizes, _key, render) => { assert.equal(sizes.length, count); render({ start: 0, end: count }).forEach(Boolean); return element(); },
  VirtualListScrollHandle: { new: () => ({ scroll_to_item: (i) => calls.push(["scroll", i]) }) },
  TextView: { markdown: element },
  panes: () => [{ pane: "p9", mod: "review", tab: "b", zoomed: false }], focused: () => ({ tab: "b" }),
  spaces: () => [{ active: true, tabs: [{ id: shownTab, active: true }] }],
  props: () => ({ root: "/repo", page: "/branch/fix", n: 1 }),
  // Shared values every mod sees.
  shared: (key) => sharedStore.get(key) ?? null, setShared: (key, value) => sharedStore.set(key, value),
  run: (name, args) => calls.push([name, args]), notify: (n) => notes.push(n), theme: () => ({ foreground: "#eeeeee", ansi1: "#ff0000", ansi2: "#00ff00", dim: "#888888" }),
  watchFolder: () => new Promise(() => {}), FILE: 32, ROW: 20, groupFiles, buildItems, pageLabel, contentWidth, fileRows, codeInset, noteWidth, clipRows, rowsToAsk, LOOKAHEAD,
  // The daemon: rows only for the files asked for, and the first group's with `firstRows`; no run going. A later batch's
  // rows come on their own.
  review: async (_root, route, body) => {
    routes.push(route);
    if (route === "/api/review") bodies.push(body);
    if (route === "/api/review/status") return { running: false };
    if (route === "/api/review/rows") return { files: review.files.filter(f => body.files.includes(f.path)).map(({ path, sha, hunks }) => ({ path, sha, hunks })) };
    const wanted = [...body.rows ?? [], ...body.firstRows ? groupFiles(review.groups[0]) : []];
    return route !== "/api/review" ? {} : { ...review, files: review.files.map(({ hunks, ...f }) => wanted.includes(f.path) ? { ...f, hunks } : { ...f }) };
  },
  // Two agents, one with a catalog; the settings pick pi with a model of its own. A PUT replaces them all, as the daemon's.
  request: async (_root, method, path, body) => {
    if (method === "PUT") { puts.push(body); daemonSettings = body; return body; }
    return path === "/api/agents"
      ? [{ name: "claude", label: "Claude Code", version: "1", models: [{ id: "sonnet", name: "Sonnet" }] }, { name: "pi", label: "Pi", version: "2", models: [] }]
      : daemonSettings;
  },
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
};
const mainScope = load("main.js", env), pane = new mainScope.Mod();
// Every icon the pane names is on disk: a missing svg draws nothing, and its button shows blank.
const mainSource = source("main.js");
const icons = [
  ...[...mainSource.matchAll(/mods\/\$\{PANE\}\/([a-z/-]+)\.svg/g)].map(m => m[1]),
  ...[...mainSource.matchAll(/\$\{LU\}\/([a-z0-9-]+)\.svg/g)].map(m => `icons/${m[1]}`),
  ...Object.values(vm.runInContext("CATEGORY", mainScope)).map(([icon]) => `icons/${icon}`),
  ...vm.runInContext("FILE_ICONS", mainScope).map(([, name]) => `icons/cat/${name}`),
  ...Object.values(vm.runInContext("FOLDER_ICONS", mainScope)).map(name => `icons/cat/${name}`),
  "icons/cat/file", "icons/cat/folder", "icons/chevron-up", "icons/chevron-down", "icons/chevron-right",
  ...vm.runInContext("FOLDS", mainScope).map(({ icon }) => `icons/${icon}`),
];
for (const icon of icons) assert.ok(fs.existsSync(path.join(__dirname, `${icon}.svg`)), `icon on disk: ${icon}`);
// File and folder icons by @antfu/design's rules, first match winning as there; a folder chain by its last name.
assert.deepEqual(["a/b.vue", "x.test.ts", "package.json", "Makefile"].map(path => vm.runInContext(`fileIcon(${JSON.stringify(path)})`, mainScope)), ["vue", "typescript", "json", "file"]);
assert.deepEqual(["packages/cli/src", "docs"].map(name => vm.runInContext(`folderIcon(${JSON.stringify(name)})`, mainScope)), ["folder-src", "folder"]);
// A category icon is grey until lit, as the app's saturate-0: its hue's luminance.
assert.equal(vm.runInContext('grey("#ff0000")', mainScope), "#363636");
// A run's progress names the files it reads, not their paths.
assert.equal(vm.runInContext('progressText({ kind: "reading", paths: [".git/x/agent/1/a.ts", "b.ts", "c"] })', mainScope), "Reading 3 files: a.ts, …");
assert.equal(vm.runInContext('progressText({ kind: "thinking", step: 2 })', mainScope), "Thinking… (step 2)");
{
  // A line of more colored runs than an element budget still draws every character: past it, the rest is one plain run.
  const said = [], plainDiv = mainScope.div;
  const recorder = () => { const el = new Proxy(function () {}, { get: (_t, key) => key === "child" ? (v) => { if (typeof v === "string") said.push(v); return el; } : key === "when" ? (c, f) => (c && f(el), el) : () => el }); return el; };
  mainScope.div = recorder;
  const dense = [...Array.from({ length: 450 }, (_, i) => [String(i % 10), i % 2 ? "#ff0000" : "#00ff00"]), ["END", "#ff0000"]];
  vm.runInContext("drawCode", mainScope)({ foreground: "#eeeeee", dim: "#888888", canvas: "#000000" }, { kind: " ", old: 1, new: 1, tokens: dense }, [1]);
  mainScope.div = plainDiv;
  const code = said.slice(2);
  assert.equal(code.join(""), dense.map(([text]) => text).join(""));
  assert.ok(code.length <= vm.runInContext("SPANS", mainScope), `${code.length} code elements`);
  // Next runs of one color are one element; a run's trailing spaces lead the next.
  assert.deepEqual(plain(vm.runInContext("spans", mainScope)([["a", "#f00"], ["b ", "#f00"], ["c", "#f00"], [" ", "#0f0"], ["d", "#0f0"]])), [["ab c", "#f00"], [" d", "#0f0"]]);
}
// The 150ms timer is the scroll spy; the others, by period, each pane's in the order they started. A test runs them by hand.
let spy; const every = {};
const cx = { spawn: (f) => f(cx), notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() { keyboard = "pane"; } }), timer: { every: (ms, f) => { if (ms === 150) spy = f; (every[ms] ??= []).push(f); }, after: (ms, f) => ms === 0 ? queueMicrotask(() => f(cx)) : timers.push(f) } };
// Timers wait until a test runs them.
const timers = [], tick = () => timers.splice(0).forEach(f => f(cx));
(async () => {
  {
    // A menu creates the pane before closing itself. I/O started in that init belongs to the menu and loses its answer;
    // the pane's callbacks run in its own context after the menu closes.
    let inMenu = true;
    const pending = [], own = new Map();
    const ownCx = { ...cx, spawn: f => f(ownCx), timer: { every() {}, after: (ms, f) => pending.push([ms, f]) } };
    const scope = load("main.js", { ...env,
      localStorage: { getItem: k => own.get(k) ?? null, setItem: (k, v) => own.set(k, v) },
      review: () => inMenu ? new Promise(() => {}) : Promise.resolve(structuredClone(review)),
    });
    const opened = new scope.Mod();
    opened.init({}, ownCx);
    inMenu = false;
    for (const [ms, f] of pending.splice(0)) if (ms === 0) f(ownCx);
    await new Promise(setImmediate);
    assert.ok(opened.review && !opened.loading && !opened.error, "closing the menu must leave its new review loaded");
  }
  pane.init({}, cx);
  // Later panes bind the same stand-in.
  const commitEvents = { ...commitField.events };
  // As the app, which never starts an AI run by itself: analyzing on a count's click is off until turned on.
  assert.ok(!pref("autoAnalyze"));
  // A pane wide enough for the sidebar, and a diff for split, as the pane measures them.
  pane.width = 1200; pane.view = 1000;
  await new Promise(setImmediate);
  // The first read knows no group yet: it asks for the first group's rows, so drawing that group needs no second read.
  assert.deepEqual(plain(bodies.map(b => [b.rows, b.firstRows])), [[[], true]]);
  pane.render(cx);
  await new Promise(setImmediate);
  pane.render(cx);
  assert.equal(bodies.length, 1);
  assert.ok(pane.review.files.every(f => f.hunks));
  // Its pane header, and a tab of its own, say what it reviews.
  assert.deepEqual(plain(sharedStore.get("review.titles")), { b: "fix vs origin/main" });
  assert.equal(sharedStore.get("review.program").inbox, true, "asks for its card in t3-inbox: a pane that loses nothing when it closes");
  assert.equal(sharedStore.get("review.program").name, "Review");
  // The Review bar reads which repository it shows from here; no change, no write: every write redraws every mod.
  assert.equal(sharedStore.get("review.shown").b.root, "/repo");
  const published = sharedStore.get("review.shown"); pane.render(cx);
  assert.equal(sharedStore.get("review.shown"), published);
  // Polling a run asks for no rows and keeps the ones it has.
  pane.load(cx, true);
  await new Promise(setImmediate);
  assert.deepEqual(plain(bodies.at(-1).rows), []);
  assert.ok(pane.review.files.every(f => f.hunks));
  // The pane never zooms itself.
  assert.equal(calls.filter(([name]) => name === "pane.zoom").length, 0);
  for (const state of ["running", "outdated", "none"]) { pane.review.analysis = { state, agent: state !== "none", progress: { kind: "reading", paths: ["a", "b", "c"] } }; pane.version++; pane.render(cx); }
  pane.analyzeError = "boom"; pane.render(cx);
  // As the app's DiffAnalyzeButton, the analysis's state is the button's; running or failed, it opens the status, which
  // shows the run's step or the failure, and once done a Re-run. No words of the analysis stand in the header.
  const analyzeButton = () => pane.head().buttons.find(b => b.id === "analyze");
  const states = [[{ state: "none", agent: false }, "Set up agent"], [{ state: "none", agent: true }, "Analyze with AI"], [{ state: "current", agent: true }, "Re-analyze"],
    [{ state: "outdated", agent: true }, "Re-analyze"], [{ state: "running", agent: true, progress: { kind: "thinking", step: 1 } }, "Analyzing…"], [{ state: "current", agent: true, error: "boom" }, "Analysis failed"]];
  pane.analyzeError = null;
  for (const [analysis, text] of states) { pane.review.analysis = analysis; assert.equal(analyzeButton().text, text); }
  // Running, the button has no spinner: the pane's header marks the review working.
  pane.review.analysis = states[4][0]; assert.equal(analyzeButton().lead, undefined);
  assert.equal(pane.head().parts.length, 3);
  pane.review.analysis = { state: "outdated", agent: true }; assert.equal(analyzeButton().note, "(outdated)");
  pane.review.analysis = { state: "running", agent: true, progress: { kind: "thinking", step: 1 } };
  pane.render(cx); pane.popupClosedAt = 0; press("analyze");
  assert.ok(drawn.has("review-status-panel") && !drawn.has("rerun"));
  pane.review.analysis = { state: "current", agent: true, error: "boom" }; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("review-status-panel") && drawn.has("rerun"));
  routes.length = 0; press("rerun");
  assert.ok(pane.popup !== "status" && routes.includes("/api/review/analyze"));
  await new Promise(setImmediate);
  // As the app, running from the click: the daemon answers before the run exists, and the read after it finds none.
  assert.equal(pane.review.analysis.state, "current");
  assert.equal(analyzeButton().text, "Analyzing…");
  // A run seen ends the wait; no run within it, the button says what the daemon does again.
  pane.apply({ ...pane.review, analysis: { state: "running", agent: true } });
  assert.equal(pane.startingUntil, 0);
  pane.startingUntil = Date.now() + 1000; pane.review.analysis = { state: "current", agent: true };
  assert.equal(analyzeButton().text, "Analyzing…");
  pane.startingUntil = Date.now() - 1;
  assert.equal(analyzeButton().text, "Re-analyze");
  // A finished run has no status: the panel isn't shown, even left open.
  pane.popup = "status"; pane.review.analysis = { state: "current", agent: true }; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("review-status-panel"));
  // Nor does the next run bring it back, or take a press on "Analyzing…" to close it unseen.
  pane.review.analysis = { state: "running", agent: true }; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("review-status-panel"), "not unasked");
  pane.popupClosedAt = 0; press("analyze");
  assert.ok(drawn.has("review-status-panel"), "the first press opens it");
  pane.key({ keystroke: "escape" }, cx);
  assert.ok(pane.popup !== "status");
  pane.review.analysis = { state: "current", agent: true }; pane.render(cx);
  // Its tab and pane header show the word an agent would: a run from the click, then how it ended until the tab is looked at.
  const word = () => sharedStore.get("review.status")?.b ?? null;
  const ended = (analysis) => { pane.review.analysis = { state: "running", agent: true }; pane.report(); pane.review.analysis = { agent: true, ...analysis }; pane.report(); };
  const finished = { state: "current" }, failed = { state: "current", error: "boom" };
  shownTab = "other"; pane.startingUntil = Date.now() + 1000; pane.review.analysis = { state: "current", agent: true }; pane.report();
  assert.equal(word(), "working", "from the click, before the run exists");
  sharedStore.delete("review.status"); pane.report();
  assert.equal(word(), "working", "the Review bar dropped it at its start: a run still going says so again");
  pane.startingUntil = Date.now() - 1; pane.report();
  assert.equal(word(), null, "a start that never came isn't a finished run");
  ended(finished);
  assert.equal(word(), "done");
  const written = sharedStore.get("review.status"); pane.report();
  assert.equal(sharedStore.get("review.status"), written, "no change, no write: every write redraws every mod");
  shownTab = "b"; pane.render(cx);
  assert.equal(word(), null, "looking at the tab reads it");
  shownTab = "other"; ended(failed);
  assert.equal(word(), "blocked");
  ended(finished);
  assert.equal(word(), "done", "the next run's end replaces it");
  shownTab = "b"; ended(failed);
  assert.equal(word(), null, "ended in view, there's no news");
  assert.equal(analyzeButton().text, "Analysis failed", "and the pane's button keeps the failure");
  windowActive = false; ended(finished);
  assert.equal(word(), "done", "the tab shown, the window behind: nobody saw it end");
  windowActive = true; pane.report();
  assert.equal(word(), null, "back at the window, it's read");
  // Tabs without a review pane drop out; a second pane's word stays, and writing yours doesn't reorder it into a loop.
  const onePane = mainScope.panes;
  mainScope.panes = () => [{ pane: "p9", mod: "review", tab: "b" }, { pane: "p8", mod: "review", tab: "c" }];
  sharedStore.set("review.status", { gone: "working", c: "working" }); pane.report();
  assert.deepEqual(plain(sharedStore.get("review.status")), { c: "working" });
  const kept = sharedStore.get("review.status"); pane.report();
  assert.equal(sharedStore.get("review.status"), kept);
  mainScope.panes = onePane; sharedStore.delete("review.status");
  pane.review.analysis = { state: "current", agent: true }; pane.report();
  // Wide, as the app at `lg`: the groups as tabs by default, and beside the diffs an aside with the files of the group at
  // the list's top; the group with subgroups heads the row. The settings choose the sidebar instead, kept.
  drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("group-tab-g") && !drawn.has("review-sidebar") && drawn.has("review-aside") && drawn.has("group-header"));
  assert.ok(drawn.has("tree-f-a.ts") && !drawn.has("tree-f-c.ts") && !drawn.has("aside-parent"));
  const subAt = pane.itemList.findIndex(item => item.key === "g:k");
  pane.visible = { start: subAt + 1, end: subAt + 3 }; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("tree-f-c.ts") && !drawn.has("tree-f-a.ts") && drawn.has("aside-parent"), "a subgroup scrolled to shows its files");
  pane.visible = null;
  pane.popupClosedAt = 0; press("settings");
  press("groups-sidebar");
  // The settings credit pulls.review and its author, and the fork and its author, each a link.
  assert.ok(["credit-upstream", "credit-antfu", "credit-fork", "credit-jinjie"].every(id => drawn.has(id)));
  press("credit-fork");
  assert.deepEqual(plain(browsed), [["open", ["https://github.com/JinJieBeWater/pulls.review"]]]);
  assert.equal(sharedStore.get("review.prefs").groupNav, "sidebar");
  press("open-tab");
  assert.equal(sharedStore.get("review.prefs").openIn, "tab");
  press("open-pane");
  assert.equal(sharedStore.get("review.prefs").openIn, "pane");
  pane.closePopup(cx); pane.popupClosedAt = 0; drawn.clear(); pane.render(cx);
  // The sidebar, as the app's: groups only; a group's row shows it; only a group with subgroups has a caret, which hides
  // and shows them.
  assert.ok(drawn.has("review-sidebar") && !drawn.has("group-tab-g") && drawn.has("review-aside") && !drawn.has("side-f-a.ts"));
  assert.ok(drawn.has("side-g-1-k") && drawn.has("side-fold-g"));
  assert.ok(!drawn.has("side-fold-k"), "a subgroup has no caret");
  press("side-fold-g");
  assert.ok(!drawn.has("side-g-1-k") && pane.groupKey === "g");
  press("side-fold-g");
  assert.ok(drawn.has("side-g-1-k"));
  // The scroll spy redraws once what the list shows moved, and not again until it moves.
  let notified = 0; const spyCx = { ...cx, notify: () => notified++ };
  spy(spyCx); notified = 0; spy(spyCx);
  assert.equal(notified, 0);
  pane.visible = { start: subAt + 1, end: subAt + 3 }; spy(spyCx); spy(spyCx);
  assert.equal(notified, 1);
  // Off screen, it doesn't measure.
  const spied = pane.spied; let measured = 0; pane.spied = () => { measured++; return spied.call(pane); };
  shownTab = "other"; spy(spyCx); shownTab = "b";
  assert.equal(measured, 0);
  spy(spyCx);
  assert.equal(measured, 1, "on screen again, it does");
  delete pane.spied;
  pane.visible = null;
  const children = pane.review.groups[0].children;
  pane.review.groups[0].children = []; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("side-fold-g"), "a group without subgroups has no caret");
  // A group without subgroups heads its aside, not the row.
  assert.ok(!drawn.has("group-header") && drawn.has("aside-header"));
  pane.review.groups[0].children = children; pane.render(cx);
  pane.groupKey = null; press("side-gb-1-k");
  assert.ok(pane.groupKey === "g", "showing a subgroup shows its group");
  // The settings set the files as a list or a tree, kept; the header holds no view toggles.
  assert.ok(!drawn.has("file-list") && !drawn.has("layout"));
  pane.popupClosedAt = 0; press("settings");
  press("files-list");
  assert.equal(pref("fileList"), "list");
  press("files-tree");
  assert.equal(pref("fileList"), "tree");
  pane.closePopup(cx); pane.popupClosedAt = 0;
  pane.select("c.ts", cx);
  assert.equal(pane.current, "c.ts");
  setPref("split", true); pane.render(cx);
  pane.key({ keystroke: "j" }, cx); pane.key({ keystroke: "k" }, cx);
  assert.equal(pane.current, "b.png");
  pane.key({ keystroke: "r" }, cx);
  assert.ok(pane.review.files[1].reviewed && pane.collapsed.has("b.png"));
  // Unmarked, it opens again, as the app's.
  pane.key({ keystroke: "r" }, cx);
  assert.ok(!pane.review.files[1].reviewed && !pane.collapsed.has("b.png"));
  pane.key({ keystroke: "r" }, cx);
  // A split side scrolls sideways under the pointer, as far as its longest line goes; the other side stays.
  pane.sideWidth = [0, 1500, 0];
  const wheel = (x, dx) => handlers.get("review-diff-area.on_scroll_wheel")({ delta: { x: dx, y: 0 }, local_position: { x, y: 0 } }, cx);
  wheel(700, -50);
  assert.deepEqual(plain(pane.shift), [0, 50, 0]);
  wheel(700, -5000); wheel(100, -50);
  assert.deepEqual(plain(pane.shift), [0, 1500 - pane.view / 2, 0]);
  wheel(700, 5000);
  assert.equal(pane.shift[1], 0);
  // A full-width added or removed file scrolls under either side, as far as its own longest line.
  pane.render(cx); pane.sideWidth = [0, 0, pane.view + 300];
  wheel(100, -500);
  assert.deepEqual(plain(pane.shift), [0, 0, 300]);
  // Only an overflowing side with rows in view draws its position bar, while it scrolls: as an overlay scrollbar.
  const barItems = (kinds) => { pane.itemList = kinds.map((kind, i) => ({ kind, key: `k${i}`, size: 20 })); pane.visible = { start: 0, end: kinds.length }; };
  const shownItems = pane.itemList, shownVisible = pane.visible;
  const hbars = () => plain(pane.hbars({ muted: "#000000" }).map(b => b.key ?? b.id));
  barItems(["solo"]);
  assert.equal(hbars().length, 1, "the full-width rows' alone");
  barItems(["pair"]);
  assert.deepEqual(hbars(), [], "none on screen: a far-off new file's long line says nothing here");
  pane.sideWidth = [pane.view, pane.view, pane.view + 300]; barItems(["pair"]);
  assert.equal(hbars().length, 2, "a side each, the far-off rows' left out");
  barItems(["pair", "solo"]);
  assert.equal(hbars().length, 3, "all in view: stacked");
  pane.sideWidth = [0, 0, pane.view + 300];
  pane.shift[2] = 0; timers.length = 0; const runs = pane.barsRun;
  wheel(100, -40);
  assert.ok(pane.barsOn && pane.barsRun === runs + 1, "on as it scrolls");
  assert.equal(timers.length, 1);
  wheel(100, -40);
  timers.shift()(cx);
  assert.ok(pane.barsOn, "a later scroll keeps them: the earlier timer is stale");
  timers.shift()(cx);
  assert.ok(!pane.barsOn, "off once it stops");
  pane.shift[2] = 300; wheel(100, -40);
  assert.equal(timers.length, 0, "at the end, nothing moves and nothing shows");
  pane.itemList = shownItems; pane.visible = shownVisible;
  // Analysis settings: opening reads the daemon's agents and settings, a model the catalog lacks shows as its own row;
  // a pick writes the local agent back, resetting the model on an agent switch; the field searches, Enter picks or saves as typed.
  press("settings");
  assert.ok(drawn.has("review-settings-panel"));
  await new Promise(setImmediate);
  assert.equal(field.value(), "");
  drawn.clear(); pane.render(cx);
  // The main page names each setting's value; a setting's list is a page its row opens, so none shows before.
  assert.ok(drawn.has("settings-language") && drawn.has("settings-agent") && drawn.has("settings-model") && !drawn.has("agent-claude") && !drawn.has("model-default"));
  press("settings-model");
  assert.ok(drawn.has("model-custom") && drawn.has("model-list") && drawn.has("settings-back") && !drawn.has("settings-agent"));
  press("settings-back");
  assert.ok(drawn.has("settings-agent") && !drawn.has("model-custom"));
  press("settings-agent");
  press("agent-claude");
  assert.deepEqual(plain((await put()).llm), { provider: "local-agent", agent: "claude", agentModel: "" });
  assert.equal((await put()).locale, "zh-CN");
  // A pick comes back to the main page.
  assert.ok(pane.settingsPage === null && drawn.has("settings-model"));
  press("settings-model");
  assert.ok(drawn.has("model-sonnet") && !drawn.has("model-custom"));
  field.set_value("SON"); drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("model-sonnet"));
  field.set_value("xyz"); drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("model-sonnet"));
  press("model-sonnet");
  assert.equal((await put()).llm.agentModel, "sonnet");
  assert.equal(field.value(), "");
  assert.equal(pane.settingsPage, null);
  field.set_value("Sonnet"); field.events.submit({}, cx);
  assert.equal((await put()).llm.agentModel, "sonnet");
  field.set_value(" opus-x "); field.events.submit({}, cx);
  assert.equal((await put()).llm.agentModel, "opus-x");
  assert.equal(field.value(), "");
  assert.equal(pane.settingsPage, null, "Enter's pick comes back too");
  keyboard = null; press("settings-model");
  assert.equal(keyboard, "field", "the page opens ready to type");
  // ↑ ↓ move through every row, Default and Custom too, wrapping; Enter picks the highlighted one; typing clears the highlight.
  const arrow = (key) => pane.key({ key, keystroke: key }, cx);
  arrow("down");
  assert.equal(pane.pageAt, 0);
  arrow("up"); arrow("up");
  assert.equal(pane.pageAt, 1, "Default, Custom, sonnet: up wraps onto sonnet, then Custom");
  arrow("down");
  field.events.submit({}, cx);
  assert.equal((await put()).llm.agentModel, "sonnet");
  assert.equal(pane.pageAt, -1);
  assert.equal(keyboard, "pane", "the field is gone: the keyboard comes back to the pane");
  press("settings-model");
  arrow("down"); field.set_value("x"); field.events.change({}, cx);
  assert.equal(pane.pageAt, -1);
  // Default by keys, in the field or with the keyboard off it.
  field.set_value(""); arrow("down"); field.events.submit({}, cx);
  assert.equal((await put()).llm.agentModel, "");
  press("settings-model"); arrow("down"); arrow("down"); pane.key({ key: "enter", keystroke: "enter" }, cx);
  assert.deepEqual([(await put()).llm.agentModel, pane.settingsPage], ["sonnet", null], "Enter off the field picks the same");
  pane.key({ key: "enter", keystroke: "enter" }, cx);
  // A search leaves out the rows it doesn't name, so ↓ lands on the first match; the pointer lights the row it's on.
  press("settings-model"); field.set_value("son"); field.events.change({}, cx); drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("model-default"));
  arrow("down"); field.events.submit({}, cx);
  assert.equal((await put()).llm.agentModel, "sonnet");
  press("settings-model"); handlers.get("model-sonnet.on_hover")(true, cx);
  assert.equal(pane.pageAt, 1);
  // Escape off the page takes its search and hands the keyboard back.
  field.set_value("q"); pane.key({ keystroke: "escape" }, cx);
  assert.deepEqual([pane.settingsPage, field.value(), pane.pageAt, keyboard], [null, "", -1, "pane"]);
  field.set_value("");
  const saved = puts.length;
  field.events.submit({}, cx);
  await put(); assert.equal(puts.length, saved, "an empty field saves nothing");
  {
    // Past the rows that show, ↑/↓ keep the highlight in view.
    const list = pane.models().catalog, had = list.length;
    list.push(...Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, name: `M${i}` })));
    press("settings-model");
    drawn.clear(); pane.render(cx);
    assert.ok(drawn.has("model-default"));
    pane.listHeight = { "model-list": 300 };
    assert.ok(Number.isFinite(pane.trailing()), "a settings list measuring itself leaves the diff list's height alone");
    drawn.clear(); pane.render(cx);
    assert.ok(!drawn.has("model-m20"), "only the rows in view are drawn");
    for (let i = 0; i < 21; i++) pane.key({ key: "down", keystroke: "down" }, cx);
    drawn.clear(); pane.render(cx);
    assert.ok(drawn.has("model-m18") && !drawn.has("model-default"), "the highlight's row is");
    pane.key({ keystroke: "escape" }, cx);
    pane.pageAt = -1; pane.listHeight = {}; pane.scrollTop = {};
    list.splice(had);
  }
  // Escape goes back a page, leaving the panel open.
  press("settings-model");
  pane.key({ keystroke: "escape" }, cx);
  assert.ok(pane.popup === "settings" && pane.settingsPage === null);
  // The language the analysis writes in, as the app's LanguageMenu: a page of its own, whose pick writes it back with the
  // rest of the settings. Unset, the daemon's default shows as picked.
  press("settings-language");
  assert.ok(drawn.has("language-list") && drawn.has("locale-ja") && !drawn.has("settings-agent"));
  press("locale-ja");
  assert.equal((await put()).locale, "ja");
  assert.equal((await put()).llm.agentModel, "sonnet");
  assert.ok(!drawn.has("locale-ja") && drawn.has("settings-agent"));
  pane.shared = { ...pane.shared, locale: undefined, defaultLocale: "fr" };
  assert.equal(pane.locale(), "fr");
  // Shortcuts stay off while the panel takes typing.
  pane.key({ keystroke: "s" }, cx);
  assert.equal(pref("split"), true);
  {
    // The language and agent pages move as a menu with no search field: ↑/↓, Home, End, typing, and Enter or Space to pick.
    const hit = (key, char) => pane.key({ key, keystroke: key, key_char: char }, cx);
    press("settings-language");
    assert.equal(keyboard, "pane");
    hit("end"); assert.equal(pane.pageAt, pane.pageRows().length - 1);
    hit("home"); assert.equal(pane.pageAt, 0);
    handlers.get("locale-en.on_hover")(true, cx);
    pane.pageAt = -1; hit("f", "f"); hit("enter");
    assert.deepEqual([(await put()).locale, pane.settingsPage], ["fr", null]);
    press("settings-agent"); hit("down"); hit("space");
    assert.deepEqual([(await put()).llm.agent, (await put()).llm.agentModel, pane.settingsPage], [pane.agents[0].name, "", null]);
    press("settings-language"); hit("enter");
    assert.equal(pane.settingsPage, "language", "nothing lit, Enter picks nothing");
    pane.key({ keystroke: "escape" }, cx);
  }
  {
    // A save writes only its own field over the daemon's settings as they are now: a language another pane saved since
    // this one read them stays when this one picks a model.
    daemonSettings = { ...daemonSettings, locale: "en" };
    press("settings-model"); press("model-sonnet"); await put();
    assert.deepEqual([daemonSettings.locale, daemonSettings.llm.agentModel], ["en", "sonnet"]);
    // Saves go one at a time: two in a row, landing in reverse order, keep both fields.
    const request = mainScope.request, held = [];
    mainScope.request = (root, method, path, body) => method === "PUT" ? new Promise(r => held.push(() => r(request(root, method, path, body)))) : request(root, method, path, body);
    press("settings-language"); press("locale-ja");
    press("settings-model"); press("model-default"); await put();
    while (held.length) { held.pop()(); await put(); }
    mainScope.request = request;
    assert.deepEqual([daemonSettings.locale, daemonSettings.llm.agentModel], ["ja", ""]);
  }
  // A run starts only on a count's click: `analyze` in the request, Analyze automatically on, a page with no analysis.
  const ask = async (extra, page = pane.page) => {
    routes.length = 0;
    sharedStore.set("review", { tab: "b", root: "/repo", page, n: pane.handled + 1, ...extra });
    pane.render(cx); await new Promise(setImmediate);
    return routes.filter(r => r === "/api/review/analyze").length;
  };
  handlers.get("auto-analyze.on_change")(false, cx);
  assert.equal(sharedStore.get("review.prefs").autoAnalyze, false);
  await new Promise(setImmediate);
  review.analysis = { state: "none", agent: true };
  assert.equal(await ask({ analyze: true }), 0, "the setting off");
  assert.equal(pane.analyzeFor, null, "and the ask is spent, not kept for when it's turned on");
  handlers.get("auto-analyze.on_change")(true, cx);
  routes.length = 0;
  pane.load(cx); await new Promise(setImmediate);
  assert.ok(!routes.includes("/api/review/analyze"), "a read on its own, with the setting on");
  assert.equal(await ask({}), 0, "a request that doesn't ask, as a menu's pick");
  routes.length = 0;
  assert.equal(await ask({ analyze: true }), 1, "the page already shown still gets its read, and the run");
  routes.length = 0;
  pane.startingUntil = 0;
  pane.load(cx); await new Promise(setImmediate);
  assert.ok(!routes.includes("/api/review/analyze"), "one ask, one run: the next read starts none");
  // Another page asked for: its own read acts on it.
  assert.equal(await ask({ analyze: true }, "/branch/other"), 1);
  await new Promise(setImmediate);
  assert.equal(await ask({}, "/branch/fix"), 0, "and back without asking, none");
  await new Promise(setImmediate);
  // An outdated analysis waits for Re-analyze, even when asked.
  review.analysis = { state: "outdated", agent: true }; review.head = { sha: "h2" };
  assert.equal(await ask({ analyze: true }), 0);
  // A request that doesn't ask takes back one not yet read.
  review.analysis = { state: "none", agent: true };
  pane.analyzeFor = pane.page;
  assert.equal(await ask({}), 0);
  assert.equal(pane.analyzeFor, null);
  review.analysis = { state: "outdated", agent: true };
  // A new pane's props carry the ask; after a restart they're stale, and the pane's own storage says so.
  {
    const opened = (stored, props) => {
      const own = new Map(stored);
      const made = new (load("main.js", { ...env, props: () => props, localStorage: { getItem: (k) => own.get(k) ?? null, setItem: (k, v) => own.set(k, v) } }).Mod)();
      made.init({}, cx);
      return made;
    };
    review.analysis = { state: "none", agent: true };
    routes.length = 0;
    opened([], { root: "/repo", page: "/branch/fix", n: 1 }); await new Promise(setImmediate);
    assert.ok(!routes.includes("/api/review/analyze"), "props that don't ask");
    opened([["tab", "b"]], { root: "/repo", page: "/branch/fix", n: 1, analyze: true }); await new Promise(setImmediate);
    assert.ok(!routes.includes("/api/review/analyze"), "restarted: its stale props start no run");
    opened([], { root: "/repo", page: "/branch/fix", n: 1, analyze: true }); await new Promise(setImmediate);
    assert.equal(routes.filter(r => r === "/api/review/analyze").length, 1, "a count's click opened it");
    review.analysis = { state: "outdated", agent: true };
  }
  // The settings panel closes on a press outside it or Escape; the gear's own press, which is outside too, doesn't reopen it.
  handlers.get("review-settings-panel.on_mouse_down_out")({}, cx);
  press("settings");
  assert.ok(pane.popup !== "settings" && !drawn.has("review-settings-panel"));
  pane.popupClosedAt = 0; press("settings");
  assert.ok(pane.popup === "settings");
  pane.key({ keystroke: "escape" }, cx);
  assert.ok(pane.popup !== "settings");
  // Closed by Escape, the gear opens it again at once: only a press outside it is the gear's own.
  press("settings");
  assert.equal(pane.popup, "settings", "Escape then the gear reopens it");
  // The settings set unified or split, kept for the next pane; picking the one set changes nothing.
  press("view-split");
  assert.equal(pref("split"), true);
  press("view-unified");
  assert.equal(pref("split"), false);
  press("view-unified");
  assert.equal(pref("split"), false);
  pane.closePopup(cx); pane.popupClosedAt = 0;
  // Every pane reads the shared preferences where it uses them: a new one starts from them, and a choice in one holds in all at once.
  const second = new (load("main.js", { ...env }).Mod)();
  second.init({}, cx); await new Promise(setImmediate);
  second.view = 1000; second.width = 1200;
  assert.ok(!second.splitShown() && second.sidebarShown());
  setPref("split", true);
  assert.ok(second.splitShown());
  setPref("split", false);
  // Turned off in one, another pane starts no paid run, even asked.
  setPref("autoAnalyze", false); review.analysis = { state: "none", agent: true }; review.head = { sha: "h3" }; routes.length = 0;
  second.analyzeFor = second.page;
  second.load(cx); await new Promise(setImmediate);
  assert.ok(!routes.includes("/api/review/analyze"));
  setPref("autoAnalyze", true); review.analysis = { state: "outdated", agent: true }; review.head = { sha: "h2" };
  // Opened in a new tab that hasn't the focus yet, a pane takes the review pane's tab nobody claimed, and names it.
  const own = new Map(), third = new (load("main.js", { ...env, focused: () => ({ tab: "a" }),
    panes: () => [{ pane: "p9", mod: "review", tab: "b" }, { pane: "p8", mod: "review", tab: "c" }],
    localStorage: { getItem: (k) => own.get(k) ?? null, setItem: (k, v) => own.set(k, v) } }).Mod)();
  third.init({}, cx); third.render(cx);
  assert.equal(third.tab, "c");
  assert.deepEqual(Object.keys(sharedStore.get("review.titles")).sort(), ["b", "c"]);
  // Responsive: narrower than SPLIT_MIN the diff is unified, the split choice kept; back, split again.
  setPref("split", true); pane.view = 600; drawn.clear(); pane.render(cx);
  assert.ok(!pane.itemList.some(item => item.kind === "pair") && pref("split"));
  pane.view = 1000; drawn.clear(); pane.render(cx);
  assert.ok(pane.itemList.some(item => item.kind === "pair"));
  // Narrower than WIDE, as the app below `lg`: no sidebar, the groups are tabs over the diff and a group's subgroups
  // sit under its summary; a tab shows its group, a subgroup jumps to it.
  pane.width = 900; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("review-sidebar") && drawn.has("group-tab-g") && drawn.has("group-sub-k"));
  // As the app below `lg`: a long run down slides the header and the tabs away, and any scroll up brings them back.
  const scroll = (dy) => { handlers.get("review-diff-area.on_scroll_wheel")({ delta: { x: 0, y: dy }, local_position: { x: 100, y: 0 } }, cx); drawn.clear(); pane.render(cx); };
  scroll(-200);
  assert.ok(drawn.has("review-header") && drawn.has("group-tabs"));
  scroll(-200);
  assert.ok(!drawn.has("review-header") && !drawn.has("group-tabs"));
  scroll(-50); scroll(10);
  assert.ok(drawn.has("review-header") && drawn.has("group-tabs"));
  // Wide, the header stays.
  scroll(-400); pane.width = 1200; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("review-header"));
  pane.width = 900; scroll(10);
  // The group's header shows only at the list's top, as the app's scrolls away with the diffs.
  pane.visible = { start: 2, end: 5 }; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("group-header") && drawn.has("group-tabs"));
  pane.visible = { start: 0, end: 5 }; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("group-header"));
  // As the app's DiffGroupNav: picking a group shows it, its subgroups under its summary; once the header has scrolled
  // away they stick under the tabs ("subgroups of …"), where its caret folds them. One place at a time.
  pane.groupKey = null; pane.expandedTab = null; press("group-tab-g-button");
  assert.ok(pane.groupKey === "g" && drawn.has("group-sub-k") && !drawn.has("group-subtab-k"));
  // At the top, the caret folds them there; a group newly shown opens them, however it came to be.
  press("group-tab-g-caret");
  assert.ok(!drawn.has("group-sub-k") && !drawn.has("group-subtab-k"));
  press("group-tab-g-caret");
  assert.ok(drawn.has("group-sub-k"));
  const scrolled = () => { pane.visible = { start: 3, end: 6 }; drawn.clear(); pane.render(cx); };
  scrolled();
  assert.ok(drawn.has("group-subtab-k") && !drawn.has("group-sub-k"));
  handlers.get("group-tab-g-caret.on_click")({}, cx); scrolled();
  assert.ok(!drawn.has("group-subtab-k") && pane.groupKey === "g");
  handlers.get("group-tab-g-caret.on_click")({}, cx); scrolled();
  assert.ok(drawn.has("group-subtab-k"));
  const sub = pane.itemList.findIndex(item => item.key === "g:k");
  pane.visible = { start: sub + 3, end: sub + 9 }; calls.length = 0; timers.length = 0;
  press("group-subtab-k-button");
  assert.deepEqual(plain(calls.filter(([name]) => name === "scroll")), [["scroll", sub]]);
  // Under COMPACT the header's text buttons are icons.
  pane.width = 500; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("analyze"));
  // The bar reads what the pane shows, for its count; the commits are the pane's own now.
  const base = pane.page, baseEntry = () => sharedStore.get("review.shown").b;
  assert.deepEqual(plain(baseEntry()), { root: "/repo", page: base, base });
  const settled = () => new Promise(setImmediate);
  const draw = () => { drawn.clear(); pane.render(cx); };
  // One commit's page lists only itself, as the daemon's: the diff's list stays its base's.
  const listing = mainScope.review;
  mainScope.review = async (root, route, body) => {
    const r = await listing(root, route, body);
    return route === "/api/review" && body.page.startsWith("/commit/") ? { ...r, commits: r.commits.filter(c => body.page.endsWith(c.sha)) } : r;
  };
  // Stepping starts no run, the setting on and no analysis yet.
  const beforeSwitch = review.analysis;
  setPref("autoAnalyze", true); review.analysis = { state: "none", agent: true };
  routes.length = 0;
  // The whole diff, its commits: narrow, it says so and the arrows lead to its oldest.
  draw();
  assert.ok(drawn.has("review-commit-switch") && texts.get("commit-place") === "All changes");
  press("commit-older");
  assert.equal(pane.page, base, "nothing older than the whole diff");
  press("commit-newer"); await settled(); draw();
  assert.deepEqual([pane.page, pane.base, baseEntry().page, baseEntry().base], ["/commit/c1", base, "/commit/c1", base], "the request keeps the base, and review.shown says where it is");
  assert.ok(sharedStore.get("review").base === base && !sharedStore.get("review").analyze);
  assert.equal(texts.get("commit-place"), "1/2", "narrow, the short form");
  press("commit-older"); await settled();
  assert.equal(pane.page, "/commit/c1", "no older commit");
  press("commit-newer"); await settled();
  pane.width = 1200; draw();
  assert.equal(pane.diffCommits().length, 2, "on one commit's page, still the diff's list");
  assert.equal(texts.get("commit-place"), "Commit 2 of 2");
  press("commit-newer"); await settled();
  assert.equal(pane.page, "/commit/c2", "no newer commit");
  // Narrow it can shrink, its arrows staying: the words truncate, and the header clips rather than push its buttons out.
  assert.equal(styles["review-commit-switch"].min_w, 0);
  assert.ok(styles["commit-pick"].min_w === 0 && !styles["commit-pick"].flex_none);
  assert.ok(styles["commit-place"].min_w === 0 && styles["commit-place"].truncate);
  assert.ok(styles["review-header"].overflow_hidden && styles.settings.flex_none);
  // The list: All changes and the commits, newest first, the one shown marked and lit, with the keyboard in its search.
  press("commit-pick");
  assert.ok(pane.popup === "commits" && drawn.has("review-commit-menu") && keyboard === "commits");
  assert.deepEqual(plain(pane.commitRows().map(r => r.id)), ["commit-all", "commit-c2", "commit-c1"]);
  assert.equal(pane.commitRows()[pane.commitAt].page, "/commit/c2");
  assert.ok(styles["commit-c2"].accessibility_label.endsWith(", shown") && !styles["commit-c1"].accessibility_label.endsWith(", shown") && !styles["commit-all"].accessibility_label.endsWith(", shown"));
  // ↑/↓ round the ends, with list.js's step; other keys are the search's, not the pane's.
  const down = { key: "down" }, up = { key: "up" };
  pane.key(down, cx); assert.equal(pane.commitRows()[pane.commitAt].id, "commit-c1");
  pane.key(down, cx); assert.equal(pane.commitRows()[pane.commitAt].id, "commit-all");
  pane.key(up, cx); assert.equal(pane.commitRows()[pane.commitAt].id, "commit-c1");
  const splitBefore = pref("split");
  pane.key({ keystroke: "s", key: "s" }, cx);
  assert.equal(pref("split"), splitBefore, "typing isn't a shortcut");
  // Enter picks the lit row; the list closes and the keyboard is back on the pane.
  commitEvents.submit({}, cx); draw(); await settled();
  assert.deepEqual([pane.page, pane.popup, keyboard], ["/commit/c1", null, "pane"]);
  // Escape closes, and the search doesn't outlive it.
  pane.popupClosedAt = 0; press("commit-pick");
  commitField.text = "two"; commitEvents.change({}, cx);
  assert.deepEqual(plain(pane.commitRows().map(r => r.id)), ["commit-c2"], "a search hides All changes, and matches subjects");
  assert.equal(pane.commitAt, 0);
  commitField.text = "c1"; commitEvents.change({}, cx);
  assert.deepEqual(plain(pane.commitRows().map(r => r.id)), ["commit-c1"], "or a sha's start");
  commitField.text = "nope"; commitEvents.change({}, cx); draw();
  assert.ok(drawn.has("review-commit-menu"));
  commitEvents.submit({}, cx);
  assert.equal(pane.popup, "commits", "no match: Enter picks nothing");
  pane.key({ keystroke: "escape" }, cx);
  assert.deepEqual([pane.popup, commitField.text, keyboard], [null, "", "pane"]);
  // The pointer lights rows; a press outside closes, and the words' own press doesn't reopen it.
  pane.popupClosedAt = 0; press("commit-pick");
  handlers.get("commit-c2.on_hover")(true, cx);
  assert.equal(pane.commitRows()[pane.commitAt].id, "commit-c2");
  handlers.get("review-commit-menu.on_mouse_down_out")({}, cx); press("commit-pick");
  assert.equal(pane.popup, null);
  // Back to the whole diff from its row; the frame fits a narrow pane.
  pane.popupClosedAt = 0; pane.width = 300; press("commit-pick");
  assert.equal(styles["review-commit-menu"].w, 268);
  pane.width = 1200;
  press("commit-all"); await settled(); draw();
  assert.deepEqual([pane.page, texts.get("commit-place"), pane.popup], [base, "All changes", null]);
  assert.ok(!routes.includes("/api/review/analyze"), "stepping and the list start no run");
  review.analysis = beforeSwitch;
  // A commit gone from the list, as after an amend: its sha, nowhere to step.
  pane.baseCommits = review.commits; pane.page = "/commit/abcdef123456"; draw();
  assert.equal(texts.get("commit-place"), "abcdef1");
  press("commit-newer");
  assert.equal(pane.page, "/commit/abcdef123456");
  pane.page = base; pane.baseCommits = null;
  // Nowhere else in this diff: no switch.
  const realCommits = pane.review.commits;
  pane.review.commits = realCommits.slice(0, 1); draw();
  assert.ok(!drawn.has("review-commit-switch"), "one commit, the whole diff");
  const realBase = pane.base;
  pane.page = pane.base = "/commit/c1"; draw();
  assert.ok(!drawn.has("review-commit-switch"), "a commit opened as its own diff");
  pane.base = realBase; pane.page = base; pane.review.commits = realCommits;
  mainScope.review = listing;
  // A later open replaces the diff, and its base.
  const opened = [];
  pane.open = (page) => { opened.push(page); pane.page = page; };
  sharedStore.set("review", { tab: "b", root: "/repo", page: "/worktree", n: pane.handled + 1 });
  draw();
  assert.deepEqual([opened, pane.base, baseEntry().base], [["/worktree"], "/worktree", "/worktree"]);
  delete pane.open; pane.page = base; pane.base = base; pane.width = 500;
  sharedStore.delete("review");
  // One popup at a time: a press on another's button closes the open one (a press outside it) and opens its own at once;
  // a press on the open one's own button only closes it.
  pane.popupClosedAt = 0; press("settings");
  handlers.get("review-settings-panel.on_mouse_down_out")({}, cx); press("fold-menu");
  assert.equal(pane.popup, "fold");
  handlers.get("review-fold-menu.on_mouse_down_out")({}, cx); press("fold-menu");
  assert.equal(pane.popup, null);
  // The pane's own header names the diff, not the repo; this one counts reviewed files beside a donut.
  pane.render(cx);
  assert.equal(sharedStore.get("review.titles").b, "fix vs origin/main");
  assert.equal(pane.head().parts.find(p => p.donut !== undefined).text, `${pane.review.files.filter(f => f.reviewed).length}/${pane.review.files.length}`);
  assert.ok(pane.head().buttons.find(b => b.id === "analyze").icon);
  // Wide again, the sidebar instead of the tabs.
  pane.width = 1200; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("review-sidebar") && !drawn.has("group-tab-g") && !drawn.has("group-sub-k"));
  // One press on a file's header acts at once, by where it lands: the reviewed box at its start, the whole file and the
  // fold at its end, a fold anywhere else; and the file becomes the current one.
  pane.view = 1000; pane.render(cx);
  const header = (x) => { handlers.get("review-diff-area.on_mouse_down")({ local_position: { x, y: 0 } }, cx); handlers.get("null.on_item_click")("f:c.ts", cx); };
  const c = () => pane.review.files.find(f => f.path === "c.ts");
  const reviewed = c().reviewed;
  header(20);
  assert.ok(c().reviewed !== reviewed && pane.current === "c.ts");
  header(pane.view - 50);
  assert.ok(pane.full.has("c.ts"));
  await new Promise(setImmediate);
  const folded = pane.collapsed.has("c.ts");
  header(pane.view - 20);
  assert.equal(pane.collapsed.has("c.ts"), !folded);
  header(300);
  assert.equal(pane.collapsed.has("c.ts"), folded);
  // Scrolled into a file, its header sticks at the top, as the app's; a press there is the header's, not the row's under it,
  // and folding the file from there brings its header back to the top.
  pane.collapsed.delete("c.ts"); pane.version++; pane.render(cx);
  const headAt = pane.itemList.findIndex(item => item.key === "f:c.ts"), rowAt = pane.itemList.findIndex(item => item.key.startsWith("r:c.ts"));
  pane.visible = { start: headAt, end: headAt + 2 }; drawn.clear(); pane.render(cx);
  assert.ok(!drawn.has("sticky-file"), "a header in view doesn't stick");
  pane.visible = { start: rowAt, end: rowAt + 2 }; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("sticky-file"));
  pane.current = null; calls.length = 0;
  handlers.get("review-diff-area.on_mouse_down")({ local_position: { x: 300, y: 10 } }, cx);
  handlers.get("null.on_item_click")(pane.itemList[rowAt].key, cx);
  assert.equal(pane.current, null);
  handlers.get("sticky-file.on_click")({}, cx);
  assert.ok(pane.collapsed.has("c.ts") && pane.current === "c.ts");
  assert.deepEqual(plain(calls.filter(([name]) => name === "scroll")), [["scroll", headAt]]);
  pane.collapsed.delete("c.ts"); pane.version++; pane.render(cx);
  // Unified, code scrolls sideways by the wheel too, the headers staying put.
  setPref("split", false); pane.render(cx); pane.shift = [0, 0, 0]; pane.sideWidth = [0, 0, pane.view + 200];
  handlers.get("review-diff-area.on_scroll_wheel")({ delta: { x: -500, y: 0 }, local_position: { x: 100, y: 0 } }, cx);
  assert.deepEqual(plain(pane.shift), [0, 0, 200]);
  // Picking a file brings its header exactly to the top. Below the view: first the first item a view's height past it,
  // bottom-aligned, which carries it over the top; once that frame is drawn, it, which then lands at the top.
  const items = pane.itemList, last = items.filter(item => item.kind === "file").at(-1), at = items.indexOf(last), path = last.file.path;
  const scrolls = () => plain(calls.filter(([name]) => name === "scroll"));
  assert.ok(at >= 2);
  pane.diffHeight = items[at].size + items[at + 1].size; pane.visible = { start: 0, end: 2 }; calls.length = 0; timers.length = 0;
  pane.select(path, cx);
  assert.deepEqual(scrolls(), [["scroll", at + 2]]);
  tick();
  assert.deepEqual(scrolls(), [["scroll", at + 2]], "no second scroll before the first has drawn");
  pane.frames++; tick();
  assert.deepEqual(scrolls(), [["scroll", at + 2], ["scroll", at]]);
  // A newer pick drops an older one's settling.
  calls.length = 0;
  pane.select(path, cx); pane.select(items.find(item => item.kind === "file").file.path, cx);
  pane.frames++; tick();
  assert.equal(scrolls().filter(([, i]) => i === at).length, 0);
  // Another group shown, the range last drawn was the old list's: the pick goes the two-step way.
  pane.visible = { start: at + 1, end: at + 5 }; pane.version++; calls.length = 0; timers.length = 0;
  pane.select(path, cx);
  assert.ok(timers.length === 1 && scrolls()[0][1] !== at);
  pane.render(cx);
  // At or above the top, one scroll: the near edge is the top.
  for (const start of [at, at + 1]) {
    pane.visible = { start, end: start + 5 }; calls.length = 0; timers.length = 0;
    pane.select(path, cx);
    assert.deepEqual(scrolls(), [["scroll", at]]);
    assert.equal(timers.length, 0);
  }
  // A blank after the list lets the last header reach the top: a view's height less what follows that header.
  const after = items.slice(at).reduce((n, item) => n + item.size, 0);
  pane.diffHeight = after + 100;
  assert.equal(pane.trailing(), 100);
  pane.diffHeight = after - 1;
  assert.equal(pane.trailing(), 0);
  // A folder in the aside's tree doesn't fold, as the app's: its box marks its files.
  pane.width = 1200; setPref("fileList", "tree");
  // As a read brings it: a new review, not the old one changed.
  pane.review = { ...pane.review, files: [...pane.review.files, file("x/y/z.ts")],
    groups: [{ ...pane.review.groups[0], files: [...pane.review.groups[0].files, "x/y/z.ts"] }, ...pane.review.groups.slice(1)] };
  pane.select("a.ts", cx); pane.version++; pane.visible = null; drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("tree-d-folder:x/y/") && drawn.has("tree-f-x/y/z.ts") && !handlers.has("tree-d-folder:x/y/.on_click"));
  press("tree-dcheck-folder:x/y/");
  assert.ok(pane.review.files.find(f => f.path === "x/y/z.ts").reviewed);
  // The fold menu, as the app's DiffCollapseMenu: every file of the diff at once, and the file at the view's top back there.
  pane.width = 900; pane.review.files[0].test = true; drawn.clear(); pane.render(cx);
  // The stub list draws from the top on every render: the range a test sets goes in after the menu opens.
  const fold = (id, at = null) => {
    pane.popupClosedAt = 0; press("fold-menu"); assert.ok(drawn.has("review-fold-menu"));
    if (at !== null) pane.visible = { start: at, end: at + 2 };
    press(`fold-${id}`); assert.ok(!drawn.has("review-fold-menu"));
  };
  const shut = () => pane.review.files.filter(f => pane.collapsed.has(f.path)).map(f => f.path).sort();
  fold("expand-all");
  assert.deepEqual(shut(), []);
  {
    // By keys, as a menu. While it's up, the pane's shortcuts are out of reach; so they are under the status.
    const hit = (key, char) => pane.key({ key, keystroke: key, key_char: char }, cx);
    const split = pref("split"), current = pane.current;
    pane.popupClosedAt = 0; press("fold-menu");
    hit("s", "s"); hit("j", "j");
    assert.deepEqual([pref("split"), pane.current, pane.popup], [split, current, "fold"]);
    hit("end"); assert.equal(pane.foldAt, 3);
    hit("home"); assert.equal(pane.foldAt, 0);
    hit("enter"); assert.equal(pane.popup, null, "Expand all, the row lit");
    pane.popupClosedAt = 0; press("fold-menu");
    assert.equal(pane.foldAt, -1, "nothing lit on opening");
    hit("enter"); assert.equal(pane.popup, "fold", "so Enter picks nothing");
    handlers.get("fold-collapse-all.on_hover")(true, cx); assert.equal(pane.foldAt, 1, "the pointer lights its row");
    hit("space"); assert.equal(shut().length, pane.review.files.length);
    pane.popupClosedAt = 0; press("fold-menu"); pane.typedAt = -Infinity; hit("c", "c"); assert.equal(pane.foldAt, 1, "typing");
    pane.key({ keystroke: "escape" }, cx); assert.equal(pane.popup, null);
    fold("expand-all");
    pane.popup = "status"; hit("s", "s");
    assert.equal(pref("split"), split);
    pane.key({ keystroke: "escape" }, cx); assert.equal(pane.popup, null);
    pane.popupClosedAt = 0;
  }
  const cRow = pane.itemList.findIndex(item => item.key.startsWith("r:c.ts"));
  calls.length = 0; timers.length = 0;
  fold("collapse-all", cRow);
  assert.deepEqual(shut(), pane.review.files.map(f => f.path).sort());
  pane.frames++; tick();
  assert.equal(scrolls().at(-1)[1], pane.itemList.findIndex(item => item.key === "f:c.ts"));
  fold("expand-all"); fold("collapse-reviewed");
  assert.deepEqual(shut(), pane.review.files.filter(f => f.reviewed).map(f => f.path).sort());
  fold("expand-all"); fold("collapse-tests");
  assert.deepEqual(shut(), ["a.ts"]);
  // Narrow, the tabs keep to one row that scrolls sideways.
  assert.ok(drawn.has("group-tab-row"));
  pane.width = 500; pane.render(cx);
  // Data flow. A read asks rows only for the group's files without them.
  const daemon = mainScope.review, settle = () => new Promise(setImmediate);
  await settle(); await settle(); // The folder mark above, and the read after it.
  const shownFiles = groupFiles(pane.group()), first = shownFiles[0], target = () => pane.review.files.find(f => f.path === first);
  for (const f of pane.review.files) if (shownFiles.includes(f.path)) f.hunks ??= [];
  delete target().hunks; pane.collapsed.delete(first);
  pane.load(cx); await settle();
  assert.deepEqual(plain(bodies.at(-1).rows), [first]);
  // A read that says what the one shown does changes nothing: the list isn't rebuilt, and its files stay the ones marks change.
  const shownReview = pane.review, shownVersion = pane.version;
  pane.load(cx, true); await settle();
  assert.ok(pane.review === shownReview && pane.version === shownVersion);
  // While a run goes, the pane asks how it's going, one call at a time, not for the diff; once it ended, the diff is read.
  let status = { running: true, progress: { kind: "thinking", step: 3 } };
  mainScope.review = (root, route, body) => route === "/api/review/status" ? (routes.push(route), Promise.resolve(status)) : daemon(root, route, body);
  pane.review.analysis = { state: "running", agent: true }; routes.length = 0;
  every[1500][0](cx); every[1500][0](cx); await settle();
  assert.deepEqual(plain(routes), ["/api/review/status"]);
  assert.equal(pane.review.analysis.progress.step, 3);
  status = { running: false }; routes.length = 0;
  every[1500][0](cx); await settle();
  assert.deepEqual(plain(routes), ["/api/review/status", "/api/review"]);
  // A daemon without the route reads the diff, as before.
  mainScope.review = (root, route, body) => route === "/api/review/status" ? Promise.reject(new Error("Cannot find any route matching")) : daemon(root, route, body);
  pane.review.analysis = { state: "running", agent: true }; routes.length = 0;
  every[1500][0](cx); await settle();
  assert.deepEqual(plain(routes), ["/api/review"]);
  // No daemon to ask: a run shown as going ends as failed, so the polls and their tries at starting the daemon stop.
  mainScope.review = () => Promise.reject(new Error("daemon down"));
  pane.review.analysis = { state: "running", agent: true }; shownTab = "other"; pane.report();
  every[1500][0](cx); await settle();
  assert.ok(!pane.analyzing() && analyzeButton().label === "Analysis failed" && word() === "blocked");
  mainScope.review = daemon; shownTab = "b";
  pane.load(cx); await settle();
  assert.ok(!pane.error, "and the next read that answers says how it is");
  // Unseen - another tab shown, or the window inactive - the slow timer doesn't read; seen again, one read follows.
  const slow = every[15000][0], wake = every[1000][0];
  routes.length = 0; shownTab = "other";
  slow(cx); slow(cx); wake(cx); await settle();
  shownTab = "b"; windowActive = false; wake(cx); await settle();
  assert.deepEqual(plain(routes), []);
  windowActive = true; wake(cx); await settle(); wake(cx); await settle();
  assert.deepEqual(plain(routes), ["/api/review"]);
  slow(cx); await settle();
  assert.equal(routes.length, 2, "seen, the slow timer reads");
  // A read from before a reviewed mark landed doesn't undo it on screen.
  let release;
  mainScope.review = (root, route, body) => route === "/api/review/reviewed" ? new Promise(r => { release = r; }) : daemon(root, route, body);
  const was = target().reviewed;
  pane.setReviewed(target(), !was, cx);
  pane.load(cx); await settle();
  assert.equal(target().reviewed, !was);
  release(); await settle(); await settle();
  // A refused mark says so in a toast: the read after it would clear the pane's error at once.
  mainScope.review = (root, route, body) => route === "/api/review/reviewed" ? Promise.reject(new Error("mark failed")) : daemon(root, route, body);
  pane.setReviewed(target(), !target().reviewed, cx); await settle(); await settle();
  assert.deepEqual(plain(notes), [{ title: "pulls.review", body: "mark failed", level: "error" }]);
  {
    // Marked then unmarked at once, the marks landing in reverse order: the daemon keeps the last press, not the first.
    const held = []; let kept;
    mainScope.review = (root, route, body) => route === "/api/review/reviewed" ? new Promise(r => held.push(() => { kept = body.reviewed; r({}); })) : daemon(root, route, body);
    pane.setReviewed(target(), true, cx); pane.setReviewed(target(), false, cx); await settle();
    while (held.length) { held.pop()(); await settle(); }
    assert.equal(kept, false);
  }
  // A start the daemon refuses ends the wait and says why.
  mainScope.review = (root, route, body) => route === "/api/review/analyze" ? Promise.reject(new Error("no agent")) : daemon(root, route, body);
  pane.analyze(cx, false); await settle();
  assert.ok(pane.startingUntil === 0 && pane.analyzeError === "no agent");
  // Another diff opened meanwhile takes neither the old one's whole file nor its analysis failure.
  let reply;
  mainScope.review = (root, route, body) => route === "/api/review/file" ? new Promise(r => { reply = r; }) : daemon(root, route, body);
  const home = pane.page;
  pane.full.delete(first); pane.toggleFull(target(), cx); pane.analyzeError = "boom";
  // As the app's button, disabled while it loads: another press doesn't cancel it.
  pane.toggleFull(target(), cx);
  assert.ok(pane.full.has(first));
  pane.startingUntil = Date.now() + 1000;
  // The whole file comes back after the other diff has loaded.
  pane.open("/commit/c1", cx); await settle();
  reply({ rows: [] }); await settle();
  assert.ok(!pane.full.has(first) && pane.analyzeError === null && pane.startingUntil === 0);
  // Nor does a start refused after the page changed say so on the new one.
  let refuse;
  mainScope.review = (root, route, body) => route === "/api/review/analyze" ? new Promise((_, no) => { refuse = no; }) : daemon(root, route, body);
  pane.analyze(cx, false); pane.open("/commit/c3", cx); await settle();
  refuse(new Error("no agent")); await settle();
  assert.equal(pane.analyzeError, null);
  // Leaving a page mid-run isn't that run finishing.
  shownTab = "other"; pane.apply({ ...pane.review, analysis: { state: "running", agent: true } }); pane.report();
  assert.equal(word(), "working");
  pane.open("/commit/c2", cx); pane.report();
  assert.equal(word(), null);
  await settle(); shownTab = "b";
  mainScope.review = daemon; pane.open(home, cx); await settle();
  // Back to a page seen: the same files have the same shas, and its rows went with it, so they're asked for again.
  const wait = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate); };
  const drawAll = async () => { for (let i = 0; i < 3; i++) { drawn.clear(); pane.render(cx); await wait(); } };
  const there = pane.page;
  await drawAll();
  pane.open("/commit/c1", cx); await wait(); await drawAll();
  pane.open(there, cx); await wait(); await drawAll();
  const inGroup = groupFiles(pane.group()).map(path => pane.review.files.find(f => f.path === path)).filter(Boolean);
  assert.ok(inGroup.length > 0 && inGroup.every(f => f.hunks), "rows on coming back");
  // A read that never answers doesn't freeze the pane: a read of the same page waits for it, and after a while the pane
  // says it didn't answer, with Retry. Its late answer still counts.
  let answer; const asked = [];
  mainScope.review = (root, route, body) => route === "/api/review" ? (asked.push(body.page), new Promise(r => { answer = r; })) : daemon(root, route, body);
  timers.length = 0;
  pane.load(cx); pane.load(cx);
  assert.equal(asked.length, 1);
  tick(); drawn.clear(); pane.render(cx);
  assert.ok(pane.error && drawn.has("retry") && !pane.loading);
  const late = await daemon("/repo", "/api/review", { page: there, rows: [] });
  answer({ ...late, title: "late" }); await wait();
  assert.ok(pane.review.title === "late" && !pane.error);
  // A read of another page starts at once, and the old page's answer, coming after its own, is dropped.
  const answers = new Map();
  mainScope.review = (root, route, body) => route === "/api/review" ? new Promise(r => answers.set(body.page, r)) : daemon(root, route, body);
  pane.open("/commit/c1", cx);
  answers.get("/commit/c1")({ ...late, title: "new" }); await wait();
  answer({ ...late, title: "old" }); await wait();
  assert.equal(pane.review.title, "new");
  // The theme changing during a read: its rows have the old colors, so they're dropped and read again in the new.
  const paints = [], lightTheme = mainScope.theme;
  mainScope.review = (root, route, body) => route === "/api/review" ? new Promise(r => paints.push([body, r])) : daemon(root, route, body);
  pane.load(cx);
  mainScope.theme = () => ({ ...lightTheme(), foreground: "#111111" }); pane.render(cx);
  paints[0][1]({ ...late, title: "old colors" }); await wait();
  assert.ok(pane.review.title !== "old colors" && paints[1][0].colors.foreground === "#111111");
  paints[1][1]({ ...late, title: "new colors" }); await wait();
  assert.equal(pane.review.title, "new colors");
  mainScope.review = daemon; pane.render(cx); await wait();
  // Changed while the pane isn't drawn, a poll's read in the meantime doesn't stand for it: the first render reads the rows anew.
  mainScope.theme = () => ({ ...lightTheme(), foreground: "#222222" });
  pane.load(cx, true); await wait(); pane.render(cx); await wait();
  assert.ok(bodies.some(b => b.colors?.foreground === "#222222" && b.rows.length));
  mainScope.theme = lightTheme; pane.render(cx); await wait();
  // Retry takes its press's cx: the render's is gone by then (gpui-kit.d.ts), and a read started on it would leave `loading` set for good.
  pane.error = "down";
  let rendering = true;
  pane.render(new Proxy(cx, { get: (c, key) => { assert.ok(rendering, `a render's cx used after it: ${String(key)}`); return c[key]; } }));
  rendering = false; handlers.get("retry.on_click")({}, cx); await wait();
  assert.ok(!pane.loading && !pane.error);
  // Reopened on one commit's page, which lists only itself: the switch's list is read from its base, with each read, so a new
  // commit reaches it.
  const reopened = new Map([["tab", "b"], ["root", "/repo"], ["page", "/commit/c2"], ["base", "/branch/fix"], ["handled", "99"]]);
  const baseReads = [], baseCommits = [...review.commits];
  const fresh = new (load("main.js", { ...env, localStorage: { getItem: (k) => reopened.get(k) ?? null, setItem: (k, v) => reopened.set(k, v) },
    review: async (_root, _route, body) => {
      if (body.page === "/branch/fix") baseReads.push(body.rows);
      return { ...review, files: [], commits: body.page === "/branch/fix" ? baseCommits : [review.commits[1]] };
    } }).Mod)();
  fresh.init({}, cx); await wait(); fresh.render(cx); await wait(); fresh.load(cx); await wait(); fresh.render(cx);
  assert.equal(fresh.diffCommits().length, 2);
  assert.deepEqual(plain(baseReads), [[], []], "without rows");
  baseCommits.push({ sha: "c3", subject: "three" });
  fresh.load(cx); await wait(); fresh.render(cx);
  assert.equal(fresh.diffCommits().length, 3);
  // A read of rows as the list scrolls changes no commit: the base isn't read again.
  baseReads.length = 0; fresh.rowsWanted = () => ["a.ts"];
  fresh.load(cx); await wait();
  assert.deepEqual(plain(baseReads), [], "no base read after a rows read");
  delete fresh.rowsWanted;
  // A daemon too old for `firstRows` ignores it: drawing the first group asks for its rows, once.
  const oldReads = [];
  const older = new (load("main.js", { ...env, localStorage: { getItem: (k) => k === "handled" ? "99" : null, setItem() {} }, review: async (_root, route, body) => {
    const asked = body.rows ?? body.files;
    oldReads.push(asked);
    const files = review.files.map(({ hunks, ...f }) => asked.includes(f.path) ? { ...f, hunks } : { ...f });
    return route === "/api/review/rows" ? { files: files.filter(f => f.hunks) } : { ...review, files };
  } }).Mod)();
  older.init({}, cx); await wait(); older.render(cx); await wait(); older.render(cx); await wait();
  assert.deepEqual(plain(oldReads), [[], ["a.ts", "b.png", "c.ts"]]);
  // A watched change reads the diff only if it touches it: Git's HEAD or refs, or a file Git doesn't ignore (macOS reports
  // those too). The next batch waits a second, so at most one change read a second.
  let batch, watches = 0; const checked = [], watchReads = [];
  const watcher = new (load("main.js", { ...env, localStorage: { getItem: (k) => k === "handled" ? "99" : null, setItem() {} },
    watchFolder: () => { watches++; return new Promise(r => { batch = r; }); },
    exec: async (_cmd, args) => {
      const paths = args.slice(3), ignored = paths.filter(p => p.includes("node_modules"));
      checked.push(paths);
      return { code: ignored.length ? 0 : 1, stdout: ignored.join("\n") };
    },
    review: async (_root, route) => { watchReads.push(route); return { ...review, files: [] }; } }).Mod)();
  watcher.init({}, cx); await wait();
  const changed = async (paths) => {
    watchReads.length = 0; timers.length = 0; const before = watches;
    batch(paths); await wait();
    const reads = watchReads.length, waited = watches === before;
    tick(); await wait();
    assert.ok(waited && watches === before + 1, "the next batch a second later");
    return reads;
  };
  assert.equal(await changed(["/repo/.git/objects/ab/cd", "/repo/.git/index"]), 0);
  assert.deepEqual(checked, [], "Git's own files are judged without asking it");
  assert.equal(await changed(["/repo/node_modules/x"]), 0);
  assert.equal(await changed(["/repo/node_modules/x", "/repo/a.ts"]), 1);
  assert.equal(await changed(["/repo/.git/refs/heads/fix"]), 1);
  // Switching page keeps the old one on screen, dimmed and inert, until the new one's read replaces it, which starts at
  // its top. Meanwhile the read asks for the new page's first group, and the title and header don't read the old review.
  let next;
  mainScope.review = (root, route, body) => route === "/api/review" ? (bodies.push(body), new Promise(r => { next = r; })) : daemon(root, route, body);
  shownTab = "b"; pane.width = 1200; await drawAll();
  const old = pane.review, marked = pane.marks, split = pref("split");
  pane.current = old.files[0].path; pane.full.clear(); calls.length = 0; pane.shift = [0, 40, 300];
  pane.open("/commit/c2", cx);
  assert.ok(pane.review === old && pane.switching);
  assert.deepEqual(plain(bodies.at(-1)).rows, []);
  assert.equal(bodies.at(-1).firstRows, true);
  drawn.clear(); pane.render(cx);
  assert.ok(drawn.has("review-diff-area") && drawn.has("settings") && !drawn.has("analyze"), "the old list, without its counts and analysis");
  assert.equal(sharedStore.get("review.titles").b, "c2");
  pane.setReviewed(old.files[0], !old.files[0].reviewed, cx); pane.toggleFull(old.files[0], cx); pane.headerPress(old.files[0], 0, cx);
  pane.key({ keystroke: "s" }, cx); pane.key({ keystroke: "j" }, cx);
  assert.ok(pane.marks === marked && !pane.full.size && pref("split") === split && pane.current === old.files[0].path, "inert");
  next({ ...review, title: "two" }); await wait();
  assert.ok(!pane.switching && pane.review.title === "two" && pane.current === null);
  assert.deepEqual(plain(calls.filter(([name]) => name === "scroll")), [["scroll", 0]]);
  assert.deepEqual(plain(pane.shift), [0, 0, 0], "sideways too");
  // A failed read clears the old review rather than show it under the new page's title.
  mainScope.review = (root, route, body) => route === "/api/review" ? Promise.reject(new Error("gone")) : daemon(root, route, body);
  pane.open("/commit/c1", cx); await wait();
  assert.ok(pane.review === null && pane.error === "gone" && !pane.switching);
  mainScope.review = daemon;
  // A pane of its own on /repo's /branch/fix, its daemon `api` until a test swaps the scope's.
  const paneOf = async (extra = {}) => {
    const scope = load("main.js", { ...env, localStorage: { getItem: (k) => k === "handled" ? "99" : null, setItem() {} }, ...extra });
    const p = new scope.Mod();
    p.init({}, cx); await wait();
    return { p, scope };
  };
  {
    // After a rows read that fails, Retry asks for its files again, and they leave "Loading…".
    const { p, scope } = await paneOf();
    delete p.fileAt("a.ts").hunks; p.version++;
    scope.review = () => Promise.reject(new Error("for now"));
    p.load(cx); await wait();
    assert.equal(p.error, "for now");
    const asks = [];
    scope.review = (root, route, body) => { if (route === "/api/review") asks.push(body.rows); return daemon(root, route, body); };
    p.render(cx); await wait();
    assert.deepEqual(asks, [], "no read again by itself after a failure");
    p.load(cx); await wait();
    assert.deepEqual(plain(asks), [["a.ts"]]);
    assert.ok(!p.error && p.fileAt("a.ts").hunks && !p.items().some(i => i.loading));
    // So does one dropped because a reviewed mark landed meanwhile: the mark's own read asks for them.
    delete p.fileAt("a.ts").hunks; p.version++; asks.length = 0;
    let answer, mark;
    scope.review = (root, route, body) => route === "/api/review" ? (asks.push(body.rows), new Promise(r => { answer = () => r(daemon(root, route, body)); }))
      : route === "/api/review/reviewed" ? new Promise(r => { mark = r; }) : daemon(root, route, body);
    p.load(cx);
    p.setReviewed(p.fileAt("c.ts"), true, cx);
    answer(); await wait(); p.render(cx); await wait();
    assert.equal(asks.length, 1, "dropped, and no read until the mark lands");
    scope.review = (root, route, body) => { if (route === "/api/review") asks.push(body.rows); return daemon(root, route, body); };
    mark({}); await wait();
    assert.deepEqual(plain(asks.at(-1)), ["a.ts"]);
    assert.ok(p.fileAt("a.ts").hunks);
  }
  {
    // A whole file asked for before the file changed doesn't come back over the new version's diff.
    const { p, scope } = await paneOf();
    let whole;
    scope.review = (root, route, body) => route === "/api/review/file" ? new Promise(r => { whole = r; }) : daemon(root, route, body);
    p.toggleFull(p.fileAt("a.ts"), cx);
    const next = { ...p.review, files: p.review.files.map(f => f.path === "a.ts" ? { ...f, sha: "a.ts-v2", hunks: [{ header: "@@", rows: [{ kind: "+", new: 1, tokens: [["NEW"]] }] }] } : f) };
    p.apply(next);
    whole({ rows: [{ kind: "+", new: 1, tokens: [["OLD"]] }] }); await wait();
    const shown = p.items().flatMap(i => i.lines ?? []).flatMap(r => r.tokens.map(([text]) => text));
    assert.ok(shown.includes("NEW") && !shown.includes("OLD") && !p.full.has("a.ts"));
    // A file too large for its diff has no whole file to ask for: larger still, it would pass what a read carries.
    Object.assign(p.fileAt("a.ts"), { truncated: true, hunks: [] });
    p.toggleFull(p.fileAt("a.ts"), cx); p.headerPress(p.fileAt("a.ts"), p.view - 40, cx);
    assert.ok(!p.full.has("a.ts"));
  }
  {
    // A group of a thousand files draws only the aside's rows in view, and the rest as the tree scrolls.
    const files = Array.from({ length: 1000 }, (_, i) => file(`f${i}.ts`));
    const big = { ...review, files, groups: [{ key: "g", label: "G", files: files.map(f => f.path), missing: [], notes: {}, children: [] }] };
    const { p } = await paneOf({ review: async () => structuredClone(big) });
    setPref("fileList", "list"); p.width = 1200; p.listHeight = { "review-files": 280 };
    const tree = () => { drawn.clear(); p.render(cx); return [...drawn].filter(id => id.startsWith("tree-f-")); };
    assert.deepEqual(tree(), Array.from({ length: 10 }, (_, i) => `tree-f-f${i}.ts`));
    handlers.get("review-files.on_scroll_wheel")({ delta: { y: -28 * 500 } }, cx);
    assert.equal(tree()[0], "tree-f-f500.ts");
    setPref("fileList", "tree");
  }
  {
    // A file picked while rows arrive for the files before it: its header still lands at the top, not another's.
    const files = Array.from({ length: 20 }, (_, i) => ({ ...file(`f${i}.ts`, { additions: 100, deletions: 0 }), hunks: undefined }));
    const many = { ...review, files, groups: [{ key: "g", label: "G", files: files.map(f => f.path), missing: [], notes: {}, children: [] }] };
    const { p, scope } = await paneOf({ review: async () => structuredClone(many) });
    const held = [];
    scope.review = (_root, _route, body) => new Promise(r => held.push(() => r({ ...structuredClone(many),
      files: many.files.map(f => body.rows.includes(f.path) ? { ...f, hunks: [{ header: "@@", rows: lines(100) }] } : f) })));
    p.load(cx); timers.length = 0; calls.length = 0;
    p.select("f15.ts", cx);
    held[0](); await wait();
    for (let i = 0; i < 3; i++) { p.frames++; tick(); }
    const scrolled = calls.filter(([name]) => name === "scroll").at(-1)[1];
    assert.equal(p.items()[scrolled].key, "f:f15.ts");
  }
  {
    // Away to another worktree and back before the first's watch returns: one watch goes on there, not two.
    const watched = [];
    const { p } = await paneOf({ watchFolder: (root) => new Promise((resolve, reject) => watched.push({ root, resolve, reject })) });
    const to = async (root) => { p.root = root; p.watching = null; p.forget(); p.load(cx); await wait(); };
    await to("/other"); await to("/repo");
    timers.length = 0;
    for (const w of watched.filter(w => w.root === "/repo")) w.resolve(["/repo/.git/refs/heads/fix"]);
    await wait(); tick(); await wait();
    assert.equal(watched.filter(w => w.root === "/repo").length, 3, "the first, the second, and the second's next");
    // And the other worktree's watch failing late leaves this one's be.
    watched.find(w => w.root === "/other").reject(new Error("late")); await wait();
    assert.equal(p.watching?.root, "/repo");
  }
  {
    // A language picked while the panel's read of the settings is out stays picked once that read, from before, lands.
    let saved = { locale: "en", llm: { provider: "local-agent", agent: "pi" } }, before;
    const { p } = await paneOf({ request: async (_root, method, route, body) => {
      if (route === "/api/agents") return [{ name: "pi", label: "Pi", models: [] }];
      if (method === "PUT") return (saved = structuredClone(body));
      if (!before) return new Promise(r => { before = () => r({ locale: "en", llm: { provider: "local-agent", agent: "pi" } }); });
      return structuredClone(saved);
    } });
    p.shared = structuredClone(saved);
    p.togglePopup("settings", cx); await wait();
    p.settingsPage = "language";
    p.pageRows().find(r => r.id === "locale-ja").pick(cx); await wait();
    before(); await wait();
    assert.deepEqual([saved.locale, p.shared.locale], ["ja", "ja"]);
  }
  {
    // A new list starts at its top, the diff and the aside's files: another worktree, a read after a failed one, an analysis's groups.
    const { p, scope } = await paneOf();
    const tops = () => calls.filter(([name, at]) => name === "scroll" && at === 0).length;
    // The aside one row tall, so its few rows scroll.
    const scrolledDown = () => { calls.length = 0; p.scrollTop = { "review-files": 50 }; };
    const files = () => { p.width = 1200; p.listHeight = { "review-files": 28 }; p.render(cx); return p.scrollTop["review-files"]; };
    files(); scrolledDown();
    p.root = "/other"; p.watching = null; p.forget(); p.load(cx); await wait();
    assert.deepEqual([tops(), files()], [1, 0], "another worktree");
    scrolledDown();
    scope.review = () => Promise.reject(new Error("down"));
    p.open("/commit/c1", cx); await wait();
    scope.review = daemon; p.load(cx); await wait();
    assert.deepEqual([tops(), files()], [1, 0], "Retry after a failed switch");
    scrolledDown();
    scope.review = async (root, route, body) => ({ ...await daemon(root, route, body), groups: [{ ...review.groups[0], key: "ai-1" }] });
    p.load(cx); await wait();
    assert.deepEqual([tops(), files()], [1, 0], "an analysis's groups");
    scrolledDown();
    p.load(cx); await wait();
    assert.deepEqual([tops(), files()], [0, 50], "the same list read again stays where it is");
  }
  {
    // A path with ":" in it: its code lines in view still name it, for the stuck header and the files in view.
    const { p } = await paneOf();
    p.apply({ ...p.review, files: [file("a:b.ts")], groups: [{ key: "g", label: "G", files: ["a:b.ts"], children: [], notes: {}, missing: [] }] });
    const at = p.items().findIndex(i => i.kind === "row");
    p.visible = { start: at, end: at + 1 };
    assert.deepEqual([[...p.visibleFiles()], p.stickyFile()?.path], [["a:b.ts"], "a:b.ts"]);
  }
  {
    // A file asked for that comes back without rows, past what one read carries, is asked for again by the next read.
    const { p, scope } = await paneOf();
    for (const f of [p.fileAt("a.ts"), p.fileAt("c.ts")]) delete f.hunks;
    p.version++;
    const asks = [];
    scope.review = async (root, route, body) => {
      if (route !== "/api/review" && route !== "/api/review/rows") return daemon(root, route, body);
      const asked = body.rows ?? body.files;
      asks.push([route, asked]);
      const r = await daemon(root, route, body);
      // The first file asked for only.
      return { ...r, files: r.files.flatMap(({ hunks, ...f }) => f.path === asked[0] ? [{ ...f, hunks }] : route === "/api/review" ? [f] : []) };
    };
    p.load(cx); await wait(); p.render(cx); await wait();
    assert.deepEqual(plain(asks), [["/api/review", ["a.ts", "c.ts"]], ["/api/review/rows", ["c.ts"]]]);
    assert.ok(p.fileAt("a.ts").hunks && p.fileAt("c.ts").hunks);
  }
  {
    // Two paths can hold one blob (a copied file): rows read for one leave the other to the next batch, not loading for good.
    const twin = { ...review, files: [file("a.ts", { sha: "same" }), file("c.ts", { sha: "same" })], groups: [{ ...review.groups[0], files: ["a.ts", "c.ts"], notes: {}, children: [] }] };
    const bare = ({ hunks, ...f }) => f;
    const { p } = await paneOf({ review: async (_root, route, body) => {
      // The first file asked for only, as past what one read carries.
      if (route === "/api/review/rows") return { files: twin.files.filter(f => f.path === body.files[0]).map(({ path, sha, hunks }) => structuredClone({ path, sha, hunks })) };
      return route === "/api/review" ? { ...structuredClone(twin), files: twin.files.map(bare) } : {};
    } });
    for (let i = 0; i < 3; i++) { p.render(cx); await wait(); }
    assert.ok(p.fileAt("a.ts").hunks && p.fileAt("c.ts").hunks, "both paths read");
  }
  {
    // A read that outlives the timeout: Retry asks for its rows again, rather than leave them to an answer that's dropped.
    const { p, scope } = await paneOf();
    delete p.fileAt("a.ts").hunks; p.version++;
    const held = [];
    scope.review = (root, route, body) => route === "/api/review" ? new Promise(r => held.push([body, () => r(daemon(root, route, body))])) : daemon(root, route, body);
    timers.length = 0;
    p.load(cx); tick();
    assert.ok(p.error && !p.loading);
    p.load(cx);
    assert.deepEqual(plain(held.map(([body]) => body.rows)), [["a.ts"], ["a.ts"]]);
    held[1][1](); await wait();
    assert.ok(!p.error && p.fileAt("a.ts").hunks);
    held[0][1](); await wait();
  }
  {
    // A theme change recolors a whole file too: one shown is read again in the new colors, one read in the old is dropped.
    const { p, scope } = await paneOf(), light = scope.theme, held = [];
    scope.review = (root, route, body) => route === "/api/review/file"
      ? new Promise(r => held.push(() => r({ rows: [{ kind: " ", old: 1, new: 1, tokens: [["x", body.colors.foreground]] }] })))
      : daemon(root, route, body);
    const color = () => p.full.get("a.ts")?.rows[0].tokens[0][1];
    p.toggleFull(p.fileAt("a.ts"), cx); held[0](); await wait();
    assert.equal(color(), "#eeeeee");
    scope.theme = () => ({ ...light(), foreground: "#111111" }); p.render(cx); await wait();
    held.at(-1)(); await wait();
    assert.equal(color(), "#111111", "shown, read again");
    p.toggleFull(p.fileAt("a.ts"), cx); p.toggleFull(p.fileAt("a.ts"), cx);
    const before = held.at(-1);
    scope.theme = () => ({ ...light(), foreground: "#222222" }); p.render(cx); await wait();
    before(); await wait();
    assert.notEqual(color(), "#111111", "in flight, dropped");
    held.at(-1)(); await wait();
    assert.equal(color(), "#222222");
    scope.theme = light;
  }
  {
    // How far code scrolls sideways, kept per file, is what measuring the whole list gives: a fold takes its long line away.
    const { p } = await paneOf();
    p.view = 1000;
    p.fileAt("c.ts").hunks = [{ header: "@@", rows: [{ kind: "+", new: 1, tokens: [["x".repeat(500)]] }] }];
    const whole = () => pref("split") ? ["left", "right", "solo"].map(side => contentWidth(p.items(), side)) : [0, 0, contentWidth(p.items())];
    const split = pref("split");
    for (const mode of [false, true]) {
      setPref("split", mode);
      p.collapsed.delete("c.ts"); p.version++; p.items();
      const open = plain(p.sideWidth);
      assert.deepEqual(open, plain(whole()));
      p.collapsed.add("c.ts"); p.version++; p.items();
      assert.deepEqual(plain(p.sideWidth), plain(whole()));
      assert.ok(Math.max(...p.sideWidth) < Math.max(...open), "folded, narrower");
    }
    setPref("split", split);
  }
  {
    // A folded file's rows aren't read until it's opened: folding a big file is how to keep it off the pane's back.
    const { p } = await paneOf();
    delete p.fileAt("a.ts").hunks; p.collapsed.add("a.ts"); p.version++;
    assert.deepEqual(plain(p.rowsWanted()), []);
    p.collapsed.delete("a.ts"); p.version++;
    assert.deepEqual(plain(p.rowsWanted()), ["a.ts"]);
  }
  // The list draws only a window of its items, from `top`, as a scrolled v_virtual_list does.
  let top = 0;
  const windowed = { v_virtual_list: (_id, count, _sizes, _key, render) => { render({ start: top, end: Math.min(count, top + 40) }).forEach(Boolean); return element(); } };
  {
    // Scrolling a big group, a batch's rows come on their own, not inside the page's every file and group again. The old
    // read's cost is replayed beside each: the same rows inside the whole page, as the daemon answered them before.
    const files = Array.from({ length: 1554 }, (_, i) => ({ ...file(`apps/web/src/features/module-${Math.floor(i / 20)}/component-${i}.tsx`, { additions: 40, deletions: 0 }), hunks: undefined }));
    const hunks = () => [{ header: "@@ -0,0 +1,40 @@", rows: Array.from({ length: 40 }, (_, k) => ({ kind: "+", new: k + 1, tokens: [["const ", "#ff00ff"], [`value${k}`], [" = ", "#888888"], [`"${k}"`, "#00ff00"]] })) }];
    const group = (key, list) => ({ key, label: key, category: "core", critical: false, missing: [], notes: {}, children: [], files: list.map(f => f.path) });
    const page = { ...review, files, groups: [group("code", files.slice(0, 1164)), group("docs", files.slice(1164))] };
    const whole = (rows) => ({ ...page, files: files.map(f => rows.includes(f.path) ? { ...f, hunks: hunks() } : f) });
    const before = [], after = [], reads = [];
    const { p } = await paneOf({ ...windowed, review: async (_root, route, body) => {
      reads.push(route);
      if (route === "/api/review") return structuredClone(whole([...body.rows, ...body.firstRows ? page.groups[0].files.slice(0, 75) : []]));
      if (route !== "/api/review/rows") return {};
      const now = { files: body.files.map(path => ({ path, sha: path, hunks: hunks() })) };
      before.push(JSON.stringify(whole(body.files)).length); after.push(JSON.stringify(now).length);
      return now;
    } });
    top = 0;
    for (let n = 0; n < 500 && p.items().some(i => i.loading); n++) { top = p.items().findIndex(i => i.loading); p.render(cx); await wait(); }
    assert.ok(page.groups[0].files.every(path => p.fileAt(path).hunks), "the whole group read");
    assert.deepEqual(reads.filter(r => r === "/api/review").length, 1, "only the open reads the page");
    const kb = (list) => Math.round(list.reduce((a, b) => a + b, 0) / list.length / 1024), mb = (list) => (list.reduce((a, b) => a + b, 0) / 1e6).toFixed(1);
    console.log(`big group, ${after.length} batches: before ${kb(before)} KB a batch (${mb(before)} MB in all), after ${kb(after)} KB (${mb(after)} MB)`);
    assert.ok(Math.max(...after) * 3 < Math.min(...before), "a batch carries its rows, not the page");
    top = 0;
  }
  {
    // A file cut short, past what one read carries, is read to its end as the list nears it: page by page, each from the
    // row the last stopped top, a page's first hunk going on from the last. A daemon whose diff moved on reads the page again.
    const total = 170000, size = 50000;
    const slice = (from) => {
      const rows = Array.from({ length: Math.min(size, total - from) }, (_, k) => ({ kind: "+", new: from + k + 1, tokens: [["1"]] }));
      return { hunks: [from ? { rows } : { header: "@@ -0,0 +1,170000 @@", rows }], ...from + rows.length < total ? { clipped: true } : {} };
    };
    const big = { ...file("big.js", { status: "added", additions: total, deletions: 0 }), hunks: undefined };
    const page = { ...review, files: [big], groups: [{ key: "g", label: "G", category: "core", critical: false, missing: [], notes: {}, children: [], files: ["big.js"] }] };
    const froms = [], wholes = [];
    let stale = 1, empty = false;
    const { p } = await paneOf({ ...windowed, review: async (_root, route, body) => {
      if (route === "/api/review") return { ...structuredClone(page), files: [{ ...big, ...body.firstRows || body.rows.includes("big.js") ? slice(0) : {} }] };
      if (route === "/api/review/rows") {
        if (body.from && stale-- > 0) return { stale: true };
        froms.push(body.from);
        return { files: [{ path: "big.js", sha: "big.js", ...empty ? { hunks: [], clipped: true } : slice(body.from) }] };
      }
      if (route === "/api/review/file") {
        const from = body.from ?? 0;
        wholes.push(from);
        const rows = Array.from({ length: Math.min(size, total - from) }, (_, k) => ({ kind: " ", old: from + k + 1, new: from + k + 1, tokens: [["1"]] }));
        return { rows, ...from + rows.length < total ? { truncated: true } : {} };
      }
      return {};
    } });
    const cutRow = () => p.items().find(i => i.key === "e:big.js:cut");
    assert.ok(cutRow().loading && cutRow().text === "Loading…", "more to come");
    // Far from its end, no page is asked for.
    top = 0; p.render(cx); await wait();
    assert.deepEqual(froms, []);
    const scroll = async () => { for (let n = 0; n < 20 && cutRow()?.more; n++) { top = p.items().indexOf(cutRow()); p.render(cx); await wait(); } };
    await scroll();
    assert.deepEqual(froms, [50000, 100000, 150000], "after the page read again, from where each stopped");
    const shown = p.fileAt("big.js").hunks;
    assert.ok(shown.length === 1 && shown[0].rows.every((r, i) => r.new === i + 1) && shown[0].rows.length === total, "end to end, in order");
    assert.ok(!cutRow() && !p.fileAt("big.js").clipped);
    // The whole file, cut short too, pages the same way.
    p.toggleFull(p.fileAt("big.js"), cx); await wait();
    await scroll();
    assert.deepEqual(wholes, [0, 50000, 100000, 150000]);
    assert.ok(p.full.get("big.js").rows.every((r, i) => r.new === i + 1) && p.full.get("big.js").rows.length === total && !cutRow());
    // A page that brings nothing can't be got: the rest stays out, said so, and isn't asked for again.
    p.toggleFull(p.fileAt("big.js"), cx);
    Object.assign(p.fileAt("big.js"), slice(0)); p.version++; empty = true; froms.length = 0;
    await scroll();
    assert.deepEqual([froms.length, cutRow().text, cutRow().loading], [1, "The rest of this file is too large to show", false]);
    top = 0;
  }
  {
    // A daemon without the rows route, older than the pane: a batch comes with the whole page instead, no error shown.
    const routes = [];
    const { p } = await paneOf({ review: async (root, route, body) => {
      routes.push(route);
      if (route === "/api/review/rows") throw new Error("jin.review answered 404");
      return daemon(root, route, body);
    } });
    delete p.fileAt("a.ts").hunks; p.version++; routes.length = 0;
    p.render(cx); await wait();
    assert.deepEqual(routes, ["/api/review/rows", "/api/review"]);
    assert.ok(p.fileAt("a.ts").hunks && !p.error && !p.stale);
  }
  {
    // A range with no changes says so, not that a group it doesn't have is empty.
    const { p } = await paneOf();
    p.apply({ ...p.review, files: [], groups: [] });
    drawn.clear(); p.render(cx);
    assert.equal(texts.get("review-empty"), "No changes in this range");
  }
  console.log("ok: pairs, items, notes and heights; the pane renders every analysis state, unified and split; rows only for the group shown, kept across polls; groups as tabs or a sidebar, the aside's files following the list, as a tree or a list; the fold menu; analysis settings and auto analyze; reads that don't undo marks or carry over to another diff; no zoom.");
})();
