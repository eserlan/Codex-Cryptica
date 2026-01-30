# Research: Sync Deletion & Binary Integrity

**Feature**: Sync Refinement & Deletion Support (017-sync-refinement)

## Problem 1: The "Zombie File" Problem
Currently, if a user deletes a file locally, the `SyncEngine` sees it as a missing local file that exists on remote. Because it lacks a "deletion tombstone," it assumes the local file is missing and re-downloads it.

### Decision: Metadata-Based Deletion Detection
We utilize the `MetadataStore` (IndexedDB) as the "Last Seen" state.
- **Rationale**: Avoids adding complexity to the file system (no hidden `.tombstone` files).
- **Rule**: If `path` is in Metadata and Remote, but NOT in Local Scan → The file was deleted locally since the last sync.

## Problem 2: GDrive Duplication
Users report multiple copies of identical images on Drive.
- **Root Cause**: `WorkerDriveAdapter` previously used `multipart/form-data` (browser default for `FormData`). Google Drive requires `multipart/related` to correctly associate JSON metadata (`appProperties`) with binary content. Without this, `vault_path` was lost, making each sync look like a new file upload.
- **Solution**: Manually construct `multipart/related` body using `Blob`.

## Problem 3: Remote Deduplication
Existing vaults already have duplicates on Drive.
- **Strategy**: Keep the file with the most recent `modifiedTime` that has a valid `vault_path`. Move others to trash.

## UI Refresh
The `worker-bridge` has been updated to listen for the `REMOTE_UPDATES_DOWNLOADED` signal. When received, it triggers `vault.refresh()`, which synchronizes the Svelte stores with the newly downloaded files, ensuring the Graph and Detail panels are up-to-date.

## Performance & Error Handling
- **Concurrency**: Concurrency is limited to 5 parallel operations to prevent browser/worker exhaustion and respect cloud rate limits.
- **Atomic Metadata**: Metadata is updated in batches of 10 to ensure that even in the event of a crash, the vast majority of sync state is preserved.
- **Binary Integrity**: Manual `multipart/related` construction ensures that images are stored with correct MIME types and `vault_path` metadata, allowing for reliable cross-device reconstruction.
- **Deduplication**: The engine now performs a pre-sync deduplication pass on remote files, ensuring that only the most recently modified version of any file (by `vault_path`) is considered for sync, with older duplicates automatically marked for cleanup.