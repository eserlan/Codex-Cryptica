---
name: jules-pr-fix
description: Clean up a Jules-authored PR whose branch has accumulated unrelated commits/files from repeated staging syncs. Rebuilds the branch as staging + only the genuine change(s), then opens a replacement PR and closes the original.
metadata:
  type: workflow
---

# Jules PR Fix

Jules (google-labs-jules[bot]) branches sometimes get `staging` merged into them
repeatedly while the task is in flight. Because `staging` squash-merges every PR,
those synced-in commits land on the Jules branch with different SHAs than their
squashed counterparts on `staging` — GitHub can't dedupe them, so the PR diff shows
dozens of unrelated files and commits that are already on `staging` in substance.

Symptom: a Jules PR (title prefixed 🎨 Palette / ⚡ Bolt / 🧵 Binder / etc., or a
`gh pr view` body ending in "*PR created automatically by Jules for task
[...](https://jules.google.com/task/...)*") whose file/commit count looks way out
of proportion to what the title describes.

## Workflow

1. **Confirm the symptom, don't assume it**
   - `gh pr view <n> --json title,body,commits,files,headRefName,baseRefName`
   - Read the PR title/body to know what the *intended* change actually is.
   - If the commit/file count roughly matches the described change, this isn't the
     bug this skill fixes — stop and handle it as a normal PR.

2. **Fetch the branch into an isolated worktree** (never touch the current working
   tree or checkout over it — use `git worktree add`, e.g. under the scratchpad dir)
   - `git fetch origin <headRefName>:<local-check-branch>`
   - `git worktree add <tmp-dir> <local-check-branch>`

3. **Identify the genuine commit(s)**
   - For each commit in the PR (oldest to newest), check whether its file-level diff
     is already reflected in current `origin/<baseRefName>`:
     `git diff origin/<base> <local-check-branch> -- <file>` — empty output means
     that file is untouched relative to base (the commit touching it is stale).
   - In practice the genuine work is the most recent commit(s) whose title matches
     the PR's stated intent; everything older is sync noise. Confirm by diffing
     every file the PR claims to change — files that come back byte-identical to
     base are proof, not assumption.
   - Bot changelog files (`.jules/*.md`, `.Jules/*.md`) and version-bump files
     (`package.json` version, `bun.lock`, `service-worker.ts` cache version) are
     expected to differ trivially due to staleness — ignore them, they're not the
     "genuine" change and will resolve themselves once rebuilt from current base.

4. **Rebuild the branch**
   - In a second isolated worktree, branch fresh from `origin/<baseRefName>`.
   - `git cherry-pick <genuine-commit-sha(s)>` in order.
   - Diff the result against `origin/<baseRefName>` and confirm it matches only what
     the PR description says should change — nothing more.

5. **Decide push strategy — always ask the user first**
   - Force-pushing over a bot-authored branch to update the existing PR in place is
     a destructive rewrite of history you didn't author. Don't do it without
     explicit confirmation naming the branch.
   - Offer the alternative: push the clean commit(s) to a new branch, open a fresh
     PR referencing the original, and close the original with a comment explaining
     why (link to the replacement). This is the safer default and doesn't require
     as strong a confirmation, but still confirm before closing someone's PR.

6. **Clean up**
   - `git worktree remove` both temp worktrees, delete the local check/fix branches
     you created (`git branch -D`).

## Notes

- This is a mechanical history-cleanup, not a code review — don't second-guess the
  actual change itself here. If the genuine commit looks wrong or incomplete, flag
  it to the user instead of trying to fix the logic too.
- The same drift pattern applies to other bot-branch families with long numeric
  suffixes (`bolt/...`, `curator/...`, `palette-...`, `jules-binder-...`) — this
  skill isn't Jules-specific in mechanism, just named for the most common offender.
