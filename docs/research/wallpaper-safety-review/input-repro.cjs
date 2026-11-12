// Read-only converter evidence. Run from the repo root with node; --native adds synthetic sips/ImageMagick checks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../..");
const relative = "extras/mods/asciicn-wallpaper/ascii-art.js";
const context = vm.createContext({});
const revision = process.argv.find(a => a.startsWith("--revision="))?.slice(11);
const source = revision ? execFileSync("git", ["show", `${revision}:${relative}`], { cwd: root, encoding: "utf8" }) : fs.readFileSync(path.join(root, relative), "utf8");
vm.runInContext(source.replace(/^export /gm, "") + "\nglobalThis.art = { convert, decodeBmp, imageGrid, brailleAns, imageAns: typeof imageAns === 'undefined' ? null : imageAns };", context);
const { convert, decodeBmp, imageGrid, brailleAns, imageAns } = context.art;
function finish(it) { for (;;) { const s = it.next(); if (s.done) return s.value; } }
function draw(text) {
  let count = 0, largest = 0, bytes = 0, longestStepMs = 0;
  const it = convert(text);
  for (;;) {
    const start = performance.now(), s = it.next();
    longestStepMs = Math.max(longestStepMs, performance.now() - start);
    if (s.done) return { ...s.value, count, largest, bytes, longestStepMs: Math.round(longestStepMs) };
    if (s.value) {
      const n = Buffer.byteLength(s.value.svg);
      largest = Math.max(largest, n); bytes += n; count++;
      assert.doesNotMatch(s.value.svg, /<script|onload=|javascript:|NaN|Infinity/);
      assert.match(s.value.file, /^[a-z0-9.-]+\.svg$/);
    }
  }
}
for (const glyph of ["▒", "▓"]) {
  const rows = glyph === "▓" ? 42 : 80;
  const text = (glyph.repeat(160) + "\n").repeat(rows), result = draw(text);
  if (revision) {
    assert.equal(result.count, 1);
    assert.ok(result.largest > 1024 * 1024, "historical counterexample: one tile exceeds the native write limit");
  } else {
    assert.ok(result.count > 0);
    assert.ok(result.largest <= 1024 * 1024, "current tiles must fit the native write limit");
  }
  console.log(JSON.stringify({ attack: "tile-write-limit", glyph, inputBytes: Buffer.byteLength(text), ...result }));
}
assert.ok(draw(("▓".repeat(160) + "\n").repeat(41)).largest <= 1024 * 1024, "one fewer row stays below the boundary");
if (!revision) assert.ok(draw(("▓".repeat(160) + "\n").repeat(80)).largest <= 1024 * 1024, "a full shade frame must also fit native writes");
// Malformed SGR and foreign escapes are untrusted bytes, never inserted into SVG markup or filenames.
for (const text of ["\x1b[38;2;255m█", "\x1b[38;5;999999m█", "\x1b[38;5m█", "\x1b]0;<script onload=alert(1)>\x07█", "\x1b[" + "0;".repeat(10000) + "m█", "<script>█</script>", "\x1b[2J█\r\n"]) draw(text);
console.log("ok: seven ANSI/markup boundary inputs remain numeric SVG shapes");
for (const [w, h] of [[1, 1], [1, 100000], [100000, 1], [4000, 100], [100, 4000]]) {
  const grid = imageGrid(w, h);
  assert.ok(grid.width >= 32 && grid.width <= 960 && grid.width % 2 === 0);
  assert.equal(grid.height, 384);
}
// This matches the largest grid the real raster caller requests. No arbitrary oversized pixel API calls.
const pixels = { width: 960, height: 384, rgba: new Uint8Array(960 * 384 * 4).fill(255) };
for (const style of imageAns ? ["braille", "blocks", "dots"] : ["braille"]) {
  const text = finish(imageAns ? imageAns(pixels, style) : brailleAns(pixels)), result = draw(text);
  assert.ok(result.largest < 1024 * 1024);
  assert.equal(result.width / result.height, 960 / 384);
  console.log(JSON.stringify({ attack: "max-raster-grid", style, inputBytes: Buffer.byteLength(text), ...result }));
}
if (imageAns) {
  // Three lit quadrants expand to more rectangles than white; ▟ is the longest of the four patterns.
  for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
    const v = y % 4 < 2 && x % 2 === 0 ? 0 : 255;
    const at = (y * pixels.width + x) * 4;
    pixels.rgba[at] = pixels.rgba[at + 1] = pixels.rgba[at + 2] = v;
  }
  const result = draw(finish(imageAns(pixels, "blocks")));
  assert.ok(result.largest < 1024 * 1024);
  console.log(JSON.stringify({ attack: "max-raster-three-quadrants", ...result }));
}
if (process.argv.includes("--native")) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wallpaper-input-review-"));
  const exec = (cmd, args) => execFileSync(cmd, args, { timeout: 10000, maxBuffer: 1024 * 1024, env: { ...process.env, MAGICK_THREAD_LIMIT: "1", MAGICK_MEMORY_LIMIT: "32MiB", MAGICK_MAP_LIMIT: "32MiB", MAGICK_DISK_LIMIT: "32MiB", MAGICK_TIME_LIMIT: "5" } });
  try {
    for (const [name, args] of [["bilevel", ["-size", "8x8", "pattern:checkerboard", "-threshold", "50%"]], ["gray", ["-size", "8x8", "gradient:"]], ["rgba", ["-size", "8x8", "xc:none", "-fill", "red", "-draw", "rectangle 0,0 3,7"]], ["rgb", ["-size", "8x8", "xc:red"]]]) {
      const png = path.join(dir, `${name}.png`);
      exec("magick", [...args, png]);
      for (const tool of process.platform === "darwin" ? ["sips", "magick"] : ["magick"]) {
        const bmp = path.join(dir, `${name}-${tool}.bmp`);
        exec(tool, tool === "sips" ? ["-s", "format", "bmp", "-z", "384", "32", png, "--out", bmp] : [png + "[0]", "-resize", "32x384!", `bmp3:${bmp}`]);
        const bytes = fs.readFileSync(bmp), result = finish(decodeBmp(bytes.toString("base64")));
        assert.equal(result.width, 32); assert.equal(result.height, 384);
        if (name === "rgb") assert.deepEqual([...result.rgba.slice(0, 4)], [255, 0, 0, 255]);
        console.log(JSON.stringify({ attack: "real-bmp-producer", name, tool, bits: bytes.readUInt16LE(28), compression: bytes.readUInt32LE(30), firstPixel: [...result.rgba.slice(0, 4)] }));
      }
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
