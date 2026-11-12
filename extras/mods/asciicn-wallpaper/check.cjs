// The import lifecycle on an inert Home: drafts never become saved wallpapers until Apply; deletion needs confirmation.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function element() {
  const n = { items: [], handlers: {} };
  const p = new Proxy(n, { get: (o, k) => k in o ? o[k] : (...a) => {
    if (k === "child") n.items.push(a[0]);
    else if (k === "children") n.items.push(...a[0]);
    else if (k === "when") { if (a[0]) a[1](p); }
    else if (k === "id") n.key = a[0];
    else if (k.startsWith("on_")) n.handlers[k] = a[0];
    return p;
  } });
  return p;
}
const find = (n, id) => !n || typeof n !== "object" ? null : n.key === id ? n : n.items.map(x => find(x, id)).find(Boolean);
const source = fs.readFileSync(path.join(__dirname, "main.js"), "utf8")
  .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class");
const files = new Map(), calls = [], overlays = [], messages = [], state = {};
let pick = "/photos/Coast.png", failDelete = false, holdWrite = null;
let beforePublish = null, afterPublish = null, failPart = false;
const ok = (stdout = "") => ({ code: 0, stdout, stderr: "" });
const env = {
  View: class {}, div: element, svg: element, h_flex: element, v_flex: element,
  SCENES: [{ id: "lighthouse", name: "Lighthouse", width: 2, height: 1, focus: 0.5, tiles: [] }],
  VERSION: 1, appHome: () => "/app", settings: () => ({}), theme: () => ({}), window: () => ({ platform: "macos" }),
  stopsInit: view => { view.fs = {}; }, stopsEnd() {}, enter() {}, focusRoot: (_view, el) => el, stop: (_view, _t, _id, el) => el,
  shared: k => state[k], setShared: (k, v) => { state[k] = v; }, notify: p => messages.push(p),
  openOverlay: spec => overlays.push(spec), nextCommand: () => new Promise(() => {}),
  watchFolder: () => new Promise(() => {}),
  readTextFile: async f => files.get(f) ?? null,
  writeTextFile: async (f, body, expected) => {
    if (Buffer.byteLength(body) > 1024 * 1024) throw new Error("Text file exceeds 1 MiB");
    if (failPart && f.endsWith(".part")) throw new Error("disk full");
    if (holdWrite && f.endsWith(".svg")) { const wait = holdWrite; holdWrite = null; await wait; }
    assert.equal(files.get(f) ?? null, expected, `atomic write: ${f}`);
    files.set(f, body);
  },
  exec: async (cmd, args = []) => {
    calls.push([cmd, args]);
    if (cmd === "osascript" || cmd === "zenity") return pick ? ok(pick) : { code: 1, stdout: "", stderr: "cancelled" };
    if (cmd === "sips") return args[0] === "-g" ? ok("pixelWidth: 4\npixelHeight: 4") : ok();
    if (cmd === "cat") return ok(files.get(args[0]) ?? "●\n");
    if (cmd === "link") {
      beforePublish?.(args[1]);
      if (files.has(args[1])) return { code: 1, stdout: "", stderr: "File exists" };
      assert.ok(files.has(args[0]), "publish only a completed staged file");
      files.set(args[1], files.get(args[0]));
      await afterPublish?.(args[1]);
      return ok();
    }
    if (cmd === "rm") { for (const f of files.keys()) if (args.slice(1).some(d => f === d || f.startsWith(`${d}/`))) files.delete(f); return ok(); }
    if (cmd === "sh") {
      const s = args[1];
      if (s.startsWith("cat ")) {
        const paths = [...s.matchAll(/'([^']*)'/g)].map(m => m[1]), out = paths.pop();
        assert.ok(paths.every(p => files.has(p)), "all chunks exist before concatenating");
        files.set(out, paths.map(p => files.get(p)).join(""));
        return ok();
      }
      if (s.startsWith("for f")) return ok([...files.keys()].filter(f => /^\/app\/asciicn-wallpaper\/[^/]+\.ans$/.test(f)).map(f => `1 2\0${f.split("/").at(-1).slice(0, -4)}\0`).join(""));
      if (s.startsWith("cksum <")) return ok("1 2\n");
      if (s.startsWith("rm ")) {
        for (const op of s.split(" && ")) {
          if (op.includes("'./.tiles/Coast'")) for (const f of files.keys()) if (f.includes("/.tiles/Coast/")) files.delete(f);
          if (op.includes("'./Coast.ans'")) {
            if (failDelete) return { code: 1, stdout: "", stderr: "permission denied" };
            files.delete("/app/asciicn-wallpaper/Coast.ans");
          }
        }
      }
      return ok("bmp");
    }
    return ok();
  },
  imageGrid: () => ({ width: 4, height: 4 }),
  decodeBmp: function* () { return { width: 4, height: 4, rgba: [] }; },
  imageAns: function* (_pixels, style) { yield null; return ({ braille: "⡇", blocks: "▌", dots: "●" })[style] + "\n"; },
  convert: function* (text) {
    if (!text.trim()) return { width: 2, height: 1 };
    yield { file: "tile.svg", svg: text.slice(0, 100), tint: "foreground", opacity: 1, x0: 0, x1: 2, y0: 0, y1: 1 };
    return { width: 2, height: 1 };
  },
};
const cx = { notify() {}, spawn: fn => fn(cx), timer: { after: (_ms, fn) => fn(cx) } };
const context = vm.createContext(env);
vm.runInContext(source, context);
const mod = new context.Mod();
mod.init({}, { ...cx, spawn() {} });
mod.height = 800; mod.width = 1000;
const saved = () => [...files.keys()].filter(f => f.endsWith(".ans"));

