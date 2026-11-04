#!/bin/sh
# After editing this repo: copy t3-inbox to the standalone herdr-t3-focus repo and the layout and its theme to the local Herdr App.
# Real copies, not symlinks: Herdr App doesn't load a mod's own SVGs through a symlink.
set -eu
src=$(cd "$(dirname "$0")/.." && pwd)
focus=${HERDR_T3_FOCUS:-$src/../herdr-t3-focus}
app=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
gen="--exclude gpui-kit.d.ts --exclude jsconfig.json"

# t3-inbox/name.js and tree.js are the one naming and status rules; a mod can't import outside its folder, so each gets a copy.
for m in t3-agents t3-tabs t3-pane; do cp "$src/mods/t3-inbox/name.js" "$src/mods/t3-inbox/tree.js" "$src/mods/$m/"; done

# mod.json stays per repo: here the layout places it ("none"), alone it docks left.
rsync -a --delete $gen --exclude mod.json "$src/mods/t3-inbox/" "$focus/mods/t3-inbox/"
# One mod at a time: other t3-* folders in the app (yours, a test's) are left alone.
for d in "$src"/mods/t3-*/; do rsync -a --delete $gen "$d" "$app/mods/$(basename "$d")/"; done
# The theme picker, stack switches, your focus ring color and a Review block you added (pulls.review) live in the installed layout; keep them across syncs.
layout="$app/layouts/herdr-t3.json"
old=$(cat "$layout" 2>/dev/null || echo '{}')
cp "$src"/layouts/herdr-t3.* "$app/layouts/"
jq --argjson old "$old" '[$old | .. | objects | .focus? | objects | .color][0] as $c
  | ([$old | .. | objects | select((.id | strings) and .active) | {(.id): .active}] | add // {}) as $active
  | ([$old | .. | objects | select(.content?.mod? == "pulls-review")][0]) as $review
  | (if $old.theme then .theme = $old.theme else . end)
  | (.. | objects | select((.id | strings) and $active[.id])) |= (.active = $active[.id])
  | (.. | objects | .focus? | objects | .color) |= ($c // .)
  | (if $review then (.. | objects | select(.id? == "tabs-row") | .children) |= (.[0:1] + [$review] + .[1:]) else . end)' "$layout" > "$layout.tmp"
mv "$layout.tmp" "$layout"
cp "$src/extras/themes/herdr-t3.json" "$app/themes/"
