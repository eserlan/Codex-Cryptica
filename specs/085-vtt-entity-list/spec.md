# Feature Specification: VTT Entity List

**Feature Branch**: `085-vtt-entity-list`  
**Created**: 2026-04-15  
**Status**: Draft  
**Input**: User description: "entity list in vtt mode https://github.com/eserlan/Codex-Cryptica/issues/621"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Access Entity List in VTT (Priority: P1)

As a Gamemaster in VTT mode, I want to see a list of my entities so I can quickly find what I need to place on the map.

**Why this priority**: This is the foundation for all other VTT-related entity interactions. Without visibility, dragging is impossible.

**Independent Test**: The user can open and toggle the entity list while the VTT map is active.

**Acceptance Scenarios**:

1. **Given** the VTT map is active, **When** the user clicks the "Entity List" toggle button, **Then** the sidebar containing the vault entities appears.
2. **Given** the entity list sidebar is open in VTT, **When** the user enters a search term, **Then** the list filters in real-time to show only matching entities.

---

### User Story 2 - Drag Entity to Map (Priority: P1)

As a Gamemaster, I want to drag an entity from the list onto the VTT map to create a token.

**Why this priority**: This is the primary value proposition of the feature — streamlining encounter setup and gameplay.

**Independent Test**: An entity from the list can be dropped onto the map, resulting in a new token.

**Acceptance Scenarios**:

1. **Given** the entity list is open, **When** the user drags an entity entry onto the map canvas, **Then** a new token representing that entity is created at the drop coordinates.
2. **Given** an entity is being dragged over the map, **When** the user releases the mouse button, **Then** the token is placed and the drag operation ends.

---

### User Story 3 - Visual Feedback during Drag (Priority: P2)

As a Gamemaster, I want visual feedback while dragging an entity so I know exactly where it will be placed on the map.

**Why this priority**: Essential for usability and precision, preventing accidental placements in the wrong location.

**Independent Test**: A "ghost" image or preview of the token is visible during the drag-and-drop operation.

**Acceptance Scenarios**:

1. **Given** an entity is being dragged, **When** the cursor moves over the VTT canvas, **Then** a semi-transparent preview of the resulting token follows the cursor.
2. **Given** an entity is being dragged, **When** the cursor moves outside the valid drop area, **Then** the preview indicator changes style (e.g., becomes red or disappears) to signal an invalid drop.

---

### Edge Cases

- **Invalid Drop Zones**: What happens when an entity is dropped onto UI elements or off the map canvas? (Expected: Drag is cancelled, no token created).
- **Duplicate Placements**: Can the same entity be dragged multiple times? (Expected: Yes, multiple tokens can represent the same entity, e.g., "Goblin").
- **Deleted Entities**: How does the list handle an entity being deleted while the VTT sidebar is open? (Expected: List updates immediately to remove the entry).
- **Network Latency**: How does the system handle rapid dragging if sync is slow? (Expected: Optimistic local placement with background sync).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a toggleable sidebar in VTT mode for browsing vault entities.
- **FR-002**: System MUST allow entities to be dragged from the sidebar and dropped onto the VTT map.
- **FR-003**: System MUST support dragging 'Actor' (Characters, NPCs, Monsters) and 'Object' entity types.
- **FR-004**: System MUST maintain the entity list's search and filtering functionality while in VTT mode.
- **FR-005**: System MUST render a visual preview of the token while an entity is being dragged over the map.
- **FR-006**: System MUST persist the visibility state (open/closed) of the VTT entity list locally across sessions.
- **FR-007**: System MUST support the creation of multiple tokens from a single entity entry.

### Key Entities _(include if feature involves data)_

- **VTT Canvas**: The interactive, zoomable area where gameplay takes place and tokens are managed.
- **Entity**: A record from the user's vault (NPC, Player, Location, Item, etc.) that serves as the template for a token.
- **Token**: A specific instance on the VTT canvas linked to an Entity, possessing spatial properties (X, Y, Layer).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can find and place a specific entity as a token in under 5 seconds.
- **SC-002**: Drag-and-drop operations complete successfully 100% of the time for valid map locations.
- **SC-003**: The entity list sidebar toggle responds to user input in under 50ms.
- **SC-004**: Placement of a token via drag-and-drop is reflected for all connected users (in a multi-user session) in under 200ms.
