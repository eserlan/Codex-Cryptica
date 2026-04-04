# CI/CD Deployment Architecture

This document describes the automated build and deployment pipeline for Codex Cryptica.

## Overview

Codex Cryptica uses **GitHub Pages** for hosting. We employ a "Dual-Path" deployment strategy that allows for safe testing of features before they are "live" on the main site.

- **Production:** Hosted at the root ([ eserlan.github.io/Codex-Cryptica/](https://eserlan.github.io/Codex-Cryptica/)).
- **Staging:** Hosted at the [/staging](https://eserlan.github.io/Codex-Cryptica/staging) sub-path.

## The Deployment Workflow (`deploy.yml`)

The main deployment script is located at `.github/workflows/deploy.yml`. It triggers on **every push** to **any branch**.

### 1. Build Phase (Matrix)

The workflow runs a build matrix for two environments simultaneously:

- **`production`**: Always checks out the `main` branch. It uses `BASE_PATH=""`.
- **`staging`**: Checks out the branch that triggered the workflow. It uses `BASE_PATH="/staging"`.

### 2. Deploy Phase

The deployment job waits for both builds to finish, then combines them:

- It puts the production build in the root folder.
- It puts the staging build in the `/staging/` sub-folder.
- It uploads the combined artifact to GitHub Pages.

## The Version Bump Workflow (`auto-bump-web-version.yml`)

When a Pull Request is merged into `main`:

1. **Auto-Bump Trigger:** A workflow runs to increment the version in `apps/web/package.json`.
2. **Commit & Push:** The bot commits the new version back to `main`.
3. **Redundant Triggers:** This push triggers `deploy.yml` automatically.
4. **Manual Dispatch:** The bot also executes `gh workflow run deploy.yml`.

**Note:** Because of the `concurrency` setting in `deploy.yml`, you may see "Cancelled" runs in your Actions tab after a merge. This is normal behavior; the system is simply cancelling the "Merge" deployment in favor of the "Version Bump" deployment to ensure the live site always shows the correct version number.

## Blog Content Deployment

The blog now has its own content-only deployment path that publishes markdown into a dedicated `blog-content` branch.

See [`docs/BLOG_DEPLOYMENT.md`](/home/espen/proj/Codex-Arcana/docs/BLOG_DEPLOYMENT.md) for the workflow, runtime fetch path, and branch layout.

## Environment Variables

The following secrets must be configured in GitHub for the build to succeed:

- `VITE_GOOGLE_CLIENT_ID`: OAuth client ID.
- `VITE_GEMINI_API_KEY`: API key for the Lore Oracle.
- `VITE_DISCORD_WEBHOOK_URL_PROD`: For production notifications.
- `VITE_DISCORD_WEBHOOK_URL_STAGING`: For staging notifications.

## Troubleshooting

If a merge to `main` doesn't result in a site update:

1. Check the **Actions** tab. Look for the _latest_ "Deploy to GitHub Pages" run.
2. If it failed, check the "Build Application" step for linting or test errors.
3. If it was cancelled, wait for the subsequent run (the one triggered by the bot) to finish.
