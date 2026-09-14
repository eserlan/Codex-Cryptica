---
description: Perform a meticulous Codex-Cryptica code review of the current branch changes.
---

# Specialist Code Review

Use the repository's `codex-review` skill and review the requested diff. If no
arguments are provided, inspect the current branch against its upstream base
with sufficient context around each changed hunk.

The review must cover:

- Svelte 5 reactivity, async race guards, accessibility, Iconify usage, and
  explicit button semantics.
- Worker safety, especially accidental Svelte rune imports into worker bundles.
- Oracle/AI parser strictness and worker proxy bindings where relevant.
- Privacy, credential exposure, persistence boundaries, and API validation.
- Performance issues such as redundant writes, unbounded work, and duplicate
  per-record counting.
- Project constitution, style guide, tests, and documentation requirements.

Output only actionable attention items. For every item include severity,
file/line, impact, and a concrete code proposal or exact remediation. Do not
include praise, filler, or a list of code that is already correct.

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
