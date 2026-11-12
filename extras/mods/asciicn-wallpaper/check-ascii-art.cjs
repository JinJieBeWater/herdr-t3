// Loads ascii-art.js and converts small asciicn-style frames: colours to theme tints, glyphs to shapes, the cell aspect.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "ascii-art.js"), "utf8").replace(/^export (function\*?|const) /gm, "$1 ")
  + "\nglobalThis.art = { convert, tintOf, imageGrid, decodeBmp, brailleAns };";
const context = vm.createContext({});
vm.runInContext(src, context);
const { convert, tintOf, imageGrid, decodeBmp, brailleAns } = context.art;

// All of a conversion: the tiles and what it returns.
function run(text, aspect) {
  const it = convert(text, aspect), tiles = [];
  for (;;) {
    const step = it.next();
    if (step.done) return { tiles, ...step.value };
    if (step.value) tiles.push(step.value);
  }
}
const count = (svg, s) => svg.split(s).length - 1;
const E = (codes) => `\x1b[${codes}m`;

// Truecolor Braille, as Studio's .ans export writes it: each set bit a dot, the cells text cells half as wide as tall.
{
  const r = run(`${E("38;2;255;0;0")}⠿⣿${E("0")}\n`);
  assert.equal(r.aspect, 0.5, "Braille sits in text cells");
  assert.deepEqual([r.width, r.height], [1, 1]);
  assert.equal(r.tiles.length, 1);
  const [t] = r.tiles;
  assert.deepEqual({ tint: t.tint, opacity: t.opacity }, { tint: "ansi1", opacity: 0.32 }, "dark red: red, a low step");
  assert.equal(count(t.svg, "h0"), 6 + 8, "⠿ has six dots, ⣿ eight");
  assert.match(t.svg, /stroke-width="0\.17"/, "radius 0.17 cell widths, at half a cell height wide");
}
// Halftone dots alone: asciicn's square dot cells; one size a path.
{
  const r = run("·•●\n●•·\n");
  assert.equal(r.aspect, 1);
  assert.deepEqual([r.width, r.height], [3, 2]);
  assert.equal(r.tiles[0].tint, "foreground", "no colour: the theme's foreground, at full");
  assert.equal(r.tiles[0].opacity, 1);
  assert.equal(count(r.tiles[0].svg, "<path"), 3);
}
// ANSI 16 colours are the theme's own; 256 colours by their rgb; a reset goes back to the foreground.
{
  const r = run(`${E("94")}█${E("38;5;196")}█${E("39")}█\n`);
  assert.deepEqual(r.tiles.map(t => t.tint).sort(), ["ansi1", "ansi12", "foreground"].sort());
  assert.ok(r.tiles.every(t => count(t.svg, 'fill="#000"') === 1), "blocks are filled rectangles");
  assert.deepEqual(plainTint([255, 255, 255]), { tint: "foreground", step: 3 });
}
function plainTint(rgb) { return JSON.parse(JSON.stringify(tintOf({ rgb }))); }
// A background colour doesn't change the ink; CRLF lines and other escapes are no cells.
{
  const r = run(`${E("48;2;0;0;255")}${E("38;2;0;200;0")}▀\x1b[2K${E("48;5;4")}▄\r\n▌\r\n`);
  assert.deepEqual([r.width, r.height], [1, 2], "two columns at half a cell each, two rows");
  assert.deepEqual(r.tiles.map(t => t.tint), ["ansi10"], "green throughout, the background ignored");
  assert.equal(count(r.tiles[0].svg, "z"), 3, "▀ ▄ ▌: three rectangles");
}
// A custom ramp's other glyphs are upright bars as big as they're dark; spaces and the empty Braille cell draw nothing.
{
  const bar = (g) => { const s = run(`${g}\n`).tiles[0].svg; return [Number(s.match(/stroke-width="([\d.]+)"/)[1]), Number(s.match(/v([\d.]+)"/)[1])]; };
  const [at, colon] = [bar("@"), bar(":")];
  assert.ok(at[0] > colon[0] && at[1] > colon[1] && colon[0] > 0, "@ wider and taller than :");
  assert.ok(at[1] + at[0] > 0.6, "a dark one stands most of the cell's height: no rows of stripes");
  assert.deepEqual(run("  \u2800 \n").tiles, []);
}
// Tiles cut at 80 cell heights, the box in cell heights.
{
  const r = run(`${"●".repeat(170)}\n`);
  assert.deepEqual(r.tiles.map(t => [t.x0, t.x1]), [[0, 80], [80, 160], [160, 170]]);
  assert.equal(new Set(r.tiles.map(t => t.file)).size, 3, "a name each");
}
// An image without the Studio. A BMP as sips writes it (24-bit, top-down, rows padded to 4 bytes) or ImageMagick's
// bmp3 (bottom-up), here 32-bit too; pixels given top row first as [r, g, b].
const finish = (it) => { for (;;) { const s = it.next(); if (s.done) return s.value; } };
function bmp(rows, { bits = 24, topDown = true } = {}) {
  const h = rows.length, w = rows[0].length, step = bits / 8, stride = Math.ceil((bits * w) / 32) * 4, out = Buffer.alloc(54 + stride * h);
  out.write("BM"); out.writeUInt32LE(out.length, 2); out.writeUInt32LE(54, 10); out.writeUInt32LE(40, 14);
  out.writeInt32LE(w, 18); out.writeInt32LE(topDown ? -h : h, 22); out.writeUInt16LE(1, 26); out.writeUInt16LE(bits, 28);
  rows.forEach((row, y) => row.forEach(([r, g, b], x) => {
    const at = 54 + (topDown ? y : h - 1 - y) * stride + x * step;
    out[at] = b; out[at + 1] = g; out[at + 2] = r;
  }));
  return out.toString("base64").replace(/(.{76})/g, "$1\n");
}
{
  const px = [[[255, 0, 0], [0, 255, 0], [0, 0, 255]], [[1, 2, 3], [4, 5, 6], [7, 8, 9]]];
  for (const opts of [{}, { topDown: false }, { bits: 32 }, { bits: 32, topDown: false }]) {
    const img = finish(decodeBmp(bmp(px, opts)));
    assert.deepEqual([img.width, img.height], [3, 2]);
    assert.deepEqual([...img.rgba.slice(0, 4), ...img.rgba.slice(20, 24)], [255, 0, 0, 255, 7, 8, 9, 255], `top row first, ${JSON.stringify(opts)}`);
  }
  assert.throws(() => finish(decodeBmp(Buffer.from("GIF89a").toString("base64"))), /not a BMP/);
}
{
  // One cell: its left column light, its right dark. The tones stretch to the full range first, so even a dim picture
  // lights its lighter half; the colour is the average of all eight, rounded half to even as asciicn's bytes are.
  const cell = (light, dark) => [0, 1, 2, 3].map(() => [[light, light, light], [dark, dark, dark]]);
  const text = finish(brailleAns(finish(decodeBmp(bmp(cell(255, 0))))));
  assert.equal(text, "\x1b[38;2;128;128;128m⡇\x1b[0m\n", "⡇: the left column; (255 * 4) / 8 = 127.5 → 128");
  assert.equal(finish(brailleAns(finish(decodeBmp(bmp(cell(70, 50)))))).replace(/\x1b\[[0-9;]*m/g, ""), "⡇\n", "dim, it's levelled: the lighter half lights");
  assert.equal(finish(brailleAns(finish(decodeBmp(bmp(cell(90, 90)))))), "\n", "one tone: nothing to stretch, and nothing past 0.5");
  const r = run(text);
  assert.deepEqual([r.aspect, r.tiles.length, count(r.tiles[0].svg, "h0")], [0.5, 1, 4], "and on as any frame: four dots");
}
// The grid: 96 rows of cells, as many columns as the picture's shape needs at two cells' width to one's height.
assert.deepEqual(JSON.parse(JSON.stringify(imageGrid(1000, 500))), { columns: 384, rows: 96, width: 768, height: 384 });
assert.equal(imageGrid(4000, 100).columns, 480, "a strip is capped");
assert.equal(imageGrid(100, 4000).columns, 16);
// The build script passes the aspect it knows.
assert.equal(run("●\n", 0.75).width, 0.75);
console.log("ok: ascii-art converts colours, glyphs, aspect and tiles.");
