# Technical Research: GDrive Multi-Vault Support

## 1. Vault Registry Data Structure

**Decision**: Update the IndexedDB `vault_registry` store to include `gdriveFolderId` (string | null) and `gdriveSyncEnabled` (boolean).
**Rationale**: FR-001 requires storing unique IDs per vault. Existing `idb` wrapper handles the metadata.
**Alternatives considered**: Storing this in a separate `sync_config` store, but keeping it in the vault registry ensures atomicity when a vault is created or deleted.

## 2. Sync State Tracking

**Decision**: Extend the `vault_registry` with a `syncState` object: `{ lastSyncMs: number, remoteHash: string }`.
**Rationale**: FR-004 requires per-vault last-modified markers and hashes.
**Alternatives considered**: A dedicated table for sync logs. Deemed too complex (YAGNI) for just needing the latest state.

## 3. Active Vault Isolation

**Decision**: The sync engine (`SyncManager` or equivalent) will dynamically read the `gdriveFolderId` of the _currently active vault_ (retrieved from the active vault store/context) before executing any pull/push operations.
**Rationale**: FR-003 requires isolating operations. Relying on the active vault context ensures we never push Vault A's data to Vault B's folder.
**Alternatives considered**: Passing the folder ID as an argument to every sync function. This is good practice, but the engine should internally resolve the current context if not provided.

## 4. Conflict Detection

**Decision**: When linking a vault to an existing GDrive folder, query the local `vault_registry` to see if any _other_ local vault already has that `gdriveFolderId`. If true, block the linkage and show an error.
**Rationale**: Satisfies User Story 3 (Conflict Detection).
**Alternatives considered**: Adding a hidden `.codex_vault_id` file inside the GDrive folder to strictly lock it to a local ID. This is a robust future enhancement, but simple local-registry checking handles the immediate User Story 3 requirements.

## 5. UI Updates

**Decision**: Update the vault selection/management UI in Svelte 5 (using runes) to reflect the `gdriveSyncEnabled` status. Modify the settings panel where GDrive is authenticated to allow selecting a folder _specifically_ for the active vault.
**Rationale**: FR-005 requires viewing the sync status independently.

## Constitution Alignment Check

- **Privacy & Client-Side Processing**: Data remains local (IndexedDB/OPFS) until explicitly synced to the user's personal GDrive. No intermediary servers.
- **Simplicity & YAGNI**: We are extending the existing `vault_registry` rather than building a complex new relational mapping system.
