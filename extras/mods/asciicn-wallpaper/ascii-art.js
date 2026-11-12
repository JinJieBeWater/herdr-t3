// An asciicn frame (its `.ans` export) as one-colour SVG tiles the theme tints: what the mod imports at run time and
// scripts/wallpaper.mjs makes the built-in pictures with. Plain JavaScript, no host calls, so both can run it.
//
// Each glyph is drawn as shapes, never as text: a mod's text collapses runs of spaces and its newlines, and the fonts at
// hand join `##` and `::` into ligatures. The shapes are asciicn's own (lib/ascii/glyphs.ts, MIT, LICENSE-asciicn):
// Braille as its 2×4 dots, blocks, quadrants and shades as rectangles, halftone dots as dots, diagonals as lines.
// Units: a cell is 1 tall and `aspect` wide; a dot's radius is in cell widths, as asciicn has it.
//
// A cell's colour picks a theme colour (an ANSI 16 colour as itself; truecolor by hue, grey as the foreground) and its
// brightness a step of opacity. Cells of one colour and step are one layer, cut into tiles of at most TILE cell heights
// across and down: GPUI rasterises an svg at its drawn size, misplaces one much past 3000 device px, and holds every
// tile's whole area in memory however few dots it has.

// Part of each import's cache key: raise it whenever a frame would convert differently, and every import converts again.
export const VERSION = 2;
const STEPS = [0.18, 0.32, 0.5, 0.75];
// Dense shade rectangles must also fit the host's 1 MiB text-write limit.
const TILE = 40;
// A line's width, in cell heights.
const WEIGHT = 0.14;

const SHAPES = new Map();
const dot = (cx, cy, r) => ({ kind: "dot", cx, cy, r });
const rect = (x, y, w, h) => ({ kind: "rect", x, y, w, h });
const line = (x1, y1, x2, y2) => ({ kind: "line", x1, y1, x2, y2 });
const define = (glyphs, shape) => { for (const g of glyphs) SHAPES.set(g, shape); };

define("█", [rect(0, 0, 1, 1)]);
[..."▁▂▃▄▅▆▇"].forEach((g, i) => define(g, [rect(0, 1 - (i + 1) / 8, 1, (i + 1) / 8)]));
[..."▏▎▍▌▋▊▉"].forEach((g, i) => define(g, [rect(0, 0, (i + 1) / 8, 1)]));
define("▀", [rect(0, 0, 1, 0.5)]);
define("▔", [rect(0, 0, 1, 0.125)]);
define("▐", [rect(0.5, 0, 0.5, 1)]);
define("▕", [rect(0.875, 0, 0.125, 1)]);
// Quadrants by mask: top-left 1, top-right 2, bottom-left 4, bottom-right 8.
[..." ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█"].forEach((g, mask) => {
  if (mask === 0 || mask === 15 || SHAPES.has(g)) return;
  define(g, [0, 1, 2, 3].filter((bit) => mask & (1 << bit)).map((bit) => rect((bit % 2) / 2, Math.floor(bit / 2) / 2, 0.5, 0.5)));
});
// Shades on a 2×4 sub-grid, as terminal fonts draw them.
const shade = (lit) => [0, 1, 2, 3].flatMap((y) => [0, 1].filter((x) => lit(x, y)).map((x) => rect(x / 2, y / 4, 0.5, 0.25)));
define("░", shade((x, y) => (y === 0 && x === 0) || (y === 2 && x === 1)));
define("▒", shade((x, y) => (x + y) % 2 === 0));
define("▓", shade((x, y) => !((y === 1 && x === 1) || (y === 3 && x === 0))));
// Braille: each bit a dot, [row][column].
const BRAILLE_BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
for (let mask = 1; mask < 256; mask++) {
  define(String.fromCodePoint(0x2800 + mask), BRAILLE_BITS.flatMap((bits, row) =>
    bits.flatMap((bit, column) => mask & bit ? [dot(column === 0 ? 0.3 : 0.7, (row + 0.5) / 4, 0.17)] : [])));
}
// Halftone dots, and what Mountain dusk's and Ocean waves' frames use as dots.
for (const [g, r] of Object.entries({ "·": 0.07, "∙": 0.13, "•": 0.24, "⦁": 0.33, "●": 0.42, ".": 0.1, ",": 0.1, "'": 0.1, "`": 0.1, "*": 0.24, "+": 0.24 })) define(g, [dot(0.5, 0.5, r)]);
define("╱/", [line(0, 1, 1, 0)]);
define("╲\\", [line(0, 0, 1, 1)]);
define("╳", [line(0, 1, 1, 0), line(0, 0, 1, 1)]);
define("-~", [line(0, 0.5, 1, 0.5)]);
define("_", [line(0, 0.95, 1, 0.95)]);
define("^", [line(0, 0.7, 0.5, 0.3), line(0.5, 0.3, 1, 0.7)]);
const HALFTONE = new Set("·∙•⦁●");

