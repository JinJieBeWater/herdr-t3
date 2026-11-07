# The Review scene, sourced by `stage.sh scene review`: a real multi-file pull request on pulls.review, in a tab of its
# own, with its AI analysis (by pi, through jin.review's daemon) and agents still at work around it.
clear_stage
# One column of diff, so the cover's crop reads larger.
unified() { jq '."review.prefs".split = false' "$A/shared.json" > "$A/shared.json.new" && mv "$A/shared.json.new" "$A/shared.json"; layout review; }
reopen unified
root=$code/pulls.review branch=feat/analyze-in-daemon
git -C "$root" checkout -q "$branch"
# Its daemon on a port of its own: yours may hold the default, and the pane finds this one by ~/.pulls.review/daemon.pid.
demo sh -c "cd '$root' && jin.review -d --no-open --port 7956" >/dev/null 2>&1

fake pulls.review "Run analyses in the daemon" pi done
agent=$t
fake pulls.review "Docs for --analyze" claude working
fake herdr-t3 "Fold the tab bar's controls at 768px" codex working
fake herdling "Notarize the release build" claude blocked
focus "$agent"
sp=$(printf '%s\n' "$spaces" | sed -n 's/^pulls.review //p')

# Analyzed before it opens, so the pane starts on the analysis' first group (at most 10 minutes; a run already saved is kept).
page=/branch/$branch
port=$(jq -r .port "$H/.pulls.review/daemon.pid") session=$(jq -r .session "$H/.pulls.review/daemon.pid")
daemon() { curl -s "http://127.0.0.1:$port/api/review/$1" -H "Cookie: pulls_session=$session" -H "Origin: http://127.0.0.1:$port" -H 'Content-Type: application/json' -d "$(jq -nc --arg r "$root" --arg p "$page" '{path: $r, page: $p, force: false}')"; }
daemon analyze >/dev/null; sleep 3
for _ in $(seq 300); do daemon status | jq -e '.running | not' >/dev/null && break; sleep 2; done

demo herdr-app do tab.new "$(jq -nc --arg s "$sp" --arg r "$root" --arg p "$page" --argjson n "$(date +%s)000" '{space: $s, mod: "review", props: {root: $r, page: $p, n: $n}}')" >/dev/null
sleep 6
shoot_active "$D/review.png"
