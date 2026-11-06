#!/bin/sh
# Every check this repo has: the shared modules' copies, `herdr-app check` on each mod, and each mod's checks in a fake herdr.
# They run from an installed Herdr App home, where some look for the shipped icons.
set -u
src=$(cd "$(dirname "$0")/.." && pwd)
app=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
cd "$src"
fail=0

# t3-inbox holds the one source; scripts/sync.sh makes the copies.
for m in name tree project tip details motion focus list zoom; do
  for c in $(find mods extras/mods -name "$m.js"); do
    cmp -s "mods/t3-inbox/$m.js" "$c" || { echo "FAIL $c differs from mods/t3-inbox/$m.js: edit that one, then run scripts/sync.sh"; fail=1; }
  done
done

for d in mods/t3-*/ extras/mods/*/; do
  out=$(herdr-app check "$d" 2>&1) || { echo "FAIL herdr-app check $d"; echo "$out" | tail -20; fail=1; }
done

for f in $(find mods extras/mods -name 'check*.cjs'); do
  out=$(cd "$app" && node "$src/$f" 2>&1) || { echo "FAIL $f"; echo "$out" | tail -20; fail=1; }
done

[ "$fail" = 0 ] && echo "all checks passed"
exit "$fail"
