# Quickstart: LLM Model Registry & Provider Resolver

## Run the Worker locally

```sh
cd apps/workers/oracle-proxy
wrangler dev  # port 8787, per wrangler.toml [dev]
```

Set `OPENAI_API_KEY` locally (new secret, alongside the existing `GEMINI_API_KEY`) via `.dev.vars` or `wrangler secret put --local` — see `research.md` R6.

## Run tests

```sh
cd apps/workers/oracle-proxy
bunx vitest run          # existing pattern; no dedicated package.json/config needed
bunx vitest run src/llm  # just the new registry/resolver/adaptor tests
```

## Try the new provider-neutral contract

```sh
curl -s http://localhost:8787/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "operation": "structured-generation",
    "messages": [
      { "role": "system", "content": "You are a terse assistant." },
      { "role": "user", "content": "Return {\"ok\": true} as JSON." }
    ],
    "schema": { "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"] }
  }' | jq
```

Expected: `200` with `{ "content": {...}, "modelKey": "gemini-flash-lite", "usage": {...}, "structuredOutputValid": true }` (per `contracts/llm-operation-request.md`).

## Verify existing callers are unaffected (Story 1)

```sh
curl -s http://localhost:8787/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{ "contents": [{ "parts": [{ "text": "hello" }] }] }' | jq
```

This has no `operation` field, so it MUST fall through to the pre-existing `generateContent` handling unchanged — same response shape as before this feature, per `research.md` R1 and spec FR-007.

## Verify Luna is reachable (Story 3)

Point an `OPERATION_DEFAULTS` entry at `luna-fast` (see `contracts/model-registry.md`), redeploy/restart `wrangler dev`, repeat the structured-generation curl above, and confirm the response's `modelKey` is `"luna-fast"`.

## Verify fallback (Story 4)

Set `luna-fast.enabled = false` in the registry, point `structured-generation`'s default at it, restart, repeat the curl — the request should still succeed (`200`) via whichever model is configured as fallback, and the Worker's console/log output should show a fallback entry (per `data-model.md`'s `ResolutionLogEntry`, `outcome: "fallback"`).

## View observability logs (Story 5)

- **Local dev**: `ResolutionLogEntry` JSON lines print directly to the `wrangler dev` terminal.
- **Deployed, live**: `wrangler tail` streams each request's log entry in real time.
- **Deployed, historical/queryable**: Cloudflare dashboard → Workers & Pages → `oracle-proxy` → **Logs** tab. Requires `[observability] enabled = true` in `wrangler.toml` (flipped on as part of this feature — see T034a) to persist logs beyond the live tail window.

Every entry is metadata only — model key, provider, operation type, latency, outcome, token usage/cost, retry/fallback info — never the request's `messages` or the response `content` (FR-012/SC-006). The Logs tab is safe to view or screenshot without redacting anything.
