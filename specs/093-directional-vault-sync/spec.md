# Feature Specification: Directional Vault Synchronization

**Feature Branch**: `093-directional-vault-sync`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "refine save and load to file operations according to @/home/espen/proj/Codex-Arcana/docs/proposals/096-directional-vault-sync.md"

## Clarifications

### Session 2026-04-25
- Q: How should the system handle partial Load failures? → A: Keep already updated files and mark vault status as "Error" with a list of failed files for user retry.
- Q: Does the "Dirty" state include changes to Maps and Canvases? → A: Any change to Entities, Maps, or Canvases marks the vault as Dirty.
- Q: What should happen to the current bidirectional "SYNC" button logic? → A: Remove bidirectional code entirely; convert existing SYNC button to "SAVE TO FOLDER".

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manual Backup to Folder (Priority: P1)

As a user, I want to explicitly push my internal work to a local folder so that I can maintain an external backup and edit my notes in other applications.

**Why this priority**: High value for data ownership and external tool compatibility. This is the primary "Export" journey.

**Independent Test**: Can be tested by editing an entity in the app and clicking "SAVE TO FOLDER". The changes must appear in the linked filesystem directory.

**Acceptance Scenarios**:

1. **Given** a linked local folder and unsaved internal changes, **When** the user clicks "SAVE TO FOLDER", **Then** the internal state is mirrored to the folder and the button becomes disabled (Clean state).
2. **Given** no local folder is linked, **When** the user views the header, **Then** the Save button is disabled with a tooltip explaining that no folder is connected.

---

### User Story 2 - Refresh from External Edits (Priority: P2)

As a user, I want to pull changes from my local folder into the app so that I can see work I've done in external editors like Obsidian.

**Why this priority**: Necessary for multi-tool workflows. Secondary to saving as the app is the primary source of truth.

**Independent Test**: Can be tested by editing a file in the local folder and triggering "LOAD FROM FOLDER" in the vault selector. The app must reflect the new content.

**Acceptance Scenarios**:

1. **Given** a vault with no pending internal changes, **When** the user triggers "LOAD FROM FOLDER", **Then** the internal archive is updated to match the folder content.
2. **Given** a vault with unsaved internal changes (Dirty), **When** the user triggers "LOAD FROM FOLDER", **Then** a Safety Gate confirmation dialog appears warning of data loss.

---

### User Story 3 - Instant Vault Switching (Priority: P3)

As a user, I want to switch between different campaigns (vaults) instantly without waiting for filesystem synchronization.

**Why this priority**: Improves UX fluidity and responsiveness when managing multiple projects.

**Independent Test**: Can be tested by switching vaults and measuring the time until the new vault's entities are visible.

**Acceptance Scenarios**:

1. **Given** multiple vaults, **When** a user switches vaults, **Then** the app only waits for pending internal saves (400ms buffer) and does not perform any filesystem I/O before displaying the new content.

---

### Edge Cases

- **Vault Switch during Save**: If a user switches vaults while an entity is in the middle of its debounce window, the save must be discarded or routed to the correct (old) vault handle to prevent cross-vault corruption.
- **Lost Folder Link**: If the local folder handle becomes invalid (e.g., permissions dropped), the Save button should guide the user to re-link the folder.
- **Simultaneous Loads**: If multiple maps or canvases are loading during vault switch, they must be handled in parallel to minimize initialization time.
- **Partial Load Failure**: If a Load operation fails midway, the system keeps successfully updated files and displays an "Error" status with a retry option.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a high-visibility "SAVE TO FOLDER" button in the main header.
- **FR-002**: System MUST track "Dirty" state by comparing the last internal modification time with the `lastSavedToFolder` timestamp.
- **FR-003**: The "SAVE TO FOLDER" button MUST only be enabled when the vault is Dirty and a folder is linked.
- **FR-004**: System MUST provide a "LOAD FROM FOLDER" action tucked away in the Vault Selector interface.
- **FR-005**: System MUST implement a "Safety Gate" confirmation dialog when Loading if the current state is Dirty.
- **FR-006**: The synchronization engine MUST support strict directional filtering (Push-only or Pull-only).
- **FR-007**: Vault switching MUST NOT trigger automatic filesystem synchronization.
- **FR-008**: System MUST load maps and canvases in parallel during vault initialization.
- **FR-009**: System MUST ensure that entities are never saved into the wrong vault directory during rapid switches (Vault ID Guard).
- **FR-010**: System MUST save and restore Lore Oracle chat history on a per-vault basis.
- **FR-011**: In the event of a partial Load failure, the system MUST retain partially updated data and report the specific errors to the user.
- **FR-012**: The "Dirty" state tracking MUST encompass changes to Entities, Maps, and Canvases.
- **FR-013**: Existing bidirectional synchronization logic MUST be removed and replaced by the unidirectional Push/Pull model.
- **FR-014**: System MUST include user-facing help documentation in \`help-content.ts\` explaining the new Save/Load operations.

### Key Entities _(include if feature involves data)_

- **Vault**: Represents a distinct campaign/project. Now tracks `lastSavedToFolder` metadata.
- **SyncState**: The operational state of the vault mirroring (Idle, Saving, Loading, Error).
- **OracleChatHistory**: Persistent log of AI interactions, now scoped to a specific Vault.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can back up their entire internal archive to a local folder in a single, deterministic action.
- **SC-010**: Accidental data loss during "Load" operations is reduced to zero through mandatory confirmation gates.
- **SC-011**: Vault switching perceived performance is improved by removing mandatory filesystem checks from the switch flow.
- **SC-012**: Cross-vault data corruption incidents are eliminated by strict Vault ID validation during persistence.
- **SC-013**: Oracle chat context is correctly maintained across 100% of vault switches.