// Any other glyph (a custom ramp's `#`, `@`) is a round-ended bar standing in the cell, wider and taller the darker it is,
// by its place in this ramp, darkest last: in text cells, half as wide as tall, a dot would leave rows of stripes.
// shortcut: the glyph's own outline is lost; draw letters as paths if someone imports a frame where it matters.
const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const inked = (g) => {
  const at = RAMP.indexOf(g), t = at < 0 ? 0.6 : at / (RAMP.length - 1);
  return [{ kind: "bar", cx: 0.5, cy: 0.5, r: round(0.12 + 0.3 * t), k: round(0.05 + 0.25 * t) }];
};
const shapeOf = (g) => SHAPES.get(g) ?? (g.trim() === "" || g === "\u2800" ? [] : inked(g));

// The colour SGR codes leave set: null (the default ink), { ansi: n } or { rgb: [r, g, b] }.
function sgr(codes, color) {
  const p = codes === "" ? [0] : codes.split(";").map(Number);
  for (let i = 0; i < p.length; i++) {
    const n = p[i];
    if (n === 0 || n === 39) color = null;
    else if (n >= 30 && n <= 37) color = { ansi: n - 30 };
    else if (n >= 90 && n <= 97) color = { ansi: n - 90 + 8 };
    else if (n === 38 || n === 48) {
      const own = n === 38;
      if (p[i + 1] === 2) { if (own) color = { rgb: p.slice(i + 2, i + 5) }; i += 4; }
      else if (p[i + 1] === 5) { if (own) color = xterm(p[i + 2]); i += 2; }
    }
  }
  return color;
}
function xterm(n) {
  if (n < 16) return { ansi: n };
  if (n >= 232) { const v = 8 + 10 * (n - 232); return { rgb: [v, v, v] }; }
  const c = n - 16, v = (x) => (x ? 55 + 40 * x : 0);
  return { rgb: [v(Math.floor(c / 36)), v(Math.floor(c / 6) % 6), v(c % 6)] };
}

/** The theme colour (`foreground` or `ansiN`) and opacity step a cell's colour takes. */
export function tintOf(color) {
  if (!color) return { tint: "foreground", step: 3 };
  if (color.ansi !== undefined) return { tint: `ansi${color.ansi}`, step: 3 };
  const [r, g, b] = color.rgb;
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const step = l < 0.12 ? 0 : l < 0.25 ? 1 : l < 0.5 ? 2 : 3;
  if (max === 0 || (max - min) / max < 0.18) return { tint: "foreground", step };
  const [R, G, B] = [r, g, b].map((v) => v / 255), d = max - min;
  const hue = (max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4) * 60;
  const n = hue < 15 || hue >= 345 ? 1 : hue < 75 ? 3 : hue < 165 ? 2 : hue < 190 ? 6 : hue < 280 ? 4 : 5;
  return { tint: `ansi${l >= 0.45 ? n + 8 : n}`, step };
}

const round = (v) => +v.toFixed(3);

