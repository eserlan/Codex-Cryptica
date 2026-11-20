---
name: feature-flags
description: Inspect, toggle, or update runtime feature flags in Cloudflare Workers KV (FEATURE_FLAGS namespace) for prod and staging. Use when asked to check, enable, disable, or toggle a feature flag (such as adventureArtwork) in Cloudflare KV.
---

# Feature Flags (Cloudflare KV)

Manages runtime feature flags stored in the `oracle-proxy` `FEATURE_FLAGS` Workers KV namespace (`19a6bf911969462cbf7f74385c1019fd`), served at `GET /api/flags?env=prod|staging`.

## Guardrails

- **Unset stale tokens**: Always run wrangler with `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN` so OAuth login is used instead of stale shell tokens.
- **Read → merge → write**: `wrangler kv key put` overwrites the entire JSON value. Always read the existing `flags:<env>` JSON first, merge the single flag change, and write back the full object so sibling flags are never wiped.
- **Known flags only**: Check `DEFAULT_FEATURE_FLAGS` in `apps/workers/oracle-proxy/src/feature-flags.ts` before adding or toggling a key; unknown keys are ignored by `sanitiseFlags`.
- **Confirm before mutating `prod`**: Ask for confirmation before changing `flags:prod` unless the user explicitly asked to toggle it in prod.

## Check Current Flags

```bash
cd apps/workers/oracle-proxy
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx --bun wrangler kv key get \
  --namespace-id 19a6bf911969462cbf7f74385c1019fd --remote "flags:prod"
env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx --bun wrangler kv key get \
  --namespace-id 19a6bf911969462cbf7f74385c1019fd --remote "flags:staging"
```

## Toggle / Set a Flag

1. Read the current JSON for `flags:<env>` (`prod` or `staging`).
2. Merge `{ "<flagName>": true | false }` into the existing JSON object (or `{}` if the key does not exist yet).
3. Write the updated JSON back:
   ```bash
   cd apps/workers/oracle-proxy
   env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx --bun wrangler kv key put \
     --namespace-id 19a6bf911969462cbf7f74385c1019fd --remote \
     "flags:<env>" '<merged-json>'
   ```
4. Verify by reading the KV key back (and optionally curling `https://oracle-proxy.eserlan.workers.dev/api/flags?env=<env>` — note the endpoint sets `Cache-Control: public, max-age=60`).
