# Synchronization Architecture

This document describes the synchronization mechanism in Codex Cryptica, detailing how data is mirrored between internal browser storage and the user's local filesystem.

## High-Level Architecture

Codex Cryptica employs a **Hybrid Local-First Architecture** as defined in [ADR 001](./adr/001-fs-handle-storage.md):

1.  **Origin Private File System (OPFS):** The primary, high-performance "Working Memory." All active application state and vault files reside here. It is opaque to the user but reliable across desktop and mobile.
2.  **Local Filesystem (FSA):** User-selected directories accessed via the File System Access API. This serves as the "Long-Term Storage" and allows external editing.
3.  **Sync Registry:** An authoritative manifest stored in **IndexedDB** that tracks the state of files at the moment of their last successful synchronization.

## The Sync Workflow

Synchronization is a user-initiated, bidirectional process managed by the `@codex/sync-engine` package.

### Phase 1: Scanning

The engine performs a full scan of both the **Local Folder** and the **OPFS Vault**.

- **Local (FSA):** Reports path, `lastModified` timestamp, and file size.
- **Remote (OPFS):** Reports path, file size, and a content hash (BLAKE3). _Note: OPFS does not provide reliable modification timestamps._

### Phase 2: Diffing (The Diff Algorithm)

The `DiffAlgorithm` compares the current state of both sides against the **Sync Registry**.

| Scenario              | Action                                       |
| :-------------------- | :------------------------------------------- |
| **New on FS**         | Import to OPFS (Create new entity)           |
| **New on OPFS**       | Export to FS (Create new file)               |
| **Only FS Changed**   | Update OPFS version                          |
| **Only OPFS Changed** | Update FS version                            |
| **Both Changed**      | **Conflict Detected** (Create conflict copy) |
| **Deleted on FS**     | Recreate from OPFS (Primary wins)            |
| **Deleted on OPFS**   | Delete from FS (Primary wins)                |

### Phase 3: Conflict Resolution

To prevent data loss, the engine never automatically overwrites a file if both the Local and OPFS versions have changed since the last sync.

- The system creates a sidecar file in OPFS: `[filename].conflict-[timestamp].[ext]`.
- The original file path remains in a "conflict" state in the UI for manual resolution.

## Performance & Reliability

### 1. Fast-Path Optimization

For text-based files (`.md`, `.markdown`), the engine performs a literal text comparison (`fsText === opfsText`) before initiating a transfer. If the contents are identical, the sync is skipped even if the timestamps differ, reducing unnecessary I/O and battery drain.

### 2. Atomic Updates

The `SyncRegistry` is only updated _after_ a file has been successfully transferred and verified. This ensures that interrupted syncs (e.g., browser close, permission revocation) can safely resume without state corruption.

### 3. Safety Guardrails

The engine includes hardcoded safety checks to prevent the deletion of critical system directories (e.g., `images/`, `.cache/`) during synchronization cycles.

## Implementation References

- **Engine Logic:** `packages/sync-engine/src/SyncService.ts`
- **Decision Logic:** `packages/sync-engine/src/DiffAlgorithm.ts`
- **Registry Store:** `packages/sync-engine/src/SyncRegistry.ts`