// One tile's svg: dots as zero-length round-capped strokes a path per size, bars as short upright ones a path per size,
// rectangles one filled path, lines one stroke.
function svg(cells, aspect, box) {
  const bySize = new Map(), bars = new Map(), rects = [], lines = [];
  for (const c of cells) for (const s of shapeOf(c.g)) {
    if (s.kind === "rect") rects.push([c, s]);
    else if (s.kind === "line") lines.push([c, s]);
    else if (s.kind === "bar") {
      const key = `${s.r} ${s.k}`;
      if (!bars.has(key)) bars.set(key, []);
      bars.get(key).push(`M${round((c.column + s.cx) * aspect)} ${round(c.row + s.cy - s.k)}v${round(2 * s.k)}`);
    } else {
      if (!bySize.has(s.r)) bySize.set(s.r, []);
      bySize.get(s.r).push([(c.column + s.cx) * aspect, c.row + s.cy]);
    }
  }
  const paths = [...bySize].map(([r, at]) => {
    // Each dot moves from the last, rows in order: short relative numbers keep a file about a third of absolute ones.
    at.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    let d = "", x = 0, y = 0;
    for (const [n, [cx, cy]] of at.entries()) {
      const px = round(cx), py = round(cy);
      d += n === 0 ? `M${px} ${py}h0` : `m${round(px - x)} ${round(py - y)}h0`;
      x = px; y = py;
    }
    return `<path stroke-width="${round(2 * r * aspect)}" d="${d}"/>`;
  });
  for (const [key, d] of bars) paths.push(`<path stroke-width="${round(2 * Number(key.split(" ")[0]) * aspect)}" d="${d.join("")}"/>`);
  if (rects.length) {
    const d = rects.map(([c, s]) => `M${round((c.column + s.x) * aspect)} ${round(c.row + s.y)}h${round(s.w * aspect)}v${round(s.h)}h${round(-s.w * aspect)}z`).join("");
    paths.push(`<path fill="#000" stroke="none" d="${d}"/>`);
  }
  if (lines.length) {
    const d = lines.map(([c, s]) => `M${round((c.column + s.x1) * aspect)} ${round(c.row + s.y1)}L${round((c.column + s.x2) * aspect)} ${round(c.row + s.y2)}`).join("");
    paths.push(`<path stroke-width="${WEIGHT}" d="${d}"/>`);
  }
  const { x0, y0, x1, y1 } = box;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${round(x1 - x0)} ${y1 - y0}" fill="none" stroke="#000" stroke-linecap="round">${paths.join("")}</svg>\n`;
}

/**
 * Converts a frame's `.ans` text. Yields `null` now and then, a place to let the UI breathe, and each tile as
 * `{ file, svg, tint, opacity, x0, x1, y0, y1 }`; returns `{ width, height, aspect }`, in cell heights.
 * `aspect` (a cell's width over its height) isn't in the file: by default a frame of halftone dots alone has asciicn's
 * square dot cells, any other its text cells, a 0.6em advance over a 1.2em line.
 */
