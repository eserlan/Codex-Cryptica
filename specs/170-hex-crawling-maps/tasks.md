# Tasks: Hex Crawling Maps

**Branch**: `feat/170-hex-crawling-maps` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Setup & Foundational Geometry (packages/map-engine)

**Purpose**: Core hexagonal geometry math, coordinate conversions, and algorithms in `packages/map-engine`.

- [x] T001 [P] [US1] Create unit tests for axial/cube math, projection, corners, distance, and neighbors in `packages/map-engine/src/hex.test.ts`
- [x] T002 [US1] Implement `packages/map-engine/src/hex.ts` with `axialToCube`, `cubeToAxial`, `cubeRound`, `hexToPoint`, `pointToHex`, `getHexCorners`, `hexDistance`, `getHexNeighbors`, `getHexRange`, `getHexLine`, `snapPointToHexCenter`, and `formatHexCoordinate`
- [x] T003 [US1] Export hex APIs and types from `packages/map-engine/src/index.ts`
- [x] T004 [US1] Verify tests in `packages/map-engine/src/hex.test.ts` pass with 100% assertions green

**Checkpoint**: Foundation ready — pure math library complete and verified.

---

## Phase 2: User Story 1 - Hex Grid Overlay & Alignment (Priority: P1) 🎯 MVP

**Goal**: Render pointy-topped and flat-topped hexagonal grids across the visible map viewport with configurable size, offset, colour, and opacity.

**Independent Test**: Load a map, select "Hex (Pointy)" or "Hex (Flat)" in grid settings, adjust cell size/offsets, and verify that crisp hexagonal lines render bounded to the viewport.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create unit tests for viewport-bounded hex rendering in `packages/map-engine/src/hex-renderer.test.ts`
- [x] T006 [US1] Implement `packages/map-engine/src/hex-renderer.ts` with viewport-bounded `drawHexGrid(...)` supporting pointy and flat orientations, line weight, colour, and opacity
- [x] T007 [US1] Update `packages/map-engine/src/renderer.ts` to extend `RenderOptions.grid.type` with `"none" | "square" | "hex-pointy" | "hex-flat"` and delegate to `drawHexGrid`
- [x] T008 [US1] Update `MapStore` (`apps/web/src/lib/stores/map.svelte.ts`) to add `gridType: "square" | "hex-pointy" | "hex-flat"` to `PersistedMapSettings` and persistence logic
- [x] T009 [US1] Update `VTTGridSettings.svelte` (`apps/web/src/lib/components/map/VTTGridSettings.svelte`) to add Grid Type radio/button options for Square, Hex (Pointy), and Hex (Flat)

**Checkpoint**: User Story 1 complete — GM can toggle and align pointy/flat hex grids on any overland map.

---

## Phase 3: User Story 2 - Hex Coordinate System & Token Snapping (Priority: P2)

**Goal**: Display axial coordinates (`01.04`, `02.04`) in hex centers and snap tokens to hex cell centers when dragged or placed.

**Independent Test**: Toggle "Show Coordinates" and confirm coordinate text appears in visible hex cells; drag a token on a hex map and confirm it snaps to the nearest hex center.

### Implementation for User Story 2

- [x] T010 [P] [US2] Update `packages/map-engine/src/hex-renderer.ts` to render centered coordinate text (`formatHexCoordinate`) when `showCoordinates` is true and zoom level provides adequate legibility ($\ge 25\text{px}$)
- [x] T011 [US2] Update `MapStore` (`apps/web/src/lib/stores/map.svelte.ts`) to add `showHexCoordinates: boolean` to `PersistedMapSettings`
- [x] T012 [US2] Update `VTTGridSettings.svelte` to include a "Show Hex Coordinates" toggle when a hex grid type is selected
- [x] T013 [US2] Update `TokenDragHandler` (`apps/web/src/lib/components/map/interactions/token-drag-handler.ts`) and `MapContextMenu.svelte` to snap token position to `snapPointToHexCenter` and scale token size to hex cell diameter when `gridType !== "square"`
- [x] T014 [US2] Add unit tests for hex token snapping in `apps/web/src/lib/components/map/interactions/token-drag-handler.test.ts` (or dedicated test)

