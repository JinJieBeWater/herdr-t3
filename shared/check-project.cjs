// A space's mark and place (project.js) in a fake herdr and kit: the monogram, the project's own icon, and what a draw reads.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const kit = require("./check-kit.js");
const element = kit.elements();

function load(host = {}) {
  const state = {}, reads = { icons: 0, settings: 0 };
  const context = vm.createContext({
    image: (src) => element("image", src), svg: (src) => element("svg", src), h_flex: () => element(),
    checking: () => false, settings: () => { reads.settings++; return {}; }, run() {}, spaces: () => [], panes: () => [],
    shared: (k) => { if (k === "t3.spaceIcons") reads.icons++; return state[k]; }, setShared: (k, v) => { state[k] = v; },
    Buffer, createHash: require("node:crypto").createHash, Date, ...host,
  });
  const src = ["store.js", "color.js", "space-arrival.js", "project.js"].map((f) => kit.strip(fs.readFileSync(path.join(__dirname, f), "utf8"))).join("\n");
  vm.runInContext(src + "\nglobalThis.project = { projectMark, placeOf, monogramColor, monogram, linkedIcon, lookUpAll };", context);
  return { ...context.project, state, reads, context };
}
const t = { background: "#000000", dim: "DIM" };

// A space's monogram is its first glyph, in T3's color for the same name: T3's own cases (apps/mobile/src/lib/
// projectIcon.test.ts), its colors as Tailwind's 400.
{
  const { projectMark, monogram, monogramColor } = load();
  for (const [name, text, color] of [["t3code", "T", "#2dd4bf"], ["Auto Monogram", "A", "#a3e635"], ["blitzdiff", "B", "#f472b6"],
    ["uoalbumdotclub", "U", "#9ca3af"], ["  Tagium  ", "T", "#a3e635"], ["Café Ünïcode", "C", "#e879f9"], ["web2 app", "W", "#34d399"]]) {
    assert.deepEqual([monogram(name), monogramColor(name, true)], [text, color], name);
  }
  assert.deepEqual([monogram("智能算量"), monogram("~/dev")], ["智", "D"]);
  const tile = projectMark("mods/t3-x", { id: "s1", name: "One" }, 16, t, []), color = monogramColor("One", true);
  assert.deepEqual([tile.style.size, tile.style.bg, tile.style.text_color, tile.style.text_size, tile.items], [16, color + "24", color, 8.25, ["O"]],
    "T3's 14% wash of the color, at the size asked, its 8.25 type");
  const folder = projectMark("mods/t3-x", { id: "home", name: "~" }, 16, t, []);
  assert.deepEqual(kit.walk(folder).map((n) => n.source).filter(Boolean), ["mods/t3-x/icons/folder.svg"], "nothing to spell: the calling mod's folder instead");
}

// Where a space is now: its first terminal's live folder, in panes() order, else where it was made.
{
  const { placeOf } = load();
  const s = { id: "s1", folder: "/made", tabs: [{ id: "b2" }, { id: "b1" }] };
  assert.equal(placeOf(s, [{ tab: "x", cwd: "/other" }, { tab: "b1", cwd: null }, { tab: "b1", cwd: "/first" }, { tab: "b2", cwd: "/second" }]), "/first");
  assert.equal(placeOf(s, [{ tab: "x", cwd: "/other" }]), "/made", "no terminal of its own with a folder");
  assert.equal(placeOf(s, undefined), "/made", "no panes read");
  assert.equal(placeOf({ id: "s2", folder: "/made" }, [{ tab: "b1", cwd: "/first" }]), "/made", "a space with no tabs yet");
}

// A draw asks where each space is several times over (its row, its mark, its repository), and marks each with its icon: one
// pass over the panes and one read of the icons for the list a draw hands in, not one of each per space.
{
  const { placeOf, projectMark, reads, state } = load();
  const spaces = Array.from({ length: 100 }, (_, i) => ({ id: `s${i}`, name: `p${i}`, folder: `/made/${i}`, machine: null, tabs: [{ id: `b${i}` }] }));
  const ps = spaces.flatMap((s, i) => [{ tab: `b${i}`, cwd: null }, { tab: `b${i}`, cwd: `/work/${i}` }, { tab: `b${i}`, cwd: `/work/${i}/x` }]);
  let scanned = 0;
  const counted = new Proxy(ps, { get(target, key) { if (typeof key === "string" && /^\d+$/.test(key)) scanned++; return Reflect.get(target, key); } });
  for (let pass = 0; pass < 3; pass++) spaces.forEach((s, i) => assert.equal(placeOf(s, counted), `/work/${i}`));
  assert.ok(scanned <= 2 * ps.length, `${scanned} pane reads for 100 spaces asked three times, of ${ps.length} panes`);
  // Known icons, so no look starts: the read counted is the mark's own.
  state["t3.spaceIcons"] = Object.fromEntries(spaces.map((s, i) => [JSON.stringify([null, `/work/${i}`]), i % 2 ? `cache/t3-icons/${i}.png` : null]));
  reads.icons = reads.settings = 0;
  const marks = spaces.map((s) => projectMark("mods/t3-x", s, 16, t, ps, true));
  assert.deepEqual([marks[1].source, marks[0].items], ["cache/t3-icons/1.png", ["P"]], "each its own: an icon, or none and its letter");
  assert.equal(reads.icons, 1, `${reads.icons} reads of the icons for one draw's 100 marks`);
  assert.equal(reads.settings, 1, `${reads.settings} reads of the settings for the font of one draw's 50 letters`);
  // The next draw's list is a new one, as panes() gives: what was found since shows.
  state["t3.spaceIcons"] = { ...state["t3.spaceIcons"], [JSON.stringify([null, "/work/0"])]: "cache/t3-icons/0.png" };
  assert.equal(projectMark("mods/t3-x", spaces[0], 16, t, [...ps], true).source, "cache/t3-icons/0.png");
}

