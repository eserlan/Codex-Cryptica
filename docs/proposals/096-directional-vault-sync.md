# Proposal: Directional Vault Synchronization (Save/Load)

**Status:** Draft
**Date:** 2026-04-25

## Problem Statement

The current "Sync" button performs a bidirectional merge that can be opaque. We want to align the UI with the project's **Internal-as-Master** architecture:
1.  **Dexie/OPFS** is the primary, always-live storage.
2.  **Local Folder** is an optional external mirror/backup.

## Proposal: Split Save and Load

We will eliminate bidirectional sync in favor of two distinct, unidirectional actions with built-in safety mechanisms.

### 1. ⬆️ Save to Folder (Primary Action)
*   **Location**: High-visibility button in `VaultControls.svelte`.
*   **Action**: Pushes the current state of the internal archive to the linked local folder.
*   **Dirty Tracking**: The button is enabled only when `lastInternalChange > lastSavedToFolder`. 
*   **UX**: Acts as an "Export" or "Commit to Backup" step. Shows a "Clean" state when synchronized.

### 2. ⬇️ Load from Folder (Maintenance Action)
*   **Location**: Lower-visibility. Tucked into the **Vault Selector** (`VaultSwitcherModal.svelte`).
*   **Action**: Pulls the state of the local folder into the internal archive.
*   **Safety Gate**: If the vault is "Dirty" (has unsaved internal changes), clicking **LOAD** triggers a hard-stop confirmation: *"Warning: You have unsaved internal changes. Loading from the folder will overwrite your current work. Continue?"*
*   **UX**: Used for restoring from backup or importing work done in external editors like Obsidian.

### 3. Technical Changes

#### Engine (`sync-engine`)
- Update `SyncPlanner.plan` to accept `direction: 'push' | 'pull'`.
- **Push Mode**: 
    - Keep: `EXPORT_TO_FS`, `DELETE_FS`.
    - Drop: `IMPORT_TO_OPFS`, `DELETE_OPFS`, `HANDLE_CONFLICT`.
- **Pull Mode**:
    - Keep: `IMPORT_TO_OPFS`, `DELETE_OPFS`.
    - Drop: `EXPORT_TO_FS`, `DELETE_FS`, `HANDLE_CONFLICT`.

#### UI (`apps/web`)
- **`SyncStore`**: 
    - Expose `vault.push()` and `vault.pull()`.
    - Track `lastSavedToFolder` timestamp per vault.
    - Implement `isDirty` derived state.
- **`VaultControls.svelte`**: Replace "SYNC" with "SAVE TO FOLDER".
- **`VaultSwitcherModal.svelte`**: Add a "Reload/Refresh" button for the active vault with the **Safety Gate** confirmation.

## Benefits

- **Data Integrity**: The Safety Gate prevents accidental overwrites of live work.
- **Clear Hierarchy**: Reinforces that the app's internal database is the source of truth.
- **Predictable UX**: "Save" puts data out, "Load" brings data in. No magic "both" that might surprise the user.

## Next Steps

1.  Refactor `SyncPlanner` and `DiffAlgorithm` for directional filtering.
2.  Implement Dirty Tracking in `SyncStore`.
3.  Apply UI changes and Safety Gate confirmation dialog.

## Technical Fixes (Implementation Details)

### 1. Vault ID Guard (`entity-store.svelte.ts`)
Add a check in `_persistEntity` to verify the `activeVaultId` still matches the ID at the start of the debounce window. This prevents saving entity data into the wrong vault during rapid switches.

### 2. Status & Parallel Loading (`sync-store.svelte.ts`)
- Update `loadFiles` to set `status = "idle"` only **after** maps and canvases have finished loading.
- Use `Promise.all` to load maps and canvases in parallel to improve vault initialization speed.

### 3. Oracle Chat Persistence (Issue #691)
Update `oracle.svelte.ts` to save and restore chat history on a per-vault basis using the vault ID as a key.
