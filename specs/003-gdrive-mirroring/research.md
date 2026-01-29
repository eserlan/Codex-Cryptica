# Research: Google Drive Cloud Bridge

**Feature**: Google Drive Cloud Bridge
**Status**: Phase 0 Complete

## 1. Authentication & Authorization

**Decision**: Use **Google Identity Services (GIS)** for authentication (`google.accounts.oauth2`) and **gapi-script** for API calls.

**Rationale**:

- **GIS** is the modern, required standard for OAuth2 in the browser. It replaces the deprecated `gapi.auth2` module.
- **Client-side only**: We cannot use a backend for token exchange (Authorization Code flow requires a client secret which cannot be exposed). We must use the **Implicit Grant** (Token Model) flow.
- **Scopes**: `https://www.googleapis.com/auth/drive.file` (Recommended). This grants access _only_ to files created or opened by the app, ensuring privacy and reducing security risk. The constitution requires "Total Data Sovereignty", so accessing only _our_ data is perfect.
- **Persistence**: Access tokens are short-lived (1 hour). We will not store them in localStorage (security risk). We will request a new token when the current one expires, possibly prompting the user if the session is lost.

## 2. File System Interaction (Local)

**Decision**: **Origin Private File System (OPFS)** via `navigator.storage.getDirectory()` + **IndexedDB** for Metadata.

**Rationale**:

- **OPFS**: The Constitution mandates OPFS for Local-First Sovereignty. It provides high-performance file access.
- **Metadata Store**: OPFS is great for file content, but scanning thousands of files for stats can be slow. We will use **IndexedDB** (via `idb` library) to maintain a fast lookup table of:
  - `filePath`
  - `localLastModified`
  - `gdriveFileId` (to avoid searching by name every time)
  - `gdriveLastModified`
  - `syncStatus` (Synced, Dirty, Conflict)

## 3. Google Drive API Strategy

**Decision**: **Drive API v3** via `gapi.client.drive`.

**Rationale**:

- **Folder Structure**: We will create a root folder named `Codex Cryptica` (or similar) if it doesn't exist.
- **File Identification**: We will store the `appProperties` on GDrive files to tag them as belonging to our app, or rely on the `drive.file` scope which implicitly isolates them.
- **Content**: files will be uploaded as `text/markdown` or `application/json` (for graphs).

## 4. Synchronization Logic

**Decision**: **State-based Synchronization** with **Last-Write-Wins**.

**Algorithm**:

1.  **Snapshot Local**: Walk OPFS, get list of files + modified times.
2.  **Snapshot Remote**: `files.list` query to get files in our folder.
3.  **Match**: Correlate by Name (path).
4.  **Diff**:
    - **Local New**: Upload -> Store GDrive ID.
    - **Remote New**: Download -> Save to OPFS.
    - **Both Exist**: Compare `modifiedTime`.
      - Local Newer: Upload (Update).
      - Remote Newer: Download (Overwrite).
      - Same: Skip.
5.  **Deletions**:
    - If file exists in IDB (was previously synced) but missing in Local -> Delete Remote.
    - If file exists in IDB but missing in Remote -> Delete Local (or Re-upload? _Decision: Re-upload to be safe, treat as "Local New"_).

**Constraint Handling**:

- **Rate Limits**: Google Drive has rate limits. We will implement exponential backoff.
- **Offline**: If offline, queue isn't needed; we just skip the sync cycle. The next cycle will catch up.

## 5. Background Processing

**Decision**: **Web Worker** (`sync.worker.ts`).

**Rationale**:

- Syncing involves network I/O and potential file parsing.
- Doing this on the main thread violates the "Sub-100ms Performance Mandate".
- Web Worker can access OPFS (synchronously in some contexts, asynchronously in others) and `fetch` / `XMLHttpRequest`.
- `gapi` might be tricky in a Worker (relies on global `window`).
  - _Fallback_: If `gapi` fails in Worker, we will use raw `fetch` endpoints for Drive API, passing the token from the main thread to the worker. This is actually cleaner and smaller bundle-wise.

## 6. Testing Strategy

**Decision**: **Mocking GDrive API**.

- We cannot test against real Google Drive in CI.
- We will create a `MockDriveAdapter` interface.
- Unit tests will verify the Sync Engine logic against the Mock.
- Manual verification (Smoke Test) required for actual OAuth flow.
