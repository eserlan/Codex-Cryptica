---
description: "Task list for Vault Store Refactor"
---

# Tasks: Vault Store Refactor

**Input**: Design documents from `/specs/068-vault-store-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by logical extraction phase.

## Phase 1: Setup

- [x] T001 Initialize `packages/vault-engine` with `package.json` and `tsconfig.json`
- [x] T002 Verify baseline tests pass in `apps/web/src/lib/stores/vault.test.ts`
- [x] T003 Configure workspace dependencies for `@codex/vault-engine`

## Phase 2: VaultRepository Extraction

- [x] T004 [P] Implement `VaultRepository` in `packages/vault-engine/src/repository.ts`
- [x] T005 [P] Create unit tests for `VaultRepository` in `packages/vault-engine/src/repository.test.ts`
- [x] T006 [P] Extract OPFS serialization logic from `vault/io.ts` if necessary

## Phase 3: AssetManager Extraction

- [x] T007 [P] Implement `AssetManager` in `packages/vault-engine/src/asset-manager.ts` (including P2P/Guest mode resolver)
- [x] T008 [P] Create unit tests for `AssetManager` in `packages/vault-engine/src/asset-manager.test.ts`

## Phase 4: SyncCoordinator Extraction

- [x] T009 [P] Implement `SyncCoordinator` in `packages/vault-engine/src/sync-coordinator.ts`
- [x] T010 [P] Create unit tests for `SyncCoordinator` in `packages/vault-engine/src/sync-coordinator.test.ts`

## Phase 5: UI Controller Refactor

- [x] T011 [US3] Create `MapRegistryStore` in `apps/web/src/lib/stores/map-registry.svelte.ts`
- [x] T012 [US3] Create `CanvasRegistryStore` in `apps/web/src/lib/stores/canvas-registry.svelte.ts`
- [x] T013 [US1] Refactor `VaultStore` to use constructor injection for repository, sync, and assets
- [x] T014 [US1] Ensure search index coordination is maintained in `loadFiles` and `scheduleSave`
- [x] T015 [US1] Remove redundant domain logic from `apps/web/src/lib/stores/vault.svelte.ts`

## Phase 6: Polish

- [x] T016 Verify `VaultStore` line count is < 300 (SC-001)
- [x] T017 Run final regression test suite (SC-002)
