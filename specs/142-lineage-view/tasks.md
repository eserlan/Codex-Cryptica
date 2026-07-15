# Tasks: Lineage View (full multi-generation family tree)

**Input**: Design documents from `/specs/142-lineage-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lineage-engine.md, quickstart.md

**Tests**: Included — Constitution II mandates TDD (Red-Green-Refactor). Test tasks precede their implementation tasks and must fail first.

**Organization**: Grouped by user story. US1 = static full-lineage chart (MVP), US2 = navigation & scale, US3 = mobile.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 from spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing `@codex/family-engine` package for reuse — no new scaffolding needed (existing workspace, no new deps).

- [ ] T001 Export the module-private helpers `toMember`, `relatedMembers`, and `isCharacter` from `packages/family-engine/src/family-tree.ts` (or move them to a new `packages/family-engine/src/member-utils.ts` imported by both modules) so `lineage.ts` reuses rather than copies them; keep all existing family-engine tests green (Constitution III DRY; bounded view untouched behaviourally)
- [ ] T002 [P] Create multi-generation test fixture builders in `packages/family-engine/src/lineage-fixtures.ts`: 5-generation direct line with partners, cadet-branch dynasty (ancestor with children by two partners), cousin-marriage double-reach, deliberate ancestry cycle, one-sided links, and a generated ~200-member dynasty (used across engine tests and SC-003)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types and the shared adjacency index every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Define lineage types per data-model.md (`LineageMember`, `LineageEdge`, `Lineage`, `BuildLineageOptions`, `PositionedLineage`) in `packages/family-engine/src/lineage.ts` and `packages/family-engine/src/lineage-layout.ts` (types only, no logic), re-export from `packages/family-engine/src/index.ts`
- [ ] T004 Implement + unit-test a single-pass family adjacency index (entityId → parents/children/partners/explicit-siblings, reading both link directions like `relatedMembers`) as an internal helper in `packages/family-engine/src/lineage.ts` — avoids O(n²) full-map scans per node (research Decision 2); tests in `packages/family-engine/src/lineage.test.ts`

**Checkpoint**: Types compile, index tested — user story implementation can begin.

---

## Phase 3: User Story 1 - See the whole dynasty at once (Priority: P1) 🎯 MVP

**Goal**: Opt-in Lineage mode in the fullscreen family dialog rendering every recorded generation (direct line + partners + collapsed sibling-branch roots) as a static generation-row chart.

**Independent Test**: Record a 5-generation chain plus partners via the existing Family tab, open fullscreen → Lineage; all five generations render on correct rows, partners beside members, second children appear as collapsed ⊞ roots (quickstart steps 1–4; SC-001, SC-002).

### Tests for User Story 1 (write first, must fail) ⚠️

- [ ] T005 [P] [US1] Failing unit tests for `buildLineage` core traversal in `packages/family-engine/src/lineage.test.ts`: all ancestor generations via `child_of`, all descendant generations via `parent_of`, partners placed at their member's generation and never traversed through (FR-004), unknown-focus single-member fallback, immediate-family parity with `buildFamilyTree` (contract guarantee 8), cycle fixture terminates with single materialisation + `secondary` edge (FR-011/SC-008), one-sided links read bidirectionally
- [ ] T006 [P] [US1] Failing unit tests for sibling branches in `packages/family-engine/src/lineage.test.ts`: other children of every direct-line member become `kind: "sibling-branch"` roots listed in `siblingBranches`, explicit `sibling_of` roots at generation 0, branch descendants traversed only when root ∈ `expandedBranches` / `"all"` (FR-003a)
- [ ] T007 [P] [US1] Failing unit tests for `layoutLineage` in `packages/family-engine/src/lineage-layout.test.ts`: one y per generation row ordered oldest-first (FR-005), no card-rectangle overlaps, partner adjacency + children centred under parent-couple midpoint, deterministic output for identical input, `collapsedIndicators` with correct `hiddenCount` (FR-008), tight `bounds` (contract guarantees 1–6)

### Implementation for User Story 1

- [ ] T008 [US1] Implement `buildLineage(focusId, entities, options)` traversal (BFS up/down over the T004 index, visited set, partners, sibling-branch roots, `expandedBranches` handling; caps deferred to US2) in `packages/family-engine/src/lineage.ts` until T005+T006 pass
- [ ] T009 [US1] Implement `layoutLineage(lineage, options)` (bottom-up subtree widths, top-down row packing, orthogonal edge polylines, collapsed indicators, bounds) in `packages/family-engine/src/lineage-layout.ts` until T007 passes
- [ ] T010 [P] [US1] Failing component tests for `LineageView` in `apps/web/src/lib/components/entity-detail/family-tree/LineageView.test.ts`: renders `lineage-card-{id}` per visible member at layout positions, SVG edges, focus card visually marked, collapsed ⊞ indicators with counts, empty state pointing to the Family tab when no family recorded (US1 scenario 4), no edit affordances (FR-013)
- [ ] T011 [US1] Implement `apps/web/src/lib/components/entity-detail/family-tree/LineageView.svelte`: static transformed layer (no pan/zoom yet), SVG edge layer + absolutely-positioned `FamilyMemberCard`s, focus highlight, empty state; props `{ focusId, entities, onOpen, onRecenter }` per contract
- [ ] T012 [US1] Add the "Family | Lineage" segmented toggle (`data-testid="family-mode-toggle"`) to the fullscreen dialog toolbar in `apps/web/src/lib/components/entity-detail/DetailFamilyTab.svelte`: rendered only in fullscreen, defaults to Family on every dialog open, Lineage mode swaps `treeBody()` for `LineageView` and hides the `EmptyFamilySlot` row and CSS-zoom buttons (FR-001/FR-013); extend `apps/web/src/lib/components/entity-detail/DetailFamilyTab.test.ts`

**Checkpoint**: Full static dynasty chart reachable in two actions from both the detail panel and zen view; bounded Family tab untouched (SC-006).

---

## Phase 4: User Story 2 - Navigate and tame a large lineage (Priority: P2)

**Goal**: Pan/zoom canvas, per-branch expand/collapse at any depth, depth-cap expanders, Expand all, re-centre.

**Independent Test**: 4+ descendant generations with multiple children per generation: pan/zoom the chart, collapse a third-generation branch (indicator shows hidden count), re-expand, Expand all from a capped render, re-centre on any member (SC-003, SC-004, SC-009).

### Tests for User Story 2 (write first, must fail) ⚠️

- [ ] T013 [P] [US2] Failing unit tests for depth caps in `packages/family-engine/src/lineage.test.ts`: `maxUp`/`maxDown` stop traversal, `truncatedUp`/`truncatedDown` report `atGeneration` + `hiddenGenerations` only when members actually exist beyond the cap, omitted caps traverse everything (FR-010/FR-010a, contract guarantee 6)
- [ ] T014 [P] [US2] Failing unit tests for pan/zoom state in `apps/web/src/lib/components/entity-detail/family-tree/pan-zoom.test.ts`: drag-pan updates viewport, wheel zoom anchors on the cursor (delegating to `getZoomViewportUpdate` from `apps/web/src/lib/components/map/map-view-helpers.ts`), two-pointer pinch scales about the midpoint, zoom clamped to min/max, `fitTo(bounds)` frames content

### Implementation for User Story 2

- [ ] T015 [US2] Implement depth-cap support in `packages/family-engine/src/lineage.ts` until T013 passes
- [ ] T016 [US2] Implement `apps/web/src/lib/components/entity-detail/family-tree/pan-zoom.svelte.ts` (viewport state + pointer/wheel/pinch handlers) and `PanZoomContainer.svelte` (pointer capture, `touch-action: none`, content clipping, transformed slot) until T014 passes
- [ ] T017 [US2] Wrap `LineageView` content in `PanZoomContainer` with initial `fitTo(bounds)` framing; viewport preserved across re-layout (expansions don't reset the camera, FR-010)
- [ ] T018 [P] [US2] Failing component tests in `apps/web/src/lib/components/entity-detail/family-tree/LineageView.test.ts`: `lineage-branch-toggle-{id}` expands/collapses a branch at depth ≥ 3 with hidden-count indicator (FR-008/SC-004), `lineage-expander-up`/`-down` raise caps stepwise, `lineage-expand-all` reveals every generation and branch in one action (FR-010a/SC-009), re-centre callback rebuilds around the new focus (FR-009)
- [ ] T019 [US2] Implement branch ⊞/⊟ toggles + `expandedBranches` state, generation expanders + `capUp`/`capDown` state (start N=3, +3 per step), and the "Show all generations" (Expand all) toolbar action in `LineageView.svelte` until T018 passes
- [ ] T020 [US2] Wire card actions in `LineageView.svelte`/`DetailFamilyTab.svelte`: re-centre sets the shared `focusId` (existing "← Back to {entity}" affordance still works), open-entity uses the existing `onNavigate` prop (FR-006/FR-009)

**Checkpoint**: Large dynasties navigable; capped initial render with full escape hatch; US1 still passes.

---

## Phase 5: User Story 3 - Use the lineage on a phone (Priority: P3)

**Goal**: Touch navigation works and the page never overflows on mobile-width screens.

**Independent Test**: Mobile-width touch viewport with a 4+ generation lineage: pinch-zoom and touch-pan work inside the canvas, cards readable/tappable zoomed in, zero horizontal overflow of the surrounding page (SC-005).

### Tests for User Story 3 (write first, must fail) ⚠️

- [ ] T021 [P] [US3] Failing touch-interaction tests in `apps/web/src/lib/components/entity-detail/family-tree/pan-zoom.test.ts`: synthetic two-pointer pinch sequence zooms about the gesture midpoint, single-pointer touch drag pans, pointercancel/pointerup cleanly ends gestures (no stuck pan state)

### Implementation for User Story 3

- [ ] T022 [US3] Harden mobile behaviour in `PanZoomContainer.svelte` + `LineageView.svelte`: `touch-action: none` on the canvas only (dialog chrome still scrollable), `overflow: hidden` clipping so the page behind never scrolls horizontally (FR-014), tap targets on cards/toggles ≥ 44px at zoom = 1, until T021 passes and quickstart step 6 verifies on a narrow viewport

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T023 [P] Add a Lineage section to the Family help entry in `apps/web/src/lib/config/help-content.ts` (Constitution VII; plain language per Constitution IX)
- [ ] T024 [P] Add a `FeatureHint` for first-time Lineage mode use ("Drag to pan, scroll or pinch to zoom, ⊞ expands a branch") following the existing FeatureHint pattern in `apps/web/src/lib` (research Decision 9)
- [ ] T025 [P] Performance guard test: ~200-member fixture from T002 — `buildLineage` + `layoutLineage` complete and produce overlap-free output within a strict time budget in `packages/family-engine/src/lineage-layout.test.ts` (SC-003)
- [ ] T026 Verify coverage: new engine modules (`lineage.ts`, `lineage-layout.ts`) ≥ 70% (Constitution X) via the repo coverage command; add missing unit tests if under
- [ ] T027 Run full gates `bun run lint && bun run test` from repo root; confirm all pre-existing family-tree tests pass unmodified (SC-006) and walk quickstart.md acceptance spot-checks (SC-001…SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 ∥ T002
- **Foundational (Phase 2)**: T003 after T001; T004 after T003 — BLOCKS all stories
- **US1 (Phase 3)**: After Phase 2. Tests T005–T007 ∥ (T005/T006 same file — coordinate or sequence); engine T008 → T009; UI T010 → T011 → T012 (T010 ∥ T008/T009)
- **US2 (Phase 4)**: After US1 (extends `lineage.ts` and `LineageView.svelte`). T013 ∥ T014 → T015/T016 → T017 → T018 → T019 → T020
- **US3 (Phase 5)**: After US2 (extends pan-zoom). T021 → T022
- **Polish (Phase 6)**: After desired stories; T023 ∥ T024 ∥ T025, then T026 → T027

### Within Each User Story

- Tests written and failing before implementation (Constitution II)
- Engine (models/traversal/layout) before UI; core render before interactions

### Parallel Opportunities

- T001 ∥ T002 (different files)
- T005, T006, T007 drafted in parallel; T007 is a different file
- T010 (component test) in parallel with T008/T009 (engine impl)
- T013 ∥ T014 (engine vs web test files); T023 ∥ T024 ∥ T025

## Parallel Example: User Story 1

```bash
# Draft failing tests together:
Task: "buildLineage traversal tests in packages/family-engine/src/lineage.test.ts"      # T005+T006
Task: "layoutLineage tests in packages/family-engine/src/lineage-layout.test.ts"        # T007
Task: "LineageView component tests in .../family-tree/LineageView.test.ts"              # T010

# Then implement sequentially against them: T008 → T009 → T011 → T012
```

## Implementation Strategy

**MVP = Phase 1 + 2 + US1 (T001–T012)**: a static, correct, view-only dynasty chart in the fullscreen dialog — independently shippable and demoable (SC-001/SC-002/SC-006/SC-008 verifiable). US2 makes it usable at scale; US3 hardens mobile. Stop and validate at every checkpoint; commit per task or logical group; `bun run lint && bun run test` before each commit (Constitution VI.3).

## Notes

- `FamilyTree.svelte` (bounded view) must never be edited by these tasks (SC-006)
- No new external dependencies anywhere (plan Technical Context)
- T005/T006 and later T013 touch the same test file — sequence them or merge when executing solo
