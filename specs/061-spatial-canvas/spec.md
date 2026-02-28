# Feature Specification: Interactive Spatial Canvas

**Feature Branch**: `061-spatial-canvas`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: User description: "interactive spatial canvas https://github.com/eserlan/Codex-Cryptica/issues/281"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Intentional Conspiracy Board (Priority: P1)

As a Game Master, I want to manually place entity cards (NPCs, Locations, Items, etc.) on a board and draw lines between them to visualize complex relationships, so that I can keep track of non-obvious connections during a session.

**Why this priority**: This is the core "Spatial Intentionality" requirement. It provides the primary value of manual control over the automated graph.

**Independent Test**: Can be fully tested by creating a new canvas, dragging two entities of different types onto it, positioning them, drawing a line between them, and seeing the layout persist after a reload.

**Acceptance Scenarios**:

1. **Given** an empty canvas, **When** I drag an entity from the palette, **Then** a card representing that entity appears at the drop location.
2. **Given** two cards on the canvas, **When** I draw a connection between them, **Then** a persistent visual line is created.
3. **Given** a customized layout, **When** I close and reopen the vault, **Then** all cards and links remain in their exact coordinates.

---

### User Story 2 - Multiple Specialized Dashboards (Priority: P2)

As a worldbuilder, I want to create multiple different canvases (e.g., "Main Quest," "Region Relationships," "Player Character Backstories") and switch between them easily, so that I can organize distinct narrative threads or geographical regions into separate visual contexts without cluttering a single workspace.

**Why this priority**: Essential for scalability and organization as the vault grows.

**Independent Test**: Can be tested by creating two separate canvases with different nodes and verifying that switching between them correctly loads the distinct states.

**Acceptance Scenarios**:

1. **Given** a "Main Quest" canvas, **When** I create a new "Faction War" canvas, **Then** I am presented with a fresh empty workspace.
2. **Given** multiple canvases, **When** I select one from a list, **Then** the workspace immediately updates to show that specific layout.

---

### User Story 3 - Search-to-Canvas Quick Spawn (Priority: P3)

As a Game Master running a live session, I want to quickly find an entity using global search and drop it onto my current session board without navigating away, so that I can react to player choices in real-time.

**Why this priority**: High UX value for active play but not strictly required for the core "desk" functionality.

**Independent Test**: Can be tested by opening the search bar, finding an entity, and using a shortcut or drag action to place it on the active canvas.

**Acceptance Scenarios**:

1. **Given** a search result, **When** I click "Add to Canvas", **Then** the entity appears at the center of the current view (or follows my cursor).

---

### User Story 4 - Readable Workspace Context (Priority: P2)

As a GM who shares links or bookmarks workspaces, I want the URL to use the canvas name (slug) instead of a UUID, so that I can easily identify which workspace I am looking at from the browser history or address bar.

**Acceptance Scenarios**:

1. **Given** a canvas named "Battle of the Docks", **When** I open it, **Then** the URL ends in `/canvas/battle-at-the-docks`.
2. **Given** an active canvas, **When** I rename it, **Then** the URL automatically updates to reflect the new name.

---

### User Story 5 - Custom Relationship Labeling (Priority: P2)

As a GM, I want a theme-aware interface for labeling my connections, so that the experience feels consistent with the rest of the application's aesthetic.

**Acceptance Scenarios**:

1. **Given** a connection, **When** I double-click it, **Then** a custom themed modal appears for entering the label.
2. **Given** a labeled connection, **When** I clear the text in the modal, **Then** the label is hidden entirely from the canvas.

---

### Edge Cases

- **Broken References**: What happens if an entity placed on the canvas is deleted from the vault? (Assumption: The card shows a "Missing Entity" state or is automatically removed).
- **Duplicate Entities**: System MUST allow multiple cards for the same entity on a single canvas. Each card instance maintains its own coordinates and can have independent canvas-local visual links.
- **Canvas Naming Conflicts**: How are duplicate canvas names handled? (Slugs MUST be unique within a vault; system appends numeric suffixes like `-1`, `-2`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an infinite-pan and zoomable workspace.
- **FR-002**: System MUST allow users to manually position entity cards anywhere on the canvas.
- **FR-003**: System MUST persist card coordinates and connections in a dedicated `.canvas` file format.
- **FR-004**: System MUST provide a "Palette" sidebar containing all entities available for placement, including a real-time filter/search bar to quickly find specific entities.
- **FR-005**: System MUST allow users to draw visual connections (lines/arrows) between cards.
- **FR-006**: Cards MUST display entity metadata (Title, Type, Summary, Image) as defined in the vault.
- **FR-007**: System MUST support auto-expanding entity cards that resize themselves based on the amount of content (summary length, tags, image, etc.). Expansion MUST trigger on card load and whenever content is updated, respecting a maximum height limit before introducing internal scrolling.
- **FR-008**: System MUST integrate with "Zen Mode" (entity detail view) upon interaction with a card.
- **FR-009**: System MUST support multiple canvases per vault.
- **FR-010**: System MUST support "Canvas Search" to find specific canvases by name.
- **FR-011**: System MUST use name-based slugs for canvas URLs instead of UUIDs.
- **FR-012**: System MUST provide a themed MiniMap that adheres to the active styling template (colors, viewport mask).
- **FR-013**: System MUST use a custom themed modal for edge label editing instead of browser prompts.
- **FR-014**: Edge labels MUST allow empty strings, in which case the label is not rendered.

### Key Entities

- **Canvas**: Represents a single layout. Contains a collection of Node references and visual Link definitions.
- **Node**: A reference to a Vault Entity. Stores local canvas data (X, Y coordinates, Width, Height).
- **Link**: A visual relationship between two Nodes. Stores source/target IDs and optional label/style.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can manipulate (pan/zoom/drag) a canvas with 100+ entities at a consistent 60fps.
- **SC-002**: A canvas state (JSON) is saved and synchronized within 2 seconds of any change.
- **SC-003**: Switching between any two canvases takes less than 300ms.
- **SC-004**: Users can go from "Empty Canvas" to "Conspiracy Board with 5 entities and 3 links" in under 30 seconds.

## Assumptions

- Canvases are local-first and stored within the user's vault directory.
- Visual links on a canvas do NOT create actual relationships in the underlying Markdown files unless explicitly requested (out of scope for MVP).
- The system will use standard web performance optimization techniques for large datasets.
