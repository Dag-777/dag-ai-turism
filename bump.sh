#!/usr/bin/env bash
# Cache-bust: rewrite all ?v=YYYYMMDD query params in index.html to current date.
set -euo pipefail

STAMP=$(date +%Y%m%d%H%M)
TARGET="index.html"

if [[ ! -f "$TARGET" ]]; then
  echo "bump.sh: $TARGET not found, skipping."
  exit 0
fi

# Replace ?v=<digits> with ?v=<stamp>. Works on GNU and BSD sed.
if sed --version >/dev/null 2>&1; then
  sed -i -E "s/\\?v=[0-9]+/?v=${STAMP}/g" "$TARGET"
else
  sed -i '' -E "s/\\?v=[0-9]+/?v=${STAMP}/g" "$TARGET"
fi

echo "✓ Cache bumped to v=${STAMP}"
