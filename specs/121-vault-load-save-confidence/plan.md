# Implementation Plan: Vault Load/Save Confidence

**Branch**: `121-vault-load-save-confidence` | **Date**: 2026-05-26 | **Spec**: [spec.md](file:///home/espen/proj/remotecodexarcana/specs/121-vault-load-save-confidence/spec.md)
**Input**: Feature specification from `/specs/121-vault-load-save-confidence/spec.md`

## Summary

Make vault folder load and save operations more understandable, interrupt-safe, and observable. We will introduce new reactive status states (`"needs-permission"`, `"saved"`) in `SyncStore`, check folder permissions silently on startup without prompting, add a non-blocking timeout of 5 seconds when draining pending saves during vault switches, and implement user-friendly visual confirmations and error messages.

## Technical Context

- **Language/Version**: TypeScript 6.0.3, Svelte 5 Runes
- **Primary Dependencies**: `@codex/events`, `@codex/vault-engine` (in `packages/vault-engine`)
- **Storage**: IndexedDB (local cache registry), OPFS (origin-private file system for raw Markdown/JSON data), Local Filesystem (via browser File System Access API)
- **Testing**: Vitest for unit/integration tests
- **Target Platform**: Desktop browsers with File System Access API (Chromium, Safari 15.2+, Firefox 111+)
- **Project Type**: Web application (`apps/web`) + Packages
- **Performance Goals**: Vault switch completes in < 5 seconds under any disk write load.
- **Constraints**: No permission-request prompts or directory pickers on automatic page/vault load. User activation is strictly required before requesting directory handles or permissions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: Core sync coordination belongs to `packages/vault-engine/src/sync-coordinator.ts`. The UI (`apps/web`) only binds to the facade.
2. **Test-Driven Development (TDD)**: We will write comprehensive unit tests in `sync-store.test.ts` and `lifecycle.test.ts` for all status transitions, permission checks, and timeout handling.
3. **Privacy & Client-Side**: Vault folder operations are fully client-side. No user data leaks to external servers.
4. **Dependency Injection (DI)**: We will respect the constructor-based DI setup of `SyncStore`, `VaultLifecycleManager`, and `SyncCoordinator`.
5. **Natural Language**: Replacing "sync" terminology with "Load", "Save", and "Link".

## Project Structure

### Documentation (this feature)

```text
specs/121-vault-load-save-confidence/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── vaults/
│   │   │   │   └── VaultSwitcherModal.svelte   # Vault list load/save UI actions
│   │   │   └── VaultControls.svelte            # Main header folder linkage & save controls
│   │   └── stores/
│   │       ├── vault.svelte.ts                 # Vault Store front facade
│   │       └── vault/
│   │           ├── sync-store.svelte.ts        # Handles status tracking & permission checks
│   │           └── lifecycle.ts                # Orchestrates vault switches and save-draining
│   └── tests/
│       └── mocks/                              # Directory handle permission mocks
packages/vault-engine/
└── src/
    └── sync-coordinator.ts                     # Core push/pull file coordination logic
```

**Structure Decision**: Monorepo structure utilizing the SvelteKit frontend app (`apps/web`) and the local-first engine package (`packages/vault-engine`). Real paths mapped above.

## Complexity Tracking

_No violations of Constitution Check._
