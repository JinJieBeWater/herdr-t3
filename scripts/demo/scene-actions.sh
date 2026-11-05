# The Actions scene, sourced by `stage.sh scene actions`: two real pi runs in herdr-t3 leave session logs, then the
# Retro action reads them in a tab of its own, with the action's menu open over the bar.
clear_stage
# The layout without the Review bar another scene adds.
reopen layout
# Only these runs in /retro's reach, and the clone as published.
rm -rf "$H/.pi/agent/sessions"
git -C "$code/herdr-t3" reset -q --hard; git -C "$code/herdr-t3" clean -qfd

open_tab herdr-t3 "Run the mods' checks" pi "Run every mods/*/check.cjs with node and tell me which fail and why, in a few lines. Don't edit anything."
first=$t
open_tab herdr-t3 "Tabs at 26px" pi "Make the tab bar's tabs 26px tall instead of 24px. Find where that's set, change it, run that mod's check, and tell me what changed in a few lines. Don't commit."
first_turn "$first"; first_turn "$t"

# What `▾ → Retro` does (t3-actions' runAction): it has no command of its own.
demo herdr-app do demo-stage.actions-last:retro >/dev/null
focus "$t"
r=$(demo herdr-app do terminal.open "$(jq -c --arg f "$code/herdr-t3" '."t3-actions".list[] | select(.id == "retro") | {argv: ["sh", "-c", .command], name, place, folder: $f}' "$A/shared.json")")
first_turn "$(echo "$r" | jq -r .terminal)"; sleep 5

demo herdr-app do demo-stage.actions-menu:1620 >/dev/null; sleep 1
demo herdr-app shot "$D/actions.png"
