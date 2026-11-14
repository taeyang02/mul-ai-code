#!/usr/bin/env bash
# Wait until HTTP GET url returns an expected status (default 200).
set -euo pipefail

URL="${1:?usage: wait-for-url.sh URL [timeout_seconds] [expected_status]}"
TIMEOUT="${2:-90}"
EXPECT="${3:-200}"
START="$(date +%s)"

while true; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$URL" || true)"
  if [[ "$CODE" == "$EXPECT" ]]; then
    echo "ready: $URL -> $CODE"
    exit 0
  fi
  NOW="$(date +%s)"
  if (( NOW - START >= TIMEOUT )); then
    echo "timeout after ${TIMEOUT}s waiting for $URL (last=$CODE expect=$EXPECT)" >&2
    exit 1
  fi
  sleep 2
done