**Checkpoint**: User Story 2 complete — hex coordinates display and tokens snap to cell centers.

---

## Phase 4: User Story 3 - Hex Fog of War Reveal & Exploration (Priority: P3)

**Goal**: Allow revealing and hiding discrete hex cells and radius of hexes on `maskCanvas` without ragged brush edges.

**Independent Test**: Enable Fog of War on a hex map, click a shrouded hex with the Hex Reveal tool, and confirm the regular hexagonal cell is cleared on `maskCanvas`.

### Implementation for User Story 3

- [x] T015 [P] [US3] Create `apps/web/src/lib/components/map/hex-fog-stroke.test.ts` testing `punchHexFogCell` and `punchHexFogRadius`
- [x] T016 [US3] Implement `apps/web/src/lib/components/map/hex-fog-stroke.ts` with `punchHexFogCell` and `punchHexFogRadius` filling 6-point hex polygon paths into 2D canvas context
- [x] T017 [US3] Integrate hex fog stamping into `MapFogPainter` (`apps/web/src/lib/components/map/map-fog-painter.ts`) when active grid is a hex grid
- [x] T018 [US3] Integrate hex radius reveal into `TokenVisionRevealer` (`apps/web/src/lib/components/map/token-vision-revealer.ts`) when on a hex grid in token vision mode

**Checkpoint**: User Story 3 complete — hexcrawl exploration with hex-shaped fog reveal works seamlessly with existing OPFS mask files and undo/redo.

---

## Phase 5: User Story 4 - Hex Distance Measurement & Travel Units (Priority: P4)

**Goal**: Ruler tool computes discrete hex distance and converts to campaign travel units (e.g. 6 miles per hex).

**Independent Test**: Drag the measurement ruler between two hexes on a hex map and confirm the label reads `${dist} hexes (${dist * gridDistance} ${gridUnit})`.

### Implementation for User Story 4

- [x] T019 [US4] Update map measurement logic (`apps/web/src/lib/components/map/` / `map-interactions.svelte.ts`) to detect hex grid and calculate distance via `hexDistance(pointToHex(start), pointToHex(end))`
- [x] T020 [US4] Format measurement label with hex count and unit conversion (e.g., `4 hexes (24 mi)`)
- [x] T021 [US4] Add unit tests for hex measurement formatting

**Checkpoint**: User Story 4 complete — overland travel distance and route measurement operational.

---

## Phase 6: User Story 5 - Hex-Linked Lore & Location Pins (Priority: P5)

**Goal**: Map pins dropped on a hex grid record axial `(q, r)` coordinates alongside Cartesian coordinates.

**Independent Test**: Drop a pin on a hex grid and verify its metadata contains `{ hexCoordinates: { q, r } }`.

### Implementation for User Story 5

- [x] T022 [US5] Update `MapPinSchema` in `packages/schema/src/map.ts` with optional `hexCoordinates: z.object({ q: z.number().int(), r: z.number().int() }).optional()`
- [x] T023 [US5] Update pin creation in `MapStore` / pin handler to compute and store `hexCoordinates` when placed on an active hex grid

**Checkpoint**: User Story 5 complete — pins record discrete hex positions.

---

## Phase 7: User Documentation & Validation (Cross-Cutting)

**Purpose**: Help system documentation and PR quality gate compliance.

- [x] T024 [US1-US5] Add user-facing Help article in `apps/web/src/lib/content/help/` explaining overland hexcrawls, hex grid settings, hex fog of war, and distance measurement (Constitution VII)
- [x] T025 [US1-US5] Register help article in `apps/web/src/lib/config/help-content.ts`
- [x] T026 Run impacted test suite: `bun run test:changed`
- [x] T027 Run changed-file linter: `bun run lint:changed`
- [x] T028 Run scoped type check: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`
- [x] T029 Run Fallow audit: `bunx fallow audit --format json --quiet --explain --gate-marker agent`
- [ ] T030 Create pull request into `staging` with release highlights and complete review report
