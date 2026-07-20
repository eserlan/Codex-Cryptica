# CI and Deployment

This document is a high-level map of the current CI and deployment flow for Codex Cryptica.

The source of truth is the workflow files in [`.github/workflows`](/home/espen/proj/Codex-Arcana/.github/workflows). If this document and a workflow disagree, the workflow wins.

## Overview

The web app uses a staged promotion model on Cloudflare Pages:

1. Pull requests build, test, and create preview deployments.
2. Pushes to `staging` build, test, deploy to the staging environment, and upload a promotable `staging-dist` artifact.
3. Production deploys are performed by manually promoting a successful staging artifact.
4. After a successful production promotion, `staging` is merged back into `main`, the web version is bumped on `main`, and the release workflow is triggered.

## Main Workflows

### `deploy.yml`

Purpose:

- Runs type-checking, linting, tests, and the web build.
- Deploys preview environments for pull requests.
- Deploys the staging environment on pushes to `staging`.
- Uploads the `staging-dist` artifact used for production promotion.

Triggers:

- `pull_request` targeting `main` or `staging`
- `push` to `staging`
- `workflow_dispatch`

Notes:

- PR previews comment back on the PR with preview, bundle report, and coverage links.
- Docs-only changes are ignored by this workflow.
- The staging deploy publishes to the Cloudflare Pages `staging` branch.

### `promote-to-prod.yml`

Purpose:

- Promotes a previously successful staging artifact to production without rebuilding from a different commit.

Trigger:

- Manual `workflow_dispatch`

Behavior:

- Uses the latest successful `Deploy to Cloudflare Pages` run on `staging`, unless a specific staging run ID is supplied.
- Downloads the `staging-dist` artifact from that run.
- Deploys that exact artifact to the Cloudflare Pages `main` branch.
- Sends a production deployment notification after success.

Why this exists:

- Production receives the same built output that already passed staging.
- The promotion step avoids drift between staging validation and production deployment.

### `merge-staging-to-main.yml`

Purpose:

- Reconciles Git history after production promotion.

Trigger:

- Automatic `workflow_run` after `Promote Staging to Production` completes successfully

Behavior:

- Merges `origin/staging` into `main`
- Bumps the web app version and service worker cache on `main`
- Pushes the bump commit
- Triggers `release.yml`
- Sends a Discord notification

Important detail:

- This workflow updates `main` after production promotion. Production deployment itself is still done from the promoted staging artifact, not from a fresh `main` build.

### `release.yml`

Purpose:

- Creates a GitHub release for major or minor web version bumps.

Trigger:

- Manual `workflow_dispatch`

Behavior:

- Checks whether the current version bump is a major/minor release
- Builds the app
- Creates a portable zip artifact
- Generates user-focused release notes from the in-app changelog
  (`scripts/generate-release-notes.mjs` diffs `releases.json` against its
  content at the previous release tag, so notes cover exactly the changelog
  entries added since — write the changelog entry before promoting and the
  release notes come for free)
- Publishes a GitHub release
- Sends a release notification

In practice:

- This is typically triggered by automation after the post-promotion version bump.

### `auto-bump-web-version.yml`

Purpose:

- Bumps the web version after a PR merged directly into `main`.

Trigger:

- `pull_request_target` closed on `main`, when the PR was merged

Behavior:

- Bumps versioned web files
- Commits and pushes the bump
- Triggers `deploy.yml` on `main`
- Triggers `release.yml` on `main`

Important detail:

- `deploy.yml` does not auto-run on pushes to `main`, but this workflow can dispatch it manually when needed.

## Branch Flow

Typical feature flow:

1. Open a PR against `staging` or `main`.
2. CI runs through `deploy.yml`.
3. If the PR is open, a preview deployment is created.
4. If changes land on `staging`, staging is deployed and a promotable artifact is stored.
5. When ready, run `promote-to-prod.yml` to push that staging artifact to production.
6. On successful promotion, `merge-staging-to-main.yml` merges `staging` into `main`, bumps version metadata, and triggers release automation.

## Operational Guidance

Use this model when reasoning about incidents or release work:

- Preview issue: check `deploy.yml` on the PR run.
- Staging issue: check the latest `deploy.yml` run on `staging`.
- Production issue after promotion: check `promote-to-prod.yml`, then `merge-staging-to-main.yml`.
- Missing or unexpected release: check `release.yml` and the version-bump workflows.

## Related Workflows

The repository also contains adjacent workflows that are not the primary web CI/deployment path, including:

- `deploy-blog-content.yml`
- `deploy-worker.yml`
- `notify-release.yml`
- `base-branch-guard.yml`
- `lockfile-sync.yml`
- `daily-e2e.yml`

These may affect release operations around the edges, but they are not the main staged web deployment chain described above.
