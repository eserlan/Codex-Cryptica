---
description: "Task list for Interactive Campaign Mapping & Spatial Lore"
---

# Tasks: Interactive Campaign Mapping & Spatial Lore

**Input**: Design documents from `/specs/058-map-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (Geo Viz), US2 (Spatial Pins), US3 (Fog of War), US4 (Hierarchy)

---

## Phase 1: Setup (Library-First)

**Purpose**: Package initialization and basic structure in `packages/`

- [x] T001 [P] Initialize `packages/map-engine` with TypeScript and Vitest
- [x] T002 [P] Define Map and Pin interfaces in `packages/schema/src/map.ts`
- [x] T003 Export Map schemas from `packages/schema/src/index.ts`
- [x] T004 Create component directory at `apps/web/src/lib/components/map/`

---

## Phase 2: Foundational (Engine & Logic)

**Purpose**: Core infrastructure for spatial coordinate management and persistence

- [x] T005 [P] Implement coordinate conversion utilities (Image Space to Viewport Space) in `packages/map-engine/src/math.ts`
- [x] T006 [P] **[TDD]** Add unit tests for coordinate math in `packages/map-engine/tests/math.test.ts`
- [x] T007 Implement map metadata persistence (saving/loading `.codex/maps.json`) in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T008 Create `MapStore` skeleton in `apps/web/src/lib/stores/map.svelte.ts` (wraps map-engine)

---

## Phase 3: User Story 1 - Geographic Visualization (Priority: P1) 🎯 MVP

**Goal**: Render a high-resolution map image with fluid zoom and pan

- [x] T009 [P] [US1] Create base `MapView.svelte` with HTML5 Canvas element in `apps/web/src/lib/components/map/MapView.svelte`
- [x] T010 [US1] Implement high-performance zoom and pan logic in `packages/map-engine/src/renderer.ts`
- [x] T011 [US1] Implement image upload and OPFS storage logic in `apps/web/src/lib/stores/map.svelte.ts`
- [x] T012 [US1] Create Map Mode route at `apps/web/src/routes/map/+page.svelte`
- [x] T013 [US1] Add "Map Mode" button to workspace navigation in `apps/web/src/routes/+layout.svelte`

**Checkpoint**: Basic map viewing is functional.

---

## Phase 4: User Story 2 - Spatial Lore Pins (Priority: P1)

**Goal**: Drop pins on the map and link them to existing Lore entities

- [x] T014 [P] [US2] Implement `PinLayer.svelte` for rendering interactive markers in `apps/web/src/lib/components/map/PinLayer.svelte`
- [x] T015 [US2] Add double-click listener to `MapView.svelte` to trigger pin creation at specific image coordinates
- [x] T016 [US2] Create `PinLinker.svelte` modal for selecting an existing Entity to link to a pin
- [x] T017 [US2] Connect pin click events to `uiStore.openZenMode()` side-panel logic
- [x] T018 [US2] Implement pin icon resolution based on linked Entity category
- [x] T019 [US2] **[GAP]** Implement "Jump to Location" search feature that pans/zooms to a specific pin

**Checkpoint**: Map is now integrated with the knowledge base via interactive pins.

---

## Phase 5: User Story 3 - Fog of War Progression (Priority: P2)

**Goal**: Persistently mask and reveal areas of the map

- [x] T020 [P] [US3] Create `MaskLayer.svelte` using `globalCompositeOperation` for masking
- [x] T021 [US3] Implement "Brush" tool (Circular brush with adjustable radius) for GM to paint/erase fog
- [x] T022 [US3] Implement binary mask serialization and persistence in `apps/web/src/lib/stores/map.svelte.ts`
- [x] T023 [US3] Add GM/Player view toggle to the Map HUD

---

## Phase 6: User Story 4 - Hierarchical & Entity-Linked Maps (Priority: P2)

**Goal**: Navigate between nested maps linked to entities

- [x] T024 [US4] Add map attachment UI to `EntityDetailPanel.svelte` (Sub-map tab)
- [x] T025 [US4] Implement map switching logic (navigation stack) in `MapStore` to support "Diving"
- [x] T026 [US4] Add "Enter Location" action to pins linked to entities that have their own sub-maps

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T027 [P] Implement tactical grid overlay (Hex/Square) in `packages/map-engine/src/renderer.ts`
- [x] T028 [P] Create Map Mode user documentation in `apps/web/src/lib/content/help/map-mode.md`
- [x] T029 [P] Profile performance with 1000+ pins and optimize Canvas drawing
- [x] T030 Apply theme-specific HUD styling (Sci-Fi neon vs Fantasy parchment)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 & 2** are FOUNDATIONAL and block all user stories.
- **Phase 3 (US1)** is the MVP and must be completed before pins or masks.
- **Phase 4 (US2)** depends on US1.
- **Phase 5 (US3)** depends on US1.
- **Phase 6 (US4)** depends on US2 (for pin navigation).

### Parallel Opportunities

- T001, T002, T004 (Setup) can run in parallel.
- Documentation (T028) can be authored while implementation is in progress.
