// Production regression checks. All writes and subprocesses use an owned temporary app home.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const run = promisify(execFile), repo = path.resolve(__dirname, "../../..");
const revision = process.argv.find(a => a.startsWith("--revision="))?.slice(11);
const onlyCase = process.argv.find(a => a.startsWith("--case="))?.slice(7);
const sourceFile = async relative => revision
  ? (await run("git", ["show", `${revision}:${relative}`], { cwd: repo })).stdout
  : fs.readFile(path.join(repo, relative), "utf8");
const FRAME = "\x1b[38;2;200;150;220m●\x1b[0m\n";
const KEY = "asciicn-wallpaper.scene";
const pending = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};
const exists = async p => fs.stat(p).then(() => true, e => { if (e.code === "ENOENT") return false; throw e; });

async function runtime(base) {
  const app = path.join(base, "app 'quoted"), dir = path.join(app, "asciicn-wallpaper");
  await fs.mkdir(path.join(dir, ".tiles"), { recursive: true });
  await fs.mkdir(path.join(dir, ".preview"), { recursive: true });
  const state = {}, messages = [], overlays = [], hooks = {};
  const art = await sourceFile("extras/mods/asciicn-wallpaper/ascii-art.js");
  const engine = vm.runInNewContext(art.replace(/^export /gm, "") + "; ({VERSION,convert,imageGrid,decodeBmp,imageAns:typeof imageAns==='undefined'?null:imageAns,brailleAns})");
  const env = {
    ...engine, View: class {},
    SCENES: [{ id: "lighthouse", name: "Lighthouse", width: 1, height: 1, focus: 0.5, tiles: [] }],
    appHome: () => app, window: () => ({ platform: "macos" }), settings: () => ({}), theme: () => ({}),
    stopsInit: v => { v.fs = {}; }, stopsEnd() {}, enter() {},
    shared: k => state[k], setShared: (k, v) => { state[k] = v; },
    notify: v => messages.push(v), openOverlay: v => overlays.push(v),
    nextCommand: () => new Promise(() => {}), watchFolder: () => new Promise(() => {}),
    readTextFile: async file => {
      try {
        const body = await fs.readFile(file, "utf8");
        if (Buffer.byteLength(body) > 1024 * 1024) throw new Error("Text file exceeds 1 MiB");
        return body;
      } catch (e) { if (e.code === "ENOENT") return null; throw e; }
    },
    writeTextFile: async (file, body, expected) => {
      if (Buffer.byteLength(body) > 1024 * 1024) throw new Error("Text file exceeds 1 MiB");
      await hooks.beforeWrite?.(file, body);
      assert.equal(expected, null, "these production paths create new files atomically");
      await fs.writeFile(file, body, { flag: "wx" });
    },
    exec: async (cmd, args = [], options = {}) => {
      if (cmd === "osascript") return { code: 0, stdout: hooks.picked, stderr: "" };
      let result;
      try {
        const r = await run(cmd, args, { cwd: options.cwd, timeout: 5000, maxBuffer: 8 * 1024 * 1024 });
        result = { code: 0, stdout: r.stdout, stderr: r.stderr };
      } catch (e) {
        if (typeof e.code !== "number") throw e;
        result = { code: e.code, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
      }
      await hooks.afterExec?.(cmd, args, result);
      return result;
    },
  };
  const source = (await sourceFile("extras/mods/asciicn-wallpaper/main.js"))
    .replace(/^import .*;\r?\n/gm, "").replace("export default class", "globalThis.Mod = class");
  const context = vm.createContext(env);
  vm.runInContext(source, context);
  const cx = { notify() {}, spawn() {}, timer: { after: (_ms, fn) => setImmediate(() => fn(cx)) } };
  const home = () => { const h = new context.Mod(); h.init({}, cx); h.ready = Promise.resolve(); return h; };
  return { app, dir, state, messages, overlays, hooks, cx, home };
}

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "herdr-wallpaper-audit-")), results = [];
  const emit = () => {
    for (const result of results) console.log(JSON.stringify(result));
    if (results.some(r => r.verdict === "broken")) process.exitCode = 1;
  };
  const test = async (name, fn) => {
    if (onlyCase && !name.startsWith(onlyCase)) return;
    let evidence;
    try { await fn(v => { evidence = v; }); results.push({ name, verdict: "survived", evidence }); }
    catch (e) {
      if (e.code !== "ERR_ASSERTION") throw e;
      results.push({ name, verdict: "broken", assertion: e.message.split("\n")[0], evidence });
    }
  };
  try {
    for (const [label, filename] of [["plain", "Plain.ans"], ["unicode", "图片.ans"], ["option", "-option.ans"], ["hidden", ".hidden.ans"], ["spaces", " spaced .ans"]]) {
      await test(`file-name:${label}`, async record => {
        const r = await runtime(path.join(root, label)), h = r.home();
        const input = path.join(root, filename);
        await fs.writeFile(input, FRAME);
        r.hooks.picked = input;
        await h.choose(r.cx, true);
        record({ filename, saved: (await fs.readdir(r.dir)).filter(n => n.endsWith(".ans")), imported: h.imported.map(s => s.id), selected: r.state[KEY] ?? null, notices: r.messages.length });
        assert.equal(h.imported.length, 1, "a valid named .ans must be visible after successful import");
        assert.equal(h.imported[0].name + ".ans", filename, "valid names are preserved");
        await h.choose(r.cx, true);
        assert.equal(h.imported.length, 2, "reimport allocates a distinct name, including hidden names");
      });
    }
    await test("shell-metacharacters-and-publication", async record => {
      const r = await runtime(path.join(root, "shell")), h = r.home();
      const sentinel = path.join(r.dir, "AUDIT_PWNED");
      const names = ["literal; touch AUDIT_PWNED.ans", "$(touch AUDIT_PWNED).ans", "`touch AUDIT_PWNED`.ans", "single'quote.ans", 'double"quote.ans', "line\nbreak.ans", "-dash.ans", ".hidden.ans"];
      for (const name of names) await fs.writeFile(path.join(r.dir, name), FRAME);
      await h.refresh(r.cx);
      assert.equal(h.imported.length, names.length);
      assert.equal(await exists(sentinel), false);
      const text = `${FRAME}$(touch AUDIT_PWNED)🌅\n`.repeat(50000);
      await h.saveFile("large 'quoted", text);
      assert.ok(await fs.readFile(path.join(r.dir, "large 'quoted.ans"), "utf8") === text);
      await assert.rejects(h.saveFile("large 'quoted", "replacement"));
      assert.ok(await fs.readFile(path.join(r.dir, "large 'quoted.ans"), "utf8") === text);
      await fs.mkdir(path.join(r.dir, "folder.ans"));
      await assert.rejects(h.saveFile("folder", "replacement"));
      assert.deepEqual(await fs.readdir(path.join(r.dir, "folder.ans")), []);
      const target = path.join(root, "symlink-target");
      await fs.writeFile(target, "original");
      await fs.symlink(target, path.join(r.dir, "symlink.ans"));
      await assert.rejects(h.saveFile("symlink", "replacement"));
      assert.equal(await fs.readFile(target, "utf8"), "original");
      assert.deepEqual(await fs.readdir(path.join(r.dir, ".preview")), []);
      assert.equal(await exists(sentinel), false);
      record({ literalNames: names.length, largeUtf8Bytes: Buffer.byteLength(text), existingFileDirectoryAndSymlinkProtected: true, sentinelCreated: false, stagingEmpty: true });
    });
    await test("reserved-stems-and-hidden-cache-cleanup", async record => {
      const r = await runtime(path.join(root, "reserved")), h = r.home();
      const names = [".ans", "..ans", "...ans", ".hidden.ans"];
      for (const name of names) await fs.writeFile(path.join(r.dir, name), FRAME);
      await h.refresh(r.cx);
      assert.deepEqual(Array.from(h.imported, s => s.name), [".hidden"]);
      for (const name of names) assert.equal(await fs.readFile(path.join(r.dir, name), "utf8"), FRAME, "source files survive invalid stem rejection");
      assert.equal(r.messages.length, 3);
      await fs.unlink(path.join(r.dir, ".hidden.ans"));
      await h.refresh(r.cx);
      assert.deepEqual(await fs.readdir(path.join(r.dir, ".tiles")), []);
      record({ invalidNamesRejected: 3, sourceFilesKept: true, hiddenCacheCleaned: true });
    });
    await test("cache-failure-after-publish", async record => {
      const r = await runtime(path.join(root, "cache-failure")), h = r.home();
      const out = path.join(r.dir, ".preview", "draft");
      const scene = await h.drawTiles(FRAME, out, r.cx);
      h.draft = { id: "draft", name: "Fail", dir: out, style: "dots", version: 1,
        scene: { ...scene, id: "preview:draft:1", name: "Fail", base: "asciicn-wallpaper/.preview/draft", out },
        text: FRAME, busy: false, applying: false, error: null };
      r.hooks.beforeWrite = async file => { if (file.includes("/.tiles/Fail/") && file.endsWith(".svg")) throw new Error("ENOSPC: simulated cache write failure"); };
      await h.applyPreview(r.cx);
      record({ sourceSaved: await exists(path.join(r.dir, "Fail.ans")), draftRetained: !!h.draft, previousPreviewFilesRetained: await exists(out), imported: h.imported.map(s => s.id), selected: r.state[KEY] ?? null, notices: r.messages.map(m => m.title) });
      assert.ok(h.draft, "failed final conversion must retain the working preview for recovery");
      assert.equal(h.draft.applying, false);
      assert.equal(await exists(out), true);
      r.hooks.beforeWrite = null;
      await h.applyPreview(r.cx);
      assert.equal(h.draft, null, "retry selects the completed import and clears the draft");
      assert.deepEqual((await fs.readdir(r.dir)).filter(n => n.endsWith(".ans")), ["Fail.ans"], "retry reuses the saved source");
      assert.equal(r.state[KEY], "file:Fail");
    });
    await test("retry-preserves-replaced-source", async record => {
      const r = await runtime(path.join(root, "replaced")), h = r.home();
      const out = path.join(r.dir, ".preview", "draft"), scene = await h.drawTiles(FRAME, out, r.cx);
      h.draft = { name: "Replaced", dir: out, scene, text: FRAME, busy: false, applying: false, error: null };
      r.hooks.beforeWrite = async file => { if (file.includes("/.tiles/")) throw new Error("cache failure"); };
      await h.applyPreview(r.cx);
      assert.ok(h.draft);
      await fs.writeFile(path.join(r.dir, "Replaced.ans"), FRAME + "●\n");
      r.hooks.beforeWrite = null;
      await h.applyPreview(r.cx);
      assert.equal(await fs.readFile(path.join(r.dir, "Replaced.ans"), "utf8"), FRAME + "●\n");
      assert.equal(await fs.readFile(path.join(r.dir, "Replaced 2.ans"), "utf8"), FRAME);
      assert.equal(r.state[KEY], "file:Replaced 2");
      assert.equal(h.draft, null);
      record({ externallyReplacedSourceKept: true, draftSavedSeparately: true });
    });
    await test("source-changes-during-conversion", async record => {
      const r = await runtime(path.join(root, "changed")), h = r.home();
      const file = path.join(r.dir, "Changing.ans");
      await fs.writeFile(file, FRAME);
      r.hooks.beforeWrite = async output => {
        if (!output.endsWith(".svg")) return;
        r.hooks.beforeWrite = null;
        await fs.writeFile(file, FRAME + "●\n");
      };
      await h.refresh(r.cx);
      assert.equal(h.imported.length, 1);
      const checksum = (await run("cksum", [file])).stdout.trim().split(/\s+/).slice(0, 2).join("-");
      assert.ok(h.imported[0].sum.startsWith(checksum + "-"), "only the current source can be published");
      record({ currentSourcePublished: true });
    });
    await test("delete-during-conversion", async record => {
      const r = await runtime(path.join(root, "delete-race")), a = r.home(), b = r.home();
      const file = path.join(r.dir, "Tracked.ans");
      await fs.writeFile(file, FRAME);
      await a.refresh(r.cx); await b.refresh(r.cx);
      r.state[KEY] = "file:Tracked";
      await fs.writeFile(file, FRAME + "●\n");
      const read = pending(), release = pending();
      r.hooks.afterExec = async (cmd, args) => {
        if (cmd === "cat" && args[0] === file) { read.resolve(); await release.promise; }
      };
      const conversion = a.refresh(r.cx);
      await read.promise;
      const scene = b.imported[0];
      b.askRemove?.(scene);
      if (b.remove.length === 4) await b.remove(scene, [{ id: "lighthouse" }, scene], 1, r.cx);
      else await b.remove(scene, r.cx); // The current confirm handler calls this method with this scene.
      release.resolve(); await conversion;
      record({ sourceExists: await exists(file), aImported: a.imported.map(s => s.id), bImported: b.imported.map(s => s.id), cacheRecreated: await exists(path.join(r.dir, ".tiles/Tracked/scene.json")), selected: r.state[KEY] });
      assert.equal(a.imported.some(s => s.id === "file:Tracked"), false, "a completed old conversion must not republish a deleted import");
      assert.equal(await exists(path.join(r.dir, ".tiles/Tracked")), false, "late conversion leaves no cache");
    });
    emit();
  } finally { await fs.rm(root, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 2; });
