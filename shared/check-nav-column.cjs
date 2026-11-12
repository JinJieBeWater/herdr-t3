// The navigation column's width, as T3's FileExplorerPane: 256 to start, 160 at least, 560 at most, the content kept 256.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const store = new Map();
const src = fs.readFileSync(path.join(__dirname, "nav-column.js"), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.nav = { navRange, navWidth, navOpen, setNavOpen };";
const context = vm.createContext({ KEY: { navWidth: "t3.navWidth" }, shared: (k) => store.get(k) ?? null,
  localStorage: { getItem: (k) => store.get(`local:${k}`) ?? null, setItem: (k, v) => store.set(`local:${k}`, String(v)) } });
vm.runInContext(src, context);
const { navRange, navWidth, navOpen, setNavOpen } = context.nav;

assert.deepEqual([...navRange(1200)], [160, 560], "wide: 560 at most");
assert.deepEqual([...navRange(681)], [160, 425], "the content keeps 256");
assert.deepEqual([...navRange(300)], [160, 160], "narrower still, 160 holds");
assert.equal(navWidth(681), 256, "none kept: 256");
store.set("t3.navWidth", 900);
assert.equal(navWidth(681), 425, "a kept width within what this page allows");
assert.equal(navWidth(1200), 560);
store.set("t3.navWidth", 40);
assert.equal(navWidth(1200), 160);
store.set("t3.navWidth", 300);
assert.equal(navWidth(681), 300, "the other page's width");
assert.equal(navOpen(), true, "open to start");
setNavOpen(false);
assert.equal(navOpen(), false);

console.log("ok: nav column: 256 to start, 160 to min(560, page − 256), one width for both pages, open until closed.");
