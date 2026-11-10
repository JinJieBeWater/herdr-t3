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

# Herdr closes an open dialog or popup on a key bound to tab.close or pane.close; ours are bound to t3-tabs, so each mod that
# opens as one needs its own `mod:` section, or cmd-w closes the tab behind it. `mod: MOD` is the file's own folder.
for f in $(grep -rlE --include='*.js' --exclude=gpui-kit.d.ts 'openOverlay|mod\.open' mods extras/mods); do
  own=$(basename "$(dirname "$f")")
  for m in $(grep -hoE 'openOverlay\(\{ *mod: *("[a-z0-9-]+"|MOD)|mod\.open", *\{ *name: *"[a-z0-9-]+"|"mod\.open:[a-z0-9-]+"' "$f" \
      | sed -E "s/.*MOD$/$own/; s/.*[\":]([a-z0-9-]+)\"?$/\1/" | sort -u); do
    jq -e --arg s "mod:$m" '.[$s]["cmd-w"] == "overlay.close"' keys.json >/dev/null || { echo "FAIL keys.json has no mod:$m section closing it with cmd-w ($f opens it)"; fail=1; }
  done
done

# render-guard.cjs: what Herdr refuses while a view draws (cx.notify and the rest) fails the check, as it would in the app.
for f in $(find shared mods extras/mods -name 'check*.cjs'); do
  out=$(cd "$app" && node -r "$src/scripts/render-guard.cjs" "$src/$f" 2>&1) || { echo "FAIL $f"; echo "$out" | tail -20; fail=1; }
done

scripts/check-update.sh || fail=1

[ "$fail" = 0 ] && echo "all checks passed"
exit "$fail"
