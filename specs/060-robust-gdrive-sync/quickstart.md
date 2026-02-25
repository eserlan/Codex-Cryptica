# Quickstart: Robust GDrive Sync

## Overview

This feature introduces a fault-tolerant Google Drive synchronization engine that reuses the core logic of the local `sync-engine` but swaps the filesystem backend for a `GDriveBackend`. It utilizes Google Identity Services (GIS) for authentication and the Drive v3 REST API directly via `fetch` for optimal control over retry logic and exponential backoff.

## Key Changes

- `sync-engine`: Refactored to support generic backends (`ILocalSyncService` becomes a generalized `SyncService`).
- `GDriveBackend`: A new module implementing the cloud operations (Auth, Upload, Download, Changes Feed).
- `SyncRegistry`: Extended schema to support remote IDs and pagination tokens.

## How to Test the Changes

1. **Authentication Flow**: Click "Connect to Google Drive" in the UI. Ensure a popup appears only if not previously authenticated, or that it connects silently.
2. **First Sync**: Run a manual sync. Verify that files upload to Google Drive without hanging on rate limits (429/500).
3. **Delta Sync**: Change a file locally and run sync again. Ensure _only_ that file is transferred by observing the network panel.
4. **Offline Resilience**: Attempt to sync with your network disconnected. Reconnect and verify the sync completes.

## Error Handling

The `GDriveBackend` uses an exponential backoff strategy (up to 3 retries) for any `5xx` or `429` status codes from Google Drive. `401 Unauthorized` responses attempt a silent token refresh via GIS before prompting the user.
