# Proposal: Unified Vault Synchronization

**Status:** Draft
**Date:** 2026-04-25

## Problem Statement

The current vault synchronization UX is fragmented and potentially confusing for users. Currently, we have:
1.  **Load (Automatic/Manual)**: Vaults load automatically on switch (with background FS sync if a link exists), but there's no clear UI to "Reload" or "Pull" explicitly from the main header.
2.  **Sync (Manual "SYNC" button)**: A dedicated button in `VaultControls.svelte` that triggers `syncWithLocalFolder()`. This acts as a bidirectional sync (effectively a Pull + Push).
3.  **Import**: A separate action to bring in files.
4.  **Save (Internal)**: Auto-saving to OPFS happens in the background, but "Exporting" to a local folder is tied to the "Sync" action.

Users often just want to "ensure my data is synchronized," without worrying about whether they are loading from or saving to their local folder.

## Technical Analysis

- **SyncStore**: Manages the state of synchronization (`idle`, `loading`, `saving`, `error`).
- **SyncCoordinator**: Handles the heavy lifting of bidirectional sync between OPFS and a local FileSystemDirectoryHandle.
- **VaultLifecycleManager**: Manages the high-level transitions (switch vault, load demo data, persist to IDB).

### Current "SYNC" Button Behavior
- Checks for a local folder handle.
- If missing, prompts the user to select one (using `showDirectoryPicker`).
- Runs a bidirectional sync using `SyncCoordinator`.

## Proposal: The "Universal Sync" Pattern

We should consolidate the "Load/Reload" and "Push/Sync" concepts into a single, high-visibility "Synchronize" action.

### 1. Unified Sync Action
Replace the "SYNC" button and fragmented sync states with a single **"Sync & Refresh"** button (or just **"Sync"**) that performs the following:
- **Ensures Permission**: Re-authenticates the link to the local folder if it exists.
- **Bidirectional Sync**: Runs the `SyncCoordinator` to match OPFS with the local folder.
- **UI Feedback**: Provides a clear "In Progress" state (spinning icon, progress percentage).

### 2. Smart Sync Triggers
Instead of requiring a manual click for every sync:
- **On Startup/Switch**: The current automatic background sync is good, but should be more visually explicit in the header.
- **Manual Override**: The single "Sync" button provides peace of mind.

### 3. Streamlined UI in `VaultControls.svelte`

**Current Layout:**
`[ NEW ENTITY ] [ IMPORT ] [ SYNC ] [ SHARE ]`

**Proposed Layout:**
`[ NEW ENTITY ] [ IMPORT ] [ 🔄 SYNC ] [ SHARE ]`

- The **SYNC** button should be the primary way to "Load and Save".
- If a vault is *not* linked to a local folder, clicking **SYNC** should prompt "Would you like to link this vault to a local folder for automatic backup and external editing?"

### 4. Implementation Details

- **Consolidate State**: Ensure `status === 'loading'` and `status === 'saving'` are treated as "Synchronizing" in the UI.
- **Unified Method**: Create a high-level `vault.sync()` method that handles everything:
    1. Re-resolving handles.
    2. Running the coordinator.
    3. Notifying success/failure.
- **Auto-Sync on Focus**: Optionally, trigger a sync when the window regains focus (if a local link exists).

## Benefits

- **Simpler UX**: One button for "Ensure everything is up to date".
- **Reduced Confusion**: No distinction between "Loading files" and "Syncing with folder".
- **Better Visibility**: Progress is shown in a central location.

## Next Steps

1.  Refactor `SyncStore` and `VaultLifecycleManager` to expose a single `synchronize()` entry point.
2.  Update `VaultControls.svelte` to use the unified button and unified status display.
3.  Add "Link Folder" onboarding for unlinked vaults via the same button.
