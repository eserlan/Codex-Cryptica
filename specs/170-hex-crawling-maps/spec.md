# Feature Specification: Hex Crawling Maps

**Feature Branch**: `feat/170-hex-crawling-maps`  
**Created**: 2026-10-05  
**Status**: Draft  
**Input**: Issue #1951: Support Hex Crawling maps with hex grid overlay, axial coordinate system, and hex fog of war

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Hex Grid Overlay & Alignment (Priority: P1)

A Game Master running a hexcrawl or wilderness exploration campaign uploads an overland map (or creates a blank map) and turns on the grid overlay. Instead of standard square cells, the GM selects a hexagonal grid (either pointy-topped or flat-topped), adjusts the hex cell size (radius / diameter in pixels) and offsets (X / Y) to match their overland map art, and sets the grid line colour and opacity.

**Why this priority**: Without rendering the hex geometry and aligning it to user maps, no other hexcrawl features (snapping, fog, distance) can function. This is the visual and mathematical foundation of the feature.

**Independent Test**: Can be tested independently by loading any map, selecting "Hex (Pointy-topped)" or "Hex (Flat-topped)" in Grid Settings, adjusting cell size and offsets, and verifying that the canvas renders crisp hexagonal grid lines matching the configuration.

**Acceptance Scenarios**:

1. **Given** an open map with grid enabled, **When** the GM chooses "Hex (Pointy)" in Grid Settings, **Then** pointy-topped hexagons (vertical columns with points facing up/down) render across the visible canvas.
2. **Given** an open map with grid enabled, **When** the GM chooses "Hex (Flat)" in Grid Settings, **Then** flat-topped hexagons (horizontal rows with flat edges on top/bottom) render across the visible canvas.
3. **Given** custom overland artwork, **When** the GM adjusts cell size, X offset, or Y offset in Grid Settings, **Then** the rendered hex grid resizes and shifts in real time to align with the underlying terrain.
4. **Given** a hex grid with visual preferences configured (colour, opacity), **When** the GM closes and reopens the map, **Then** the hex grid settings remain persisted in local vault storage.

---

### User Story 2 - Hex Coordinate System & Token Snapping (Priority: P2)

When exploring an overland map on a hex grid, the GM and players need to identify individual hexes by coordinate and snap tokens (party tokens, monster encounters, landmarks) into hex cell centers.

**Why this priority**: Navigating wilderness play requires distinct hex locations. Token snapping ensures that party position and encounters reside unambiguously within a specific hex cell rather than floating between boundaries.

**Independent Test**: Can be tested independently by toggling "Show Hex Coordinates" in Grid Settings, confirming coordinate labels appear at hex centers, and dragging a token over the grid to verify it snaps to the nearest hex center.

**Acceptance Scenarios**:

1. **Given** an active hex grid, **When** the GM enables "Show Coordinates", **Then** each visible hex cell renders its axial coordinate `(q, r)` formatted as `qq.rr` (e.g. `01.04`) centered within the cell.
2. **Given** an active hex grid, **When** a user drags and releases a token or pin, **Then** its center position snaps cleanly to the center of the nearest hex cell in image coordinates.
3. **Given** an active hex grid, **When** a token is scaled via context menu or resize handle, **Then** it sizes proportionally to the hex cell diameter.

---

### User Story 3 - Hex Fog of War Reveal & Exploration (Priority: P3)

The GM wishes to reveal an overland map hex-by-hex as the party journeys through the wilderness, or reveal a circular radius (e.g., 1 or 2 hexes around the party token).

**Why this priority**: Exploration is the core thematic loop of a hexcrawl. Hexagonal fog-of-war prevents visual spoilers of unvisited hexes while preserving the clean borders of explored territory.

**Independent Test**: Can be tested independently by enabling Fog of War on a hex map, clicking a hex cell with the hex reveal tool, and confirming the exact hexagonal polygon on the mask canvas is cleared (revealed), saving to OPFS.

**Acceptance Scenarios**:

1. **Given** a hex map with Fog of War active, **When** the GM clicks on a shrouded hex cell using the Hex Reveal tool, **Then** the exact hexagonal polygon of that cell is cleared to reveal the map underneath.
2. **Given** a hex map with Fog of War active, **When** the GM uses the Hex Hide tool on an explored hex cell, **Then** the hexagonal polygon of that cell is re-shrouded in fog.
3. **Given** a party token with a vision range configured in hexes, **When** the token moves to a new hex cell in token vision mode, **Then** all hex cells within that radius are automatically revealed.
4. **Given** revealed hex cells, **When** the map is reloaded or shared via P2P VTT, **Then** the revealed hex mask accurately reflects the persisted OPFS mask state.

---

### User Story 4 - Hex Distance Measurement & Travel Units (Priority: P4)

A GM or player uses the measurement ruler on a hex map to calculate overland travel distance, routes, and travel time.

**Why this priority**: Travel pacing (e.g. "6 miles per hex", "1 hex per travel day") is central to wilderness rulesets. Standard Euclidean pixel rulers give diagonal distortion; a hex-aware ruler accurately counts traversed hexes.

**Independent Test**: Can be tested independently by drawing a measurement line between two hexes on an active hex grid and verifying that the measurement tooltip displays the exact hex distance and converted travel unit (e.g., "4 hexes (24 miles)").

**Acceptance Scenarios**:

