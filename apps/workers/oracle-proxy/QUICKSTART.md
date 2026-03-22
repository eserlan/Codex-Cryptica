# Oracle Proxy Worker - Quick Reference

## Deployment Commands

### First Time Setup
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
cd apps/workers/oracle-proxy
wrangler deploy

# Set API key
wrangler secret put GEMINI_API_KEY
```

### Using Deployment Script
```bash
# Full deployment with health check
./apps/workers/oracle-proxy/deploy.sh

# Check prerequisites
./deploy.sh check

# View logs
wrangler tail
```

---

## Testing

### Unit Tests
```bash
cd apps/workers/oracle-proxy
npm test
```

### Integration Tests
```bash
# Run in CI or with env var
RUN_PROXY_INTEGRATION_TEST=1 npx playwright test oracle-proxy-integration
```

### Manual Test
```bash
curl -X POST https://oracle-proxy.codexcryptica.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{"contents":[{"role":"user","parts":[{"text":"test"}]}]}'
```

---

## Files Overview

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker code (CORS, forwarding, validation) |
| `src/index.test.ts` | Unit tests (stubs) |
| `wrangler.toml` | Worker configuration |
| `README.md` | Full documentation |
| `DEPLOYMENT.md` | Deployment guide |
| `deploy.sh` | Automated deployment script |
| `.github/workflows/deploy-worker.yml` | CI/CD pipeline |

---

## Environment Variables

| Variable | Type | Required | Default |
|----------|------|----------|---------|
| `GEMINI_API_KEY` | Secret | ✅ | None |
| `ALLOWED_ORIGINS` | Var | ⚠️ | codex-cryptica.com, staging, pages.dev |

---

## URLs

| Environment | URL |
|-------------|-----|
| Production | https://oracle-proxy.codexcryptica.workers.dev |
| Staging | (same - configure via branches) |

---

## Common Issues

| Issue | Solution |
|-------|----------|
| 403 Forbidden | Check `ALLOWED_ORIGINS` |
| 500 Error | Check `GEMINI_API_KEY` secret |
| CORS Error | Verify origin header matches allowlist |
| Not Authenticated | Run `wrangler login` |

---

## Monitoring

```bash
# Live logs
wrangler tail

# Status
wrangler status

# Metrics
# Cloudflare Dashboard → Workers → oracle-proxy → Analytics
```

---

## Costs

- **Cloudflare**: Free (up to 100k requests/day)
- **Google Gemini**: ~$50-100/month (1000 users, 100 req/user/month)

---

## Security Checklist

- [x] API key stored as secret (not in code)
- [x] CORS restricts origins
- [x] No logging of sensitive data
- [ ] Rate limiting (future)
- [ ] Request validation schema (future)

---

## Contact

For issues or questions, see:
- Full docs: `README.md`
- Deployment guide: `DEPLOYMENT.md`
- Worker code: `src/index.ts`
