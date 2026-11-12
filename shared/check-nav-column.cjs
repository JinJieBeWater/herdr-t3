// The navigation column's width, as T3's FileExplorerPane: 256 to start, 160 at least, 560 at most, the content kept 256.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const store = new Map();
const src = fs.readFileSync(path.join(__dirname, "nav-column.js"), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.nav = { navRange, navWidth, navOpen, setNavOpen, withNav };";
// Elements that keep their handlers and widths: a fake page to drag the column's edge in.
const made = [];
const element = () => {
  const el = { on: {}, ids: [] };
  made.push(el);
  return new Proxy(el, { get: (target, key) => key in target ? target[key] : (...args) => {
    if (key === "id") target.ids.push(args[0]);
    if (key === "w") target.w = args[0];
    if (key === "on_mouse_move" || key === "on_hover") target.on[key] = args[0];
    if (key === "on_mouse_down" || key === "on_mouse_up") target.on[key] = args[1];
    if (key === "when") return args[0] ? args[1](proxy(target)) : proxy(target);
    return proxy(target);
  } });
};
const proxies = new Map();
const proxy = (target) => proxies.get(target);
const make = () => { const p = element(); proxies.set(made.at(-1), p); return p; };
const sets = [];
const context = vm.createContext({ KEY: { navWidth: "t3.navWidth" }, shared: (k) => store.get(k) ?? null,
  setShared: (k, v) => { sets.push([k, v]); store.set(k, v); }, settings: () => ({ zoom: 2 }),
  div: make, h_flex: make, v_flex: make, svg: make,
  localStorage: { getItem: (k) => store.get(`local:${k}`) ?? null, setItem: (k, v) => store.set(`local:${k}`, String(v)) } });
vm.runInContext(src, context);
const { navRange, navWidth, navOpen, setNavOpen, withNav } = context.nav;

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

// Dragged by its left edge, the column follows the pointer (zoomed pixels: zoom 2 here) within its range, drawn by this page
// alone, and the width it lands at is written once, on release. Its width is the shared one's, whatever the page's width:
// nothing is named after the page, so a page's resize can't scale it for a frame (Herdr's resizable groups did).
{
  const cx = { notified: 0, notify() { this.notified++; }, stop_propagation() {} };
  const page = () => { made.length = 0; proxies.clear(); withNav({ border: "#333" }, "p", 1000, { content: make(), head: make(), list: make(), open: true }); return made; };
  const nav = (els) => els.find(e => e.ids.includes("p-nav")), edge = (els) => els.find(e => e.ids.includes("p-nav-edge")), root = (els) => els.find(e => e.on.on_mouse_move);
  store.set("t3.navWidth", 300); sets.length = 0;
  let els = page();
  assert.equal(nav(els).w, 300);
  assert.ok(!els.some(e => e.ids.some(id => /\d/.test(id))), "no id names a width");
  edge(els).on.on_mouse_down({ position: { x: 1000, y: 10 } }, cx);
  root(els).on.on_mouse_move({ position: { x: 900, y: 10 } }, cx);
  assert.equal(nav(page()).w, 350, "50 points left: 50 wider");
  root(page()).on.on_mouse_move({ position: { x: 2000, y: 10 } }, cx);
  assert.equal(nav(page()).w, 160, "no narrower than 160");
  root(page()).on.on_mouse_move({ position: { x: 0, y: 10 } }, cx);
  assert.equal(nav(page()).w, 560, "no wider than 560");
  assert.equal(sets.length, 0, "nothing shared while dragging: every mod would draw again");
  root(page()).on.on_mouse_up({ position: { x: 0, y: 10 } }, cx);
  assert.deepEqual(sets, [["t3.navWidth", 560]]);
  root(page()).on.on_mouse_move({ position: { x: 900, y: 10 } }, cx);
  assert.equal(nav(page()).w, 560, "released: the pointer moves nothing");
  // A pointer leaving the page ends the drag there.
  store.set("t3.navWidth", 300); sets.length = 0;
  edge(page()).on.on_mouse_down({ position: { x: 1000, y: 10 } }, cx);
  root(page()).on.on_mouse_move({ position: { x: 980, y: 10 } }, cx);
  root(page()).on.on_hover(false, cx);
  assert.deepEqual(sets, [["t3.navWidth", 310]]);
}

console.log("ok: nav column: 256 to start, 160 to min(560, page − 256), one width for both pages, open until closed, its edge dragged.");
