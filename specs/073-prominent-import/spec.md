# Feature Specification: Prominent Import Feature

**Feature Branch**: `073-prominent-import`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "make the import feature more prominent https://github.com/eserlan/Codex-Cryptica/issues/445"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Quick Access from Top Menu (Priority: P1)

As a user, I want to be able to import my existing markdown notes directly from the top menu (Vault Controls), so that I can quickly populate my vault without diving into deep settings menus.

**Why this priority**: High value for user retention and onboarding. The import feature is currently "hidden" in settings, which creates friction for users wanting to bring their data into the app. The top menu is the primary global action area.

**Independent Test**: Can be fully tested by clicking the "Import" button in the Vault Controls and verifying the file picker opens and processes files.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** I look at the top menu (Vault Controls), **Then** I should see an "Import" button near the "New Entity" or "Sync" actions.
2. **Given** the app is in mobile view, **When** I open the controls, **Then** the Import action should be clearly visible.

---

### User Story 2 - Contextual Access from File Explorer (Priority: P2)

As a user managing my files in the Vault Explorer, I want an import action right in the explorer header, so that I can add files to my current context.

**Why this priority**: Provides contextual relevance. Users in the file explorer are already in a "management" mindset.

**Independent Test**: Can be tested by clicking the icon in the explorer header and verifying it triggers the import workflow.

**Acceptance Scenarios**:

1. **Given** the Vault Explorer is visible, **When** I view the header actions, **Then** I should see an "Import" icon button next to the "New Node" icon.

---

### User Story 3 - Onboarding from Empty State (Priority: P1)

As a new user with an empty vault, I want to see "Import" as a primary onboarding action, so that I know how to get started with my existing data.

**Why this priority**: Critical for "Day 0" experience. An empty screen is a dead end without clear calls to action.

**Independent Test**: Can be tested by creating a new empty vault and verifying the empty state UI appears with prominent "Import" and "Create" buttons.

**Acceptance Scenarios**:

1. **Given** a vault with no nodes, **When** I open the File Explorer, **Then** I should see a helpful message and two primary buttons: "Create New Node" and "Import Markdown".

---

### Edge Cases

- **Mobile View**: Button should handle tight spacing by collapsing to icon-only if necessary, but remain prominent in the expanded menu.
- **Importing Large Volumes**: The UI should utilize the `ImportProgress` component to show feedback during long imports.
- **Duplicate Files**: Handled by existing ImportService logic (e.g., skip or overwrite).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a persistent "Import" button in the global Vault Controls (top menu).
- **FR-002**: System MUST provide an "Import" icon button in the Vault Explorer header.
- **FR-003**: System MUST display an "Import Markdown" call-to-action in the File Explorer when the current vault is empty.
- **FR-004**: Actions MUST trigger the existing `ImportService` or equivalent file-system import logic.
- **FR-005**: The top menu button MUST be visually consistent with the "New Entity" and "Sync" buttons.
- **FR-006**: System SHOULD support deep-linking to the "Archive Ingestion" section of the Vault settings.

### Key Entities

- **Vault**: The container for all nodes; used to determine if the "Empty State" should be shown.
- **ImportService**: The service layer that handles the actual file reading and node creation logic.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of users can trigger an import action from the top menu in exactly one click.
- **SC-002**: New users with empty vaults are presented with the Import option immediately upon opening the explorer.
- **SC-003**: The "Import" action is visually consistent with existing primary actions (New Entity, Sync).
- **SC-004**: Users can identify the primary import action within 5 seconds of arriving at an empty graph state.
