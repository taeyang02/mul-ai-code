# Multica CI docs

| Doc | Purpose |
|---|---|
| [INTERFACE.md](./INTERFACE.md) | Locked env vars, npm commands, job IDs, artifact schema v1 |
| `../../.github/workflows/multica-ci.yml` | GitHub-hosted workflow |
| `../../scripts/ci/` | Stack start/stop, wait, db-proof, publisher |
| `../../tools/multica-ci/` | Read-only retrieval CLI |

## Ownership

- **Cursor:** workflow orchestration, backend job, artifacts publisher, `multica-ci` CLI, this docs tree.
- **Antigravity:** `frontend/**` Playwright `test:ci`, typecheck/lint/unit scripts, reporters.

## Zenon / AI runtimes

Do **not** run Chromium, full `test:ci`, or compose Postgres smoke here for acceptance. Retrieve shared results with `multica-ci` after a real Actions run exists.
