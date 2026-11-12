# Independent four-fix review

What this change does: It makes shade tiles fit the native text-write limit and preserves ordinary Unicode, leading-dash and hidden names. It keeps a failed Apply preview available for retry and stops deleted wallpapers from returning when an old conversion finishes.

Looks good. Ship.

## Scope

- Baseline: `52c9db96b4a1a402027fbf66b640b0630afcea1f`; reviewed the uncommitted implementation.
- Read the diff statistics and name-status first. Read the five assigned files: `main.js`, `ascii-art.js`, `check.cjs`, `check-ascii-art.cjs`, and the new `check-filesystem.cjs`, all under `extras/mods/asciicn-wallpaper/`.
- Traced their connected callers, cache/storage contract, and updated behavior documentation. Assumed one local user, multiple Home copies in one app, trusted source files, and arbitrary Unix filenames. No hostile cache-directory or symlink substitution assumption.
- No actionable new defect found in this scope. No implementation edits, commits, sync, full-suite runs, or subagents.

## Evidence

Reused the parent's observed red baseline for the original filename, Apply-cache-failure, and deletion cases, and its passing current `check.cjs` and eleven filesystem cases. Reused the converter owner's red/green evidence for `TILE=40`, `VERSION=2`, the original shade input (maximum 507,355 bytes per tile), and the broader 366-glyph probe. Those are supplied results, not independently rerun gates.

Independently ran these additional targeted checks against the current production code, loaded through the existing filesystem harness. Shell commands and writes used real, owned temporary app directories; only scheduling and injected write failures were controlled.

| Targeted check | Observed result |
| --- | --- |
| Delete from Home B while Home A is paused after cache `mkdir` | Source absent, cache absent, A has no imported entry after completion. |
| Same deletion while A is paused before an SVG write | Same result. |
| Same deletion after the checksum subprocess returns, before its result reaches the converter | Same result. |
| Same deletion before `scene.json` is written | Same result. |
| External names containing newline, tab, carriage return, backslash, literal glob characters, trailing space, and a leading dash plus newline and Chinese text | All seven names survive NUL-framed enumeration exactly, import successfully, and leave no cache after source deletion and refresh. |
| Two unchanged sources with failed cache markers; retry only A | Only A's SVG is rebuilt and A is shown; B's failure marker remains untouched. |

The two inline Node probes both exited 0. All temporary directories were removed in `finally` blocks; no probe files were added to the repository.

Code inspection also confirmed that checksum commands read through stdin rather than accepting filenames as options; filenames and checksum fields have separate NUL framing; unsafe cache stems are rejected; canceled jobs stay in the shared map through cleanup; and Apply reuses only its own remembered saved name after comparing its current contents with the draft. A missing or changed saved source takes the existing no-overwrite save path instead.

Verdict: Ship.

Not checked: native GUI rendering/clicks, real watcher event timing, real disk-full/permission faults, separate app processes, or near-8-MiB resource stress. Full gates and native replay remain the parent's integration responsibility; this review makes no broader safety guarantee.
