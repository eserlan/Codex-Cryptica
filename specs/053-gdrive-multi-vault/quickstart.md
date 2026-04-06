# Quickstart: GDrive Multi-Vault Support

## Overview

This feature enables users to connect multiple local vaults (campaigns) to independent Google Drive folders. The system will track sync state and folder IDs per vault in the local IndexedDB metadata registry.

## Key Changes

1. **Vault Registry Update**: `VaultMetadata` in `packages/schema` now includes `gdriveFolderId` and `gdriveSyncEnabled`.
2. **Sync Engine Context**: The sync operations must now be invoked with the specific `gdriveFolderId` associated with the currently active vault.
3. **Conflict Detection**: Linking a new vault checks if the selected GDrive folder is already claimed by another local vault ID.
4. **UI**: The Svelte 5 vault manager/settings panel will display per-vault sync status and allow connecting/disconnecting each one individually.

## Implementation Steps

### 1. Update Schema & Registry

- Modify the `VaultMetadata` interface to include the new fields.
- Ensure the `idb` initialization script or schema definition handles these new fields (migration strategy if necessary, though typical IndexedDB implementations handle missing fields gracefully by returning `undefined`).

### 2. Refactor Sync Engine

- Update the sync service/engine to accept a `SyncEngineContext` containing the `gdriveFolderId`.
- Replace any hardcoded or globally-stored Google Drive folder ID with this per-vault context.
- Implement `linkVaultToDrive` and `unlinkVaultFromDrive` methods.

### 3. Svelte 5 UI Updates

- **Vault Manager**: Add an icon or status indicator showing if a vault is linked to GDrive.
- **Settings Panel**: Modify the GDrive auth section. Instead of a global "Sync to GDrive" toggle, it should now act on the _currently active vault_. Add a folder picker/creator specifically for the active vault.

### 4. Conflict Handling

- When the user selects a GDrive folder, query the local `vault_registry` using `idb` to ensure the selected folder ID is not already present in another vault's metadata.

## Testing Strategy

- **Unit Tests**: Verify the `linkVaultToDrive` logic throws a `ConflictError` when attempting to link a duplicated folder ID.
- **Integration Tests**: Mock the Google Drive API. Verify that when switching active vaults, the subsequent sync operation uses the correct, distinct folder ID.
- **Playwright (E2E)**: Ensure the UI correctly reflects the sync state of two separate vaults (e.g., Vault A is Linked, Vault B is Not Linked) and updating Vault A does not affect Vault B.