(async () => {
  await mod.choose(cx);
  assert.ok(mod.draft?.scene, "choosing a photo previews it before saving");
  assert.deepEqual(saved(), []);
  assert.equal(state["asciicn-wallpaper.scene"], undefined, "preview does not change the shared choice");
  assert.ok(find(mod.render(cx), "wallpaper-preview"));
  await mod.previewStyle("dots", cx);
  assert.equal(mod.draft.text, "●\n");
  await mod.cancelPreview(cx);
  assert.equal(mod.draft, null);
  assert.deepEqual([...files.keys()], [], "cancel removes preview tiles");

  await mod.choose(cx);
  await mod.previewStyle("blocks", cx);
  await mod.applyPreview(cx);
  assert.equal(mod.draft, null);
  assert.deepEqual(saved(), ["/app/asciicn-wallpaper/Coast.ans"]);
  assert.equal(files.get(saved()[0]), "▌\n");
  assert.equal(state["asciicn-wallpaper.scene"], "file:Coast");
  assert.equal([...files.keys()].some(f => f.includes("/.preview/")), false);

  pick = null;
  await mod.choose(cx);
  assert.equal(mod.draft, null, "file dialog cancel stays silent");
  assert.equal(messages.length, 0);
  pick = "/photos/Studio.ans";
  await mod.choose(cx, true);
  assert.equal(mod.draft, null, ".ans imports retain their finished drawing without an image style step");
  assert.equal(saved().length, 2);

  // A detailed Dots image exceeds the host's per-write limit even at the usual image grid.
  pick = "/photos/Detailed.png";
  await mod.choose(cx);
  const large = "\x1b[38;2;123;234;210m⦁🌅\n".repeat(70000);
  assert.ok(Buffer.byteLength(large) > 1024 * 1024);
  mod.draft.text = large;
  await mod.applyPreview(cx);
  assert.ok(!mod.draft, "Apply saves a detailed image larger than the native per-write limit");
  assert.ok(files.get("/app/asciicn-wallpaper/Detailed.ans") === large, "large UTF-8 drawing is preserved byte for byte");
  assert.equal(state["asciicn-wallpaper.scene"], "file:Detailed");
  assert.equal([...files.keys()].some(f => f.includes("/.preview/")), false);
  files.set("/photos/Studio detailed.ans", large);
  pick = "/photos/Studio detailed.ans";
  await mod.choose(cx, true);
  assert.ok(files.get("/app/asciicn-wallpaper/Studio detailed.ans") === large, "Studio imports share the large-file save path");
  assert.equal(state["asciicn-wallpaper.scene"], "file:Studio detailed");
  files.delete("/photos/Studio detailed.ans");

  pick = "/photos/Unwritten.png";
  await mod.choose(cx);
  failPart = true;
  await mod.applyPreview(cx);
  failPart = false;
  assert.ok(mod.draft, "a chunk write failure retains the preview to retry");
  assert.equal(files.has("/app/asciicn-wallpaper/Unwritten.ans"), false);
  assert.equal([...files.keys()].some(f => f.includes("/.preview/save-")), false, "failed save removes its own staging files");
  assert.equal(state["asciicn-wallpaper.scene"], "file:Studio detailed");
  await mod.cancelPreview(cx);

  // Another Home may receive the .ans event before the applying copy does.
  const other = new context.Mod();
  other.init({}, { ...cx, spawn() {} });
  pick = "/photos/Shared.png";
  await mod.choose(cx);
  let finishOther, otherJob;
  holdWrite = new Promise(r => { finishOther = r; });
  afterPublish = async destination => {
    if (destination.endsWith("/Shared.ans")) {
      otherJob = other.refresh(cx);
      for (let n = 0; n < 20; n++) await Promise.resolve();
    }
  };
  const applying = mod.applyPreview(cx);
  for (let n = 0; n < 80; n++) await Promise.resolve();
  try { assert.ok(mod.draft, "Apply keeps the preview until another Home finishes the drawing"); }
  finally { finishOther(); }
  await applying; await otherJob;
  afterPublish = null;
  assert.equal(state["asciicn-wallpaper.scene"], "file:Shared");
  assert.ok(mod.imported.some(s => s.id === "file:Shared"), "the applying Home loads the other copy's cache");

  pick = "/photos/Coast.png";
  await mod.choose(cx);
  let collision;
  beforePublish = destination => { collision = destination; files.set(collision, "another Home's picture"); };
  await mod.applyPreview(cx);
  beforePublish = null;
  assert.ok(mod.draft, "an atomic save conflict keeps the preview available to retry");
  assert.equal(files.get(collision), "another Home's picture", "a concurrent save is never overwritten");
  assert.equal(mod.picking, null, "failed save clears even a suffixed pending name");
  assert.equal(state["asciicn-wallpaper.scene"], "file:Shared");
  await mod.cancelPreview(cx);
  files.delete(collision);

  await mod.choose(cx);
  let finishStyle;
  holdWrite = new Promise(r => { finishStyle = r; });
  const oldStyle = mod.previewStyle("blocks", cx);
  for (let n = 0; n < 20; n++) await Promise.resolve();
  await mod.previewStyle("dots", cx);
  finishStyle(); await oldStyle;
  assert.equal(mod.draft.text, "●\n", "a slow old style cannot overwrite the latest style");
  assert.equal(mod.draft.busy, false);
  await mod.cancelPreview(cx);

  pick = "/photos/Coast.png";
  await mod.choose(cx);
  let release;
  holdWrite = new Promise(r => { release = r; });
  const stale = mod.previewStyle("dots", cx);
  await Promise.resolve(); await Promise.resolve();
  await mod.cancelPreview(cx);
  release(); await stale;
  assert.equal(mod.draft, null, "late drawing cannot reopen a cancelled preview");
  assert.equal([...files.keys()].some(f => f.includes("/.preview/")), false, "late drawing leaves no draft files");

  state["asciicn-wallpaper.scene"] = "file:Coast";
  const scene = mod.imported.find(s => s.id === "file:Coast");
  const before = calls.length;
  find(mod.render(cx), "wallpaper-remove").handlers.on_click({}, cx);
  assert.equal(calls.length, before, "delete click does no filesystem work");
  assert.equal(overlays.at(-1).props.yes, "Delete");
  assert.match(overlays.at(-1).props.title, /Coast/);
  assert.ok(files.has("/app/asciicn-wallpaper/Coast.ans"), "dismissing the dialog leaves the file");
  failDelete = true;
  const cached = files.get("/app/asciicn-wallpaper/.tiles/Coast/tile.svg");
  await mod.remove(scene, cx);
  assert.equal(state["asciicn-wallpaper.scene"], "file:Coast", "failed deletion retains selection");
  assert.ok(mod.imported.includes(scene));
  assert.equal(files.get("/app/asciicn-wallpaper/.tiles/Coast/tile.svg"), cached, "source deletion failure leaves its drawing intact");
  failDelete = false;
  await mod.remove(scene, cx);
  assert.equal(files.has("/app/asciicn-wallpaper/Coast.ans"), false);
  assert.notEqual(state["asciicn-wallpaper.scene"], "file:Coast");
  console.log("ok: wallpaper preview, apply, cancel, stale jobs, .ans import and confirmed deletion.");
})().catch(e => { console.error(e); process.exitCode = 1; });
