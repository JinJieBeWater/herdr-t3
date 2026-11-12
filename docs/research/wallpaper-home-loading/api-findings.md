# Home wallpaper blank after long hidden — native API and cache findings

Read-only survey of the installed API (`~/.config/herdr-app/{gpui-kit,herdr}.d.ts`) and the local
upstream source (`/Users/jinjiebewater/my/personal/fork/herdr-app`, vendored `gpui-pre`,
`gpui-kit`, `gpui-pre-apple`, `gpui-pre-macos`). Baseline `c927eba5`. No code changed, nothing
rebuilt.

Scope: which existing public options retain or preload an SVG raster while a pane is hidden, or
draw from a persistent native image handle; where the asset loader and eviction actually are.

## 1. What `svg(path)` does

| Step | Where |
| --- | --- |
| JS `svg(path)` → `Component::Svg` → `gpui::svg().path(AppAssets::cache_key(path))` | `vendor/gpui-kit/crates/shell/src/materialize.rs:1433-1456` |
| Element paints with `data: None` (path form) | `vendor/gpui-pre/src/elements/svg.rs:182-199` |
| `Window::paint_svg`: atlas key `AtlasKey::Svg(RenderSvgParams { path, size: ceil(bounds × 2) })` | `vendor/gpui-pre/src/window.rs:4914-4965`; factor `SMOOTH_SVG_SCALE_FACTOR = 2.0`, `svg_renderer.rs:81` |
| Cache miss → `SvgRenderer::render_alpha_mask(params, None)` → `asset_source.load(path)` **synchronously inside paint**, then usvg parse + resvg rasterize | `svg_renderer.rs:231-260` |
| Asset source: app root, 16 MiB cap, missing file → `Ok(None)` + one stderr `warn!` per path | `vendor/gpui-kit/crates/shell/src/assets.rs:86-127` |

Consequences worth knowing:

- Mod `svg()` does **not** use GPUI's async asset cache. `use_asset::<SvgAsset>` exists only for
  `external_path` (`svg.rs:165-168`), and `ImageSource` goes through `ImgResourceLoader` +
  `CachedLoad`. So an atlas miss is a blocking read+parse+raster, and there is no
  "load finished, notify the view" step to cancel or land late.
- Colour is applied when the sprite is drawn, not in the key (`window.rs:4956-4963`), so a theme
  change never re-rasterises.
- Size is in the key, so a change in computed SVG bounds or display scale can allocate a new
  tile; the old keys stay until explicit invalidation. The wallpaper pins its size to height,
  so changing sidebar width alone normally changes its crop rather than its raster size.

## 2. Where the raster lives, and every way it goes away

`AtlasState` holds `tiles_by_key: FxHashMap<AtlasKey, AtlasTile>`
(`vendor/gpui-pre/src/platform.rs:1725`). There is **no TTL, no LRU, no frame counter, no byte
budget** in that type (`platform.rs:1729-1796`). Removal is explicit only:

1. `remove(key)` — glyph tiles and `Window::drop_image` (`window.rs:5102-5112`), driven by Herdr's
   `invalidate_image` (`src/window.rs:4869-4874`).
2. `remove_svg(path)` — prefix match on the key's path (`platform.rs:1782-1796`), reached only via
   `Window::invalidate_svg` (`window.rs:4906-4909`), called only by Herdr's
   `invalidate_asset(path, …)` (`src/window.rs:4862-4867`) from the app-home watcher
   (`files_changed` → `changed_asset_paths`, `src/window.rs:3827-3831`, `4879-4960`; a changed
   directory expands to its files, `MAX_FILES = 2000`).
3. `AtlasState::clear` (`platform.rs:1741-1745`) — only used by tests (`platform.rs:3501`, `3538`).

The Metal backend frees a texture only when its last tile is removed
(`metal_atlas.rs:80-100`, `257-263`), so a tile that is never removed keeps its texture.

**No ageing by elapsed time or by rendered frames exists in this path.** A hidden pane simply
never paints, so nothing reads or drops anything; and the mod copy is not closed — "Hiding a copy
or switching tabs does not close it" (`gpui-kit.d.ts:557`), `owned_mods` keeps hidden nodes,
inactive stack children, hidden floats and every tab's pane mods (`src/window.rs:1219-1223`).

## 3. A possible chain from lost rasters to blank

Cached views replay their last scene instead of re-running paint:
`Window::replay` → `scene.replay(range…)` (`window.rs:3996-4003`). Those replayed primitives keep
their `AtlasTile` ids. The renderer then **silently skips** sprites whose atlas texture no longer
exists: `MetalAtlas::metal_texture` returns `None` once every tile in a texture is gone
(`metal_atlas.rs:26-32`) and `draw_monochrome_sprites` / the sprite pass return early
(`metal_renderer.rs:1058-1061`, `1114`).

GPUI's own repair for exactly this is one call:

```rust
if force_render {
    // Bypass cached view reuse so we don't replay stale atlas tile references after a
    // GPU device recovery.
    window.refresh();
}
```

