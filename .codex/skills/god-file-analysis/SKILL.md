---
name: god-file-analysis
description: Analyzes repository files against Constitution Principle XIV (Bounded Responsibility), tracking god files, review triggers (>=500 lines), and critical decomposition candidates (>=800 lines).
---

# God File Analysis

This skill provides on-demand evaluation of file sizes, responsibility boundaries, and architecture health for the Codex-Cryptica project, enforcing **Constitution Principle XIV (Bounded Responsibility: No God Files)**.

## Core Principles (Constitution XIV)

1. **Responsibilities, not lines, are the measure**: A 2,000-line table of constants is fine. A 400-line component mixing view state, persistence, and keyboard handling is not. Size is a trigger to inspect, never the sole finding.
2. **Review Trigger (500 lines)**: A source file that a pull request touches, excluding tests and data-only modules, that crosses **500 lines** MUST be justified in review: name the single responsibility it still holds, or split it as part of the PR.
3. **Critical Threshold (800 lines)**: Files at or above 800 lines are critical architectural monoliths that must be prioritized for decomposition.
4. **Data Exemption**: Data modules are exempt from the size trigger (e.g., constant tables like `public-*.ts`, `silhouettes.ts`, `theme-templates.ts`, `art-direction-catalogue.ts`).
5. **No Coverage Loss**: Any decomposition MUST carry existing unit tests or gain dedicated tests for extracted units (Constitution Principle II).

## CLI Execution

To run the god file analysis locally:

```bash
# Basic run with terminal output
bun scripts/god-file-analysis.ts

# Top 15 offenders with custom thresholds
bun scripts/god-file-analysis.ts --top=15 --threshold=500 --critical-threshold=800

# Export Markdown summary and JSON report
bun scripts/god-file-analysis.ts --summary-file=god-files-summary.md --json-file=god-files-report.json
```

## Nightly Automation

The analysis runs nightly via GitHub Actions in `.github/workflows/god-file-analysis.yml` at 03:00 UTC, publishing an executive report table to `$GITHUB_STEP_SUMMARY` and preserving report artifacts.
