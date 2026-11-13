#!/usr/bin/env bash
# DB proof for Multica CI.
# Inputs (see docs/ci/INTERFACE.md):
#   $CI_ARTIFACT_DIR/db-proof/api/quote-id.txt + quote-marker.txt  (API seed — required)
#   $CI_ARTIFACT_DIR/db-proof/ui/quote-id.txt + quote-marker.txt   (UI/Playwright — required when e2e success)
#
# Overall PASS only when:
#   1) flyway migration query succeeds with enough success=true rows
#   2) API quote id+marker lookup hits the matching row
#   3) UI quote: if e2e job concluded success OR ui files exist → must lookup PASS;
#      if e2e failed and ui missing → ui_status=MISSING (honest; does not use API to fill)
# Never greps table names to invent PASS. API proof never substitutes for UI persistence.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/db-proof"
API_DIR="$OUT/api"
UI_DIR="$OUT/ui"
mkdir -p "$OUT" "$API_DIR" "$UI_DIR"

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-thanhan}"
PGDATABASE="${PGDATABASE:-thanhan}"
export PGPASSWORD="${PGPASSWORD:-thanhan}"

EXPECT_MIN_SUCCESS="${DB_PROOF_MIN_SUCCESS_MIGRATIONS:-2}"

MODE=""
MIGRATION_STATUS="NOT_RUN"
API_QUOTE_STATUS="NOT_RUN"
UI_QUOTE_STATUS="NOT_RUN"
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
    echo "api_quote_status=$API_QUOTE_STATUS"
    echo "ui_quote_status=$UI_QUOTE_STATUS"
    # Back-compat alias: quote_status mirrors api (required half)
    echo "quote_status=$API_QUOTE_STATUS"
    echo "mode=${MODE:-none}"
    echo "note=$(IFS='; '; echo "${NOTES[*]}")"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } | tee "$OUT/result.txt"
}

