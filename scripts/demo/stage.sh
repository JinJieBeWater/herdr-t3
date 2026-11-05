#!/bin/sh
# A made-up scene for the preview pictures, apart from your own Herdr: its own core, app home, HOME and projects.
#   stage.sh up      build it in $DEMO (default /private/tmp/herdr-t3-demo) and open its window
#   stage.sh app     open its window again, if it closed
#   stage.sh scene <layout|inbox|actions|review>   play that picture's scene and shoot it to $D/<name>.png
#   stage.sh do …    run anything inside it: `stage.sh do herdr-app shot x.png`
#   stage.sh key     copy your OpenCode Go key in (only that entry of ~/.pi/agent/auth.json); down deletes it
#   stage.sh down    close it and delete $DEMO
# Pi runs on OpenCode Go (deepseek-v4.1-flash). Nothing of yours goes in but the OpenCode Go key, which you copy in yourself.
set -eu
src=$(cd "$(dirname "$0")/../.." && pwd)
D=${DEMO:-/private/tmp/herdr-t3-demo} H=$D/home A=$D/app
case $D in /private/tmp/*) ;; *) echo "DEMO must be under /private/tmp (it is deleted by down, and pi shortens paths only under its realpath)" >&2; exit 1;; esac

# Only the demo's variables: an agent's shell exports its own core, app and pi dirs, which would leak in.
demo() {
  env -i HOME="$H" USER=demo LOGNAME=demo SHELL=/bin/zsh TERM=xterm-256color LANG=en_US.UTF-8 \
    PATH="$H/.local/bin:$PATH" HC_SESSION=herdr-t3-demo \
    XDG_CONFIG_HOME="$D/xdg/config" XDG_STATE_HOME="$D/xdg/state" XDG_DATA_HOME="$D/xdg/data" XDG_RUNTIME_DIR="$D/xdg/run" XDG_CACHE_HOME="$D/xdg/cache" \
    HERDR_APP_HOME="$A" HERDR_TELEMETRY=0 DO_NOT_TRACK=1 PI_SKIP_VERSION_CHECK=1 "$@"
}
mine() { [ "$(demo hc server status --json | jq -r .core.id)" != "$(hc server status --json | jq -r .core.id)" ]; }

up() {
  [ -e "$D" ] && { echo "$D exists: stage.sh down first" >&2; exit 1; }
  mkdir -p "$H/.local/bin" "$H/.bun/bin" "$H/.pi/agent" "$H/.pulls.review" "$A/mods" "$A/layouts" "$A/themes" "$D/bin" \
    "$D/xdg/config" "$D/xdg/state" "$D/xdg/data" "$D/xdg/run" "$D/xdg/cache"
  printf '[user]\n\tname = Avery Chen\n\temail = avery@example.com\n[init]\n\tdefaultBranch = main\n' > "$H/.gitconfig"

  # Pi itself, with a config of its own: one provider, no extensions, no packages.
  pi=$(realpath "$HOME/.bun/bin/pi" 2>/dev/null || realpath "$(command -v pi)")
  ln -s "$pi" "$H/.bun/bin/pi"; ln -s "$pi" "$H/.local/bin/pi"
  ln -s "$(realpath "$(command -v jin.review)")" "$H/.local/bin/jin.review"
  # OpenCode Go's DeepSeek V4.1 Flash, straight to opencode.ai. Its key is the one thing you add yourself (see `up`'s last line).
  # Copies, for /retro: a skill it reads shows on screen by its path.
  mkdir -p "$H/.agents/skills"; cp -RL "$HOME/.agents/skills/retro" "$HOME/.agents/skills/writing-for-agents" "$H/.agents/skills/"
  jq -n --arg s "$H/.agents/skills" '{defaultProvider: "opencode-go", defaultModel: "deepseek-v4.1-flash", defaultThinkingLevel: "high", hideThinkingBlock: true,
    skills: [$s + "/retro", $s + "/writing-for-agents"]}' > "$H/.pi/agent/settings.json"
  # jin.review's daemon, in English, analyzing with that pi.
  echo '{ "locale": "en", "llm": { "provider": "local-agent", "agent": "pi", "agentModel": "" } }' > "$H/.pulls.review/shared-settings.json"
  for a in claude codex pi; do ln -s "$src/scripts/demo/fake-agent" "$D/bin/$a"; done

  demo sh "$src/scripts/demo/repos.sh" "$H" >/dev/null
  install_app
  demo hc server status --json >/dev/null
  mine || { echo "the demo core is your own: stopping" >&2; exit 1; }
  app
  demo herdr-app do layout.switch '{"name":"herdr-t3"}' >/dev/null
  echo "up: $D"
  grep -q opencode-go "$H/.pi/agent/auth.json" 2>/dev/null || echo "now copy your OpenCode Go key in: sh $0 key"
}

# Its window, on the Mac's built-in screen (window.json's bounds are that screen's points), with no What's new.
# A session of its own, so it outlives the shell that started it.
app() {
  [ -f "$D/app.pid" ] && kill -0 "$(cat "$D/app.pid")" 2>/dev/null && { echo "the demo window is open" >&2; return; }
  v=$(defaults read /Applications/Herdr.app/Contents/Info CFBundleShortVersionString)
  jq -n --arg v "$v" '{last_run: $v, presented: [$v]}' > "$A/update-notes.json"
  set -- $(swift - <<'SWIFT'
import AppKit
for s in NSScreen.screens {
  let id = s.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as! CGDirectDisplayID
  if CGDisplayIsBuiltin(id) != 0 { print(CFUUIDCreateString(nil, CGDisplayCreateUUIDFromDisplayID(id).takeRetainedValue())!, Int(s.frame.minX), Int(s.frame.minY)) }
}
SWIFT
)
  [ $# = 3 ] || { echo "no built-in screen found" >&2; exit 1; }
  jq -n --arg d "$1" '{state: "windowed", display: ($d | ascii_downcase), bounds: [15, 50, 1680, 1042]}' > "$A/window.json"
  W=/Applications/OmniWM.app/Contents/MacOS/omniwmctl
  back=$(pgrep -qx OmniWM && "$W" query focused-window --format json | jq -r '.result.payload.window.id // empty' || true)
  ( cd "$H"; demo python3 -I -c 'import os, sys; os.setsid(); os.execv(sys.argv[1], sys.argv[1:])' /Applications/Herdr.app/Contents/MacOS/Herdr > "$D/app.log" 2>&1 < /dev/null & )
  for _ in 1 2 3 4 5 6 7 8 9 10; do demo herdr-app status >/dev/null 2>&1 && break; sleep 1; done
  # Its own window only: other Herdr windows (yours, another demo's) have another home.
  for p in $(pgrep -f 'MacOS/Herdr$'); do ps eww -o command= -p "$p" | grep -q "HERDR_APP_HOME=$A " && echo "$p" > "$D/app.pid"; done
  # OmniWM, if you run it, tiles a new window into the workspace in front of you: send it to the built-in screen's,
  # full width (OmniWM sizes only the focused window, so focus goes there for that and comes back).
  pgrep -qx OmniWM || return 0
  for _ in 1 2 3 4 5; do
    win=$("$W" query windows --app Herdr --format json | jq -r --argjson p "$(cat "$D/app.pid")" '.result.payload.windows[] | select(.pid == $p) | .id')
    [ -n "$win" ] && break; sleep 1
  done
  ws=$("$W" query displays --format json | jq -r --argjson x "$2" --argjson y "$3" '.result.payload.displays[] | select(.frame.x == $x and .frame.y == $y) | .activeWorkspace.rawName')
  # The full-width command toggles, and the frame OmniWM reports starts as the window's own: read it once tiled.
  "$W" window move-to-workspace "$win" "$ws" >/dev/null; sleep 3
  w=$("$W" query windows --window "$win" --format json | jq '.result.payload.windows[0].frame.width')
  [ "$w" -ge 1600 ] || { "$W" window focus "$win" >/dev/null; sleep 0.5; "$W" command toggle-container-full-primary-span >/dev/null; sleep 1; }
  [ -z "$back" ] || "$W" window focus "$back" >/dev/null
}

# The layout, plus the stagehand in a 0px block; `layout review` adds the Review bar, as its README says.
layout() {
  jq --arg r "${1-}" '(.. | objects | select(.id? == "work-bottom-inset") | .children) += [{ "id": "stage", "type": "block", "size": { "px": 0 }, "content": { "mod": "demo-stage" } }]
    | if $r == "review" then (.. | objects | select(.id? == "tabs-row") | .children) |= (.[0:1] + [{ "id": "review", "type": "block", "size": { "px": 0 }, "window_drag": true, "content": { "mod": "pulls-review", "props": { "block": "review" } } }] + .[1:]) else . end' \
    "$src/layouts/herdr-t3.json" > "$A/layouts/herdr-t3.json"
}

install_app() {
  gen="--exclude gpui-kit.d.ts --exclude jsconfig.json"
  for d in "$src"/mods/t3-*/ "$src"/extras/mods/*/ "$src"/scripts/demo/mods/*/; do rsync -a $gen "$d" "$A/mods/$(basename "$d")/"; done
  layout
  cp "$src/layouts/herdr-t3.svg" "$A/layouts/"; cp "$src"/extras/themes/*.json "$A/themes/"; cp "$src/keys.json" "$A/"
  cat > "$A/settings.json" <<EOF
{ "appearance": "dark", "theme": "catppuccin-mocha", "font": "Geist Mono", "font_size": 12, "ui_font": "Geist", "zoom": 1.1,
  "minimum_contrast": 3, "sounds": { "enabled": false } }
EOF
  cat > "$A/shared.json" <<'EOF'
{
  "frame.welcomed": "finished", "layout": "herdr-t3",
  "t3-actions": { "last": "test", "list": [
    { "id": "test", "name": "Test", "command": "npm test", "icon": "test", "place": "down" },
    { "id": "retro", "name": "Retro", "command": "pi \"/skill:retro Look over this space's agent sessions: what slowed them down, and what would help next time? Your three strongest findings, a few lines each.\"", "icon": "configure", "place": "tab" },
    { "id": "dev", "name": "Dev server", "command": "npm run dev", "icon": "play", "place": "tab" },
    { "id": "lint", "name": "Lint", "command": "npm run lint", "icon": "lint", "place": "down" }
  ] },
  "review.prefs": { "autoAnalyze": true, "fileList": "tree", "split": true, "openIn": "tab" }
}
EOF
}

down() {
  [ -d "$D" ] || { echo "nothing at $D"; return; }
  [ -f "$D/app.pid" ] && kill "$(cat "$D/app.pid")" 2>/dev/null || true
  demo jin.review --stop >/dev/null 2>&1 || true
  # --stop can leave a daemon started with --port running: its pid file names it.
  p=$(jq -r '.pid // empty' "$H/.pulls.review/daemon.pid" 2>/dev/null || true); [ -z "$p" ] || kill "$p" 2>/dev/null || true
  if mine; then
    for t in $(demo hc ls --all --json | jq -r '.terminals[].address'); do demo hc kill "$t" >/dev/null 2>&1 || true; demo hc rm "$t" >/dev/null 2>&1 || true; done
    demo hc server stop >/dev/null 2>&1 || true
  fi
  sleep 1; rm -rf "$D"; echo "down: $D removed"
}

# What the scenes share. A clean slate: the demo's terminals end (and their spaces with them).
clear_stage() {
  for t in $(demo hc ls --all --json | jq -r '.terminals[]?.address'); do demo hc kill "$t" >/dev/null 2>&1 || true; demo hc rm "$t" >/dev/null 2>&1 || true; done
  spaces=""
}
# The window again, for what it reads once, at start: a layout's blocks, the Inbox's store.
reopen() {
  kill "$(cat "$D/app.pid")"; sleep 2
  [ -z "${1-}" ] || $1
  app
  demo herdr-app do layout.switch '{"name":"herdr-t3"}' >/dev/null
}
# `open_tab <repo> <tab name> <argv…>`: a tab in that repo's space, made with it the first time; its terminal in $t.
# The Inbox titles a card by its tab's name.
open_tab() {
  repo=$1 name=$2; shift 2
  argv=$(jq -nc '$ARGS.positional' --args "$@")
  sp=$(printf '%s\n' "$spaces" | sed -n "s/^$repo //p")
  if [ -z "$sp" ]; then
    r=$(demo herdr-app do space.new "$(jq -nc --arg n "$repo" --arg f "$code/$repo" --arg t "$name" --argjson a "$argv" '{name: $n, folder: $f, tab: $t, argv: $a}')")
    spaces="$spaces
$repo $(echo "$r" | jq -r .space)"
  else
    r=$(demo herdr-app do tab.new "$(jq -nc --arg s "$sp" --arg f "$code/$repo" --arg t "$name" --argjson a "$argv" '{space: $s, folder: $f, name: $t, argv: $a}')")
  fi
  t=$(echo "$r" | jq -r .terminal)
}
# `fake <repo> <tab name> <claude|codex|pi> <state>`: a stand-in agent, for a state a real one won't reach on cue.
fake() { open_tab "$1" "$2" "$D/bin/$3" "$4" "$2"; }
# `settle <terminal> <minutes ago>`, as the Inbox writes it.
settle() { demo hc label "$1" "settled=$((($(date +%s) - $2 * 60) * 1000)):$(demo hc get "$1" --json | jq -r '.turn // 0')" >/dev/null; }
focus() { demo herdr-app do pane.focus "$(jq -nc --arg t "$1" '{terminal: $t}')" >/dev/null; }
# `shoot_active <file>`: for what reads only in the active window, as the Review bar. Focus goes there and comes back.
shoot_active() {
  W=/Applications/OmniWM.app/Contents/MacOS/omniwmctl
  back=$("$W" query focused-window --format json | jq -r '.result.payload.window.id // empty')
  "$W" window focus "$("$W" query windows --app Herdr --format json | jq -r --argjson p "$(cat "$D/app.pid")" '.result.payload.windows[] | select(.pid == $p) | .id')" >/dev/null; sleep 2
  demo herdr-app shot "$1"
  [ -z "$back" ] || "$W" window focus "$back" >/dev/null
}
# `first_turn <terminal>`: until that real agent's first turn is over (at most 10 minutes).
first_turn() {
  for _ in $(seq 300); do [ "$(demo hc get "$1" --json | jq -r '.turn // 0')" -ge 1 ] && return; sleep 2; done
  echo "$1 is still on its first turn" >&2; exit 1
}

case ${1-} in
  up) up ;;
  down) down ;;
  app) app ;;
  scene) code=$H/code; . "$src/scripts/demo/scene-$2.sh" ;;
  key) (umask 077; jq '{"opencode-go": ."opencode-go"}' "$HOME/.pi/agent/auth.json" > "$H/.pi/agent/auth.json") ;;
  do) shift; demo "$@" ;;
  *) sed -n 2,9p "$0" >&2; exit 1 ;;
esac
