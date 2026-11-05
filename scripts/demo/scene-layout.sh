# The layout scene, sourced by `stage.sh scene layout`: the whole window, for herdr-t3's cover. Five of the author's
# open-source repos as spaces, fourteen agents working out of sight, the cards that need the person, three settled, and
# in view one tab: a real pi on a pull request, and beside it the review pane with its AI analysis.
clear_stage
# The Settled shelf open, so its rows show, and the Review bar in the layout.
open_shelf() { for f in "$A"/data/t3-inbox/store-*.json; do jq '{open: "true"}' "$f" > "$f.new" && mv "$f.new" "$f"; done; layout review; }
reopen open_shelf
# As the other scenes may have left them.
git -C "$code/herdr-t3" reset -q --hard; git -C "$code/herdr-t3-inbox" checkout -q main
demo herdr-app do demo-stage.actions-last:test >/dev/null
root=$code/pulls.review branch=feat/analyze-in-daemon page=/branch/feat/analyze-in-daemon
git -C "$root" checkout -q "$branch"
# Its daemon on a port of its own: yours may hold the default, and the pane finds this one by ~/.pulls.review/daemon.pid.
demo sh -c "cd '$root' && jin.review -d --no-open --port 7956" >/dev/null 2>&1

open_tab pulls.review "Review the daemon analysis PR" pi "This branch is a pull request against origin/multi-repo. From \`git log --stat origin/multi-repo..HEAD\` only, say in a few short lines what it changes and which files a reviewer should read first. Print only that. Don't edit anything."
pi=$t
fake herdr-t3 "Fold the tab bar's controls at 768px" claude working
fake herdr-t3 "Tests for the close dialog" codex working
fake herdr-t3 "Release notes" pi working
fake herdr-t3-inbox "Walk the shelves with cmd-]" pi working
fake herdr-t3-inbox "Settle from a tab's menu" codex working
fake herdr-t3-inbox "Undo notice for Unpin" claude working
fake herdling "Menu bar badge for blocked agents" codex working
fake herdling "Notarize the release build" claude working
fake herdling "Launch at login" pi working
fake pulls.review "Multi-repo branch picker" claude working
fake pulls.review "Cache diff stats per commit" codex working
fake pi-stuff "Permission policy for skills" claude working
fake pi-stuff "Bump to pi 1.4" pi working
fake pi-stuff "Footer width in narrow terminals" codex working
fake herdling "Release notes for 0.4" claude done; settle "$t" 130
fake pulls.review "Fix the empty diff view" codex done; settle "$t" 25
fake pi-stuff "Trim the skill catalog" pi done; settle "$t" 4
fake herdr-t3-inbox "Review #12: the Working pill past a day" claude done
# Its "needs you" toast is gone by the time pi is done.
fake pi-stuff "Reproduce the Linux install bug" codex blocked

# Analyzed before the pane opens, so it starts on the analysis' first group (at most 10 minutes; a saved run is kept).
port=$(jq -r .port "$H/.pulls.review/daemon.pid") session=$(jq -r .session "$H/.pulls.review/daemon.pid")
daemon() { curl -s "http://127.0.0.1:$port/api/review/$1" -H "Cookie: pulls_session=$session" -H "Origin: http://127.0.0.1:$port" -H 'Content-Type: application/json' -d "$(jq -nc --arg r "$root" --arg p "$page" '{path: $r, page: $p, force: false}')"; }
daemon analyze >/dev/null; sleep 3
for _ in $(seq 300); do daemon status | jq -e '.running | not' >/dev/null && break; sleep 2; done

first_turn "$pi"; focus "$pi"
demo herdr-app do pane.split "$(jq -nc --arg r "$root" --arg p "$page" --argjson n "$(date +%s)000" '{direction: "right", mod: "review", props: {root: $r, page: $p, n: $n}}')" >/dev/null
sleep 3; focus "$pi"; sleep 5
shoot_active "$D/layout.png"
