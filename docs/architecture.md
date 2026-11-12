# Architecture — Thanh An Bắc Giang Full-stack

## Overview

API-driven monolith: Vue 3 frontend consumes a Spring Boot REST API backed by PostgreSQL. No microservices.

```text
Browser
  │
  ▼
Vue 3 + TypeScript (Frontend Owner: Antigravity)
  │  HTTP / JSON  (OpenAPI contract)
  ▼
Spring Boot 3 REST API (Backend Owner: Cursor)
  │
  ▼
PostgreSQL + Flyway
```

## Backend layout

```text
backend/
├── src/main/java/vn/thanhanbacgiang/api/
│   ├── config/          # CORS, OpenAPI, Jackson, rate-limit filter
│   ├── domain/          # JPA entities
│   ├── dto/             # Request/response DTOs + envelope types
│   ├── repository/      # Spring Data JPA
│   ├── service/         # Business logic
│   ├── web/             # REST controllers
│   └── exception/       # Global exception handler
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   └── db/migration/    # Flyway SQL
└── src/test/java/       # API / integration tests
```

## Shared API conventions (FE/BE)

| Concern | Convention |
|---|---|
| Base path | `/api/v1` |
| Content type | `application/json; charset=utf-8` |
| Success list/object | Direct DTO or `PageResponse<T>` — no nested `data` wrapper for 2xx |
| Errors | `ErrorResponse` envelope (see below) |
| Timestamps | ISO-8601 UTC (`yyyy-MM-dd'T'HH:mm:ss'Z'`) |
| IDs | UUID strings in JSON; UUID columns in DB |
| Pagination | `page` (0-based), `size` (default 20, max 100), `sort` optional |
| Filtering | Query params on collection endpoints (`category`, `featured`, `q`) |
| CORS | Configurable origins via `APP_CORS_ORIGINS` |

### ErrorResponse

```json
{
  "timestamp": "2026-11-12T04:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "path": "/api/v1/quote-requests",
  "details": [
    { "field": "phone", "message": "must not be blank" }
  ]
}
```

### PageResponse\<T\>

```json
{
  "items": [],
  "page": 0,
  "size": 20,
  "totalItems": 0,
  "totalPages": 0
}
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/site` | Site shell: brand, hero, nav, SEO |
| GET | `/api/v1/company` | Company profile & mission |
| GET | `/api/v1/categories` | Product categories |
| GET | `/api/v1/products` | Product list (paginated, filterable) |
| GET | `/api/v1/products/{id}` | Product detail |
| GET | `/api/v1/site/advantages` | Competitive advantages |
| GET | `/api/v1/contact` | Contact channels & hours |
| POST | `/api/v1/quote-requests` | Quote request intake |

## Security & anti-spam (quote)

- Bean Validation on required fields and formats
- Simple in-memory rate limit per client IP (configurable window)
- Optional honeypot field `website` — must be empty
- No authentication for public read APIs in v1

## Data ownership

All business content (company, products, contact, advantages, site copy) lives in PostgreSQL and is served only via API. Frontend must not hardcode verified business data.

## Local run

See root `README.md` and `compose.yaml`. Backend profile `dev` can use H2 for unit tests; integration tests and local compose use PostgreSQL.
