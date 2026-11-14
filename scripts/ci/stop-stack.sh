#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CI_ARTIFACT_DIR="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}"

for name in frontend.pid backend.pid; do
  f="$CI_ARTIFACT_DIR/$name"
  if [[ -f "$f" ]]; then
    pid="$(cat "$f" || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  fi
done

(cd "$ROOT" && docker compose stop db >/dev/null 2>&1 || true)
echo "stack stopped"
