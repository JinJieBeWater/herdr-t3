// The file menu's items, one list for both pages: what a row is decides what it offers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "file-menu.js"), "utf8")
  .replace(/^import [^;]*;\r?\n/gm, "").replace(/^export (function|const) /gm, "$1 ") + "\nglobalThis.menu = { fileMenuItems };";
const context = vm.createContext({});
vm.runInContext(src, context);
const ids = (o) => [...context.menu.fileMenuItems(o).map((it) => it.id)];
const agent = { address: "t1" };

assert.deepEqual(ids({ page: "files", platform: "macos", agent }), ["copy-path", "copy-relative", "mention", "reveal", "open"]);
assert.deepEqual(ids({ page: "files", platform: "macos", agent, changed: true }), ["copy-path", "copy-relative", "mention", "reveal", "open"], "a changed file stays within Files");
assert.deepEqual(ids({ page: "files", platform: "macos", dir: true, changed: true }), ["copy-path", "copy-relative", "reveal"], "a folder: nothing that opens it");
assert.deepEqual(ids({ page: "files", platform: "macos", remote: true }), ["copy-path", "copy-relative"], "another machine's: nothing that runs here");
assert.deepEqual(ids({ page: "files", platform: "linux" }), ["copy-path", "copy-relative", "open"]);
assert.deepEqual(ids({ page: "review", platform: "macos", agent, files: true }), ["copy-path", "copy-relative", "mention", "reveal", "open", "review"]);
assert.deepEqual(ids({ page: "review", platform: "macos", reviewed: true }), ["copy-path", "copy-relative", "reveal", "open", "unreview"], "reviewed files can be marked unreviewed");
assert.deepEqual(ids({ page: "review", platform: "macos", dir: true, files: true }), ["copy-path", "copy-relative", "reveal", "review"], "a folder marks its files");
for (const page of ["files", "review"]) assert.ok(!ids({ page, platform: "macos", files: true, changed: true }).some(id => id.startsWith("open-")), "neither page offers a cross-page action");

console.log("ok: file menu: common file actions and Review's marks, with no cross-page actions.");
