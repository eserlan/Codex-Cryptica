# Server-Side AI Crawler & Fetcher Observability

Tracking issue: [#2864](https://github.com/eserlan/Codex-Cryptica/issues/2864).
Complements: [#2861](https://github.com/eserlan/Codex-Cryptica/issues/2861) (crawler readiness) and [#2858](https://github.com/eserlan/Codex-Cryptica/issues/2858) (cluster analytics).

This document details the server-side observability architecture for tracking and verifying AI crawler and user-triggered prompt fetch activity at Cloudflare.

---

## 1. The Five-Stage AI Discovery Lifecycle

To prevent conflating crawler access with indexing, citation, or business outcomes, Codex Cryptica enforces strict semantic boundaries between each stage of the discovery funnel:

| Stage                          | What It Measures                                   | How It Is Measured                                                                                                                                                | What It Proves                                                                                        |
| ------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **1. Crawler Readiness**       | Technical eligibility & indexability prerequisites | CI smoke check ([#2861](https://github.com/eserlan/Codex-Cryptica/issues/2861), `scripts/crawler-access-check.mjs`)                                               | A crawler _can_ fetch and parse the page (HTTP 200, valid JSON-LD, single H1, canonical, robots.txt). |
| **2. Provider Access / Fetch** | Real-world provider HTTP requests                  | Cloudflare Pages Middleware ([#2864](https://github.com/eserlan/Codex-Cryptica/issues/2864))                                                                      | A recognised AI provider _actually requested_ a URL.                                                  |
| **3. Search Indexing**         | Engine index inclusion                             | Provider search consoles / inspection APIs                                                                                                                        | The page exists in the provider's searchable index.                                                   |
| **4. LLM Citation**            | Model retrieval & synthesis                        | Fixed LLM benchmark evaluations                                                                                                                                   | The model consulted and cited Codex Cryptica in a response.                                           |
| **5. Referral & Conversion**   | Human user acquisition & engagement                | Cloudflare Zaraz client tracking ([#2858](https://github.com/eserlan/Codex-Cryptica/issues/2858), [#1796](https://github.com/eserlan/Codex-Cryptica/issues/1796)) | A human clicked through from an AI platform and saved an entity.                                      |

> [!IMPORTANT]
> **Boundary Notice**:
>
> - Verified crawler activity proves provider access, **not** indexing.
> - A user-triggered prompt fetch (`ChatGPT-User`, `Perplexity-User`) indicates the assistant consulted the page in real-time to answer a prompt, but does **not** prove it cited or recommended the page.
> - Neither stage proves recommendation, referral traffic, or conversion.

---

## 2. Recognised Providers & Agent Taxonomy

The taxonomy is centralized in `apps/web/src/lib/seo/crawler-observability/agent-taxonomy.ts`:

| Provider       | Agent Name               | Agent Type         | Description                                    |
| -------------- | ------------------------ | ------------------ | ---------------------------------------------- |
| **OpenAI**     | `OAI-SearchBot`          | `search_crawler`   | Indexing and search discovery crawler          |
| **OpenAI**     | `ChatGPT-User`           | `user_fetch`       | On-demand fetch triggered by a user prompt     |
| **OpenAI**     | `GPTBot`                 | `training_crawler` | Offline corpus collection for model training   |
| **Perplexity** | `PerplexityBot`          | `search_crawler`   | Search discovery and indexing crawler          |
| **Perplexity** | `Perplexity-User`        | `user_fetch`       | Real-time browsing triggered by a search query |
| **Microsoft**  | `bingbot`                | `search_crawler`   | Bing search engine indexer                     |
| **Microsoft**  | `Copilot-User`           | `user_fetch`       | Copilot user-triggered retrieval               |
| **Google**     | `Googlebot`              | `search_crawler`   | Google search indexer                          |
| **Google**     | `Google-Cloud-VertexBot` | `user_fetch`       | Vertex / Gemini user prompt retrieval          |
| **Google**     | `Google-Extended`        | `training_crawler` | Training corpus crawler                        |
| **Anthropic**  | `Claude-Web`             | `user_fetch`       | Claude real-time web fetch                     |
| **Anthropic**  | `ClaudeBot`              | `training_crawler` | Model training crawler                         |

---

## 3. Strict Anti-Spoofing Verification

Anyone can forge `User-Agent: OAI-SearchBot` or `ChatGPT-User`. **A User-Agent header match alone is never classified as verified provider traffic.**

### Verification Hierarchy

1. **Official Provider Published IP Ranges**:
   - The source IP (`cf-connecting-ip`) is tested in-memory against published CIDRs (`apps/web/src/lib/seo/crawler-observability/published-ranges.ts`).
   - Sourced from official JSON endpoints:
     - OpenAI: `https://openai.com/searchbot.json`, `https://openai.com/chatgpt-user.json`, `https://openai.com/gptbot.json`
     - Perplexity: `https://www.perplexity.ai/perplexitybot.json`, `https://www.perplexity.ai/perplexity-user.json`
     - Google: `https://developers.google.com/static/crawling/ipranges/common-crawlers.json`
     - Microsoft: `https://www.bing.com/toolbox/bingbot.json`
   - If matched: `verified: true`, `verificationMethod: "ip_range"`.

2. **Cloudflare Verified Bot Signals**:
   - If the provider does not publish static ranges, or for freshly added provider subnets, Cloudflare's edge bot management signal (`request.cf.clientBot` or `request.cf.botManagement.verifiedBot`) is evaluated.
   - If verified by Cloudflare: `verified: true`, `verificationMethod: "cloudflare_verified_bot"`.

3. **Unverified Fallback**:
   - If neither check succeeds, the event is marked `verified: false`, `verificationMethod: "unverified"`. Unverified requests are recorded for spoofing analysis but excluded from authentic provider metrics.

### Updating IP Ranges

Published IP ranges are refreshed automatically or manually via:

```bash
bun run update:crawler-ips
```

This script queries the official provider endpoints, validates CIDR syntax, deduplicates entries, and regenerates `published-ranges.ts`.

---

## 4. Privacy & Data Boundary

Codex Cryptica enforces strict client and visitor privacy:

- **No Client IPs**: Full IP addresses are used solely in-memory for subnet matching and are **immediately discarded**. They are never written to logs or telemetry sinks.
- **No Query Strings**: Query strings and hash anchors are stripped from URLs (`/answers/heist?user_prompt=secret` is recorded strictly as `/answers/heist`).
- **No Private Data**: Cookies, authorization headers, request bodies, prompts, generated content, or vault files are never captured.
- **Coarse Country Only**: Only 2-letter ISO country codes from `cf.country` (e.g., `US`, `NO`, `GB`) are preserved.

---

## 5. Architecture & Execution

Telemetry is captured at the Cloudflare edge via Cloudflare Pages Middleware (`functions/_middleware.ts`):

```
Incoming Request
      │
      ▼
Is potential AI agent? ──(No)──► Pass through (context.next())
      │ (Yes)
      ▼
Origin Response (context.next())
      │
      ▼
context.waitUntil(
  collectCrawlerTelemetry(...) ──► Cloudflare Workers Analytics Engine
)
```

### Fail-Silent Operation

Logging failure **must never disrupt or delay public page delivery**. The entire middleware pipeline is wrapped in `try / catch`, and the telemetry write executes asynchronously inside `context.waitUntil()`.

### Edge WAF Boundary

Pages Functions execute for requests that reach the Cloudflare Pages origin. If a request is blocked or challenged earlier by Cloudflare's Zone-level WAF, Under Attack Mode, or Bot Fight Mode before reaching Pages:

- The request returns a 403 or challenge interstitial directly from Cloudflare Layer 7.
- Such pre-edge blocks are discoverable in the **Cloudflare Dashboard → Security → Events** (WAF Analytics), rather than in Pages middleware logs.

---

## 6. Reporting & Coverage Gap Analysis

### Running the Activity Report

```bash
# Query Cloudflare Analytics Engine (requires CLOUDFLARE_API_TOKEN & CLOUDFLARE_ACCOUNT_ID)
bun run report:crawler-activity

# Read local/exported JSON log file
bun run report:crawler-activity --file ./events.json

# Output as JSON
bun run report:crawler-activity --json

# Filter by content cluster or provider
bun run report:crawler-activity --cluster heist
bun run report:crawler-activity --provider openai
```

### Output Format

```text
| Date | Provider | Agent type | Cluster | Requests | Unique paths | 2xx | Blocked/errors |
| --- | --- | --- | --- | ---:| ---:| ---:| ---:|
| 2026-09-09 | openai | search_crawler | heist | 42 | 5 | 42 | 0 |
| 2026-09-09 | openai | user_fetch | heist | 12 | 3 | 12 | 0 |
| 2026-09-09 | perplexity | search_crawler | rumour | 18 | 4 | 18 | 0 |

### Unfetched Cluster Routes by Verified Providers

**Cluster `religion` (1 unfetched):**
- `/examples/the-eel-wyrm-classic-fantasy-constellation`
```

---

## 7. Cloudflare Analytics Engine SQL Queries

When querying Cloudflare Workers Analytics Engine directly via the Cloudflare SQL API:

```sql
SELECT
  toDate(timestamp) AS date,
  blob1 AS provider,
  blob2 AS agent_type,
  blob3 AS cluster,
  count() AS requests,
  uniq(blob4) AS unique_paths,
  countIf(double1 >= 200 AND double1 < 300) AS status_2xx,
  countIf(double1 = 403 OR double1 = 429 OR double1 >= 500) AS blocked_errors
FROM ai_crawler_activity
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY date, provider, agent_type, cluster
ORDER BY date DESC, provider ASC, cluster ASC;
```
