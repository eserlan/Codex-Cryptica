---
name: code-review
description: Evidence-led general code review for changed behaviour, reliability, security, data, and tests.
---

# General Code Review

Use this skill for the repository-independent review pass. It is deliberately
separate from `codex-review`: start here, then apply the Codex-Cryptica-specific
patterns only where the changed code enters those boundaries.

## Scope the Review to the Change

1. Read the PR goal, the base/head diff, and the tests changed with it.
2. Trace changed values through their immediate callers, side effects, and public
   boundaries. Read enough surrounding code to establish the contract; do not
   perform an unbounded repository audit.
3. Report only defects introduced or made reachable by the change. A pre-existing
   concern belongs in a separate follow-up unless this change makes it materially worse.

## Review Angles

Apply the relevant angles below. A section that does not touch the changed code is
not a finding by itself.

### Behaviour and State

- Check normal, empty, invalid, repeated, and out-of-order inputs.
- Follow state transitions through callbacks, async completions, retries, and UI
  teardown. Look for stale writes, duplicate side effects, missed cleanup, and
  error paths that leave the user in a misleading state.
- Check interfaces at both ends of a changed call: callers, implementations,
  serialization, and returned errors must agree.

### Trust and Security Boundaries

- Treat network, import, persisted, user, and model data as untrusted until it is
  validated at the boundary.
- Check authorization and ownership before reads or mutations; never rely on a
  client-provided identifier as permission.
- Check that logs, errors, public responses, and analytics do not expose secrets,
  credentials, private content, or internal-only identifiers.

### Data and Compatibility

- Review schema changes, defaults, migrations, and rollback/partial-failure
  behaviour. Existing documents must remain readable unless there is an explicit,
  tested migration.
- Check idempotency and consistency for retries, concurrent writes, and interrupted
  work. A failed operation must not silently discard or corrupt user data.

### Performance and Operations

- Look for new unbounded loops, repeated I/O or network calls, work on hot UI paths,
  leaked listeners/resources, and retry storms.
- Require a bound, cancellation path, cache, or batching rationale whenever changed
  work scales with user data, input size, or request volume.

### Tests and Delivery

- Tests should prove the changed behaviour and the failure mode the design is meant
  to prevent. Add a focused invalid-input, error, cancellation, permission, or
  cleanup test when that boundary changed.
- Run only the repository's focused changed-file checks and affected-workspace
  validation. A broad baseline run does not replace reasoning about the diff.
- Check user-visible documentation, configuration, migration notes, and release
  impact when the change alters a public contract or workflow.

## Finding Standard

Do not report style preferences, hypothetical redesigns, or generic reminders.
Each finding must contain:

1. **Severity**: `critical`, `high`, `medium`, or `low`.
2. **Location**: a changed file and line or a precise changed-code symbol.
3. **Failure mode**: a concrete input, sequence, or boundary that fails.
4. **Impact**: what the user, data, security boundary, or operation experiences.
5. **Remediation**: an exact code change or validation needed to resolve it.

If the available evidence cannot establish a defect, identify the missing
validation as a gap instead of presenting speculation as a bug.

## Handoff to Project Review

After this general pass, read and apply `../codex-review/SKILL.md` for
Codex-Cryptica-specific architecture, Svelte, worker, AI, privacy, accessibility,
and product rules. Keep general and project-specific findings distinguishable in
the review report.
