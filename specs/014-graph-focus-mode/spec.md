# Feature Specification: Graph Focus Highlight

**Feature Branch**: `014-graph-focus-mode`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "highlight (ie opaque the others) selected node and its connections (incl nodes)"

## User Scenarios & Testing

### User Story 1 - Localized Context (Priority: P1)

As a lore creator with a complex graph, I want to click on a node and see only its immediate relationships highlighted while everything else fades away, so that I can focus on the local context of that entity without distraction.

**Why this priority**: Core value of the feature. Solves the problem of "visual noise" in dense graphs.

**Independent Test**: Click a node in a dense graph; verify that the selected node, its neighbors, and the connecting edges remain vivid while all other nodes and edges become semi-transparent.

**Acceptance Scenarios**:

1. **Given** a graph with multiple connected nodes, **When** I click a specific node, **Then** the system MUST apply a "dimmed" state to all nodes and edges NOT directly connected to the selection.
2. **Given** a selected node, **When** looking at its connections, **Then** the neighboring nodes and the edges between them and the selected node MUST remain fully visible (high opacity).

---

### User Story 2 - Restoring Overview (Priority: P1)

As a user, I want to clear my selection and instantly see the entire graph again so that I can resume a broad overview of my world.

**Why this priority**: Essential for navigation. Focus mode must be easily reversible.

**Independent Test**: Select a node (activating focus mode); click the graph background; verify all elements return to 100% opacity.

**Acceptance Scenarios**:

1. **Given** focus mode is active, **When** I click the background to clear selection, **Then** all graph elements MUST return to their default visibility levels.

---

### User Story 3 - Interactive Navigation (Priority: P2)

As a user, I want to click a neighbor of my current selection to "move" the focus to that new entity.

**Why this priority**: Smooth transition between entities in focus mode makes exploring the graph feel intuitive.

**Independent Test**: Select Node A; click Node B (a neighbor of A); verify Node B becomes the new focus center and its neighbors are now highlighted.

**Acceptance Scenarios**:

1. **Given** focus mode is active on Node A, **When** I click neighbor Node B, **Then** the focus MUST shift to Node B, highlighting its connections and dimming Node A (unless Node A is a neighbor of B).

### Edge Cases

- **Island Nodes**: If a node has no connections, only the node itself remains vivid; all other elements dim.
- **Multiple Selection**: If the graph engine supports selecting multiple nodes (not currently primary), focus should logically include the union of all neighbors. (Assumption: Focus mode currently applies to single selection).
- **Dynamic Updates**: If a connection is added/removed while focus mode is active, the highlight state MUST update.

## Requirements

### Functional Requirements

- **FR-001**: System MUST identify the "neighborhood" of a selected node (node itself + edges + target/source nodes of those edges).
- **FR-002**: System MUST apply a semi-transparent opacity (e.g., 0.1 or 0.2) to all nodes and edges outside the neighborhood.
- **FR-003**: System MUST maintain 1.0 opacity for all elements within the neighborhood.
- **FR-004**: Focus state MUST trigger automatically upon node selection.
- **FR-005**: Focus state MUST be removed upon clearing selection.
- **FR-006**: Transitions between normal and focused states SHOULD be smooth (CSS animation/Cytoscape animation).

### Key Entities

- **Neighborhood**: A set of graph elements (nodes and edges) that are topologically adjacent to the selected node.
- **Focus Style**: A set of visual properties (primarily opacity) applied to elements to distinguish focus.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Visual state update (dimming/highlighting) completes in under 100ms from the selection event (Constitution Principle III).
- **SC-002**: Opacity levels are distinct enough that a user can clearly identify neighbors at a glance (e.g., >80% contrast difference).
- **SC-003**: Focus mode does not interfere with existing node styles (e.g., category colors or images).
