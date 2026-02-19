---
description: "Task list for Implement theme-based UI jargon/terminology implementation"
---

# Tasks: Theme-Based UI Jargon

**Input**: Design documents from `/specs/049-theme-based-jargon/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Define `JargonMap` type and `JargonResolver` signature in `packages/schema/src/jargon.ts`
- [x] T002 Update `packages/schema/src/index.ts` to export new jargon types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update `StylingTemplateSchema` in `packages/schema/src/theme.ts` to include the optional `jargon` field
- [x] T004 Define the `DEFAULT_JARGON` set in `packages/schema/src/theme.ts` (using standard terminology as the baseline)
- [x] T005 Update all existing themes in `packages/schema/src/theme.ts` to satisfy the updated schema (even if jargon is initially empty)
- [x] T006 Implement the `resolveJargon` helper function in `apps/web/src/lib/stores/theme.svelte.ts`
- [x] T007 [P] Create unit tests for jargon resolution and pluralization logic in `apps/web/src/lib/stores/theme.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Immersion through Terminology (Priority: P1) 🎯 MVP

**Goal**: Replace static "Notes" and "Vault" labels with atmospheric counterparts.

**Independent Test**: Switch between Fantasy and Sci-Fi themes and verify that primary collection labels (e.g., "Chronicles" vs "Data Logs") update correctly.

### Implementation for User Story 1

- [x] T008 [P] [US1] Add Fantasy-specific jargon (vault, entity, entity_plural) to the `fantasy` theme in `packages/schema/src/theme.ts`
- [x] T009 [P] [US1] Add Sci-Fi-specific jargon (vault, entity, entity_plural) to the `scifi` theme in `packages/schema/src/theme.ts`
- [x] T010 [US1] Update `apps/web/src/lib/components/VaultControls.svelte` to use `themeStore.resolveJargon` for the main title and entity counters
- [x] T011 [US1] Update `apps/web/src/lib/components/layout/MobileMenu.svelte` to use dynamic jargon labels
- [x] T012 [US1] Update `apps/web/src/routes/+page.svelte` to ensure the landing page/workspace transitions use the correct terminology

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Contextual Action Labels (Priority: P2)

**Goal**: Update action buttons (Save, Delete, New) to use theme-appropriate language.

**Independent Test**: Verify that the "Save" button says "Inscribe" in Fantasy and "Upload" or "Sync" in Sci-Fi.

### Implementation for User Story 2

- [x] T013 [P] [US2] Expand `JargonMap` in `packages/schema/src/theme.ts` with action keys (`save`, `delete`, `new`, `syncing`)
- [x] T014 [P] [US2] Populate action jargon for `fantasy`, `scifi`, and `horror` themes in `packages/schema/src/theme.ts`
- [x] T015 [US2] Update `apps/web/src/lib/components/MarkdownEditor.svelte` to use dynamic "Save" and "Delete" jargon
- [x] T016 [US2] Update `apps/web/src/lib/components/oracle/MergeWizard.svelte` to use theme-aware action labels
- [x] T017 [US2] Update `apps/web/src/lib/components/settings/CloudStatus.svelte` to use the `syncing` jargon token

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Horror Theme Specialized Terminology (Priority: P3)

**Goal**: Implement "Blood & Noir" specific jargon for a more atmospheric experience.

**Independent Test**: Switch to the Horror theme and verify actions like delete use terms like "Banish" or "Exterminate".

### Implementation for User Story 3

- [x] T018 [US3] Finalize and add specialized jargon tokens for the `horror` theme in `packages/schema/src/theme.ts`
- [x] T019 [US3] Verify Horror jargon is correctly applied in `apps/web/src/lib/components/dialogs/MergeNodesDialog.svelte`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T020 [P] Update `apps/web/tests/themes.spec.ts` to include assertions for jargon changes
- [x] T021 [P] Update `apps/web/src/lib/config/help-content.ts` to mention the new atmospheric terminology feature
- [x] T022 Final code cleanup and verification of `quickstart.md` examples

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2).
- **User Story 2 (P2)**: Can start after Phase 2.
- **User Story 3 (P3)**: Can start after Phase 2.

### Parallel Opportunities

- T001 and T007 can start together.
- T008 and T009 (Theme data additions) can run in parallel.
- T013 and T014 can run in parallel.
- Once the foundational `resolveJargon` helper is in place, US1, US2, and US3 UI work can theoretically proceed in parallel if the data is populated.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational (T001-T007).
2. Complete US1 (T008-T012).
3. **VALIDATE**: Ensure the "Vault" title and "Notes" labels change when switching themes.

### Incremental Delivery

1. Add User Story 2 (Actions) once MVP is verified.
2. Add User Story 3 (Horror specialization) as a final aesthetic polish.

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each task or logical group (e.g., after updating each theme's data).
- Stop at US1 completion to validate the core mechanism.
