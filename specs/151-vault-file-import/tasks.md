# Tasks: Import Files from the File System

**Input**: Design documents from `/specs/151-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/vault-to-vault-import.md

## Dependencies

- Foundation (T001–T006) blocks all user stories.
- US1 (drag/upload → import) is the MVP slice; US2 (never-overwrite review) and US3 (image copying + missing-image resolution) extend the same converter and existing review UI.
- US4 (failure recovery) layers error handling onto the pieces built in US1–US3 and can be verified independently once they exist.

## Phase 1: Setup

- [ ] T001 Confirm the reusable seams this feature depends on: `packages/importer/src/cc/package.ts` (`EntityDraft`, `AssetDraft`, `CCImportPackage`), `packages/importer/src/cc/engine.ts` (`ImportEngine`), `apps/web/src/lib/features/importer/web-vault-writer.ts` (`WebVaultWriter`), and `apps/web/src/lib/utils/fs.ts` (`pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`).
- [ ] T002 Add "Import Files" help guidance (drag/drop or upload individual files, images come along only if included in the drop, missing-image resolution options, matches are always skipped not merged) in `apps/web/src/lib/content/help/offline-sync.md` and register it per existing help-content conventions.

## Phase 2: Foundational — Mechanical Converter (`packages/importer/src/vault-files/`)

- [ ] T003 [P] Add failing tests for recognizing a dropped file as existing Codex Cryptica entity content (valid frontmatter shape) vs. rejecting unrelated files, in `packages/importer/src/vault-files/detect.test.ts`.
- [ ] T004 Implement `isVaultEntityFile(relativePath: string, content: string): boolean` in `packages/importer/src/vault-files/detect.ts`, reusing the existing frontmatter-shape conventions (per `apps/web/src/lib/utils/markdown.ts`).
- [ ] T005 [P] Add failing tests for `droppedItemsToPackage`: an entity file alone (no image refs) → one `EntityDraft`; an entity file whose `image`/`thumbnail` matches a dropped image `DroppedItem` by path → matching `AssetDraft` with `placementRef` set; an entity file whose image ref has no match → surfaced as an unresolved reference, not silently dropped; a non-entity file → excluded with an `ImportWarning`, in `packages/importer/src/vault-files/convert.test.ts`.
- [ ] T006 Implement `droppedItemsToPackage(items: DroppedItem[]): { pkg: CCImportPackage; missingImageRefs: MissingImageReference[] }` in `packages/importer/src/vault-files/convert.ts` (parses each recognized file's frontmatter into an `EntityDraft` with `sourcePath`, matches `image`/`thumbnail` references against other dropped items by relative path into `AssetDraft`s, collects unmatched references into `missingImageRefs`). Export both from `packages/importer/src/vault-files/index.ts` and re-export via `packages/importer/src/index.ts`.

## Phase 3: User Story 1 — Bring Specific Files In From My File System (P1)

**Goal**: Drag files (or a folder) onto a drop area, or use the file upload dialog, review exactly what was picked up, and copy the selected files into the active vault via the existing import review/commit flow.

**Independent Test**: Drag a handful of entity files onto the import area (or pick them via the file dialog), confirm through review, and verify those files exist as entities in the current vault while it stays active and its existing entities are untouched.

- [ ] T007 [P] [US1] Add tests for drop-area drag/drop handling (including `webkitGetAsEntry` folder walking) and the file upload dialog fallback, producing the `DroppedItem[]` passed to `droppedItemsToPackage`, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T008 [US1] Add a new source-detection branch to `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`: on file-system drop/upload, call `droppedItemsToPackage`, then `ImportEngine.prepare()` (via the existing `createImportEngine(createWebVaultWriter(vault))`) to populate `ccSession`, reusing the existing `"cc"` `importMode` review/report steps.
- [ ] T009 [US1] Add the drop zone and file upload button entry point to `apps/web/src/lib/components/settings/ImportSettings.svelte`, wired to the new controller branch, without switching the active vault.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Ensure a path/entity match is always treated as "skip," never "update," for this source — no existing target entity is ever modified.

**Independent Test**: Select a mix of files where some match existing vault entities (by `sourcePath`) and some don't; confirm; verify only the non-matching files were created and every existing target entity's fields are byte-for-byte unchanged.

- [ ] T010 [US2] Add tests confirming the review step never renders or allows an "update" choice for this source's matched items, and that the confirm action is disabled when every item is a skip, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T011 [US2] In the controller, force `matchDecision: "skip"` (via `setMatchDecision`) for every matched `PreviewItem` when the session's source is this feature's file-system import, and disable confirmation when `session.items.every(i => i.decision === "ignore" || i.matchDecision === "skip")`.

## Phase 5: User Story 3 — Bring Images Along With Their Files (P1)

**Goal**: Automatically include a selected file's referenced images when they were part of the drop/selection (including a dropped folder), and offer a clear resolution path when they weren't.

**Independent Test**: Drop a folder containing an entity file and its referenced image; verify the image imports automatically as part of the entity's `AssetDraft`. Separately, drop just the entity file alone; verify the review step prompts for the missing image and both resolution options work (add directly; grant folder access where supported).

- [ ] T012 [P] [US3] Add tests for `resolveMissingImage` in `packages/importer/src/vault-files/convert.test.ts`: resolving a `MissingImageReference` via a directly-added `File` (produces a new `AssetDraft`), via a granted `FileSystemDirectoryHandle` search (walking it, including any `images/` subfolder), and remaining `still-missing` when not found either way.
- [ ] T013 [US3] Implement `resolveMissingImage(ref: MissingImageReference, { addedFile?: File; sourceFolderHandle?: FileSystemDirectoryHandle }): Promise<AssetDraft | null>` in `packages/importer/src/vault-files/convert.ts`.
- [ ] T014 [US3] Add tests for the missing-image review UI: prompting for each `missingImageRefs` entry, offering "add file" and, when `isFileSystemAccessSupported()` is true, "use folder" (calls `pickDirectory()` then `resolveMissingImage` with the handle) — falling back to explaining via `getFileSystemAccessUnsupportedMessage()` when unsupported, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T015 [US3] Wire the missing-image resolution step into `apps/web/src/lib/components/settings/ImportSettings.svelte` review UI, re-running `ImportEngine.prepare()` with the augmented package once images are resolved (or proceeding with them reported missing).

## Phase 6: User Story 4 — Recover from Unavailable or Failed Imports (P2)

**Goal**: Explain clearly when a dropped/selected file can't be read or a commit fails partway through, without changing the active vault or reporting a false success.

**Independent Test**: Include a file that fails to read in the selection, and separately simulate `ImportEngine.commit` failing on one entity; verify clear messaging in both cases and that no existing target entity was touched.

- [ ] T016 [US4] Add tests for unreadable-file exclusion/reporting during `DroppedItem[]` collection, and for surfacing `ImportReport.failures` in the report step, in `packages/importer/src/vault-files/convert.test.ts` and `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T017 [US4] Handle per-file read failures during drag/drop and upload collection (exclude from `DroppedItem[]`, report via `SourceSelection.unreadable`, don't block the rest) in the controller's collection step; confirm `ImportEngine.commit`'s existing `failures` reporting (`engine.ts:568`) is surfaced verbatim in the report UI.

## Phase 7: Polish & Validation

- [ ] T018 Run the Svelte autofixer for `apps/web/src/lib/components/settings/ImportSettings.svelte`.
- [ ] T019 Run affected tests, `bun --filter web lint:types`, `bun run lint`, and `bun run test`.

## Parallel execution examples

- T003 (detection tests) and T005 (conversion tests) can be written in parallel — different files.
- T007 (controller drop/upload tests) can proceed in parallel with T012 (image-resolution engine tests) since they touch different packages.

## Implementation Strategy

Build the mechanical converter in `packages/importer/src/vault-files/` first (T003–T006), since every user story depends on it and it has no UI dependencies. Ship US1 alone as the MVP (drag or upload files, review through the existing `ImportEngine` flow, commit) — it's independently testable and delivers the core value by wiring a new source into infrastructure that already exists. Layer US2's forced-skip behavior and US3's image handling (including the missing-image fallback) on top before considering the feature complete, since both are P1 and part of what makes the import trustworthy. US4's failure-path polish can land last. Do not add "update" as a review option or content-aware entity merging in this feature.
