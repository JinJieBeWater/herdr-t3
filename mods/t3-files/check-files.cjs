// The Files page's logic outside Herdr: git's answers, ignored marks, the tree's rows, the search, sorting, file kinds, the
// icons' order and files, and the shell scripts it runs, for real, in a throwaway repo.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const load = (file) => fs.readFileSync(path.join(__dirname, file), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (async function|function|const) /gm, "$1 ").replace(/^export \{[\s\S]*?\};?\s*$/m, "");
const context = vm.createContext({});
vm.runInContext([load("vendor/ufuzzy.js"), load("file-icons-data.js"), load("file-icons.js"), load("file-tree.js"), load("model.js"),
  "globalThis.m = { join, uFuzzy, fileIcon, folderIcon, FILE_NAMES, FILE_EXTENSIONS, FOLDER_NAMES, LIST, IGNORED, PROBE, REMOTE_SEARCH, RANKED, ancestors, parseListing, parseStatus, parseIgnored, markIgnored, folderEntries, treeRows, terms, narrows, filterPaths, rank, kindOf, languageOf, readProblem, failedRead, ticket };"].join("\n"), context);
const m = context.m;
const plain = (v) => JSON.parse(JSON.stringify(v));

// A fake `herdr` element tree, and finding in it.
function element(...made) {
  const node = { key: undefined, items: [], handlers: {}, calls: {}, made };
  const proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    return (...args) => {
      if (key === "when") { if (args[0]) args[1](proxy); }
      else if (key === "child") node.items.push(args[0]);
      else if (key === "children") node.items.push(...args[0]);
      else if (key === "id") node.key = args[0];
      else if (String(key).startsWith("on_")) node.handlers[typeof args[0] === "string" ? `${key}:${args[0]}` : key] = args.at(-1);
      else node.calls[key] = args;
      return proxy;
    };
  } });
  return proxy;
}
const walk = (node, out = []) => { if (node && typeof node === "object" && node.items) { out.push(node); node.items.forEach((c) => walk(c, out)); } return out; };
const find = (root, id) => walk(root).find((n) => n.key === id) ?? null;
const labels = (root) => walk(root).map((n) => n.calls.accessibility_label?.[0]).filter(Boolean);
const space = (id, folder, active = false, machine = null) => ({ id, folder, machine, active, tabs: [] });

