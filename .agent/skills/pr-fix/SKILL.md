---
name: pr-fix
description: Specialized PR review comment resolver. Fetches review comments, checks out PR branches, merges staging, resolves common conflicts, implements code/docs/test fixes with unit tests, runs type-checks, and pushes gitmoji commits.
metadata:
  type: workflow
---

# PR Fix Skill (`pr-fix`)

Use this skill when given a PR link (or PR number) that has review comments or merge conflicts needing resolution.

## Workflow Steps

### 1. Fetch PR & Review Comments

Fetch full PR metadata and review comments across all 3 GitHub endpoints:

```bash
# Get PR branch info
gh pr view <number> --json headRefName,baseRefName,title,url,mergeable

# Fetch inline diff comments (not exposed in gh pr view comments)
gh api repos/{owner}/{repo}/pulls/<number>/comments

# Fetch review summary comments
gh pr view <number> --json comments,reviews
```

### 2. Checkout & Merge Staging

Fetch the remote PR branch and check out a local tracking branch:

```bash
git fetch origin <headRefName>:pr-<number>-fix
git checkout pr-<number>-fix
```

Merge `staging` to catch up and verify mergeability:

```bash
GIT_EDITOR=true git merge staging --no-edit
```

> **Common Conflict Patterns**:
>
> - If `.Jules/binder.md` conflicts, keep both learning entries sequentially under their respective date headers.

### 3. Analyze & Implement Fixes

For each review comment:

1. **Locate affected file and line**: Read around the specified hunk.
2. **Apply code / documentation / type fixes**:
   - Replace hardcoded global calls with DI interfaces (`Clock`, `IdGenerator`, structural types).
   - Fix logical bugs (e.g. mismatched entity types, unhandled async promises, re-entrancy).
   - Update stale docs/guides/LLM context (`.md`, `llms-full.txt`) when features are modified or removed.
   - If `llms-full.txt` files need updating, run `node scripts/generate-llms-full.mjs`.

### 4. Verification

Run targeted unit tests and type checks:

```bash
# Run unit tests for affected files only (fast feedback)
bun --filter web test <path/to/affected.test.ts>

# Run workspace type-check
bun --filter web check
```

### 5. Commit with Gitmoji & Push

Commit changes using gitmoji syntax to satisfy repo `commitlint` rules:

```bash
git commit -am ":recycle: refactor: address PR review comments and update unit tests"
git push origin pr-<number>-fix:<headRefName>
```

Recommended gitmojis:

- `:recycle:` (`refactor:`) - Code refactoring or logic fixes
- `:test_tube:` (`test:`) - Adding or updating unit tests
- `:memo:` (`docs:`) - Updating documentation or LLM context files
- `:bug:` (`fix:`) - Bug fixes

### 6. Notify Completion

Report back to the user with a bulleted summary of resolved items, passed test counts, and pushed commit SHAs.
