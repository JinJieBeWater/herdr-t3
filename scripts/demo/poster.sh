#!/bin/sh
# The market covers: `poster.sh <layout|inbox|actions|review> [out.png]` sets a scene's shot (`stage.sh scene …`) in poster.html
# and renders it at 2400x1500, the gallery's 16:10. Default out: $D/poster-<name>.png.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
D=${DEMO:-/private/tmp/herdr-t3-demo} P=$D/poster
mkdir -p "$P/fonts"
# Geist, as Herdr draws it, from its npm package (OFL): only for the render, not kept in the repo.
[ -f "$P/fonts/Geist-Variable.woff2" ] || (
  cd "$P"; npm pack geist --silent >/dev/null; tar xzf geist-*.tgz
  cp package/dist/fonts/geist-sans/Geist-Variable.woff2 package/dist/fonts/geist-mono/GeistMono-Variable.woff2 fonts/
)
cp "$here/poster.html" "$P/"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1200,750 \
  --user-data-dir="$P/profile" --allow-file-access-from-files --virtual-time-budget=3000 --screenshot="${2:-$D/poster-$1.png}" "file://$P/poster.html?$1" >/dev/null 2>&1
