# Oracle Proxy Worker - Deployment Guide

Quick start guide for deploying the Oracle Proxy Cloudflare Worker.

---

## Quick Deploy (5 minutes)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
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

### Step 4: Set the API Key Secret

```bash
wrangler secret put GEMINI_API_KEY
# Paste your Google Gemini API key when prompted
```

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
