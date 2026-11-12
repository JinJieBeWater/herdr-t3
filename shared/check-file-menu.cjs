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
assert.deepEqual(ids({ page: "files", platform: "macos", agent, changed: true }), ["copy-path", "copy-relative", "mention", "reveal", "open", "open-review"], "a change Review has");
assert.deepEqual(ids({ page: "files", platform: "macos", dir: true, changed: true }), ["copy-path", "copy-relative", "reveal"], "a folder: nothing that opens it");
assert.deepEqual(ids({ page: "files", platform: "macos", remote: true }), ["copy-path", "copy-relative"], "another machine's: nothing that runs here");
assert.deepEqual(ids({ page: "files", platform: "linux" }), ["copy-path", "copy-relative", "open"]);
assert.deepEqual(ids({ page: "review", platform: "macos", agent, files: true }), ["copy-path", "copy-relative", "mention", "reveal", "open", "open-files", "review"]);
assert.deepEqual(ids({ page: "review", platform: "macos", reviewed: true }), ["copy-path", "copy-relative", "reveal", "open", "unreview"], "no Files page: no Open in Files");
assert.deepEqual(ids({ page: "review", platform: "macos", dir: true, files: true }), ["copy-path", "copy-relative", "reveal", "review"], "a folder marks its files");
assert.ok(!ids({ page: "files", platform: "macos", files: true }).includes("open-files") && !ids({ page: "review", platform: "macos", changed: true }).includes("open-review"), "each page opens only the other");

console.log("ok: file menu: the items by page and row: folders open nothing, another machine runs nothing here, each page opens the other.");
