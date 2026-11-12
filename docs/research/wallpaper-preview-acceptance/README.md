# Wallpaper preview acceptance

The subsequent [large-file save regression](large-save.md) records the original-image failure and successful native replay after the fix.

Verified on 2026-11-12 in the existing `word-acceptance` macOS VM, using an isolated Herdr app home and core. The demo window was 1280 × 699 at zoom 1, with the layout's default 256px sidebar. The host desktop received no GUI input. The pictures below show the whole demo window; they remain local evidence, excluded from Git by the repository's screenshot policy.

## Observed behavior

- Real clicks opened `+`, the image picker and a generated landscape PNG. Before Apply, no `.ans` was saved and the shared selection stayed unchanged.
- Braille, Blocks and Dots each displayed across Home. All three retained the same subject placement after the canvas fix. The style illustrations, labels and action buttons fit inside the preview card.
- Cancel restored the original picture and left no `.ans` or draft files. This was checked in the UI and on disk.
- Apply saved exactly one `Landscape.ans`, selected `file:Landscape`, and removed its draft folder. The saved picture matched the preview pixel for pixel in the area above the card's shadow.
- `×` opened a named `Delete Landscape?` confirmation. Cancel preserved the `.ans`, its SVG cache and the selected picture. A second `×` followed by Delete removed the import and cache and selected another picture.
- The original PNG retained SHA-256 `f7829948212ac94d617c1d586bc531d34e31a93b48313f3d513ed5b2e2376868` after Apply and Delete.
- The collapsed add card and expanded three-step Studio guide both fit. Keyboard focus followed by Enter opened the add card. Herdr reported no errors after the acceptance flows.

The native file picker was exercised through Cua Driver. A successful file-open action closed the picker even though its AX transport returned an error; the resulting preview and process exit were checked before continuing. Action dispatch alone was never treated as proof.

## Whole-window evidence

| State | Screenshot |
|---|---|
| Add card | [add.png](add.png) |
| Studio steps | [studio-guide.png](studio-guide.png) |
| Braille preview | [braille.png](braille.png) |
| Blocks preview | [blocks.png](blocks.png) |
| Dots preview | [dots.png](dots.png) |
| Named delete confirmation | [delete-confirmation.png](delete-confirmation.png) |

## Automated checks and review

`scripts/check.sh` printed `all checks passed`. Focused `herdr-app check`, TypeScript and both wallpaper checks passed as well. The lifecycle check covers cancelled or superseded jobs, two Home copies racing to convert an import, an atomic save conflict, finished `.ans` import, and deletion failure. The converter checks cover full image extents with blank borders, spatial block patterns, dot aspect and colour sampling.

Executable review replay and its fixes are recorded in [the review](../wallpaper-preview-review.md). GUI acceptance caught a separate framing issue: trimming trailing blank cells and rows changed the inferred canvas size. Both image serializers now preserve those blanks; the original scene was replayed in all three styles.

The dedicated `.ans` import path was checked automatically; this round's real picker test used PNG. Linux and Windows dialogs, real OS permission failures and a complete keyboard traversal were not exercised. EXIF rotation and ordinary ASCII letter outlines retain the documented limits. No source images or generated test wallpapers are shipped with these screenshots.

The task's demo, isolated core, input fixture and temporary captures were removed. The VM shut down through the native macOS confirmation and Lume reported `stopped`.
