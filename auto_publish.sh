#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

WATCH_PATHS=("index.html" "styles.css" "script.js" "images")

hash_snapshot() {
  for p in "${WATCH_PATHS[@]}"; do
    if [ -e "$p" ]; then
      find "$p" -type f 2>/dev/null
    fi
  done | sort | xargs shasum 2>/dev/null | shasum | awk '{print $1}'
}

LAST_HASH="$(hash_snapshot)"
echo "Auto publish running in: $REPO_DIR"
echo "Watching: ${WATCH_PATHS[*]}"
echo "Press Ctrl+C to stop."

while true; do
  sleep 4
  NEW_HASH="$(hash_snapshot)"
  if [ "$NEW_HASH" = "$LAST_HASH" ]; then
    continue
  fi

  LAST_HASH="$NEW_HASH"

  git add -A
  if git diff --cached --quiet; then
    continue
  fi

  TS="$(date '+%Y-%m-%d %H:%M:%S')"
  git commit -m "Auto publish: $TS" >/dev/null
  git push origin main >/dev/null
  echo "Published at $TS"
done
