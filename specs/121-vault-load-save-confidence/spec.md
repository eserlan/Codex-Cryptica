# Feature Specification: Vault Load/Save Confidence

**Feature Branch**: `121-vault-load-save-confidence`  
**Created**: 2026-05-26  
**Status**: Draft  
**Input**: User description: "Vault Load/Save Confidence. Goal: Make vault folder operations more understandable, interrupt-safe, and observable without exposing implementation terminology."

## Clarifications

### Session 2026-05-26

- Q: In the Vault Switcher modal list, should we query and display the "needs-permission" state and "Grant Access" action for all listed vaults, or only for the currently active vault? → A: Only for the currently active vault.
- Q: If a folder handle is stored but permission is not granted, and the user cancels/denies the permission prompt, how should the application respond? → A: Retain the "needs-permission" status and show a temporary warning/error notification (do not delete the handle).
- Q: When a vault switch save-drain timeout fires (after 5 seconds), what logging or notification should we trigger? → A: Log a warning to the console and proceed silently with the vault switch.
- Q: When the vault status is "saved", what should happen if the user makes a new edit during the 3-second window? → A: Immediately interrupt the 3-second timer, revert the status to "idle", and mark the vault as dirty.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Silent Vault Load on Missing Permission (Priority: P1)

When the application loads or switches to a vault that has a linked local directory, it should silently verify if permissions are granted. If the browser requires user activation to re-grant permission (which is typical when starting a new session), the app must NOT request permission automatically or trigger directory pickers. It should instead load the vault using local cached data (OPFS) and visually indicate that the linked folder is locked/needs permission.

**Why this priority**: Crucial for a smooth, crash-free app startup. Prevents browser security exceptions and distracting automatic picker prompts when user interaction hasn't occurred yet.

**Independent Test**: Can be tested independently by loading a vault with a linked directory whose permission state is expired (requires prompt), verifying that the vault opens successfully using OPFS cache and no prompt or console error is generated.

**Acceptance Scenarios**:

1. **Given** a vault with a linked local folder and permission state of "prompt required", **When** the vault is opened/loaded on startup, **Then** the local directory pull is skipped, OPFS cache is loaded, status is set to "needs-permission", and no error dialog or permission prompt appears.
2. **Given** a vault with a linked local folder and permission state of "already granted", **When** the vault is opened/loaded on startup, **Then** the local directory pull runs automatically and completes successfully.

---

### User Story 2 - User-Triggered Permission Grant and Save (Priority: P1)

When the vault status is "needs-permission", the UI displays a clear "GRANT ACCESS" action. When clicked (a valid user gesture), the application requests read-write permission for the linked directory. If the user grants it, the app proceeds with loading or saving and transitions back to idle.

**Why this priority**: Essential to allow the user to reconnect their linked folder in a single click and resume local load/save workflows.

**Independent Test**: Can be tested by clicking the "GRANT ACCESS" button when status is "needs-permission", accepting the browser prompt, and verifying that the folder operation completes.

**Acceptance Scenarios**:

1. **Given** status is "needs-permission", **When** the user clicks "GRANT ACCESS" and accepts the browser permission prompt, **Then** the app saves/loads the vault to/from the local folder and transitions to idle.
2. **Given** status is "needs-permission", **When** the user clicks "GRANT ACCESS" and denies the browser permission prompt, **Then** the status remains "needs-permission" and an error notification is shown without triggering a folder picker.

---

### User Story 3 - Transient "Saved" Success Feedback (Priority: P2)

When a save operation completes successfully, the status transitions to "saved" for 3 seconds, showing a clear, reassuring visual confirmation ("SAVED" with a checkmark) before reverting to "idle".

**Why this priority**: Builds user confidence that changes have been safely written to their local disk, reducing anxiety.

**Independent Test**: Can be tested by executing "Save to Folder" and observing the success label appear for exactly 3 seconds.

**Acceptance Scenarios**:

1. **Given** a save to folder is initiated, **When** the write operations complete successfully, **Then** the status changes to "saved", displays a success checkmark for 3 seconds, and then automatically returns to "idle".

---

### User Story 4 - Non-blocking Vault Switch Timeout (Priority: P1)

When switching vaults, the application flushes pending changes. If the flush operation is hung or takes a long time, the switch must not block indefinitely. A timeout will force-drain the queue after 5 seconds and proceed with the vault switch.

**Why this priority**: Prevents the UI from locking up permanently when background writes hang.

**Independent Test**: Can be tested by initiating a vault switch while simulating a stuck write queue, verifying that the vault switch proceeds anyway after 5 seconds.

**Acceptance Scenarios**:

1. **Given** pending saves are flushing during a vault switch, **When** the saves do not complete within 5 seconds, **Then** a warning is logged and the vault switch proceeds, clearing memory and loading the new vault.

---

### Edge Cases

- **Linked Folder Deleted/Moved**: If the browser returns a file-not-found error when checking the local folder handle, the app should delete the handle from settings, clear the status to idle, and display a helpful warning instructing the user to select/re-link a folder.
- **Permission Prompt Cancelled**: If the user cancels the permission prompt, the status should return to "needs-permission" with an error message, but the linked directory handle must not be deleted.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST query linked folder permissions silently on vault load without requesting permission.
- **FR-002**: System MUST transition status to "needs-permission" when a folder handle is stored but permission is not granted.
- **FR-003**: System MUST show a high-contrast action-oriented "GRANT ACCESS" button in the UI when status is "needs-permission".
- **FR-004**: System MUST request permission on user-triggered actions (load/save/grant click) and handle success and rejection cleanly.
- **FR-005**: System MUST transition status to "saved" for 3 seconds after a successful folder save, unless interrupted by a new edit, which MUST immediately revert the status to "idle".
- **FR-006**: System MUST limit the time spent flushing pending saves during a vault switch to a maximum of 5 seconds, proceeding with the switch even if saves are still pending.
- **FR-007**: System MUST replace remaining user-facing references to "sync" with directional "load/save/link" terms in user notifications and tooltips.
- **FR-008**: System MUST only query and display the permission warning and action for the currently active vault in the Vault Switcher list.

### Key Entities

- **SyncStore Status**: Reactive state indicating current load/save operation status ("idle", "loading", "saving", "saved", "needs-permission", "error").
- **VaultRecord**: Persisted metadata for the vault including folder handle storage and change timestamps.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Vault switches and initial page loads never throw browser SecurityErrors or prompt for permissions automatically.
- **SC-002**: A vault switch takes at most 5 seconds even if write operations are stuck.
- **SC-003**: Users can clearly identify if they need to grant access and can do so in a single click.
