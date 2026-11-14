# CI shared interface (PROJ-3)

Locked between Cursor (orchestration/backend/artifacts/CLI) and Antigravity (frontend Playwright).

## Environment variables

| Name | Owner | Meaning | Default on runner |
|---|---|---|---|
| `BASE_URL` | shared | Frontend origin under test | `http://127.0.0.1:5173` |
| `API_BASE` | shared | Backend API prefix | `http://127.0.0.1:8080/api/v1` |
| `CI_ARTIFACT_DIR` | shared | Root for all CI outputs for this job/step | `$GITHUB_WORKSPACE/ci-artifacts` |
| `SHOT_DIR` | compat | Alias for legacy `verify-e2e.mjs`; set equal to `$CI_ARTIFACT_DIR/e2e` | — |
| `DATABASE_URL` / JDBC vars | Cursor | Postgres used by backend + db-proof | compose/`db` service |
| `MULTICA_NEEDS_BACKEND_RESULT` | Cursor publisher | GHA `needs.backend.result` | — |
| `MULTICA_NEEDS_FRONTEND_RESULT` | Cursor publisher | GHA `needs.frontend.result` | — |
| `MULTICA_NEEDS_E2E_RESULT` | Cursor publisher | GHA `needs.e2e.result` (whole job, incl. DB proof) | — |

Do **not** call `localhost` endpoints from Zenon AI runtimes. These URLs exist only on the GitHub-hosted runner after orchestration brings services up.

## Frontend npm commands (Antigravity)

| Command | Required | Notes |
|---|---|---|
| `npm ci` | yes | lockfile-faithful install |
| `npm run typecheck` | yes | add if missing |
| `npm run lint` | yes | add if missing |
| `npm run test:unit -- --run` | yes | add if missing |
| `npm run build` | yes | already present |
| `npm run test:ci` | yes | Playwright runner, `workers=1`, real Chromium matching lockfile |

Until `test:ci` / typecheck / lint / unit land, the `frontend` and `e2e` workflow jobs record **failure/skipped** honestly — never synthesize PASS.

Compatibility while migrating:

- `npm run test:keyboard` — isolated keyboard suite (`verify-keyboard-a11y.mjs`)
- `npm run test:e2e` — legacy harness (may be superseded by `test:ci`)

## Job IDs (schema v1)

`backend` → `frontend` → `e2e` → `artifacts`

If IDs change, republish this doc before updating `tools/multica-ci` parsers.

## Artifact layout (publisher)

Under `CI_ARTIFACT_DIR` (then uploaded as the Actions artifact `multica-ci-results`):

```text
test-results.json              # RAW Playwright JSON — publisher must not overwrite
junit.xml                      # RAW Playwright JUnit — publisher must not overwrite
playwright-report/
test-results/
backend-test-results/
db-proof/
job-status/
ci-summary/
  job-results.json             # aggregated job conclusions (not a Playwright stand-in)
  job-junit.xml
  analysis.json                # browser step vs db-proof vs needs.result
  raw-reports.json             # presence + sha256 of raw Playwright files
build-summary.md
manifest.json
```

`manifest.json` requires `schema_version=1` plus `repository`, `branch`, `commit_sha`, `run_id`, `run_attempt`, `timestamp`, `jobs`, and a file inventory with checksums when packaged.

**C4 — conclusions:** `jobs.<id>.conclusion` prefers `MULTICA_NEEDS_*_RESULT` (GitHub Actions `needs.*.result`) over `job-status/<id>.txt`. Browser suite may write `e2e.txt` `conclusion=success` before DB proof; if DB proof fails the e2e **job** is still `failure`, and the publisher must record that. Missing raw Playwright reports are noted as absent — never fabricated into success JSON/JUnit at the raw paths.

## DB proof hand-off → `scripts/ci/db-proof.sh`

Separate provenance trees (C2 — API must not overwrite UI):

| Path | Writer | Content |
|---|---|---|
| `$CI_ARTIFACT_DIR/db-proof/api/quote-id.txt` | `scripts/ci/seed-quote-proof.sh` | UUID from API `201` |
| `$CI_ARTIFACT_DIR/db-proof/api/quote-marker.txt` | seed | Marker in API POST message |
| `$CI_ARTIFACT_DIR/db-proof/api/provenance.txt` | seed | `provenance=api-seed` + metadata |
| `$CI_ARTIFACT_DIR/db-proof/ui/quote-id.txt` | Playwright `fullstack-e2e.spec.ts` | UUID from UI-submitted quote |
| `$CI_ARTIFACT_DIR/db-proof/ui/quote-marker.txt` | Playwright | Marker from UI form message |
| `$CI_ARTIFACT_DIR/db-proof/ui/provenance.json` | Playwright | `{ source, id, marker, status, createdAt }` (`source=ui_playwright_e2e`) |

`db-proof.sh` records `migration_status`, `api_quote_status`, and `ui_quote_status` in `result.txt`.

- **API quote** is always required for db-proof PASS.
- **UI quote** is required when `job-status/e2e.txt` has `conclusion=success` or when `ui/` files exist; each source is queried by its own id+marker. Missing UI while e2e failed → `ui_quote_status=MISSING` (honest; API does not fill the gap).
- Migration success requires structured Flyway `success=true` rows — never table-name grepping.
- **C3 — psql vars:** quote lookups pass `-v qid=` / `-v qmark=` and SQL via **stdin** (or `-f`) using `:'qid'` / `:'qmark'`. Never use `psql -c` for those interpolations.

**E2E job gate (C1):** `npm run test:ci` is required. If it fails, `job-status/e2e.txt` must stay `conclusion=failure` and the step must exit nonzero — legacy `test:keyboard` / `test:e2e` are diagnostic only and must not promote the job to success.

Self-tests: `scripts/ci/db-proof-selftest.sh`, `scripts/ci/e2e-gate-selftest.sh`, `scripts/ci/publish-artifacts-selftest.sh` (stubs; not GitHub CI).
