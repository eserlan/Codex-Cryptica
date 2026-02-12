---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

# SDD Implement

## User Input

Any guidance ($ARGUMENTS).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root.
   - Parse `FEATURE_DIR` and `AVAILABLE_DOCS` (including `tasks.md`).

2. **Check checklists status**:
   - Check `FEATURE_DIR/checklists/*.md`.
   - If any incomplete, warn user. If stuck, ask user to proceed.

3. Load and analyze the implementation context:
   - **REQUIRED**: Read `tasks.md`.
   - **REQUIRED**: Read `plan.md`.
   - Read other docs (`spec.md`, `data-model.md`) as needed.

4. **Project Setup Verification**:
   - Check `.gitignore` (and others) against `plan.md` tech stack.
   - Run `git rev-parse --git-dir` to check git.

5. Parse `tasks.md` structure and extract:
   - Tasks, Phases, Dependencies.

6. Execute implementation following the task plan:
   - **Phase-by-phase execution**.
   - **Sequential**: Run T001, then T002...
   - **TDD**: Write tests before code if tests are specified in tasks.
   - **Validation**: Verify each phase completion.
   - **Mark as Done**: After completing a task, update `tasks.md` marking it `[x]`.

7. Implementation execution rules:
   - Setup first.
   - Tests before code.
   - Report progress after each task.

8. Completion validation:
   - Verify all required tasks are completed.
   - Report final status.
