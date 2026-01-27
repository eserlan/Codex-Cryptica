# Tasks: Mobile UX Refinement & Sync Feedback

**Input**: Design documents from `/specs/009-mobile-ux-sync-feedback/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize 009-mobile-ux-sync-feedback specification and implementation plan
- [x] T002 [P] Create directory structure at specs/009-mobile-ux-sync-feedback/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state and store infrastructure needed for responsive transitions and sync feedback

- [x] T003 [P] Implement sync-stats store for tracking synchronization state in apps/web/src/stores/sync-stats.ts
- [x] T004 [P] Update worker-bridge to propagate sync status messages in apps/web/src/lib/cloud-bridge/worker-bridge.ts

**Checkpoint**: Foundation ready - UI components can now consume real-time sync state.

---

## Phase 3: User Story 1 - Responsive Layout Access (Priority: P1) 🎯 MVP

**Goal**: Adapt application header and vault controls for mobile viewports.

**Independent Test**: Resize browser to 375px; verify "CA" logo displays and header elements wrap correctly without overflow.

### Tests for User Story 1

- [x] T005 [P] [US1] Create Playwright test for mobile header responsiveness in apps/web/tests/responsive-header.spec.ts

### Implementation for User Story 1

- [x] T006 [P] [US1] Update apps/web/src/routes/+layout.svelte to use responsive Tailwind breakpoints for the header layout.
- [x] T007 [P] [US1] Refactor apps/web/src/lib/components/VaultControls.svelte to hide labels and reduce button size on small screens.

**Checkpoint**: User Story 1 is functional - the application is now usable on mobile devices.

---

## Phase 4: User Story 2 - Real-time Sync Feedback (Priority: P1)

**Goal**: Provide clear visual indicators during cloud synchronization.

**Independent Test**: Trigger "Sync Now"; verify cloud icon pulses and "SYNCING" text appears on mobile.

### Tests for User Story 2

- [x] T008 [P] [US2] Create unit test for sync-stats store in apps/web/src/stores/sync-stats.test.ts
- [x] T009 [P] [US2] Create E2E test for sync feedback animations in apps/web/tests/sync-feedback.spec.ts

### Implementation for User Story 2

- [x] T010 [US2] Implement pulse animation and "SYNCING" status text in apps/web/src/lib/components/settings/CloudStatus.svelte.
- [x] T011 [US2] Add manual sync trigger visual confirmation (flash effect) in apps/web/src/lib/components/settings/CloudStatus.svelte.

**Checkpoint**: User Story 2 is functional - users receive immediate feedback on data persistence status.

---

## Phase 5: User Story 3 - Mobile Entity Viewing (Priority: P2)

**Goal**: Full-width entity details on small screens to optimize reading space.

**Independent Test**: Open an entity on a 375px viewport; verify panel covers 100% of the screen width.

### Implementation for User Story 3

- [x] T012 [P] [US3] Update apps/web/src/lib/components/EntityDetailPanel.svelte to use absolute full-width positioning on mobile viewports.
- [x] T013 [US3] Implement smooth slide-in transition for the detail panel on mobile in apps/web/src/lib/components/EntityDetailPanel.svelte.

**Checkpoint**: User Story 3 is functional - entity content is now easily readable on mobile.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and quality assurance.

- [x] T014 [P] Update quickstart.md with finalized verification steps.
- [ ] T015 Run final linting and type checks via `npm run check` in apps/web.
- [ ] T016 **Offline Functionality Verification** (Constitutional Requirement: Verify Service Worker caching and offline behavior).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational**: Already completed or partially implemented.
- **US1 & US2**: Both are P1 and can be implemented in parallel.
- **US3**: P2, depends on US1 layout being stable.

### User Story Dependencies

- **US1**: No external dependencies.
- **US2**: Depends on sync-stats store (T003).
- **US3**: No functional dependencies on US1/US2 logic, only layout synergy.

### Parallel Opportunities

- T006, T007, T010, T012 can all run in parallel as they target different files.
- All test tasks (T005, T008, T009) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Layout refactor (US1).
2. Validate mobile accessibility.

### Incremental Delivery

1. Foundation (Stores) -> US1 (Responsive) -> US2 (Feedback) -> US3 (Detail Panel).
