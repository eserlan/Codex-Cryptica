# Oracle Proxy Worker

Cloudflare Worker that proxies requests from Codex Cryptica clients to Google's Gemini API, and — via the LLM model registry/resolver — to any other configured provider (currently also OpenAI-compatible, including GPT-5.6 Luna).

## Purpose

- **System Proxy Mode**: Allows users to access the Oracle without providing their own API key
- **Security**: System API key never exposed to client-side code
- **CORS**: Restricts access to authorized Codex Cryptica domains only

## LLM Operation Pipeline (`src/llm/`)

Alongside the legacy Gemini-only request shapes below, the Worker accepts a provider-neutral operation request — the entry point for the model registry/resolver added in [specs/153-llm-model-registry](../../../specs/153-llm-model-registry/). A request is routed through this pipeline when its JSON body has a top-level `operation` field:

```bash
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{
    "operation": "structured-generation",
    "messages": [{ "role": "user", "content": "Return {\"ok\": true} as JSON." }],
    "schema": { "type": "object", "properties": { "ok": { "type": "boolean" } }, "required": ["ok"] }
  }'
```

Key points:

- **Operations**: `structured-generation`, `freeform-generation`, `revision` (not yet wired to a default), `classification`, `utility`.
- **No provider details from the client**: the request never carries a provider name, provider URL, credential, or concrete model identifier — those live only in `src/llm/registry.ts`. An optional `modelKeyOverride` may name an internal registry key (not a provider model id).
- **Model registry**: `src/llm/registry.ts` — the single place mapping an internal model key to a provider, API model identifier, capabilities, and pricing. Add `OPENAI_API_KEY` (see below) before enabling any OpenAI-family model, including Luna.
- **Response shape**: identical regardless of which provider served the request — see `specs/153-llm-model-registry/contracts/llm-operation-request.md`.
- Requests without an `operation` field are handled by the pre-existing branches below, completely unchanged.

## Deployment

### Prerequisites

1. Cloudflare account with Workers access
2. Google Gemini API key
3. Wrangler CLI installed: `pnpm add -g wrangler`

### Manual Deployment (Development/Staging)

```bash
# 1. Navigate to worker directory
cd apps/workers/oracle-proxy

# 2. Deploy the worker
wrangler deploy

# 3. Set the Gemini API key (secure secret)
wrangler secret put GEMINI_API_KEY

# 4. Verify deployment
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}],"generationConfig":{},"model":"gemini-1.5-pro"}'
```

### Automated Deployment (Production)

Production deployments are automated via GitHub Actions. See `.github/workflows/deploy-worker.yml`.

## Configuration

### Environment Variables

| Variable          | Type   | Required | Description                                                      |
| ----------------- | ------ | -------- | ---------------------------------------------------------------- |
| `GEMINI_API_KEY`  | Secret | ✅       | Google Gemini API key (set via `wrangler secret put`)            |
| `ALLOWED_ORIGINS` | Var    | ⚠️       | Comma-separated list of allowed origins (optional, has defaults) |

### Default Allowed Origins

If `ALLOWED_ORIGINS` is not set, the worker allows:

- `https://codex-cryptica.com`
- `https://codexcryptica.com`
- `https://staging.codex-cryptica.com`
- `https://staging.codexcryptica.com`
- `https://codex-cryptica.pages.dev`
- `https://*.codex-cryptica.pages.dev`
- `http://localhost` and `http://127.0.0.1` on any development port

If `ALLOWED_ORIGINS` is set, it is treated as the exact allowlist for the worker. Include any localhost or loopback origins you want to permit in that variable.

## Testing

### Unit Tests

```bash
# From root directory:
pnpm --filter oracle-proxy test
# Or from this directory:
pnpm test
```

### Integration Tests

```bash
# From root directory:
pnpm --filter web exec playwright test oracle-proxy-integration
```

### Manual Testing

```bash
# Test with valid origin
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
    "generationConfig": {},
    "model": "gemini-1.5-pro"
  }'

# Test with invalid origin (should fail with 403)
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.com" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
    "generationConfig": {},
    "model": "gemini-1.5-pro"
  }'
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Codex Cryptica │────▶│  Oracle Proxy Worker │────▶│  Google Gemini   │
│   (Client-Side) │     │  (Cloudflare)        │     │  API             │
└─────────────────┘     └──────────────────────┘     └──────────────────┘
                              │
                              └─▶ Validates Origin
                              └─▶ Forwards Request
                              └─▶ Returns Response
```

## Security

### CORS Protection

- Only allows requests from authorized origins
- Validates `Origin` header against allowlist
- Returns 403 for unauthorized origins

### API Key Security

- API key stored as Cloudflare secret (encrypted at rest)
- Never exposed to client-side code
- Only accessible within worker runtime

### Rate Limiting

- Handled by Google Gemini API quotas
- Consider adding Cloudflare rate limiting for production

### Guest Snapshot Publishing

Creating a new guest snapshot requires a server-validated Cloudflare Turnstile token. This Worker stores `TURNSTILE_SECRET_KEY`; the web deployment uses `VITE_TURNSTILE_SITE_KEY`. See [Turnstile Publishing Setup](../../../docs/deployment/turnstile-publishing.md) for the full setup. Published assets are restricted to verified PNG, JPEG, WebP, and AVIF image data.

## Troubleshooting

### Worker Returns 403

**Cause**: Origin not in allowlist

**Fix**: Add origin to `ALLOWED_ORIGINS` in `wrangler.toml` or environment variables

### Worker Returns 500

**Cause**: Invalid Gemini API key or network error

**Fix**:

1. Check `GEMINI_API_KEY` secret is set correctly
2. Verify Google API key has Gemini API enabled
3. Check worker logs: `wrangler tail`

### CORS Errors in Browser

**Cause**: Missing or incorrect CORS headers

**Fix**: Verify worker is setting `Access-Control-Allow-Origin` header correctly

## Monitoring

### View Logs

```bash
wrangler tail
```

For historical/queryable logs (not just live tail), use the Cloudflare
dashboard → Workers & Pages → `oracle-proxy` → **Logs** tab. This is where
the LLM pipeline's `ResolutionLogEntry` metadata lands — filterable by
`outcome`, `modelKey`, `operation`, etc. Every entry is metadata only
(model key, provider, operation type, latency, outcome, token usage/cost,
retry/fallback info) — **no prompt or response content is ever logged**, so
the Logs tab is safe to view or screenshot without redacting anything.

### Check Worker Status

```bash
wrangler status
```

### Metrics

View worker metrics in Cloudflare Dashboard:

- Requests count
- Errors count
- CPU time
- Response times

## Cost Estimation

Cloudflare Workers free tier:

- 100,000 requests/day
- 10ms CPU time per request

Google Gemini API pricing:

- Check current pricing at https://ai.google.dev/pricing

**Estimated monthly cost** (1000 users, 100 requests/user/month):

- Cloudflare: $0 (free tier)
- Google Gemini: ~$50-100 (depends on usage)

## Future Enhancements

- [ ] Add request/response logging for debugging
- [ ] Implement rate limiting per user/IP
- [ ] Add request caching for common queries
- [ ] Monitor and alert on error rates
- [ ] Add request validation schema
