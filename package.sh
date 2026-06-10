#!/bin/bash
# Chrome Web Store 提出用 ZIP を作る。実行に必要なファイルだけを同梱
# （テスト・ドキュメント・ストア素材・node_modules は除外）。
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

VER=$(grep -o '"version"[^,]*' manifest.json | grep -o '[0-9.]*')
OUT="dist/jobform-autofill-v${VER}.zip"
mkdir -p dist
rm -f "$OUT"

# アイコンを最新化（icon.svg から再生成）
./icons/build-icons.sh >/dev/null

zip -r "$OUT" \
  manifest.json \
  src/ \
  popup/ \
  icons/icon16.png icons/icon48.png icons/icon128.png \
  >/dev/null

echo "built: $OUT"
echo "--- 内容 ---"
unzip -l "$OUT"
