const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "sidebar.js"), "utf8").replace(/^export /gm, "");
const { sidebarParts } = vm.runInNewContext(source + "\n({ sidebarParts });");

for (const active of ["inbox", "lists"]) {
  for (const hidden of [false, true]) {
    const stack = { id: "sidebar-lists", active };
    const rail = { id: "sidebar", hidden, children: [{ children: [stack] }] };
    const root = { children: [{ id: "other" }, { children: [rail] }] };
    const found = sidebarParts(root);
    assert.equal(found.rail, rail, "the rail keeps its own visibility and size");
    assert.equal(found.stack, stack, "the selected mode is independent of the rail's visibility");
  }
}

const rail = { id: "sidebar", size: { px: 256 } }, stack = { id: "sidebar-lists", active: "inbox" };
const withoutStack = sidebarParts({ children: [rail] });
assert.equal(withoutStack.rail, rail);
assert.equal(withoutStack.stack, undefined, "a standalone sidebar has no selected mode");
const withoutRail = sidebarParts({ children: [stack] });
assert.equal(withoutRail.rail, undefined, "a stack does not imply a sidebar rail");
assert.equal(withoutRail.stack, stack);
for (const root of [undefined, null, {}]) {
  const found = sidebarParts(root);
  assert.deepEqual([found.rail, found.stack], [undefined, undefined]);
}

console.log("ok: sidebar parts: Inbox, Lists, visibility, missing stack and missing rail.");
