# Herdr T3

## Shared modules

A `.js` found in several mods (`tip.js`, `focus.js`, …) has one source in `shared/`: a mod can't import outside its folder, so `scripts/sync.sh` copies it. Edit the source and its checks there, then sync. `scripts/check.sh` fails on a copy that differs.

## Icons

A mod's SVGs live in its own `icons/` and it names only those, or Herdr's shipped ones. A wrong path draws nothing and raises nothing: `scripts/check.sh` catches a literal path, and a path built at runtime has to be seen in the demo window.

## Finishing a change

1. `RECIPE.md`, `RECIPE.zh-CN.md`, both changelogs and, where they describe it, both READMEs and `docs/user/` say the new behaviour, in both languages.
2. Run `scripts/sync.sh`. It also writes outside this repo: the installed `~/.config/herdr-app` and the working trees of `herdr-t3-inbox`, `herdr-t3-actions` and `herdr-pulls-review`, which then need their own commits.
3. `scripts/check.sh` prints `all checks passed`.
4. Anything visible is seen whole in a screenshot of the demo window, at the default sidebar width. A check passing or one word showing doesn't show a layout fits.

## Docs

Two audiences, two sets:

- **Using the layout**: the READMEs, the changelogs and `docs/user/`. They say what the person sees and does, and link only to each other.
- **Working on it**: this file, `GLOSSARY.md`, `docs/adr/`, `docs/internals/` and `docs/research/`. Rules we hold ourselves to, trade-offs and implementation notes go here.

`RECIPE.md` and `RECIPE.zh-CN.md` are matching briefs for rebuilding the layout from an empty folder. Keep the official six-part structure, the visible geometry, behaviour, dependencies and observable acceptance criteria in each brief. Keep each file at most 60,000 UTF-8 bytes so Gallery can collect it. Function-level algorithms, host workarounds and maintenance notes belong in `docs/internals/`; link them where the reader needs that detail. Use `t3-tokens.md` and `storage.md` as their subjects' single source instead of repeating their tables and rules.

`docs/internals/t3-tokens.md`: read before changing a size, radius, spacing or color.

`docs/internals/storage.md`: read before keeping anything past a frame: a terminal label, a shared key, `localStorage`, a layout file write.

`docs/internals/layout-implementation.md`: read before changing render/timers, focus/hover, measurement/scrolling, Review text or wallpaper conversion.

## Agent skills

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

## Demo window

`scripts/demo/stage.sh` builds a window apart from your own Herdr: `up`, `scene <name>` (sources `scene-<name>.sh`), `do herdr-app shot x.png`, `down`. `DEMO` picks its folder under `/private/tmp`.

- `up` needs GitHub through `repos.sh`. To work offline, run it from a copy of the repo whose `repos.sh` makes a local project.
- It drives the window with `herdr-app do` and never with the mouse. Report real clicks as unverified.
