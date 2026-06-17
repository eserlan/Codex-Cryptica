#!/usr/bin/env bash
#
# Phase 0.2 / 0.3 verification harness for the Gemini Interactions API.
# Runs the live contract checks that can't execute in CI/sandbox (need a key).
#
# Usage:
#   GEMINI_API_KEY=... [MODEL=gemini-3.1-flash-lite] \
#     apps/workers/oracle-proxy/scripts/verify-interactions.sh
#
# Verifies:
#   0.1  the chosen MODEL is accepted by /v1beta/interactions
#   0.2  store + previous_interaction_id retains history across two turns
#   0.3  an expired/unknown previous_interaction_id yields a 4xx error
#
set -euo pipefail

: "${GEMINI_API_KEY:?Set GEMINI_API_KEY}"
MODEL="${MODEL:-gemini-3.1-flash-lite}"
BASE="https://generativelanguage.googleapis.com/v1beta/interactions?key=${GEMINI_API_KEY}"

say() { printf '\n=== %s ===\n' "$1"; }
post() { curl -sS -X POST "$BASE" -H 'Content-Type: application/json' -d "$1"; }

say "0.1/0.2 turn 1 — establish state (model: $MODEL)"
TURN1=$(post "{\"model\":\"$MODEL\",\"store\":true,\"input\":\"Remember the codeword is RAVENHOLD. Reply OK.\"}")
echo "$TURN1" | jq '{id, status, text: (.steps[]?.content[]?.text // empty)}'
ID=$(echo "$TURN1" | jq -r '.id // empty')
[ -n "$ID" ] || { echo "FAIL: no interaction id returned"; exit 1; }

say "0.2 turn 2 — recall via previous_interaction_id ($ID)"
TURN2=$(post "{\"model\":\"$MODEL\",\"input\":\"What is the codeword?\",\"previous_interaction_id\":\"$ID\"}")
echo "$TURN2" | jq '{id, text: (.steps[]?.content[]?.text // empty)}'
echo "$TURN2" | jq -e '(.steps[]?.content[]?.text // "") | ascii_upcase | contains("RAVENHOLD")' >/dev/null \
  && echo "PASS 0.2: history retained server-side" \
  || echo "WARN 0.2: codeword not echoed — inspect output above"

say "0.3 expired/unknown previous_interaction_id"
HTTP=$(curl -sS -o /tmp/interaction_err.json -w '%{http_code}' -X POST "$BASE" \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"$MODEL\",\"input\":\"continue\",\"previous_interaction_id\":\"interactions/does-not-exist\"}")
echo "HTTP $HTTP"; jq '.error // .' </tmp/interaction_err.json
case "$HTTP" in
  4*) echo "PASS 0.3: rejected with $HTTP (map this to INTERACTION_NOT_FOUND in the worker)";;
  *)  echo "WARN 0.3: expected 4xx, got $HTTP — revisit worker expiry mapping";;
esac