// The page, started in a fake `herdr`: the panel on `page` with Review installed too, every folder holding a.js (changed) and
// b.js. Each folder is in Git but `/n…`. `w` is the world: what ran, what's watched, the editors made, reads held back.
function makePage({ page = "files", spaces = [space("s1", "/r", true)] } = {}) {
  const w = { spaces, windowActive: true, ran: [], read: [], watchers: [], made: [], hold: null, held: [], stall: null, stalled: [], files: ["a.js", "b.js"], notified: 0 };
  const shared = { "t3.wrap": false, "t3.navWidth": 300 }, wrote = [], store = new Map(), timers = [], everies = [], failed = [];
  const commands = [];
  let wake = null, running = null;
  const exec = async (cmd, args, o = {}) => {
    const line = [cmd, ...args].join(" "), cwd = o.cwd ?? (cmd === "sh" ? args[3] : "") ?? "";
    w.ran.push({ line, cwd, on: o.on ?? null });
    if (w.stall?.(line)) await new Promise((r) => w.stalled.push(r));
    if (line.includes("rev-parse")) return cwd.startsWith("/n") ? { code: 128, stdout: "" } : { code: 0, stdout: `${cwd}\n\n` };
    if (cmd === "pwd") return { code: 0, stdout: `${cwd}\n` };
    if (line.includes(" status ")) return { code: 0, stdout: "1 .M N... 100644 100644 100644 h1 h2 a.js\0" };
    if (line.includes("ls-files")) return { code: 0, stdout: w.files.map((f) => `${f}\0`).join("") };
    if (cmd === "sh" && args[1] === m.LIST) return { code: 0, stdout: cwd.endsWith("/src") ? "d\0d\0" : "f\0a.js\0f\0b.js\0" };
    if (cmd === "sh" && args[1] === m.PROBE) return { code: 0, stdout: "12 0\n" };
    return { code: 0, stdout: "" };
  };
  const task = () => ({ cancelled: false, done: false, cancel() { this.cancelled = true; }, is_done() { return this.done || this.cancelled; } });
  // As Herdr's: cancelling a task stops nothing already awaited (a watch, an exec); it only says it's done.
  const cx = {
    notify() { w.notified++; }, stop_propagation() {}, write_to_clipboard() {}, focus_handle: () => ({ focus() {}, is_focused: () => false }),
    spawn(f) {
      const t = task();
      Promise.resolve().then(() => { running = t; try { return f(cx); } finally { running = null; } }).then(() => { t.done = true; }, (e) => failed.push(e));
      return t;
    },
    sleep: async () => {},
    timer: { every(ms, f) { everies.push([ms, f]); return task(); }, after(ms, f) { timers.push([ms, f]); return task(); } },
  };
  const settle = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); if (failed.length) throw failed[0]; };
  const fire = async (ms) => { for (const [at, f] of timers.splice(0)) if (at <= ms) f(cx); else timers.push([at, f]); await settle(); };
  // A second of Herdr's clock: what runs on the page's repeating timers, hidden or not.
  const tick = async () => { for (const [, f] of everies) f(cx); await settle(); await fire(0); };
  const body = { id: "panel-body", active: page, children: [{ id: "files" }, { id: "review" }] };
  const layout = { id: "root", children: [{ id: "work" }, { id: "panel", children: [body] }] };
  const ctx = vm.createContext({
    View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element,
    Input: { new: element }, Editor: { new: element }, TextView: { markdown: element },
    InputState: { new: () => { let v = ""; return { on() {}, value: () => v, set_value(x) { v = x; } }; } },
    EditorState: { new: (o) => { const e = { wrap: o.soft_wrap, text: o.value, released: false, release() { this.released = true; return true; } }; w.made.push(e); return e; } },
    spaces: () => w.spaces, agents: () => [], layout: () => layout,
    theme: () => ({}), settings: () => ({ zoom: 1, font_family: "mono" }), window: () => ({ active: w.windowActive, platform: "macos" }), appHome: () => "/tmp/none",
    shared: (k) => shared[k], setShared: (k, v) => { wrote.push(k); shared[k] = v; },
    run() {}, notify() {}, exec,
    readTextFile: async (p) => { w.read.push(p); return w.hold && p.startsWith(w.hold) ? new Promise((r) => w.held.push(() => r("held\n"))) : "const a = 1;\n"; },
    watchFolder: (p) => new Promise((resolve, reject) => w.watchers.push({ path: p, task: running, resolve, reject })),
    nextCommand: () => commands.length ? Promise.resolve(commands.shift()) : new Promise((r) => { wake = r; }),
    fs: { unlink: async () => {}, mkdir: async () => {}, writeFile: async () => {} },
    localStorage: { getItem: (k) => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    Date, Promise, Math, Number, String, Boolean, Map, Set, Object, Array, JSON, RegExp, Error, Uint8Array,
  });
  const files = ["vendor/ufuzzy.js", "store.js", "list.js", "panel.js", "file-icons-data.js", "file-icons.js", "file-tree.js", "nav-column.js", "file-menu.js", "panel-states.js", "model.js", "main.js"];
  const buttons = "const drawButton = (() => {\n" + load("button.js") + "\nreturn button;\n})();\n";
  vm.runInContext((buttons + files.map(load).join("\n")).replace("export default class", "globalThis.Mod = class"), ctx);
  const send = (c) => { if (wake) { const x = wake; wake = null; x(c); } else commands.push(c); };
  const view = new ctx.Mod();
  view.init({}, cx);
  const show = (p) => { body.active = p; };
  const activate = (id) => { w.spaces = w.spaces.map((s) => ({ ...s, active: s.id === id })); };
  return { view, cx, w, settle, fire, tick, send, shared, wrote, store, show, activate };
}

