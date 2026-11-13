#!/usr/bin/env bash
# Record migration/schema evidence and optional synthetic quote ID/marker check.
# Inputs (optional files written by e2e):
#   $CI_ARTIFACT_DIR/db-proof/quote-id.txt
#   $CI_ARTIFACT_DIR/db-proof/quote-marker.txt
# Never interpolates those values into a shell/SQL string without parameterization.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/db-proof"
mkdir -p "$OUT"

STATUS="NOT_RUN"
NOTE="postgres client or credentials unavailable"

if command -v docker >/dev/null 2>&1; then
  if docker compose -f "$ROOT/compose.yaml" ps db 2>/dev/null | grep -qi 'up\|running\|healthy'; then
    docker compose -f "$ROOT/compose.yaml" exec -T db \
      psql -U thanhan -d thanhan -v ON_ERROR_STOP=1 \
      -c "SELECT version();" >"$OUT/postgres-version.txt" 2>&1 || true

    docker compose -f "$ROOT/compose.yaml" exec -T db \
      psql -U thanhan -d thanhan -v ON_ERROR_STOP=1 -c \
      "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;" \
      >"$OUT/flyway-schema-history.txt" 2>&1 || echo "flyway_schema_history missing" >"$OUT/flyway-schema-history.txt"

    if [[ -f "$OUT/quote-id.txt" && -f "$OUT/quote-marker.txt" ]]; then
      # Pass as psql variables — do not concatenate into SQL text in bash.
      QID="$(tr -d '\n' <"$OUT/quote-id.txt")"
      QMARK="$(tr -d '\n' <"$OUT/quote-marker.txt")"
      docker compose -f "$ROOT/compose.yaml" exec -T db \
        psql -U thanhan -d thanhan -v ON_ERROR_STOP=1 \
        -v qid="$QID" -v qmark="$QMARK" \
        -c "SELECT id::text, left(message, 120) AS message_prefix FROM quote_requests WHERE id = :'qid'::uuid AND message LIKE '%' || :'qmark' || '%';" \
        >"$OUT/quote-lookup.txt" 2>&1 && STATUS="PASS" || STATUS="FAIL"
      NOTE="lookup via parameterized psql"
    else
      STATUS="SKIPPED"
      NOTE="no quote-id.txt / quote-marker.txt from e2e"
      echo "$NOTE" >"$OUT/quote-lookup.txt"
    fi
  fi
fi

{
  echo "status=$STATUS"
  echo "note=$NOTE"
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT/result.txt"

# Non-zero only on explicit FAIL
[[ "$STATUS" != "FAIL" ]]
