# Implementation Plan: Sync Reminder

**Branch**: `052-sync-reminder` | **Date**: 2026-02-20 | **Spec**: [/specs/052-sync-reminder/spec.md]
**Input**: Feature specification from `/specs/052-sync-reminder/spec.md`

## Summary

Implement a dynamic, reactive synchronization reminder that alerts users when they have accumulated 5 or more unsynced changes (new or modified entities). The system will use Svelte 5 Runes to monitor the "dirty" state of the vault and provide a single-click sync action within a non-intrusive UI notification.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), Tailwind 4, `idb` (IndexedDB wrapper)  
**Storage**: IndexedDB (Metadata), OPFS (Files), LocalStorage (UI State/Last Reminded)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Modern Browsers (WASM/FSA support)
**Project Type**: Monorepo (Web App + Packages)  
**Performance Goals**: Sync reminder trigger < 100ms after threshold breach; Sync completion < 2s for typical batches.  
**Constraints**: Offline-first; No server-side persistence; Browser-only.  
**Scale/Scope**: Monitoring state across 1,000+ entities in the `vault` store.

## Constitution Check

| Gate                     | Status | Logic                                                                                                                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Library-First**        | PASS   | Sync reminder logic is inherently tied to the `VaultStore` and UI notification system in `apps/web`. No new core package needed, but logic should be modular within the store. |
| **TDD**                  | PASS   | Vitest tests will be written for the `VaultStore` changes to verify threshold logic and suppression.                                                                           |
| **Simplicity**           | PASS   | Leveraging Svelte 5's `$derived` and `$effect` for reactive monitoring instead of polling.                                                                                     |
| **Privacy**              | PASS   | All tracking and reminders happen locally in the browser.                                                                                                                      |
| **Clean Implementation** | PASS   | Using Svelte 5 Runes correctly; strict TypeScript typing.                                                                                                                      |
| **User Documentation**   | PASS   | Will add a brief description to the Help Guide system.                                                                                                                         |

## Project Structure

### Documentation (this feature)

```text
specs/052-sync-reminder/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (to be created)
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   └── notifications/
│   │       └── SyncReminder.svelte  # New component
│   ├── stores/
│   │   └── vault.svelte.ts         # Update to include dirty tracking
│   └── config/
│       └── help-content.ts         # Add user documentation
└── tests/
    └── sync-reminder.test.ts        # New tests
```

**Structure Decision**: Web application integration. The feature is primarily a UI enhancement driven by existing store states.

## Complexity Tracking

_No violations detected._
