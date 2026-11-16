# Codex factory runner

Run one labelled issue from the repository root:

```bash
python3 factory/bin/codex_workflow.py 1234
python3 factory/bin/codex_workflow.py 1234 --model <available-model>
python3 factory/bin/codex_workflow.py 1234 --effort high
```

Requires an authenticated Codex CLI, GitHub CLI access and the repository's
normal development dependencies. `factory/codex-routing.json` routes model and
reasoning effort by phase, review lens and intake risk. `--model` or `--effort`
overrides that setting for every phase. Claude routing names are not passed to
Codex. Queue draining and stacked-job creation are not implemented.

The initial routing is:

| Phase | Risk or lens | Model | Effort |
| --- | --- | --- | --- |
| Intake | all | `gpt-6-luna` | max |
| Spec writer, approver | low | `gpt-6-luna` | medium |
| Spec writer, approver | medium | `gpt-6-luna` | max |
| Spec writer, approver | high | `gpt-6.1-sol` | high |
| Builder | low | `gpt-6-luna` | medium |
| Builder | medium | `gpt-6-luna` | max |
| Builder | high | `gpt-6.1-sol` | high |
| Code, UX and UI reviewers | low | `gpt-6-luna` | medium |
| Code, UX and UI reviewers | medium | `gpt-6-luna` | max |
| Security reviewer | low or medium | `gpt-6-luna` | medium or max by risk |
| Code, UX, UI and security reviewers | high | `gpt-6.1-sol` | high |

The runner uses the shared `job`, `route` and `gate` scripts. It runs one job
at a time, with up to three independent reviewers, then creates a ready PR
only after validation and reviews pass. It never merges or deploys. The code
reviewer is instructed to apply the Codex specialist review skill.

Builder sessions survive runner restarts. Each phase log records its routed
model and reasoning effort along with JSON events, token usage and errors; the
builder session ID is saved under the ignored job's `codex/` folder.
`job costs` prices Codex token usage at OpenAI's public Standard API list rates
recorded in `codex-routing.json`; this is an API-equivalent estimate, not a
Codex subscription charge. It uses short-context rates and the published 12h
cache-write rate where the usage record does not identify cache-write TTL.
Prompts over 272K tokens can cost more, so the estimate may be low for those
requests. Tool fees and subscription billing are not included.
Resumed sessions are priced by usage deltas. If a model has no configured
price, its tokens remain visible and the total is marked partial with `+`.

Each agent sees job artefacts read-only and writes one requested result to an
isolated temporary file; the host runner imports that file after completion.
Only the builder can edit the job worktree. Every role can read linked-worktree
Git metadata for branch and diff inspection, but it remains read-only. Intake
runs before its branch exists, so it gets a disposable read-only snapshot of the
base. Other host paths are unavailable.

Before building and before publishing, the runner seeds a checkout-local Bun
cache at `.worktrees/.codex-bun-cache` from validated job manifests and
lockfiles, with lifecycle scripts disabled and package sources restricted to
the npm registry. The isolated sandbox installs dependencies into the job
worktree from that read-only cache, with network and user-level package caches
disabled. The runner ignores user Codex config so agents do not inherit
personal MCP servers. Shell credentials are filtered and network access is
disabled. Fallow audits and the repository gate also run in a credential-free,
network-disabled Codex sandbox. After a builder reports READY, the host runner
stages explicit changed paths, commits and pushes with all Git hooks disabled.

Before each Fallow audit, the runner creates a disposable standalone clone of
the job branch, overlays any uncommitted changes, and fetches `origin/<base>`
from the runner's checkout into the clone. Fallow can create its comparison
worktree inside this clone without write access to the real repository's Git
metadata. After a successful publish, the runner records the audited HEAD and
base SHAs. The gate skips its duplicate Fallow step only while that evidence
matches the clean job worktree; resumed jobs with missing or stale evidence
are audited again.

New PRs receive the configured `needs-human` label at creation. The label stays
on a PR during feedback and rebuild rounds, and the runner reapplies it before
resuming an existing PR. An approver failure or runner restart therefore
leaves review bots blocked from merging.

A checkout-level lock prevents concurrent Codex runners. It does not lock out
Claude or Gemini: never drive the same job from multiple runtimes concurrently.
After an agent/process failure, inspect logs and rerun the same issue. Human
waiting states follow the existing feedback and author-reply mechanisms.

The shared build-to-gate transition permits a pushed, clean branch without a
PR so Codex can honour the repository's pre-PR quality gate. Existing runtimes
can continue supplying a PR at that transition.

Tests (no live agents or GitHub mutations):

```bash
python3 -m unittest discover -s factory/tests -v
```
