# Feature Specification: Entity Zen Mode (Full-Screen Edit)

**Feature Branch**: `027-node-read-mode`
**GitHub Issue**: [issue #49](https://github.com/eserlan/Codex-Cryptica/issues/49)
**Created**: 2026-01-31
**Status**: Implemented
**Input**: User description: "Read mode of the node - let's have a modal version of the detail pane with all the info easy readable with a cutnpaste option of the content. Also with the connection linking so we can easily navigate between nodes."
**Evolution**: During implementation, this feature evolved from a read-only modal into a full-screen "Zen Mode" editor to support deep work without context switching.

## User Scenarios & Testing

### User Story 1 - Focused Reading & Navigation (Priority: P1)

As a user, I want to view the details of a node in a spacious, full-screen modal so that I can consume long-form content and explore connections without the visual noise of the graph interface.

**Why this priority**: Core functionality for consumption.

**Independent Test**: Open a node in Zen Mode. Verify layout is spacious (not a side panel). Click a connection. Verify new node loads instantly.

**Acceptance Scenarios**:

1. **Given** a selected node, **When** I trigger "Read/Zen Mode", **Then** a full-screen modal opens with a spacious, multi-column layout.
2. **Given** the modal is open, **When** I click a connected node in the "Connections" sidebar, **Then** the modal content updates to the new node without closing.

### User Story 2 - Full-Screen Editing (Priority: P1)

As a user, I want to edit the node's title, content, and metadata directly within the full-screen view so that I can perform "deep work" (writing/worldbuilding) without feeling cramped by the sidebar.

**Why this priority**: Transforms the feature from a passive viewer to a primary workspace tool.

**Independent Test**: Open Zen Mode. Click "Edit". Change content. Click "Save". Close modal. Verify changes persist in the main graph/sidebar.

**Acceptance Scenarios**:

1. **Given** the modal is in read mode, **When** I click "Edit", **Then** the fields (Title, Image, Content, Lore, Dates) become editable inputs.
2. **Given** I have made changes, **When** I click "Save", **Then** the entity is updated in the vault.
3. **Given** I have unsaved changes, **When** I try to close or navigate away, **Then** I am prompted to confirm discarding changes.

### User Story 3 - Copy Content (Priority: P2)

As a user, I want to easily copy the text content of the node so that I can paste it into other applications.

**Why this priority**: Original user request ("cutnpaste option").

**Independent Test**: Click Copy button. Paste into external doc. Verify text matches.

**Acceptance Scenarios**:

1. **Given** a node is open, **When** I click "Copy Content", **Then** the rendered content is copied to the clipboard.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a trigger to open "Zen Mode" from the standard Entity Detail Panel.
- **FR-002**: The modal MUST provide a tabbed interface ("Status & Data", "Lore & Archives", "Inventory") to organize complex entity data.
- **FR-003**: **Left Column**: MUST display Image, Connections list, and Delete actions.
- **FR-004**: **Main Column**: MUST display Temporal Data (Date/Start/End) and the primary Markdown Content (Chronicle).
- **FR-005**: **Editing**: Users MUST be able to toggle "Edit Mode" to modify Title, Image URL, Temporal Data, Content, and Lore.
- **FR-006**: **Navigation**: Clicking a connection MUST navigate to that node within the modal.
- **FR-007**: **Safety**: The system MUST warn the user if they attempt to close the modal or navigate while having unsaved edits.
- **FR-008**: **Copy**: A dedicated "Copy" button MUST be available in the header.
- **FR-009**: **Keyboard Support**: `Escape` key MUST close the modal (if no unsaved changes).

### Key Entities

- **UI Store**: Manages `readModeNodeId` and modal visibility.
- **Vault Store**: Source of truth for Entity data.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Modal opens in < 100ms.
- **SC-002**: Users can complete a "write -> save" cycle entirely within the modal.
- **SC-003**: Navigation between nodes preserves the modal state (stays open).
- **SC-004**: Unsaved changes are never lost accidentally (0% data loss on navigation/close).
