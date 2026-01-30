# Implementation Plan - Campaign Sharing (Read-only)

**Feature**: Campaign Sharing (Read-only)
**Branch**: `021-share-campaigns`
**Spec**: `specs/021-share-campaigns/spec.md`
**Constitution**: `[Ratified]`

## Technical Context

The current system relies on `003-gdrive-mirroring` for cloud synchronization, storing campaign data in a `CodexArcana` folder on the user's Google Drive. To implement "Public Sharing", we will leverage Google Drive's sharing capabilities.

**Architecture**:
- **Owner**: Uses the authenticated GDrive Cloud Bridge to set permission `role='reader', type='anyone'` on the specific campaign folder/file.
- **Link**: A deep link into the Codex Arcana PWA (e.g., `/?shareId=<FILE_ID>`).
- **Recipient**:
  - The PWA loads in a "Guest Mode".
  - "Temporary Username" is stored in `sessionStorage`.
  - Data is fetched from Google Drive using the File ID.

**Unknowns**:
- **[NEEDS CLARIFICATION] GDrive Public Access via API**: Can the GDrive API fetch file content/metadata for a public file *without* an OAuth token? Does it require an API Key? (CORS implications for pure client-side fetch).
- **[NEEDS CLARIFICATION] Guest Mode State**: How to isolate "Guest" data from any existing "Local" data if the user already uses Codex Arcana on that device? (Likely need a separate IndexedDB namespace or ephemeral in-memory store).
- **[NEEDS CLARIFICATION] Rate Limits**: Will using a public link hit GDrive download quotas?

## Constitution Check

- [x] **Local-First Sovereignty**: Data remains in User's GDrive. Recipient downloads to memory/session. No central DB.
- [x] **No Phone Home**: No tracking servers involved.
- [x] **Sub-100ms Performance**: Depending on GDrive latency, but UI must remain responsive.
- [x] **System-Agnostic**: Works for any campaign type.

## Phases

### Phase 0: Discovery & Research

- [ ] **Research**: Verify GDrive API behavior for `type='anyone'` shared files (CORS, Auth requirements).
- [ ] **Research**: Design "Guest Mode" for the Store/Vault to prevent polluting local OPFS.

### Phase 1: Core Implementation

- [ ] **Data Model**: Update `Campaign` entity to track `shareLink` and `isShared`.
- [ ] **Adapter**: Extend `GDriveAdapter` to support `setPermissions` (Share) and `revokePermissions`.
- [ ] **Adapter**: Create `PublicGDriveAdapter` (or similar) for fetching without user OAuth (if possible) or handling the "Guest" fetch flow.
- [ ] **UI**: "Share" button in Campaign Settings.
- [ ] **UI**: "Guest Welcome" modal (Enter Name).
- [ ] **UI**: Read-Only View Mode (Reuse existing components but disable Edit actions).

### Phase 2: Refinement & Polish

- [ ] **Feedback**: visual indicator for "Shared" status.
- [ ] **Security**: Ensure Read-Only inputs are strictly disabled.
- [ ] **Testing**: E2E test for Share -> Access flow.