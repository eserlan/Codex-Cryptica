# Quickstart: 164-answer-community-aggregate

## Worker (oracle-proxy + D1)

```bash
# 1. Create the dev/prod D1 database (once per environment) and note its database_id
bunx wrangler d1 create codex-answer-aggregates

# 2. Put the id in apps/workers/oracle-proxy/wrangler.toml [[d1_databases]]
#    binding = "ANSWER_AGGREGATES", database_name = "codex-answer-aggregates"

# 3. Apply migration locally, then run worker tests
bunx wrangler d1 migrations apply codex-answer-aggregates --local
cd apps/workers/oracle-proxy && bunx vitest run src/answer-aggregates.test.ts

# 4. Dev loop
bunx wrangler dev --port 8787
curl -X POST localhost:8787/api/answer-aggregates/vote \
  -H 'Content-Type: application/json' -H 'Origin: http://localhost' \
  -d '{"slug":"how-do-you-run-a-heist-in-a-tabletop-rpg","value":"yes"}'
curl 'localhost:8787/api/answer-aggregates/top?limit=6'
```

## Web

```bash
# Unit + component tests for the impacted surface only (repo rule: never full-suite)
bun scripts/test-changed.mjs
bun scripts/lint-changed.mjs
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```

## Manual verification

1. `bun run dev` (web) with `PUBLIC_ORACLE_PROXY_URL` pointed at local Worker.
2. Open an answer page → vote Yes → confirm UI resolves instantly even with Worker stopped (fail-silent).
3. Seed 4+ slugs to `yes >= 10` via repeated votes (or direct D1 insert) → open `/answers` unfiltered → `Community favourites` strip appears (max 6, helpfulness order); apply any filter → strip hides.
4. `bun scripts/discovery-audit.mjs` → no errors (no new URL).
