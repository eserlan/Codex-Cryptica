# Feature Specification: Delete Nodes and Entities

**Feature Branch**: `024-delete-nodes`  
**Created**: 2026-01-31  
**Status**: Draft  
**Input**: User description: "i need a way to delete nodes"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Node Deletion (Priority: P1)

As a lore builder, I want to be able to delete an entity that is no longer relevant to my campaign, so that my workspace remains clean and organized.

**Why this priority**: Core functionality requested by the user. Essential for data management.

**Independent Test**: Can be fully tested by creating a dummy node, selecting it, clicking the "Delete" button in the details panel, confirming the action, and verifying that the node is removed from both the graph and the file system.

**Acceptance Scenarios**:

1. **Given** an entity is selected in the UI, **When** I click the "Delete" button and confirm, **Then** the entity's Markdown file is removed from the local vault.
2. **Given** an entity with an associated image, **When** the entity is deleted, **Then** the image and thumbnail files are also removed from the images directory.
3. **Given** a deleted entity, **When** the graph updates, **Then** the corresponding node and all its connected edges are removed from the visualization.

---

### User Story 2 - Safe Deletion with Confirmation (Priority: P2)

As a user, I want to be prompted for confirmation before a node is permanently deleted, so that I don't accidentally lose important lore.

**Why this priority**: Prevents accidental data loss, which is critical for a world-building tool.

**Independent Test**: Click "Delete" on a node and verify that a confirmation dialog appears before any destructive action is taken.

**Acceptance Scenarios**:

1. **Given** I click "Delete", **When** the confirmation prompt appears and I click "Cancel", **Then** the entity remains in the vault and the UI state is unchanged.

---

### User Story 3 - Cleanup of Orphaned Edges (Priority: P3)

As a system, when a node is deleted, I want to ensure that all edges pointing to or from that node are also removed from the internal state, so that the data model remains consistent.

**Why this priority**: Maintains data integrity. Orphaned edges can cause crashes or inconsistent graph behavior.

**Independent Test**: Create a connection between Node A and Node B. Delete Node A. Verify that Node B no longer has a connection to Node A in its metadata or visualization.

**Acceptance Scenarios**:

1. **Given** Node A has connections to other nodes, **When** Node A is deleted, **Then** all inbound and outbound connections for Node A are purged from the `inboundConnections` map and other entities' metadata.

---

### Edge Cases

- **Deleting the currently viewed node**: The UI should gracefully close the detail panel and reset the selection state.
- **Deleting a node with high connectivity (> 100 edges)**: Ensure the system handles the batch cleanup using non-blocking background tasks without stuttering the UI.
- **File System Errors**: Handle cases where the Markdown file cannot be deleted (e.g., file lock, external deletion).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a "Delete" action within the `EntityDetailPanel`.
- **FR-002**: System MUST display a confirmation dialog before proceeding with deletion.
- **FR-003**: System MUST remove the corresponding Markdown file from the local directory handle.
- **FR-004**: System MUST remove the entity from the active campaign state.
- **FR-005**: System MUST update the relational data model to remove all references to the deleted entity.
- **FR-006**: System MUST remove the entity from the searchable index immediately.
- **FR-007**: System MUST close the `EntityDetailPanel` if the deleted entity was the one being viewed.
- **FR-008**: System MUST delete the associated image and thumbnail files from the local storage if referenced in the entity metadata.
- **FR-009**: System MUST delete the previously associated image and thumbnail files when they are replaced by new assets for the same entity.

### Key Entities

- **Entity**: The lore record (NPC, Location, etc.) being deleted.
- **Connection**: The relational edges that must be purged along with the entity.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: UI feedback (panel closure and graph update) occurs in under 100ms; full disk and relational cleanup completes in under 500ms.
- **SC-002**: 100% of orphaned edges are removed from the system state upon node deletion.
- **SC-003**: Users must confirm the action at least once for any destructive operation.
- **SC-004**: Disk space is reclaimed immediately (file is removed from the vault).