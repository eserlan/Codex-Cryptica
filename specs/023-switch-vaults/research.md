# Research: Vault Detachment and Switching

## Decision: Implementation Location
The detachment logic will be primarily implemented in `VaultStore` (`apps/web/src/lib/stores/vault.svelte.ts`) via a new `close()` method. This centralizes the state clearing for entities and file system handles.

## Decision: Cleanup Scope
To ensure a clean context switch, the following systems must be reset:
1. **Vault Store**: Reset `entities`, `rootHandle`, `isAuthorized`, and `inboundConnections`.
2. **Search Service**: Invoke `searchService.clear()` to purge the FlexSearch index.
3. **Cloud Sync**: Invoke `workerBridge.destroy()` (or a less destructive reset) to stop periodic syncs and background workers associated with the current vault.
4. **Oracle Context**: Invoke `oracle.clearMessages()` to prevent history bleed between campaigns.
5. **Persistence**: Remove the directory handle from IndexedDB/LocalStorage using existing utility methods.

## Decision: User Interface
A "Close Vault" button will be added to the `VaultControls.svelte` component, appearing only when a vault is currently authorized.

## Alternatives Considered
- **Automatic switching on "Open Vault" click**: We considered making the "Open Vault" button automatically detach the current vault.
  - *Decision*: Rejected in favor of an explicit "Close" action to prevent accidental data loss and to provide a clear state for users who simply want to unload data.

## Technical Details
- **Svelte 5 State**: Resetting `$state` objects in Svelte 5 is done by direct assignment (e.g., `this.entities = {}`).
- **File System Watchers**: Currently, the system uses periodic polling or manual refreshes. No active persistent watchers need termination beyond the `WorkerBridge` logic.
