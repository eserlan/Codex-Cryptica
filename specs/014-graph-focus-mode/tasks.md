# Tasks: Graph Focus Highlight

## Phase 1: Setup

- [x] T001 Register feature directory context in `specs/014-graph-focus-mode/tasks.md`

## Phase 2: Foundational Styles

- [x] T002 [P] Define `.dimmed` class style with reduced opacity (0.15) in `apps/web/src/lib/themes/graph-theme.ts`
- [x] T003 [P] Add CSS transition property for opacity to the base node and edge styles in `apps/web/src/lib/themes/graph-theme.ts`

## Phase 3: User Story 1 & 2 - Core Focus Logic [US1] [US2]

- [x] T004 [US1] Implement neighborhood selection logic inside the `cy.on('tap', 'node')` handler in `apps/web/src/lib/components/GraphView.svelte`
- [x] T005 [US1] Apply `.dimmed` class to all elements and remove it from the selected node and its immediate neighborhood in `apps/web/src/lib/components/GraphView.svelte`
- [x] T006 [US2] Implement removal of `.dimmed` class from all elements in the background `cy.on('tap')` handler in `apps/web/src/lib/components/GraphView.svelte`
- [x] T007 [US1] [US2] Create E2E test `apps/web/tests/graph-focus.spec.ts` to verify focus activation on click and deactivation on background tap

## Phase 4: User Story 3 - Interactive Navigation [US3]

- [x] T008 [US3] Ensure focus state shifts correctly when clicking a neighbor while focus mode is already active in `apps/web/src/lib/components/GraphView.svelte`
- [x] T009 [US3] Add E2E test case to `apps/web/tests/graph-focus.spec.ts` for shifting focus between neighboring nodes

## Phase 5: Polish & Robustness

- [x] T010 [P] Optimize selector performance by using `cy.batch()` for applying/removing classes in `apps/web/src/lib/components/GraphView.svelte`
- [x] T011 Handle edge case where connections are added/removed while focus is active in `apps/web/src/lib/components/GraphView.svelte`
- [x] T012 Acceptance: Offline Functionality Verification (Principle VIII)

## Dependencies

- [US1] depends on T002
- [US3] depends on [US1]
- [US2] depends on [US1]

## Implementation Strategy

1. **Infrastructure**: Add the CSS classes to the theme first.
2. **Core Feature**: Implement the neighborhood logic in the selection handler.
3. **Refinement**: Add smooth transitions and batching for performance.
4. **Verification**: E2E tests to ensure visibility states are correct.
