---
description: Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md.
---

# SDD Analyze

## User Input

Any specific guidance ($ARGUMENTS).

## Goal

Identify inconsistencies, duplications, ambiguities, and underspecified items across `spec.md`, `plan.md`, and `tasks.md`.

## Execution Steps

1. **Initialize Analysis Context**:
   - Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root.
   - Parse JSON for `FEATURE_DIR`, `AVAILABLE_DOCS`.
   - Ensure `spec.md`, `plan.md`, and `tasks.md` exist. Abort if missing.

2. **Load Artifacts**:
   - Read `spec.md` (Requirements, Stories).
   - Read `plan.md` (Architecture, Phases).
   - Read `tasks.md` (Task IDs, Descriptions, File Paths).
   - Read `.specify/memory/constitution.md` (Principles).

3. **Analysis Passes**:

   **A. Duplication Detection**:
   - Identify near-duplicate requirements.

   **B. Ambiguity Detection**:
   - Flag vague adjectives (fast, secure) without metrics.
   - Flag unresolved placeholders (TODO, ???).

   **C. Underspecification**:
   - Requirements missing outcomes.
   - Tasks referencing undefined components.

   **D. Constitution Alignment**:
   - violations of MUST principles.

   **E. Coverage Gaps**:
   - Requirements with zero associated tasks.
   - Tasks with no mapped requirement.

   **F. Inconsistency**:
   - Terminology drift.
   - Contradictions between files.

4. **Produce Analysis Report**:
   - Output a Markdown report to the user (do not write to file).

   Structure:

   ```markdown
   ## Specification Analysis Report

   | ID  | Category    | Severity | Location(s) | Summary | Recommendation |
   | --- | ----------- | -------- | ----------- | ------- | -------------- |
   | A1  | Duplication | HIGH     | ...         | ...     | ...            |

   **Coverage Summary:**

   - Total Requirements: X
   - Total Tasks: Y
   - Coverage %: Z%
   ```

5. **Provide Next Actions**:
   - If Critical issues: Recommend resolution before implementation.
   - If Low/Medium: Suggest improvements.
   - Ask user if they want remediation suggestions.
