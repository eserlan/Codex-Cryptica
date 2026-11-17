---
name: factory
description: Run one explicitly selected Codex Cryptica factory issue with Codex CLI, or inspect its status.
---

# Codex factory

For `/factory run <issue-number>`, run from the checkout root:

```bash
python3 factory/bin/codex_workflow.py <issue-number>
```

The runner selects model and reasoning effort from `factory/codex-routing.json`.
Use `--model <model>` or `--effort <level>` only when the user requests a
global override. The runner reuses shared job scripts and role prompts,
resumes builder sessions, runs explicit gates and parallel specialist reviews,
and creates a ready PR after checks and reviews pass. Every job ends with a
human handoff; never merge or deploy.

Bare `/factory run` does not drain the queue in this first version. Ask which
issue to run. For status, use `factory/bin/job summary` and read job artefacts.
Do not edit `job.json` or bypass refused transitions. Do not run another runtime
against the same job while this runner is active.

The runner syncs the job before each start so a stacked child follows its
parent's merged base. Agent failures stop the runner with logs in
`factory/jobs/<id>/codex/`; rerun the same issue to continue. Blocked jobs
require the existing `job feedback` or author-reply flow before resuming.

Codex agents see job artefacts read-only and return one requested result through
an isolated temporary file. Only the builder edits the job worktree; linked Git
metadata stays read-only for every role. Fallow snapshot audits run in credential-free, network-disabled Codex sandboxes. Fallow runs in a
disposable standalone clone with the job's uncommitted changes overlaid and its
base ref fetched explicitly, so the audit can create its comparison worktree
without writing to the shared Git metadata. The runner records the audited
HEAD and base SHAs after publishing, and the gate skips Fallow only while that
evidence matches the clean job worktree; resumed jobs with missing or stale
evidence are audited again. The host runner seeds a checkout-local Bun cache
from validated job manifests and lockfiles, with package lifecycle scripts
disabled and npm registry sources restricted. The sandbox installs dependencies
into the job worktree using that read-only cache, without network access or a
user's global cache. The host runner imports agent results, publishes builder
changes, and runs the gate in a credential-free, network-disabled Codex sandbox.
PRs keep the configured `needs-human`
label through feedback rounds and receive it again before a resumed phase runs.
