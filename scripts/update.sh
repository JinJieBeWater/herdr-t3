#!/bin/sh
# Puts this checkout into a Herdr App home: the layout, its mods and keys, and the extras already installed there.
# Real copies, not symlinks: Herdr App doesn't load a mod's own SVGs through a symlink.
set -eu
src=$(cd "$(dirname "$0")/.." && pwd)
app=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
# The checks run from the repo: they aren't sent, and -s lets --delete take an older update's copies.
gen="--exclude gpui-kit.d.ts --exclude jsconfig.json --filter=-s_check*.cjs"
layout="$app/layouts/herdr-t3.json"
keys="$app/keys.json"

# Everything that can stop this goes first, so a stop leaves the install as it was.
for tool in jq rsync; do command -v "$tool" >/dev/null || { echo "update needs $tool" >&2; exit 1; }; done
[ -d "$app" ] || { echo "no Herdr App home at $app" >&2; exit 1; }
for f in "$layout" "$keys"; do
  [ ! -e "$f" ] || jq empty "$f" || { echo "not valid JSON, nothing changed: $f" >&2; exit 1; }
done

mkdir -p "$app/mods" "$app/layouts"
# One mod at a time: other t3-* folders in the app (yours, a test's) are left alone.
for d in "$src"/mods/t3-*/; do rsync -a --delete $gen "$d" "$app/mods/$(basename "$d")/"; done
# The Review extra (pulls-review and review): config.json is the person's own, so it is never shipped or deleted.
if [ -d "$app/mods/pulls-review" ]; then
  for m in pulls-review review; do rsync -a --delete $gen --exclude config.json "$src/extras/mods/$m/" "$app/mods/$m/"; done
fi
[ ! -d "$app/mods/t3-theme-export" ] || rsync -a --delete $gen "$src/extras/mods/t3-theme-export/" "$app/mods/t3-theme-export/"
for t in "$src"/extras/themes/*.json; do [ ! -f "$app/themes/$(basename "$t")" ] || cp "$t" "$app/themes/"; done

# The theme picker, stack switches, your focus ring color and the Review and theme-export blocks you added live in the installed layout; keep them across updates.
# A block's id must stay unique: a duplicate crashes Herdr App.
old=$(cat "$layout" 2>/dev/null || echo '{}')
jq --argjson old "$old" '[$old | .. | objects | .focus? | objects | .color][0] as $c
  | ([$old | .. | objects | select((.id | strings) and .active) | {(.id): .active}] | add // {}) as $active
  | ([$old | .. | objects | select(.content?.mod? == "pulls-review")][0]) as $review
  | ([$old | .. | objects | select(.content?.mod? == "t3-theme-export")][0]) as $export
  | (if $old.theme then .theme = $old.theme else . end)
  | (.. | objects | select((.id | strings) and $active[.id])) |= (.active = $active[.id])
  | (.. | objects | .focus? | objects | .color) |= ($c // .)
  | (if $review then (.. | objects | select(.id? == "tabs-row") | .children) |= (.[0:1] + [$review] + .[1:]) else . end)
  | (if $export then (.. | objects | select(.id? == "work") | .children) |= (. + [$export]) else . end)' "$src/layouts/herdr-t3.json" > "$layout.tmp"
mv "$layout.tmp" "$layout"
cp "$src/layouts/herdr-t3.svg" "$app/layouts/"

# The repo's keys win, section by section (the layout's, and its popups' `mod:` ones), since an old command in one would report
# as unknown; say which were replaced so a remap can go back. Keys of your own stay.
[ -f "$keys" ] || echo '{}' > "$keys"
jq -r --slurpfile new "$src/keys.json" '. as $old | $new[0] | to_entries[] | .key as $s | .value as $n | ($old[$s] // {}) | to_entries[]
  | .key as $k | .value as $v
  | if $n | has($k) | not then "kept, not in the repo: \($k) = \($v) in \($s)"
    elif $n[$k] != $v then "replaced: \($k) = \($v), now \($n[$k]) in \($s)"
    else empty end' "$keys"
jq --slurpfile new "$src/keys.json" 'reduce ($new[0] | to_entries[]) as $e (.; .[$e.key] = ((.[$e.key] // {}) + $e.value))' "$keys" > "$keys.tmp"
mv "$keys.tmp" "$keys"
