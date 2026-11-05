# Cloudflare `bad_ips` automation

Keeps the Cloudflare account list `bad_ips` — consumed by the WAF custom
rule **Block shady ips**, `(ip.src in $bad_ips)` — populated from observed
probe traffic, instead of by hand.

- Script: `scripts/update-bad-ips.ts`
- Schedule: `.github/workflows/bad-ip-blocklist.yml`, daily 01:00 UTC
  (applies changes). Manual `workflow_dispatch` runs are dry-run unless
  `apply` is ticked.
- Tests: `scripts/update-bad-ips.test.ts`

## How it decides

1. Pulls the last day of zone traffic grouped by IP / path / ASN / status
   from the Cloudflare GraphQL Analytics API.
2. Flags an IP when it hits 3+ distinct probe paths (`/.env`, `/.git/*`,
   `/.aws/*`, `/wp-login.php`, `/vendor/phpunit`, …), or 50+ 404s with at
   least one probe path. Verified bots and `NEVER_BLOCK_CIDRS` are excluded.
3. If `GREYNOISE_API_KEY` / `ABUSEIPDB_API_KEY` are set, drops actors those
   services mark as known-good (GreyNoise RIOT/benign, AbuseIPDB whitelist).
   Enrichment is advisory; without keys, local probe evidence decides.
4. Collapses 3+ flagged IPs in the same `/24` into one range entry. ASNs
   with 5+ flagged IPs are printed as a suggestion only — an IP list cannot
   hold an ASN, so add `(ip.geoip.asnum eq <asn>)` to the WAF rule by hand
   when a fleet is worth blocking wholesale.
5. Merges into the list: manual entries are never removed, auto entries
   (`auto:…; expires=YYYY-MM-DD`, 60 days) are renewed on re-detection and
   pruned after expiry, and auto singles covered by a new range are dropped.
   Caps: 100 new entries per run, 10,000 total.

## One-time setup

1. Confirm the list exists: Cloudflare dashboard → **Manage account →
   Configurations → Lists** → `bad_ips`, and the zone rule
   **Security → Security rules → Custom rules → Block shady ips** uses
   `(ip.src in $bad_ips)` with action **Block**.
2. Create a Cloudflare API token (My Profile → API Tokens → Create Token →
   Custom token):
   - `Account` → `Account Rule Lists` → Edit (in the picker it sits just
     above `Account Rulesets`, which is a different permission and is not
     enough; the API calls this permission `Account Filter Lists Edit`)
   - `Zone` → `Analytics` → Read (for the zone hosting the site)
     Limit it to this account / zone.
3. Add GitHub repo secrets (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_ACCOUNT_ID` — dashboard right sidebar, or `wrangler whoami`
   - `CLOUDFLARE_BAD_IPS_TOKEN` — the token above (deliberately not the
     repo's general-purpose `CLOUDFLARE_API_TOKEN` deploy secret)
   - `CLOUDFLARE_ZONE_ID` — domain Overview page right sidebar
   - Optional: `ABUSEIPDB_API_KEY`, `GREYNOISE_API_KEY`,
     `DISCORD_WEBHOOK_URL` (run summary when entries are added)

Until the three Cloudflare secrets exist, the workflow logs a notice and
skips — it does not fail.

## Local use

```sh
# Offline dry-run against exported events
# ([{ "ip": "...", "path": "/.env", "status": 404, "count": 3 }])
bun scripts/update-bad-ips.ts --file events.json

# Live dry-run, then write
CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_BAD_IPS_TOKEN=… CLOUDFLARE_ZONE_ID=… \
  bun scripts/update-bad-ips.ts --days 7
CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_BAD_IPS_TOKEN=… CLOUDFLARE_ZONE_ID=… \
  bun scripts/update-bad-ips.ts --days 7 --apply
```

## Limitations

- IPv4 only. IPv6 scanner addresses in the traffic data are skipped, not
  listed; block those by hand for now.
- The traffic query reads at most 10,000 grouped rows per run, heaviest
  first. A scanner below that cut in a busy window is picked up on a later
  run, or not at all.
- `httpRequestsAdaptiveGroups` is adaptively sampled on some plans, so
  counts are approximate. Thresholds are set well above sampling noise.
- ASN and bot-management fields are plan-gated. On plans without them
  (including Free) the script degrades automatically: it retries without
  `clientAsn`/`botManagementDecision`, uses `verifiedBotCategory` as the
  verified-bot signal, and simply makes no ASN-block suggestions.

## Rollback

Auto entries expire on their own within 60 days. To undo immediately,
remove rows whose comment starts with `auto:` from the `bad_ips` list in
the dashboard, or re-run history from the workflow's `bad-ip-report`
artifact to see exactly what a run added. Manual entries are untouched by
the script.
