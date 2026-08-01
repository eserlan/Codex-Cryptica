# Tasks: Import Files from Another Vault

**Input**: Design documents from `/specs/151-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vault-to-vault-import.md

## Dependencies

- Foundation (T001–T005) blocks all user stories.
- US1 (browse/select/import) is the MVP slice; US2 (conflict visibility) and US3 (image copying) extend the same plan/copy engine and review UI.
- US4 (failure recovery) layers error handling onto the engine and modal built in US1–US3 and can be verified independently once they exist.

## Phase 1: Setup

- [ ] T001 Confirm the reusable OPFS seams in `apps/web/src/lib/utils/opfs.ts` (`getVaultDir`, `walkOpfsDirectory`, `readOpfsBlob`, `writeOpfsFile`) and the vault list seam in `apps/web/src/lib/stores/vault-registry.svelte.ts` (`availableVaults`, `rootHandle`) that the new engine and modal will call.
- [ ] T002 Add "Import from Another Vault" help guidance (what gets copied, that images come along automatically, that conflicts are skipped not merged) in `apps/web/src/lib/content/help/offline-sync.md` and register it per existing help-content conventions.

## Phase 2: Foundational — Plan/Copy Engine

- [ ] T003 [P] Add failing tests for source-file listing, plan computation (added vs. conflicting), and non-overwriting copy in `packages/vault-engine/src/vault-import.test.ts`.
- [ ] T004 Implement `listSourceVaultFiles(rootHandle, sourceVaultId)` (walks the source vault's OPFS tree, returns `SourceVaultFile[]`) and `planImport(rootHandle, sourceVaultId, targetVaultId, selectedPaths)` (returns a `CurrentVaultImportPlan` per data-model.md, comparing selected paths against the target vault's existing paths) in `packages/vault-engine/src/vault-import.ts`.
- [ ] T005 Implement `copyImportPlan(rootHandle, targetVaultId, plan)` (writes only `filesToAdd`/`imagesToAdd` via `writeOpfsFile`, never touches `conflictingPaths`, returns a `CurrentVaultImportResult`) in `packages/vault-engine/src/vault-import.ts`.

## Phase 3: User Story 1 — Bring Specific Files In From Another Vault (P1)

**Goal**: Pick another vault, browse its files, select some, and copy just those into the active vault without switching vaults.

**Independent Test**: With two vaults present, choose a source vault, select files, confirm, and verify those files exist in the current vault while it stays active and its existing files are untouched.

- [ ] T006 [P] [US1] Add tests for source-vault list rendering, file browsing/selection state, and confirm-triggers-copy behavior in `apps/web/src/lib/components/vaults/VaultImportPickerModal.test.ts`.
- [ ] T007 [US1] Build `apps/web/src/lib/components/vaults/VaultImportPickerModal.svelte`: source-vault list from `vaultRegistry.availableVaults`, file browser calling `listSourceVaultFiles`, multi-select state, confirm calling `planImport` then `copyImportPlan`, and calling `entityStore.rebuildIndexes()` (`apps/web/src/lib/stores/vault.svelte.ts`) after a successful copy so imports are immediately queryable (FR-013).
- [ ] T008 [US1] Add an entry point to open `VaultImportPickerModal` (e.g. an action in `apps/web/src/lib/components/vaults/VaultSwitcherModal.svelte` or the vault backup settings surface) that does not switch the active vault.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Make path conflicts visible before writing and skip them without modifying target files.

**Independent Test**: Select a mix of conflicting and non-conflicting files, confirm, and verify only non-conflicting files were added while every existing target file remains byte-for-byte unchanged.

- [ ] T009 [US2] Add tests for conflict-count display and disabled confirmation on an all-conflict selection in `apps/web/src/lib/components/vaults/VaultImportPickerModal.test.ts`.
- [ ] T010 [US2] Render the review step's added/conflicting counts from `CurrentVaultImportPlan` and disable the confirm action when `filesToAdd` is empty, in `apps/web/src/lib/components/vaults/VaultImportPickerModal.svelte`.

## Phase 5: User Story 3 — Bring Images Along With Their Files (P1)

**Goal**: Automatically copy a selected file's referenced images (and thumbnails) without requiring the user to select them separately.

**Independent Test**: Select a file known to reference an image, confirm, and verify the image and its thumbnail now exist in the current vault and the imported file displays correctly.

- [ ] T011 [P] [US3] Add tests for image-reference resolution (`image`/`imageArtDirection` fields), thumbnail-path derivation, image path conflicts, and missing-image reporting in `packages/vault-engine/src/vault-import.test.ts`.
- [ ] T012 [US3] Extend `listSourceVaultFiles`/`planImport` in `packages/vault-engine/src/vault-import.ts` to parse each file's `image`/`imageArtDirection` references (per `packages/schema/src/entity.ts`), resolve the matching `_thumb` path convention from `AssetManager` (`packages/vault-engine/src/asset-manager.ts`), and populate `imagesToAdd`/`missingImageRefs` on the plan.
- [ ] T013 [US3] Surface added-image and missing-image counts in the review and completion messages in `apps/web/src/lib/components/vaults/VaultImportPickerModal.svelte`.

## Phase 6: User Story 4 — Recover from Unavailable or Failed Sources (P2)

**Goal**: Explain clearly when a source vault can't be read or a write fails partway through, without changing the active vault or reporting a false success.

**Independent Test**: Attempt an import against a source vault that fails to open, and separately simulate a mid-import write failure; verify clear messaging and that no existing target file was touched in either case.

- [ ] T014 [US4] Add tests for source-vault-open failure and partial-write failure reporting (exactly what was/wasn't added) in `packages/vault-engine/src/vault-import.test.ts` and `apps/web/src/lib/components/vaults/VaultImportPickerModal.test.ts`.
- [ ] T015 [US4] Handle a source vault that fails to open (return to source selection with a message) in `copyImportPlan`/`listSourceVaultFiles` error paths (`packages/vault-engine/src/vault-import.ts`) and surface both failure modes accessibly in `apps/web/src/lib/components/vaults/VaultImportPickerModal.svelte`.

## Phase 7: Polish & Validation

- [ ] T016 Run the Svelte autofixer for `apps/web/src/lib/components/vaults/VaultImportPickerModal.svelte`.
- [ ] T017 Run affected tests, `bun --filter web lint:types`, `bun run lint`, and `bun run test`.

## Parallel execution examples

- T003 (engine tests) and T006 (modal tests) can be written in parallel once T001–T002 are done — different files, no shared state.
- T011 (image-resolution tests) can proceed in parallel with T009/T010 (conflict-display work) since they touch different files (`vault-import.test.ts` vs. `VaultImportPickerModal.*`).

## Implementation Strategy

Build the plan/copy engine in `packages/vault-engine` first (T003–T005), since every user story depends on it. Ship US1 alone as the MVP (browse another vault, select files, copy them in) — it's independently testable and delivers the core value. Layer US2's conflict visibility and US3's automatic image copying on top before considering the feature complete, since both are P1 and part of what makes the import trustworthy. US4's failure-path polish can land last. Do not add overwrite choices or content-aware entity merging in this feature.
