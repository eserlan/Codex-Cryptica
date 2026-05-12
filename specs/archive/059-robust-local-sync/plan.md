# Implementation Plan: Robust Local File Syncing

**Branch**: `059-robust-local-sync` | **Date**: 2026-02-24 | **Spec**: [specs/059-robust-local-sync/spec.md](spec.md)
**Input**: Feature specification from `/specs/059-robust-local-sync/spec.md`

## Summary

Implement a robust bidirectional synchronization service between the Origin Private File System (OPFS) and a local user folder. The system will maintain a `SyncRegistry` in IndexedDB to track file state, enabling accurate detection of additions, modifications, and deletions in both locations. Conflict resolution follows a "newest timestamp wins" strategy.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Svelte 5, `idb`, Web File System Access API  
**Storage**: IndexedDB (Metadata), OPFS (Internal Files), Local Filesystem (External Mirror)  
**Testing**: Vitest (Logic/Algorithm), Playwright (E2E/Permission flow)  
**Target Platform**: Modern Browser (Chromium/Safari/Firefox with FSA)
**Project Type**: Web application  
**Performance Goals**: Scan 500 files and calculate diff in < 2s  
**Constraints**: 100% Client-side, Offline-capable, No telemetry  
**Scale/Scope**: Vaults up to 10,000 entities

## Constitution Check

| Principle               | Status | Implementation Detail                                                                          |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| I. Library-First        | PASS   | Implementation will reside in a new `SyncService` within `apps/web` or `packages/editor-core`. |
| II. TDD                 | PASS   | Unit tests for the 16 state transition permutations in the diff algorithm.                     |
| III. Simplicity & YAGNI | PASS   | Using native `lastModified` and `size` rather than complex file hashing.                       |
| V. Privacy              | PASS   | Purely local execution; data never leaves the browser/user machine.                            |
| VII. User Documentation | PASS   | Correlated help article update planned for `help-content.ts`.                                  |

## Project Structure

### Documentation (this feature)

```text
specs/059-robust-local-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (to be generated)
```

### Source Code (repository root)

```text
packages/sync-engine/
├── src/
│   ├── index.ts               # Public API
│   ├── SyncRegistry.ts        # IndexedDB state management
│   ├── DiffAlgorithm.ts       # Stateless core logic
│   └── LocalSyncService.ts    # Coordinator
├── package.json
└── tests/
    └── diff.test.ts           # Algorithm tests

apps/web/src/
├── lib/
│   └── stores/
│       └── vault.svelte.ts    # UI hook (calls packages/sync-engine)
└── components/
    └── VaultControls.svelte   # Trigger UI
```

**Structure Decision**: Implementing the core engine as a standalone package (`packages/sync-engine`) per the **Library-First** principle. The web app will only handle UI triggers and permission management.

## Complexity Tracking

| Violation                    | Why Needed                     | Simpler Alternative Rejected Because                                             |
| ---------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| Persistent Metadata Registry | Required for deletion tracking | Stateless sync cannot differentiate between "new locally" and "deleted in OPFS". |
