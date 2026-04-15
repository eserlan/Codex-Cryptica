---
description: "Actionable, dependency-ordered tasks for the Label-Grouped Entity Explorer feature"
---

# Tasks: Label-Grouped Entity Explorer

**Input**: Design documents from `/specs/084-label-grouped-explorer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to preserve traceability between the feature request, implementation work, and validation steps.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Context)

**Purpose**: Confirm the issue scope and identify the explorer touchpoints before code changes

- [x] T001 Review GitHub Issue #606 and map the requested grouping behavior to the existing explorer workflow
- [x] T002 Inspect `apps/web/src/lib/components/explorer/EntityList.svelte` and `apps/web/src/lib/stores/ui.svelte.ts` to identify rendering and persistence touchpoints

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared explorer state required by the new grouped view

**⚠️ CRITICAL**: No grouped explorer work can ship until persisted explorer view state exists

- [x] T003 Add `explorerViewMode` state and persistence logic in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T004 Add `setExplorerViewMode` handling in `apps/web/src/lib/stores/ui.svelte.ts` for list and label modes

**Checkpoint**: Explorer mode can now be read and updated consistently across the UI

---

## Phase 3: User Story 1 - Group Explorer Results by Label (Priority: P1) 🎯 MVP

**Goal**: Let users organize the explorer into label sections while keeping existing entity actions intact

**Independent Test**: Apply labels to entities, switch to label view, and verify sections, unlabeled fallback, and repeated membership for multi-labeled entities

### Tests for User Story 1

- [x] T005 [P] [US1] Add label-grouping coverage in `apps/web/src/lib/components/explorer/EntityListGrouping.test.ts`

### Implementation for User Story 1

- [x] T006 [US1] Add derived grouped-entity computation for label mode in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T007 [US1] Add list and label view toggle controls to the explorer header in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T008 [US1] Refactor repeated entity row rendering into reusable snippets in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T009 [US1] Render label section headers and an explicit unlabeled fallback section in `apps/web/src/lib/components/explorer/EntityList.svelte`

**Checkpoint**: Label view is functional and independently testable

---

## Phase 4: User Story 2 - Keep My Preferred Explorer Layout (Priority: P2)

**Goal**: Restore the user’s last selected explorer layout after reload

**Independent Test**: Select a grouped view, reload the app, and confirm the same layout remains active

### Implementation for User Story 2

- [x] T010 [US2] Load the saved explorer view preference from `localStorage` in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T011 [US2] Persist explorer view changes back to `localStorage` in `apps/web/src/lib/stores/ui.svelte.ts`

**Checkpoint**: View preference survives page reloads

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validate grouped layouts against the existing explorer experience

- [x] T012 [P] Verify grouped views continue to honor search and category filtering in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T013 [P] Verify grouped views preserve entity selection and drag-start behavior in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T014 Validate grouped explorer controls across default and fantasy themes in `apps/web/src/lib/components/explorer/EntityList.svelte`
- [x] T015 Run feature-level validation using `specs/084-label-grouped-explorer/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks grouped explorer work
- **User Story 1 (Phase 3)**: Depends on persisted explorer mode state from Phase 2
- **User Story 2 (Phase 4)**: Depends on the foundational explorer state from Phase 2
- **Polish (Phase 5)**: Depends on all desired grouped views being complete

### Parallel Opportunities

- T012 and T013 can be validated in parallel after grouped rendering is complete

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational work.
2. Implement label grouping and the explorer mode controls.
3. Validate label grouping independently before wider rollout.

### Incremental Delivery

1. Persist the explorer view mode.
2. Ship label grouping as the primary requested capability.
3. Validate persistence, filtering, theme, and interaction behavior.
