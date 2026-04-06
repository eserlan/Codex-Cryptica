# Transition: GitHub Pages to Cloudflare Pages

## Overview

Codex Cryptica now uses **Cloudflare Pages** for hosting. This document records the migration shape and the remaining cleanup work so staging, production, and blog publishing stay aligned.

GitHub Pages and the old `/staging` path model are no longer the active host. The current staging target is `staging.codexcryptica.com`.

## Current vs. Proposed Architecture

| Feature            | Current State                  | Target State                      |
| :----------------- | :----------------------------- | :-------------------------------- |
| **Production URL** | `codexcryptica.com/`           | `codexcryptica.com/`              |
| **Staging URL**    | `staging.codexcryptica.com/`   | `staging.codexcryptica.com/`      |
| **Isolation**      | Separate Cloudflare envs       | Separate Cloudflare envs          |
| **Promotion**      | Branch-based deploys           | Branch merge / promotion workflow |
| **Build Limits**   | Cloudflare Pages quotas        | Cloudflare Pages quotas           |
| **Performance**    | Global Cloudflare Edge Network | Global Cloudflare Edge Network    |

## The New Deployment Workflow

### 1. Feature Development

Developers create feature branches (e.g., `feat/new-ui`). Cloudflare preview deployments can be used for unique URLs during testing.

### 2. Staging Deployment

When code is ready for staging, it is merged into a dedicated `staging` branch.

- **Trigger**: Push to `staging` branch.
- **Action**: GitHub Actions builds the app and pushes to Cloudflare Pages.
- **Result**: Visible at `staging.codexcryptica.com`.

### 3. Production Promotion

Once verified on staging, the `staging` branch is merged into `main`.

- **Trigger**: Push to `main` branch.
- **Action**: GitHub Actions builds the app and pushes to Cloudflare Pages.
- **Result**: Visible at `codexcryptica.com`.

## Why Cloudflare Pages?

1. **Free Tier**: $0/month. Unlimited bandwidth and requests.
2. **Subdomains**: Proper `staging.domain.com` setup without URL path hacks.
3. **Environment Secrets**: Different API keys for staging and production can be managed directly in the Cloudflare dashboard.
4. **Instant Rollbacks**: If a production deploy fails, you can roll back to any previous successful deployment with one click.

## Implementation Steps

### Phase 1: Cloudflare Setup

1. Keep the GitHub repo connected to Cloudflare Pages.
2. Keep the custom domains attached: `codexcryptica.com` and `staging.codexcryptica.com`.
3. Keep the environment variables in GitHub Actions / Cloudflare as needed for the build.

### Phase 2: GitHub Action Migration

1. Keep `.github/workflows/deploy.yml` as the Cloudflare deploy path.
2. Use `cloudflare/wrangler-action` to upload the build output.
3. Keep staging and production rooted at their own domains.

### Phase 3: Retirement

1. GitHub Pages is already retired.
2. Keep the old `/staging` path out of the app.

## Future State: Build-less Promotion

For maximum safety, we can eventually move to **Artifact Promotion**:

1. Build the app **once** in GitHub.
2. Upload the artifact to **Cloudflare R2** (Storage).
3. "Promote" by updating a Cloudflare Worker or KV key to point the Production domain to the new artifact hash.
   - _Benefit_: Guaranteed that what you tested on staging is _exactly_ what hits production.

## Migration Task List

See [CLOUDFLARE_MIGRATION_TASKS.md](./CLOUDFLARE_MIGRATION_TASKS.md) for the working checklist for the full move.

For a more opinionated order of operations, see [CLOUDFLARE_MIGRATION_PLAN.md](./CLOUDFLARE_MIGRATION_PLAN.md).

For the concrete repo/workflow execution order, see [CLOUDFLARE_IMPLEMENTATION_CHECKLIST.md](./CLOUDFLARE_IMPLEMENTATION_CHECKLIST.md).
