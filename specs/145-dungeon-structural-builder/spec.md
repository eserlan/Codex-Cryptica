# Feature Specification: Dungeon & Delve Structural Builder (#145 / #1843)

**Feature Branch**: `1843-dungeon-structural-builder`  
**Created**: 2026-07-26  
**Status**: Draft  
**Input**: User description: "more or less done w 1842, so time to look into https://github.com/eserlan/Codex-Cryptica/issues/1843"

## Clarifications

### Session 2026-07-26

- Q: How should initial room stocking populate when adding room nodes manually or offline? → A: Deterministic table stocking (automatically populate stocking fields using rule-based rolls matching the dungeon concept theme/factions).
- Q: How should the canvas alert the GM when graph validation detects an orphaned/unreachable room node? → A: Non-blocking visual warning badge (render a ⚠️ _Unreachable_ warning badge/border on the room node and canvas HUD without blocking saving or editing).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Build Delve on Spatial Canvas & Initial Flow Layout (Priority: P1)

As a GM, I want to click "Build Delve on Canvas" from a Dungeon/Delve concept note, so that a standard `.canvas` file is generated with sectors as container frames, room nodes logically arranged in a hierarchical flow layout, and connections linked to the concept lore note.

**Why this priority**: Core MVP capability. Leveraging the Spatial Canvas (`.canvas` / `@xyflow/svelte`) enables seamless spatial visualization, zooming, panning, and vault integration.

**Independent Test**: Can be tested by opening a saved dungeon concept, clicking "Build Delve on Canvas", and verifying a `.canvas` file is created with sector group frames, `DelveRoomNode`s, and passage edges in a clean layout.

**Acceptance Scenarios**:

1. **Given** a saved or freshly generated Dungeon/Delve concept note, **When** the user clicks "Build Delve on Canvas", **Then** a `.canvas` file is created and linked to the concept note via `delveCanvasId`.
2. **Given** a new Delve canvas generation, **When** initial room node positions are calculated, **Then** a sector-aware hierarchical flow layout arranges entrances at top/left and places rooms cleanly inside sector group frames without node overlaps.
3. **Given** a user navigating from the Canvas Explorer, **When** they select the Delve `.canvas` file, **Then** the Delve canvas opens in the Spatial Canvas workspace with all delve-specific room nodes, edges, and sector frames intact.

---

### User Story 2 - Specialized Room Nodes & Custom Edge Passage Editing (Priority: P2)

As a GM, I want specialized room nodes displaying roles and stocking chips, and custom passage edges representing hidden routes, locked doors, or vertical links, so I can interactively inspect and adjust the spatial map layout.

**Why this priority**: Crucial tactical visual representation for GMs during prep and live sessions.

**Independent Test**: Can be tested by selecting room nodes on canvas, editing room roles/stocking, drawing new edges between room nodes, and modifying edge attributes (e.g. changing a passage to hidden or vertical).

**Acceptance Scenarios**:

1. **Given** a room node on canvas, **When** rendered, **Then** the `DelveRoomNode` displays a role badge (Entrance, Hazard, Encounter, Secret, Treasure, Faction, Lore, Special), room title, sector name, and stocking summary chips.
2. **Given** two room nodes on canvas, **When** the user connects them or edits their connection edge, **Then** `DelveEdge` renders distinct visual styling: solid for standard, dashed for hidden (👁️), solid with badge for conditional/locked (🔒), dotted for vertical (🪜), or directional arrows for one-way slides.
3. **Given** an edge click on canvas, **When** the user opens the Edge Attribute modal, **Then** they can update passage type, lock/key conditions, or directionality.

---

### User Story 3 - Context-Aware Room Stocking & Single-Room AI Regeneration (Priority: P3)

As a GM, I want room nodes to be stocked with lore-consistent hazards, encounters, secrets, and treasures, and to regenerate or adjust an individual room node without altering the rest of the canvas.

**Why this priority**: Allows GMs to refine specific rooms using AI or manual edits without wiping out manual canvas layout or neighboring room stocking.

**Independent Test**: Can be tested by selecting a single room node on the Delve canvas, clicking "Regenerate Room (AI)", and confirming that only that room's content updates while surrounding canvas nodes and edges remain unchanged.

**Acceptance Scenarios**:

1. **Given** a newly generated Delve canvas, **When** room node stocking is inspected, **Then** room encounters, hazards, traps, and secrets reflect the concept lore's factions, history, and conflict context.
2. **Given** a room node on the canvas, **When** the user triggers "Regenerate Room (AI)" from the node context menu, **Then** Gemini regenerates stocking for that specific node while preserving surrounding room nodes and edge topology.
3. **Given** AI features are disabled or a node is created manually, **When** a room node is added, **Then** room stocking is populated deterministically via rule-based theme rolls with full manual text edit capability.

