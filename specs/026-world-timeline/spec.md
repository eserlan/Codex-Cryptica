# Feature Specification: World Timeline

**Feature Branch**: `026-world-timeline`  
**Created**: 2026-01-31  
**Status**: Draft  
**Input**: User description: "a way to organize nodes by in world time, so that we can get a timeline of events (not only for events but also npcs, factions, locations, etc)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Chronological Tagging (Priority: P1)

As a World Builder, I want to assign specific dates or time periods to any node in my vault (e.g., an NPC's birth, a faction's founding, or a battle's occurrence), so that I can establish a formal history for my world.

**Why this priority**: This is the foundational requirement. Without the ability to store temporal data on nodes, no timeline can be generated.

**Independent Test**: Can be tested by adding a "Date" field to an NPC and an Event, and verifying that the data is persisted in the entity's metadata.

**Acceptance Scenarios**:

1. **Given** an existing NPC node, **When** I add a "Birth Date" of "1240 AF", **Then** the date is saved and displayed in the entity's details.
2. **Given** a new Event node, **When** I provide a "Start Date" and "End Date", **Then** the system recognizes this as a duration.

---

### User Story 2 - The Chronological Graph (Priority: P1) 🎯 MVP

As a World Builder, I want to toggle my knowledge graph into a "Chronological Mode," where nodes are automatically rearranged sequentially based on their chronological order, so that I can see the temporal flow of my world's history without losing relational context.

**Why this priority**: This delivers the core value of the feature using the project's primary interface (the graph), maintaining the Relational-First mandate.

**Independent Test**: Toggle "Timeline Mode" on the graph and verify that nodes move to positions corresponding to their sequential order.

**Acceptance Scenarios**:

1. **Given** multiple nodes with dates, **When** I activate "Horizontal Timeline Mode," **Then** nodes are positioned sequentially from left-to-right based on their Year metadata, with visual gaps separating distinct time periods.
2. **Given** nodes connected by edges, **When** in Timeline Mode, **Then** the relationships (edges) remain visible between chronologically-aligned nodes.
3. **Given** a change in a node's Date metadata, **When** the graph is in Timeline Mode, **Then** the node's position updates automatically to reflect the new time.

---

### User Story 3 - Temporal Filtering & Focal Window (Priority: P2)

As a World Builder, I want to filter the graph to only show nodes within a specific date range, so that I can focus on a particular century or era without being overwhelmed by the entire timeline.

**Why this priority**: Essential for managing large vaults and focusing the graph on specific historical arcs.

**Independent Test**: Set a start and end year in the graph controls and verify only matching nodes are visible on the canvas.

**Acceptance Scenarios**:

1. **Given** a timeline spanning Years 0 to 2000, **When** I filter for "Year 1000 to 1200", **Then** all nodes outside that range are hidden from the canvas.

---

### User Story 4 - Visual Eras & Axis Toggles (Priority: P3)

As a World Builder, I want to visualize named "Eras" as distinct background regions on the graph and toggle between Horizontal and Vertical orientations, so that I can customize how my history is displayed.

**Why this priority**: Provides visual polish and customization for different types of storytelling (e.g., deep vertical chronicles vs. broad horizontal overviews).

**Independent Test**: Define an Era and verify a shaded region appears on the graph canvas bounding the nodes within that time range.

**Acceptance Scenarios**:

1. **Given** an Era "The First Age" (Year 0-500), **When** in Timeline Mode, **Then** a background label or shaded region identifies that segment of the canvas.
2. **Given** a horizontal timeline, **When** I toggle to "Vertical", **Then** nodes re-align along the Y-axis.

---

### Edge Cases

- **Undated Entities**: Entities without dates MUST be hidden in Timeline Mode.
- **Ambiguous Dates**: Dates MUST be strictly numeric for canvas positioning. For non-numeric labels (e.g., "Early Third Age"), users must provide a numeric year.
- **Node Overlap**: If multiple nodes share the same date, the layout engine MUST apply a secondary offset (e.g., along the non-temporal axis) to prevent visual occlusion.
- **Relational Integrity**: Deleting a node from the graph while in Timeline Mode should trigger standard deletion logic (Law II).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to add "Date" metadata to any node type.
- **FR-002**: System MUST support "Start Date" and "End Date" for entities to represent durations.
- **FR-003**: System MUST provide a "Timeline Mode" toggle for the primary Cytoscape graph.
- **FR-004**: System MUST position nodes sequentially based on chronological order. The layout MUST compress large time gaps (e.g. >20 years, >100 years) to maintain a cohesive visual flow while indicating distance.
- **FR-005**: System MUST allow users to toggle between Horizontal (X-axis time) and Vertical (Y-axis time) orientations.
- **FR-006**: System MUST support visual "Era" backgrounds on the graph canvas to group dated nodes.
- **FR-007**: System MUST provide a range-filter to hide/show nodes based on temporal boundaries.
- **FR-008**: System MUST maintain edge visibility between nodes in Timeline Mode.

### Key Entities _(include if feature involves data)_

- **Temporal Metadata**: Attributes added to standard entities (NPC, Location, etc.) including `date`, `start_date`, `end_date`, and `era`.
- **Era**: A global configuration entity defining a name, start date, end date, and description.
- **Timeline Entry**: A derived view of an entity containing its title, type, date, and a snippet of its chronicle.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can add a date to an entity in under 10 seconds from the detail panel.
- **SC-002**: The Timeline view loads and sorts 500+ dated nodes in under 200ms.
- **SC-003**: 100% of dated nodes appear in the correct chronological order in the Timeline view.
- **SC-004**: Users can navigate between the Timeline and any dated node in a single click.
