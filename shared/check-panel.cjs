// Loads panel.js in a fake herdr: each space keeps its panel (open, page, wide); switching restores it, a copy taking over doesn't.
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
  + "\nglobalThis.panel = { syncPanel, togglePanel, toggleWide, hidePanel };";
const context = vm.createContext({
  KEY: { panels: "t3.panels" }, layout: tree, run, spaces: () => [{ id: ui.space, active: true }],
  shared: (k) => state[k] ?? null, setShared: (k, v) => { state[k] = v; }, Date,
});
vm.runInContext(src, context);
const { syncPanel, togglePanel, toggleWide, hidePanel } = context.panel;
const tabs = {}, head = {};
// A frame: each copy draws while it shows (the head only with the panel open).
const frame = () => { if (ui.work) syncPanel(tabs, false); if (ui.panel) syncPanel(head, true); };
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
assert.deepEqual(shows(), { panel: true, page: "review", work: true }, "narrowing isn't undone by the tab bar coming back");
hidePanel(); frame(); ui.space = "b"; frame(); ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: false, page: "review", work: true }, "closed stays closed");
// The tab bar's copy comes back from a wide spell with another space in mind: what was done meanwhile stands.
ui.space = "b"; frame(); toggleWide(); frame(); ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: false, page: "review", work: true }, "from wide in b, a closed as it was");
ui.space = "b"; frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: false }, "b wide again");
ui.space = "a"; frame(); frame(); togglePanel("files"); frame(); toggleWide(); frame(); ui.space = "b"; frame(); toggleWide(); frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: true }, "narrowed in b after a wide switch, it stays narrow");
ui.space = "a"; frame(); frame();
assert.deepEqual(shows(), { panel: true, page: "files", work: false }, "a as it was left, wide");
console.log("ok: each space keeps its panel's open, page and wide; switching restores it, the head keeps it while wide.");