// A space's own icon, found as T3 finds it, replaces its monogram.
(async () => {
  const runs = [], written = [];
  let asked = 0, published, scanned;
  const found = new Promise((done) => { published = done; });
  const ps = () => [{ pane: "A", tab: "b1", cwd: "/w/one/src" }];
  // Its terminal is down in the repo: the icon is the repo's, as T3's is its project root's.
  const space = { id: "s1", name: "One", folder: "", machine: "vps", tabs: [{ id: "b1" }] };
  const { projectMark, linkedIcon, state, context } = load({
    appHome: () => "/app", spaces: () => [space], panes: ps,
    fs: { exists: async () => false, mkdir: async () => {}, writeFile: async (p, b) => written.push([p, Buffer.from(b).toString()]) },
    readTextFile: async (p) => p === "/w/one/index.html" ? `<link href="/brand/logo.svg" rel="icon">` : null,
    exec: async (cmd, args, opts) => {
      asked++;
      if (args[1].includes("rev-parse")) { scanned = [args[1], args.slice(3), opts]; return { code: 0, stdout: "/w/one\0\0" }; }
      runs.push([args.slice(3), opts]);
      if (args[1].startsWith("base64")) return { code: 0, stdout: Buffer.from("<svg/>").toString("base64").replace(/(.{4})/g, "$1\n") };
      return { code: 0, stdout: args.includes("brand/logo.svg") ? "brand/logo.svg" : "" };
    },
  });
  // The look ends by publishing what it found.
  const set = context.setShared;
  context.setShared = (k, v) => { set(k, v); if (k === "t3.spaceIcons") published(); };
  assert.deepEqual(projectMark("mods/t3-x", space, 16, t, ps()).items, ["O"], "its letter until the look answers");
  await found;
  assert.match(scanned[0], /git --no-optional-locks -c core\.fsmonitor=false rev-parse --show-toplevel/);
  assert.match(scanned[0], /for f in favicon\.svg favicon\.ico /, "the well-known places first, in T3's order");
  assert.deepEqual([[...scanned[1]], { ...scanned[2] }], [["/w/one/src"], { on: "vps" }], "its place, on the space's own machine");
  assert.deepEqual([...runs[0][0]], ["public/brand/logo.svg", "brand/logo.svg"], "then the page's link, public/ first");
  assert.deepEqual({ ...runs[0][1] }, { cwd: "/w/one", on: "vps" }, "in the project's top, on the space's own machine");
  const [[at, bytes]] = written, icon = at.slice("/app/".length);
  assert.match(icon, /^cache\/t3-icons\/[0-9a-f]{16}\.svg$/); assert.equal(bytes, "<svg/>");
  assert.deepEqual({ ...state["t3.spaceIcons"] }, { [JSON.stringify(["vps", "/w/one/src"])]: icon });
  const pic = projectMark("mods/t3-x", space, 16, t, ps());
  assert.deepEqual([pic.kind, pic.source, pic.style.size], ["image", icon, 16], "the icon, no monogram beside it");
  const before = asked;
  projectMark("mods/t3-x", space, 16, t, ps());
  await new Promise((done) => setImmediate(done));
  assert.equal(asked, before, "found, it isn't looked for again within ten minutes");

  // linkedIcon strips '#' fragments as well as '?' query strings.
  assert.equal(linkedIcon(`<link rel="icon" href="/brand/logo.svg#icon">`), "/brand/logo.svg");
  assert.equal(linkedIcon(`<link rel="shortcut icon" href="/brand/logo.png?v=1#top">`), "/brand/logo.png");
  assert.equal(linkedIcon(`head: () => ({ links: [{ rel: "icon", href: "/app.ico#hash" }] })`), "/app.ico");

  // A look rejects files without a known image extension (including dots only in parent directories).
  for (const badHit of ["dir.v1/favicon", "favicon", "favicon.html", "favicon.icns"]) {
    let wrote = 0;
    const { lookUpAll: lookBad } = load({
      appHome: () => "/app",
      fs: { exists: async () => false, mkdir: async () => {}, writeFile: async () => { wrote++; } },
      readTextFile: async (p) => p === "/proj/index.html" ? `<link rel="icon" href="/${badHit}">` : null,
      exec: async (cmd, args) => {
        if (args[1].startsWith("base64")) return { code: 0, stdout: Buffer.from("x").toString("base64") };
        return { code: 0, stdout: args.includes(badHit) ? badHit : "" };
      },
    });
    assert.deepEqual([...await lookBad(null, ["/proj"])], [null], `rejects ${badHit}`);
    assert.equal(wrote, 0, `writes nothing for ${badHit}`);
  }
  {
    const wrote = [];
    const { lookUpAll: lookGood } = load({
      appHome: () => "/app",
      fs: { exists: async () => false, mkdir: async () => {}, writeFile: async (p, b) => wrote.push(p) },
      readTextFile: async (p) => p === "/proj/index.html" ? `<link rel="icon" href="/logo.WEBP#frag">` : null,
      exec: async (cmd, args) => {
        if (args[1].startsWith("base64")) return { code: 0, stdout: Buffer.from("img").toString("base64") };
        return { code: 0, stdout: args.includes("logo.WEBP") ? "logo.WEBP" : "" };
      },
    });
    const [res] = await lookGood(null, ["/proj"]);
    assert.match(res, /^cache\/t3-icons\/[0-9a-f]{16}\.webp$/);
    assert.equal(wrote.length, 1);
  }

  // Multiple mod copies share globalThis.t3ProjectLooked, and checks can reset it.
  {
    const sharedState = {};
    let lookCalls = 0, now = 1000;
    const modSrc = ["store.js", "color.js", "space-arrival.js", "project.js"].map((f) => kit.strip(fs.readFileSync(path.join(__dirname, f), "utf8"))).join("\n");
    const sp = { id: "s1", name: "One", folder: "/proj", machine: null, tabs: [] };
    const ctx = vm.createContext({
      image: (src) => element("image", src), svg: (src) => element("svg", src), h_flex: () => element(),
      checking: () => false, settings: () => ({}), run() {}, spaces: () => [sp], panes: () => [],
      shared: (k) => sharedState[k], setShared: (k, v) => { sharedState[k] = v; },
      readTextFile: async () => null, appHome: () => "/app",
      fs: { exists: async () => false, mkdir: async () => {}, writeFile: async () => {} },
      exec: async (cmd, args) => { if (args[1].includes("rev-parse")) lookCalls++; return { code: 1, stdout: "" }; },
      Buffer, createHash: require("node:crypto").createHash, Date: { now: () => now },
    });
    vm.runInContext(`${modSrc}\nglobalThis.copy1 = { projectMark };`, ctx);
    vm.runInContext(`(() => {\n${modSrc}\nglobalThis.copy2 = { projectMark };\n})();`, ctx);
    const settle = () => new Promise((done) => setImmediate(done));
    ctx.copy1.projectMark("mods/t3-a", sp, 16, t, []);
    await settle();
    assert.equal(lookCalls, 1);
    ctx.copy2.projectMark("mods/t3-b", sp, 16, t, []);
    await settle();
    assert.equal(lookCalls, 1, "second copy reuses shared t3ProjectLooked");
    ctx.t3ProjectLooked.clear();
    ctx.copy2.projectMark("mods/t3-b", sp, 16, t, []);
    await settle();
    assert.equal(lookCalls, 2, "clearing t3ProjectLooked triggers a fresh lookup");
  }

  // Every place a draw finds due is looked at with one command per machine, however many spaces there are: each command
  // forks Herdr's whole process, and a burst of them stalls every mod's render past its limit (#16).
  {
    const asked = [], published = [];
    const sp = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, name: `p${i}`, folder: `/w/${i}`, machine: i % 3 ? null : "vps", tabs: [] }));
    const { projectMark, context } = load({
      appHome: () => "/app", spaces: () => sp, readTextFile: async () => null,
      fs: { exists: async () => false, mkdir: async () => {}, writeFile: async () => {} },
      exec: async (cmd, args, opts) => { asked.push([cmd, opts?.on ?? null]); return { code: 0, stdout: "" }; },
    });
    const set = context.setShared;
    context.setShared = (k, v) => { set(k, v); if (k === "t3.spaceIcons") published.push(v); };
    sp.forEach((s) => projectMark("mods/t3-x", s, 16, t, []));
    await new Promise((done) => setImmediate(done));
    assert.deepEqual(asked.map(([, on]) => on).sort(), [null, "vps"], `${asked.length} commands for 30 spaces on two machines`);
    const icons = published.at(-1);
    assert.deepEqual(Object.keys(icons).length, 30, "every place answered");
    assert.ok(Object.values(icons).every((icon) => icon === null), "none has an icon");
    assert.ok(published.length <= 2, `${published.length} publications, one per machine at most`);
  }

  console.log("ok: a space's monogram, icon and place, read once for a draw's list of panes.");
})().catch((e) => { console.error(e); process.exitCode = 1; });
