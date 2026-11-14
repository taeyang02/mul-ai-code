#!/usr/bin/env bash
# Stub self-test for C1: test:ci failure must remain failure even if legacy passes.
# Does not run Playwright/Chromium — stubs npm only.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE="$(mktemp -d "${TMPDIR:-/tmp}/e2e-gate-selftest.XXXXXX")"
STUB="$BASE/npm-stub"
mkdir -p "$STUB"
LOG="$BASE/selftest.log"
PASS_N=0
FAIL_N=0

pass() { PASS_N=$((PASS_N + 1)); echo "PASS: $1" | tee -a "$LOG"; }
fail() { FAIL_N=$((FAIL_N + 1)); echo "FAIL: $1" | tee -a "$LOG"; }

# Minimal reproduction of the workflow e2e gate body (must stay in sync with multica-ci.yml)
run_gate() {
  local art="$1"
  local CI_ARTIFACT_DIR="$art"
  mkdir -p "$CI_ARTIFACT_DIR/job-status" "$CI_ARTIFACT_DIR/db-proof/ui" "$CI_ARTIFACT_DIR/db-proof/api"
  local NOTES=""
  set +e
  npm run test:ci
  local TEST_CI_RC=$?
  if [[ "$TEST_CI_RC" -eq 0 ]]; then
    echo "status=completed" >"$CI_ARTIFACT_DIR/job-status/e2e.txt"
    echo "conclusion=success" >>"$CI_ARTIFACT_DIR/job-status/e2e.txt"
    echo "note=test:ci" >>"$CI_ARTIFACT_DIR/job-status/e2e.txt"
    set -e
    return 0
  fi
  NOTES="test:ci_failed_rc=${TEST_CI_RC}"
  local KB=0 LEGACY_E2E=0
  npm run test:keyboard && KB=1 || NOTES="$NOTES;test:keyboard_failed"
  npm run test:e2e && LEGACY_E2E=1 || NOTES="$NOTES;test:e2e_failed"
  NOTES="$NOTES;legacy_kb=${KB};legacy_e2e=${LEGACY_E2E}"
  echo "status=completed" >"$CI_ARTIFACT_DIR/job-status/e2e.txt"
  echo "conclusion=failure" >>"$CI_ARTIFACT_DIR/job-status/e2e.txt"
  echo "note=${NOTES}" >>"$CI_ARTIFACT_DIR/job-status/e2e.txt"
  set -e
  return 1
}

write_npm_stub() {
  local test_ci_rc="$1"
  local kb_rc="$2"
  local e2e_rc="$3"
  cat >"$STUB/npm" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cmd="\${1:-}"; shift || true
script="\${1:-}"
case "\$cmd \$script" in
  "run test:ci") exit $test_ci_rc ;;
  "run test:keyboard") exit $kb_rc ;;
  "run test:e2e") exit $e2e_rc ;;
  *) echo "unexpected: \$cmd \$script" >&2; exit 99 ;;
esac
EOF
  chmod +x "$STUB/npm"
}

run_case() {
  local name="$1"
  local ci_rc="$2"
  local kb_rc="$3"
  local e2e_rc="$4"
  local expect_exit="$5"
  local expect_conclusion="$6"

  write_npm_stub "$ci_rc" "$kb_rc" "$e2e_rc"
  local art="$BASE/case-$name"
  rm -rf "$art"
  mkdir -p "$art"

  local rc=0
  PATH="$STUB:$PATH" run_gate "$art" || rc=$?
  local conc=""
  conc="$(grep '^conclusion=' "$art/job-status/e2e.txt" 2>/dev/null | cut -d= -f2- || true)"
  echo "CASE $name: exit=$rc conclusion=$conc (expect exit=$expect_exit conclusion=$expect_conclusion)" | tee -a "$LOG"
  cat "$art/job-status/e2e.txt" >>"$LOG" 2>/dev/null || true
  echo "---" >>"$LOG"

  if [[ "$rc" -eq "$expect_exit" && "$conc" == "$expect_conclusion" ]]; then
    pass "$name"
  else
    fail "$name"
  fi
}

{
  echo "e2e-gate selftest $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$LOG"

# C1: test:ci fail + legacy both pass → still failure / nonzero
run_case "test_ci_fail_legacy_pass" 1 0 0 1 "failure"
# native test:ci pass → success
run_case "test_ci_pass" 0 1 1 0 "success"
# test:ci fail + legacy fail → failure
run_case "test_ci_fail_legacy_fail" 1 1 1 1 "failure"

echo "summary pass=$PASS_N fail=$FAIL_N" | tee -a "$LOG"
cp "$LOG" "$ROOT/scripts/ci/e2e-gate-selftest.log" 2>/dev/null || true

if [[ "$FAIL_N" -ne 0 ]]; then
  echo "E2E GATE SELFTEST FAILED" >&2
  exit 1
fi
echo "E2E GATE SELFTEST OK"
exit 0
