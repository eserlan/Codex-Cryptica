# Feature Specification: Prominent Import Feature

**Feature Branch**: `073-prominent-import`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "make the import feature more prominent https://github.com/eserlan/Codex-Cryptica/issues/445"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Dedicated Archive Importer (Priority: P1)

As a user, I want a dedicated standalone view for importing my existing markdown notes, so that I can perform continuous, high-volume importing without interrupting my main research session.

**Why this priority**: High value for user retention and onboarding. Moving the import feature out of settings and into a focused "importer" view reduces cognitive load and allows for uninterrupted world-building.

**Independent Test**: Click the "IMPORT" button in the Vault Controls; verify a new centered browser window opens with the dedicated Archive Importer.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** I look at the top menu (Vault Controls), **Then** I should see an "Import" button that triggers a popout window.
2. **Given** the importer is open, **When** I look at the layout, **Then** it should be focused (no top menu or site footer) to maximize working space.

---

### User Story 2 - Contextual Access from File Explorer (DEPRECATED)

> **Status**: Deprecated. Removed to reduce header clutter in favor of the primary Vault Controls action.

---

### Edge Cases

- **Popout Blocking**: How does the app handle browsers that block `window.open`? (Assumption: User is prompted to allow popups or use the manual link).
- **Responsive Importer**: The popout window should be responsive and centered on the screen.
- **Duplicate Files**: Handled by existing ImportService logic (e.g., skip or overwrite).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a standalone route at `/import` for the dedicated Archive Importer.
- **FR-002**: System MUST hide global navigation (header/footer) in the `/import` route for maximum focus.
- **FR-003**: System MUST provide a persistent "IMPORT" button in the top navigation menu.
- **FR-004**: [REMOVED] System previously required an "Import" icon button in the Vault Explorer header.
- **FR-005**: All import triggers MUST launch the Archive Importer in a new centered browser window (800x900).
- **FR-006**: System MUST automatically synchronize the vault state across browser windows (e.g., via BroadcastChannel) so that imports completed in the popout instantly appear in the main application window without a manual refresh.

### Key Entities

- **UIStore**: Manages the `openImportWindow` logic and popout state.
- **ImportService**: The service layer that handles the actual file reading and node creation logic.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of users can launch the importer in a single click from the main interface.
- **SC-002**: The importer provides a focused, distraction-free environment (no global menu/footer).
- **SC-003**: The "Import" action is visually consistent with existing primary actions (New Entity, Sync).
- **SC-004**: Users can identify and launch the import action within 5 seconds of opening the top navigation menu.
