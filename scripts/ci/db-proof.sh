#!/usr/bin/env bash
# DB proof for Multica CI.
# Inputs (required for overall PASS — see docs/ci/INTERFACE.md):
#   $CI_ARTIFACT_DIR/db-proof/quote-id.txt
#   $CI_ARTIFACT_DIR/db-proof/quote-marker.txt
#
# Overall PASS only when BOTH:
#   1) flyway migration query succeeds with structured rows where success is true
#   2) quote id+marker files exist and parameterized lookup returns the row
# Missing DB / migration / quote evidence fails the gate (non-zero exit).
# Never greps the table name string to invent PASS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/db-proof"
mkdir -p "$OUT"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-thanhan}"
PGDATABASE="${PGDATABASE:-thanhan}"
export PGPASSWORD="${PGPASSWORD:-thanhan}"

# Minimum successful Flyway versions expected in-repo (V1, V2).
EXPECT_MIN_SUCCESS="${DB_PROOF_MIN_SUCCESS_MIGRATIONS:-2}"

MODE=""
MIGRATION_STATUS="NOT_RUN"
QUOTE_STATUS="NOT_RUN"
NOTES=()

add_note() { NOTES+=("$1"); }

run_psql() {
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

write_result() {
  local overall="$1"
  {
    echo "status=$overall"
    echo "migration_status=$MIGRATION_STATUS"
    echo "quote_status=$QUOTE_STATUS"
    echo "mode=${MODE:-none}"
    echo "note=$(IFS='; '; echo "${NOTES[*]}")"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } | tee "$OUT/result.txt"
}

# --- discover connection ---
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
  MIGRATION_STATUS="FAIL"
  QUOTE_STATUS="FAIL"
  add_note "no reachable Postgres via psql($PGHOST:$PGPORT) or compose db"
  write_result "FAIL"
  exit 1
fi

psql_exec -c "SELECT version();" >"$OUT/postgres-version.txt" 2>&1 || true

# Structured flyway dump: rank|version|description|success (tuples only)
FLYWAY_SQL="SELECT installed_rank || '|' || version || '|' || replace(description, '|', '/') || '|' || success::text FROM flyway_schema_history ORDER BY installed_rank;"
set +e
psql_exec -At -c "$FLYWAY_SQL" >"$OUT/flyway-schema-history.txt" 2>"$OUT/flyway-schema-history.err"
FLYWAY_RC=$?
set -e

if [[ "$FLYWAY_RC" -ne 0 ]]; then
  MIGRATION_STATUS="FAIL"
  add_note "flyway query failed (exit=$FLYWAY_RC) via $MODE"
  # Keep stderr evidence; do not overwrite with a string that greps as success.
  {
    echo "QUERY_FAILED exit=$FLYWAY_RC"
    cat "$OUT/flyway-schema-history.err" 2>/dev/null || true
  } >>"$OUT/flyway-schema-history.txt"
else
  # Count successful migrations from structured rows: N|version|desc|t/true
  SUCCESS_COUNT=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    # Reject free-text errors accidentally present
    if [[ "$line" == QUERY_FAILED* ]] || [[ "$line" == *"does not exist"* ]]; then
      continue
    fi
    rank="${line%%|*}"
    rest="${line#*|}"
    ver="${rest%%|*}"
    rest2="${rest#*|}"
    desc="${rest2%%|*}"
    success="${rest2##*|}"
    if [[ "$rank" =~ ^[0-9]+$ && -n "$ver" && ( "$success" == "t" || "$success" == "true" ) ]]; then
      SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
  done <"$OUT/flyway-schema-history.txt"

  echo "success_migration_count=$SUCCESS_COUNT" >"$OUT/flyway-summary.txt"
  echo "expect_min_success=$EXPECT_MIN_SUCCESS" >>"$OUT/flyway-summary.txt"

  if [[ "$SUCCESS_COUNT" -ge "$EXPECT_MIN_SUCCESS" ]]; then
    MIGRATION_STATUS="PASS"
    add_note "migrations ok via $MODE (success_rows=$SUCCESS_COUNT)"
  elif [[ "$SUCCESS_COUNT" -eq 0 ]]; then
    MIGRATION_STATUS="FAIL"
    add_note "flyway history empty or no success=true rows via $MODE"
  else
    MIGRATION_STATUS="FAIL"
    add_note "insufficient successful migrations ($SUCCESS_COUNT < $EXPECT_MIN_SUCCESS) via $MODE"
  fi
fi

# --- quote proof (required for overall PASS) ---
if [[ ! -f "$OUT/quote-id.txt" || ! -f "$OUT/quote-marker.txt" ]]; then
  QUOTE_STATUS="FAIL"
  add_note "missing quote-id.txt and/or quote-marker.txt (required)"
  echo "FAIL: missing quote proof files" >"$OUT/quote-lookup.txt"
else
  QID="$(tr -d '\n\r' <"$OUT/quote-id.txt")"
  QMARK="$(tr -d '\n\r' <"$OUT/quote-marker.txt")"
  if [[ -z "$QID" || -z "$QMARK" ]]; then
    QUOTE_STATUS="FAIL"
    add_note "quote-id/marker files present but empty"
    echo "FAIL: empty quote proof files" >"$OUT/quote-lookup.txt"
  else
    set +e
    psql_exec -At \
      -v qid="$QID" -v qmark="$QMARK" \
      -c "SELECT id::text || '|' || left(coalesce(message,''), 160) FROM quote_requests WHERE id = :'qid'::uuid AND position(:'qmark' in coalesce(message,'')) > 0;" \
      >"$OUT/quote-lookup.txt" 2>"$OUT/quote-lookup.err"
    Q_RC=$?
    set -e
    if [[ "$Q_RC" -ne 0 ]]; then
      QUOTE_STATUS="FAIL"
      add_note "quote lookup query failed via $MODE"
      cat "$OUT/quote-lookup.err" >>"$OUT/quote-lookup.txt" 2>/dev/null || true
    else
      # Structured: uuid|message_prefix — first field must equal QID
      HIT=0
      while IFS= read -r qline || [[ -n "$qline" ]]; do
        [[ -z "$qline" ]] && continue
        qid_field="${qline%%|*}"
        if [[ "$qid_field" == "$QID" ]]; then
          HIT=1
          break
        fi
      done <"$OUT/quote-lookup.txt"
      if [[ "$HIT" -eq 1 ]]; then
        QUOTE_STATUS="PASS"
        add_note "quote id/marker matched via $MODE"
      else
        QUOTE_STATUS="FAIL"
        add_note "quote lookup returned no matching row"
      fi
    fi
  fi
fi

# Accumulate: quote PASS must not clear migration FAIL
if [[ "$MIGRATION_STATUS" == "PASS" && "$QUOTE_STATUS" == "PASS" ]]; then
  write_result "PASS"
  exit 0
fi

write_result "FAIL"
exit 1
