# Review-and-Fix Agent — Setup & Operation

A standalone final-review pass for branches/PRs you've already implemented and tested yourself, plus the automation that watches for your replies to its clarification questions.

## Why this exists

The dev process here is agent-orchestrated end to end: issues → branches → PRs, mostly agent-authored. But PRs aren't opened or merged unsupervised — a human tests and corrects the feature first. The remaining gap was that the _final_ review pass (lint, logic, style, race conditions, etc.) was still manual busywork that didn't actually need human judgment, except for the subset of findings that touch product/UX intent.

Design principle: **automate the mechanical part, escalate the judgment part.**

- Anything the agent is confident about, it fixes directly, no questions asked.
- Anything ambiguous (multiple valid fixes, depends on intent not yet specified), it does **not** guess — it stops and asks, via a PR comment (durable, actionable) plus a Discord ping with a direct link to that comment (so you notice without polling and don't have to go hunting for which comment needs a reply).
- Nothing is ever merged or opened as a new PR by this flow. A human stays the gate on anything that ships.

## The three skills

All three live under `.claude/skills/` and are manually invoked (`/review-and-fix`, `/resume-review`) — see [Known gaps](#known-gaps) for what isn't automated yet.

### `review-and-fix`

Run this once you're satisfied with an implementation on a branch (ideally with an open PR).

1. Resolves the current branch + associated PR via `gh pr view`.
2. Posts a Discord "starting" notification.
3. Runs `codex-review` (see below) against the branch's changes.
4. Triages every finding:
   - **Clear-cut** → fixes it directly in the working tree.
   - **Judgment call** → posts a PR comment describing the ambiguity, adds the `needs-input` label, leaves it unfixed, moves on.
5. Runs lint + the relevant test suites to verify fixes didn't regress anything. Reverts any fix that breaks something and treats it as needing input instead.
6. Commits (`Co-Authored-By: Claude`) and pushes to the existing branch — never force-pushes, never opens/merges a PR.
7. Posts a Discord completion summary (findings fixed, and whether anything is waiting on `needs-input`).

### `resume-review`

Run this after you've replied to a `needs-input` PR comment. Reads your answer, implements it, removes the `needs-input` label, pushes, and notifies Discord. Effectively continues the `review-and-fix` triage loop for the one item that was waiting on you.

### `codex-review`

The actual review logic `review-and-fix` calls into: a Codex-Cryptica-specific checklist (Svelte 5 rune/worker safety, `isCommitting` race guards, accessibility, `??` vs `||`, worker proxy wiring, constitution check against `.specify/memory/constitution.md`) layered on top of the general `code-review:code-review` pass.

**Token budget**: defaults to `code-review:code-review` at **low effort**, run **inline** in the current agent context — it does _not_ spawn parallel Agent-tool subagents (finder angles + verifiers) for a standard run. That fan-out (used at `high`/`xhigh`/`max`/`ultra`) means every subagent re-reads the diff and surrounding files cold, which multiplies token cost for what's meant to be a fast safety net on a branch you've already tested by hand, not an exhaustive audit. Only step up to a heavier effort level if you explicitly ask for a deeper pass.

## How a PR gets the `needs-input` label

There is no separate classifier — the decision happens live inside `review-and-fix` step 4, as a per-finding judgment call made in the moment by whichever model is running the review. There's no rule engine to tune; if the triage behavior needs adjusting, the fix is to edit `.claude/skills/review-and-fix/SKILL.md`'s triage criteria, or push back on a specific run's judgment.

## The cron gate (`scripts/check-needs-input.sh`)

`resume-review` isn't triggered automatically when you reply to a PR comment — something has to notice. Rather than running the full agent on a tight loop (expensive), a cheap gate script polls GitHub via `gh` and only escalates to a full `claude -p "/resume-review"` invocation when there's actually a new comment to act on.

**How it decides to escalate**: `gh pr list --label needs-input --state open --json number,comments`, then for each PR compares the ID of its latest comment against a local state file (`.claude/state/resume-review-last-seen.json`, PR number → last-seen comment ID). A new ID means you (or someone) commented since the last check → escalate. This makes each cron tick nearly free (`gh` API calls + jq, no Claude invocation) except on the tick right after you actually reply.

**Isolation**: the cron job runs from a **dedicated git worktree** (`~/proj/Codex-Arcana-cron`, tracking `chore/review-and-fix-tooling`), not your interactive working directory. Running it against your primary checkout would risk cron firing mid-branch-switch while you're doing interactive work and colliding with whatever branch happens to be checked out at that moment.

```bash
# One-time setup of the isolated worktree:
git worktree add ~/proj/Codex-Arcana-cron chore/review-and-fix-tooling
cp /path/to/main/repo/.env ~/proj/Codex-Arcana-cron/.env   # gitignored, worktrees don't inherit it
```

**Crontab entry** (installed via `crontab -e` / `crontab -l`):

```
*/5 * * * * cd /home/espen/proj/Codex-Arcana-cron && ./scripts/check-needs-input.sh >> $HOME/.claude/logs/resume-review-cron.log 2>&1
```

Every 5 minutes. Requires a cron daemon running locally (`systemctl is-active crond`) — the loop stops the moment this machine is off or the daemon isn't running; there's no cloud fallback for this piece (see [Known gaps](#known-gaps)).

**Unattended execution**: the escalation runs `claude -p "/resume-review" --dangerously-skip-permissions` — no per-tool-call approval, since cron has no TTY. This is intentional and was explicitly confirmed: `resume-review`'s own logic already bounds the blast radius (only touches PRs already labeled `needs-input`, never merges or opens PRs), so unattended execution doesn't expand what the flow is allowed to do — it just removes the human-in-the-loop _approval step_ for actions that were already scoped narrow.

### Checking cron is actually running

```bash
tail -f ~/.claude/logs/resume-review-cron.log
```

Every run — including no-op ticks — writes a heartbeat line:

```
2026-07-02T13:55:01Z check-needs-input: heartbeat, 0 needs-input PR(s) checked
```

Without this, a quiet log is ambiguous ("cron isn't firing" vs "cron is firing, nothing to do"). If you don't see a new heartbeat every 5 minutes:

```bash
crontab -l                              # confirm the entry is still installed
systemctl is-active crond               # confirm the daemon is running
cd ~/proj/Codex-Arcana-cron && ./scripts/check-needs-input.sh   # run it manually, see what breaks
```

When it does find new input, you'll see:

```
2026-07-02T14:10:00Z check-needs-input: heartbeat, 1 needs-input PR(s) checked
2026-07-02T14:10:00Z check-needs-input: new comment on PR #1588 (comment 4866...)
2026-07-02T14:10:00Z check-needs-input: escalating to resume-review
```

...followed by whatever `resume-review`'s own output is, appended to the same log.

**Known gotcha (hit during initial testing, now fixed)**: cron runs with a minimal `PATH` that doesn't include `~/.local/bin` (or nvm/volta/etc shims) — a bare `claude` call fails with `claude: command not found` even though it works fine interactively. The script references the binary via `$HOME/.local/bin/claude` (overridable with `CLAUDE_BIN`) specifically to avoid this. If you move the `claude` install location, update `CLAUDE_BIN` in the crontab entry or the script's default.

## Secrets

`DISCORD_WEBHOOK_URL` lives in a gitignored `.env` at the repo root, read by `scripts/discord-notify.sh`. Because it's gitignored, `git worktree add` does **not** carry it over — it must be copied manually into any new worktree (see setup above). If you rotate the webhook, update `.env` in both the main checkout and the cron worktree.

`gh` CLI auth: this environment has a stray `GITHUB_TOKEN` env var that breaks `gh` auth; both the cron gate script and `resume-review`/`review-and-fix` `unset GITHUB_TOKEN` before calling `gh`.

## Known gaps (deliberate, not oversights)

This is intentionally narrow-scoped right now so the "confident fix vs. escalate" triage behavior can be observed in practice before adding more autonomy:

- **`review-and-fix` itself is not triggered automatically.** The cron gate only automates the _second half_ of the loop (noticing you replied to a `needs-input` comment) — nothing currently runs `review-and-fix` automatically when a branch/PR is ready for its first pass. That's still a manual `/review-and-fix` invocation.
- **No cloud fallback.** The cron gate is local-machine-only; it stops if this machine is off. A cloud-scheduled routine (`/schedule`) was considered but rejected for now — cloud routines run in an isolated checkout with no access to local `.env` or `gh` auth, which would mean provisioning secrets in a second place.
- **No auto-triggering on PR-ready events.** E.g. running `review-and-fix` automatically when an agent marks a PR ready-for-review is a plausible next step, but hasn't been set up.

Don't add auto-polling for the first gap or event-based triggers without checking in first — the narrow scope is deliberate, not a TODO.
