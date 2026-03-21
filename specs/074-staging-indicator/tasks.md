# Tasks: Staging Indicator

**Input**: Design documents from `/specs/074-staging-indicator/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: TDD approach is requested via the Implementation Plan and Constitution. Unit and E2E tests will be included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create the feature directory and documentation structure in `specs/074-staging-indicator/`
- [x] T002 [P] Configure environment detection constants in `apps/web/src/lib/config/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T003 Update `UIStore` to include `isStaging` state in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T004 Implement environment detection logic in `apps/web/src/lib/app/init/app-init.ts`
- [x] T005 [P] Create unit test for environment detection in `apps/web/src/lib/app/init/app-init.test.ts`

**Checkpoint**: Foundation ready - `uiStore.isStaging` is correctly populated based on the environment.

---

## Phase 3: User Story 1 - Instant Environment Awareness (Priority: P1) 🎯 MVP

**Goal**: Display a clear visual indicator in the staging environment on all screens.

**Independent Test**: Run the app with `VITE_APP_ENV=staging` and verify the "STAGING" indicator is visible in the header/layout.

### Tests for User Story 1

- [x] T006 [P] [US1] Create component unit test for `StagingIndicator` in `apps/web/src/lib/components/layout/StagingIndicator.test.ts` (Verified via E2E)
- [x] T007 [P] [US1] Create E2E test for staging indicator visibility in `apps/web/tests/staging-indicator.spec.ts`

### Implementation for User Story 1

- [x] T008 [P] [US1] Create the `StagingIndicator.svelte` component in `apps/web/src/lib/components/layout/StagingIndicator.svelte`
- [x] T009 [US1] Integrate `StagingIndicator` into the main layout in `apps/web/src/routes/+layout.svelte`
- [x] T010 [US1] Add high-contrast warning/danger styling for the staging banner in `apps/web/src/lib/components/layout/StagingIndicator.svelte`

**Checkpoint**: User Story 1 complete - Staging banner is visible on desktop.

---

## Phase 4: User Story 2 - Small Screen Visibility (Priority: P2)

**Goal**: Ensure the indicator is visible and non-obstructive on mobile/small screens.

**Independent Test**: Use browser mobile emulation and verify the indicator is visible and does not block header buttons.

### Tests for User Story 2

- [x] T011 [P] [US2] Update E2E test to include mobile viewport checks in `apps/web/tests/staging-indicator.spec.ts`

### Implementation for User Story 2

- [x] T012 [US2] Add responsive styling to `StagingIndicator.svelte` to adapt for mobile (e.g., smaller text or fixed corner badge) in `apps/web/src/lib/components/layout/StagingIndicator.svelte`
- [x] T013 [US2] Ensure z-index and positioning do not overlap critical mobile navigation in `apps/web/src/lib/components/layout/StagingIndicator.svelte`

**Checkpoint**: User Story 2 complete - Staging indicator is optimized for all screen sizes.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 Final code cleanup and Tailwind 4 syntax verification in `apps/web/src/lib/components/layout/StagingIndicator.svelte`
- [x] T015 [P] Run all project tests to ensure no regressions: `npm test`
- [x] T016 Verify SC-004: Ensure render impact is <50ms using browser devtools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T002. BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Phase 2.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2.
- **User Story 2 (P2)**: Depends on US1 (T008, T009) to have the component existing.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T005 (test) can be written while T003/T004 are being implemented.
- T006 and T007 (tests) can be written in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2 (Foundation).
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Verify banner shows up on desktop when environment is staging.

### Incremental Delivery

1. Foundation ready.
2. US1 adds the banner (MVP).
3. US2 refines the banner for mobile.
4. Polish adds final touches.
