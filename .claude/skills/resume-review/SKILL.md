---
name: resume-review
description: Check PRs labeled needs-input for your reply to a review-and-fix clarification question, then implement the answer and continue the review-and-fix pass on that item.
metadata:
  type: workflow
---

# Resume Review

Companion to `review-and-fix`. Use this after you've replied to a clarification
question the review-and-fix pass left on a PR, to pick that item back up.

## Workflow

1. **Find candidates**
   - `gh pr list --label needs-input --json number,url,title,updatedAt`
   - If a specific PR number was given, restrict to that one.

2. **Check for a reply**
   - For each candidate PR: `gh pr view <n> --json comments` (or
     `gh api repos/{owner}/{repo}/issues/<n>/comments`) and find the agent's
     original clarification comment, then check whether a comment from you
     (the repo owner, not the bot) was posted after it.
   - If no reply yet: skip this PR, leave the label as-is.

3. **Apply the answer**
   - Read your reply as the resolution to the ambiguity the original finding
     raised. Implement the fix accordingly on that branch.
   - Run the same verification step as `review-and-fix` step 5 (lint/tests for
     touched areas).

4. **Wrap up**
   - Commit and push the fix.
   - `gh pr edit <n> --remove-label needs-input`
   - Post to Discord via `scripts/discord-notify.sh`:
     `✅ resume-review on PR #<n>: applied your answer, pushed.`
   - If your reply itself raises a new ambiguity, treat it like any other
     unclear finding in `review-and-fix` step 4: comment, keep/re-add the
     `needs-input` label, and notify — don't loop indefinitely guessing.

## Notes

- This is manually triggered (e.g. "resume review on #1588") after you notice
  the Discord ping and have answered on the PR. There's no automatic polling
  wired up yet — if the manual back-and-forth becomes annoying, a scheduled
  routine (via `/schedule` or `CronCreate`) can poll `needs-input` PRs on an
  interval and invoke this skill automatically.
