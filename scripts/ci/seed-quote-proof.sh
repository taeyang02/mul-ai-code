#!/usr/bin/env bash
# Seed API-provenance quote evidence under db-proof/api/ (never overwrites db-proof/ui/).
# Proves live POST→DB independently of Playwright. db-proof.sh still queries Postgres.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${CI_ARTIFACT_DIR:-$ROOT/ci-artifacts}/db-proof/api"
API_BASE="${API_BASE:-http://127.0.0.1:8080/api/v1}"
mkdir -p "$OUT"

MARKER="MARKER_API_$(date -u +%Y%m%d%H%M%S)_$$"
PAYLOAD=$(cat <<EOF
{
  "fullName": "CI DB Proof Seed",
  "phone": "0987654321",
  "email": "dbproof_seed@example.com",
  "companyName": "Multica CI",
  "productInterest": "db-proof",
  "message": "CI DB proof API seed marker [${MARKER}]",
  "sourcePage": "/ci/db-proof-seed",
  "website": ""
}
EOF
)

RESP_FILE="$OUT/seed-response.json"
HTTP_CODE=0
set +e
HTTP_CODE=$(curl -sS -o "$RESP_FILE" -w "%{http_code}" \
  -X POST "${API_BASE%/}/quote-requests" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --connect-timeout 5 \
  --max-time 30 \
  -d "$PAYLOAD")
CURL_RC=$?
set -e

if [[ "$CURL_RC" -ne 0 ]]; then
  echo "seed-quote-proof: curl failed rc=$CURL_RC" | tee "$OUT/seed-quote-proof.txt"
  exit 1
fi

if [[ "$HTTP_CODE" != "201" ]]; then
  echo "seed-quote-proof: expected HTTP 201 got $HTTP_CODE" | tee "$OUT/seed-quote-proof.txt"
  head -c 500 "$RESP_FILE" >>"$OUT/seed-quote-proof.txt" || true
  exit 1
fi

QID=$(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")); if(!j.id) process.exit(2); process.stdout.write(String(j.id));' "$RESP_FILE")

printf '%s' "$QID" >"$OUT/quote-id.txt"
printf '%s' "$MARKER" >"$OUT/quote-marker.txt"
{
  echo "provenance=api-seed"
  echo "source=POST ${API_BASE%/}/quote-requests"
  echo "status=seeded"
  echo "http_code=$HTTP_CODE"
  echo "quote_id=$QID"
  echo "marker=$MARKER"
  echo "api_base=$API_BASE"
  echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT/provenance.txt" | tee "$OUT/seed-quote-proof.txt"
