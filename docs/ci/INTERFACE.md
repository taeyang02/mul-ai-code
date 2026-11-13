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
test-results.json
junit.xml
playwright-report/
test-results/
backend-test-results/
db-proof/
build-summary.md
manifest.json
```

`manifest.json` requires `schema_version=1` plus `repository`, `branch`, `commit_sha`, `run_id`, `run_attempt`, `timestamp`, `jobs`, and a file inventory with checksums when packaged.

## DB proof hand-off → `scripts/ci/db-proof.sh`

Evidence files (required for quote half of the gate):

| File | Content |
|---|---|
| `$CI_ARTIFACT_DIR/db-proof/quote-id.txt` | UUID from `201` response body `id` |
| `$CI_ARTIFACT_DIR/db-proof/quote-marker.txt` | Marker substring embedded in the quote `message` |

**Writers (both produce real API/DB rows — never fabricate PASS):**

1. `scripts/ci/seed-quote-proof.sh` — CI step after e2e (runs `if: always()`): `POST /api/v1/quote-requests` against the live backend; independent of Playwright.
2. Playwright `frontend/e2e/fullstack-e2e.spec.ts` — also writes the same files when the UI quote flow returns `201` (FE ownership; does not replace the API seed).

`db-proof.sh` records `migration_status` and `quote_status` separately in `result.txt`. **Overall `status=PASS` (exit 0) only when both are PASS.** Migration success requires a successful structured flyway query with enough `success=true` rows — never by grepping the table name. Missing DB, missing quote files, empty/failed history, or no matching quote row ⇒ overall `FAIL` (exit 1) and blocks the CI gate. Logic self-test: `scripts/ci/db-proof-selftest.sh` (psql stub; not a real CI run).

