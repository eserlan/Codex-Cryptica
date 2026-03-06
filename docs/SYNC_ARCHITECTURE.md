# Synchronization Architecture

This document describes the local-folder synchronization mechanism in Codex Cryptica. It covers how files are mirrored between the app's internal browser storage and a user-selected directory on the local filesystem.

The goal of this document is to describe the current behavior of the sync engine, not an idealized future design.

## High-Level Architecture

Codex Cryptica uses an **OPFS-first** storage model, as described in [ADR 001](./adr/001-fs-handle-storage.md):

1. **Origin Private File System (OPFS):** The primary working store for the vault. All in-app reads and writes target OPFS first.
2. **Local Filesystem (FSA):** A user-selected directory accessed through the File System Access API. This is a user-visible replica that supports backup, export, and external editing.
3. **Sync Registry:** A per-file manifest stored in **IndexedDB**. It records the last known synchronized fingerprints for each path and is the basis for change detection.

This is therefore not a symmetric peer-to-peer sync system. OPFS is the canonical working copy. The local folder is a synchronized external replica that the user may also modify between sync runs.

## Data Model

Sync is path-based. The registry tracks entries by `(vaultId, filePath)`.

For each synchronized path, the registry stores:

- The last synchronized FS modification time
- The last synchronized FS size
- The last synchronized OPFS content hash
- An optional backend-specific remote ID

Important consequences:

- **No stable file identity:** Renames and moves are treated as path changes, not as first-class rename operations.
- **No tombstones:** Deletions are inferred from absence during scanning and comparison with the registry.
- **Path semantics dominate:** A rename typically appears as a delete of the old path plus a create of the new path.

## Sync Workflow

Synchronization is a user-initiated process managed by `@codex/sync-engine`.

### Phase 1: Scan

The engine scans both the local folder and the OPFS vault, then loads all registry entries for the vault.

- **Local (FSA):** Reports path, `lastModified`, and file size.
- **OPFS:** Reports path, file size, and a content hash. OPFS modification times are not treated as authoritative.
- **Registry:** Reports the last synchronized fingerprints used to decide whether either side has changed.

### Phase 2: Change Detection

The diff step is intentionally asymmetric:

- **OPFS changed** means the current OPFS hash differs from `lastSyncedOpfsHash`.
- **FS changed** means the current FS `(size, lastModified)` fingerprint differs from `(lastSyncedFsSize, lastSyncedFsModified)`.

This means:

- OPFS change detection is content-based.
- Local-folder change detection is metadata-based.
- The engine does not currently hash every FS file during scan.
- If FS metadata is misleading or too coarse, the engine may classify a file conservatively and fall back to conflict handling.

### Phase 3: Action Selection

`DiffAlgorithm` compares the current FS state, current OPFS state, and the registry entry for each path.

| Scenario                                                 | Action                                     |
| :------------------------------------------------------- | :----------------------------------------- |
| File exists only on FS and is not in the registry        | Import to OPFS                             |
| File exists only on OPFS and is not in the registry      | Export to FS                               |
| File exists on both, no registry entry, and sizes match  | Record as initially matched                |
| File exists on both, no registry entry, and sizes differ | Conflict                                   |
| Only FS changed since last sync                          | Import to OPFS                             |
| Only OPFS changed since last sync                        | Export to FS                               |
| Both changed since last sync                             | Conflict                                   |
| FS copy was deleted, OPFS copy unchanged                 | Recreate FS from OPFS                      |
| OPFS copy was deleted, FS copy unchanged                 | Delete FS copy                             |
| Both copies are gone                                     | Remove registry entry on full sync cleanup |

Two points matter here:

- **Delete propagation is asymmetric by design.** A local-folder delete is treated as removal of the replica and is undone if OPFS still has the file unchanged. An OPFS delete is treated as canonical and is propagated to the local folder.
- **Initial sync is conservative.** If the same path exists on both sides with no registry entry, the engine only auto-matches when sizes are equal. Otherwise it records a conflict rather than guessing.

## Conflict Handling

The engine does not overwrite a file at a shared path when both sides changed since the last sync.

Current behavior:

- The OPFS version remains at the original path.
- The FS version is copied into OPFS as a sibling file named `[base].conflict-[timestamp][ext]`.
- The main path is reported as a conflict in the sync result.
- The registry entry for the main path is not advanced during conflict handling.

This has two practical effects:

- The conflict is preserved without destroying either version.
- The path will continue to require manual resolution because the registry still reflects the pre-conflict synchronized state.

The engine does not currently implement automatic merge, conflict tombstones, or a first-class conflict-resolution transaction.

## Execution Model

Sync actions are executed sequentially (`CONCURRENCY = 1`) for reliability on large local vaults.

Per file, the engine follows this pattern:

1. Decide the action from current metadata plus registry state.
2. Transfer bytes if needed.
3. Update or delete the registry entry only after the file operation succeeds.

This provides a **per-file commit discipline**, not a globally atomic sync transaction. A browser close or permission failure can still leave a sync batch partially applied, but completed file operations should have registry state that matches the operation that finished.

## Performance Notes

### Content-Equality Fast Path

For Markdown files (`.md`, `.markdown`), import and export operations perform an extra literal text comparison when file sizes match.

If the text is identical:

- The transfer is skipped.
- The registry is still updated to reflect the latest synchronized fingerprints.

This is an implementation optimization for common text files, not a general guarantee for all file types.

### Full Scan vs Delta Inputs

The local-folder sync flow performs a full FS scan. The shared sync service also supports delta-style remote inputs for backends that expose change tokens, but local-folder sync should be understood as a full comparison against the registry.

## Safety Guardrails

When propagating OPFS deletions to the local folder, the engine refuses to delete certain protected paths such as:

- `images/`
- `.cache/`

These checks are hardcoded guardrails, not a complete policy engine.

## Non-Goals and Limitations

The current design does not attempt to solve:

- Rename tracking as a first-class operation
- Cross-file or whole-sync atomicity
- Automatic conflict merging
- Guaranteed content hashing for every local-folder file during scan
- Real-time background synchronization

Those constraints are acceptable for the current design because sync is explicit, user-initiated, and centered on preserving OPFS as the working source of truth while still allowing export and external edits.

## Implementation References

- **Engine Logic:** `packages/sync-engine/src/SyncService.ts`
- **Decision Logic:** `packages/sync-engine/src/DiffAlgorithm.ts`
- **Registry Store:** `packages/sync-engine/src/SyncRegistry.ts`
