# Feature Specification: Multi-Campaign Switch

**Feature Branch**: `039-multi-campaign-switch`  
**Created**: 2026-02-12  
**Status**: Draft  
**Input**: User description: "the ability to select and switch between different campaigns using OPFS as primary storage, with optional sync to local filesystem"

## Architecture

**Hybrid Storage**: OPFS is the primary storage engine (no permission prompts, works on mobile). FSA (File System Access API) is used only for optional "Sync to Folder" export/import.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - List and Switch Vaults (Priority: P1)

As a Game Master, I want to see a list of all my vaults stored in the browser and switch between them instantly so I can manage different game worlds without losing my place.

**Why this priority**: Core value of the feature. Without listing and switching, multi-vault support doesn't exist.

**Independent Test**: Create two vaults; verify both appear in a list and selecting one accurately loads its specific entities and connections.

**Acceptance Scenarios**:

1. **Given** multiple vaults exist in storage, **When** I open the vault selector, **Then** I see all vault names listed with entity counts and last-opened dates.
2. **Given** I am in "Vault A", **When** I select "Vault B" from the list, **Then** the UI updates to show "Vault B" data and the active vault name changes in the header.

---

### User Story 2 - Create New Vault (Priority: P1)

As a user starting a new game, I want to create a fresh, empty vault so I can begin building a new world from scratch.

**Why this priority**: Essential for onboarding and starting new projects.

**Independent Test**: Click "Create New", provide a name, and verify a new empty workspace is initialized and set as active.

**Acceptance Scenarios**:

1. **Given** the vault list is open, **When** I click "New Vault" and provide a name, **Then** a new vault is created in OPFS and automatically loaded.

---

### User Story 3 - Manage Vault Metadata (Rename/Delete) (Priority: P2)

As my collection of vaults grows, I want to rename them for better organization or delete old ones I no longer need.

**Why this priority**: Important for long-term maintainability and storage management.

**Independent Test**: Rename a vault and verify the list updates; delete a vault and verify it is removed from storage.

**Acceptance Scenarios**:

1. **Given** a vault exists, **When** I choose "Rename" and enter a new title, **Then** the vault reflects that title in all UI elements.
2. **Given** a vault is selected for deletion, **When** I confirm the action, **Then** all files associated with that vault are removed from OPFS.

---

### User Story 4 - Sync Vault to Local Filesystem (Priority: P3)

As a user who wants to back up or externally edit my vault data, I want to sync my current vault to a local folder so I can access the files outside the browser.

**Why this priority**: Nice-to-have for power users; OPFS handles primary storage.

**Independent Test**: Click "Sync to Folder", select a directory, verify all vault files appear in the selected folder.

**Acceptance Scenarios**:

1. **Given** a vault is active, **When** I click "Sync to Folder" and choose a directory, **Then** all `.md` files and images are written to that directory.
2. **Given** I have edited files externally, **When** I click "Import from Folder", **Then** the changes are loaded back into the OPFS vault.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST use OPFS as the primary storage engine, with each vault in its own subdirectory.
- **FR-002**: System MUST provide a dedicated modal interface to view, create, and switch between all available vaults.
- **FR-003**: System MUST allow the user to trigger a switch to any available vault without a full page reload.
- **FR-004**: System MUST persist the "Last Active Vault" so it loads automatically on return visits.
- **FR-005**: System MUST allow creating a new vault with a user-defined name.
- **FR-007**: System MUST initialize new vaults as empty by default (no direct import during creation).
- **FR-008**: System MUST maintain the terminology "Vault" throughout the user interface for consistency.
- **FR-009**: System SHOULD provide optional FSA-based sync (export and import) to a user-selected local folder.
- **FR-010**: System MUST close the current vault cleanly (clear state, services, caches) before switching.

### Key Entities _(include if feature involves data)_

- **Vault**: A collection of Markdown files, images, and metadata stored in a dedicated OPFS subdirectory. Attributes include: `id` (slug), `name` (display title), `createdAt`, `lastOpenedAt`, `entityCount`.
- **Vault Registry**: An IndexedDB store tracking vault metadata for quick listing without OPFS traversal.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Switching between vaults takes less than 500ms for vaults with up to 100 nodes.
- **SC-002**: Users can create a new vault and see the empty graph in under 3 clicks.
- **SC-003**: 100% of data remains isolated; entities from Vault A never appear when Vault B is active.
- **SC-004**: Vault names are accurately persisted and survive browser restarts.
- **SC-005**: App works fully offline on mobile without FSA permission issues.