async function page() {
  const { view, cx, settle, fire, send, shared, wrote, store } = makePage();
  // Its own choices start from the ones both pages used to share; after that, they're this page's.
  assert.equal(store.get("lines.wrap"), "false", "the old shared wrap is this page's first");
  assert.equal(store.get("nav.width"), "300", "the old shared width is this page's first");
  let root = view.render(cx);
  await settle();
  root = view.render(cx);
  assert.ok(find(root, "row-a.js") && find(root, "row-b.js"), "the folder's files in the tree");

  // A file Review also has opens here alone: no Open in Review in the toolbar or the menu, nothing asked of Review.
  send("open:a.js");
  await settle();
  root = view.render(cx);
  assert.ok(find(root, "t3-files-code"), "the file shows");
  assert.equal(find(root, "t3-files-review"), null, "no Open in Review button");
  assert.ok(!labels(root).includes("Open in Review"));
  find(root, "row-a.js").handlers["on_mouse_down:right"]();
  root.handlers["on_mouse_down:right"]({ local_position: { x: 10, y: 10 } }, cx);
  root = view.render(cx);
  const items = walk(find(root, "file-menu")).map((n) => n.key).filter((k) => k?.startsWith("file-menu-"));
  assert.ok(items.includes("file-menu-copy-path"), "the row's menu opens");
  assert.ok(!items.some((k) => /open-review|open-files/.test(k)), `no cross-page items: ${items}`);
  find(root, "file-menu-backdrop").handlers["on_mouse_down:left"]({}, cx);

  // Review's old ask to show a file here is left alone.
  shared["t3-files.reveal"] = { space: "s1", file: "b.js", n: Date.now() + 60000 };
  view.render(cx);
  await fire(0);
  root = view.render(cx);
  assert.ok(find(root, "crumb-a.js") && !find(root, "crumb-b.js"), "still on a.js");

  // Wrap is this page's: the button writes nothing both pages share.
  find(root, "t3-files-wrap").handlers.on_click({}, cx);
  assert.equal(store.get("lines.wrap"), "true");
  assert.equal(shared["t3.wrap"], false, "the old shared wrap is left as it was");
  root = view.render(cx);
  await fire(0);
  assert.equal(view.current().view.code.wrap, true, "the editor made again, wrapped");

  // The code keeps the width it was laid out at while its room moves, cut off; the new one once it holds 300 ms.
  const code = () => find(view.render(cx), "t3-files-code");
  const editorWidth = () => code().items[0].calls.w?.[0];
  assert.ok(code().calls.overflow_hidden, "cut off, not scrolled");
  code().handlers.on_size_change({ width: 600, height: 400 }, cx);
  assert.equal(editorWidth(), 600, "the first width at once");
  code().handlers.on_size_change({ width: 640, height: 400 }, cx);
  assert.equal(editorWidth(), 600, "held while it moves");
  await fire(299);
  assert.equal(editorWidth(), 600);
  await fire(300);
  assert.equal(editorWidth(), 640, "the room held: its width");

  // Search and the keyboard's command still work; neither page wrote a request to the other.
  send("search:b");
  await settle();
  root = view.render(cx);
  assert.ok(find(root, "found-0"), "search finds it");
  assert.deepEqual(wrote.filter((k) => /reveal/.test(k)), [], "no cross-page request");
}

