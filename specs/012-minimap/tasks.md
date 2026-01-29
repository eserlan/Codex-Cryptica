# Tasks: Minimap Navigation

## Phase 1: Setup & Infrastructure
- [x] T001 Create `Minimap.svelte` component shell in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T002 Update `GraphView.svelte` to conditionally render `Minimap` when `cy` is ready in `apps/web/src/lib/components/GraphView.svelte`
- [x] T003 Create `minimap.spec.ts` for E2E testing in `apps/web/tests/minimap.spec.ts`

## Phase 2: Foundational Tasks
- [x] T004 Implement internal state management (nodes, viewport) using Svelte 5 runes in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T005 Implement `syncGraphToMinimap` function to extract node data and bounds from Cytoscape in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T006 Implement Canvas drawing loop for rendering nodes and edges in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T020 Implement `requestAnimationFrame` loop and throttling to ensure sub-16ms rendering in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T007 Implement `cy.on('viewport')` listener to update minimap viewport state in `apps/web/src/lib/components/graph/Minimap.svelte`

## Phase 3: User Story 1 - Visual Orientation [US1]
- [x] T008 [P] [US1] Implement `renderFrame` function to draw nodes on canvas with correct scaling in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T009 [P] [US1] Render viewport rectangle overlay with inverse scaling for zoom and clamp size for extreme zoom levels in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T010 [US1] Add `cy.on('add remove position')` listeners to keep minimap nodes in sync in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T011 [US1] Update `minimap.spec.ts` to verify minimap visibility and node rendering in `apps/web/tests/minimap.spec.ts`

## Phase 4: User Story 2 - Viewport Navigation [US2]
- [x] T012 [P] [US2] Implement drag event handlers (`onmousedown`, `window:onmousemove`, `window:onmouseup`) for viewport rect in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T013 [US2] Implement logic to convert drag delta to Cytoscape pan coordinates in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T014 [US2] Add E2E test for dragging the viewport rect to pan the graph in `apps/web/tests/minimap.spec.ts`

## Phase 5: User Story 3 - Jump Navigation [US3]
- [x] T015 [US3] Implement click handler on minimap background to center graph on clicked coordinates in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T016 [US3] Add E2E test for clicking minimap to jump/center view in `apps/web/tests/minimap.spec.ts`

## Phase 6: User Story 4 - Visibility Control [US4]
- [x] T017 [P] [US4] Add toggle button and collapsed state UI logic in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T018 [US4] Add CSS transition for smooth expand/collapse in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T019 [US4] Add E2E test for toggling minimap visibility in `apps/web/tests/minimap.spec.ts`

## Phase 7: Polish & Cross-Cutting
- [x] T021 Apply Tailwind styling for "Nord" theme consistency in `apps/web/src/lib/components/graph/Minimap.svelte`
- [x] T022 Acceptance: Offline Functionality Verification (Principle VIII)

## Dependencies

- [US1] depends on T004, T005, T006, T007
- [US2] depends on [US1] (Visuals must exist to navigate)
- [US3] depends on [US1] (Coordinate system must be stable)
- [US4] depends on [US1] (Can be done anytime, but logically hides the feature)

## Implementation Strategy

1. **MVP**: T001-T007 + T008-T009 (Render static graph + viewport rect).
2. **Interactive**: T010 + T012-T014 (Live sync + Dragging).
3. **Refinement**: T015-T019 (Jump nav + Toggle).
4. **Performance**: T020 (Optimization).
