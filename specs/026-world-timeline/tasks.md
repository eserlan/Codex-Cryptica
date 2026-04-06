# Tasks: Graph-Native World Timeline

**Issue Reference**: [eserlan/Codex-Cryptica#50](https://github.com/eserlan/Codex-Cryptica/issues/50)  
**Input**: Design documents from `/specs/026-world-timeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup

- [x] T001 Verify 026-world-timeline branch status
- [x] T002 Update `packages/schema/src/entity.ts` with `TemporalMetadata` and `Era` types

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 [P] Update `apps/web/src/lib/utils/markdown.ts` and `vault.svelte.ts` to process temporal frontmatter
- [x] T004 [P] Implement `getTimelineLayout` pure function in `packages/graph-engine/src/layouts/timeline.ts`
- [x] T005 Add `timelineMode`, `timelineAxis`, and `timelineRange` state to `apps/web/src/lib/stores/graph.svelte.ts`

---

## Phase 3: User Story 1 - Chronological Tagging (Priority: P1)

- [x] T006 [P] [US1] Create `TemporalEditor.svelte` component for date entry
- [x] T007 [US1] Integrate `TemporalEditor` into `EntityDetailPanel.svelte`
- [x] T008 [US1] Add basic validation for numeric years in `packages/editor-core/src/validation/temporal.ts`

---

## Phase 4: User Story 2 - The Chronological Graph (Priority: P1) 🎯 MVP

- [x] T009 [P] [US2] Implement orientation toggle (Horizontal/Vertical) in `apps/web/src/lib/components/graph/TimelineControls.svelte`
- [x] T010 [US2] Connect `graphStore.applyTimelineLayout()` to Cytoscape using `preset` mode with animation
- [x] T011 [US2] Implement node "jitter" logic in layout to prevent overlap of concurrent events
- [x] T012 [US2] Ensure edges remain visible and correctly routed between time-aligned nodes

---

## Phase 5: User Story 3 - Temporal Filtering & Focal Window (Priority: P2)

- [x] T013 [US3] Implement range filtering in `graph.svelte.ts` (using `cy.filter()` or batch visibility updates)
- [ ] T014 [US3] Add "Focal Window" sliders to `TimelineControls.svelte` for live range adjustment

---

## Phase 6: User Story 4 - Visual Eras & Axis Overlays (Priority: P3)

- [ ] T015 [US4] Implement "Timeline Ruler" overlay using a custom canvas layer in `packages/graph-engine/src/renderer/overlays.ts`
- [ ] T016 [US4] Implement visual "Era" backgrounds (shaded regions) on the graph canvas
- [x] T017 [US4] Create `EraEditor.svelte` for managing historical periods in settings

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T018 Optimize layout recalculation for large vaults (500+ nodes)
- [ ] T019 Add "Timeline" indicator to graph status bar
- [ ] T020 [P] Implement unit tests for coordinate mapping in `packages/graph-engine/tests/timeline.test.ts`
- [x] T021 Add Playwright E2E test for "Toggle Timeline -> Verify Positions" flow
- [x] T022 **Offline Functionality Verification**

---

## Implementation Strategy

1. **MVP**: Focus on T004-T012. Get nodes moving into a linear line (X or Y) when toggled.
2. **Expansion**: Add range filtering (US3) and visual eras (US4).
3. **Hardening**: Performance and testing.
