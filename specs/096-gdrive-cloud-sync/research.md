# Research: Google Drive Cloud Sync Implementation

## Decisions

### 1. OAuth Library: Google Identity Services (GIS)

- **Decision**: Use the Google Identity Services (`accounts.google.com/gsi/client`) script with `initTokenClient` and `prompt: ''` for silent refresh.
- **Rationale**: GIS is the current Google-recommended approach for browser-based OAuth. The `prompt: ''` flag attempts a silent token grant using the existing consent, only showing the user a popup when full re-authorisation is required. The access token is held exclusively in memory — never written to `localStorage` or IndexedDB — satisfying NFR-002.
- **Alternatives Considered**:
  - `gapi.auth2` (legacy): Deprecated since 2023, no longer recommended by Google.
  - Server-side OAuth flow via a Codex backend: Rejected — violates the no-user-data-on-project-servers constraint.
  - `@react-oauth/google` or similar NPM wrapper: Rejected — wraps GIS itself, adds dependency overhead, and is React-specific.

### 2. Drive API Access: REST over GAPI client

- **Decision**: Call the Google Drive REST API directly via `fetch` with the in-memory access token. Do not load the `gapi.client` library.
- **Rationale**: The GAPI JavaScript client adds ~30 KB of overhead and an additional async load step. Direct `fetch` to `https://www.googleapis.com/drive/v3/...` and the multipart upload endpoint is simpler, tree-shakeable, and fully sufficient for the file operations this feature requires (list, create, get, update, delete).
- **Alternatives Considered**:
  - `gapi.client.drive`: Rejected for the reasons above; would also require `gapi` to be loaded before auth initialisation.

### 3. OAuth Scope: `drive.file`

- **Decision**: Request only the `https://www.googleapis.com/auth/drive.file` scope.
- **Rationale**: This scope limits app visibility to files the app created. User's other Drive content is never accessible. This is the most privacy-respecting scope and is required by the project's no-data-on-our-servers principle.
- **Implications**:
  - Files shared with the user by a co-host that were not created by _this_ app instance cannot be discovered via list. The user must paste the folder ID manually.
  - The folder ID must be persisted in IndexedDB (`cloud_sync_metadata.remoteFolderId`) so the app can re-open the folder across sessions without re-scanning.
- **Alternatives Considered**:
  - `drive.appdata`: App-specific hidden storage, not shareable between users. Rejected — rules out co-host collaboration (User Story 3).
  - `drive`: Full Drive access. Rejected — privacy overreach; Google review requirements for sensitive scopes are burdensome.

### 4. Sync Model: OPFS-Master Push/Pull Mirror

- **Decision**: Drive is a second external backend, identical in role to the local folder backend. OPFS is always the source of truth. Drive never "wins" a conflict against OPFS.
- **Rationale**: The existing `SyncCoordinator` and `SyncService` already implement a robust OPFS-master model with the `FileSystemBackend`. A `GDriveBackend` implementing `ISyncBackend` can be dropped in as a parallel target, reusing all planner/executor/registry logic without new conflict-resolution machinery.
- **Alternatives Considered**:
  - Drive as primary with OPFS as cache: Rejected — requires full conflict resolution, network dependency for writes, and offline-mode redesign.
  - Custom Drive-specific sync logic: Rejected — duplicates the existing battle-tested engine.

### 5. Folder Naming and Discovery

- **Decision**: On first connect, auto-create `CodexCryptica/{vaultName}` in the user's Drive root. Store the resulting folder ID in `cloud_sync_metadata.remoteFolderId`. On subsequent sessions, reopen by folder ID — no directory traversal required.
- **Rationale**: Keeping the folder path human-readable aids manual recovery. Using the ID for programmatic access is reliable across folder renames. The single-level `cloud_sync_metadata` row per vault means one IndexedDB lookup to reconnect.
- **Alternatives Considered**:
  - Store full folder path and re-traverse: Rejected — fragile if user renames parent folders in Drive.
  - Use `drive.appdata`: Rejected — not shareable (see scope decision).

### 6. Implementation Location

- **Decision**: `GDriveBackend` lives in `packages/sync-engine/src/GDriveBackend.ts`. `GDriveAuthService` lives in `apps/web/src/lib/services/gdrive-auth.ts`. Drive events are declared in a new `packages/sync-engine/src/events.ts` via module augmentation on `AppEventRegistry`.
- **Rationale**: The backend is framework-agnostic and belongs in the library layer (`packages/sync-engine`). Auth involves browser-specific token management and GIS script loading, so it belongs in the web app's service layer. Events follow the distributed-registry pattern established by `094-app-event-bus`.
- **Alternatives Considered**:
  - All Drive code in `apps/web`: Rejected — violates Library-First principle; makes the backend untestable without the full SvelteKit context.

### 7. Cross-Tab Sync Guard

- **Decision**: Use a `BroadcastChannel` message to check if another tab is already running a Drive sync before starting. If a sync is in progress in another tab, skip and schedule a re-check.
- **Rationale**: Two simultaneous uploads to the same Drive folder would race and corrupt the `sync_registry`. A lightweight broadcast guard avoids this without the complexity of a Web Lock (though `navigator.locks` is a valid future upgrade).
- **Alternatives Considered**:
  - `navigator.locks`: More robust but adds API surface and complexity. Worth upgrading to in a future iteration.
  - No guard: Rejected — concurrent uploads to the same Drive folder are undefined behaviour in the Drive API.

## Best Practices

- **Token Lifecycle**: Initialise `initTokenClient` once on page load. Call `requestAccessToken({ prompt: '' })` before each sync operation to silently refresh. Only show the consent popup when GIS indicates consent is required.
- **Drive File Identity**: Use Drive file IDs stored in `SyncEntry.remoteId` for update and delete operations. Never rely on filename matching for Drive — filenames are not unique within a folder.
- **Error Classification**: Distinguish `401 Unauthorized` (token expired — retry with refresh), `403 Forbidden` (scope problem — surface to user), `404 Not Found` (folder deleted — prompt reconnect), and network errors (skip Drive, continue locally).
- **Multipart Upload**: Use the Drive v3 multipart upload endpoint for files under 5 MB (all typical entity JSON files). Reserve resumable uploads for assets if the asset manager is extended later.
- **Retry**: Implement a simple 2-attempt retry with exponential backoff for transient `500`/`503` responses from Drive.
