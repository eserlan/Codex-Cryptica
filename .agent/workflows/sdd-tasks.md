---
description: Generate an actionable, dependency-ordered tasks.md for the feature based on available design artifacts.
---

# SDD Tasks

## User Input

Any specific guidance from user ($ARGUMENTS).

## Outline

1. **Setup**: Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root.
   - Parse `FEATURE_DIR` and `AVAILABLE_DOCS` list from JSON output.

2. **Load design documents**: Read from `FEATURE_DIR`:
   - **Required**: `plan.md`, `spec.md`
   - **Optional**: `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

3. **Execute task generation workflow**:
   - Load `plan.md` and extract tech stack, libraries, project structure
   - Load `spec.md` and extract user stories with their priorities (P1, P2, P3, etc.)
   - If `data-model.md` exists: Extract entities and map to user stories
   - If `contracts/` exists: Map endpoints to user stories
   - If `research.md` exists: Extract decisions for setup tasks
   - Generate tasks organized by user story (see Task Generation Rules below)
   - Generate dependency graph showing user story completion order
   - Create parallel execution examples per user story
   - Validate task completeness

4. **Generate tasks.md**: Use `.specify/templates/tasks-template.md` as structure (if available, otherwise standard format), fill with:
   - Correct feature name from `plan.md`
   - Phase 1: Setup tasks (project initialization)
   - Phase 2: Foundational tasks (blocking prerequisites for all user stories)
   - Phase 3+: One phase per user story (in priority order from `spec.md`)
   - Each phase includes: story goal, independent test criteria, tests, implementation tasks
   - Final Phase: Polish & cross-cutting concerns
   - All tasks must follow the strict checklist format (see below)
   - Clear file paths for each task

5. **Report**: Output path to generated `tasks.md` and summary.

## Task Generation Rules

### Checklist Format (REQUIRED)

Every task MUST strictly follow this format:

```text
- [ ] [TaskID] [P?] [Story?] Description with file path
```

**Format Components**:

1. **Checkbox**: ALWAYS start with `- [ ]`
2. **Task ID**: Sequential number (T001, T002...)
3. **[P] marker**: Include ONLY if task is parallelizable
4. **[Story] label**: REQUIRED for user story phase tasks only ([US1], [US2]...)
5. **Description**: Clear action with exact file path

**Examples**:

- `- [ ] T001 Create project structure per implementation plan`
- `- [ ] T012 [P] [US1] Create User model in src/models/user.py`

### Task Organization

1. **From User Stories (spec.md)** - PRIMARY ORGANIZATION.
2. **From Contracts**: Map endpoints to stories.
3. **From Data Model**: Map entities to stories.
4. **From Setup/Infrastructure**: Phase 1 & 2.