export function* convert(text, aspect) {
  const lines = text.replace(/\r/g, "").split("\n");
  while (lines.length && lines.at(-1) === "") lines.pop();
  const cells = [];
  let color = null, columns = 0;
  for (const [row, l] of lines.entries()) {
    let column = 0;
    for (const m of l.matchAll(/\x1b\[([0-9;]*)m|\x1b\[[0-9;?]*[A-Za-z]|([^\x1b])/gu)) {
      if (m[1] !== undefined) color = sgr(m[1], color);
      else if (m[2] !== undefined) {
        if (shapeOf(m[2]).length) cells.push({ row, column, g: m[2], color });
        column += 1;
      }
    }
    columns = Math.max(columns, column);
    if (row % 16 === 15) yield null;
  }
  aspect ??= cells.length && cells.every((c) => HALFTONE.has(c.g)) ? 1 : 0.5;
  const layers = new Map();
  for (const c of cells) {
    const { tint, step } = tintOf(c.color), key = `${tint}-${step}`;
    if (!layers.has(key)) layers.set(key, { tint, step, cells: [] });
    layers.get(key).cells.push(c);
  }
  yield null;
  for (const [key, { tint, step, cells: mine }] of [...layers].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const opacity = step === 3 && tint === "foreground" ? 1 : STEPS[step];
    const groups = new Map();
    for (const c of mine) {
      const t = `${Math.floor((c.column * aspect) / TILE)}-${Math.floor(c.row / TILE)}`;
      if (!groups.has(t)) groups.set(t, []);
      groups.get(t).push(c);
    }
    for (const [t, these] of groups) {
      const box = these.reduce((b, c) => ({ x0: Math.min(b.x0, c.column), x1: Math.max(b.x1, c.column + 1), y0: Math.min(b.y0, c.row), y1: Math.max(b.y1, c.row + 1) }),
        { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
      box.x0 = round(box.x0 * aspect); box.x1 = round(box.x1 * aspect);
      yield { file: `${key}-${t}.svg`, svg: svg(these, aspect, box), tint, opacity, ...box };
    }
  }
  return { width: round(columns * aspect), height: lines.length, aspect };
}

// ---- An image, without the Studio: square halftone dots in true colour.

/** The sample grid: 96 bands of 4 pixels, columns as the image's aspect needs; each Dots cell samples 2×2 pixels. */
export function imageGrid(width, height) {
  const rows = 96, columns = Math.max(16, Math.min(480, Math.round((2 * rows * width) / height)));
  return { columns, rows, width: columns * 2, height: rows * 4 };
}

const B64 = new Map([..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"].map((c, i) => [c.charCodeAt(0), i]));

/**
 * A BMP (as `sips` or ImageMagick write it: 24 or 32 bits, uncompressed, top-down or bottom-up), given as base64, to
 * RGBA. Yields `null` now and then; returns `{ width, height, rgba }`.
 */
export function* decodeBmp(base64) {
  const text = base64.replace(/[^A-Za-z0-9+/]/g, ""), bytes = new Uint8Array(Math.floor((text.length * 3) / 4));
  let n = 0;
  for (let i = 0; i + 1 < text.length; i += 4) {
    const a = B64.get(text.charCodeAt(i)), b = B64.get(text.charCodeAt(i + 1));
    const c = B64.get(text.charCodeAt(i + 2)), d = B64.get(text.charCodeAt(i + 3));
    bytes[n++] = (a << 2) | (b >> 4);
    if (c !== undefined) bytes[n++] = ((b & 15) << 4) | (c >> 2);
    if (d !== undefined) bytes[n++] = ((c & 3) << 6) | d;
    if (i % 65536 === 0) yield null;
  }
  const u32 = (at) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24);
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) throw new Error("not a BMP");
  const data = u32(10), width = u32(18), signed = u32(22), bits = bytes[28] | (bytes[29] << 8), compression = u32(30);
  if ((bits !== 24 && bits !== 32) || (compression !== 0 && compression !== 3)) throw new Error(`a ${bits}-bit BMP, compression ${compression}`);
  const height = Math.abs(signed), stride = Math.ceil((bits * width) / 32) * 4, step = bits / 8, rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = data + (signed < 0 ? y : height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      const at = from + x * step, to = (y * width + x) * 4;
      rgba[to] = bytes[at + 2]; rgba[to + 1] = bytes[at + 1]; rgba[to + 2] = bytes[at]; rgba[to + 3] = 255;
    }
    if (y % 64 === 63) yield null;
  }
  return { width, height, rgba };
}

// Studio's autoLevels for an image: tones stretched so 0.5% of them clip at each end.
function* imageLevels({ width, height, rgba }) {
  const tones = new Float32Array(width * height), bins = new Uint32Array(256);
  for (let i = 0; i < tones.length; i++) {
    const t = (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) / 255;
    tones[i] = t;
    bins[Math.min(255, Math.round(t * 255))]++;
  }
  yield null;
  const clip = Math.floor((tones.length * 0.5) / 100);
  let low = 0, high = 255;
  for (let seen = 0; low < 255; low++) if ((seen += bins[low]) > clip) break;
  for (let seen = 0; high > 0; high--) if ((seen += bins[high]) > clip) break;
  const from = high > low ? low / 255 : 0, scale = high > low ? 255 / (high - low) : 1;
  return { tones, from, scale };
}

/**
 * Pixels on an `imageGrid` as square halftone dots in true colour: autoLevels first, then each 2×2 cell's average
 * tone picks its dot size and its four pixels' average colour supplies the ink.
 * Yields `null` now and then; returns the `.ans` text, as `toAnsi` writes it.
 */
export function* imageAns(pixels) {
  const { width, height, rgba } = pixels;
  const { tones, from, scale } = yield* imageLevels(pixels);
  // Averages rounded as asciicn's colour bytes are, by a clamped array: half to even.
  const lines = [], avg = new Uint8ClampedArray(3);
  for (let row = 0; row < height / 2; row++) {
    let line = "", current = "";
    for (let column = 0; column < width / 2; column++) {
      let tone = 0, r = 0, g = 0, b = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = (row * 2 + dy) * width + column * 2 + dx;
        tone += Math.max(0, Math.min(1, (tones[i] - from) * scale)) / 4;
        r += rgba[i * 4]; g += rgba[i * 4 + 1]; b += rgba[i * 4 + 2];
      }
      const glyph = tone > 0 ? "·∙•⦁●"[Math.min(4, Math.floor(tone * 5))] : " ";
      if (glyph === " ") { line += " "; continue; }
      avg[0] = r / 4; avg[1] = g / 4; avg[2] = b / 4;
      const code = `\x1b[38;2;${avg[0]};${avg[1]};${avg[2]}m`;
      if (code !== current) { line += code; current = code; }
      line += glyph;
    }
    lines.push(line + (current ? "\x1b[0m" : ""));
    if (row % 16 === 15) yield null;
  }
  return lines.join("\n") + "\n";
}
