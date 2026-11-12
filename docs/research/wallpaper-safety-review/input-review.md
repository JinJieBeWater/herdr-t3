# Wallpaper input/converter safety review

## Current resolution (2026-11-12)

The authorized converter fix reduces `TILE` from 80 to 40 cell-heights and raises `VERSION` from 1 to 2, so imported frames regenerate their cached tiles. A regression at the public `convert` boundary checks native-write byte limits and unchanged canvas extents for dense shades, full Braille, quadrants, diagonals, fallback bars and halftone dots. The original audit below is historical, including its unmodified-code verdict and measured 80-cell tile sizes.

`input-repro.cjs` without arguments now asserts the current fix; `--revision=52c9db96` (or either older audit revision below) asserts the historical oversized-tile counterexample. It no longer substitutes a proposed fix into an in-memory source copy. Native rendering, full-suite checks, synchronization and commits remain the integrating agent's scope.

Validation: `node extras/mods/asciicn-wallpaper/check-ascii-art.cjs` first failed on a 1,369,754-byte dense `▒` tile, then passed after the fix. `node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs` likewise failed before the fix and passed afterward: the original 20,202-byte `▓` frame now produces four tiles, largest **507,355 bytes**, with unchanged 80×42 canvas. The same command with `--revision=52c9db96` still reproduces its historical single **1,060,714-byte** tile. Maximum-grid Braille/Blocks/Dots and the three-quadrant fixture also pass. A bounded probe of all 366 defined/ramp/fallback glyphs at column 2000, row 1000 emitted 370 tiles, largest **588,960 bytes** (`▓`); this challenges longer absolute coordinates as well as every supported shape. `git diff --check` passed. No files were deleted.

What this change does: Images can preview as Braille, Blocks or Dots before Apply. The converter now preserves blank image edges and adds the Blocks and Dots generators.

Scope: `ascii-art.js`, `check-ascii-art.cjs`, and reachable `main.js` calls only to establish input/output limits. Baseline `c72734e0`; candidate `36c359ea`. Expected load: one person, possibly several Home copies. No IO/naming/cache/concurrency audit, subagents, implementation edits, install/sync or commits.

## Must fix

1. **A small shade drawing produces an SVG the host refuses to write** (`extras/mods/asciicn-wallpaper/ascii-art.js:40-43,137-139,183-192`; caller `main.js:101-106`; test gap `check-ascii-art.cjs:68-72`). **Existing, not introduced by this change.**
   - **What this is:** Imported block/shade characters become SVG rectangles, grouped into tiles 80 cell-heights wide and high. Each tile is written in one `writeTextFile` call.
   - **Problem:** `("▓".repeat(160) + "\n").repeat(42)` is only **20,202 UTF-8 bytes**, but produces one **1,060,714-byte** SVG. The host accepts at most **1,048,576 bytes per write**. Six rectangles per shaded cell exceed that limit well before the tile reaches its maximum height. A full `▒` tile produces 1,369,754 bytes; a full `▓` tile produces 2,028,954 bytes.
   - **Fix:** Reduce `TILE` to 40, bump `VERSION`, and add a shade-heavy tile byte-limit assertion. An in-memory `TILE=40` candidate fits the same full shade frame; no production code was changed. The existing tile test checks geometry, not the write limit.
   - **If we skip it:** Importing a modest shade-heavy `.ans` fails with the native text-size error. The source remains on disk, but the wallpaper is unavailable. This is an import reliability bug, not code execution or source-image loss.

### Contract and reachability

- `docs/user/extras.md:19,25-27` accepts `.ans` drawings through Studio import and the watched folder, and promises block shapes. `ascii-art.js:39-43` explicitly defines the three standard shade block glyphs. No malformed BMP or arbitrary pixel API is needed.
- `main.js:146-149` reads `.ans` through `exec("cat", ...)` and passes the text unchanged to the converter. The documented exec output limit is 8 MiB; this counterexample is far smaller.
- `docs/research/wallpaper-preview-acceptance/large-save.md` records the actual native 1 MiB writer error and its exact boundary. That existing native proof was reused, not replayed through GUI.
- The same counterexample produces the same SVG sizes on the parent revision. The affected shape, serialization and tile-grouping code is unchanged in this patch. New image styles emit quadrants/dots, not shade characters, so this is **not** a newly introduced image-preview failure.
- Shrinking the 160-column `▓` frame to 41 rows produces 1,035,234 bytes, below the limit; 42 rows is the first failing height at this width.

