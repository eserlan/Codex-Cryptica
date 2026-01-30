# Research: Campaign Sharing Implementation

**Feature**: `021-share-campaigns`
**Status**: Complete

## 1. GDrive Public Access via API

**Question**: Can the GDrive API fetch file content/metadata for a public file (`role='reader', type='anyone'`) without an OAuth token?

### Findings
- **Direct Download Links**: `drive.google.com/uc?export=download&id=...` often have CORS headers that block cross-origin XHR/Fetch requests.
- **API Access**: The Google Drive API (`https://www.googleapis.com/drive/v3/files/...`) supports CORS but requires an authenticator: either an OAuth Token or an API Key.
- **Constraint**: We are a serverless, local-first app. We cannot securely hide a "Service Account" key.
- **Decision**: We will use the **API Key** method.
  - The project will require a `VITE_GOOGLE_API_KEY` environment variable.
  - This key must be restricted (by the deployer) to the specific HTTP Referrer (e.g., the GitHub Pages URL) to prevent abuse.
  - If the key is missing, the feature degrades gracefully (e.g., prompts "Please sign in to view" or "Configure API Key").

### Implementation Detail
- Endpoint: `GET https://www.googleapis.com/drive/v3/files/{FILE_ID}?key={API_KEY}&alt=media`
- Logic:
  1. Check for `gdriveId` in URL query params.
  2. If present, switch to `GuestMode`.
  3. Fetch file content using `fetch()` + API Key.
  4. Parse Markdown -> Load into Graph.

## 2. Guest Mode State Isolation

**Question**: How to load shared data without overwriting the user's own local vaults?

### Findings
- **Risk**: Merging a shared campaign into the user's local IndexedDB/OPFS would persist it, which is confusing (it's read-only and ephemeral).
- **Solution**: **In-Memory Vault**.
- **Architecture**:
  - The `VaultStore` (Svelte store) is the single source of truth for the UI.
  - Normally, it syncs *to* and *from* the `StorageAdapter` (IDB/OPFS).
  - In `GuestMode`, we disconnect the `StorageAdapter` or replace it with a `MemoryAdapter`.
  - The "Temporary Username" is stored in `sessionStorage` only.

### Decision
- Create a `MemoryAdapter` that implements the `StorageInterface`.
- When app initializes with `?shareId=...`:
  1. Set `isGuest = true`.
  2. Initialize `VaultStore` with `MemoryAdapter`.
  3. Load data from GDrive into `VaultStore`.
  4. Disable all "Save", "Delete", "Edit" UI actions based on `isGuest` flag.