---
description: Perform a meticulous Codex-Cryptica code review of the current branch changes.
---

# Specialist Code Review

Read the repository's `code-review` skill first, then its `codex-review` skill,
and review the requested diff. If no arguments are provided, inspect the current
branch against its upstream base with sufficient context around each changed hunk.

The generic pass must cover changed behaviour, state/error/cancellation paths,
trust/security boundaries, data compatibility, operational scaling, and focused
validation. The project pass must then cover:

- Svelte 5 reactivity, component mount hierarchy vs navigation tabs, async race guards,
  accessibility, multi-theme optical contrast, Iconify usage, and explicit button semantics.
- Worker safety, especially accidental Svelte rune imports into worker bundles.
- Oracle/AI parser strictness, worker proxy bindings, domain fact accuracy, and untrusted
  Markdown sanitization (forbidding remote image tracking under Constitution IV).
- Privacy, credential exposure, persistence boundaries, and API validation.
- Performance issues such as Canvas 2D 60 FPS compositing budgets, adversarial premise
  inversion on optimizations, redundant writes, and bounded loops.
- Test completeness: explicit assertions for new config keys, storage fields, and timers,
  plus project constitution, style guide, and documentation requirements.

Output only actionable attention items. For every item include severity,
file/line, impact, and a concrete code proposal or exact remediation. Do not
include praise, filler, or a list of code that is already correct.

Keep generic and Codex-Cryptica-specific findings distinguishable in the report.

After the review and any fixes, print this exact machine-readable block:

```text
DEV_AGENTS_REVIEW_REPORT_BEGIN
FINDINGS: <short human-readable summary, or none>
FIXES: <short human-readable summary, or none>
REPORT_JSON: {"verdict":"clean|findings","findings":[],"categories_checked":[],"validation":[],"fixes":[]}
DEV_AGENTS_REVIEW_REPORT_END
```

## User Input

```text
$ARGUMENTS
```
