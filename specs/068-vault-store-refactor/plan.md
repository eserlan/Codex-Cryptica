# Implementation Plan: Vault Store Refactor

**Branch**: `068-vault-store-refactor` | **Date**: 2026-03-11 | **Spec**: `/specs/068-vault-store-refactor/spec.md`
**Input**: Feature specification from `/specs/068-vault-store-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Refactor the monolithic `VaultStore` (1,381 lines) into a lean repository pattern. Core I/O, synchronization, and asset management will be extracted into a new `@codex/vault-engine` package. The web application's `VaultStore` will be reduced to an ultra-thin UI state controller (< 300 LOC) that orchestrates these modular services using constructor-based Dependency Injection.

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: Svelte 5 (Runes), IndexedDB (`idb`), OPFS (Origin Private File System)
**Storage**: OPFS (Primary content), IndexedDB (Registry & Metadata)
**Testing**: Vitest (Unit & Integration), Playwright (E2E)
**Target Platform**: Web Browser (Client-side)
**Project Type**: Web application + Standalone Package (`packages/vault-engine`)
**Performance Goals**: Maintain 60fps during graph updates; switch vaults in < 500ms.
**Constraints**: MUST preserve all existing unit tests and E2E coverage.
**Scale/Scope**: ~1400 LOC refactoring into 4+ services.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Library-First**: All non-UI logic (I/O, Sync, Assets) will move to `packages/vault-engine`. PASS.
- **II. Test-Driven Development (TDD)**: Mandates 100% parity with existing `vault.test.ts`. PASS.
- **III. Simplicity & YAGNI**: Removing the "God Object" is a major simplicity win. PASS.
- **IV. AI-First Extraction**: N/A (Business logic focused). PASS.
- **V. Privacy & Client-Side Processing**: Remains 100% browser-native (OPFS/IndexedDB). PASS.
- **VI. Clean Implementation**: Uses Svelte 5 Runes and Constructor DI (ADR 007). PASS.
- **VII. User Documentation**: N/A (Internal refactoring). PASS.

## Project Structure

### Documentation (this feature)

```text
specs/317-068-vault-store/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
packages/vault-engine/
├── package.json
├── src/
│   ├── repository.ts      # Extracted: OPFS I/O & serialization
│   ├── sync-coordinator.ts # Extracted: Sync & conflict logic
│   ├── asset-manager.ts   # Extracted: Image & URL resolution
│   ├── types.ts           # Shared engine types
│   └── index.ts
└── tests/
    └── unit/

apps/web/
└── src/
    └── lib/
        └── stores/
            ├── vault.svelte.ts       # Ultra-thin controller (< 300 LOC)
            ├── vault-registry.svelte.ts # (Existing) Vault management
            ├── map-registry.svelte.ts   # New: Map-specific store
            └── canvas-registry.svelte.ts # New: Canvas-specific store
```

**Structure Decision**: Logic moves to `packages/vault-engine`. UI state remains in `apps/web` but uses the engine for all domain operations.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      |            |                                      |
