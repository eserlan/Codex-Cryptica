# Feature Specification: Entity Labeling System

**Feature Branch**: `029-entity-labeling`  
**Created**: 2026-02-01  
**Status**: Draft  
**Input**: User description: "a labeling system - It would be nice to be able to label nodes/entries. Marking session logs, titles, wars, etc would be very useful"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Categorizing Entities with Labels (Priority: P1)

As a Campaign Manager, I want to assign descriptive tags (labels) to my entities (NPCs, Locations, Items) so that I can group them by narrative role or session relevance beyond their primary category.

**Why this priority**: This is the core functionality requested. It allows users to create custom organizational structures (e.g., tagging all NPCs in a specific "Guild" or marking "Dead" characters).

**Independent Test**: Can be fully tested by opening an entity, adding a "Session 1" label, and verifying that the label appears on the entity's summary.

**Acceptance Scenarios**:

1. **Given** an open Entity Detail Panel, **When** I type "Villain" into the label input and press enter, **Then** the entity should be assigned the "Villain" label.
2. **Given** an entity with multiple labels, **When** I click the 'X' on a specific label, **Then** that label should be removed from the entity.

---

### User Story 2 - Filtering the Workspace by Labels (Priority: P1)

As a GM during a live session, I want to filter my Knowledge Graph or search results to only show entities with a specific label (e.g., "Session Log" or "Active Quest") so I can quickly access relevant information without visual clutter.

**Why this priority**: Organizational tools are only useful if they enable faster retrieval. Filtering is the primary way labels provide value during active use.

**Independent Test**: Can be tested by selecting a label in the search/filter interface and verifying that the graph/list only displays matching entities.

**Acceptance Scenarios**:

1. **Given** multiple entities with the label "Session 42", **When** I select "Session 42" in the filter menu, **Then** only those entities should remain visible on the graph.

---

### User Story 3 - Label Autocomplete & Reuse (Priority: P2)

As a user with a large campaign, I want to see suggestions of existing labels when I start typing a new one so that I can maintain consistency and avoid duplicate tags (like "session-1" vs "Session 1").

**Why this priority**: Enhances user experience and data integrity by encouraging reuse of existing organizational markers.

**Independent Test**: Can be tested by typing "War" in an entity's label field and verifying that existing labels starting with "W" appear as suggestions.

**Acceptance Scenarios**:

1. **Given** that the label "Ancient War" already exists in the vault, **When** I type "Anc" in a new entity's label field, **Then** "Ancient War" should be suggested.

---

### User Story 4 - Project-wide Label Management (Priority: P1)

As a GM refining my campaign notes, I want to rename or delete a label project-wide so that I can correct typos or consolidate tags without manually editing every entity file.

**Why this priority**: Maintains data integrity and allows the organizational system to scale. Essential for the "session logs and wars" use case where categories evolve.

**Independent Test**: Rename "Session 1" to "Intro Session" in settings; verify all tagged entities update their frontmatter automatically.

**Acceptance Scenarios**:

1. **Given** multiple entities with the label "Dead", **When** I rename the label to "Deceased" in settings, **Then** all affected entity files must be updated.
2. **Given** a label "Temp", **When** I delete it globally, **Then** it must be removed from all assigned entities.

---

### Edge Cases

- **Duplicate Labels**: System MUST NOT allow the same label to be assigned multiple times to a single entity.
- **Empty Labels**: System MUST NOT allow empty or whitespace-only strings to be saved as labels.
- **Case Sensitivity**: System MUST treat labels as strictly case-insensitive (e.g., "War", "war", and "WAR" are the same label) to prevent tag fragmentation and ensure consistency.
- **Character Limits**: System SHOULD gracefully handle or truncate extremely long label names.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to add multiple labels to any campaign entity.
- **FR-002**: Labels MUST be persisted as metadata within the entity's markdown file or the vault configuration.
- **FR-003**: The system MUST provide a visual indicator (badges/tags) for assigned labels in the Entity Detail Panel and Zen Mode.
- **FR-004**: Users MUST be able to filter the Knowledge Graph view by one or more selected labels using "Match Any" (OR) logic.
- **FR-005**: The search system MUST index labels to allow finding entities by their tags.
- **FR-006**: System MUST allow global management of labels, including the ability to rename or delete a label project-wide.

### Key Entities _(include if feature involves data)_

- **Label**: A string identifier used to tag entities for organization (e.g., "Session 1", "Main Quest", "Dead"). All labels are stored and compared in a case-insensitive manner.
- **Entity**: Any campaign node (NPC, Location, etc.) that can host one or more label associations.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can assign or remove a label from an entity in under 3 seconds.
- **SC-002**: Filtering the graph by a specific label updates the visualization in under 100ms (Constitutional Law III).
- **SC-003**: 100% of label data must be available offline and persist across session restarts.
- **SC-004**: Users can filter by multiple labels simultaneously, displaying any entity that matches at least one selected label.