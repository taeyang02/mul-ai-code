#!/usr/bin/env bash
# Logic self-test for db-proof.sh using a local psql stub (no real DB / no network).
# Fixtures validate classification only — they are NOT a substitute for GitHub CI results.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/ci/db-proof.sh"
BASE="$(mktemp -d "${TMPDIR:-/tmp}/db-proof-selftest.XXXXXX")"
STUB_BIN="$BASE/bin"
mkdir -p "$STUB_BIN"
LOG="$BASE/selftest.log"
PASS_N=0
FAIL_N=0

pass() { PASS_N=$((PASS_N + 1)); echo "PASS: $1" | tee -a "$LOG"; }
fail() { FAIL_N=$((FAIL_N + 1)); echo "FAIL: $1" | tee -a "$LOG"; }

write_psql_stub() {
  local mode="$1"
  cat >"$STUB_BIN/psql" <<EOF
#!/usr/bin/env bash
set -euo pipefail
MODE="$mode"
SQL=""
prev=""
for a in "\$@"; do
  if [[ "\$prev" == "-c" ]]; then SQL="\$a"; fi
  prev="\$a"
done

case "\$SQL" in
  "SELECT 1") echo "1"; exit 0 ;;
  *"version()"*) echo "PostgreSQL stub"; exit 0 ;;
esac

case "\$SQL" in
  *"flyway_schema_history"*)
    case "\$MODE" in
      missing_table)
        echo "ERROR: relation flyway_schema_history does not exist" >&2
        exit 1
        ;;
      empty_history) exit 0 ;;
      failed_migration|mig_fail_quote_ok)
        echo "1|1|schema|t"
        echo "2|2|seed|f"
        exit 0
        ;;
      ok_migrations|ok_all|quote_miss|ok_api_only|ok_api_ui|ui_miss_row)
        echo "1|1|schema|t"
        echo "2|2|seed verified content|t"
        exit 0
        ;;
    esac
    ;;
esac

case "\$SQL" in
  *"quote_requests"*)
    QID=""
    for a in "\$@"; do
      case "\$a" in
        qid=*) QID="\${a#qid=}" ;;
      esac
    done
    case "\$MODE" in
      ok_all|mig_fail_quote_ok|ok_api_only|ok_api_ui)
        if [[ -z "\$QID" ]]; then QID="11111111-1111-1111-1111-111111111111"; fi
        echo "\$QID|marker matched"
        exit 0
        ;;
      ui_miss_row)
        # API id hits; UI id does not
        if [[ "\$QID" == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" ]]; then
          echo "\$QID|api marker"
          exit 0
        fi
        exit 0
        ;;
      quote_miss|ok_migrations)
        exit 0
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
esac

echo "unexpected sql: \$SQL" >&2
exit 99
EOF
  chmod +x "$STUB_BIN/psql"
}

run_case() {
  local name="$1"
  local mode="$2"
  local expect_status="$3"
  local expect_exit="$4"
  local api_quote="$5"
  local ui_quote="$6"
  local e2e_conclusion="$7"

  write_psql_stub "$mode"
  local art="$BASE/case-$name"
  rm -rf "$art"
  mkdir -p "$art/db-proof/api" "$art/db-proof/ui" "$art/job-status"
  if [[ -n "$e2e_conclusion" ]]; then
    {
      echo "status=completed"
      echo "conclusion=$e2e_conclusion"
      echo "note=selftest"
    } >"$art/job-status/e2e.txt"
  fi
  if [[ "$api_quote" == "yes" ]]; then
    echo "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" >"$art/db-proof/api/quote-id.txt"
    echo "MARKER_API" >"$art/db-proof/api/quote-marker.txt"
    echo "provenance=api-seed" >"$art/db-proof/api/provenance.txt"
  fi
  if [[ "$ui_quote" == "yes" ]]; then
    echo "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" >"$art/db-proof/ui/quote-id.txt"
    echo "MARKER_UI" >"$art/db-proof/ui/quote-marker.txt"
    echo "provenance=ui-playwright" >"$art/db-proof/ui/provenance.txt"
  fi

  set +e
  PATH="$STUB_BIN:$PATH" CI_ARTIFACT_DIR="$art" DB_PROOF_MIN_SUCCESS_MIGRATIONS=2 \
    bash "$SCRIPT" >"$art/stdout.txt" 2>"$art/stderr.txt"
  rc=$?
  set -e

  got="$(grep '^status=' "$art/db-proof/result.txt" | head -1 | cut -d= -f2- || true)"
  echo "CASE $name: status=$got exit=$rc (expect status=$expect_status exit=$expect_exit)" | tee -a "$LOG"
  cat "$art/db-proof/result.txt" >>"$LOG"
  echo "---" >>"$LOG"

  if [[ "$got" == "$expect_status" && "$rc" -eq "$expect_exit" ]]; then
    pass "$name"
  else
    fail "$name (got status=$got exit=$rc)"
  fi
}

{
  echo "db-proof selftest $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "script=$SCRIPT"
} | tee "$LOG"

run_case "missing_table_query_fail" "missing_table" "FAIL" 1 "no" "no" "failure"
run_case "empty_history" "empty_history" "FAIL" 1 "yes" "no" "failure"
run_case "failed_migration_row" "failed_migration" "FAIL" 1 "yes" "no" "failure"
run_case "missing_api_quote_files" "ok_migrations" "FAIL" 1 "no" "no" "failure"
run_case "api_quote_lookup_no_row" "quote_miss" "FAIL" 1 "yes" "no" "failure"
run_case "migration_fail_api_match" "mig_fail_quote_ok" "FAIL" 1 "yes" "no" "failure"
# e2e failed, only API present → PASS (UI MISSING honest)
run_case "api_only_e2e_failed" "ok_api_only" "PASS" 0 "yes" "no" "failure"
# e2e success requires UI files
run_case "e2e_success_missing_ui" "ok_api_only" "FAIL" 1 "yes" "no" "success"
# both API+UI present and matching
run_case "api_and_ui_ok" "ok_api_ui" "PASS" 0 "yes" "yes" "success"
# UI files present but row miss → FAIL
run_case "ui_row_miss" "ui_miss_row" "FAIL" 1 "yes" "yes" "success"

echo "summary pass=$PASS_N fail=$FAIL_N" | tee -a "$LOG"
cp "$LOG" "$ROOT/scripts/ci/db-proof-selftest.log" 2>/dev/null || true

if [[ "$FAIL_N" -ne 0 ]]; then
  echo "SELFTEST FAILED" >&2
  exit 1
fi
echo "SELFTEST OK"
exit 0
