# Research: Robust Local File Syncing

## Decision: Sync Metadata Registry in IndexedDB

**Rationale**: To support bidirectional deletion syncing (FR-006), we must know what files were present during the last successful sync. If a file is missing from OPFS but present in the local folder, we need to know if it was _just created_ locally or _just deleted_ in OPFS. A "last seen" registry in IndexedDB stores the state (path, hash/timestamp) of the last sync to resolve this ambiguity.
**Alternatives considered**:

- Scanning both and prompting for everything missing: Too noisy for the user.
- Additive-only sync: Rejected by user choice (Full Mirror).

## Decision: Incremental Recursive Scan

**Rationale**: To meet the < 2s performance goal (SC-002), we will use an incremental scan. We walk the OPFS and Local trees in parallel. We only read file contents if the metadata (`lastModified`, `size`) differs from the Sync Registry.
**Alternatives considered**:

- Full hash scan: Too slow for large assets (images).
- Sequential scan (OPFS then Local): Slower than a coordinated walk.

## Decision: Persistent Handle Management

**Rationale**: FileSystemDirectoryHandles for the local folder expire. We will use the `idb` storage pattern already established in the codebase to store the handle and prompt for re-permissioning upon sync trigger if the handle is stale.
**Alternatives considered**:

- Asking user to pick folder every time: Poor UX.

## Best Practices: File System Access API

- Always check `queryPermission` before attempting access.
- Use `requestPermission` in response to a user gesture (onclick).
- Avoid holding handles in long-lived state if they can become stale; re-resolve from IDB.
