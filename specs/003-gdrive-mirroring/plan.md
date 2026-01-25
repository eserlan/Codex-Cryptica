# Implementation Plan: Google Drive Cloud Bridge

**Branch**: `003-gdrive-mirroring` | **Date**: 2026-01-23 | **Spec**: [specs/003-gdrive-mirroring/spec.md](spec.md)
**Input**: Feature specification from `specs/003-gdrive-mirroring/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Google Drive Cloud Bridge provides an opt-in, background synchronization mechanism that mirrors local-first lore (stored in OPFS) to a dedicated folder in the user's personal Google Drive. This ensures cross-device access and data backup while maintaining total data sovereignty by transmitting data directly from the client to Google Drive, bypassing any third-party intermediaries. The system uses a "Last-Write-Wins" conflict resolution strategy and syncs periodically.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+ (dev), Browser Runtime
**Primary Dependencies**: 
- `googleapis` or `gapi-script` [NEEDS CLARIFICATION: Best library for browser-side only OAuth2 + Drive v3?]
- Svelte 4/5 (Frontend)
- `idb` or similar for tracking sync state locally
**Storage**: 
- Local: OPFS (Origin Private File System) / IndexedDB (Metadata)
- Remote: Google Drive (App Data folder or User selected folder)
**Testing**: Vitest (Unit/Integration), Playwright/Cypress (E2E) [NEEDS CLARIFICATION: Project E2E framework?]
**Target Platform**: Modern Web Browsers (Chrome, Firefox, Safari, Edge) - PWA
**Project Type**: Web Application (SvelteKit)
**Performance Goals**: Sync operations must not block the main thread; UI must remain responsive (<100ms interactions).
**Constraints**: 
- Must work Offline (queue changes).
- No backend proxy allowed (Client-side OAuth2).
- Strict Data Sovereignty (User's own credentials/storage).
**Scale/Scope**: Syncing hundreds to thousands of small Markdown/JSON files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-First Sovereignty**: [PASS] Feature is an *extension* of local-first, mirroring to user's storage. Primary source remains local OPFS.
- **Relational-First Navigation**: [N/A] Syncs the graph data, doesn't change navigation.
- **The Sub-100ms Performance Mandate**: [PASS] Sync must occur in a Web Worker to avoid main thread blocking.
- **Atomic Worldbuilding**: [PASS] Sync logic should be a standalone module/worker.
- **System-Agnostic Core**: [PASS] Syncs files regardless of content schema.
- **Pure Functional Core**: [PASS] Sync logic (diffing, conflict resolution) should be pure; I/O isolated in worker.
- **Verifiable Reality**: [PASS] Will include tests for sync logic and mock GDrive API.
- **Test-First PWA Integrity**: [PASS] Offline handling is a core requirement.
- **Forbidden Patterns**: 
    - "No Phone Home": [EXCEPTION] Syncs to *User's* drive, not *our* server. Compliant with intent of sovereignty.

## Project Structure

### Documentation (this feature)

```text
specs/003-gdrive-mirroring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Interfaces/Types)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── cloud-bridge/        # New Module
│   │   │   ├── google-drive/    # GDrive Adapter
│   │   │   ├── sync-engine/     # Sync Logic (Diff, Conflict)
│   │   │   └── index.ts         # Public API
│   │   ├── components/
│   │   │   └── settings/        # Cloud Bridge Settings UI
│   │   └── workers/
│   │       └── sync.ts          # Updated/New Sync Worker
│   └── stores/
│       └── sync-store.ts        # UI State for Sync
```

**Structure Decision**: Implementing as a modular library within `apps/web/src/lib/cloud-bridge` to keep it isolated but accessible to the Svelte frontend. Sync logic will run in a Web Worker to satisfy performance mandates.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       |            |                                     |
