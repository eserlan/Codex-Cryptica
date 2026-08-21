---
name: review-and-fix
description: Standalone review-and-fix pass for a branch/PR you're satisfied with. Runs codex-review, auto-fixes confident findings, and defers anything requiring a product/design judgment call back to you via a PR comment + Discord ping instead of guessing.
metadata:
  type: workflow
---

# Review and Fix

Use this when you've finished implementing something, tested it yourself, and want an
agent to do a final pass: catch remaining defects, fix the clear-cut ones, and flag
anything ambiguous rather than guessing at your intent.

This skill never opens a PR and never merges. It assumes a branch (and ideally an
existing PR) already exists for the current work.

## Workflow

1. **Resolve context**
   - Determine the current branch: `git branch --show-current`
   - Find the associated PR (if any): `gh pr view --json number,url,title` for the
     current branch. If no PR exists yet, proceed against the branch diff directly
     (`git diff <base>...HEAD`) and skip PR-comment steps until one exists.

2. **Announce start**
   - Post to Discord: `scripts/discord-notify.sh "🔍 Starting review-and-fix on PR #<n> (<branch>)"`

3. **Run the review**
   - Invoke the `codex-review` skill against the branch's changes. This already
     incorporates the general `code-review:code-review` pass and the constitution
     check — do not duplicate that logic here, just consume its findings.
   - Run it at **low effort, inline, no agent fan-out** (per `codex-review`'s own
     token-budget guidance): read the diff and touched files directly rather than
     dispatching parallel Agent tool calls. This is meant to be a fast final safety
     net on a branch already tested by hand, not an exhaustive audit. Only use a
     heavier effort level or fan out to subagents if the user explicitly asks for it.

4. **Ingest other reviewers' feedback**
   - GitHub exposes review feedback in three separate places `gh` surfaces
     differently — don't rely on `.comments` alone:
     - `gh pr view <n> --json comments` — plain top-level PR comments.
     - `gh pr view <n> --json reviews` — "Review changes" submissions (a body
       - approve/request-changes/comment state).
     - `gh api repos/{owner}/{repo}/pulls/<n>/comments` — inline comments
       anchored to a specific diff line, not exposed via `gh pr view` at all.
   - Fetch all three and filter out anything posted by this skill's own
     identity (same `gh` account posts both human replies and agent
     comments here — only exclude what _this workflow_ posted, not the
     human's own prior comments). What's left is feedback from other
     reviewers: human co-reviewers or automated bots (e.g. a
     `copilot-pull-request-reviewer` auto-review).
   - Fold each substantive point into the same candidate list as `codex-review`'s
     findings before triage — don't just rubber-stamp a bot's suggestion, verify
     it's a real, currently-applicable issue first (bot reviewers can be wrong,
     or the comment may already be stale/resolved by a later commit); skip ones
     that no longer apply without commenting on them.
   - This runs once per `review-and-fix` pass against whatever review feedback
     exists at that point — it doesn't poll for new reviews arriving later,
     that's what `resume-review`'s own escalation is for.

5. **Triage each finding**
   For every finding produced by the review (from `codex-review` or from other
   reviewers per step 4):
   - **Clear-cut defect** (concrete code proposal, no ambiguity about intent —
     e.g. a missing `isCommitting` guard, a `||` that should be `??`, a missing
     `type="button"`): apply the fix directly to the working tree.
   - **Requires a judgment call** (the fix depends on product/UX intent, could be
     addressed multiple valid ways, or touches behavior you haven't specified):
     do **not** guess. Instead:
     1. Compose a concise question describing the ambiguity and the options.
     2. `gh pr comment <n> --body "<question>"` on the PR — this prints the
        comment's URL (e.g. `https://github.com/.../pull/<n>#issuecomment-...`)
        on success; capture it.
     3. `gh pr edit <n> --add-label needs-input`
     4. Note the comment URL in the running summary for the completion
        notification — don't just note that something needs input, keep the
        direct link.
     5. Leave that specific finding unfixed and move on to the next.

6. **Verify fixes don't break anything**
   - Run the relevant checks for whatever changed (typically from `apps/web`):
     `bun run lint`, `bun run vitest run` for touched areas, and
     `node scripts/check-compiled-runes.js` if worker files were touched.
     This repo uses Bun, not pnpm/npm — `pnpm run lint` fails outright here
     ("This project is configured to use bun").
   - If a fix causes a regression, revert just that fix and treat the underlying
     finding as needing your input instead of forcing a broken fix through.

7. **Commit and push**
   - If any fixes were applied, commit them with a clear message describing what
     the review pass changed (not a generic "fix review comments").
   - Push to the existing branch. Do not force-push. Do not open or modify PR
     readiness state beyond what's described here.

8. **Clear a stale `needs-input` label, if this run resolved everything**
   - If the PR currently carries the `needs-input` label but this run found
     **zero** judgment-call findings (either there were none, or a prior
     `resume-review` already resolved the earlier ones and this pass didn't
     surface a new one): `gh pr edit <n> --remove-label needs-input`. Don't
     remove it if this run itself just added a fresh judgment-call finding —
     only clear a label that's now stale.

9. **Announce completion**
   - Post a single Discord summary via `scripts/discord-notify.sh`:
     - **Zero open judgment calls** (including the case where step 8 just
       cleared a stale label): announce it's ready to merge, not just "no
       open questions" —
       `✅ review-and-fix on PR #<n>: fixed <X> findings, pushed. needs-input cleared, ready to merge.`
       (omit "needs-input cleared" if the label was never present this run).
     - **Judgment-call findings remain**: include a direct link per item
       instead of a generic "see PR comments" — Discord auto-embeds bare
       URLs, so a plain link on its own line is enough, no markdown needed:
       ```
       ⚠️ review-and-fix on PR #<n>: fixed <X> findings, pushed. <Y> item(s) need your input:
       https://github.com/<owner>/<repo>/pull/<n>#issuecomment-<id1>
       https://github.com/<owner>/<repo>/pull/<n>#issuecomment-<id2>
       ```

## Notes

- This skill is triggered manually — you invoke it once you're satisfied with an
  implementation and have tested it yourself. It does not run on a schedule.
- To pick back up on a `needs-input` PR after you've replied, use the
  `resume-review` skill rather than re-running this one from scratch.
- Never mark a PR ready-for-review or merge as part of this skill — that decision
  stays with you.
