# Feature Specification: Vault Store Refactor

**Feature Branch**: `068-vault-store-refactor`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Refactor the monolithic VaultStore into modular services and a lean repository pattern."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Robust Entity Management (Priority: P1)

As a user, I want to create, update, and delete entities in my vault with immediate visual feedback, ensuring that my data is saved reliably to disk without blocking the UI.

**Why this priority**: Core CRUD is the most fundamental feature of the application. Breaking this would make the entire system unusable.

**Independent Test**: Can be fully tested by creating a new entity, modifying its content, and verifying that the changes persist after a page reload.

**Acceptance Scenarios**:

1. **Given** an open vault, **When** I create a new "Character" named "Hero", **Then** the entity appears in the sidebar and graph immediately.
2. **Given** a selected entity, **When** I edit its Lore, **Then** the "Saving" status appears briefly, and the data is persisted to OPFS.

---

### User Story 2 - Seamless Local Synchronization (Priority: P2)

As a user, I want to sync my browser-based vault with a local folder on my computer, resolving conflicts and updating the UI automatically as files change on disk.

**Why this priority**: Local sync is a key differentiator for the app (local-first). Its complexity is a primary driver for the current file's bloat.

**Independent Test**: Can be tested by linking a folder, adding a file to that folder externally, and verifying it appears in the app.

**Acceptance Scenarios**:

1. **Given** a linked local folder, **When** I click "Sync", **Then** the system identifies new files, updates changed files, and reports the stats (Created/Updated/Deleted).
2. **Given** a sync conflict, **When** I run "Cleanup Conflicts", **Then** the system squashes history and promotes the latest versions correctly.

---

### User Story 3 - Lean Registry Orchestration (Priority: P3)

As a user, I want to manage multiple vaults, maps, and canvases as distinct domains, ensuring that switching between them is fast and doesn't leak state.

**Why this priority**: Necessary for multi-campaign support. Current state handles this in a unified store, which is increasingly brittle.

**Independent Test**: Can be tested by switching between two vaults and verifying that entities and maps from the old vault are no longer in memory.

**Acceptance Scenarios**:

1. **Given** two existing vaults, **When** I switch from Vault A to Vault B, **Then** the UI reflects Vault B's content and the "vault-switched" event is dispatched.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST isolate OPFS persistence logic into a standalone `VaultRepository`.
- **FR-002**: System MUST isolate local folder synchronization and conflict resolution into a `SyncCoordinator`.
- **FR-003**: System MUST delegate map and canvas metadata management to specialized registry stores.
- **FR-004**: System MUST maintain the `IVaultServices` interface for Dependency Injection (Search, AI).
- **FR-005**: System MUST reduce the `VaultStore` to under 300 lines of code, focusing on UI-facing reactivity and orchestration.
- **FR-006**: System MUST ensure that all existing unit tests in `vault.test.ts` pass after refactoring.

### Key Entities

- **VaultRepository**: Handles low-level entity serialization, OPFS file writes, and chunked file loading.
- **SyncCoordinator**: Manages the `LocalSyncService` interaction, directory handle persistence, and conflict squashing logic.
- **AssetManager**: Handles image blob persistence and URL resolution (including Guest mode fallbacks).
- **VaultStore**: The thin reactive controller coordinating these services for the Svelte UI.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `apps/web/src/lib/stores/vault.svelte.ts` is reduced to under 300 lines.
- **SC-002**: 100% of existing unit tests for vault features continue to pass.
- **SC-003**: All new services (`VaultRepository`, `SyncCoordinator`, `AssetManager`) are independently unit-testable.
- **SC-004**: Memory usage remains stable or decreases when switching between large vaults.