// It works only for what shows: the Files page, open, in the window in front, for the active space; nothing is watched, so
// nothing runs behind it. The last 3 spaces shown keep all they read; older ones keep their file and open folders, and read
// again when back. A space closed lets go of all of it.
async function resources() {
  const { view, cx, w, tick, settle, show, activate, send } = makePage({ page: "review", spaces: [space("s1", "/r1", true)] });
  const ran = () => w.ran.splice(0).map((r) => r.line);
  const st = (id) => view.states.get(id);
  const full = () => [...view.states.values()].filter((s) => s.entries.size).map((s) => s.id);
  await settle(); ran();

  // Hidden: drawn or not, a while on, nothing read.
  view.render(cx); await tick(); await tick();
  assert.deepEqual(ran(), [], "hidden: no I/O");
  // Shown: read at once.
  show("files"); await tick();
  let lines = ran();
  assert.ok(lines.some((l) => l.includes("rev-parse")) && lines.some((l) => l.includes(" status ")) && lines.some((l) => l.includes(m.LIST)), `read: ${lines}`);
  assert.ok(view.render(cx) && st("s1").entries.has(""));
  // While it shows, asked again every 5 s here; a refresh that took long asks less often (10 times as long), a minute at most.
  await tick();
  assert.deepEqual(ran(), [], "not again within 5 s");
  st("s1").refreshed -= 5000; await tick();
  assert.ok(ran().some((l) => l.includes(" status ")), "again after 5 s");
  st("s1").refreshed -= 5000; st("s1").took = 1000; await tick();
  assert.deepEqual(ran(), [], "a 1 s refresh: not again for 10 s");
  st("s1").refreshed -= 5000; await tick();
  assert.ok(ran().some((l) => l.includes(" status ")), "again after 10 s");
  st("s1").refreshed -= 59000; st("s1").took = 60000; await tick();
  assert.deepEqual(ran(), []);
  st("s1").refreshed -= 1000; await tick();
  assert.ok(ran().some((l) => l.includes(" status ")), "a minute at most");
  st("s1").took = 0;

  // A search showing is found again with each refresh: a file gone leaves it, a new one joins, the lit one stays lit.
  send("search:js"); await settle();
  const paths = () => plain(st("s1").results.map((r) => r.path).sort());
  const lit = () => st("s1").results[st("s1").at].path;
  assert.deepEqual(paths(), ["a.js", "b.js"]);
  st("s1").at = st("s1").results.findIndex((r) => r.path === "b.js");
  w.files = ["0.js", "b.js", "c.js"]; st("s1").refreshed -= 5000; await tick();
  assert.deepEqual(paths(), ["0.js", "b.js", "c.js"], "refreshed: a.js gone, 0.js and c.js in");
  assert.equal(lit(), "b.js", "the lit result stays lit");
  assert.ok(st("s1").at > 0, "lit where it now is, not the first");
  w.files = ["c.js", "d.js", "e.js"]; st("s1").refreshed -= 5000; await tick();
  assert.deepEqual(paths(), ["c.js", "d.js", "e.js"]);
  assert.equal(st("s1").at, 0, "the lit one gone: the first");
  send("search:"); await settle(); w.files = ["a.js", "b.js"];

  // An image shown is copied once: a refresh leaves it be (picking it again reads it again).
  send("open:p.png"); await settle();
  assert.ok(ran().includes("cp /r1/p.png " + st("s1").view.image.replace("cache/", "/tmp/none/cache/")), "the image copied");
  st("s1").refreshed -= 5000; await tick();
  assert.ok(!ran().some((l) => l.startsWith("cp ")), "a refresh copies it no more");

  // Hidden while a folder opens (`src` holds just `d`, which would open with it) or a path is revealed, before the timer
  // has seen it: what comes back is dropped, nothing more is asked, nothing drawn.
  const hiddenMid = async (start, what) => {
    w.stall = (l) => l.includes(m.LIST) && l.endsWith("/r1/src"); start(); await settle();
    assert.equal(w.stalled.length, 1, `${what}: listing src`);
    ran(); show("review"); const notified = w.notified;
    w.stall = null; w.stalled.splice(0).forEach((r) => r()); await settle();
    assert.deepEqual(ran(), [], `${what}: nothing asked after`);
    assert.equal(w.notified, notified, `${what}: nothing drawn`);
    assert.ok(!st("s1").entries.has("src"), `${what}: the answer dropped`);
    show("files"); await tick(); ran();
  };
  await hiddenMid(() => view.toggle(st("s1"), "src", cx), "a folder opening");
  st("s1").expanded.clear(); st("s1").entries.delete("src");
  await hiddenMid(() => view.reveal(st("s1"), "src/d/x.js", cx), "a path revealed");
  st("s1").expanded.clear(); st("s1").entries.delete("src");

  // Hidden mid-read: what comes back is dropped, and nothing more is asked, the open file not read again.
  send("open:a.js"); await settle();
  st("s1").refreshed -= 5000; w.stall = (l) => l.includes(" status "); await tick();
  show("review"); await tick();
  const version = st("s1").version, refreshed = st("s1").refreshed, notified = w.notified;
  ran(); w.read.length = 0; w.stall = null; w.stalled.splice(0).forEach((r) => r()); await settle();
  assert.deepEqual([st("s1").refreshed, w.notified], [refreshed, notified], "hidden: a late refresh notes and draws nothing");
  await tick(); st("s1").refreshed -= 60000; await tick();
  assert.deepEqual(ran(), [], "hidden: a late answer asks nothing more, and no poll");
  assert.deepEqual(w.read, [], "hidden: the file not read again");
  assert.equal(st("s1").version, version, "hidden: a late answer is dropped");
  // The window behind: the same.
  show("files"); await tick(); ran();
  w.windowActive = false; st("s1").refreshed -= 60000; await tick();
  assert.deepEqual(ran(), [], "window behind: no I/O");
  w.windowActive = true; await tick();
  assert.ok(ran().some((l) => l.includes(" status ")), "in front again: read at once");

  // Outside Git and on another machine: listed, asked again while shown (another machine every 10 s).
  w.spaces = [...w.spaces, space("n", "/n"), space("v", "/x", false, "vps")];
  // Hidden while it asks Git where it is: nothing asked after.
  w.stall = (l) => l.includes("rev-parse"); activate("n"); await tick(); show("review");
  w.stall = null; w.stalled.splice(0).forEach((r) => r()); await settle();
  assert.deepEqual(ran(), ["git rev-parse --show-toplevel --show-prefix"], "hidden mid-load: nothing more");
  assert.equal(st("n").git, undefined, "hidden mid-load: Git's answer dropped, so it loads again when back");
  show("files"); await tick();
  assert.ok(ran().some((l) => l.includes(m.LIST)), "outside Git: listed");
  activate("v"); await tick();
  assert.ok(w.ran.filter((r) => r.line.includes(m.LIST)).every((r) => r.on === "vps") && w.ran.some((r) => r.on === "vps"), "another machine's, there");
  ran();
  assert.ok(view.render(cx) && st("v").entries.has(""), "another machine's tree");
  st("v").refreshed -= 5000; await tick();
  assert.deepEqual(ran(), [], "another machine: not within 10 s");
  st("v").refreshed -= 5000; await tick();
  assert.ok(ran().some((l) => l.includes(" status ")), "another machine: again after 10 s");
  // Hidden while another machine's file is checked: it isn't read after.
  w.stall = (l) => l.includes(m.PROBE); view.open(st("v"), "a.js", cx); await settle();
  assert.equal(w.stalled.length, 1, "probing");
  w.read.length = 0; ran(); w.windowActive = false;
  w.stall = null; w.stalled.splice(0).forEach((r) => r()); await settle();
  assert.deepEqual([ran(), w.read], [[], []], "hidden mid-probe: not read");
  w.windowActive = true; await tick();
  assert.ok(w.read.includes("/x/a.js"), "back: read");
  ran();
  assert.equal(w.watchers.length, 0, "nothing ever watched");

  // Four spaces, a file open in each: the oldest lets go of what it read, its editor released, and keeps its file and folders.
  w.spaces = ["s1", "s2", "s3", "s4"].map((id, i) => space(id, `/r${i + 1}`, id === "s1"));
  await tick();
  assert.ok(!view.states.has("n") && !view.states.has("v"), "closed spaces dropped");
  st("s1").expanded.add("src");
  for (const id of ["s1", "s2", "s3", "s4"]) {
    activate(id); await tick(); send("open:a.js"); await settle();
    if (id === "s1") { send("search:b"); await settle(); }
    view.render(cx);
  }
  const old = st("s1");
  assert.equal(st("s1").file, "a.js");
  assert.deepEqual([st("s1").query, st("s1").results], ["b", null], "its search's words kept, not its results");
  assert.deepEqual(full(), ["s2", "s3", "s4"], "three spaces keep all they read");
  assert.equal(old.view, null, "s1's view let go");
  assert.ok(w.made.filter((e) => e.text).length >= 4 && w.made.every((e) => e === st("s2").view?.code || e === st("s3").view?.code || e === st("s4").view?.code || e.released), "every other editor released");
  // Back: read again, its file too.
  w.read.length = 0; ran();
  activate("s1"); await tick();
  assert.ok(ran().some((l) => l.includes(" status ")) && w.read.includes("/r1/a.js"), "back: read again");
  assert.ok(st("s1").view?.code && !st("s1").view.code.released, "its file in an editor again");
  assert.ok(st("s1").expanded.has("src"), "its folders as they were");
  assert.deepEqual(plain(st("s1").results.map((r) => r.path)), ["b.js"], "its search found again");
  assert.deepEqual(full(), ["s3", "s4", "s1"]);

  // A read still under way when its space lets go comes back to nothing: no editor made, nothing kept.
  w.hold = "/r2"; activate("s2"); await tick();
  assert.equal(w.held.length, 1, "s2's file being read");
  for (const id of ["s3", "s4", "s1"]) { activate(id); await tick(); }
  assert.deepEqual(full(), ["s3", "s4", "s1"], "s2 let go");
  const made = w.made.length;
  w.held.splice(0).forEach((r) => r()); await settle();
  assert.equal(w.made.length, made, "a stale read makes no editor");
  assert.equal(st("s2").view, null, "and leaves nothing behind");
  w.hold = null;

  // A space closed: all of it let go.
  const gone = st("s3").view.code;
  w.spaces = w.spaces.filter((s) => s.id !== "s3"); await tick();
  assert.ok(!view.states.has("s3") && gone.released, "a closed space's editor released");
}

