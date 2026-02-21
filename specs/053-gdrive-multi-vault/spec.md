# Feature Specification: GDrive Multi-Vault Support

**Feature Branch**: `053-gdrive-multi-vault`  
**Created**: 2026-02-21  
**Status**: Draft  
**Input**: User description: "gdrive support for multiple vaults https://github.com/eserlan/Codex-Cryptica/issues/44"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Linking Multiple Vaults to Google Drive (Priority: P1)

As a user with multiple campaigns (vaults), I want to link each of them to my Google Drive account so that I can keep all my worlds synchronized across devices.

**Why this priority**: Core functionality that resolves the limitation of only being able to sync a single vault.

**Independent Test**: Can be tested by creating two local vaults and successfully enabling Google Drive sync for both, verifying that each maps to a distinct folder/ID on GDrive.

**Acceptance Scenarios**:

1. **Given** a user has one vault already syncing to GDrive, **When** they switch to a second local vault and enable GDrive sync, **Then** the system should prompt them to select or create a new folder on GDrive specifically for this second vault.
2. **Given** two vaults are linked to GDrive, **When** the user modifies content in Vault A, **Then** only Vault A's remote backup should be updated, leaving Vault B untouched.

---

### User Story 2 - Automated Sync Switching (Priority: P2)

As a user who frequently switches between campaigns, I want the Google Drive sync engine to automatically target the correct remote folder whenever I switch my active vault.

**Why this priority**: Essential for a seamless multi-vault experience without manual reconfiguration after every switch.

**Independent Test**: Can be tested by switching from Vault A to Vault B and performing a sync operation, verifying that it uses Vault B's specific GDrive metadata.

**Acceptance Scenarios**:

1. **Given** Vault A and Vault B are both configured for GDrive sync, **When** the user switches the active vault to Vault B, **Then** the GDrive status indicator should reflect the sync state of Vault B.
2. **Given** the active vault is Vault B, **When** a sync is triggered, **Then** the system must use the GDrive folder ID associated with Vault B.

---

### User Story 3 - Conflict Detection Across Vaults (Priority: P3)

As a user, I want to be warned if I try to link a local vault to a GDrive folder that is already being used by a different local vault.

**Why this priority**: Prevents data corruption and accidental merging of unrelated campaign data.

**Independent Test**: Can be tested by attempting to point a new local vault to an existing GDrive "Codex" folder that is already bound to another local vault ID.

**Acceptance Scenarios**:

1. **Given** GDrive folder "Campaign 1" is linked to Local Vault ID "LV-123", **When** a user tries to link "Campaign 1" to Local Vault ID "LV-456", **Then** the system should display a warning or block the action.

---

### Edge Cases

- **What happens when a user deletes a vault locally?** The GDrive metadata for that vault should be cleaned up, but the remote files should likely remain on GDrive unless explicitly deleted.
- **How does the system handle revoked GDrive permissions?** It should gracefully disable sync for ALL vaults and prompt for re-authorization.
- **What if the GDrive folder is renamed?** The system should ideally track by ID rather than name, or provide a way to "re-locate" the vault folder.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store unique Google Drive folder IDs for each registered vault in the local metadata (IndexedDB).
- **FR-002**: System MUST allow the user to select an existing GDrive folder or create a new one when enabling sync for a vault.
- **FR-003**: The sync engine MUST isolate operations to the folder ID associated with the currently active vault.
- **FR-004**: System MUST maintain separate sync "last-modified" markers and hashes for each vault.
- **FR-005**: Users MUST be able to view the GDrive sync status (Linked/Not Linked/Syncing) independently for each vault in the vault management UI.

### Key Entities _(include if feature involves data)_

- **Vault Registry**: Metadata record for each vault, now extended to include `gdriveFolderId` and `gdriveSyncEnabled`.
- **Sync State**: A per-vault record of the last successful sync time and remote state hash.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can successfully link 3+ independent vaults to the same Google Drive account without data crossover.
- **SC-002**: Switching between two linked vaults takes less than 2 seconds to update the sync status indicator.
- **SC-003**: 100% of sync operations target the correct remote folder ID associated with the active vault.
- **SC-004**: Zero instances of data corruption or file mixing between distinct vaults during concurrent local/remote updates.