`window.rs:1841-1846`; `Window::refresh` marks the window dirty so cached views rebuild
(`window.rs:2321-2326`).

`force_render` is a `RequestFrameOptions` field (`platform.rs:969-975`). **Nothing in this tree
ever sets it**: `grep -rn force_render` finds only the field, its plumbing and the test
(`window.rs:1719-1836`), and none in `vendor/gpui-pre-macos/src` or `vendor/gpui-kit/crates`. So
if the renderer/atlas is recreated under a running window (the recovery case the comment names),
no cached view is refreshed and the replayed sprites draw nothing.

## 4. Other ways a tile can end up drawing nothing

- Zero-size bounds: `render_alpha_mask` bails with "can't render at a zero size"
  (`svg_renderer.rs:236`), and `Svg::paint` swallows it (`.log_err()`).
- Missing or unreadable file at rebuild time: `load` returns `Ok(None)` → nothing drawn +
  one warning (`assets.rs:106-127`).
- Parse/raster failure → the tile is never inserted; every paint retries.
- A tile wider/taller than 8192 device px is clamped, not dropped (`svg_renderer.rs:262-283`).

## 5. Existing public options (all of them)

No preload/prefetch/warm/retain API exists for SVG: `grep -ci "preload\|prefetch\|warm"` is 0 in
both `.d.ts` files, and `svg(path)` takes only a path — no bytes, no `external_path`, no raster
handle (`gpui-kit.d.ts:20274-20291`). There is also no visibility hook: `window()` exposes only
platform/titlebar/buttons/maximized/fullscreen/active (`herdr.d.ts:252-259`), and `View` offers
`init`/`update`/`close`/`render` only (`gpui-kit.d.ts:541-564`). A mod cannot observe "shown
again" except by drawing (`on_size_change`), a timer, `nextCommand`, or `watchFolder`.

What does exist:

| Option | Evidence | Raster lifetime |
| --- | --- | --- |
| `image(path)` — full-colour, ignores `text_color` | `gpui-kit.d.ts:20284-20291`; `materialize.rs:1486-1494` → `gpui::img(ImageSource::Resource(Embedded(cache_key)))` | decoded `Arc<RenderImage>` retained in GPUI's app-level `CachedLoad` until `remove_asset` (`app.rs:2890-2934`), raster per `ImageId` in the same atlas (`window.rs:4990-5110`). Adds a persistent *decoded* handle; same no-ageing atlas. |
| `window.paint_path(path, background)` + `PathBuilder` | `gpui-kit.d.ts:20368-20384`, `20466-20476`; `materialize.rs:1497-1511` → `NativePath` → `Window::paint_path` (`window.rs:4654-4666`) | no cached raster at all: tessellated per frame into the path intermediate texture (`metal_renderer.rs:715-740`, `779+`). Cannot go stale, costs a rasterisation every frame. |
| `svg(path)` | `gpui-kit.d.ts:20282` | window-scoped atlas tile, key `(cache_key, device px)`; leaves only via §2. |

For scale, the wallpaper draws one `svg` per colour/opacity tile, tiles at most `TILE = 40` cells
(`extras/mods/asciicn-wallpaper/ascii-art.js:20`), each at `(x1-x0)*unit` × `(y1-y0)*unit` logical
px, so the atlas key size is twice that. `MAX_ATLAS_SIZE` is 16384 (`metal_atlas.rs:139-145`).

## 6. What this means for the reproduction

- "Hidden for 130 s / 40 s" cannot evict anything by itself: no counter or clock governs these
  rasters. A tight loop that only hides the tab will not reproduce it by cache ageing.
- Two source-level possibilities are (a) a replayed cached scene whose atlas textures are
  gone, reachable only if the window's atlas/renderer is rebuilt under a live window — and
  `force_render` (the guard) is never requested in this build; and (b) a rebuild that fails
  because the tile file is missing/empty/zero-size at paint time.
- To tell them apart, capture for one transition: did `invalidate_asset` fire while Home was
  hidden (Herdr's own watcher, independent of the mod's `watchFolder`), did the view re-materialise
  (a `render()` call) or was the scene replayed (`Scene::replay`), and the stderr lines
  `asset '…' was not found` / `can't render at a zero size`.
- GPU-cache pressure: the only budget in the path is 16 MiB per asset file (`assets.rs:35-36`);
  the atlas itself is unbounded, and nothing recreates it at runtime in this tree.

## Uncertainties

- The exact source revision used to build the installed binary was not established. This
  source survey is supporting evidence, rather than proof of the user's runtime cause.
- Whether a renderer/atlas rebuild under a live macOS window exists at all in this build (the
  `force_render` path suggests it does upstream); I did not trace `gpui-pre-macos` window
  recreation, sleep/wake or display-change handling.
- Whether macOS reclaims the Metal texture contents of an occluded app; the source cannot answer
  that.
- Exact ratio of tiles to texture allocations per wallpaper width was not measured.
