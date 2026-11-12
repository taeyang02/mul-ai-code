# Thanh An Bắc Giang — Full-stack

API-driven rebuild of [thanhanbacgiang.com.vn](https://thanhanbacgiang.com.vn/).

| Area | Owner | Status |
|---|---|---|
| Backend + shared docs/infra | Cursor | In progress on this branch |
| Frontend | Antigravity | Separate branch/worktree |

## Structure

```text
backend/                 Spring Boot 3 + JPA + Flyway + OpenAPI
docs/
  architecture.md
  database.md
  api-contract.yaml      Shared FE/BE contract
compose.yaml             PostgreSQL + backend
.env.example
```

## Contract

Canonical OpenAPI: `docs/api-contract.yaml`. Runtime Swagger UI: `/swagger-ui.html` (JSON at `/v3/api-docs`).

Shared conventions (DTO / error / pagination) are documented in `docs/architecture.md`.

## Run backend locally

Prerequisites: Java 17+, Maven 3.9+, PostgreSQL 16 (or `docker compose up db`).

```bash
cp .env.example .env
docker compose up -d db
cd backend && mvn spring-boot:run
```

API base: `http://localhost:8080`

## Tests

```bash
cd backend && mvn test
```

Integration tests use embedded PostgreSQL (Zonky), run Flyway migrations + seed, and exercise REST endpoints including quote validation and OpenAPI docs.

## Frontend env

```bash
VITE_API_BASE_URL=http://localhost:8080
```
