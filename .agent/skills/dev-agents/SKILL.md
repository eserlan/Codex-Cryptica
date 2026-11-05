---
name: dev-agents
description: Guide to the Dev-Agents GitHub review and automation system, including bot models (gpt-6-luna, claude-sonnet-5-5), states, labels (pause:fix, paused, needs-input, dev-agents-resume), claim commands, and human/external agent collaboration patterns.
metadata:
  type: reference
---

# Dev-Agents System & PR Workflow

Dev-agents is the autonomous PR review and fix agent running across pull requests in this repository. It conducts multi-model code audits (typically `gpt-6-luna` or `claude-sonnet-5-5`), posts structured finding summaries, and by default attempts automated fixes unless paused, claimed, or constrained by labels.

---

## 1. Core Models & Review Rounds

- **`gpt-6-luna` (high effort)**: Deep reasoning audit checking premise inversion, test coverage, memory/resource budgets, accessibility, and architectural consistency.
- **`claude-sonnet-5-5` (medium effort)**: Independent sanity and correctness review focusing on state transitions, regressions, and UI invariants.
- **Review Rounds**: Typically 1 to 3 rounds per PR head commit. A new push (`git push`) to the PR branch immediately invalidates previous runs and triggers a fresh review round against the new HEAD SHA.

---

## 2. Key Labels & Their Semantics

| Label                   | Description                                      | Behavior / Effect                                                                                                                                                                                                                                                               |
| :---------------------- | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`pause:fix`**         | _Dev-agents reviews this PR but does not fix it_ | **Review-Only Mode.** The bot continues auditing commits and posting review findings, but will **never** attempt automated code fixes or push fix commits. Ideal when a developer or pair-programming agent wants automated feedback without the bot racing to edit the branch. |
| **`paused`**            | _Automation paused_                              | **Completely Pauses Automation.** Automatically applied if the bot fails 4 consecutive automation/fix attempts, or manually applied to stop retries and duplicate comments. Bot will neither review nor fix while present.                                                      |
| **`needs-input`**       | _Awaiting clarification_                         | Applied when the review or fixer agent encountered an ambiguity requiring a human or contributor product/design decision rather than guessing.                                                                                                                                  |
| **`dev-agents-resume`** | _Resume signal_                                  | Used as a label toggle or command trigger to resume automation after being paused or resolving `needs-input`.                                                                                                                                                                   |

---

## 3. Claiming Review Runs

Before dev-agents starts fixing findings (it typically waits at least 60 seconds after posting a review), an external agent or developer can claim the run to pause the fixer:

```markdown
/dev-agents claim pr-review-<pr-number>-<commit-sha>
```

### Claim Rules:

- **Duration**: Claims from repository owners, members, or collaborators pause the fixer for up to **30 minutes**.
- **Fresh Head**: Pushing a new commit starts a fresh review cycle and resets the claim.
- **Attribution**: Plain comments or attribution alone do not claim the run; the exact `/dev-agents claim ...` command is required.

---

## 4. Unpausing & Resuming

When a PR has been paused (`paused` label applied) or you want to restart automated review/fix:

1. **Remove the `paused` label**:
   ```bash
   gh pr edit <pr-number> --remove-label "paused"
   ```
2. **Signal resume (optional / recommended)**:
   Post `/unpause` or `/dev-agents resume` in a PR comment:
   ```bash
   gh pr comment <pr-number> --body "/unpause"
   ```
3. **Pushing new commits**:
   Pushing any new commit to the PR branch will automatically awaken the review bot for the new HEAD.

---

## 5. Recommended Collaboration Workflow

When working with local AI coding assistants (like Antigravity / Codex) on a PR:

1. **Use `pause:fix` or Claim Promptly**:
   - If you want full control over code fixes while benefiting from bot code reviews, apply `pause:fix`:
     ```bash
     gh pr edit <pr-number> --add-label "pause:fix"
     ```
   - Alternatively, when a review lands with findings, claim the run immediately:
     ```bash
     gh pr comment <pr-number> --body "/dev-agents claim <run-id>"
     ```
2. **Address Findings Locally**:
   - Inspect the review comment body via `gh pr view <pr-number> --comments` or `gh api repos/{owner}/{repo}/issues/comments/<id>`.
   - Apply fixes, adhere to repo guidelines (Svelte 5 Runes, Tailwind 4 tokens, British English, DI patterns).
   - Add regression tests covering the defect.
3. **Validate Gates**:
   - `bun scripts/lint-changed.mjs --base origin/staging`
   - `bun scripts/test-changed.mjs --base origin/staging`
   - `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` (in `apps/web`)
   - `bunx fallow audit --base origin/staging`
4. **Push & Comment**:
   - Commit with gitmoji (`git commit -am "🐛 fix(...): ..."`) and push.
   - Comment on the PR explaining the resolution so reviewers and bot history stay clear.