### Runnable evidence

From the repo root:

```sh
node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs
node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs --revision=c72734e0
```

The harness asserts the oversized output to preserve the counterexample; exit 0 means the observation was reproduced, not that the production contract passed. It also loads a smaller-tile candidate in a separate VM context to challenge the proposed fix. It never modifies the source.

## Attacks that survived

| Contract | Attack and observed result |
|---|---|
| Untrusted `.ans` bytes must not become executable SVG or paths | Seven inputs: incomplete truecolour/indexed colours, an oversized colour index, OSC containing script-like text, literal script-like text, a 10,000-parameter SGR and CSI/CRLF. Emitted SVG remained numeric shapes; filenames remained restricted converter-generated names. No script/attribute/URL injection was found. This does not promise faithful rendering of foreign OSC controls. |
| Raster import must remain bounded by its real caller | Five extreme positive source-size ratios all produced an even width from 32 to 960 and height 384. No arbitrary oversized `imageAns` API input was used. |
| All supported styles must fit native tile writes at the largest requested grid | White 960×384 pixels: Braille's largest tile was 820,952 bytes; Blocks 254,556; Dots 38,716. A repeated three-quadrant Blocks pattern, which expands more than white, reached 1,019,356 bytes, still below the limit. All kept the expected 2.5:1 frame shape. |
| Decoder must accept BMPs the actual producers emit | Synthetic bilevel, gray, RGBA and RGB PNGs were resized through the exact `sips`/`bmp3` conversion forms from the caller, eight BMPs total. All decoded to 32×384. RGB red was retained. `sips` RGBA produced 32-bit compression 3; all other cases produced 24-bit compression 0. |
| Current converter checks must still pass | Ran `node extras/mods/asciicn-wallpaper/check-ascii-art.cjs` once: `ok: ascii-art converts colours, glyphs, aspect and tiles.` |

Optional native-producer command, using only synthetic files and deleting its own temporary folder in `finally`:

```sh
(ulimit -c 0; ulimit -t 20; node --max-old-space-size=256 docs/research/wallpaper-safety-review/input-repro.cjs --native)
```

This command passed on macOS with installed `sips` and ImageMagick. Each native subprocess has a 10-second timeout and 1 MiB captured-output cap; ImageMagick has one thread, 32 MiB memory/map/disk limits and a 5-second internal limit. Converter runs used a 256 MiB V8 heap cap and 20-second CPU limit. These were moderate bounded fixtures, not a heap-exhaustion attack or a hard OS-wide RSS guarantee.

## Bounds and gaps

- No actionable new converter regression was found in the changed hunks. Current input handling is nevertheless **Broken** for the existing shade-tile write counterexample above. Verdict: fix finding 1 for reliable supported `.ans` import; do not attribute it to the new styles.
- Malformed BMP dimensions/masks are not reported as vulnerabilities: external raster files first pass through trusted resizing tools, and this decoder only receives their bounded BMP output. The real producers tested above survived; arbitrary corrupted `decodeBmp` calls are outside the reachable contract.
- The external `.ans` path has no explicit cell/geometry budget in `convert`. Near-8-MiB frames, worst-case host memory, UI responsiveness, and repeated native rendering were not stress-tested; no host-crash claim is made. This evidence only bounds the moderate frames and maximum raster grid tested here.
- Full `scripts/check.sh` and the original >1 MiB Apply native replay were already passed on this HEAD and were reused. No whole-suite rerun, GUI/click test, original user image, EXIF review or ASCII-letter-outline review.
- Only this report and `input-repro.cjs` were added. No files were deleted; synthetic temporary images were cleaned up. No production changes or commits.
