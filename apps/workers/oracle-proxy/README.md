# Oracle Proxy Worker

Cloudflare Worker that proxies requests from Codex Cryptica clients to Google's Gemini API.

## Purpose

- **System Proxy Mode**: Allows users to access the Oracle without providing their own API key
- **Security**: System API key never exposed to client-side code
- **CORS**: Restricts access to authorized Codex Cryptica domains only

## Deployment

### Prerequisites

1. Cloudflare account with Workers access
2. Google Gemini API key
3. Wrangler CLI installed: `npm install -g wrangler`

### Manual Deployment (Development/Staging)

```bash
# 1. Navigate to worker directory
cd apps/workers/oracle-proxy

# 2. Deploy the worker
wrangler deploy

# 3. Set the Gemini API key (secure secret)
wrangler secret put GEMINI_API_KEY

# 4. Verify deployment
curl -X POST https://oracle-proxy.codexcryptica.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello"}]}],"generationConfig":{},"model":"gemini-1.5-pro"}'
```

### Automated Deployment (Production)

Production deployments are automated via GitHub Actions. See `.github/workflows/deploy-worker.yml`.

## Configuration

### Environment Variables

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GEMINI_API_KEY` | Secret | ✅ | Google Gemini API key (set via `wrangler secret put`) |
| `ALLOWED_ORIGINS` | Var | ⚠️ | Comma-separated list of allowed origins (optional, has defaults) |

### Default Allowed Origins

If `ALLOWED_ORIGINS` is not set, the worker allows:
- `https://codex-cryptica.com`
- `https://staging.codex-cryptica.com`
- `https://codex-cryptica.pages.dev`

## Testing

### Unit Tests

```bash
# Run unit tests (stubs for now)
npm test -- workspace:oracle-proxy
```

### Integration Tests

```bash
# Run E2E tests that verify proxy functionality
npx playwright test oracle-proxy-integration
```

### Manual Testing

```bash
# Test with valid origin
curl -X POST https://oracle-proxy.codexcryptica.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
    "generationConfig": {},
    "model": "gemini-1.5-pro"
  }'

# Test with invalid origin (should fail with 403)
curl -X POST https://oracle-proxy.codexcryptica.workers.dev \
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
