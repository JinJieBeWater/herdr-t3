# Herdr T3

## Shared modules

A `.js` found in several mods (`tip.js`, `focus.js`, …) has one source in `mods/t3-inbox/`: a mod can't import outside its folder, so `scripts/sync.sh` copies it. Edit the source, then sync. `scripts/check.sh` fails on a copy that differs.

## Finishing a change

1. `RECIPE.md`, `RECIPE.zh-CN.md` and both changelogs say the new behaviour, in both languages.
2. Run `scripts/sync.sh`. It also writes outside this repo: the installed `~/.config/herdr-app` and the working trees of `herdr-t3-inbox`, `herdr-t3-actions` and `herdr-pulls-review`, which then need their own commits.
3. `scripts/check.sh` prints `all checks passed`.
4. Anything visible is seen whole in a screenshot of the demo window, at the default sidebar width. A check passing or one word showing doesn't show a layout fits.

## References

- `docs/layout-model.md`: read before changing what Lists, Inbox, Settle, Snooze or Home do.
- `docs/t3-tokens.md`: read before changing a size, radius, spacing or color.

## Demo window

`scripts/demo/stage.sh` builds a window apart from your own Herdr: `up`, `scene <name>` (sources `scene-<name>.sh`), `do herdr-app shot x.png`, `down`. `DEMO` picks its folder under `/private/tmp`.

- `up` needs GitHub through `repos.sh`. To work offline, run it from a copy of the repo whose `repos.sh` makes a local project.
- It drives the window with `herdr-app do` and never with the mouse. Report real clicks as unverified.
