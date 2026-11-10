#!/bin/sh
# After editing this repo: copy t3-inbox, t3-actions and the Review extra to their standalone repos, then update the local Herdr App (update.sh).
# Real copies, not symlinks: Herdr App doesn't load a mod's own SVGs through a symlink.
set -eu
src=$(cd "$(dirname "$0")/.." && pwd)
inbox=${HERDR_T3_INBOX:-$src/../herdr-t3-inbox}
actions=${HERDR_T3_ACTIONS:-$src/../herdr-t3-actions}
review=${HERDR_PULLS_REVIEW:-$src/../herdr-pulls-review}
gen="--exclude gpui-kit.d.ts --exclude jsconfig.json"

# shared/ holds one source for what several mods use; a mod can't import outside its folder, so each gets a copy.
share() { f=$1; shift; for d; do cp "$src/shared/$f.js" "$src/$d/"; done; }
share name mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-picker
share program mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-picker
share tree mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-picker
share project mods/t3-inbox mods/t3-agents mods/t3-pane mods/t3-picker mods/t3-spaces mods/t3-new-menu mods/t3-tabs mods/t3-menu
share tip mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-chrome mods/t3-spaces mods/t3-actions mods/t3-home mods/t3-new-menu extras/mods/pulls-review extras/mods/review
share details mods/t3-inbox mods/t3-agents mods/t3-pane mods/t3-tabs extras/mods/pulls-review
share motion mods/t3-inbox mods/t3-agents mods/t3-spaces
share focus mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-chrome mods/t3-spaces mods/t3-actions mods/t3-home mods/t3-new-menu mods/t3-picker extras/mods/pulls-review
share list mods/t3-chrome mods/t3-inbox mods/t3-agents mods/t3-pane mods/t3-actions mods/t3-menu mods/t3-new-menu mods/t3-picker extras/mods/pulls-review extras/mods/review
share zoom mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-picker extras/mods/pulls-review
share sidebar mods/t3-chrome mods/t3-home mods/t3-tabs mods/t3-spaces mods/t3-agents mods/t3-inbox mods/t3-pane
share layout-settings mods/t3-chrome mods/t3-tabs mods/t3-inbox
share snooze-presets mods/t3-inbox mods/t3-menu

# mod.json stays per repo: here the layout places it ("none"), alone it docks left.
rsync -a --delete $gen --exclude mod.json "$src/mods/t3-inbox/" "$inbox/mods/t3-inbox/"
rsync -a --delete $gen "$src/mods/t3-actions/" "$actions/mods/t3-actions/"
# Their jsconfig.json (each person's own, never copied) includes these, and no mod folder ships them.
for r in "$inbox" "$actions" "$review"; do mkdir -p "$r/types"; cp "$src"/types/*.d.ts "$r/types/"; done
# The Review extra (pulls-review and review): config.json is the person's own, so it is never shipped or deleted.
for m in pulls-review review; do rsync -a --delete $gen --exclude config.json "$src/extras/mods/$m/" "$review/mods/$m/"; done
"$src/scripts/update.sh"