# Lookup quote id+marker under a provenance dir. Sets nameref status var via echo.
# Args: dir label → writes quote-lookup.txt inside dir; echoes PASS|FAIL|MISSING
prove_quote_dir() {
  local dir="$1"
  local label="$2"
  local idf="$dir/quote-id.txt"
  local mkf="$dir/quote-marker.txt"

  if [[ ! -f "$idf" || ! -f "$mkf" ]]; then
    echo "FAIL: missing quote-id.txt and/or quote-marker.txt ($label)" >"$dir/quote-lookup.txt"
    echo "MISSING"
    return 0
  fi
  local QID QMARK
  QID="$(tr -d '\n\r' <"$idf")"
  QMARK="$(tr -d '\n\r' <"$mkf")"
  if [[ -z "$QID" || -z "$QMARK" ]]; then
    echo "FAIL: empty quote proof files ($label)" >"$dir/quote-lookup.txt"
    echo "FAIL"
    return 0
  fi
  # C3: :'qid' / :'qmark' are psql client interpolations — they only work via
  # stdin or -f, never via -c (psql sends -c straight to the server).
  # Keep -v + quoted-literal form; do not concatenate raw id/marker into SQL.
  set +e
  psql_exec -At \
    -v qid="$QID" -v qmark="$QMARK" \
    >"$dir/quote-lookup.txt" 2>"$dir/quote-lookup.err" <<'SQL'
SELECT id::text || '|' || left(coalesce(message,''), 160)
FROM quote_requests
WHERE id = :'qid'::uuid
  AND position(:'qmark' in coalesce(message,'')) > 0;
SQL
  local Q_RC=$?
  set -e
  if [[ "$Q_RC" -ne 0 ]]; then
    add_note "$label quote lookup query failed via $MODE"
    cat "$dir/quote-lookup.err" >>"$dir/quote-lookup.txt" 2>/dev/null || true
    echo "FAIL"
    return 0
  fi
  local HIT=0 qline qid_field
  while IFS= read -r qline || [[ -n "$qline" ]]; do
    [[ -z "$qline" ]] && continue
    qid_field="${qline%%|*}"
    if [[ "$qid_field" == "$QID" ]]; then
      HIT=1
      break
    fi
  done <"$dir/quote-lookup.txt"
  if [[ "$HIT" -eq 1 ]]; then
    add_note "$label quote id/marker matched via $MODE"
    echo "PASS"
  else
    add_note "$label quote lookup returned no matching row"
    echo "FAIL"
  fi
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
  API_QUOTE_STATUS="FAIL"
  UI_QUOTE_STATUS="FAIL"
  add_note "no reachable Postgres via psql($PGHOST:$PGPORT) or compose db"
  write_result "FAIL"
  exit 1
fi

psql_exec -c "SELECT version();" >"$OUT/postgres-version.txt" 2>&1 || true

FLYWAY_SQL="SELECT installed_rank || '|' || version || '|' || replace(description, '|', '/') || '|' || success::text FROM flyway_schema_history ORDER BY installed_rank;"
set +e
psql_exec -At -c "$FLYWAY_SQL" >"$OUT/flyway-schema-history.txt" 2>"$OUT/flyway-schema-history.err"
FLYWAY_RC=$?
set -e

if [[ "$FLYWAY_RC" -ne 0 ]]; then
  MIGRATION_STATUS="FAIL"
  add_note "flyway query failed (exit=$FLYWAY_RC) via $MODE"
  {
    echo "QUERY_FAILED exit=$FLYWAY_RC"
    cat "$OUT/flyway-schema-history.err" 2>/dev/null || true
  } >>"$OUT/flyway-schema-history.txt"
else
  SUCCESS_COUNT=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    if [[ "$line" == QUERY_FAILED* ]] || [[ "$line" == *"does not exist"* ]]; then
      continue
    fi
    rank="${line%%|*}"
    rest="${line#*|}"
    ver="${rest%%|*}"
    rest2="${rest#*|}"
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

# --- API quote (required) ---
API_QUOTE_STATUS="$(prove_quote_dir "$API_DIR" "api")"
if [[ "$API_QUOTE_STATUS" == "MISSING" ]]; then
  API_QUOTE_STATUS="FAIL"
  add_note "missing api/ quote-id.txt and/or quote-marker.txt (required)"
fi

# --- UI quote (separate provenance; never filled from API) ---
E2E_STATUS_FILE="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/job-status/e2e.txt"
E2E_CONCLUSION=""
if [[ -f "$E2E_STATUS_FILE" ]]; then
  E2E_CONCLUSION="$(grep '^conclusion=' "$E2E_STATUS_FILE" | head -1 | cut -d= -f2- || true)"
fi

UI_HAS_FILES=0
if [[ -f "$UI_DIR/quote-id.txt" || -f "$UI_DIR/quote-marker.txt" ]]; then
  UI_HAS_FILES=1
fi

UI_REQUIRED=0
if [[ "$E2E_CONCLUSION" == "success" ]]; then
  UI_REQUIRED=1
fi
if [[ "$UI_HAS_FILES" -eq 1 ]]; then
  UI_REQUIRED=1
fi

if [[ "$UI_REQUIRED" -eq 1 ]]; then
  UI_QUOTE_STATUS="$(prove_quote_dir "$UI_DIR" "ui")"
  if [[ "$UI_QUOTE_STATUS" == "MISSING" ]]; then
    UI_QUOTE_STATUS="FAIL"
    add_note "UI quote proof required but db-proof/ui/ files missing"
  fi
else
  UI_QUOTE_STATUS="MISSING"
  add_note "UI quote proof not required (e2e conclusion=${E2E_CONCLUSION:-unknown}; no ui/ files)"
  echo "SKIP: ui proof not required" >"$UI_DIR/quote-lookup.txt"
fi

# Overall: migration + api always; ui must PASS when required (not MISSING-as-ok when required)
OVERALL_OK=1
[[ "$MIGRATION_STATUS" == "PASS" ]] || OVERALL_OK=0
[[ "$API_QUOTE_STATUS" == "PASS" ]] || OVERALL_OK=0
if [[ "$UI_REQUIRED" -eq 1 ]]; then
  [[ "$UI_QUOTE_STATUS" == "PASS" ]] || OVERALL_OK=0
fi

if [[ "$OVERALL_OK" -eq 1 ]]; then
  write_result "PASS"
  exit 0
fi

write_result "FAIL"
exit 1
