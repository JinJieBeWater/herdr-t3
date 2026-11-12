// Loads panel.js in a fake herdr: each space keeps its panel (open, page, wide); switching restores it, its first frame doesn't.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const state = {}, ui = { panel: false, page: "files", work: true, space: "a" };
const tree = () => ({ id: "root", children: [{ id: "work", hidden: !ui.work }, { id: "panel", hidden: !ui.panel, children: [{ id: "panel-body", active: ui.page, children: [{ id: "files" }, { id: "review" }] }] }] });
const run = (cmd, a) => {
  if (cmd === "layout.select") ui.page = a.child;
  else ui[a.id] = cmd === "layout.show";
};
const src = fs.readFileSync(path.join(__dirname, "panel.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.panel = { syncPanel, togglePanel, toggleWide, hidePanel, restorePanel };";
const context = vm.createContext({
  KEY: { panels: "t3.panels" }, layout: tree, run, spaces: () => [{ id: ui.space, active: true }],
  shared: (k) => state[k] ?? null, setShared: (k, v) => { state[k] = v; }, Date,
});
vm.runInContext(src, context);
const { syncPanel, togglePanel, toggleWide, hidePanel, restorePanel } = context.panel;
const tabs = {};
// A frame: t3-tabs' keys copy, which always shows, records and restores.
const frame = () => syncPanel(tabs);
const shows = () => ({ panel: ui.panel, page: ui.page, work: ui.work });

frame();
togglePanel("review"); frame();
ui.space = "b"; frame(); frame();
assert.deepEqual(shows(), { panel: false, page: "review", work: true }, "a space never seen opens closed");
togglePanel("files"); frame();
ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "review", work: true }, "back in a, its panel on its page");
toggleWide(); frame();
ui.space = "b"; frame(); frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: true }, "from wide in a, b as b left it");
ui.space = "a"; frame(); frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "review", work: false }, "a again, wide");
toggleWide(); frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "review", work: true }, "narrowing isn't undone");
hidePanel(); frame(); ui.space = "b"; frame(); ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: false, page: "review", work: true }, "closed stays closed");
// Widened once b's panel shows, it's b's; a, meanwhile closed, stays so.
ui.space = "b"; frame(); frame(); toggleWide(); frame(); ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: false, page: "review", work: true }, "from wide in b, a closed as it was");
ui.space = "b"; frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: false }, "b wide again");
ui.space = "a"; frame(); frame(); togglePanel("files"); frame(); toggleWide(); frame(); ui.space = "b"; frame(); toggleWide(); frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: true }, "narrowed in b after a wide switch, it stays narrow");
ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: false }, "a as it was left, wide");
// Going Home: laid out as Home left it with the select, before spaces() shows Home; the lagging frame neither records it for
// the space being left nor restores that one's.
{
  ui.space = "a"; frame(); frame(); toggleWide(); frame(); frame();
  assert.deepEqual(shows(), { panel: true, page: "files", work: true }, "a open, narrow");
  restorePanel(tabs, "home");
  assert.deepEqual(shows(), { panel: false, page: "files", work: true }, "Home's first frame: no panel");
  frame(); frame();
  assert.deepEqual(shows(), { panel: false, page: "files", work: true }, "still a in spaces(): nothing undone");
  ui.space = "home"; frame(); frame();
  assert.deepEqual(shows(), { panel: false, page: "files", work: true }, "Home");
  ui.space = "a"; frame(); frame();
  assert.deepEqual(shows(), { panel: true, page: "files", work: true }, "a kept its panel");
}
// The stack that holds the pages is a card, as the work column's panes; the pages paint none of their own, so it shows through (docs/adr/0013).
{
  const find = (node, id) => node.id === id ? node : (node.children ?? []).map((c) => find(c, id)).find(Boolean);
  const layout = JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "../layouts/herdr-t3.json"), "utf8"));
  assert.equal(find(layout.root ?? layout, "panel").resizable, false, "the panel's fixed header cannot be stretched by dragging its boundary");
  assert.deepEqual([find(layout.root ?? layout, "panel-body").background, find(layout.root ?? layout, "panel-body").radius], ["background", 8], "the panel's pages sit on a card, as the panes on the left");
}
console.log("ok: each space keeps its panel's open, page and wide; switching restores it, wide included.");
