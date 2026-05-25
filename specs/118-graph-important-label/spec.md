# Feature Specification: Graph Important Label

**Feature Branch**: `118-graph-important-label`
**Created**: 2026-05-25
**Status**: Draft
**Input**: User description: "Graph context menu to indicate importance. If some entities in the graph are more important than others, there should be a way to visually indicate that other than the number of connections. Provide an #important label that can be easily applied via the right-click context menu, in addition to existing label workflows."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Mark a Graph Entity Important (Priority: P1)

As a user reviewing the graph, I want to mark one entity as important directly from its graph context menu, so I can make key lore visually stand out without leaving the graph.

**Why this priority**: This is the smallest useful workflow and directly addresses the need to apply importance from the graph.

**Independent Test**: Open the graph context menu for one editable entity, choose the importance action, and verify the entity gains the `important` label and becomes visually distinct in the graph.

**Acceptance Scenarios**:

1. **Given** an editable graph entity without the `important` label, **When** the user opens its context menu and chooses the importance action, **Then** the entity is labeled `important` and its graph node becomes visually distinct from non-important nodes.
2. **Given** an editable graph entity already labeled `important`, **When** the user chooses the importance action again, **Then** the entity remains labeled once, remains visually distinct, and the user receives clear feedback that no duplicate label was added.

---

### User Story 2 - Mark Selected Graph Entities Important (Priority: P2)

As a user working with several selected graph entities, I want to mark all selected entities as important from the context menu, so I can quickly flag a group of central entities.

**Why this priority**: Multi-select graph actions already exist, and importance should work with the same selection model to avoid repetitive work.

**Independent Test**: Select multiple editable graph entities, open the graph context menu, choose the importance action, and verify each selected entity gains the `important` label and a distinct graph treatment.

**Acceptance Scenarios**:

1. **Given** multiple editable graph entities are selected and at least one is not labeled `important`, **When** the user chooses the importance action, **Then** all selected entities are labeled `important`, visually stand out in the graph, and the user sees how many entities changed.
2. **Given** multiple selected entities are already labeled `important`, **When** the user chooses the importance action, **Then** no labels are duplicated and the user receives clear no-change feedback.

---

### User Story 3 - Respect Read-Only Graph Sessions (Priority: P3)

As a guest or read-only user, I should not see or use graph actions that change labels, so shared vaults stay unchanged.

**Why this priority**: The app already separates editable and guest graph actions; importance labeling must preserve that data safety boundary.

**Independent Test**: Open the graph context menu in a read-only or guest session and verify the importance action is unavailable.

**Acceptance Scenarios**:

1. **Given** the graph is in a guest or read-only session, **When** the user opens an entity context menu, **Then** the importance action is not available.

### Edge Cases

- If no graph nodes are selected when the action runs, no label changes are made.
- If some selected entities already have the `important` label, only entities missing the label are changed.
- If labels are hidden or filtered, important entities must still have a graph-level visual treatment that does not depend only on label text being visible.
- If label persistence fails, the user receives an error and the context menu closes without implying success.
- The applied label is normalized consistently with existing label behavior.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The graph entity context menu MUST provide a clear action for marking editable entities as important.
- **FR-002**: The importance action MUST apply the `important` label through the same label model used by existing entity labels.
- **FR-003**: The importance action MUST support the current graph selection: one entity when only the clicked entity is targeted, or all selected entities when the clicked entity is part of a multi-selection.
- **FR-004**: The system MUST prevent duplicate `important` labels on the same entity.
- **FR-005**: Entities with the `important` label MUST be visually distinct in the graph from otherwise similar non-important entities.
- **FR-006**: The visual distinction MUST remain available even when graph label text is hidden.
- **FR-007**: The system MUST show clear success feedback when one or more entities are newly marked important.
- **FR-008**: The system MUST show clear no-change feedback when all targeted entities are already marked important.
- **FR-009**: The importance action MUST be unavailable in guest or read-only graph sessions.
- **FR-010**: The system MUST show clear error feedback if applying the label fails.

### Key Entities _(include if feature involves data)_

- **Entity**: A graph node's underlying lore record. It can have zero or more labels.
- **Label**: A normalized text marker attached to an entity. This feature uses the existing `important` label value.
- **Graph Selection**: The set of graph entities targeted by context-menu actions.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can mark a single editable graph entity as important in one context-menu action.
- **SC-002**: A user can mark multiple selected graph entities as important in one context-menu action.
- **SC-003**: Repeating the action on entities already marked important does not create duplicate labels.
- **SC-004**: Important entities are visually distinguishable from non-important entities in the graph without relying solely on connection count or visible label text.
- **SC-005**: Guest or read-only sessions provide no path from the graph context menu to modify importance labels.
- **SC-006**: Users receive visible feedback for success, no-change, and failure outcomes.
