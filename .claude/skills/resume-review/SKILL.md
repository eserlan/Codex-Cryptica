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
   - Run the same verification step as `review-and-fix` step 6 (lint/tests for
     touched areas).

4. **Wrap up**
   - Commit and push the fix.
   - If your reply itself raises a new ambiguity, treat it like any other
     unclear finding in `review-and-fix` step 5: comment, keep the
     `needs-input` label (don't remove it), and notify with a direct link to
     the new comment — don't loop indefinitely guessing:
     `⚠️ resume-review on PR #<n>: your answer raised a new question — https://github.com/<owner>/<repo>/pull/<n>#issuecomment-<id>`
   - Otherwise (your reply fully resolved it): check whether any *other*
     judgment-call findings are still open on this PR (other unanswered
     `needs-input` comments from the same `review-and-fix` pass). If none
     remain: `gh pr edit <n> --remove-label needs-input` and post
     `✅ resume-review on PR #<n>: applied your answer, pushed. needs-input cleared, ready to merge.`
     If other items are still unresolved: leave the label on and post
     `✅ resume-review on PR #<n>: applied your answer, pushed. <Y> other item(s) still need input.`

## Notes

- This skill itself is invoked automatically: `scripts/check-needs-input.sh`
  polls `needs-input` PRs for a new reply every 5 minutes via a local cron job
  (see `docs/devops/REVIEW_AND_FIX_AGENT.md`) and escalates to
  `claude -p "/resume-review"` only when it finds one — no manual trigger
  needed once you've replied. It's local-only (stops if this machine/cron
  daemon is off), by design — see that doc's "Known gaps" section.
- You can still invoke it manually (e.g. "resume review on #1588") if you
  don't want to wait for the next cron tick.
