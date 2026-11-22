# Codex factory

Open Codex in the main checkout and invoke `/factory run <issue>` for one
labelled issue or `/factory run` to drain the queue. The Codex factory skill
uses native Codex agents for the Claude factory's intake, spec, build, review
and approval roles. The shared factory commands own job state, gating and
handoff. See [the Codex factory skill](../.codex/skills/factory/SKILL.md).

Distinct jobs use separate worktrees and remain visible together on the
dashboard. Existing job records can resume from their current stage. Stop
driving a job through its previous runtime before resuming it in Codex.

The previous `factory/bin/codex_workflow.py` launcher is legacy. The native
workflow takes over through the documented skill entry point.
