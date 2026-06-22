---
description: "Task list for feature implementation"
---

# Tasks: Entity Navigation History

**Input**: Design documents from `/specs/134-entity-navigation-history/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 [P] Create store file structure in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.svelte.ts`
- [ ] T002 [P] Create test file structure in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.test.ts`
- [ ] T003 [P] Create component file structure in `apps/web/src/lib/components/layout/NavigationShortcuts.svelte`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Define `NavigationHistoryStore` class with constructor-based DI and basic `$state` arrays (`past`, `future`) in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.svelte.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Basic Forward/Backward Navigation (Priority: P1) 🎯 MVP

**Goal**: Users can seamlessly navigate backward and forward through entities they have opened in the current session without manually searching.

**Independent Test**: Can be fully tested by opening multiple entities and triggering the `back()` and `forward()` methods on the store.

### Tests for User Story 1 ⚠️

- [ ] T005 [US1] Write unit tests for store `push`, `back`, `forward`, duplicate prevention, and 50-item limit in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.test.ts`

### Implementation for User Story 1

- [ ] T006 [US1] Implement `push(entityId)` to record entity, prevent consecutive duplicates, enforce 50-item max size, and truncate future stack in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.svelte.ts`
- [ ] T007 [US1] Implement `back()` to pop from past and push to future in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.svelte.ts`
- [ ] T008 [US1] Implement `forward()` to pop from future and push to past in `apps/web/src/lib/stores/navigation/NavigationHistoryStore.svelte.ts`
- [ ] T009 [US1] Integrate `NavigationHistoryStore.push` into global entity loading/opening flow (e.g. within `apps/web/src/lib/stores/oracle/ui.svelte.ts` or relevant manager)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently at the store logic level.

---

## Phase 4: User Story 2 - Keyboard Shortcuts (Priority: P2)

**Goal**: Users can use keyboard shortcuts (`Shift + Left/Right Arrow`) to navigate the entity history without using the mouse, safely disabled in modals or inputs.

**Independent Test**: Can be tested independently by using the keyboard shortcuts while entities are open.

### Tests for User Story 2 ⚠️

- [ ] T010_TEST [US2] Write unit tests for `NavigationShortcuts.svelte` verifying input and modal guards in `apps/web/src/lib/components/layout/NavigationShortcuts.test.ts`

### Implementation for User Story 2

- [ ] T010 [US2] Implement global `<svelte:window>` keydown listener in `apps/web/src/lib/components/layout/NavigationShortcuts.svelte`
- [ ] T011 [US2] Add guard in `NavigationShortcuts.svelte` to ignore shortcuts if `document.activeElement` is an input, textarea, or contenteditable.
- [ ] T012 [US2] Add guard in `NavigationShortcuts.svelte` to ignore shortcuts if any modal is open (except Zen Mode).

---

### Phase 4: UI integration and Keyboard Shortcuts

- [x] T009: Integrate `NavigationHistoryStore.push` into global entity loading/opening flow.
- [x] T010: Implement global `<svelte:window>` keydown listener in `NavigationShortcuts.svelte` component.
- [x] T010_TEST: Write component-level unit tests for keyboard shortcuts to verify modifier rejection, input/textarea guards, and correct integration with `NavigationHistoryStore` and DOM boundaries.
- [x] T011: Add guard against active focus in inputs/textareas (`document.activeElement`).
- [x] T012: Add guard against open modals/overlays (unless Zen Mode).
- [x] T013: Instantiate `NavigationShortcuts.svelte` in `apps/web/src/routes/(app)/+layout.svelte` so it runs across the entire app.

### Phase 5: State Consistency and Error Prevention

- [x] T014: Update `forward()` to verify entity existence in Vault.
- [x] T015: Update `back()` to verify entity existence in Vault, skipping missing entries silently.
- [x] T016: Intercept browser history events (popstate) or hook into SvelteKit `beforeNavigate` to trigger unsaved changes guard, AND explicitly fallback to normal browser navigation if history stack is exhausted.
- [ ] T017 [US3] Ensure active entity state synchronizes automatically with Entity Explorer (via existing reactivity when active entity ID changes).

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T018 Run `pnpm test` and `pnpm lint` to verify all components and stores pass.
- [ ] T019 Update `apps/web/src/lib/config/help-content.ts` with user documentation for keyboard shortcuts.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (needs the store methods to bind shortcuts to).
- **User Story 3 (P3)**: Depends on US1 (needs the store methods to add skipping logic).

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Testing tasks can run before their implementation tasks within each user story.

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Store Logic) → Test independently → Core Navigation Store Complete
3. Add User Story 2 (Shortcuts UI) → Test independently → Keyboard Navigation Complete
4. Add User Story 3 (State Guards) → Test independently → State Consistency Complete
5. Each story adds value without breaking previous stories
