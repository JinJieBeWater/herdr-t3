# Wallpaper preview review

What this change does: Images become temporary Home previews with Braille, Blocks and Dots. Apply saves a drawing; Cancel discards it. Studio imports skip the style picker, and deleting an import asks for its name first.

Baseline: `5f5387cb`, reviewed against the working tree. Perspective: lifecycle, file safety, dimensions, selection and asynchronous work. Expected load: one person, including two live Home copies. No subagents or production changes.

## Re-review: both findings resolved

The author changed shared conversion tracking to a map of promises. Waiters now await the owner and reload the cache; loading a cached scene also completes that copy's pending selection. Deletion now removes the source first and keeps its cache untouched if that fails. Cache cleanup runs separately after a successful deletion.

Replayed the original two-Home schedule against the updated code: Apply kept the preview while the other Home's SVG write was blocked, then loaded and selected `file:Coast` after release. Replayed a failed source deletion: the source, current selection and cached SVG all remained intact. Both checks passed.

Two additional in-memory checks passed:

- Hold an older Dots SVG write, finish a newer Blocks preview, then release Dots. The scene, text and SVGs stayed on Blocks, `busy` was false, and the stale version's files were removed.
- Drive the real command-listener callback with a wrong token, a superseded dialog's token, the current token, and its duplicate. Only the current token called removal, exactly once, for the current dialog's named scene.

No new actionable finding in the requested changed hunks. The original findings below are retained as historical evidence, not open issues. Existing author-run render-guard and TypeScript checks were reused; no full suite was repeated.

## Original must-fix finding — resolved

1. **Apply can save without selecting the new wallpaper** (`extras/mods/asciicn-wallpaper/main.js:129-143,265-275`)
   - **What this is:** Home copies share the `converting` set, but the pending selection (`this.picking`) belongs to only the applying copy.
   - **Problem:** Another Home can receive the new `.ans` event first and start converting it. The applying Home skips the locked conversion, closes its preview, and never selects the saved drawing. Even a later refresh that finds the completed cache does not finish its pending selection.
   - **Fix:** Wait for another copy's conversion and load its result before finishing Apply. Finish the pending selection when loading an existing cache too, rather than only in the copy that performed conversion. Add the two-copy schedule below to `check.cjs`.
   - **If we skip it:** Apply appears to discard the preview and return to the previous wallpaper, despite leaving a new saved file.

   Confirmed with the existing inert test environment, without touching real files. After choosing Coast, a second Home started `refresh()` immediately after the `.ans` write. Its SVG write was held while the first Home finished Apply. Releasing that write and refreshing the first Home still produced:

   ```json
   {"saved":["/app/asciicn-wallpaper/Coast.ans"],"selected":"lighthouse","pendingSelection":"Coast","visible":["file:Coast"],"draft":null}
   ```

   The assertion that selection equals `file:Coast` failed. This is an acceptance gap in the new Apply flow; the converter-owner-only selection logic also existed at the baseline.

## Original should-fix finding — resolved

2. **A failed delete removes the current drawing's cache** (`extras/mods/asciicn-wallpaper/main.js:302-305`; test gap: `check.cjs:123-126`)
   - **What this is:** The delete command removes the cached SVGs before attempting to remove the source `.ans`.
   - **Problem:** If the source is locked against deletion, the cache removal can succeed and the source removal fail. The error path retains the current scene and selection, but their SVG files are gone. Cache-only changes do not normally trigger this mod's refresh filter (`main.js:75`).
   - **Fix:** Attempt source deletion first. Once it succeeds, update the selection and treat cache removal as cleanup; if source deletion fails, leave its cache untouched. Test a failure on the second operation, not only a failure before either operation.
   - **If we skip it:** A failed delete can leave the selected wallpaper blank until a later refresh rebuilds its cache. The source drawing remains recoverable; this is not source-file loss.

   Confirmed by injecting the shell result for successful cache deletion followed by `rm: ./Coast.ans: Operation not permitted`. The existing test environment then contained:

   ```json
   {"saved":["/app/asciicn-wallpaper/Coast.ans"],"selected":"file:Coast","sceneRetained":true,"tiles":[]}
   ```

   The assertion that failed deletion preserves the current drawing's tiles failed. The baseline could also remove cache after a source deletion error; this is a remaining safety gap in the rewritten deletion path, not a newly introduced source-loss regression.

## Reproduction method and coverage

Both counterexamples used `node` with stdin scripts. Each loaded the prefix of `extras/mods/asciicn-wallpaper/check.cjs` before its test IIFE, then ran the scenario in that same lexical environment. Production code was loaded unchanged by that harness. No test, source, real wallpaper, configuration or running session was changed.

For finding 1, the only extra scheduling was:

```js
const other = new context.Mod();
other.init({}, { ...cx, spawn() {} });
state["asciicn-wallpaper.scene"] = "lighthouse";
await mod.choose(cx);
let release, conversion;
holdWrite = new Promise(r => { release = r; });
const write = env.writeTextFile;
env.writeTextFile = async (...args) => {
  const result = await write(...args);
  if (args[0].endsWith(".ans")) {
    conversion = other.refresh(cx);
    for (let n = 0; n < 20; n++) await Promise.resolve();
  }
  return result;
};
const applying = mod.applyPreview(cx);
for (let n = 0; n < 80; n++) await Promise.resolve();
assert.ok(mod.draft?.applying);
release();
await applying;
await conversion;
await mod.refresh(cx);
assert.equal(state["asciicn-wallpaper.scene"], "file:Coast");
```

Read the related bilingual docs, style conversion and its checks, delete-confirmation caller, host API types, and sync changes. `focus.js` and `store.js` match their shared sources byte for byte. The styles preserve their expected cell geometry; no additional dimension or injection defect was confirmed. Existing passed gates supplied by the author were reused; the full check process was not repeated.

Verdict: Ship. Findings 1 and 2 are resolved by executable replay.

Not checked: real OS permission failures and live watcher scheduling; the two failures above use controlled scheduling/error injection. UI screenshot validation remains with the author as assigned. No files were deleted and no commit was made by this read-only review.