1. **Given** a hex grid with distance configured (e.g., 6 miles per hex), **When** a player measures a line from Hex A to Hex B, **Then** the ruler snaps along hex centers and calculates the hex distance `(|q1-q2| + |r1-r2| + |s1-s2|) / 2`.
2. **Given** a measurement between two hexes, **When** the ruler label renders, **Then** it displays both the integer hex count and the scaled distance unit (e.g., `3 hexes (18 mi)`).

---

### User Story 5 - Hex-Linked Lore & Location Pins (Priority: P5)

The GM wants to link world entities (settlements, dungeons, landmarks, wilderness encounters) to specific hex coordinates on the overland map so that clicking a hex or pin opens the linked lore note.

**Why this priority**: Connects spatial overland navigation with the campaign worldbuilding bible, fulfilling Codex Cryptica's mission of linking visual maps directly with knowledge graph entities.

**Independent Test**: Can be tested independently by dropping a Map Pin on a hex, linking it to an entity note, and confirming the pin stores both Cartesian coordinates and axial hex coordinates `(q, r)`.

**Acceptance Scenarios**:

1. **Given** an overland hex map, **When** the GM creates a map pin on a hex cell, **Then** the pin records its snapped axial coordinate `(q, r)`.
2. **Given** a pin linked to a location note, **When** inspecting the pin or map details, **Then** the hex coordinate is displayed alongside the pin label.

---

## Edge Cases

- **Extreme Zoom Levels**: When zooming far out, rendering thousands of individual hex coordinate text labels could degrade canvas frame rates. The renderer MUST automatically suppress text coordinate rendering when rendered hex pixel diameter falls below a readable threshold (e.g. < 40px).
- **Coordinate Boundary Wrap / Negative Coordinates**: Axial coordinates `(q, r)` span positive and negative integer spaces relative to the map origin/offset. Formatting MUST handle negative integers cleanly (e.g., `-01.+04` or standard `q: -1, r: 4`).
- **Non-Standard Aspect Ratios / Zero Size**: Hex size cannot be 0 or negative; minimum size MUST be enforced (e.g. >= 10px).
- **Hex Vertex vs Center Snapping**: Tokens snap to hex centers by default; pins may optionally snap to vertices or centers. Ambiguous boundary clicks must resolve deterministically via closest distance.
- **Switching Between Square and Hex Grids**: Switching an existing map with fog from square to hex MUST preserve existing revealed areas on the underlying bitmap mask canvas without corrupting the mask file.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `packages/map-engine` MUST provide pure mathematical utilities for hexagonal geometry:
  - Axial `(q, r)` and cube `(x, y, z)` coordinate conversions (`x + y + z = 0`).
  - Screen/pixel to hex conversion (`pointToHex`) for both pointy-topped and flat-topped orientations.
  - Hex to screen/pixel conversion (`hexToPoint`) returning the center point of the hex.
  - Calculation of 6 polygon corner vertices for any given hex center and orientation.
  - Hex distance algorithm: `max(|x1-x2|, |y1-y2|, |z1-z2|)` or `(|q1-q2| + |r1-r2| + |s1-s2|) / 2`.
  - Hex neighbors and range/spiral algorithms for radius calculations.
- **FR-002**: `packages/map-engine`'s `renderMap` MUST support `grid.type`: `"none" | "square" | "hex-pointy" | "hex-flat"`.
- **FR-003**: The hex grid renderer MUST render crisp hexagonal lines with configurable colour, opacity, and line weight without creating memory leaks or unnecessary canvas pattern recreations.
- **FR-004**: The hex grid renderer MUST optionally render hex coordinate labels inside hex centers, suppressed when zoomed out too far for legibility.
- **FR-005**: `MapStore` (`apps/web/src/lib/stores/map.svelte.ts`) MUST extend `PersistedMapSettings` with:
  - `gridType`: `"square" | "hex-pointy" | "hex-flat"`.
  - `showHexCoordinates`: `boolean`.
  - Persistence in existing local storage and vault map settings.
- **FR-006**: Token dragging and placement on hex maps MUST support snapping token centers to the nearest hex cell center.
- **FR-007**: Map Fog of War MUST support hex-based revealing and hiding:
  - Punching a single hex polygon into `maskCanvas`.
  - Punching a radius of `N` hexes around a given hex coordinate into `maskCanvas`.
  - Full compatibility with existing undo/redo stack (`pushUndoAction`) and OPFS mask persistence.
- **FR-008**: The measurement tool MUST detect when the active grid is a hex grid and compute discrete hex steps rather than pure Cartesian distances.
- **FR-009**: `VTTGridSettings.svelte` MUST provide intuitive controls for selecting grid type (Square, Pointy Hex, Flat Hex), toggling coordinate displays, and adjusting cell radius/spacing.
- **FR-010**: All hex math in `packages/map-engine` MUST be framework-free, highly performant, and covered by unit tests with >= 80% branch coverage.
- **FR-011**: User Help content in `apps/web/src/lib/content/help/` MUST include documentation on using hex grids, hex fog of war, and overland hexcrawl measurement.

### Key Entities

- **HexCoord (Axial)**: `{ q: number; r: number }` — axial representation of a hex cell.
- **CubeCoord**: `{ x: number; y: number; z: number }` where `x + y + z = 0`.
- **HexOrientation**: `"pointy"` | `"flat"`.
- **HexGridConfig**:
  ```ts
  interface HexGridConfig {
    orientation: HexOrientation;
    size: number; // radius from center to corner vertex in pixels
    offsetX: number;
    offsetY: number;
    color: string;
    opacity: number;
    showCoordinates?: boolean;
  }
  ```
- **MapGridSettings**:
  ```ts
  type GridType = "square" | "hex-pointy" | "hex-flat";
  ```
