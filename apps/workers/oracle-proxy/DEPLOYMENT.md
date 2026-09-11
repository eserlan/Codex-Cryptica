# Oracle Proxy Worker - Deployment Guide

Quick start guide for deploying the Oracle Proxy Cloudflare Worker.

---

## Quick Deploy (5 minutes)

### Step 1: Install Wrangler CLI

```bash
pnpm add -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window. Authorize Wrangler to access your Cloudflare account.

### Step 3: Deploy the Worker

```bash
# From project root
cd apps/workers/oracle-proxy
wrangler deploy
```

### Step 4: Set Worker Secrets

```bash
wrangler secret put GEMINI_API_KEY
# Paste your Google Gemini API key when prompted

wrangler secret put TURNSTILE_SECRET_KEY
# Paste the secret for the Turnstile widget used to create guest snapshots

wrangler secret put SESSION_TOKEN_SECRET
# Any high-entropy random string, e.g. `openssl rand -base64 32`.
# HMAC signing key for LLM session capability tokens.

wrangler secret put CODEX_AUTOMATION_KEY
# Secret key for trusted automation/agent workflows (can be comma-separated for rotation).
```

For widget creation, web environment configuration, quotas, and testing, see [Turnstile Publishing Setup](../../../docs/deployment/turnstile-publishing.md).

#### About `SESSION_TOKEN_SECRET`

Clients solve an invisible Turnstile challenge on app load, exchange it at
`POST /api/session` for a short-lived signed token, and present that token on
every text LLM request. The proxy verifies the signature locally and rate
limits per token id.

Two properties worth knowing before you deploy:

- **Until the secret is set, the guard fails open** and generation behaves
  exactly as it did before. That's deliberate — the worker can ship ahead of
  the secret without an outage. Enforcement begins the moment it's set.
- **Rotating the secret invalidates every live token at once.** Clients
  recover on their own: they get a 401, re-solve the challenge, and replay.
  Expect a burst of Turnstile solves right after a rotation.

#### About `CODEX_AUTOMATION_KEY`

For trusted server-side scripts and agent workflows, you can obtain generation session
tokens directly without solving Turnstile:

1. **Mint session token**:
   ```bash
   curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev/api/session \
     -H "X-Codex-Automation-Key: <your-automation-key>"
   # Returns: { "token": "...", "expiresAt": 1700000000, "scope": "automation" }
   ```
2. **Execute generation requests**:
   ```bash
   curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev/ \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "operation": "generate",
       "prompt": "Describe an ancient crypt",
       "model": "gemini-3.5-flash-lite"
     }'
   ```

Key rotation supports comma-separated keys (`key-v2,key-v1`) in the `CODEX_AUTOMATION_KEY` secret.

Image generation (`/v1/images/generations`) is not covered by this guard — it
keeps its own per-IP daily limit.

### Step 5: Verify Deployment

```bash
# The worker URL will be shown after deployment
# Should be: https://oracle-proxy.espen-erlandsen.workers.dev

# Test with curl
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev \
  -H "Content-Type: application/json" \
  -H "Origin: https://codex-cryptica.com" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}],
    "generationConfig": {},
    "model": "gemini-1.5-pro"
  }'
```

---

## Using the Deployment Script

For easier deployment, use the included script:

```bash
# From project root
./apps/workers/oracle-proxy/deploy.sh
```

This script will:

1. Check prerequisites (Wrangler installed, authenticated)
2. Deploy the worker
3. Prompt for API key if not set
4. Run a health check
5. Show deployment information

### Script Commands

```bash
# Full deployment
./deploy.sh deploy

# Check prerequisites only
./deploy.sh check

# Configure API key secret
./deploy.sh secret

# Run health check
./deploy.sh health

