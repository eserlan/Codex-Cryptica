# Feature Specification: Add to Canvas in Context Menu

**Feature Branch**: `076-add-canvas-context-menu`
**Created**: 2026-03-27
**Status**: Merged
**Input**: Issue #470 - When entities are selected in the graph, allow users to easily add them to existing or new canvas

## User Scenarios & Testing

### User Story 1 - Add Selected Entity to Existing Canvas (Priority: P1)

As a user viewing the graph, I want to right-click on a selected entity and quickly add it to an existing canvas, so I can organize related entities without manually searching for them.

**Why this priority**: This is the core use case that provides immediate value. Users frequently want to group entities they discover while exploring the graph.

**Independent Test**: Can be fully tested by selecting a single entity, right-clicking, choosing "Add to Canvas", selecting an existing canvas, and verifying the entity appears on that canvas.

**Acceptance Scenarios**:

1. **Given** an entity is selected in the graph view, **When** user right-clicks and selects "Add to Canvas" → an existing canvas, **Then** the entity is added to that canvas and a confirmation is shown
2. **Given** an entity is already on the target canvas, **When** user adds it again, **Then** the system skips the duplicate and notifies the user
3. **Given** multiple canvases exist, **When** user selects "Add to Canvas", **Then** a list of recent canvases is shown for selection

---

### User Story 2 - Add Multiple Selected Entities to Canvas (Priority: P2)

As a user who has selected multiple entities in the graph, I want to add all of them to a canvas in one action, so I can quickly capture a group of related entities.

**Why this priority**: Multi-select is a common workflow when users discover related entities. Adding them one-by-one would be tedious.

**Independent Test**: Can be tested by selecting 3+ entities, right-clicking, choosing "Add to Canvas", and verifying all selected entities appear on the target canvas.

**Acceptance Scenarios**:

1. **Given** 5 entities are selected, **When** user right-clicks and chooses "Add to Canvas" → existing canvas, **Then** all 5 entities are added and user sees "Added 5 entities to [Canvas Name]"
2. **Given** 3 entities selected where 1 is already on the target canvas, **When** user adds to canvas, **Then** 2 new entities are added, 1 duplicate is skipped, and user sees summary notification

---

### User Story 3 - Create New Canvas from Selection (Priority: P3)

As a user who has selected entities, I want to create a new canvas containing those entities, so I can start organizing a new collection without extra steps.

**Why this priority**: Users often discover entity groups that don't fit existing canvases. Creating a new canvas should be as easy as adding to existing ones.

**Independent Test**: Can be tested by selecting entities, right-clicking, choosing "Create New Canvas", entering a name, and verifying the new canvas exists with all selected entities.

**Acceptance Scenarios**:

1. **Given** entities are selected, **When** user chooses "Create New Canvas", **Then** user is prompted for a canvas name (via browser prompt for P1, modal for final) and the new canvas is created with selected entities
2. **Given** user cancels the name prompt, **When** creating new canvas, **Then** no canvas is created and user returns to graph view
3. **Given** no canvases exist yet, **When** user right-clicks selected entities, **Then** "Create New Canvas" is the primary option shown

---

### Edge Cases

- What happens when the target canvas is currently open in another tab? → Entity is added to storage; active tabs will see updates via reactive state synchronization (Vault Registry).
- How does system handle entities already on the canvas? → Skip duplicates, notify user in summary.
- What if the user has no canvases yet? → Show "Create New Canvas" as the only option.
- What if the canvas is at capacity (if limits exist)? → Show error message "Canvas is full".
- What happens if network/storage fails during add? → Show error toast, entity not added, user can retry.
- **Layout of added entities**: Multiple entities added at once are spread out in a grid (3 items per row, 250px spacing) starting from the center-ish area (400, 300) or appended to the existing grid to avoid overlapping.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display "Add to Canvas" option in the graph entity context menu when one or more entities are selected
- **FR-002**: System MUST show a list of up to 5 most recently modified canvases in the context menu submenu
- **FR-003**: System MUST provide "Choose Canvas..." option which opens the full search modal, preserving the selection for the "Add" operation
- **FR-004**: System MUST provide "+ New Canvas" option to create a canvas from the selection
- **FR-005**: System MUST add all selected entities to the target canvas in a single operation
- **FR-006**: System MUST skip entities that are already on the target canvas (no duplicates)
- **FR-007**: System MUST display a confirmation notification showing how many entities were added and to which canvas
- **FR-008**: System MUST notify user if any entities were skipped due to being duplicates
- **FR-009**: System MUST prompt for canvas name when creating a new canvas, with a sensible default name (e.g., "5 entities")
- **FR-010**: System MUST allow user to cancel canvas creation without any changes being made
- **FR-011**: System MUST handle errors gracefully (storage failure, etc.) and display appropriate error message
- **FR-012**: System MUST support keyboard navigation for context menu (arrow keys, Enter to select, Escape to cancel)
- **FR-013**: System MUST spread out multiple newly added entities in a grid layout to prevent overlapping state.

### Key Entities

- **Selected Entity**: An entity currently highlighted/selected in the graph view, identified by unique entity ID
- **Canvas**: A user-created collection that can contain multiple entities for organization and visualization purposes
- **Context Menu**: Right-click menu that appears near the selected entity/selection in the graph view

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can add a selected entity to an existing canvas in 2 clicks or fewer (right-click → select canvas)
- **SC-002**: Users can add multiple selected entities (5+) to a canvas in under 5 seconds total
- **SC-003**: Users can create a new canvas from selection in under 10 seconds (including naming)
- **SC-004**: 95% of users successfully complete the "add to canvas" action on first attempt without errors
- **SC-005**: System handles duplicate detection with zero data loss (no entities lost, no unintended duplicates created)
- **SC-006**: Context menu appears within 200ms of right-click action
- **SC-007**: All keyboard navigation actions (arrow keys, Enter, Escape) respond within 100ms
