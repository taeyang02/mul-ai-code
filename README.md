# Thanh An Bắc Giang — Full-stack

API-driven rebuild of [thanhanbacgiang.com.vn](https://thanhanbacgiang.com.vn/).

| Area | Stack |
|---|---|
| Backend | Spring Boot 3.3, JPA, Flyway, OpenAPI (`/swagger-ui.html`) |
| Frontend | Vue 3 + Vite + Tailwind |
| Data | PostgreSQL 16 |
| E2E | Playwright (`frontend/npm run test:e2e`) — fault injection only in the harness |

## Structure

```text
backend/                 Spring Boot API
frontend/                Vue SPA + nginx.conf (container) + verify-e2e.mjs
docs/
  architecture.md
  database.md
  api-contract.yaml
  ci/INTERFACE.md        Shared CI env/commands/artifact schema
.github/workflows/       GitHub-hosted multica-ci (not for Zenon)
scripts/ci/              Readiness, db-proof, artifact publisher
tools/multica-ci/        Read-only CI retrieval CLI
compose.yaml             db + backend + frontend
.env.example
```

## Shared GitHub CI (preferred for E2E)

Heavy Chromium / Postgres E2E runs on **GitHub-hosted Actions**, not inside AI runtimes.

- Workflow: `.github/workflows/multica-ci.yml`
- Interface lock: `docs/ci/INTERFACE.md` (`BASE_URL`, `API_BASE`, `CI_ARTIFACT_DIR`; FE scripts `typecheck` / `lint` / `test:unit` / `build` / `test:ci`)
- Retrieval CLI: `node tools/multica-ci/bin/multica-ci.mjs status|results|download|review RUN_ID --repo taeyang02/mul-ai-code --sha <commit>`

Local AI runtimes should not install Chromium or re-run full CI workloads; use `multica-ci` against a real Actions run ID once credentials/push are available.

## Prerequisites

| Local smoke | Container smoke |
|---|---|
| Java 17+, Maven 3.9+ | Docker Engine + Compose v2 |
| Node.js 20+ | — |
| PostgreSQL 16 (or compose `db` only) | — |
| Chromium for Playwright (harness resolves `CHROME_PATH` / ms-playwright cache) | — |

## Contract

Canonical OpenAPI: `docs/api-contract.yaml`. Runtime: `/v3/api-docs`, Swagger UI `/swagger-ui.html`.

## Trusted proxy / rate limit

Quote rate limiting keys on client IP:

- Default: `app.http.trusted-proxies` is **empty** → ignore `X-Forwarded-For`, use peer `remoteAddr` (safe when `:8080` is reachable directly).
- Behind nginx: set `APP_HTTP_TRUSTED_PROXIES` to the proxy peer IP/CIDR. The resolver uses the **rightmost non-trusted** XFF hop (defeats client-spoofed leftmost values when the proxy appends `$remote_addr`).
- `frontend/nginx.conf` **overwrites** `X-Forwarded-For` with `$remote_addr` (does not use `$proxy_add_x_forwarded_for`).

## Run locally (full stack)

```bash
# 1) Database
docker compose up -d db
# or any Postgres 16 with DB/user/password thanhan

# 2) Backend
cp .env.example .env   # optional
cd backend && mvn spring-boot:run
# API: http://127.0.0.1:8080

# 3) Frontend (Vite proxies /api → backend)
cd frontend
printf 'VITE_API_BASE_URL=/api/v1\nVITE_API_PROXY_TARGET=http://127.0.0.1:8080\n' > .env
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Include `http://127.0.0.1:5173` in CORS (default in `application.yml`).

## Tests

```bash
# Backend (Surefire / embedded Postgres via Zonky)
cd backend && mvn test
# expect BUILD SUCCESS / exit 0

# Frontend typecheck + production build
cd frontend && npm run build

# Browser E2E (requires BE :8080 + Vite :5173)
cd frontend
SHOT_DIR=./e2e-artifacts npm run test:e2e
# expect === RESULT: PASS === and process exit 0
```

Harness covers viewports 1440/768/390, mobile drawer viewport + nav link hit-testing, per-API fault/retry (click required), and quote POST id/marker in Postgres.

## Container smoke

```bash
docker compose up --build -d
curl -sf http://127.0.0.1:8080/api/v1/site | head
curl -sf http://127.0.0.1:8088/ | head
docker compose logs --no-color --tail=80
docker compose down
```

Frontend image serves the SPA on **:8088** and proxies `/api/` to `backend:8080`.

If Docker is unavailable in the runtime, treat container smoke as **NOT RUN** and use the commands above for reproduction — local Vite/JVM results are not a substitute.

## Import a delivery bundle

Bundles must advertise the branch ref (not only `HEAD`):

```bash
git bundle verify ./thanhan-….bundle
git fetch ./thanhan-….bundle fix/xff-drawer-harness-readme:fix/xff-drawer-harness-readme
git switch fix/xff-drawer-harness-readme
```
