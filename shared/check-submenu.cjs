// Loads submenu.js plain: where a submenu goes, the safe triangle, and when resting on rows opens or switches one.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = fs.readFileSync(path.join(__dirname, "submenu.js"), "utf8")
  .replace(/^export (function|const) /gm, "$1 ")
  + "\nglobalThis.sub = { SUB_DELAY, SUB_REST, SUB_ALIGN, subPlace, inTriangle, heading, hoverRow, subOpened, subLeft };";
const context = vm.createContext({});
vm.runInContext(src, context);
const { SUB_DELAY, SUB_REST, SUB_ALIGN, subPlace, inTriangle, heading, hoverRow, subOpened, subLeft } = context.sub;

// Placement: right of the row, its top 5 above the row's; left where only that fits; neither, the roomier side.
const row = { x: 100, y: 40, width: 200, height: 28 };
assert.deepEqual({ ...subPlace(row, 220, 0, 1000) }, { side: "right", x: 300, y: 40 + SUB_ALIGN });
assert.deepEqual({ ...subPlace({ ...row, x: 300, width: 100 }, 220, 0, 450) }, { side: "left", x: 80, y: 35 });
assert.equal(subPlace({ ...row, x: 300 }, 220, 0, 600).side, "left");
assert.equal(subPlace({ ...row, x: 50 }, 400, 0, 500).side, "right", "neither fits: more room on the right");

// The triangle, and heading toward a submenu on either side.
assert.ok(inTriangle({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }));
assert.ok(!inTriangle({ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }));
const right = { x: 300, y: 35, width: 220, height: 200 };
assert.ok(heading({ x: 250, y: 54 }, { x: 270, y: 70 }, right, "right"), "down and right, into the submenu's span");
assert.ok(!heading({ x: 250, y: 54 }, { x: 250, y: 90 }, right, "right"), "straight down: leaving for another row");
const left = { x: -120, y: 35, width: 220, height: 200 };
assert.ok(heading({ x: 150, y: 54 }, { x: 120, y: 70 }, left, "left"));

// Resting: a fake timer, run by hand.
let timers = [];
const cx = { timer: { after(ms, f) { const t = { ms, f, cancelled: false, cancel() { this.cancelled = true; } }; timers.push(t); return t; } } };
const fire = () => { const live = timers.filter((t) => !t.cancelled); timers = []; for (const t of live) t.f(cx); return live.map((t) => t.ms); };
const at = (x, y, rowY = 40) => ({ position: { x, y }, bounds: { x: 100, y: rowY, width: 200, height: 28 } });
const opened = [];
const s = {};
const apply = (key, b) => { opened.push(key); subOpened(s, key, key ? { x: b.x + b.width, y: b.y - 5, width: 220, height: 200 } : null, "right"); };

hoverRow(s, "snooze", at(150, 50), cx, apply);
assert.deepEqual(opened, [], "nothing opens before the delay");
hoverRow(s, "snooze", at(160, 50), cx, apply);
assert.deepEqual(fire(), [SUB_DELAY], "moving on the same row keeps one countdown");
assert.deepEqual(opened, ["snooze"]);
assert.equal(s.open, "snooze");

// On its own row nothing is pending; leaving for a plain row straight down closes it after the delay.
hoverRow(s, "snooze", at(250, 54), cx, apply);
assert.equal(timers.filter((t) => !t.cancelled).length, 0);
hoverRow(s, null, at(250, 80, 68), cx, apply);
assert.deepEqual(fire(), [SUB_DELAY]);
assert.deepEqual(opened, ["snooze", null]);
assert.equal(s.open, null);

// Heading to the open submenu across another row waits longer, and reaching it (subLeft) keeps it open.
hoverRow(s, "snooze", at(250, 54), cx, apply); fire();
hoverRow(s, "copy", at(270, 70, 68), cx, apply);
assert.equal(timers.at(-1).ms, SUB_REST, "inside the triangle: the longer rest");
subLeft(s);
assert.deepEqual(fire(), [], "on the submenu: nothing switches");
assert.equal(s.open, "snooze");
// Stopped inside the triangle on another row, that row wins after the rest.
hoverRow(s, "snooze", at(250, 54), cx, apply);
hoverRow(s, "copy", at(270, 70, 68), cx, apply);
assert.deepEqual(fire(), [SUB_REST]);
assert.equal(s.open, "copy");
// Out of the triangle on a row counting the long rest, the short delay takes over.
hoverRow(s, "copy", at(250, 54), cx, apply);
hoverRow(s, "pin", at(290, 75, 68), cx, apply);
hoverRow(s, "pin", at(120, 90, 68), cx, apply);
assert.deepEqual(fire(), [SUB_DELAY]);
assert.equal(s.open, "pin");

console.log("ok: a submenu's side and its row-level top, the safe triangle, and resting on rows to open, switch or keep one.");
