#!/bin/sh
# After editing this repo: copy t3-inbox, t3-actions and the Review extra to their standalone repos and the layout, its mods, the Review and theme-export extras and the extra themes to the local Herdr App.
# Real copies, not symlinks: Herdr App doesn't load a mod's own SVGs through a symlink.
set -eu
src=$(cd "$(dirname "$0")/.." && pwd)
inbox=${HERDR_T3_INBOX:-$src/../herdr-t3-inbox}
actions=${HERDR_T3_ACTIONS:-$src/../herdr-t3-actions}
review=${HERDR_PULLS_REVIEW:-$src/../herdr-pulls-review}
app=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
gen="--exclude gpui-kit.d.ts --exclude jsconfig.json"

# shared/ holds one source for what several mods use; a mod can't import outside its folder, so each gets a copy.
share() { f=$1; shift; for d; do cp "$src/shared/$f.js" "$src/$d/"; done; }
share name mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-picker
share tree mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-picker
share project mods/t3-inbox mods/t3-agents mods/t3-picker mods/t3-spaces mods/t3-new-menu
share tip mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-chrome mods/t3-spaces mods/t3-actions mods/t3-home extras/mods/pulls-review extras/mods/review
share details mods/t3-inbox mods/t3-agents mods/t3-tabs extras/mods/pulls-review
share motion mods/t3-inbox mods/t3-agents mods/t3-spaces
share focus mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-pane mods/t3-chrome mods/t3-spaces mods/t3-actions mods/t3-home
share list mods/t3-inbox mods/t3-agents mods/t3-actions mods/t3-new-menu mods/t3-picker extras/mods/pulls-review extras/mods/review
share zoom mods/t3-inbox mods/t3-agents mods/t3-tabs mods/t3-picker extras/mods/pulls-review

# mod.json stays per repo: here the layout places it ("none"), alone it docks left.
rsync -a --delete $gen --exclude mod.json "$src/mods/t3-inbox/" "$inbox/mods/t3-inbox/"
rsync -a --delete $gen "$src/mods/t3-actions/" "$actions/mods/t3-actions/"
# Their jsconfig.json (each person's own, never copied) includes these, and no mod folder ships them.
for r in "$inbox" "$actions" "$review"; do mkdir -p "$r/types"; cp "$src"/types/*.d.ts "$r/types/"; done
# One mod at a time: other t3-* folders in the app (yours, a test's) are left alone.
for d in "$src"/mods/t3-*/; do rsync -a --delete $gen "$d" "$app/mods/$(basename "$d")/"; done
# The Review extra (pulls-review and review): config.json is the person's own, so it is never shipped or deleted.
for m in pulls-review review; do
  rsync -a --delete $gen --exclude config.json "$src/extras/mods/$m/" "$review/mods/$m/"
  rsync -a --delete $gen --exclude config.json "$src/extras/mods/$m/" "$app/mods/$m/"
done
rsync -a --delete $gen "$src/extras/mods/t3-theme-export/" "$app/mods/t3-theme-export/"
# The theme picker, stack switches, your focus ring color and the Review and theme-export blocks you added live in the installed layout; keep them across syncs.
# A block's id must stay unique: a duplicate crashes Herdr App.
layout="$app/layouts/herdr-t3.json"
old=$(cat "$layout" 2>/dev/null || echo '{}')
cp "$src"/layouts/herdr-t3.* "$app/layouts/"
jq --argjson old "$old" '[$old | .. | objects | .focus? | objects | .color][0] as $c
  | ([$old | .. | objects | select((.id | strings) and .active) | {(.id): .active}] | add // {}) as $active
  | ([$old | .. | objects | select(.content?.mod? == "pulls-review")][0]) as $review
  | ([$old | .. | objects | select(.content?.mod? == "t3-theme-export")][0]) as $export
  | (if $old.theme then .theme = $old.theme else . end)
  | (.. | objects | select((.id | strings) and $active[.id])) |= (.active = $active[.id])
  | (.. | objects | .focus? | objects | .color) |= ($c // .)
  | (if $review then (.. | objects | select(.id? == "tabs-row") | .children) |= (.[0:1] + [$review] + .[1:]) else . end)
  | (if $export then (.. | objects | select(.id? == "work") | .children) |= (. + [$export]) else . end)' "$layout" > "$layout.tmp"
mv "$layout.tmp" "$layout"
cp "$src"/extras/themes/*.json "$app/themes/"
