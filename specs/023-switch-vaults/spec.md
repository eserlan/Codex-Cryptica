# Feature Specification: Vault Detachment and Switching

**Feature Branch**: `023-switch-vaults`  
**Created**: 2026-01-30  
**Status**: Draft  
**Input**: User description: "the ability to detach a vault, so i can mount a different (in case of multiple campaigns)"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Detach and Clear Active Vault (Priority: P1)

As a Game Master managing multiple campaigns, I want to be able to "Close" my current vault so that the interface is cleared of all campaign data and ready for a new session or a different campaign.

**Why this priority**: Essential first step to allow switching. Without clearing the current state, campaign data would bleed together.

**Independent Test**: Can be fully tested by clicking "Close Vault" and verifying that the entity count drops to zero and the graph is empty.

**Acceptance Scenarios**:

1. **Given** a vault is currently open and authorized, **When** I click "Close Vault", **Then** the system clears all entities from the store and removes the root directory handle.
2. **Given** a detached state, **When** I view the "Vault" section, **Then** I see the initial "Open Vault" prompt as if I just started the app.

---

### User Story 2 - Mount a Different Campaign (Priority: P2)

As a user with multiple campaign folders, I want to mount a new folder as a vault immediately after detaching the previous one, so I can seamlessly switch contexts.

**Why this priority**: Directly addresses the "mount a different" requirement for multiple campaigns.

**Independent Test**: Can be tested by opening Folder A, detaching it, then opening Folder B and verifying Folder B's content is correctly indexed.

**Acceptance Scenarios**:

1. **Given** I have just detached a vault, **When** I select a new directory via the "Open Vault" picker, **Then** the system initializes the new folder and populates the UI with its entities.

---

### User Story 3 - Persistence of "Empty" State (Priority: P3)

As a user, if I intentionally detach a vault, I want the system to remember that I have no active vault on the next reload, rather than trying to auto-reauthorize the last one.

**Why this priority**: Prevents unexpected data loading and respects the user's explicit action to "detach".

**Independent Test**: Detach a vault, reload the page, and verify the app remains in the "No Vault" state.

**Acceptance Scenarios**:

1. **Given** I have detached my vault, **When** I reload the application, **Then** the system does not attempt to automatically request permission for the previously closed vault.

---

### Edge Cases

- **Unsaved Changes**: How does the system handle a detach request while a "Saving" state is active? (Assumption: System MUST wait for the current save queue to flush or warn the user).
- **Broken Handles**: How does the system handle detaching if the underlying directory was deleted externally?
- **Concurrent Search**: What happens to active search results or Oracle context when the vault is detached? (Assumption: Search index MUST be cleared immediately).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a visible "Close Vault" or "Detach Vault" action in the vault control interface.
- **FR-002**: System MUST clear the internal `entities` store and `inboundConnections` map upon detachment.
- **FR-003**: System MUST clear the FlexSearch index immediately when a vault is detached.
- **FR-004**: System MUST remove any persisted directory references from local browser storage upon explicit detachment.
- **FR-005**: System MUST terminate all active "Watch" or "Sync" processes related to the detached vault.
- **FR-006**: System MUST update the UI state to "No Vault" immediately after detachment.

### Key Entities

- **Vault Handle**: The browser's reference to the local directory.
- **Vault State**: The metadata tracking whether a vault is active, authorized, or detached.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Vault detachment completes in under 500ms.
- **SC-002**: Memory usage (Heap) returns to baseline (within 10% of fresh start) after detaching a vault with 100+ entities.
- **SC-003**: Users can switch from Campaign A to Campaign B in under 10 seconds (excluding human selection time in the file picker).
- **SC-004**: 100% of state (Graph, Search, Oracle context) is cleared upon detachment, ensuring no data bleed between campaigns.