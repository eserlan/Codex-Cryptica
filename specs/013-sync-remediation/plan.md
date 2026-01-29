# Implementation Plan: Path-Aware Binary Sync Remediation

**Branch**: `013-sync-remediation` | **Date**: 2026-01-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-sync-remediation/spec.md`

## Summary
Upgrade the Google Drive sync engine to be "Binary-Safe" and "Path-Aware". This refactor replaces string-based file transfers with `Blob` processing to support images and implements a metadata-driven path mapping system to preserve the vault's subdirectory structure (e.g., `/images`) in the cloud.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Google API Client (GAPI), Browser Native `fetch`, `idb` (IndexedDB)
**Storage**: OPFS (Origin Private File System) for binary local storage, Google Drive for cloud mirroring.
**Testing**: Vitest (Unit logic), Playwright (Integration/E2E)
**Target Platform**: Modern Browsers (supporting File System Access API & OPFS)
**Project Type**: Web application (SvelteKit)
**Performance Goals**: Support parallel sync (5+ files), zero main-thread blocking during I/O.
**Constraints**: GDrive `appProperties` is limited to 124 bytes per property (enough for relative paths).
**Scale/Scope**: Vaults with thousands of files and nested directories.

## Constitution Check

_GATE: Pass_

1.  **Local-First**: YES. Fixes restoration of local directory structure from cloud.
2.  **Relational-First**: YES. Preserves file paths used for image linking in lore.
3.  **Performance**: YES. Binary transfers are more efficient than base64/string encoding.
4.  **No Phone Home**: YES. Direct browser-to-cloud communication.

## Project Structure

### Documentation (this feature)

```text
specs/013-sync-remediation/
├── plan.md              # This file
├── research.md          # Binary handling & metadata strategy
├── data-model.md        # Metadata schema updates
├── quickstart.md        # Test scenarios for binary/path sync
└── tasks.md             # Implementation tasks
```

### Source Code

```text
apps/web/src/
├── lib/
│   └── cloud-bridge/
│       ├── google-drive/
│       │   └── worker-adapter.ts # Update to Blob & appProperties
│       └── sync-engine/
│           ├── engine.ts         # Update to Blob-based diffing
│           └── fs-adapter.ts     # Update to binary I/O (ArrayBuffer/Blob)
└── workers/
    └── sync.ts                   # Update message passing for Blobs
```

**Structure Decision**: Refactor existing sync core within `apps/web/src/lib/cloud-bridge/`. This is a non-breaking internal change to the sync logic that improves data integrity.