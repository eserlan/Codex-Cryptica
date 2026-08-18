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
`gh pr view` body ending in "_PR created automatically by Jules for task
[...](https://jules.google.com/task/...)_") whose file/commit count looks way out
of proportion to what the title describes.

## Workflow

1. **Confirm the symptom, don't assume it**
   - `gh pr view <n> --json title,body,commits,files,headRefName,baseRefName`
   - Read the PR title/body to know what the _intended_ change actually is.

1a. **Always target `staging`, never `main`**

- Jules sometimes opens PRs against `main` directly. `main` only ever receives
  work via the automated staging→main promotion pipeline (`🚀 promote:` commits)
  — a PR merging straight into `main` bypasses that pipeline and desyncs the two
  branches, which then causes exactly this skill's symptom for every _future_
  PR that diffs against a `main` that's drifted from `staging`.
- If `baseRefName` isn't `staging`, retarget it first: `gh pr edit <n> --base staging`.
  Retargeting itself may flip `mergeStateStatus` to `CONFLICTING` and inflate the
  file list — that's not a new problem, it's the same drift this skill fixes,
  now visible because you're diffing against the right branch. Proceed to step 2.
- If the commit/file count against `staging` roughly matches the described
  change, this isn't the bug this skill fixes — stop and handle it as a normal
  PR (but leave the base retargeted to `staging`).

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
   - Cherry-pick conflicts here usually mean the file was reformatted (e.g.
     prettier) or _changed again_ on `base` since the branch's parent commit —
     not necessarily that the genuine work is gone. Read the conflict before
     resolving: if `HEAD` (current base) already contains the exact same logical
     change the PR is trying to make, this isn't a rebuild anymore — see step 4a.

4a. **Check for full duplication before rebuilding**

- If `HEAD`'s side of a conflict already implements what the PR describes (not
  just a superset — the _same_ change, possibly done independently by another
  PR/bot run), the branch isn't drifted, it's obsolete. There is nothing to
  cherry-pick.
- Confirm with `git log --oneline origin/<base> -- <file>` to find the PR that
  already shipped it, then abort the rebuild (`git cherry-pick --abort`) and go
  straight to closing the original as a duplicate (skip step 5 entirely) —
  comment linking the PR that beat it there, no replacement PR needed.
- This is common when the PR was originally opened against `main` (step 1a):
  `staging` often already has a _better_ version of the same optimization that
  hasn't been promoted to `main` yet, making the whole PR redundant, not just
  drifted. Read the base's current implementation of the touched function
  before assuming the cherry-pick target is wrong — it may be the PR that's
  obsolete.

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
- This repo's `.husky/pre-push` runs the full affected-workspace test suite via
  `bun scripts/affected-workspaces.mjs`, which can run well past a 2-minute
  default command timeout on a multi-package change. Push the rebuilt branch with
  `run_in_background: true` and a longer timeout from the start rather than
  waiting for a timeout to force a retry.
- Not every bloated-looking Jules PR is drift — it can also be a straight
  duplicate of work already merged by someone/something else in the meantime.
  Rebuilding produces an empty or conflicting cherry-pick in that case; don't
  force it, just close as a duplicate (step 4a).
