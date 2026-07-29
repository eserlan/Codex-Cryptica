# Feature Specification: Adventure Canvas Spatial Graph Builder

**Feature Branch**: `147-adventure-canvas-spatial`  
**Created**: 2026-07-29  
**Status**: Implemented
**Input**: Issue #1881: Spatial Canvas for Adventure Builder

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Render & Traverse Adventure Graph Canvas (Priority: P1)

As a Game Master, I want to view my generated or authored adventure as a spatial node network so that I can immediately visualize the non-linear connections between locations, NPCs, clues, threats, and outcomes.

**Why this priority**: Core value of Issue #1881 — transforming linear adventure prose into an interactive spatial network.

**Independent Test**: Generate an adventure concept or open the Adventure Canvas tool, verify all node types (Starting Situation, Key Location, NPC/Faction, Clue/Secret, Threat, Outcome) render with distinct visual styles, 4-direction handles (Top, Bottom, Left, Right), and typed edges.

**Acceptance Scenarios**:

1. **Given** a generated adventure concept, **When** the user opens the Adventure Canvas, **Then** the canvas renders all scenario elements as interactive nodes arranged in an intuitive branching layout.
2. **Given** an active canvas, **When** viewing nodes, **Then** node types (Location, NPC, Clue, Threat, Outcome) are visually distinguishable with semantic color tokens and icons, and derive evocative titles from bold markdown headers (`**Title**`) rather than generic numbered labels (`Clue #1`).
3. **Given** connected nodes, **When** inspecting edges, **Then** relationship labels (e.g. "holds clue", "guards location", "fears threat") are clearly displayed and editable.

---

### User Story 2 - Interactive Node & Edge Editing with Entity Creation & Canvas Spawning (Priority: P2)

As a Game Master, I want to edit nodes, drag or reconnect edge connections, spawn new Adventure Nodes (`Location`, `NPC`, `Clue`, `Threat`, `Outcome`, `Situation`) from the HUD or context menu, create linked Codex Cryptica vault entities, or launch the Dungeon Builder from a location node so that I can seamlessly flesh out my world.

**Why this priority**: Enables GM customization, edge manipulation, entity integration, and cross-tool workflow (linking Location nodes to the Dungeon Builder).

**Independent Test**: Drag nodes, edit node titles/descriptions, drag edge endpoints to reconnect connections, click "+ Add Element" or right-click to spawn new Adventure Nodes, click "Create Entity" on a character node, or click "Launch Dungeon Builder" on a location node.

**Acceptance Scenarios**:

1. **Given** a canvas node, **When** the user drags or edits the node, **Then** its position and content update instantly and persist without losing graph connectivity.
2. **Given** existing edge connections, **When** the user drags an edge endpoint to a new handle, **Then** the connection is dynamically reconnected (`onReconnect`) and saved.
3. **Given** an active canvas, **When** the user selects "+ Add Element" from the HUD or right-clicks the canvas pane, **Then** they can spawn any of the 6 Adventure Node types directly onto the canvas.
4. **Given** a Location node suitable for a dungeon, **When** the user clicks "Launch Dungeon Builder", **Then** the app opens the Dungeon Structural Builder flow initialized with that location's context.
5. **Given** a Character, Location, or Faction node, **When** the user selects "Create Vault Entity", **Then** a corresponding Codex Cryptica note is created and linked to the node.

---

### User Story 3 - Contextual Graph Validation & Full 10-Section GM Lore Preservation (Priority: P3)

As a Game Master, I want to see non-blocking validation warnings (e.g. orphan nodes, single bottlenecks, unlinked clues) and have my full 10-section GM adventure lore preserved in `metadata.sourceLore` when creating/exporting notes so that nothing is lost.

**Why this priority**: Helps GMs refine scenario design without blocking freeform editing, and guarantees 100% preservation of GM adventure lore.

**Independent Test**: Disconnect a clue node, observe a subtle validation badge/warning ("Orphan clue node"), refresh the page, export to a Vault Note, and verify all 10 GM sections are preserved intact in the note `lore`.

**Acceptance Scenarios**:

1. **Given** a graph with an unlinked or unreachable node, **When** viewing the canvas, **Then** a contextual validation warning badge appears without blocking editing or navigation.
2. **Given** a modified canvas layout, **When** reopening the canvas or regenerating a single node, **Then** all manual node positions and unrelated edits are preserved intact.
3. **Given** an Adventure Canvas document, **When** exported to a Vault Note, **Then** `metadata.sourceLore` writes **all 10 GM sections** in full detail to the note `lore` while placing the player summary in `content`.
4. **Given** a small screen / mobile viewport, **When** interacting with the canvas, **Then** pan/zoom controls and node detail drawers remain fully accessible.

---

### Edge Cases

- What happens when an edge endpoint is dragged? `onReconnect` updates the edge's source/target in state without throwing errors.
- How does the system handle missing sourceLore in metadata? Falls back to generating note markdown directly from canvas nodes, including all 4-point location & NPC fields.
- What happens when a location node linked to a dungeon is edited? The link remains stable and updates its metadata without breaking vault references.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an interactive `@xyflow/svelte`-powered Adventure Canvas workspace accessible from the Adventure Builder and Session Hub.
- **FR-002**: System MUST render distinct node types for Starting Situations, Key Locations, NPCs/Factions, Clues/Secrets, Escalating Threats, and Outcomes with semantic theme styling and 4-direction handles.
- **FR-003**: System MUST support typed, editable, and drag-reconnectable relationships (edges) between any pair of nodes.
- **FR-004**: System MUST allow GMs to move, add (via HUD or context menu), edit, connect, reconnect, and delete nodes and edges.
- **FR-005**: System MUST allow creating and linking Codex Cryptica vault entities (Concept, Location, Character, Faction) directly from canvas nodes.
- **FR-006**: System MUST allow launching the Dungeon Structural Builder flow from suitable Location nodes.
- **FR-007**: System MUST provide non-blocking contextual validation warnings for orphan nodes, single bottlenecks, disconnected outcomes, and unreachable clues.
- **FR-008**: System MUST persist canvas layout positions, node content, `sourceLore` metadata, and custom edges in local storage / OPFS across sessions.
- **FR-009**: System MUST preserve **ALL 10 GM Sections** when exporting an Adventure Canvas to a Vault Note.

### Key Entities

- **AdventureCanvasDocument**: Represents the spatial graph state containing nodes, edges, validation warnings, `sourceLore` metadata, and vault entity links.
- **AdventureNode**: A typed node (location, npc, clue, threat, outcome, situation) with position, summary, role, relation, leverage, dilemma, secret, wants, and entity references.
- **AdventureEdge**: A typed relationship connecting two adventure nodes with a semantic label.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: GMs can open an Adventure Canvas and view a complete, auto-layout graph within 1 second.
- **SC-002**: 100% of node moves, edits, edge reconnections, and new element additions persist reliably across page reloads.
- **SC-003**: GMs can launch the Dungeon Builder directly from a Location node in a single click.
- **SC-004**: All 398 generator engine tests and vitest canvas tests pass cleanly with zero lint or type errors.
