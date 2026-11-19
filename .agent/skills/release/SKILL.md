---
name: release
description: End-to-end Codex Cryptica release and production promotion workflow for both the Cloudflare Worker (oracle-proxy) and the SvelteKit web app (staging to main). Use when asked "time to promote to prod?", "release to production", "deploy worker and web", or "do a release".
---

# Release & Promote to Production

Orchestrates the full release path from `staging` to production for both the
`oracle-proxy` Cloudflare Worker and the `apps/web` Cloudflare Pages app.

## 1. Readiness & Scope Check

Always inspect the current delta before deploying or promoting:

```bash
git fetch origin main staging
git log origin/main..origin/staging --oneline
gh pr list --base staging --state open --json number,title,headRefName,labels
gh run list --branch staging --limit 5 --json name,status,conclusion,headSha,workflowName
```

Check:

- **Staging CI**: `Deploy to Cloudflare Pages` on `origin/staging` HEAD must be
  `completed` / `success`.
- **Open PRs**: confirm with the user if any ready-to-merge PR should land before
  promoting.
- **Release type**:
  - **Patch / hotfix** (bug fixes only, no changelog entry): skip Step 3 and
    promote directly.
  - **Minor release** (new user-facing features): run Step 3
    (`write-release-entry`) before promoting.

## 2. Worker Release (`oracle-proxy`, when needed)

Check whether the worker or CIF help knowledge changed since `origin/main`:

```bash
git diff --name-only origin/main..origin/staging -- \
  apps/workers/oracle-proxy \
  packages/help-engine \
  apps/web/src/lib/content/help
```

If any files changed (or the user asks to deploy the worker), follow the
[`deploy-worker`](../deploy-worker/SKILL.md) skill **from clean, up-to-date
`staging` only**:

1. `git status --short` must be empty.
2. `git checkout staging && git pull --ff-only origin staging`.
3. Rebuild the help bundle and deploy with `CF_API_TOKEN` /
   `CLOUDFLARE_API_TOKEN` unset so wrangler uses OAuth:

```bash
bun install --frozen-lockfile
bun run --cwd packages/help-engine bundle
cd apps/workers/oracle-proxy && env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN bunx --bun wrangler deploy
```

Return to the repo root afterwards and record the staging commit, `Current Version ID`, and deployed routes.

> **When only the worker needs updating**: if no web app changes need promotion,
> stop here after reporting the worker deploy.

## 3. Webapp Changelog & Version Prep (Minor Releases Only)

For a **minor** release, follow
[`write-release-entry`](../../../.agents/skills/write-release-entry/SKILL.md):

1. Prepend the user-focused entry to
   `apps/web/src/lib/content/changelog/releases.json` and sync
   `specs/roadmap.md`.
2. Run `cd apps/web && bunx --bun vitest run src/lib/components/modals/ChangelogModal.test.ts`.
3. Never bump `apps/web/package.json`, `config/index.ts`, or `CACHE_VERSION`
   manually — `merge-staging-to-main.yml` owns all three via
   `scripts/bump-web-version.mjs`.
4. Ensure the **most recently merged PR into `staging` carries the `minor`
   label** before promoting.
5. Push the `🔖 release: vX.Y.0 — <Title>` commit to `staging` (with user
   confirmation) and wait for `Deploy to Cloudflare Pages` on `staging` to
   finish `success`.

## 4. Promote Webapp (`staging` → `main`)

Confirm with the user if they have not already asked to promote, then trigger
`promote-to-prod.yml` (which promotes the latest successful `staging` build):

```bash
gh workflow run promote-to-prod.yml
sleep 3
gh run list --workflow promote-to-prod.yml --limit 1 --json databaseId,status,url,createdAt,headBranch
```

Wait for completion and verify:

```bash
gh run watch <run-id> --exit-status
```

Report:

- Promotion run URL and conclusion (`success` / `failure`)
- Worker `Current Version ID` and routes (if deployed in Step 2)
- Whether it was a `patch` or `minor` release (and release tag / changelog
  version if `minor`)
