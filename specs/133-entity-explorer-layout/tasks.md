# Tasks: Entity Explorer Desktop Two-Column Layout

**Input**: Design documents from `/specs/133-entity-explorer-layout/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[UI contract](./contracts/entity-explorer-workspace.md), and
[quickstart.md](./quickstart.md)

**Tests**: Required. The project constitution requires TDD and test coverage for all
changed behavior. Add the specified tests first and verify they fail before the
corresponding implementation task.

**Organization**: Tasks are grouped by user story. Shared viewport eligibility is
implemented before story work because every story relies on it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other tasks in its phase because it changes a
  different file and has no unmet dependency.
- **[Story]**: Maps a task to the corresponding user story in `spec.md`.

## Phase 1: Setup

**Purpose**: Establish the focused test fixtures and implementation boundaries.

- [X] T001 [P] Add a reusable injectable `matchMedia` fixture for 1280px viewport transitions in `apps/web/src/lib/stores/ui/layout-ui.test.ts`.
- [X] T002 [P] Add Explorer and workspace component test files with the existing vault, modal, and embedded-reader stubs in `apps/web/src/lib/components/explorer/EntityExplorer.test.ts` and `apps/web/src/lib/components/layout/EntityExplorerWorkspace.test.ts`.

---

## Phase 2: Foundational - Desktop Workspace Eligibility

**Purpose**: Add the transient viewport signal and the one derived eligibility rule
that gates every desktop workspace behavior.

**Critical**: Complete this phase before implementing any user story.

- [X] T003 Add failing eligibility tests for 1280px media-query changes, Explorer-open state, and active-tool changes in `apps/web/src/lib/stores/ui/layout-ui.test.ts`.
- [X] T004 Implement constructor-injected 1280px viewport watching and the derived `isEntityExplorerWorkspace` eligibility predicate without changing persisted keys in `apps/web/src/lib/stores/ui/layout-ui.svelte.ts`.

**Checkpoint**: `LayoutUIStore` reports workspace eligibility only for an open, active
Explorer at `xl` width or wider.

---

## Phase 3: User Story 1 - Browse and Focus Side by Side (Priority: P1) MVP

**Goal**: At 1280px or wider, an open Entity Explorer stays beside a Zen-identical
reader/editor and lets users switch entities without losing the main workspace.

**Independent Test**: With the Explorer active at 1280px or wider, select two
entities and confirm the app renders `EmbeddedEntityView` for each selection in the
right workspace column without opening the full-screen modal.

### Tests for User Story 1

- [X] T005 [P] [US1] Add failing desktop-selection tests proving Entity Explorer calls the focused-entity flow instead of `modalUIStore.openZenMode` when workspace-eligible in `apps/web/src/lib/components/explorer/EntityExplorer.test.ts`.
- [X] T006 [P] [US1] Add failing workspace tests for the initial accessible empty state and focused `EmbeddedEntityView` rendering in `apps/web/src/lib/components/layout/EntityExplorerWorkspace.test.ts`.

### Implementation for User Story 1

- [X] T007 [US1] Route Entity Explorer list selection and its Zen action through the existing `focusEntity` flow only when `layoutUIStore.isEntityExplorerWorkspace` is true; retain the existing modal path otherwise in `apps/web/src/lib/components/explorer/EntityExplorer.svelte`.
- [X] T008 [US1] Create the bounded non-modal reader and empty-state wrapper that reuses `EmbeddedEntityView` in `apps/web/src/lib/components/layout/EntityExplorerWorkspace.svelte`.
- [X] T009 [US1] Host `EntityExplorerWorkspace` above still-mounted route children, using `focusedEntityId`, `min-w-0`, and bounded overflow in `apps/web/src/routes/(app)/+layout.svelte`.

**Checkpoint**: User Story 1 is complete when wide-screen Explorer selection swaps
the right reader/editor without a modal or route remount.

---

## Phase 4: User Story 2 - Preserve Existing Responsive Behavior (Priority: P2)

**Goal**: Viewports below 1280px continue using the existing Explorer drawer and
full-screen Zen Mode behavior.

**Independent Test**: At 1279px and below, select an Explorer entity and confirm
full-screen Zen Mode opens while no workspace overlay renders; cross the breakpoint
and confirm the overlay appears or disappears once without clipping.

### Tests for User Story 2

- [X] T010 [US2] Add below-threshold and resize-transition regression cases to `apps/web/src/lib/stores/ui/layout-ui.test.ts` for workspace eligibility changes at 1280px.
- [X] T011 [US2] Add ineligible-selection regression cases proving Entity Explorer retains `modalUIStore.openZenMode` below 1280px and when another tool is active in `apps/web/src/lib/components/explorer/EntityExplorer.test.ts`.
- [X] T012 [US2] Add app-shell workspace visibility regression cases for closed Explorer and active Oracle state in `apps/web/src/routes/(app)/layout.route.test.ts`.

**Checkpoint**: User Story 2 is complete when the split layout has no effect below
the threshold or for non-Explorer sidebars.

---

## Phase 5: User Story 3 - Return to Single-Column Focus (Priority: P3)

**Goal**: Closing the embedded reader clears only the right column, while closing the
Explorer or switching tools restores the normal single-column route.

**Independent Test**: In an eligible workspace, close the embedded Zen reader and
confirm the empty state remains with Explorer open; then close Explorer or activate
Oracle and confirm the workspace overlay disappears.

### Tests for User Story 3

- [X] T013 [US3] Add a close-flow test that verifies the embedded reader returns to the workspace empty state without opening the modal or closing the Explorer in `apps/web/src/lib/components/layout/EntityExplorerWorkspace.test.ts`.
- [X] T014 [US3] Add integration coverage for the embedded-reader close flow and threshold-crossing single-transition behavior in `apps/web/src/routes/(app)/layout.route.test.ts`.

### Implementation for User Story 3

- [X] T015 [US3] Preserve the existing `EmbeddedEntityView` close flow while ensuring the app-shell eligibility condition removes the workspace overlay when Explorer closes or another sidebar tool activates in `apps/web/src/routes/(app)/+layout.svelte`.

**Checkpoint**: All three user stories work without a new pin preference, route, or
Zen Mode implementation.

---

## Phase 6: Polish and Cross-Cutting Concerns

**Purpose**: Finish documentation, accessibility, and full verification.

- [X] T016 [P] Update the Entity Explorer article with the 1280px side-by-side workspace, empty state, and smaller-screen Zen Mode behavior in `apps/web/src/lib/config/help-content.ts`.
- [X] T017 Verify Iconify-only icons, semantic Tailwind tokens, non-modal Zen accessibility, independent pane scrolling, and no page-level horizontal overflow in `apps/web/src/lib/components/layout/EntityExplorerWorkspace.svelte` and `apps/web/src/routes/(app)/+layout.svelte`.
- [ ] T018 Run focused tests, `bun run --filter web lint:types`, `bun run --filter web lint`, and `bun run --filter web test`, recording results against `specs/133-entity-explorer-layout/quickstart.md`.
- [ ] T019 Complete the manual 1280px/1279px, persisted Explorer, entity-switching, close-state, Oracle-switching, and scrolling checks in `specs/133-entity-explorer-layout/quickstart.md`.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on T001 and blocks user-story work.
- **US1 (Phase 3)**: Depends on T004 and delivers the MVP.
- **US2 (Phase 4)**: Depends on T004 and validates the same eligibility boundary
  used by US1; it can proceed after the workspace integration is available.
- **US3 (Phase 5)**: Depends on the US1 workspace component and app-shell host.
- **Polish (Phase 6)**: Depends on all desired user-story phases.

### User Story Dependencies

- **US1 (P1)**: Requires only the foundational eligibility state.
- **US2 (P2)**: Reuses the foundational state and validates the fallback branch in
  the Explorer selection handler.
- **US3 (P3)**: Reuses the US1 workspace component and validates its close and
  sidebar-tool transitions.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- T005 and T006 can run in parallel after T004.
- T010 and T011 touch separate store and explorer concerns and can run in parallel
  after the US1 implementation establishes the relevant components.
- T012 and T014 both touch `apps/web/src/routes/(app)/layout.route.test.ts` and should
  be sequenced.
- T016 can run in parallel with the final test and manual-verification work.

## Parallel Example: User Story 1

```text
Task: "Add desktop-selection tests in apps/web/src/lib/components/explorer/EntityExplorer.test.ts"
Task: "Add workspace empty/focused-state tests in apps/web/src/lib/components/layout/EntityExplorerWorkspace.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete T001 through T004 to establish and test the eligibility rule.
2. Complete T005 through T009 to deliver the wide-screen Explorer and embedded Zen
   reader/editor.
3. Run the focused tests and manually verify User Story 1 before proceeding.

### Incremental Delivery

1. Add the 1279px and active-tool regression coverage in T010 through T012.
2. Add close and single-column restoration coverage in T013 through T015.
3. Finish help, accessibility, automated verification, and manual checks in T016
   through T019.
