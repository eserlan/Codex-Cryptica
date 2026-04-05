# Proposed Transition: GitHub Pages to Cloudflare Pages

## Overview

Currently, Codex Cryptica uses GitHub Pages for hosting, which requires a "sub-folder" strategy for staging (e.g., `/staging`). This document proposes migrating to **Cloudflare Pages** to enable dedicated subdomains, environment isolation, and a professional promotion-based deployment workflow.

## Current vs. Proposed Architecture

| Feature            | Current (GitHub Pages)       | Proposed (Cloudflare Pages)           |
| :----------------- | :--------------------------- | :------------------------------------ |
| **Production URL** | `codexcryptica.com/`         | `codexcryptica.com/`                  |
| **Staging URL**    | `codexcryptica.com/staging/` | `staging.codexcryptica.com/`          |
| **Isolation**      | Shared build artifact        | Completely separate environments      |
| **Promotion**      | Matrix build (dual deploy)   | Branch merge (Promotion from Staging) |
| **Build Limits**   | Unlimited                    | 500 builds / month (Free Tier)        |
| **Performance**    | Standard GitHub CDN          | Global Cloudflare Edge Network        |

## The New Deployment Workflow

### 1. Feature Development

Developers create feature branches (e.g., `feat/new-ui`). Pushing to these branches can trigger "Preview Deployments" on Cloudflare with unique URLs for testing.

### 2. Staging Deployment

When code is ready for "Staging", it is merged into a dedicated `staging` branch.

- **Trigger**: Push to `staging` branch.
- **Action**: GitHub Actions builds the app and pushes to Cloudflare.
- **Result**: Visible at `staging.codexcryptica.com`.

### 3. Production Promotion

Once verified on staging, the `staging` branch is merged into `main`.

- **Trigger**: Push to `main` branch.
- **Action**: GitHub Actions builds the app and pushes to Cloudflare.
- **Result**: Visible at `codexcryptica.com`.

## Why Cloudflare Pages?

1. **Free Tier**: $0/month. Unlimited bandwidth and requests.
2. **Subdomains**: Proper `staging.domain.com` setup without URL path hacks.
3. **Environment Secrets**: Different API keys for staging and production can be managed directly in the Cloudflare dashboard.
4. **Instant Rollbacks**: If a production deploy fails, you can roll back to any previous successful deployment with one click.

## Implementation Steps

### Phase 1: Cloudflare Setup

1. Connect GitHub repository to Cloudflare Pages.
2. Configure custom domains: `codexcryptica.com` (Production) and `staging.codexcryptica.com` (Preview/Staging).
3. Set environment variables in Cloudflare (Gemini API keys, Discord webhooks).

### Phase 2: GitHub Action Migration

1. Create `.github/workflows/cloudflare-deploy.yml`.
2. Use `cloudflare/wrangler-action` to upload the build output.
3. Remove the `BASE_PATH="/staging"` logic, as both environments will now live at the root of their respective domains.

### Phase 3: Retirement

1. Disable GitHub Pages in repository settings.
2. Delete `.github/workflows/deploy.yml`.

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
