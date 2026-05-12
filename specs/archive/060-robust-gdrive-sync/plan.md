# Implementation Plan: Robust GDrive Sync

**Branch**: `060-robust-gdrive-sync` | **Date**: 2026-02-25 | **Spec**: [specs/060-robust-gdrive-sync/spec.md]
**Input**: Feature specification from `/specs/060-robust-gdrive-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Expand the existing local `sync-engine` to support robust, fault-tolerant Google Drive synchronization. We will decouple the `DiffAlgorithm` and `SyncRegistry` from the local filesystem and implement a new `GDriveBackend` using Google Identity Services and the raw Drive v3 REST API for efficient change detection and resilient retry logic.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**: Google Identity Services (GIS), `fetch` API for Google Drive v3 REST API
**Storage**: OPFS (Vault Data), IndexedDB via `idb` (Sync Registry metadata)
**Testing**: Vitest, Playwright
**Target Platform**: Browser (Web Application)
**Project Type**: web + packages
**Performance Goals**: Time to detect and start syncing a single file change < 5s (SC-002)
**Constraints**: OAuth2 token refresh flows silently in the background (FR-004), fault-tolerant exponential backoff for rate limits.
**Scale/Scope**: Up to 1000 files in a typical campaign vault.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Library-First**: Passed. The core synchronization orchestration and Google Drive backend will reside within the `packages/sync-engine` workspace, keeping the web app as a thin UI layer.
- **Test-Driven Development (TDD)**: Passed. Unit tests will cover the new `GDriveBackend` (mocking `fetch`), the generalized `SyncService`, and the token refresh flows.
- **Simplicity & YAGNI**: Passed. Choosing raw `fetch` with the REST API avoids the heavy dependency of the legacy `gapi` client, matching the requirement for a clean implementation.
- **Privacy & Client-Side Processing**: Passed. All processing (diffing, conflict resolution, hash calculation) happens locally in the browser before network transmission.
- **Clean Implementation**: Passed. Standard TS practices, `$derived` state (Svelte 5), and standard formatting will be enforced.
- **User Documentation**: Passed. A guide or feature hint explaining how to connect and use the robust cloud sync will be added to `help-content.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/060-robust-gdrive-sync/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/sync-engine/
├── src/
│   ├── index.ts
│   ├── types.ts                     # Expanded interfaces (ICloudSyncBackend)
│   ├── DiffAlgorithm.ts             # Generic difference calculator
│   ├── SyncRegistry.ts              # Extended IndexedDB tracking
│   ├── LocalSyncService.ts          # Existing local sync (refactored)
│   ├── GDriveBackend.ts             # New Google Drive API implementation
│   └── CloudSyncService.ts          # Orchestrator utilizing GDriveBackend

tests/
├── packages/sync-engine/
│   ├── unit/
│   │   ├── GDriveBackend.test.ts
│   │   └── CloudSyncService.test.ts

apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── sync/                # UI components for connection/status
│   │   └── config/
│   │       └── help-content.ts      # Updated with user documentation
```

**Structure Decision**: Selected the workspace packages architecture as mandated by the "Library-First" constitution principle. The core logic is implemented in `packages/sync-engine` while the UI remains in `apps/web`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**
> N/A - No violations found.
