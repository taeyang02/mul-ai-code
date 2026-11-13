#!/usr/bin/env bash
# C4 fixture tests for publish-artifacts.mjs (no network / no GHA).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/ci/publish-artifacts.mjs"
FIXTURES="$ROOT/scripts/ci/fixtures/publish"
BASE="$(mktemp -d "${TMPDIR:-/tmp}/publish-selftest.XXXXXX")"
LOG="$BASE/selftest.log"
PASS_N=0
FAIL_N=0

pass() { PASS_N=$((PASS_N + 1)); echo "PASS: $1" | tee -a "$LOG"; }
fail() { FAIL_N=$((FAIL_N + 1)); echo "FAIL: $1" | tee -a "$LOG"; }

sha() { sha256sum "$1" | awk '{print $1}'; }

seed_base() {
  local art="$1"
  rm -rf "$art"
  mkdir -p "$art/job-status" "$art/db-proof" "$art/test-results" "$art/playwright-report"
  cp "$FIXTURES/raw-test-results.json" "$art/test-results.json"
  cp "$FIXTURES/raw-junit.xml" "$art/junit.xml"
  {
    echo "status=completed"
    echo "conclusion=success"
    echo "note=fixture-backend"
  } >"$art/job-status/backend.txt"
  {
    echo "status=completed"
    echo "conclusion=success"
    echo "note=fixture-frontend"
  } >"$art/job-status/frontend.txt"
}

{
  echo "publish-artifacts selftest $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "script=$SCRIPT"
} | tee "$LOG"

# --- Case 1: raw checksums unchanged after publish ---
ART1="$BASE/raw-preserved"
seed_base "$ART1"
{
  echo "status=completed"
  echo "conclusion=success"
  echo "note=test:ci"
} >"$ART1/job-status/e2e.txt"
{
  echo "status=PASS"
  echo "migration_status=PASS"
  echo "api_quote_status=PASS"
  echo "ui_quote_status=PASS"
  echo "quote_status=PASS"
  echo "note=fixture"
} >"$ART1/db-proof/result.txt"
BEFORE_JSON="$(sha "$ART1/test-results.json")"
BEFORE_JUNIT="$(sha "$ART1/junit.xml")"
CI_ARTIFACT_DIR="$ART1" \
  MULTICA_NEEDS_BACKEND_RESULT=success \
  MULTICA_NEEDS_FRONTEND_RESULT=success \
  MULTICA_NEEDS_E2E_RESULT=success \
  node "$SCRIPT" >>"$LOG" 2>&1
AFTER_JSON="$(sha "$ART1/test-results.json")"
AFTER_JUNIT="$(sha "$ART1/junit.xml")"
POLLUTED=0
grep -q '"kind": "ci-job-summary"' "$ART1/test-results.json" && POLLUTED=1 || true
if [[ "$BEFORE_JSON" == "$AFTER_JSON" && "$BEFORE_JUNIT" == "$AFTER_JUNIT" \
  && -f "$ART1/ci-summary/job-results.json" && -f "$ART1/ci-summary/job-junit.xml" \
  && "$POLLUTED" -eq 0 ]]; then
  pass "raw_playwright_checksums_preserved"
else
  fail "raw_playwright_checksums_preserved (before=$BEFORE_JSON/$BEFORE_JUNIT after=$AFTER_JSON/$AFTER_JUNIT polluted=$POLLUTED)"
fi

# --- Case 2: browser step success + needs.e2e=failure (DB proof failed) → manifest e2e=failure ---
ART2="$BASE/browser-ok-db-fail"
seed_base "$ART2"
{
  echo "status=completed"
  echo "conclusion=success"
  echo "note=test:ci"
} >"$ART2/job-status/e2e.txt"
{
  echo "status=FAIL"
  echo "migration_status=PASS"
  echo "api_quote_status=PASS"
  echo "ui_quote_status=FAIL"
  echo "quote_status=PASS"
  echo "note=ui row miss"
} >"$ART2/db-proof/result.txt"
{
  echo "status=completed"
  echo "conclusion=failure"
  echo "note=db-proof_rc=1"
} >"$ART2/job-status/db-proof.txt"
CI_ARTIFACT_DIR="$ART2" \
  MULTICA_NEEDS_BACKEND_RESULT=success \
  MULTICA_NEEDS_FRONTEND_RESULT=success \
  MULTICA_NEEDS_E2E_RESULT=failure \
  node "$SCRIPT" >>"$LOG" 2>&1
E2E_CONC="$(node -e "const m=require('$ART2/manifest.json'); process.stdout.write(m.jobs.e2e.conclusion)")"
STEP="$(node -e "const m=require('$ART2/manifest.json'); process.stdout.write(m.analysis.e2e_browser_step.conclusion)")"
DBS="$(node -e "const m=require('$ART2/manifest.json'); process.stdout.write(m.analysis.db_proof.status)")"
if [[ "$E2E_CONC" == "failure" && "$STEP" == "success" && "$DBS" == "FAIL" ]]; then
  pass "browser_pass_db_fail_manifest_failure"
else
  fail "browser_pass_db_fail_manifest_failure (e2e=$E2E_CONC step=$STEP db=$DBS)"
fi

# --- Case 3: missing raw reports noted, not fabricated at raw paths ---
ART3="$BASE/missing-raw"
rm -rf "$ART3"
mkdir -p "$ART3/job-status" "$ART3/db-proof"
{
  echo "status=completed"
  echo "conclusion=failure"
  echo "note=test:ci_failed"
} >"$ART3/job-status/backend.txt"
{
  echo "status=completed"
  echo "conclusion=failure"
  echo "note=test:ci_failed"
} >"$ART3/job-status/frontend.txt"
{
  echo "status=completed"
  echo "conclusion=failure"
  echo "note=test:ci_failed"
} >"$ART3/job-status/e2e.txt"
echo "status=NOT_RUN" >"$ART3/db-proof/result.txt"
CI_ARTIFACT_DIR="$ART3" \
  MULTICA_NEEDS_BACKEND_RESULT=failure \
  MULTICA_NEEDS_FRONTEND_RESULT=failure \
  MULTICA_NEEDS_E2E_RESULT=failure \
  node "$SCRIPT" >>"$LOG" 2>&1
# Raw paths must stay absent (publisher writes summaries under ci-summary only)
if [[ ! -f "$ART3/test-results.json" && ! -f "$ART3/junit.xml" \
  && -f "$ART3/ci-summary/raw-reports.json" ]]; then
  PRESENT="$(node -e "const r=require('$ART3/ci-summary/raw-reports.json'); process.stdout.write(String(r['test-results.json'].present)+','+String(r['junit.xml'].present))")"
  if [[ "$PRESENT" == "false,false" ]]; then
    pass "missing_raw_not_fabricated"
  else
    fail "missing_raw_not_fabricated (present=$PRESENT)"
  fi
else
  fail "missing_raw_not_fabricated (raw files incorrectly created)"
fi

echo "summary pass=$PASS_N fail=$FAIL_N" | tee -a "$LOG"
cp "$LOG" "$ROOT/scripts/ci/publish-artifacts-selftest.log" 2>/dev/null || true

if [[ "$FAIL_N" -ne 0 ]]; then
  echo "SELFTEST FAILED" >&2
  exit 1
fi
echo "SELFTEST OK"
exit 0
