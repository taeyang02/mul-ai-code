#!/usr/bin/env bash
# Bring up Postgres + Spring Boot + Vite for GitHub-hosted e2e only.
# Do not invoke from Zenon AI runtimes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export CI_ARTIFACT_DIR="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}"
mkdir -p "$CI_ARTIFACT_DIR"

echo "== start-stack: compose db =="
docker compose up -d db
"$ROOT/scripts/ci/wait-for-url.sh" "http://127.0.0.1:5432" 5 000 || true
# Postgres is not HTTP — use pg_isready via compose exec when available
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U thanhan -d thanhan >/dev/null 2>&1; then
    echo "postgres ready"
    break
  fi
  sleep 2
  if [[ "$i" -eq 30 ]]; then
    echo "postgres not ready" >&2
    exit 1
  fi
done

echo "== start-stack: backend =="
(
  cd "$ROOT/backend"
  export DATABASE_URL="${DATABASE_URL:-jdbc:postgresql://127.0.0.1:5432/thanhan}"
  export DATABASE_USERNAME="${DATABASE_USERNAME:-thanhan}"
  export DATABASE_PASSWORD="${DATABASE_PASSWORD:-thanhan}"
  export SPRING_DATASOURCE_URL="$DATABASE_URL"
  export SPRING_DATASOURCE_USERNAME="$DATABASE_USERNAME"
  export SPRING_DATASOURCE_PASSWORD="$DATABASE_PASSWORD"
  nohup mvn -q -DskipTests spring-boot:run \
    >"$CI_ARTIFACT_DIR/backend-run.log" 2>&1 &
  echo $! >"$CI_ARTIFACT_DIR/backend.pid"
)

"$ROOT/scripts/ci/wait-for-url.sh" "http://127.0.0.1:8080/api/v1/site" 120 200

echo "== start-stack: frontend (vite) =="
(
  cd "$ROOT/frontend"
  printf 'VITE_API_BASE_URL=/api/v1\nVITE_API_PROXY_TARGET=http://127.0.0.1:8080\n' > .env
  nohup npm run dev -- --host 127.0.0.1 --port 5173 \
    >"$CI_ARTIFACT_DIR/frontend-run.log" 2>&1 &
  echo $! >"$CI_ARTIFACT_DIR/frontend.pid"
)

"$ROOT/scripts/ci/wait-for-url.sh" "http://127.0.0.1:5173/" 90 200
echo "stack ready BASE_URL=http://127.0.0.1:5173 API_BASE=http://127.0.0.1:8080/api/v1"