---

### User Story 4 - Canvas Persistence & Vault Integration (Priority: P4)

As a GM, I want all my custom Delve canvas node positions, added rooms, passage edge attributes, and room stocking to save automatically to the `.canvas` file and reload seamlessly.

**Why this priority**: Guarantees data durability and seamless integration with the vault storage system.

**Independent Test**: Can be tested by creating custom nodes/edges on a Delve canvas, closing the canvas workspace, reopening it from the Vault or Concept Note, and confirming all spatial positions, sector frames, edges, and room stocking remain identical.

**Acceptance Scenarios**:

1. **Given** a Delve canvas with user modifications, **When** saved and reopened, **Then** all node coordinates, sector frames, custom edges, and room stocking reload intact.
2. **Given** a Dungeon Concept note, **When** the user clicks "Open Delve Canvas", **Then** the canvas opens directly in the workspace centered on the delve map.

---

### Edge Cases

- **Orphaned Room Nodes**: Manual deletion or moving of room nodes outside sector frames; graph validation alerts GMs with a non-blocking ⚠️ _Unreachable_ warning badge on the room node and canvas HUD.
- **Large Delve Canvases**: Delves with 20+ rooms across 4+ sectors; layout generator ensures clear spacing and canvas zoom-to-fit on open.
- **Offline / AI-Disabled Usage**: Full support for manual node/edge creation, manual stocking text, and deterministic procedural room stocking without AI dependencies.
- **Legacy Dungeon Concepts**: Opening older concept entities automatically synthesizes sector frames and room nodes without error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Build Delve on Canvas" action on Dungeon/Delve concept entities that creates/persists a standard `.canvas` vault file linked via `delveCanvasId`.
- **FR-002**: System MUST generate an initial room graph and sector hierarchy from high-level concept metadata using a sector-aware hierarchical flow layout algorithm.
- **FR-003**: System MUST render sectors as group container frames on the Spatial Canvas enclosing their respective room nodes.
- **FR-004**: System MUST provide a specialized `DelveRoomNode` canvas component rendering role badges (Entrance, Hazard, Encounter, Secret, Treasure, Lore, Faction, Special), titles, sector tags, stocking summary chips, and action buttons.
- **FR-005**: System MUST provide a custom `DelveEdge` canvas component rendering standard (solid), hidden (dashed with 👁️), conditional (solid with 🔒 badge), vertical (dotted with 🪜), and one-way passage styles.
- **FR-006**: System MUST provide an Edge Attribute Inspector modal for editing passage type, lock/trap conditions, and directionality.
- **FR-007**: System MUST perform graph connectivity validation and render non-blocking visual ⚠️ _Unreachable_ warning badges on orphaned room nodes and canvas HUD.
- **FR-008**: System MUST stock room nodes with lore-consistent hazards, encounters, secrets, and treasures using concept context (or deterministic theme tables when offline/manual).
- **FR-009**: System MUST support single-room AI regeneration from the room node context menu without altering surrounding canvas nodes or edge topology.
- **FR-010**: System MUST persist all canvas layout positions, room stocking data, and passage edges in `.canvas` format in local vault storage.
- **FR-011**: System MUST remain 100% functional for manual room creation, edge editing, and stocking without requiring AI access.

### Key Entities

- **DelveCanvasDocument**: Standard `.canvas` JSON structure storing sector group nodes, `DelveRoomNode` instances, and `DelveEdge` connections linked to a `DungeonConcept`.
- **DungeonSectorFrame**: A canvas group node defining sector boundaries, theme, depth, and background frame styling.
- **DelveRoomNodeData**: Spatial node data containing room ID, sector ID, name, role, position, and stocking object (encounters, hazards, secrets, treasure, atmosphere).
- **DelveEdgeData**: Edge data connecting two room nodes; includes passage type (standard, hidden, conditional, vertical), directionality (bidirectional/one-way), description, and lock/trap condition.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of valid Dungeon concepts can be converted into a Delve `.canvas` file with a single click.
- **SC-002**: Initial flow layout places room nodes without overlapping nodes or intersecting sector boundaries.
- **SC-003**: Single-room AI regeneration completes within 3 seconds and leaves all other room nodes and edge topology unchanged.
- **SC-004**: 100% of canvas spatial edits (node drags, added edges, updated passage conditions, edited stocking) persist across save and reload cycles.
- **SC-005**: Delve canvas building and editing remains 100% operational when AI features are disabled.
