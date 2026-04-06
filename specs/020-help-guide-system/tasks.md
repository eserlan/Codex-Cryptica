# Tasks: Help and Guide System

**Input**: Design documents from `/specs/020-help-guide-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/stores.md

**Tests**: E2E tests are included as part of the implementation phases to verify user journeys.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create component directory `apps/web/src/lib/components/help`
- [x] T002 Initialize content configuration file `apps/web/src/lib/config/help-content.ts`
- [x] T003 [P] Add necessary lucide icons to `apps/web/src/lib/config/help-content.ts` definitions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Implement `helpStore` (Svelte 5) in `apps/web/src/stores/help.svelte.ts` with state for active tour and progress tracking
- [x] T005 Implement LocalStorage persistence logic in `apps/web/src/stores/help.svelte.ts` for completed tours and `lastSeenVersion` tracking
- [x] T006 Implement the CSS `mask-image` spotlight logic in `apps/web/src/lib/components/help/TourOverlay.svelte` with window resize event listeners
- [x] T007 [P] Create `apps/web/src/lib/components/help/GuideTooltip.svelte` for rendering tour content and navigation buttons

**Checkpoint**: Foundation ready - tour engine and persistence are in place.

---

## Phase 3: User Story 1 - Initial Onboarding Walkthrough (Priority: P1) 🎯 MVP

**Goal**: Guided tour of the primary interface (Vault, Graph, and Oracle) for new users.

**Independent Test**: Clear local storage, reload app, verify "Welcome" modal and step-by-step navigation works, then verify it doesn't reappear after completion.

### Implementation for User Story 1

- [x] T008 [US1] Define `ONBOARDING_TOUR` steps in `apps/web/src/lib/config/help-content.ts` matching existing UI selectors
- [x] T009 [US1] Add `data-testid` attributes to critical header and graph controls in `apps/web/src/routes/+layout.svelte` and `apps/web/src/lib/components/GraphView.svelte`
- [x] T010 [US1] Integrate `TourOverlay.svelte` and `GuideTooltip.svelte` into `apps/web/src/routes/+layout.svelte`
- [x] T011 [US1] Implement auto-trigger logic in `onMount` within `apps/web/src/routes/+layout.svelte` using `helpStore.init()`
- [x] T012 [US1] Create E2E test `apps/web/tests/help-onboarding.spec.ts` to verify the full tour sequence

**Checkpoint**: User Story 1 (MVP) is fully functional and testable independently.

---

## Phase 4: User Story 2 - Contextual Feature Hints (Priority: P2)

**Goal**: Non-intrusive hints for complex features like Connect Mode.

**Independent Test**: Activate Connect Mode in the Graph, verify hint appears, perform action, verify hint disappears.

### Implementation for User Story 2

- [x] T013 [P] [US2] Add hint definitions to `apps/web/src/lib/config/help-content.ts`
- [x] T014 [US2] Implement `apps/web/src/lib/components/help/FeatureHint.svelte` for small floating tips
- [x] T015 [US2] Update `helpStore` in `apps/web/src/stores/help.svelte.ts` to handle transient hint visibility
- [x] T016 [US2] Integrate `FeatureHint` trigger in `apps/web/src/lib/components/GraphView.svelte` for Connect Mode activation
- [x] T017 [US2] Add E2E test cases to `apps/web/tests/help-onboarding.spec.ts` for hint behavior

**Checkpoint**: Contextual hints now guide users during specific advanced actions.

---

## Phase 5: User Story 3 - Persistent Help Center (Priority: P3)

**Goal**: Searchable help library integrated into the Settings Modal.

**Independent Test**: Open Settings -> Help tab, search for a term, verify results appear and are readable.

### Implementation for User Story 3

- [x] T018 [US3] Define `HELP_ARTICLES` (Markdown content) in `apps/web/src/lib/config/help-content.ts`
- [x] T019 [US3] Update `apps/web/src/stores/ui.svelte.ts` and `SettingsTab` type to include "help"
- [x] T020 [US3] Implement FlexSearch indexing in `helpStore` (`apps/web/src/stores/help.svelte.ts`) for help articles
- [x] T021 [US3] Create `apps/web/src/lib/components/help/HelpTab.svelte` with search input and article list
- [x] T022 [US3] Integrate `HelpTab.svelte` into `apps/web/src/lib/components/settings/SettingsModal.svelte`
- [x] T023 [US3] Add unit tests for help article search in `apps/web/src/stores/help.test.ts`

**Checkpoint**: All user stories are now complete and functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refinements and final verification.

- [x] T024 [P] Refine transition animations for the tour spotlight and tooltips
- [x] T025 Performance optimization: Ensure `FlexSearch` indexing doesn't block the UI during settings opening
- [x] T026 **Offline Functionality Verification**: Verify that all help content and tour assets are available when disconnected from the network
- [x] T027 [P] Audit final build size of help assets to ensure compliance with SC-004
- [x] T028 Run full E2E test suite to ensure no regressions in existing features

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. Blocks US1, US2, US3.
- **User Story 1 (Phase 3)**: MVP. Can start after Phase 2.
- **User Story 2 & 3**: Can proceed after Phase 2 is complete. They are independent of each other but both integrate with the foundation.

### Parallel Opportunities

- T001-T003 can be done in parallel.
- T006 and T007 (Overlay vs Tooltip) can be done in parallel.
- US2 and US3 implementation can theoretically happen in parallel once US1's shared config changes are in place.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

The primary goal is to ship the **Onboarding Tour**. This provides the most immediate value for new users.

1. Setup and Foundational work.
2. Complete US1 (Onboarding).
3. Validate and merge.

### Incremental Delivery

After US1, US2 (Hints) and US3 (Help Center) can be added as separate increments to provide deeper documentation support.
