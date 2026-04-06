# Research: Multi-Campaign Switch

## Decision 1: Primary Storage Engine — OPFS

- **Decision**: Use OPFS (Origin Private File System) as the primary storage engine. Each vault is a subdirectory under `vaults/` in the OPFS root.
- **Rationale**: OPFS works reliably on mobile (no permission prompts, no stale handles), provides fast synchronous access in workers, and avoids the FSA permission re-grant issues that caused problems on mobile browsers.
- **Alternatives considered**:
  - FSA (File System Access API) as primary: Rejected due to mobile compatibility issues, stale handle problems, and permission prompts on every session.

## Decision 2: OPFS Root Structure

- **Decision**: Use a single root-level directory named `vaults/` in OPFS, with each individual vault being a sub-directory named by its ID (slugified title).
- **Rationale**: Keeps the OPFS root clean. Allows for easy enumeration of vaults by listing the `vaults/` directory.
- **Alternatives considered**:
  - Storing each vault at the root: Risks collision with other app-level files.
  - Using a single flat directory with file prefixes: Poor isolation and harder to manage images/metadata.

## Decision 3: Vault Registry and Metadata

- **Decision**: Use an `idb` (IndexedDB) store named `vaults` to track metadata (id, name, lastOpened, entityCount) and a global `settings` key `activeVaultId`.
- **Rationale**: IndexedDB is already used in the project via `idb`. It's faster to query metadata from IDB than to walk OPFS directories every time the switcher opens.
- **Alternatives considered**:
  - `config.json` inside each OPFS folder: Requires multiple async reads to build the switcher list.
  - `localStorage`: Limited capacity and separate from the primary metadata store.

## Decision 4: Terminology and UI

- **Decision**: Stick with "Vault" as per user feedback.
- **Rationale**: User explicitly requested to maintain this terminology.
- **Alternatives considered**: "Campaign", "World", "Chronicle" (all rejected).

## Decision 5: Hybrid Architecture (OPFS + FSA Sync)

- **Decision**: OPFS handles all primary I/O. FSA is used only for optional "Sync to Folder" (export) and "Import from Folder" (import) features.
- **Rationale**: Users on mobile had significant issues with FSA (stale handles, permission prompts, broken re-grants). OPFS solves all of these. Power users who want external file access (Git, Dropbox, external editors) can use the opt-in sync feature.
- **Alternatives considered**:
  - FSA-only: Rejected due to mobile issues.
  - OPFS-only: Would lose external file access entirely. Hybrid preserves the best of both.

## Decision 6: Switching Logic

- **Decision**: `switchVault(id)` calls `closeVault()` to clear current state, updates IDB `activeVaultId`, then loads the new vault's OPFS subdirectory.
- **Rationale**: Minimizes architectural changes. `closeVault()` already exists and handles state cleanup.
- **Alternatives considered**: Reloading the page with a URL parameter (e.g., `?vault=id`). Rejected because requirements state "without a full page reload" (FR-003).
