# Feature Specification: Central Node Orbit Layout

**Feature Branch**: `032-central-node-orbit`
**Created**: 2026-02-02
**Status**: Draft
**Input**: User description: "lets have the ability to set a node the central node,and let every other node revolve around it"

## User Scenarios & Testing

### User Story 1 - Activate Orbit Layout (Priority: P1)

As a user exploring a complex graph, I want to select a specific node and set it as the "Central Node" so that the entire graph rearranges itself in concentric circles around it, allowing me to clearly see hierarchy and degrees of separation from that entity.

**Why this priority**: This is the core functionality requested. It transforms the visualization to focus on a specific entity's influence/connections.

**Independent Test**: Select a node in a connected graph; trigger "Set as Central Node" (or similar action); verify the selected node moves to the center and other nodes arrange themselves in rings around it based on connection distance.

**Acceptance Scenarios**:

1. **Given** a graph with multiple nodes and connections, **When** I select "Node A" and activate "Orbit View", **Then** "Node A" MUST move to the visual center of the canvas.
2. **Given** "Orbit View" is active for "Node A", **Then** all nodes directly connected to "Node A" MUST be arranged in the first circle/orbit around it.
3. **Given** "Orbit View" is active, **Then** nodes further away (2nd degree connections) MUST be arranged in a wider circle/orbit outside the first one.

---

### User Story 2 - Switch Center (Priority: P2)

As a user in Orbit View, I want to easily select a different node to be the new center so that I can quickly shift my perspective to another entity's network without resetting the view first.

**Why this priority**: Facilitates fluid exploration and "walking" the graph to understand relationships from different perspectives.

**Independent Test**: While in Orbit View for "Node A", select "Node B"; verify the graph re-layouts with "Node B" at the center.

**Acceptance Scenarios**:

1. **Given** I am in "Orbit View" centered on "Node A", **When** I select "Node B" and confirm the center switch (or if it's automatic upon selection in this mode), **Then** the layout MUST animate or update to place "Node B" at the center and arrange neighbors around it.

---

### User Story 3 - Return to Default Layout (Priority: P2)

As a user, I want to exit Orbit View and have the graph return to its previous layout (e.g., force-directed or manual) so that I can resume general organization or editing.

**Why this priority**: Ensures the user isn't "stuck" in a specific analytical view and can return to their standard mental map of the data.

**Independent Test**: Activate Orbit View; then deactivate it; verify nodes return to their original positions (or a standard force-directed layout if positions weren't saved).

**Acceptance Scenarios**:

1. **Given** Orbit View is active, **When** I click "Exit Orbit View" (or similar), **Then** the graph layout MUST revert to the state it was in before Orbit View was activated.

### Edge Cases

- **Disconnected Nodes (Islands)**: Nodes with no path to the central node should be placed in the outermost orbit or a designated area to indicate lack of relation.
- **Large Graphs**: If the graph is very large (>500 nodes), the concentric layout calculation must not freeze the UI.
- **Pinned Nodes**: Orbit View should temporarily override "pinned" positions of nodes to ensure the concentric structure is valid, but restore them upon exit.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a user interface element (context menu or toolbar) to "Set as Central Node" or activate "Orbit Layout".
- **FR-002**: System MUST implement a concentric/radial layout algorithm where the selected node is at the center (level 0).
- **FR-003**: System MUST calculate the shortest path distance (degrees of separation) from the central node to all other nodes to determine their orbit level.
- **FR-004**: System MUST visually arrange nodes in concentric rings corresponding to their distance from the center.
- **FR-005**: System MUST allow the user to exit the Orbit Layout and restore the previous graph arrangement.
- **FR-006**: Transitions between centers or layouts SHOULD be animated to help the user track node movement.
- **FR-007**: System MUST handle disconnected components by placing them in the outermost layer.

### Key Entities

- **Orbit Level**: The integer distance (degrees of separation) of a node from the currently selected central node.
- **Central Node**: The node currently serving as the anchor for the concentric layout (Level 0).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Layout calculation and rendering completes in under 100ms for graphs up to 200 nodes (Constitution Principle III).
- **SC-002**: 100% of directly connected neighbors are placed in the first concentric ring around the central node.
- **SC-003**: User can identify the central node and its immediate neighbors without clicking (based on visual arrangement) in 100% of test cases.
- **SC-004**: Returning to the previous layout restores node positions with <5px deviation (if positions were static) or equivalent relative structure.