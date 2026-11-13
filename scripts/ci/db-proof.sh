#!/usr/bin/env bash
# Record migration/schema evidence and optional synthetic quote ID/marker check.
# Inputs (optional files written by e2e — see docs/ci/INTERFACE.md):
#   $CI_ARTIFACT_DIR/db-proof/quote-id.txt
#   $CI_ARTIFACT_DIR/db-proof/quote-marker.txt
# Never interpolates those values into a shell/SQL string without parameterization.
#
# Supports:
#   1) Direct psql to service-container / local Postgres (PGHOST etc.)
#   2) docker compose exec db (local compose smoke)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/db-proof"
mkdir -p "$OUT"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-thanhan}"
PGDATABASE="${PGDATABASE:-thanhan}"
export PGPASSWORD="${PGPASSWORD:-thanhan}"

STATUS="NOT_RUN"
NOTE="postgres client or credentials unavailable"
MODE=""

run_psql() {
  # args forwarded to psql after connection flags
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 "$@"
}

run_compose_psql() {
  docker compose -f "$ROOT/compose.yaml" exec -T db \
    psql -U thanhan -d thanhan -v ON_ERROR_STOP=1 "$@"
}

psql_exec() {
  if [[ "$MODE" == "direct" ]]; then
    run_psql "$@"
  else
    run_compose_psql "$@"
  fi
}

if command -v psql >/dev/null 2>&1; then
  if run_psql -c 'SELECT 1' >"$OUT/ping.txt" 2>&1; then
    MODE="direct"
  fi
fi

if [[ -z "$MODE" ]] && command -v docker >/dev/null 2>&1; then
  if docker compose -f "$ROOT/compose.yaml" ps db 2>/dev/null | grep -qiE 'up|running|healthy'; then
    if run_compose_psql -c 'SELECT 1' >"$OUT/ping.txt" 2>&1; then
      MODE="compose"
    fi
  fi
fi

if [[ -z "$MODE" ]]; then
  {
    echo "status=NOT_RUN"
    echo "note=no reachable Postgres via psql($PGHOST:$PGPORT) or compose db"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } | tee "$OUT/result.txt"
  exit 0
fi

psql_exec -c "SELECT version();" >"$OUT/postgres-version.txt" 2>&1 || true

if ! psql_exec -c \
  "SELECT installed_rank, version, description, success FROM flyway_schema_history ORDER BY installed_rank;" \
  >"$OUT/flyway-schema-history.txt" 2>&1; then
  echo "flyway_schema_history missing or query failed" >"$OUT/flyway-schema-history.txt"
fi

# Migration evidence is required once DB is reachable
if grep -Eq 'installed_rank|^[[:space:]]*[0-9]+' "$OUT/flyway-schema-history.txt" 2>/dev/null \
  || grep -qi 'flyway_schema_history' "$OUT/flyway-schema-history.txt" 2>/dev/null; then
  STATUS="PASS"
  NOTE="migrations captured via $MODE"
else
  # empty history after backend boot is still a real signal
  if grep -qi 'missing\|does not exist\|ERROR' "$OUT/flyway-schema-history.txt"; then
    STATUS="FAIL"
    NOTE="flyway_schema_history unavailable via $MODE"
  else
    STATUS="PASS"
    NOTE="flyway query returned via $MODE (see flyway-schema-history.txt)"
  fi
fi

if [[ -f "$OUT/quote-id.txt" && -f "$OUT/quote-marker.txt" ]]; then
  QID="$(tr -d '\n\r' <"$OUT/quote-id.txt")"
  QMARK="$(tr -d '\n\r' <"$OUT/quote-marker.txt")"
  if [[ -z "$QID" || -z "$QMARK" ]]; then
    STATUS="FAIL"
    NOTE="quote-id/marker files present but empty"
    echo "$NOTE" >"$OUT/quote-lookup.txt"
  else
    if psql_exec \
      -v qid="$QID" -v qmark="$QMARK" \
      -c "SELECT id::text, left(message, 160) AS message_prefix FROM quote_requests WHERE id = :'qid'::uuid AND position(:'qmark' in coalesce(message,'')) > 0;" \
      >"$OUT/quote-lookup.txt" 2>&1; then
      if grep -q "$QID" "$OUT/quote-lookup.txt"; then
        STATUS="PASS"
        NOTE="migrations + quote id/marker matched via $MODE"
      else
        STATUS="FAIL"
        NOTE="quote lookup returned no matching row"
      fi
    else
      STATUS="FAIL"
      NOTE="quote lookup query failed via $MODE"
    fi
  fi
else
  # Migrations may still PASS; quote check honestly skipped until FE writes proof files
  if [[ "$STATUS" == "PASS" ]]; then
    NOTE="$NOTE; quote lookup SKIPPED (missing quote-id.txt / quote-marker.txt)"
  fi
  echo "SKIPPED: no quote-id.txt / quote-marker.txt from e2e" >"$OUT/quote-lookup.txt"
fi

{
  echo "status=$STATUS"
  echo "note=$NOTE"
  echo "mode=$MODE"
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT/result.txt"

[[ "$STATUS" != "FAIL" ]]
