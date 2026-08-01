# Tasks: Import Files from the File System

**Input**: Design documents from `/specs/151-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vault-to-vault-import.md

## Dependencies

- Foundation (T001–T006) blocks all user stories.
- US1 (drag/upload → import) is the MVP slice; US2 (conflict visibility) and US3 (image copying + missing-image resolution) extend the same plan/copy engine and review UI.
- US4 (failure recovery) layers error handling onto the engine and modal built in US1–US3 and can be verified independently once they exist.

## Phase 1: Setup

- [ ] T001 Confirm the reusable seams this feature depends on: `apps/web/src/lib/utils/opfs.ts` (`writeOpfsFile`), `apps/web/src/lib/utils/fs.ts` (`pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`), and `apps/web/src/lib/stores/vault.svelte.ts` (`entityStore.rebuildIndexes`).
- [ ] T002 Add "Import Files" help guidance (drag/drop or upload individual files, images come along only if included in the drop, missing-image resolution options, conflicts are skipped not merged) in `apps/web/src/lib/content/help/offline-sync.md` and register it per existing help-content conventions.

## Phase 2: Foundational — Selection Parsing & Plan/Copy Engine

- [ ] T003 [P] Add failing tests for interpreting a flat `File[]` (from `<input type="file">`) and a dropped `DataTransferItemList` (including a folder via `webkitGetAsEntry`) into `SourceSelection`/`SourceVaultFile[]`, in `packages/vault-engine/src/vault-import.test.ts`.
- [ ] T004 Implement `parseFileList(files: FileList | File[])` and `parseDataTransferItems(items: DataTransferItemList)` (walking any dropped `FileSystemDirectoryEntry`) → `SourceSelection`, extracting each file's `image`/`imageArtDirection` references (per `packages/schema/src/entity.ts`) into `SourceVaultFile.imageRefs`, in `packages/vault-engine/src/vault-import.ts`.
- [ ] T005 [P] Add failing tests for `planImport` (added vs. conflicting vs. missing image refs) and `copyImportPlan` (non-overwriting writes) in `packages/vault-engine/src/vault-import.test.ts`.
- [ ] T006 Implement `planImport(rootHandle, targetVaultId, selection)` (returns a `CurrentVaultImportPlan` per data-model.md, comparing target paths against the target vault's existing OPFS paths) and `copyImportPlan(rootHandle, targetVaultId, plan)` (writes only `filesToAdd`/`imagesToAdd` via `writeOpfsFile`, never touches `conflictingPaths`, returns a `CurrentVaultImportResult`) in `packages/vault-engine/src/vault-import.ts`.

## Phase 3: User Story 1 — Bring Specific Files In From My File System (P1)

**Goal**: Drag files (or a folder) onto a drop area, or use the file upload dialog, review exactly what was picked up, and copy the selected files into the active vault.

**Independent Test**: Drag a handful of files onto the import area (or pick them via the file dialog), confirm, and verify those files exist in the current vault while it stays active and its existing files are untouched.

- [ ] T007 [P] [US1] Add tests for drop-area drag/drop handling, the file upload dialog fallback, showing exactly what was picked up, and confirm-triggers-copy behavior in `apps/web/src/lib/components/vaults/VaultFileImportModal.test.ts`.
- [ ] T008 [US1] Build `apps/web/src/lib/components/vaults/VaultFileImportModal.svelte`: a drop zone (`ondragover`/`ondrop` calling `parseDataTransferItems`) plus a `<input type="file" multiple webkitdirectory={false}>` upload button (calling `parseFileList`), a "here's what was picked up" list, confirm calling `planImport` then `copyImportPlan`, and calling `entityStore.rebuildIndexes()` (`apps/web/src/lib/stores/vault.svelte.ts`) after a successful copy so imports are immediately queryable (FR-015).
- [ ] T009 [US1] Add an entry point to open `VaultFileImportModal` (e.g. an action in vault settings or the vault switcher) that does not switch the active vault.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Make path conflicts visible before writing and skip them without modifying target files.

**Independent Test**: Select a mix of conflicting and non-conflicting files, confirm, and verify only non-conflicting files were added while every existing target file remains byte-for-byte unchanged.

- [ ] T010 [US2] Add tests for conflict-count display and disabled confirmation on an all-conflict selection in `apps/web/src/lib/components/vaults/VaultFileImportModal.test.ts`.
- [ ] T011 [US2] Render the review step's added/conflicting counts from `CurrentVaultImportPlan` and disable the confirm action when `filesToAdd` is empty, in `apps/web/src/lib/components/vaults/VaultFileImportModal.svelte`.

## Phase 5: User Story 3 — Bring Images Along With Their Files (P1)

**Goal**: Automatically include a selected file's referenced images when they were part of the drop/selection (including a dropped folder), and offer a clear resolution path when they weren't.

**Independent Test**: Drop a folder containing an entity file and its referenced image; verify the image and its thumbnail import automatically. Separately, drop just the entity file alone; verify the review step prompts for the missing image and both resolution options work (add directly; grant folder access where supported).

- [ ] T012 [P] [US3] Add tests in `packages/vault-engine/src/vault-import.test.ts` for: image present in selection (added), image present via dropped folder (added), image absent → appears in `missingImageRefs`, thumbnail-path convention matching `AssetManager` (`packages/vault-engine/src/asset-manager.ts`), and image path conflicts (skipped like any other conflict).
- [ ] T013 [US3] Implement `resolveMissingImage(missingRef, { addedFile? , sourceFolderHandle? })` in `packages/vault-engine/src/vault-import.ts`: accepts either a directly-added `File` or a granted `FileSystemDirectoryHandle` to search (walking it, including `images/`), updating the `MissingImageReference.resolution`.
- [ ] T014 [US3] Add tests for the missing-image review UI: prompting for each `missingImageRefs` entry, offering "add file" (calls `resolveMissingImage` with `addedFile`) and, when `isFileSystemAccessSupported()` is true, "use folder" (calls `pickDirectory()` then `resolveMissingImage` with the handle) — falling back to explaining via `getFileSystemAccessUnsupportedMessage()` when unsupported, in `apps/web/src/lib/components/vaults/VaultFileImportModal.test.ts`.
- [ ] T015 [US3] Implement the missing-image resolution step and updated added/missing-image counts in the review and completion messages in `apps/web/src/lib/components/vaults/VaultFileImportModal.svelte`.

## Phase 6: User Story 4 — Recover from Unavailable or Failed Imports (P2)

**Goal**: Explain clearly when a dropped/selected file can't be read or a write fails partway through, without changing the active vault or reporting a false success.

**Independent Test**: Include a file that fails to read in the selection, and separately simulate a mid-import write failure; verify clear messaging in both cases and that no existing target file was touched.

- [ ] T016 [US4] Add tests for unreadable-file exclusion/reporting and partial-write failure reporting (exactly what was/wasn't added) in `packages/vault-engine/src/vault-import.test.ts` and `apps/web/src/lib/components/vaults/VaultFileImportModal.test.ts`.
- [ ] T017 [US4] Handle per-file read failures (exclude from the plan, populate `SourceSelection.unreadable`, don't block the rest) in `parseFileList`/`parseDataTransferItems`, and partial-write failure reporting in `copyImportPlan` (`packages/vault-engine/src/vault-import.ts`); surface both accessibly in `apps/web/src/lib/components/vaults/VaultFileImportModal.svelte`.

## Phase 7: Polish & Validation

- [ ] T018 Run the Svelte autofixer for `apps/web/src/lib/components/vaults/VaultFileImportModal.svelte`.
- [ ] T019 Run affected tests, `bun --filter web lint:types`, `bun run lint`, and `bun run test`.

## Parallel execution examples

- T003 (selection-parsing tests) and T005 (plan/copy tests) can be written in parallel — different concerns within the same file, but independent of each other's fixtures.
- T007 (modal drag/drop + upload tests) can proceed in parallel with T012 (image-resolution engine tests) since they touch different files.

## Implementation Strategy

Build selection parsing and the plan/copy engine in `packages/vault-engine` first (T003–T006), since every user story depends on it. Ship US1 alone as the MVP (drag or upload files, review, copy them in) — it's independently testable and delivers the core value. Layer US2's conflict visibility and US3's image handling (including the missing-image fallback) on top before considering the feature complete, since both are P1 and part of what makes the import trustworthy. US4's failure-path polish can land last. Do not add overwrite choices or content-aware entity merging in this feature.
