#!/bin/bash
# icons/icon.svg を Chrome ヘッドレスで透過PNG化し、各サイズへ縮小する。
# 依存: macOS の Google Chrome と sips のみ（外部パッケージ不要）。
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --default-background-color=00000000 \
  --screenshot="$DIR/icon512.png" --window-size=512,512 \
  "file://$DIR/icon.svg" >/dev/null 2>&1

for s in 128 48 16; do
  sips -z "$s" "$s" "$DIR/icon512.png" --out "$DIR/icon${s}.png" >/dev/null
done
echo "rendered: icon512/128/48/16.png"
