# Detailed Dots wallpaper save regression

On 2026-11-12, a user reported that a Dots preview worked but Apply showed `herdr.writeTextFile: Text file exceeds 1 MiB`. The original 3840 × 2160 PNG was replayed with the production decoder and converters. Its 682 × 384 sample grid produced:

| Style | UTF-8 `.ans` bytes |
|---|---:|
| Braille | 435,373 |
| Blocks | 417,941 |
| Dots | 1,146,951 |

The native writer accepts at most 1,048,576 bytes per call. The previous acceptance picture did not reach this limit; the fake writer also lacked the host's limit. Both gaps were addressed.

## Original-scene replay

The original PNG was copied into the existing isolated `word-acceptance` VM. A temporary demo adapter invoked the actual `startPreview`, `previewStyle("dots")` and `applyPreview` methods through a mod command. The adapter recorded the existing failure handler; it did not replace native file I/O or change the drawing. The app home and core were separate from the user's.

The baseline `c50949fb` returned:

```json
{"error":"`herdr.writeTextFile`: Text file exceeds 1 MiB","bytes":1146951,"draft":true,"selected":null,"imported":[]}
```

The fixed implementation returned:

```json
{"error":null,"bytes":1146951,"draft":false,"selected":"file:138149243_p0","imported":["file:138149243_p0"]}
```

The final folder contained exactly one 1,146,951-byte `.ans`, with no draft or save staging left behind. Its complete contents matched the unchanged production converter's output byte for byte. The source PNG matched the transferred input, SHA-256 `b3785c53ca587c5b0bed953e87b5c003e326573015be28eea0f270c3e4cd5489`. Herdr reported no errors, and the full saved wallpaper was inspected at the default sidebar width.

Local screenshots: [before](large-save-before.png), [after](large-save-after.png). As required by the repository's policy, these screenshots are not committed. This replay exercised the original Apply methods through commands; it did not repeat file-picker or pointer testing.

## Fix and regression checks

Both image Apply and Studio import use `saveFile`. It writes bounded Unicode chunks into its own temporary folder, concatenates them in order, then uses POSIX `link` to publish the complete `.ans` only if its destination is absent. It preserves the generated data and the existing file protection. Source images, converters and sample dimensions are unchanged.

The lifecycle fake writer now enforces the actual 1 MiB boundary. Its new test failed on the baseline, then passed with a larger drawing containing multibyte and supplementary Unicode characters. It also checks large Studio imports, cleanup and draft retention on a failed chunk write, competing destination writes, and the existing two-Home conversion schedule. Focused native loading, TypeScript and converter/lifecycle checks passed. The save path was reviewed for chunk ordering, UTF-8 preservation, shell quoting, partial-file visibility and existing destination handling.

Linux/Windows GUI behavior was not repeated. The direct original-scene proof was on macOS with the real native write limit.

Final `scripts/check.sh` printed `all checks passed`. The fixed production file was synchronized to the local installation and compared byte for byte with the source. The temporary replay adapter, image copies, demo app home and isolated core were removed; macOS shut down normally and Lume confirmed the VM was stopped. No user images or existing wallpaper files were deleted.
