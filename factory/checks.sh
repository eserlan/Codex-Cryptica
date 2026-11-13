#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. Keep it fast, deterministic and non-interactive: no
# watch modes, no prompts, nothing that rewrites files.
#
# Mirrors the PR quality gate in AGENTS.md. Repository-wide test, lint and
# typecheck runs are forbidden there, so every step is scoped to what the
# branch changed relative to the base branch.
set -euo pipefail

CONFIG="$(dirname "$0")/config.json"
BASE="origin/$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["base_branch"])' "$CONFIG")"

echo "== install"
bun install --frozen-lockfile

echo "== affected workspaces (vs $BASE)"
affected="$(bun scripts/affected-workspaces.mjs --base "$BASE" --head HEAD)"
echo "$affected"

echo "== lint (changed files, no --fix)"
bun scripts/lint-changed.mjs --base "$BASE"

if grep -qE '^- web:' <<<"$affected"; then
  echo "== typecheck (apps/web)"
  (cd apps/web && bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
fi

echo "== tests (impacted)"
bun scripts/test-changed.mjs --base "$BASE"

echo "== fallow audit (new findings only)"
# A JSON runtime error ({"error": true}) is non-blocking per AGENTS.md; only
# a "fail" verdict blocks.
# The report can pass 128 KB, too big for one command-line argument, so it
# goes through a file.
fallow_json="$(mktemp)"
trap 'rm -f "$fallow_json"' EXIT
bunx fallow audit --base "$BASE" --format json --quiet --explain --gate-marker agent >"$fallow_json" 2>/dev/null || true
python3 - "$fallow_json" <<'PY'
import json, sys
raw = open(sys.argv[1]).read()
try:
    report = json.loads(raw[raw.index("{"):])
except ValueError:
    print("fallow: no JSON report; treating as non-blocking")
    sys.exit(0)
if report.get("error"):
    print(f"fallow: runtime error, non-blocking: {report.get('message', '')}")
    sys.exit(0)
verdict = report.get("verdict")
print(f"fallow verdict: {verdict}; introduced: {report.get('attribution')}")
sys.exit(1 if verdict == "fail" else 0)
PY

echo "== all checks passed"
