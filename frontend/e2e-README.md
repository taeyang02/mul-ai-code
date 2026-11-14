# Frontend E2E harness

`verify-e2e.mjs` drives a real Chromium session against a running app (Vite or preview).
Fault injection uses Playwright `page.route` only — never production API hooks.

## Prerequisites

- Backend on `http://127.0.0.1:8080` with Postgres migrated/seeded
- Frontend: `npm run dev -- --host 127.0.0.1 --port 5173`
- Chromium for Playwright (`CHROME_PATH` or default ms-playwright cache)

## Run

```bash
cd frontend
npm ci
npm run test:e2e
# or:
SHOT_DIR=../artifacts/e2e-run BASE_URL=http://127.0.0.1:5173 API_BASE=http://127.0.0.1:8080/api/v1 npm run test:e2e
```

Exit code is nonzero on any failed assertion.
