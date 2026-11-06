// node extras/mods/t3-theme-export/check.cjs: main.js runs on a fake herdr, without a window.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf8")
  .replace(/^import .*$/gm, "")
  .replace("export default class ThemeExport", "return class ThemeExport");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function start(file = null) {
  const host = { file, shown: "A", failWrites: 0 };
  const Mod = new Function("View", "div", "theme", "settings", "home", "readTextFile", "writeTextFile", source)(
    class {},
    () => "root",
    () => ({ background: host.shown }),
    () => ({ theme: host.shown }),
    () => "/home",
    async () => (await sleep(2), host.file),
    async (_path, text, expected) => {
      await sleep(2);
      if (host.failWrites-- > 0 || expected !== host.file) throw new Error("stale snapshot");
      host.file = text;
    },
  );
  const view = new Mod();
  view.init();
  return { host, view };
}
const exported = (host) => JSON.parse(host.file);

(async () => {
  let { host, view } = start();
  assert.equal(view.render(), "root");
  await sleep(20);
  assert.deepEqual(exported(host), { name: "A", colors: { background: "A" } });

  // A change during a write has no render of its own to wait for.
  view.render();
  host.shown = "B";
  view.render();
  await sleep(1);
  host.shown = "C";
  view.render();
  await sleep(40);
  assert.equal(exported(host).name, "C");

  // A failed write isn't taken for written: the next render writes it.
  ({ host, view } = start("old"));
  host.failWrites = 1;
  view.render();
  await sleep(20);
  assert.equal(host.file, "old");
  view.render();
  await sleep(20);
  assert.equal(exported(host).name, "A");

  // Colors already there are not written again.
  const same = host.file;
  ({ host, view } = start(same));
  host.failWrites = Infinity;
  view.render();
  await sleep(20);
  assert.equal(view.written, same);

  console.log("ok t3-theme-export");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