# Show deployment info
./deploy.sh info
```

---

## Automated Deployment (CI/CD)

Production deployments are automated via GitHub Actions.

### Setup

1. **Create Cloudflare API Token**:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with "Worker Edit" permissions
   - Copy the token

2. **Add Secret to GitHub**:
   - Go to repository Settings → Secrets and variables → Actions
   - Add new secret: `CLOUDFLARE_API_TOKEN`
   - Paste your API token

3. **Deploy on Push**:
   - Any push to `main` that changes worker files will trigger deployment
   - Or manually trigger from Actions tab → "Deploy Oracle Proxy Worker"

### Manual Trigger

Go to GitHub Actions → "Deploy Oracle Proxy Worker" → "Run workflow"

Select environment:

- **production**: Deploys to production
- **staging**: Deploys to staging (if configured)

---

## Configuration

### Allowed Origins

Edit `wrangler.toml` to customize allowed origins:

```toml
[vars]
ALLOWED_ORIGINS = "https://codex-cryptica.com,https://staging.codexcryptica.com"
```

Or set via Wrangler:

```bash
wrangler secret put ALLOWED_ORIGINS
```

### Guest Snapshot Verification

See [Turnstile Publishing Setup](../../../docs/deployment/turnstile-publishing.md). This Worker only needs `TURNSTILE_SECRET_KEY`; `VITE_TURNSTILE_SITE_KEY` belongs in the web deployment environment.

### Worker Name

To change the worker name, edit `wrangler.toml`:

```toml
name = "your-worker-name"
```

Then update the URL in all references.

---

## Monitoring

### View Live Logs

```bash
wrangler tail
```

### View Historical/Queryable Logs

Cloudflare dashboard → Workers & Pages → `oracle-proxy` → **Logs** tab.
This is where the LLM pipeline's `ResolutionLogEntry` metadata (model key,
provider, operation type, latency, outcome, token usage/cost, retry/fallback
info) is queryable after the fact — filter by `outcome`, `modelKey`,
`operation`, etc. Entries are metadata only; no prompt or response content
is ever logged, so this tab is safe to view or share without redaction.
Requires `[observability] enabled = true` in `wrangler.toml` (already set).

### Check Worker Status

```bash
wrangler status
```

### View Metrics

Go to Cloudflare Dashboard → Workers & Pages → oracle-proxy → Analytics

---

## Troubleshooting

### Error: "Not authenticated"

```bash
wrangler login
```

### Error: "Secret not found"

```bash
wrangler secret put GEMINI_API_KEY
```

### Error: "CORS origin not allowed"

Add your origin to `ALLOWED_ORIGINS` in `wrangler.toml`

### Worker returns 500

Check logs:

```bash
wrangler tail
```

Common causes:

- Invalid API key
- Network timeout
- Google API rate limiting

---

## Cost Management

### Cloudflare Workers

Free tier includes:

- 100,000 requests/day
- 10ms CPU time per request

Monitor usage in Cloudflare Dashboard.

### Google Gemini API

Check current pricing at: https://ai.google.dev/pricing

Estimated costs (1000 users, 100 requests/user/month):

- **Free tier**: 60 requests/minute (sufficient for small deployments)
- **Paid tier**: ~$50-100/month for higher rate limits

---

## Security Best Practices

1. **Rotate API Keys Regularly**:

   ```bash
   wrangler secret put GEMINI_API_KEY
   ```

2. **Monitor Usage**:
   - Set up alerts in Cloudflare Dashboard
   - Monitor Google API usage

3. **Restrict Origins**:
   - Only allow trusted domains in `ALLOWED_ORIGINS`
   - Never use `*` wildcard

4. **Enable Rate Limiting** (future):
   - Consider adding Cloudflare Rate Limiting
   - Protect against abuse

---

## Next Steps

After deployment:

1. ✅ Update client-side code with worker URL
2. ✅ Test Oracle functionality in staging
3. ✅ Monitor logs for errors
4. ✅ Set up automated deployment (GitHub Actions)
5. ✅ Configure monitoring and alerts

---

## Support

For issues or questions:

- Check logs: `wrangler tail`
- Review worker code: `apps/workers/oracle-proxy/src/index.ts`
- See full documentation: `README.md`
