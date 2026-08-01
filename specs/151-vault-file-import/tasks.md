# Tasks: Import Files from the File System

**Input**: Design documents from `/specs/151-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/file-system-import.md

## Dependencies

- Foundation (T001–T010) blocks all user stories.
- US1 (drag/upload → import) is the MVP slice; US2 (never-overwrite review) and US3 (image copying + missing-image resolution) extend the same converter and existing review UI.
- US4 (failure recovery) layers error handling onto the pieces built in US1–US3 and can be verified independently once they exist.

## Phase 1: Setup

- [ ] T001 Confirm the reusable seams this feature depends on: `packages/importer/src/cc/package.ts` (`EntityDraft`, `AssetDraft`, `CCImportPackage`), `packages/importer/src/cc/engine.ts` (`ImportEngine`), `apps/web/src/lib/features/importer/web-vault-writer.ts` (`WebVaultWriter`), `apps/web/src/lib/utils/fs.ts` (`pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`), and the `createCifEngine()` pattern in `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts:255-267` this feature's own engine construction will mirror.
- [ ] T002 Add "Import Files" help guidance (drag/drop or upload individual files, images come along only if included in the drop, missing-image resolution options, matches are always skipped not merged) as a new/extended article in `apps/web/src/lib/content/help/offline-sync.md`. No separate `help-content.ts` registration is needed — help articles under `content/help/*.md` are auto-discovered via `import.meta.glob` in `apps/web/src/lib/content/loader.ts:89-97`.

## Phase 2: Foundational — Mechanical Converter (`packages/importer/src/vault-files/`)

- [ ] T003 [P] Add failing tests for recognizing a dropped file as existing Codex Cryptica entity content (valid frontmatter shape) vs. rejecting unrelated files, in `packages/importer/src/vault-files/detect.test.ts`.
- [ ] T004 Implement `isVaultEntityFile(relativePath: string, content: string): boolean` in `packages/importer/src/vault-files/detect.ts`, reusing the existing frontmatter-shape conventions (per `apps/web/src/lib/utils/markdown.ts`).
- [ ] T005 [P] Add failing tests for `VAULT_FILES_MAPPING_RULES`: each real Codex Cryptica entity type (Character, Location, Item, Lore, Creature, and any other values `Entity["type"]` supports) maps to itself via `mapDraftToType`, with no entity falling through to the `"note"` default when its frontmatter `type` is a recognized value, in `packages/importer/src/vault-files/mapping.test.ts`.
- [ ] T006 Implement `VAULT_FILES_MAPPING_RULES: MappingRuleSet` in `packages/importer/src/vault-files/mapping.ts` — one `{ when: { sourceType: X }, thenType: X }` rule per real entity type, `defaultType` reserved for genuinely unrecognized types (reported as a `typeFallback` warning, not silently accepted).
- [ ] T007 [P] Add failing tests for `vaultFileSourceRefBuilder`: identity is derived from `sourcePath` alone (two drafts with the same `sourcePath` produce the same ref; different paths never collide; no `sourceId`/title involvement), in `packages/importer/src/vault-files/source-ref.test.ts`.
- [ ] T008 Implement `vaultFileSourceRefBuilder(system: string, draft: EntityDraft): string` in `packages/importer/src/vault-files/source-ref.ts` (path-only identity — see research.md's "own `ImportEngine` instance" decision).
- [ ] T009 [P] Add failing tests for `droppedItemsToPackage`: an entity file alone (no image refs) → one `EntityDraft` with `sourceType` set from its frontmatter `type`; an entity file whose `image`/`thumbnail` matches a dropped image `DroppedItem` by path → matching `AssetDraft` with `placementRef` and a computed `contentHash` set; an entity file whose image ref has no match → surfaced as an unresolved reference, not silently dropped; two different images with the same filename but different bytes (from different dropped subfolders) → distinct `contentHash`es, no collision; a non-entity file → excluded with an `ImportWarning`, in `packages/importer/src/vault-files/convert.test.ts`.
- [ ] T010 Implement `droppedItemsToPackage(items: DroppedItem[]): { pkg: CCImportPackage; missingImageRefs: MissingImageReference[] }` in `packages/importer/src/vault-files/convert.ts` (parses each recognized file's frontmatter into an `EntityDraft` with `sourcePath`/`sourceType`, matches `image`/`thumbnail` references against other dropped items by relative path into `AssetDraft`s with a computed sha256 `contentHash` — mirroring `packages/importer/src/cif/zip.ts`'s `sha256Hex` — collects unmatched references into `missingImageRefs`). Export `droppedItemsToPackage`, `isVaultEntityFile`, `VAULT_FILES_MAPPING_RULES`, and `vaultFileSourceRefBuilder` from `packages/importer/src/vault-files/index.ts` and re-export via `packages/importer/src/index.ts`.

## Phase 3: User Story 1 — Bring Specific Files In From My File System (P1)

**Goal**: Drag files (or a folder) onto a drop area, or use the file upload dialog, review exactly what was picked up, and copy the selected files into the active vault via the existing import review/commit flow.

**Independent Test**: Drag a handful of entity files onto the import area (or pick them via the file dialog), confirm through review, and verify those files exist as entities in the current vault — with their original types preserved — while it stays active and its existing entities are untouched.

- [ ] T011 [P] [US1] Add tests for drop-area drag/drop handling (including `webkitGetAsEntry` folder walking) and the file upload dialog fallback, producing the `DroppedItem[]` passed to `droppedItemsToPackage`, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T012 [US1] Add a `createVaultFilesEngine()` method to `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`, mirroring `createCifEngine()` (T001): `new ImportEngine({ writer: createWebVaultWriter(this.deps.vault, { titleFallback: false }) }, { mappingRules: VAULT_FILES_MAPPING_RULES, sourceRefBuilder: vaultFileSourceRefBuilder })`.
- [ ] T013 [US1] Add a new source-detection branch to the controller: on file-system drop/upload, call `droppedItemsToPackage`, then `createVaultFilesEngine().prepare()` to populate `ccSession`, reusing the existing review/report steps.
- [ ] T014 [US1] Add tests confirming an imported entity's `type` in the resulting `ccSession`/committed entity matches its source frontmatter `type` (not `"note"`), in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T015 [US1] Add the drop zone and file upload button entry point to `apps/web/src/lib/components/settings/ImportSettings.svelte`, wired to the new controller branch, without switching the active vault.
- [ ] T016 [US1] Add tests confirming the review step (reused from the generic "cc" flow) actually renders, for this source: the list of picked-up files (FR-003), added/conflict counts before write (FR-004), and that confirmation is required and gated (FR-005) — verifying inherited UI behavior rather than assuming it, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T017 [US1] Add tests confirming the report step (reused) surfaces `entitiesCreated`/`itemsSkipped` counts on completion (FR-014) and that newly created entities are queryable in the vault store immediately after `commit()` resolves, with no reload call (FR-015, SC-005), in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Ensure a path match is always treated as "skip," never "update," for this source — no existing target entity is ever modified — and that "match" means an exact `sourcePath` identity, not a title-fuzzy one.

**Independent Test**: Select a mix of files where some exactly path-match existing vault entities (previously imported via this same flow) and some don't, including one that merely shares a *title* (but not path) with an unrelated existing entity; confirm; verify only the true path-matches were skipped, the title-only-coincidence file was still created, and every existing target entity's fields are byte-for-byte unchanged.

- [ ] T018 [US2] Add tests confirming `createVaultFilesEngine()`'s `WebVaultWriter` never matches by title alone (an entity sharing only a title, not a `sourcePath`-derived ref, with an existing entity is treated as new, not a match) in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T019 [US2] Add tests confirming the review step never renders or allows an "update" choice for this source's matched items, and that the confirm action is disabled when every item is a skip, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T020 [US2] In the controller, force `matchDecision: "skip"` (via `setMatchDecision`) for every matched `PreviewItem` when the session's source is this feature's file-system import, and disable confirmation when `session.items.every(i => i.decision === "ignore" || i.matchDecision === "skip")`.

## Phase 5: User Story 3 — Bring Images Along With Their Files (P1)

**Goal**: Automatically include a selected file's referenced images when they were part of the drop/selection (including a dropped folder), and offer a clear resolution path when they weren't.

**Independent Test**: Drop a folder containing an entity file and its referenced image; verify the image imports automatically as part of the entity's `AssetDraft`, content-addressed by hash. Separately, drop just the entity file alone; verify the review step prompts for the missing image and both resolution options work (add directly; grant folder access where supported).

- [ ] T021 [P] [US3] Add tests for `resolveMissingImage` in `packages/importer/src/vault-files/convert.test.ts`: resolving a `MissingImageReference` via a directly-added `File` (produces a new `AssetDraft` with `contentHash` set), via a granted `FileSystemDirectoryHandle` search (walking it, including any `images/` subfolder), and remaining `still-missing` when not found either way.
- [ ] T022 [US3] Implement `resolveMissingImage(ref: MissingImageReference, { addedFile?: File; sourceFolderHandle?: FileSystemDirectoryHandle }): Promise<AssetDraft | null>` in `packages/importer/src/vault-files/convert.ts`.
- [ ] T023 [US3] Add tests for the missing-image review UI: prompting for each `missingImageRefs` entry, offering "add file" and, when `isFileSystemAccessSupported()` is true, "use folder" (calls `pickDirectory()` then `resolveMissingImage` with the handle) — falling back to explaining via `getFileSystemAccessUnsupportedMessage()` when unsupported, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T024 [US3] Wire the missing-image resolution step into `apps/web/src/lib/components/settings/ImportSettings.svelte` review UI, re-running `createVaultFilesEngine().prepare()` with the augmented package once images are resolved (or proceeding with them reported missing).

## Phase 6: User Story 4 — Recover from Unavailable or Failed Imports (P2)

**Goal**: Explain clearly when a dropped/selected file can't be read or a commit fails partway through, without changing the active vault or reporting a false success.

**Independent Test**: Include a file that fails to read in the selection, and separately simulate `ImportEngine.commit` failing on one entity; verify clear messaging in both cases and that no existing target entity was touched.

- [ ] T025 [US4] Add tests for unreadable-file exclusion/reporting during `DroppedItem[]` collection, and for surfacing `ImportReport.failures` in the report step, in `packages/importer/src/vault-files/convert.test.ts` and `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T026 [US4] Handle per-file read failures during drag/drop and upload collection (exclude from `DroppedItem[]`, report via `SourceSelection.unreadable`, don't block the rest) in the controller's collection step; confirm `ImportEngine.commit`'s existing `failures` reporting (`engine.ts:568`) is surfaced verbatim in the report UI.

## Phase 7: Concurrency Guard (FR-017)

- [ ] T027 Add tests confirming the "Import Files" entry point is disabled/hidden while `step !== "upload"`, and that the user can cancel at any point before confirmation without side effects, in `apps/web/src/lib/components/settings/import-settings-controller.test.ts`.
- [ ] T028 Verify (or add if missing) the guard in the controller/`ImportSettings.svelte` gating the entry point on `step === "upload"`, reusing the controller's existing step state machine rather than adding new concurrency-control state.

## Phase 8: Polish & Validation

- [ ] T029 Run the Svelte autofixer for `apps/web/src/lib/components/settings/ImportSettings.svelte`.
- [ ] T030 Run affected tests, `bun --filter web lint:types`, `bun run lint`, and `bun run test`.

## Parallel execution examples

- T003, T005, T007 (detect/mapping/source-ref tests) can be written in parallel — different files, no shared state.
- T009 (conversion tests) depends on T004/T006/T008 landing first (it exercises all three), but T011 (controller drop/upload tests) can proceed in parallel with T021 (image-resolution engine tests) since they touch different packages.

## Implementation Strategy

Build the mechanical converter, its type-mapping rules, and its path-only source-ref builder in `packages/importer/src/vault-files/` first (T003–T010), since every user story depends on all three and none have UI dependencies. Ship US1 alone as the MVP (drag or upload files, review through the existing `ImportEngine` flow using this source's dedicated engine config, commit, with type preservation and inherited-UI behavior explicitly verified) — it's independently testable and delivers the core value by wiring a new source into infrastructure that already exists. Layer US2's forced-skip + exact-match behavior and US3's image handling (including content-hash dedupe and the missing-image fallback) on top before considering the feature complete, since both are P1 and part of what makes the import trustworthy. US4's failure-path polish and the FR-017 concurrency guard can land last. Do not add "update" as a review option, title-based matching, or content-aware entity merging in this feature.
