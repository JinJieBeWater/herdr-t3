// The space panel's file tree as data: flattened folders, Review's paths in their order, the row a path is in, and the keys.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "file-tree.js"), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.tree = { treeRows, pathEntries, rowAt, treeKey };";
// The row as drawn: each element a tag and what it holds, in order.
const el = (tag) => { const node = { tag, kids: [] }; const p = new Proxy(node, { get: (t, k) => k in t ? t[k] : k === "child" ? (c) => (t.kids.push(c), p)
  : k === "when" ? (c, f) => (c ? f(p) : p) : () => p }); return p; };
const context = vm.createContext({ div: () => el("div"), svg: () => el("svg"), image: () => el("icon"), h_flex: () => el("row"), fileIcon: () => "", folderIcon: () => "" });
vm.runInContext(src.replace("globalThis.tree = { treeRows,", "globalThis.tree = { treeRow, treeRows,"), context);
const { treeRows, pathEntries, rowAt, treeKey, treeRow } = context.tree;
const plain = (v) => JSON.parse(JSON.stringify(v));
const shape = (rows) => plain(rows).map((r) => `${"  ".repeat(r.depth)}${r.dir ? (r.open ? "v " : "> ") : ""}${r.name}`);

// Review's paths, in the diff's order: folders where their first path comes, a chain of lone folders one row.
const kids = pathEntries(["packages/cli/src/a.ts", "README.md", "packages/cli/src/daemon/b.ts", "gone/c.ts"].map((p) => ({ path: p, missing: p.startsWith("gone") })));
const all = treeRows((rel) => kids.get(rel) ?? [], () => true);
assert.deepEqual(shape(all), ["v packages / cli / src", "  a.ts", "  v daemon", "    b.ts", "README.md", "v gone", "  c.ts"]);
assert.deepEqual([all[0].path, all[0].top, all[6].missing, all[6].path], ["packages/cli/src", "packages", true, "gone/c.ts"]);

// A closed folder stops the chain at it and hides what's under it; a closed chain's end shows the chain, closed.
const shut = new Set(["packages/cli"]);
assert.deepEqual(shape(treeRows((rel) => kids.get(rel) ?? [], (p) => !shut.has(p))).slice(0, 2), ["> packages / cli", "README.md"]);
shut.clear(); shut.add("packages/cli/src");
assert.deepEqual(shape(treeRows((rel) => kids.get(rel) ?? [], (p) => !shut.has(p))).slice(0, 2), ["> packages / cli / src", "README.md"]);
// A lone folder's entries come with the row: the last folder's, as Files dims what Git ignores.
const lone = new Map([["", [{ name: "a", dir: true }]], ["a", [{ name: "b", dir: true, ignored: true }]], ["a/b", [{ name: "x", dir: false }]]]);
const loneRows = treeRows((rel) => lone.get(rel) ?? [], () => true);
assert.deepEqual(plain(loneRows.map((r) => [r.path, r.name, r.ignored ?? false])), [["a/b", "a / b", true], ["a/b/x", "x", false]]);

// The row a path is in: its own, or the flattened one it's a folder of; nothing past it.
assert.equal(rowAt(all, "packages/cli"), 0);
assert.equal(rowAt(all, "packages"), 0);
assert.equal(rowAt(all, "packages/cli/src/daemon"), 2);
assert.equal(rowAt(all, "pack"), -1, "a name's start isn't a folder");
assert.equal(rowAt(all, "nope"), -1);

// Keys: ↑/↓ stop at the ends, from none at the first; → opens, then goes in; ← closes, then goes up.
assert.deepEqual(plain(treeKey("down", all, -1)), { at: 0 });
assert.deepEqual(plain(treeKey("down", all, 6)), { at: 6 });
assert.deepEqual(plain(treeKey("up", all, 0)), { at: 0 });
assert.deepEqual(plain(treeKey("end", all, 0)), { at: 6 });
assert.deepEqual(plain(treeKey("home", all, 4)), { at: 0 });
assert.equal(treeKey("right", all, 0).at, 1, "into an open folder");
assert.equal(treeKey("left", all, 3).at, 2, "a file goes to its folder");
assert.equal(treeKey("left", all, 2).toggle.path, "packages/cli/src/daemon", "an open folder closes");
assert.equal(treeKey("left", all, 4), null, "nothing above the top level");
assert.equal(treeKey("right", all, 1), null, "a file has nothing to open");
const closed = treeRows((rel) => kids.get(rel) ?? [], (p) => p !== "gone");
assert.equal(treeKey("right", closed, 5).toggle.path, "gone", "a closed folder opens");
assert.equal(treeKey("enter", all, 4).pick.path, "README.md");
assert.equal(treeKey("x", all, 0), null);
assert.equal(treeKey("down", [], -1), null);

// A group is never joined to its lone folder, nor a folder to a lone group under it.
const grouped = new Map([["", [{ name: "G", dir: true, path: "group:g", flat: false }]], ["group:g", [{ name: "src", dir: true, path: "group:g/src" }]],
  ["group:g/src", [{ name: "a.ts", dir: false, path: "src/a.ts" }]]]);
assert.deepEqual(shape(treeRows((rel) => grouped.get(rel) ?? [], () => true)), ["v G", "  v src", "    a.ts"]);

// Review's reviewed box leads the row: after the chevron's slot, before the icon; the letter and the page's own after the name.
const drawn = treeRow({ dim: "#888888", ring: "#0000ff", foreground: "#ffffff" }, "mods/x", { path: "a.ts", name: "a.ts", depth: 0 }, "r",
  { leading: el("box"), trailing: el("tail"), status: "M" });
assert.deepEqual(drawn.kids.map((k) => typeof k === "string" ? "text" : k.tag), ["div", "box", "icon", "div", "div", "tail"]);

console.log("ok: file tree: lone folders flatten (groups never), paths keep their order, a path finds its row, the keys move as Pierre's, and a page's box leads the row.");