(async () => {
  // A listing in the tree's order: folders first, then names as people read them (shared/check-file-tree.cjs has the order).
  assert.deepEqual(plain(m.parseListing("f\0file10\0f\0file2\0")).map((e) => e.name), ["file2", "file10"]);
  assert.deepEqual(plain(m.parseListing("f\0b.txt\0d\0src\0f\0a b.md\0")), [{ name: "src", dir: true }, { name: "a b.md", dir: false }, { name: "b.txt", dir: false }]);
  assert.deepEqual(plain(m.ancestors("a/b/c.js")), ["a", "a/b"]);
  assert.deepEqual([m.join("", "a"), m.join("a", ""), m.join("/r/", "a"), m.join("/", "a")], ["a", "a", "/r/a", "/a"]);

  // Porcelain v2: ordinary, renamed (its origin follows), conflicted, untracked; a path with spaces; outside the folder left out.
  const status = [
    "# branch.oid abc", "1 .M N... 100644 100644 100644 h1 h2 sub/src/a b.js", "1 A. N... 000000 100644 100644 h0 h1 sub/new.js",
    "1 .D N... 100644 100644 000000 h1 h1 sub/gone/x.js", "1 MD N... 100644 100644 000000 h1 h2 sub/md.js",
    "2 R. N... 100644 100644 100644 h1 h1 R100 sub/to.js", "sub/from.js", "u UU N... 100644 100644 100644 100644 h1 h2 h3 sub/conf.txt",
    "? sub/untracked dir/f.txt", "1 .M N... 100644 100644 100644 h1 h2 other/z.js", "",
  ].join("\0");
  const s = m.parseStatus(status, "sub/");
  assert.deepEqual(Object.fromEntries(s.marks), { "src/a b.js": "M", "new.js": "A", "gone/x.js": "D", "md.js": "D", "to.js": "R", "conf.txt": "M", "untracked dir/f.txt": "A" });
  assert.deepEqual(plain([...s.dirs].sort()), ["gone", "src", "untracked dir"]);
  assert.equal(m.parseStatus(status, "").marks.get("other/z.js"), "M", "no prefix: the whole repo");
  assert.equal(m.parseStatus(status, "").marks.has("sub/from.js"), false, "a rename's origin isn't a change of its own");

  // Ignored: what Git names now, the rest cleared; the tree dims all under an ignored folder, and shows a deleted file.
  const ignored = new Set(["dist", "old.log"]);
  m.markIgnored(ignored, "", [{ name: "dist", dir: true }, { name: "old.log", dir: false }, { name: "src", dir: true }], m.parseIgnored("dist/\0"));
  assert.deepEqual(plain([...ignored]), ["dist"]);
  const tree = { entries: new Map([["", [{ name: "dist", dir: true }, { name: "src", dir: true }, { name: "a.md", dir: false }]], ["dist", [{ name: "x.js", dir: false }]], ["src", [{ name: "b.js", dir: false }]]]),
    expanded: new Set(["dist", "src"]), ignored, marks: new Map([["src/c.js", "D"], ["src/b.js", "M"]]) };
  const rows = (st) => m.treeRows(m.folderEntries(st), (p) => st.expanded.has(p));
  assert.deepEqual(plain(rows(tree)).map((r) => [r.path, r.depth, r.ignored, r.gone]),
    [["dist", 0, true, false], ["dist/x.js", 1, true, false], ["src", 0, false, false], ["src/b.js", 1, false, false], ["src/c.js", 1, false, true], ["a.md", 0, false, false]]);
  tree.expanded.delete("src");
  assert.equal(rows(tree).some((r) => r.path.startsWith("src/")), false, "a closed folder's rows go");
  // A folder holding just a folder is one row with it once open, ignored as its last folder is.
  const chain = { entries: new Map([["", [{ name: "a", dir: true }]], ["a", [{ name: "b", dir: true }]], ["a/b", [{ name: "c.js", dir: false }]]]),
    expanded: new Set(["a", "a/b"]), ignored: new Set(["a/b"]), marks: new Map() };
  assert.deepEqual(plain(rows(chain)).map((r) => [r.path, r.name, r.ignored]), [["a/b", "a / b", true], ["a/b/c.js", "c.js", true]]);

  // Search: every term, case aside; a longer query starts from the last one's matches; it pauses every 5000, and stops
  // when a newer query comes.
  assert.deepEqual(plain(m.terms("  Review  DIFF ")), ["review", "diff"]);
  assert.equal(m.narrows("review d", "review"), true);
  assert.equal(m.narrows("revie", "review"), false);
  const paths = Array.from({ length: 12000 }, (_, i) => `packages/pkg-${i % 7}/src/Component-${i}.tsx`), lower = paths.map((p) => p.toLowerCase());
  let pauses = 0;
  const pause = async () => { pauses++; };
  const all = await m.filterPaths(lower, m.terms("PKG-3 component-1"), null, pause);
  assert.equal(pauses, 2, "12000 paths: two pauses");
  assert.ok(all.length > 0 && all.every((i) => paths[i].includes("pkg-3") && paths[i].includes("Component-1")));
  const narrower = await m.filterPaths(lower, m.terms("pkg-3 component-11"), all, pause);
  assert.deepEqual(plain(narrower), plain(await m.filterPaths(lower, m.terms("pkg-3 component-11"), null, pause)), "from the last matches, the same as from all");
  let calls = 0;
  assert.equal(await m.filterPaths(lower, ["src"], null, pause, () => ++calls < 1), null, "a newer query stops it");

  // Ranking: uFuzzy's best first with the letters it matched; what it can't match (terms out of order) after; at most `limit`.
  const uf = new m.uFuzzy();
  const ranked = plain(m.rank(uf, ["docs/review/notes.md", "extras/mods/review/diff.js", "diff/review.js"], "review diff", 10));
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].path, "extras/mods/review/diff.js");
  assert.deepEqual(ranked[0].ranges.map(([a, b]) => "extras/mods/review/diff.js".slice(a, b)).join("|"), "review|diff");
  assert.deepEqual(ranked.find((r) => r.path === "diff/review.js").ranges, [], "out of order: kept, unmarked");
  assert.equal(m.rank(uf, paths.slice(0, 50), "src", 20).length, 20);

  // Kinds and the Editor's languages.
  assert.equal(m.kindOf("a/Logo.PNG"), "image");
  assert.equal(m.kindOf("README.md"), "markdown");
  assert.equal(m.kindOf("Makefile"), "text");
  for (const [name, lang] of [["a.tsx", "js"], ["a.jsonc", "json"], ["a.yml", "yaml"], ["a.rs", "rust"], ["Makefile", "makefile"], ["GNUmakefile", "makefile"], ["a.hpp", "cpp"], ["a.toml", undefined], ["a.md", undefined], ["Dockerfile", undefined]])
    assert.equal(m.languageOf(name), lang, name);
  assert.match(m.readProblem(new Error("Text file exceeds 1 MiB")), /larger than 1 MB/);
  assert.deepEqual([m.failedRead("This file can't be read."), m.failedRead("This image can't be read."), m.failedRead("This is a binary file, so there's no text to show."), m.failedRead("This file was deleted.")], [true, true, false, false], "a failed read is retried from the error bar; what a file is, said on the page");
  assert.match(m.readProblem("stream did not contain valid UTF-8"), /binary/);
  assert.match(m.readProblem("Is a directory (os error 21)"), /can't be read/);

  // A newer request of the same kind makes the older one's answer stale; another kind's doesn't.
  const st = {};
  const first = m.ticket(st, "file"), list = m.ticket(st, "list:"), second = m.ticket(st, "file");
  assert.equal(first(), false);
  assert.equal(second(), true);
  assert.equal(list(), true);

  // Icons, in VS Code's order: the name with its folder, the name, the longest extension, the plain file; case aside.
  assert.equal(m.fileIcon("index.D.ts"), "icons/cat/typescript-def.svg");
  assert.equal(m.fileIcon("src/app.ts"), "icons/cat/typescript.svg", "a path: its name");
  assert.equal(m.fileIcon("PACKAGE.json"), `icons/cat/${m.FILE_NAMES["package.json"]}.svg`);
  assert.equal(m.fileIcon("ci.yml", ".github/workflows/ci.yml"), `icons/cat/${m.FILE_EXTENSIONS["workflows/yml"]}.svg`);
  assert.notEqual(m.FILE_EXTENSIONS["workflows/yml"], m.FILE_EXTENSIONS.yml);
  assert.equal(m.fileIcon("no-such.thing"), "icons/cat/_file.svg");
  assert.equal(m.fileIcon("constructor"), "icons/cat/_file.svg", "not Object's");
  assert.equal(m.folderIcon("packages/cli/SRC", true), "icons/cat/folder_src_open.svg");
  assert.equal(m.folderIcon("whatever"), "icons/cat/_folder.svg");
  // Every icon the data names is in this mod's icons/cat: a missing one draws nothing.
  const names = new Set(["_file", "_folder", "_folder_open", ...Object.values(m.FILE_NAMES), ...Object.values(m.FILE_EXTENSIONS), ...Object.values(m.FOLDER_NAMES).flatMap((f) => [f, `${f}_open`])]);
  for (const n of names) assert.ok(fs.existsSync(path.join(__dirname, "icons/cat", `${n}.svg`)), `icons/cat/${n}.svg`);

  // The shell scripts, run: listing, ignored, the remote probe and search, in a repo with awkward names.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t3-files-check-"));
  try {
    const sh = (script, args, cwd = dir) => execFileSync("sh", ["-c", script, "t3-files", ...args], { cwd, encoding: "latin1", stdio: ["ignore", "pipe", "ignore"] });
    const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: dir });
    git("init", "-q");
    fs.mkdirSync(path.join(dir, "src/deep"), { recursive: true });
    fs.mkdirSync(path.join(dir, "node_modules/pkg"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n*.log\n");
    fs.writeFileSync(path.join(dir, "src/Read Me.md"), "# hi\n");
    fs.writeFileSync(path.join(dir, "src/deep/Main.TS"), "x\n");
    fs.writeFileSync(path.join(dir, ".env"), "A=1\n");
    fs.writeFileSync(path.join(dir, "app.log"), "log\n");
    fs.writeFileSync(path.join(dir, "node_modules/pkg/i.js"), "\n");
    fs.writeFileSync(path.join(dir, "bin.dat"), Buffer.from([1, 0, 2, 3]));
    git("add", "-A");
    git("commit", "-qm", "x");
    assert.deepEqual(plain(m.parseListing(sh(m.LIST, [dir]))).map((e) => `${e.dir ? "d" : "f"}:${e.name}`),
      ["d:node_modules", "d:src", "f:.env", "f:.gitignore", "f:app.log", "f:bin.dat"], ".git left out, dotfiles in");
    assert.throws(() => sh(m.LIST, [path.join(dir, "nope")]), "a folder that's gone fails");
    assert.deepEqual(plain([...m.parseIgnored(sh(m.IGNORED, [dir, ""]))].sort()), ["app.log", "node_modules"]);
    assert.deepEqual(plain([...m.parseIgnored(sh(m.IGNORED, [path.join(dir, "src"), "src/"]))]), [], "nothing ignored: no failure");
    assert.equal(sh(m.PROBE, [path.join(dir, "bin.dat")]).trim(), "4 1");
    assert.equal(sh(m.PROBE, [path.join(dir, "src/Read Me.md")]).trim(), "5 0");
    assert.throws(() => sh(m.PROBE, [path.join(dir, "nope")]));
    const search = (q) => sh(m.REMOTE_SEARCH, [q]).split("\n").filter(Boolean).sort();
    assert.deepEqual(search("main src"), ["src/deep/Main.TS"]);
    assert.deepEqual(search("read me"), ["src/Read Me.md"]);
    assert.deepEqual(search("'\\\"$(x)"), [], "the query is data");
    assert.deepEqual(search("pkg"), [], "ignored files aren't searched");
    fs.rmSync(path.join(dir, ".git"), { recursive: true });
    assert.deepEqual(search("pkg"), ["node_modules/pkg/i.js"], "outside Git: find");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  await page();
  await resources();
  console.log("t3-files checks passed");
})().catch((e) => { console.error(e); process.exit(1); });
