# Research: Binary Handling & Path Metadata

**Feature**: Path-Aware Binary Sync Remediation (013-sync-remediation)
**Date**: 2026-01-29

## Decision: Metadata-Driven Flat Sync

We will store the relative path of every file in the Google Drive `appProperties` metadata field and maintain a flat file structure within the root `CodexArcana` folder on the cloud.

### Rationale

1.  **Complexity Reduction**: Creating a mirrored directory tree in GDrive requires multiple API calls per folder level and complex parent-ID tracking. A flat list with path metadata allows identifying all files in a single `files.list` call.
2.  **Atomicity**: GDrive folder IDs are not stable across deletions/recreations. Path strings are deterministic.
3.  **Performance**: Fetching a single flat list of 500 files is faster than traversing 5 levels of directories via GDrive's hierarchical API.
4.  **Local Restoration**: Upon download, the `FileSystemAdapter` will parse the `appProperties.vault_path` and use recursive `getDirectoryHandle` to ensure the local structure exists.

### Alternatives Considered

#### Option A: Mirror Directory Tree in GDrive
-   **Pros**: User can browse the folders in the GDrive web UI.
-   **Cons**: Massive overhead in GDrive API calls. High chance of race conditions during folder creation.
-   **Verdict**: Rejected for performance and reliability (Constitution Principle III).

#### Option B: Base64 String Encoding
-   **Pros**: Fits into existing `string` logic.
-   **Cons**: 33% size overhead. Increased CPU usage for encoding/decoding large images.
-   **Verdict**: Rejected for efficiency (Constitution Principle III).

## Implementation Details

### Binary Storage Pipeline
-   **Read**: `FileSystemFileHandle.getFile()` -> `file.arrayBuffer()` or simply passing the `File` object (which is a `Blob`).
-   **Transport**: `FormData` in `fetch` allows appending `Blob` objects directly.
-   **Download**: `response.blob()` instead of `response.text()`.
-   **Write**: `FileSystemWritableFileStream.write(blob)`.

### Path Mapping
-   **Property Key**: `vault_path`
-   **Example**: `images/portrait.png`
-   **Key Constraint**: `appProperties` is only available to the application that created it, enhancing security.

### Recursive Scanning
-   **GDrive Query**: `q: "'${folderId}' in parents and trashed = false"`
-   **Local Sync**: The `SyncEngine` will map remote files back to their local `vault_path` during the scan phase.
