#!/bin/sh
# update.sh against a throwaway home: what the person chose stays, what's stale goes, and a bad file stops it before anything changes.
set -eu
src=$(cd "$(dirname "$0")/.." && pwd)
app=$(mktemp -d)
trap 'rm -rf "$app"' EXIT
ok() { "$@" || { echo "FAIL check-update: $*"; exit 1; }; }
is() { [ "$(jq -r "$1" "$2")" = "$3" ] || { echo "FAIL check-update: $1 in $2 isn't $3"; exit 1; }; }

mkdir -p "$app/mods/t3-tabs" "$app/mods/mine" "$app/mods/pulls-review" "$app/layouts" "$app/themes"
touch "$app/mods/t3-tabs/stale.js" "$app/mods/t3-tabs/check-old.cjs" "$app/mods/t3-tabs/jsconfig.json" "$app/mods/mine/main.js" "$app/themes/t3-code-dark.json"
echo '{"open":"herdr"}' > "$app/mods/pulls-review/config.json"
echo '{"global":{"a":"b"},"layout:herdr-t3":{"cmd-p":"old","cmd-x":"mine"}}' > "$app/keys.json"
review='{"id":"my-review","type":"block","content":{"mod":"pulls-review"}}'
jq --argjson review "$review" '.theme = "win98" | (.. | objects | .focus? | objects | .color) = "accent"
  | (.. | objects | select(.id? == "tabs-row") | .children) |= (. + [$review])' "$src/layouts/herdr-t3.json" > "$app/layouts/herdr-t3.json"

# Stops first: the mods stay as they were.
# A mod the layout names that's neither here nor in the app: Herdr would start on its own layout instead.
if HERDR_APP_HOME="$app" "$src/scripts/update.sh" 2>/dev/null; then echo "FAIL check-update: a missing mod didn't stop it"; exit 1; fi
ok test ! -e "$app/mods/t3-home"
mkdir "$app/mods/workspace-status"

cp "$app/keys.json" "$app/keys.good"
echo '{' > "$app/keys.json"
if HERDR_APP_HOME="$app" "$src/scripts/update.sh" 2>/dev/null; then echo "FAIL check-update: broken keys.json didn't stop it"; exit 1; fi
ok test -f "$app/mods/t3-tabs/stale.js"
ok test ! -e "$app/mods/t3-home"
mv "$app/keys.good" "$app/keys.json"

out=$(HERDR_APP_HOME="$app" "$src/scripts/update.sh")
ok test ! -e "$app/mods/t3-tabs/stale.js"
ok test -f "$app/mods/t3-home/main.js"
# The checks stay in the repo, and an older update's copies go; gpui-shell's jsconfig.json stays.
ok test -z "$(find "$app/mods" -name 'check*.cjs')"
ok test -f "$app/mods/t3-tabs/jsconfig.json"
ok test -f "$app/mods/mine/main.js"
ok test -f "$app/mods/review/main.js"
ok test ! -e "$app/mods/t3-theme-export"
ok test ! -e "$app/themes/catppuccin-latte.json"
ok cmp -s "$src/extras/themes/t3-code-dark.json" "$app/themes/t3-code-dark.json"
is .open "$app/mods/pulls-review/config.json" herdr
is .theme "$app/layouts/herdr-t3.json" win98
is '[.. | objects | .focus? | objects | .color][0]' "$app/layouts/herdr-t3.json" accent
is '[.. | objects | select(.id? == "my-review")] | length' "$app/layouts/herdr-t3.json" 1
# Right before the bar's end, drawing the panel's toggle with its counts: one control.
is '[.. | objects | select(.id? == "tabs-row") | .children[].id] | join(",")' "$app/layouts/herdr-t3.json" tabs,actions,my-review,tabs-end
is '[.. | objects | select(.id? == "my-review") | .content.props.toggle][0]' "$app/layouts/herdr-t3.json" true
is .global.a "$app/keys.json" b
is '.["layout:herdr-t3"]["cmd-p"]' "$app/keys.json" mod.open:t3-picker
is '.["layout:herdr-t3"]["cmd-x"]' "$app/keys.json" mine
is '.["mod:t3-picker"]["cmd-w"]' "$app/keys.json" overlay.close
case "$out" in *"replaced: cmd-p = old"*) ;; *) echo "FAIL check-update: no word of the replaced key"; exit 1 ;; esac
case "$out" in *"kept, not in the repo: cmd-x = mine"*) ;; *) echo "FAIL check-update: no word of the kept key"; exit 1 ;; esac

# The Review extra's review is the space panel's page, after Files; no id twice.
pages='[.. | objects | select(.id? == "panel-body") | .children[].id] | join(",")'
unique='[.. | objects | .id? | strings] | length == (unique | length)'
is "$pages" "$app/layouts/herdr-t3.json" files,review
is "$unique" "$app/layouts/herdr-t3.json" true

# Again changes nothing: neither Review block is doubled.
HERDR_APP_HOME="$app" "$src/scripts/update.sh" >/dev/null
is '[.. | objects | select(.id? == "my-review")] | length' "$app/layouts/herdr-t3.json" 1
is "$pages" "$app/layouts/herdr-t3.json" files,review

# A Review bar named `review`, as the extra's README once had it, gives that id to the panel's page: it's renamed, its own sizing with it.
jq '(.. | objects | select(.id? == "my-review")) |= (.id = "review" | .content.props.block = "review")' "$app/layouts/herdr-t3.json" > "$app/l" && mv "$app/l" "$app/layouts/herdr-t3.json"
HERDR_APP_HOME="$app" "$src/scripts/update.sh" >/dev/null
is '[.. | objects | select(.content?.mod? == "pulls-review") | .id + " " + .content.props.block] | join(",")' "$app/layouts/herdr-t3.json" "review-bar review-bar"
is "$unique" "$app/layouts/herdr-t3.json" true
is "$pages" "$app/layouts/herdr-t3.json" files,review

# Without the extra, the panel has Files alone: a block naming a mod that isn't there shows an error.
rm -rf "$app/mods/pulls-review" "$app/mods/review"
HERDR_APP_HOME="$app" "$src/scripts/update.sh" >/dev/null
is "$pages" "$app/layouts/herdr-t3.json" files
