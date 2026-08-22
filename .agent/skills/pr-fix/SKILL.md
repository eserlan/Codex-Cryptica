---
name: pr-fix
description: Specialized PR review comment, check failure, and merge conflict resolver. Fetches review comments and PR checks, identifies and fixes actionable failures, checks out PR branches, merges staging, resolves conflicts, implements code/docs/test fixes, runs targeted tests and type-checks, and pushes gitmoji commits.
metadata:
  type: workflow
---

# PR Fix Skill (`pr-fix`)

Use this skill when given a PR link (or PR number) that has review comments, requested changes, or merge conflicts with `staging` needing resolution.

## Workflow Steps

### 1. Fetch PR & Review Comments

Fetch PR status, branch metadata, and review feedback across all 3 GitHub endpoints:

```bash
# Get PR branch info & mergeability status
gh pr view <number> --json headRefName,baseRefName,title,url,mergeable,mergeStateStatus

# Fetch inline diff comments (not exposed in gh pr view comments)
gh api repos/{owner}/{repo}/pulls/<number>/comments

# Fetch top-level PR comments and review submissions
gh pr view <number> --json comments,reviews
```

> **Target Branch Rule**:
> All feature PRs in this repository MUST target `staging` (never `main`). If `baseRefName` is set to `main` or anything other than `staging`:
>
> ```bash
> gh pr edit <number> --base staging
> ```

### 2. Inspect PR Checks Before Editing

Always inspect the complete check state before changing code. Do not treat a cancelled, queued, or missing check as a code failure without evidence.

```bash
gh pr checks <number> --json name,state,bucket,link,startedAt,completedAt,workflow
```

For every failed or cancelled GitHub Actions check, inspect the associated run and job:

```bash
gh run view <run-id> --json status,conclusion,event,headSha,jobs,url
gh run view <run-id> --log
gh api repos/{owner}/{repo}/actions/jobs/<job-id> \
  --jq '{name,status,conclusion,started_at,completed_at,steps}'
```

- Identify the concrete failure from the job setup, step output, annotations, or test log.
- If logs are unavailable, report that explicitly and inspect job metadata before guessing.
- If the failure is infrastructure-only (for example a runner/setup failure) and the code is unaffected, rerun the failed workflow or failed jobs when authorized, then recheck the result.
- If the failure is caused by the PR, fix it as part of this workflow, add or update tests where appropriate, and re-run the affected checks.
- External-provider checks are not actionable through GitHub Actions; report their details URL and do not attempt provider-specific repair.

### 3. Checkout Branch & Merge Staging

Fetch the remote PR branch and check out a local tracking branch:

```bash
git fetch origin <headRefName>:pr-<number>-fix
git checkout pr-<number>-fix
```

Merge `staging` to catch up and detect any merge conflicts:

```bash
GIT_EDITOR=true git merge staging --no-edit
```

### 4. Resolve Merge Conflicts

If `git merge staging` reports conflicts (`git status` shows unmerged paths):

1. **Journal / Binder Files (`.Jules/binder.md`, `.Jules/curator.md`)**:
   - Keep entries from both `HEAD` and `staging` sequentially in chronological order under their respective date headings. Never delete or overwrite previous entries.
2. **Code Files (`.ts`, `.svelte`)**:
   - Inspect both conflict sections (`<<<<<<< HEAD` vs `>>>>>>> staging`).
   - Combine new features/fixes from `staging` with the PR's specific changes, ensuring DI seams and imports are preserved.
3. **LLM Context Files (`llms-full.txt`, `apps/web/static/llms-full.txt`)**:
   - Resolve by running `node scripts/generate-llms-full.mjs` after resolving documentation files.
4. **Mark Resolved & Stage**:
   - `git add <resolved-files>`
   - Finish merge commit: `git commit -m ":twisted_right_wards_arrows: merge: resolve merge conflicts with staging"`

### 5. Analyze & Implement Review Comment Fixes

For each review comment:

1. **Locate affected file and line**: Read around the specified hunk.
2. **Apply code / documentation / type fixes**:
   - Replace hardcoded global calls with DI interfaces (`Clock`, `IdGenerator`, structural types).
   - Fix logical bugs (e.g. mismatched entity types, unhandled async promises, re-entrancy).
   - Update stale docs/guides/LLM context (`.md`, `llms-full.txt`) when features are modified or removed.
   - Run `node scripts/generate-llms-full.mjs` if help/blog docs change.

### 6. Verification

Run targeted unit tests and workspace type checks to verify fixes and conflict resolutions:

```bash
# Run unit tests for affected files only (fast feedback)
bun --filter web test <path/to/affected.test.ts>

# Run workspace type-check
bun --filter web check

# Recheck PR status after fixes or reruns
gh pr checks <number> --watch
```

Do not declare the PR fixed while actionable failures remain. Summarize any unresolved or unavailable checks and their details URLs.

### 7. Commit with Gitmoji & Push

Commit changes using gitmoji syntax to satisfy repo `commitlint` rules:

```bash
git commit -am ":recycle: refactor: resolve PR review comments and merge conflicts"
git push origin pr-<number>-fix:<headRefName>
```

Recommended gitmojis:

- `:twisted_right_wards_arrows:` (`merge:`) - Resolving merge conflicts with staging
- `:recycle:` (`refactor:`) - Code refactoring or review comment fixes
- `:test_tube:` (`test:`) - Adding or updating unit tests
- `:memo:` (`docs:`) - Updating documentation or LLM context files
- `:bug:` (`fix:`) - Bug fixes

### 8. Notify Completion

Report back to the user with a concise summary of:

- Check failures found, their root causes, and any reruns performed
- Resolved merge conflicts (if any)
- Addressed review comments
- Passed unit test counts
- Pushed commit SHAs
