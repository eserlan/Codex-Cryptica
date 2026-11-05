---
name: deploy-worker
description: Deploy the oracle-proxy Cloudflare Worker (apps/workers/oracle-proxy) from the local machine with wrangler, from up-to-date `staging` only. Use when asked to "deploy the worker", "wrangler deploy", or "deploy oracle-proxy". Handles the stale CF_API_TOKEN trap and the help-engine bundle step.
---

# Deploy Worker (local, staging only)

Deploys `apps/workers/oracle-proxy` with wrangler from the user's PC. CI deploy (`.github/workflows/deploy-worker.yml`) has been unreliable (repo `CLOUDFLARE_API_TOKEN` secret fails with "No access to the specified service"), so this is the working path.

**Only deploy from `staging`.** If the user asks for another branch, decline and say this skill is staging-only.

## Why the env vars are unset

The shell exports a stale `CF_API_TOKEN` that Cloudflare rejects ("Invalid access token"), and wrangler prefers it over the OAuth login. The OAuth login works, so always run wrangler with both token variables unset. Do not use `apps/workers/oracle-proxy/deploy.sh`: it uses a global wrangler and does not unset them.

## Steps

1. **Clean tree**: `git status --short` must be empty. If not, tell the user and stop.
2. **Be on staging and current**: if not on `staging`, `git checkout staging`. Then `git pull --ff-only origin staging`.
3. **Install and bundle** (matches CI):
   ```bash
   bun install --frozen-lockfile
   bun run --cwd packages/help-engine bundle
   ```
4. **Deploy**:
   ```bash
   cd apps/workers/oracle-proxy && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx wrangler deploy
   ```
5. **Report**: staging commit (`git log -1 --format='%h %s'`), the `Current Version ID`, and the routes. Say plainly if you did not smoke-test the live endpoint.

## Notes

- Secret values can't be read back; `env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx wrangler secret list` shows names only.
- If wrangler reports an auth error even with the vars unset, ask the user to run `! bunx wrangler login`.
- Return to the repo root afterwards; the deploy step leaves the shell in the worker directory.
