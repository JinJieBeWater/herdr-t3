# Four-fix acceptance

Verified on 2026-11-12 against the repair baseline `52c9db96`.

## Regression and review

The original filesystem replay failed before implementation for Unicode, leading-dash and hidden names, losing the draft after a final-cache failure, and publishing a deleted wallpaper from a late conversion. The repaired production code passes all eleven filesystem cases. The harness now lives in `extras/mods/asciicn-wallpaper/check-filesystem.cjs`, so `scripts/check.sh` runs it; the original report command remains a wrapper, including `--revision` support.

The checks also cover exact filename preservation and duplicate allocation, embedded newlines and shell punctuation, safe rejection of the three reserved stems without source deletion, hidden-cache cleanup, retry without duplicate saves, preservation of an externally replaced source, and refreshing a source changed during conversion. Existing lifecycle checks still cover large UTF-8 saves, save conflicts, stale style previews, another Home owning the conversion, and confirmed/failed deletion.

Converter checks failed on the old tile size, then passed with size 40 and version 2. The original 20,202-byte `▓160×42` input now produces four tiles, with a maximum of 507,355 bytes instead of 1,060,714 bytes. The [converter report](input-review.md) records its broader probe. The [independent review](fix-review.md) tested four deletion schedules, seven further filename forms and retry isolation, and returned **Ship**.

The parent inspected the complete gate output: `scripts/check.sh` exited 0 and printed `all checks passed`. It includes native mod loading, TypeScript, shared-copy checks and the behavioral checks. `scripts/sync.sh` updated the installed mod; the three standalone repositories had no changes to commit.

## Native replay

Used the existing `word-acceptance` macOS VM with VNC and viewer disabled, no shared folders or clipboard bridge, and a separate app home, HOME and core. The host desktop received no GUI input. A fresh Driver screenshot established the guest desktop before starting Herdr.

A temporary adapter in the demo copy invoked the actual production `refresh`, `startPreview`, `previewStyle("dots")` and `applyPreview` methods. All successful file writes used Herdr's native API. For the failure case only, the adapter threw an ENOSPC error at the final-cache SVG write; it did not simulate a full disk or change the production converter. The adapter and generated fixtures are not shipped.

Observed results:

| Scenario | Result |
| --- | --- |
| Native NUL-framed metadata | `file:-option`, `file:.hidden`, `file:Shade` and `file:图片` all loaded; `file:图片` selected. |
| Original dense shade import | Four native SVG files; largest 507,355 bytes; scene ready. |
| Dots preview | Draft visible across Home; no new saved wallpaper yet. |
| Injected final-cache failure | Draft retained, `applying:false`, `savedName:"缓存重试"`; prior selection remained `file:图片`. |
| Retry after removing the fault | Draft cleared, `file:缓存重试` loaded and selected, exactly one `缓存重试.ans`, `.preview` empty. |
| App status | Zoom 1; layout `herdr-t3`; `errors:[]`. |

The whole 1280×699 window was inspected with the default 256px sidebar. The preview's three styles, name, Apply and Cancel fit. Local screenshots are [names](wallpaper-four-fixes-names.png), [preview](wallpaper-four-fixes-preview.png), [failure](wallpaper-four-fixes-failed.png) and [retry](wallpaper-four-fixes-retry.png); repository policy excludes them from Git. Failure notifications cover part of the card in the failure capture; the unobstructed preview capture shows its complete layout.

This round used commands to call the production methods. It did not repeat real pointer or file-picker acceptance. Cross-Home deletion schedules used the real-filesystem harness with controlled scheduling, rather than native watcher timing. Linux/Windows GUI, a physically full disk, separate app processes and near-8-MiB stress were not tested.

## Cleanup

The demo app, its isolated core, adapter, generated inputs, cache and guest captures were removed after evidence recovery. The Driver replay session ended, macOS shut down through its native confirmation, and Lume reported `stopped`. No user image or existing wallpaper was deleted. The filesystem harness was moved into the regular checks, retaining the original audit command as a wrapper; no project file was removed from the final tree.
