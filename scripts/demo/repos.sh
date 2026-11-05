#!/bin/sh
# The demo's projects: the author's open-source repos as published, each with a local remote, and a contributor's
# branch to review. `repos.sh <home>` clones them into <home>/code.
set -eu
home=$1
code=$home/code remotes=$home/remotes
mkdir -p "$code" "$remotes"

# Recent history only: enough for a log and release notes.
for r in herdr-t3 herdr-t3-inbox herdling pulls.review pi-stuff; do
  git clone -q --bare --depth 60 "https://github.com/JinJieBeWater/$r.git" "$remotes/$r.git"
  git clone -q "file://$remotes/$r.git" "$code/$r"
done

# herdr-t3-inbox: a contributor's one-line fix, under review.
cd "$code/herdr-t3-inbox"
git checkout -q -b fix/working-pill-days
python3 -I - mods/t3-inbox/main.js <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = "  return s < 60 ? `${s}s` : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;\n"
new = "  const h = Math.floor(m / 60);\n  return s < 60 ? `${s}s` : m < 60 ? `${m}m` : h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`;\n"
assert old in s, "took() changed upstream: update the review branch"
open(p, "w").write(s.replace(old, new).replace("as T3's Working pill: 9s, 4m, 1h 5m.", "as T3's Working pill: 9s, 4m, 1h 5m, 2d 3h."))
PY
git commit -q -am "fix(t3-inbox): a run over a day reads 2d 3h, not 51h 12m"
git checkout -q main

# pulls.review: a real stretch of its history as a pull request, the default branch moved back to before it.
# shortcut: named by hash within --depth 60, so this stops working once the repo moves on far enough; deepen the clone then.
cd "$code/pulls.review"
git branch feat/analyze-in-daemon 14601e2
git reset -q --hard 6bf6251
git -C "$remotes/pulls.review.git" update-ref refs/heads/multi-repo 6bf6251
git fetch -q
