// Loads store.js in a fake herdr: keys under old names move to their new ones once, with their value only when it's worth keeping.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const state = {}, local = new Map();
const src = fs.readFileSync(path.join(__dirname, "store.js"), "utf8").replace(/^import .*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.store = { KEY, migrate, migrateLocal };";
const context = vm.createContext({
  shared: (k) => state[k] ?? null, setShared: (k, v) => { state[k] = v; },
  localStorage: { getItem: (k) => local.get(k) ?? null, setItem: (k, v) => local.set(k, v), removeItem: (k) => local.delete(k) },
});
vm.runInContext(src, context);
const { KEY, migrate, migrateLocal } = context.store;

Object.assign(state, { "agents.pins": ["a", "b"], "t3-actions": { list: [{ id: "x" }], last: "x" }, "t3-inbox.notice": { live: true }, "space.icons": { k: "i" }, "t3-home.space": "h1" });
state[KEY.home] = "h2";
migrate();
assert.deepEqual(JSON.parse(JSON.stringify([state[KEY.pins], state[KEY.actions]])), [["a", "b"], { list: [{ id: "x" }], last: "x" }], "what's kept moves to its new name");
assert.equal(state[KEY.home], "h2", "a new name with a value keeps its own");
assert.deepEqual([state[KEY.notice], state[KEY.spaceIcons]], [undefined, undefined], "a passing value or a cache isn't carried");
assert.deepEqual(["agents.pins", "t3-actions", "t3-inbox.notice", "space.icons", "t3-home.space"].map((k) => state[k]), [null, null, null, null, null], "every old name goes");
// An empty value under the new name (a list nothing was ever pinned to, written before the move) holds nothing: the old one wins.
state["agents.pins"] = ["t156", "t1d9"]; state[KEY.pins] = [];
migrate();
assert.deepEqual(JSON.parse(JSON.stringify(state[KEY.pins])), ["t156", "t1d9"], "an empty new value doesn't swallow the old one");
const before = JSON.stringify(state);
migrate();
assert.equal(JSON.stringify(state), before, "run again, it changes nothing");

local.set("working-open", "true"); local.set("open", "false"); local.set("settled.open", "true");
migrateLocal([["working-open", "working.open"], ["open", "settled.open"]]);
assert.deepEqual([local.get("working.open"), local.get("settled.open"), local.has("working-open"), local.has("open")], ["true", "true", false, false], "localStorage alike: moved, the new one kept, the old gone");

for (const k of Object.values(KEY)) assert.match(k, /^(t3|t3-[a-z-]+)\.[a-z][A-Za-z]*$/, `${k}: <mod>.<name> or t3.<name>, lowerCamel`);
console.log("ok: store moves old names once, keeps what's worth keeping, and names every key by the rule.");
