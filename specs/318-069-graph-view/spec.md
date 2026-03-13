# Feature Specification: GraphView Refactor

**Feature Branch**: `069-graph-view-refactor`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Refactor the monolithic GraphView.svelte into modular components and a specialized LayoutManager."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Immersive Graph Navigation (Priority: P1)

As a user, I want to navigate my knowledge graph using intuitive gestures (drag, zoom, click) and switch between specialized layouts (FCOSE, Timeline, Orbit) to visualize different aspects of my lore.

**Why this priority**: Navigation is the primary purpose of the GraphView. Breaking this makes the lore exploration impossible.

**Independent Test**: Can be fully tested by opening the graph, dragging nodes, and switching between the three main layout modes.

**Acceptance Scenarios**:

1. **Given** a populated vault, **When** I click the "Timeline" layout button, **Then** the nodes rearrange chronologically along the X or Y axis.
2. **Given** a large graph, **When** I drag a node, **Then** its connected edges follow smoothly and the view remains responsive.

---

### User Story 2 - Contextual Awareness (Priority: P2)

As a user, I want to see a high-level overview of my graph via a minimap and get immediate contextual information about nodes via tooltips, so I never lose my place in large lore sets.

**Why this priority**: Essential for large-scale world-building where the graph can contain hundreds of nodes.

**Independent Test**: Can be tested by hovering over a node to see the tooltip and using the minimap to jump to a different graph sector.

**Acceptance Scenarios**:

1. **Given** a node, **When** I hover my cursor over it, **Then** a tooltip appears showing the entity title and a snippet of its chronicle.
2. **Given** a zoomed-in graph, **When** I click a sector in the minimap, **Then** the main viewport pans to that location.

---

### User Story 3 - Graph Orchestration (Priority: P3)

As a user, I want the graph to stay in sync with my vault changes (created/deleted nodes) and reflect the active campaign theme automatically.

**Why this priority**: Ensures the visual representation is always accurate.

**Independent Test**: Can be tested by creating a new entity in the sidebar and verifying it immediately appears as a node in the graph.

**Acceptance Scenarios**:

1. **Given** an open graph, **When** I delete an entity from the sidebar, **Then** its corresponding node and all connected edges vanish from the graph.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST isolate Cytoscape layout configuration and execution logic into an `OracleLayoutManager`.
- **FR-002**: System MUST extract the minimap overlay into a standalone `Minimap.svelte` component.
- **FR-003**: System MUST extract the graph controls (layout switcher, zoom, fit) into a `GraphControls.svelte` component.
- **FR-004**: System MUST isolate the node tooltip logic into a `GraphTooltip.svelte` component.
- **FR-005**: System MUST use a Svelte action or specialized module to handle complex Cytoscape event listeners (`useGraphEvents`).
- **FR-006**: System MUST reduce `GraphView.svelte` to under 400 lines of code, focusing on component orchestration.

### Key Entities

- **OracleLayoutManager**: Pure TypeScript service for calculating and applying Cytoscape layouts.
- **Minimap**: UI overlay providing a viewport overview.
- **GraphControls**: Floating UI for graph-wide actions.
- **GraphTooltip**: Dynamic UI element following node hovers.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `apps/web/src/lib/components/GraphView.svelte` is reduced to under 400 lines.
- **SC-002**: Graph interaction latency remains under 16ms (60fps) during pans and zooms.
- **SC-003**: 100% of existing graph-related unit and E2E tests continue to pass.
- **SC-004**: Component bundle size for the graph remains stable or decreases.
