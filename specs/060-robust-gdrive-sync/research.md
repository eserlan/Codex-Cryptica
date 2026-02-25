# Research Findings: Robust GDrive Sync

## Google Drive API Client in Browser

- **Decision**: Use Google Identity Services (GIS) for authentication (`initTokenClient`) and raw `fetch` for calling the Google Drive v3 REST API directly.
- **Rationale**: The legacy `gapi` library is heavy, harder to type safely in modern TypeScript, and officially deprecated for authentication. Raw `fetch` combined with GIS tokens gives us complete control over network requests, allowing us to implement our own exponential backoff and retry logic required for fault tolerance (FR-003). It aligns with the constitution's emphasis on clean implementation without over-engineering.
- **Alternatives considered**: `gapi.client.drive` (too bloated, auth flow is deprecated).

## Efficient Change Detection (FR-002)

- **Decision**: Use the Google Drive `changes` feed (`https://www.googleapis.com/drive/v3/changes`).
- **Rationale**: We will store a `startPageToken` after every successful sync in the `SyncRegistry`. On subsequent syncs, we query the `changes` endpoint with this token. This returns _only_ the files that have been modified or deleted since the last sync, entirely bypassing the need to list and scan all 1000+ files in the vault. This guarantees SC-002 (time to detect changes < 5s).
- **Alternatives considered**: Comparing `md5Checksum` or `modifiedTime` for all files in a folder (slow for large vaults and uses too many API quota points).

## Silent Token Refresh & Error Handling (FR-004)

- **Decision**: Intercept HTTP 401 errors globally within the `GDriveBackend` connector. When a 401 occurs, use GIS `requestAccessToken({ prompt: '' })` to attempt silent background refresh.
- **Rationale**: If the user has an active Google session, GIS can silently issue a new short-lived access token without opening a popup. If this fails (e.g., session expired), we throw an auth error to trigger a UI prompt. For 429/500 errors, we use an exponential backoff wrapper around the `fetch` call.
- **Alternatives considered**: Managing long-lived refresh tokens securely on the client (complex and generally advised against for SPAs without a backend).

## Integration with Local Sync Engine (FR-001)

- **Decision**: Define an `ICloudBackend` interface matching the shape of the existing `ILocalSyncService` requirements, adapting the cloud metadata to the `FileMetadata` type used by `DiffAlgorithm`.
- **Rationale**: The core conflict resolution ("Newest Wins") logic resides in `DiffAlgorithm`. We simply feed it `FileMetadata` from OPFS and `FileMetadata` from the `changes` feed.
