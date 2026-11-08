#!/bin/sh
# Every check this repo has: the shared modules' copies, `herdr-app check` and `tsc` on each mod, and each mod's checks in a fake herdr.
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

# The options live here, not in each mod's jsconfig.json: that file is gpui-shell's, gitignored and written fresh by
# `herdr-app check` with defaults that fail these mods. These are the ones its notes explain, plus skipLibCheck, which a
# jsconfig.json implies.
ts="--noEmit --allowJs --checkJs --target ES2022 --module ES2022 --moduleResolution bundler --lib ES2022 --strict
  --strictNullChecks false --noImplicitAny false --useUnknownInCatchVariables false --skipLibCheck"
for d in mods/t3-*/ extras/mods/*/; do
  out=$(herdr-app check "$d" 2>&1) || { echo "FAIL herdr-app check $d"; echo "$out" | tail -20; fail=1; }
  # gpui-kit.d.ts is the API `herdr-app check` just wrote.
  out=$(bunx -p typescript tsc $ts "$d"*.js "$d"gpui-kit.d.ts types/*.d.ts 2>&1) || { echo "FAIL tsc $d"; echo "$out" | tail -20; fail=1; }
done

# A wrong icon path draws nothing and raises nothing. Paths built at runtime aren't caught here.
for p in $(grep -rhoE --include='*.js' --exclude=gpui-kit.d.ts 'mods/(t3-[a-z-]+|review|pulls-review)/[a-z0-9/-]+\.svg' shared mods extras/mods | sort -u); do
  [ -f "$p" ] || [ -f "extras/$p" ] || { echo "FAIL no such icon: $p"; fail=1; }
done

for f in $(find shared mods extras/mods -name 'check*.cjs'); do
  out=$(cd "$app" && node "$src/$f" 2>&1) || { echo "FAIL $f"; echo "$out" | tail -20; fail=1; }
done

scripts/check-update.sh || fail=1

[ "$fail" = 0 ] && echo "all checks passed"
exit "$fail"
