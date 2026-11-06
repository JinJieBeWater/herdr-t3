#!/bin/sh
# Every check this repo has: the shared modules' copies, `herdr-app check` on each mod, and each mod's checks in a fake herdr.
# They run from an installed Herdr App home, where some look for the shipped icons.
set -u
src=$(cd "$(dirname "$0")/.." && pwd)
app=${HERDR_APP_HOME:-$HOME/.config/herdr-app}
cd "$src"
fail=0

# shared/ holds the one source; scripts/sync.sh makes the copies.
for s in shared/*.js; do
  for c in $(find mods extras/mods -name "$(basename "$s")"); do
    cmp -s "$s" "$c" || { echo "FAIL $c differs from $s: edit that one, then run scripts/sync.sh"; fail=1; }
  done
done

for d in mods/t3-*/ extras/mods/*/; do
  out=$(herdr-app check "$d" 2>&1) || { echo "FAIL herdr-app check $d"; echo "$out" | tail -20; fail=1; }
done

# A wrong icon path draws nothing and raises nothing. Paths built at runtime aren't caught here.
for p in $(grep -rhoE --include='*.js' --exclude=gpui-kit.d.ts 'mods/(t3-[a-z-]+|review|pulls-review)/[a-z0-9/-]+\.svg' shared mods extras/mods | sort -u); do
  [ -f "$p" ] || [ -f "extras/$p" ] || { echo "FAIL no such icon: $p"; fail=1; }
done

for f in $(find shared mods extras/mods -name 'check*.cjs'); do
  out=$(cd "$app" && node "$src/$f" 2>&1) || { echo "FAIL $f"; echo "$out" | tail -20; fail=1; }
done

[ "$fail" = 0 ] && echo "all checks passed"
exit "$fail"
