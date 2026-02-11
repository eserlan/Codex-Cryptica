# Feature Specification: Minimap Navigation

**Feature Branch**: `012-minimap`  
**Created**: 2026-01-29  
**Status**: Draft  
**Input**: User description: "Implement the minimap"

## User Scenarios & Testing

### User Story 1 - Visual Orientation (Priority: P1)

As a User with a large graph of entities, I want to see a miniature overview of the entire graph structure so that I can understand my current position relative to the whole.

**Why this priority**: Essential for orientation in large datasets where the viewport only shows a small fraction of nodes.

**Independent Test**: Load a large graph; verify a minimap appears showing nodes outside the current viewport.

**Acceptance Scenarios**:

1. **Given** a graph with 50+ nodes, **When** I zoom in to see only 5 nodes, **Then** the minimap should show the entire cluster of 50 nodes with a rectangle indicating my current view.
2. **Given** nodes with different categories/colors, **When** viewing the minimap, **Then** the node representations should roughly match the main graph's colors for easier identification.

---

### User Story 2 - Viewport Navigation (Priority: P1)

As a User, I want to drag the indicator on the minimap to pan the main view, so that I can quickly move between distant sections of the graph without repeated dragging on the main canvas.

**Why this priority**: Provides the primary functional value of the minimap—rapid traversal.

**Independent Test**: Drag the minimap viewport box; verify the main graph pans accordingly.

**Acceptance Scenarios**:

1. **Given** I am looking at the top-left of the graph, **When** I drag the minimap viewport rect to the bottom-right, **Then** the main graph view should update to show the bottom-right nodes.
2. **Given** the main graph is panned manually, **When** the pan completes, **Then** the minimap viewport indicator should update to reflect the new position.

---

### User Story 3 - Jump Navigation (Priority: P2)

As a User, I want to click anywhere on the minimap to instantly center the view on that location.

**Why this priority**: Faster than dragging for long-distance jumps.

**Independent Test**: Click an empty area in the minimap; verify the graph centers on that coordinate.

**Acceptance Scenarios**:

1. **Given** the minimap is visible, **When** I click on a cluster of nodes in the minimap, **Then** the main graph should instantly center on that cluster.

---

### User Story 4 - Visibility Control (Priority: P3)

As a User, I want to collapse or hide the minimap so that it doesn't obscure graph content when I need maximum screen real estate (especially on smaller screens).

**Why this priority**: Important for UX on limited display sizes but not critical for core navigation.

**Independent Test**: Click a toggle button on the minimap; verify it minimizes/hides.

**Acceptance Scenarios**:

1. **Given** the minimap is open, **When** I click the close/minimize button, **Then** it should shrink to a small icon or button.
2. **Given** the minimap is minimized, **When** I click the toggle button, **Then** it should expand to its full size.

### Edge Cases

- **Empty Graph**: Minimap should either be hidden or show an empty state, not crash.
- **Mobile Devices**: Minimap should likely default to closed or be sized appropriately to not block interaction.
- **Extreme Zoom**: When zoomed out fully (seeing everything), the viewport rect should encompass the whole minimap.

## Requirements

### Functional Requirements

- **FR-001**: System MUST render a real-time miniature view of the graph nodes and edges.
- **FR-002**: System MUST display a "viewport rectangle" on the minimap representing the current camera bounds of the main graph.
- **FR-003**: The viewport rectangle MUST be interactive (draggable) to pan the main graph.
- **FR-004**: The viewport rectangle size MUST inversely scale with the main graph's zoom level (zooming in shrinks the rect).
- **FR-005**: Clicking a non-viewport area on the minimap MUST center the main graph on that coordinate.
- **FR-006**: The minimap MUST update its node positions if the main graph layout changes.
- **FR-007**: The minimap MUST provide a toggle mechanism to expand/collapse it.

### Assumptions

- The underlying graph engine provides accessible API methods to retrieve and set camera coordinates (pan/zoom).
- The graph engine supports coordinate conversion between screen space and graph space.

### Key Entities

- **Viewport Rect**: Represents the user's current camera view (x, y, zoom).
- **Thumbnail Renderer**: The component responsible for drawing the simplified graph view.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Minimap rendering overhead is less than 16ms (60fps) during static viewing, ensuring no main thread blocking.
- **SC-002**: Navigation (panning via minimap) updates the main view with <100ms latency.
- **SC-003**: Minimap occupies no more than 20% of the screen area on desktop resolutions (1920x1080).
- **SC-004**: Users can traverse from one end of a large graph (>100 nodes) to the other in <2 seconds using the minimap.
