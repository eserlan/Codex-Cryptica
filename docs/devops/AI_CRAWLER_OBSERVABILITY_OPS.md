# AI Crawler & Fetcher Observability: Operations & Runbook

Tracking issue: [#2864](https://github.com/eserlan/Codex-Cryptica/issues/2864).  
Architecture specification: [`docs/seo/crawler-observability.md`](../seo/crawler-observability.md).  
Client-side counterpart: [`docs/devops/ZARAZ_ANALYTICS.md`](./ZARAZ_ANALYTICS.md).

---

## 1. Operational Overview

Codex Cryptica tracks server-side AI crawler and user-triggered prompt fetch activity via Cloudflare Pages Middleware (`functions/_middleware.ts`) writing non-blocking telemetry to Cloudflare Workers Analytics Engine (`ai_crawler_activity`).

This runbook covers:

1. Cloudflare Dashboard provisioning and bindings.
2. Bot Management and WAF configurations.
3. API credentials and query access.
4. Routine maintenance runbooks (range refresh, reporting, and incident triage).

---

## 2. Cloudflare Dashboard Configuration

### 2.1 Analytics Engine Dataset Binding

The middleware expects a Cloudflare Workers Analytics Engine binding named `AI_CRAWLER_ANALYTICS`.

1. Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** → **Overview** → select `codex-cryptica`.
3. Go to **Settings** → **Functions** → **Analytics Engine datasets**.
4. Click **Add binding**:
   - **Variable name**: `AI_CRAWLER_ANALYTICS`
   - **Dataset name**: `ai_crawler_activity`
5. Save changes.

_(Note: `wrangler.toml` at repository root declares this binding for deployment automation)._

### 2.2 Bot Management & WAF Settings

- **Bot Fight Mode**: Ensure Bot Fight Mode does not challenge verified crawlers. If Bot Fight Mode is enabled on the zone, verify that Cloudflare's _Verified Bots_ bypass rule is enabled.
- **WAF Custom Rules**: Any WAF rule targeting automated traffic must exempt verified search bots (`cf.client.bot` or IP ranges from OpenAI, Google, Microsoft, Perplexity).
- **Security Level**: Maintain Security Level at `Medium` or `Low` to prevent non-browser challenge interstitials for search bots.

---

## 3. Credentials & Environment Variables

To query the Analytics Engine via the CLI report script, set the following environment variables:

| Variable                | Description           | Required Permissions       |
| ----------------------- | --------------------- | -------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID | —                          |
| `CLOUDFLARE_API_TOKEN`  | Scoped API token      | `Account: Analytics: Read` |

These can be added to your local `.env` file or exported in your shell.

---

## 4. Operational Runbooks

### Runbook A: Refresh Published Crawler IP Ranges

Provider IP ranges change periodically. Run the updater script monthly or whenever a provider announces new network ranges:

```bash
bun run update:crawler-ips
```

**Steps:**

1. Check out a clean branch (`git checkout -b chore/update-crawler-ips`).
2. Run `bun run update:crawler-ips`.
3. Verify the diff in `apps/web/src/lib/seo/crawler-observability/published-ranges.ts`.
4. Run tests: `bun test apps/web/src/lib/seo/crawler-observability/`.
5. Commit with `:arrow_up: chore(seo): update published AI crawler IP ranges` and open a PR.

---

### Runbook B: Generating Activity & Coverage Gap Reports

To inspect recent provider activity across content clusters:

```bash
# Default: Last 7 days, queried from Cloudflare Analytics Engine
bun run report:crawler-activity

# Last 30 days
bun run report:crawler-activity --days 30

# Filter by a specific strategic cluster
bun run report:crawler-activity --cluster heist

# Filter by provider
bun run report:crawler-activity --provider openai

# Output JSON for pipeline integration
bun run report:crawler-activity --json
```

**What to check in the report:**

1. **Requests & Unique Paths**: Confirm whether `search_crawler` and `user_fetch` requests are arriving.
2. **Blocked/Errors count**: Should remain `0`. Any non-zero count indicates a 403, 429, or 5xx response.
3. **Unfetched Cluster Routes**: Check which cluster canonical routes have zero visits from verified providers to prioritize discovery outreach.

---

### Runbook C: Triaging Blocked or Errored Requests

If `bun run report:crawler-activity` reveals `Blocked/errors > 0` for verified requests:

1. **Identify the affected provider and path** from the report:
   ```bash
   bun run report:crawler-activity --json | jq '.aggregates[] | select(.blockedOrErrors > 0)'
   ```
2. **Check Cloudflare Security Events**:
   - Go to Cloudflare Dashboard → **Security** → **Events**.
   - Filter by **Action**: `Block` or `Managed Challenge`.
   - Filter by **User Agent**: search for the affected crawler (e.g. `OAI-SearchBot`, `PerplexityBot`).
   - Check the **Rule ID** or **Service** (e.g. WAF Custom Rule, Rate Limiting, Bot Fight Mode) that triggered the block.
3. **Resolve WAF Rule Collisions**:
   - If a custom WAF rule blocked the crawler, add an exception for the provider's IP range or `cf.client.bot`.
   - Re-test using the synthetic crawler check:
     ```bash
     bun run check:crawler-access -- --crawler=<crawler-id>
     ```
