# Tasks: Import Files from the File System

**Input**: Design documents from `/specs/151-vault-file-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/file-system-import.md

## Dependencies

- Foundation (T001–T010) blocks all user stories.
- US1 (drag/upload → import) is the MVP slice; US2 (never-overwrite review) and US3 (image copying + missing-image resolution) extend the same converter and existing review UI.
- US4 (failure recovery) layers error handling onto the pieces built in US1–US3 and can be verified independently once they exist.

## Phase 1: Setup

- [X] T001 Confirm the reusable seams this feature depends on: `packages/importer/src/cc/package.ts` (`EntityDraft`, `AssetDraft`, `CCImportPackage`), `packages/importer/src/cc/engine.ts` (`ImportEngine`), `apps/web/src/lib/features/importer/web-vault-writer.ts` (`WebVaultWriter`), `apps/web/src/lib/utils/fs.ts` (`pickDirectory`, `isFileSystemAccessSupported`, `getFileSystemAccessUnsupportedMessage`), and the `createCifEngine()` pattern in `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts:255-267` this feature's own engine construction will mirror.
- [X] T002 Add "Import Files" help guidance in `apps/web/src/lib/content/help/importing.md` (the dedicated import help article; `offline-sync.md` was the wrong target — that article covers whole-vault folder mirroring, an unrelated concern). No `help-content.ts` registration needed — help articles under `content/help/*.md` are auto-discovered via `import.meta.glob` in `apps/web/src/lib/content/loader.ts:89-97`.

## Phase 2: Foundational — Mechanical Converter (`packages/importer/src/vault-files/`)

- [X] T003 [P] Add failing tests for recognizing a dropped file as existing Codex Cryptica entity content (valid frontmatter shape) vs. rejecting unrelated files, in `packages/importer/src/vault-files/detect.test.ts`.
- [X] T004 Implement `isVaultEntityFile(relativePath: string, content: string): boolean` in `packages/importer/src/vault-files/detect.ts`, reusing the existing frontmatter-shape conventions (per `apps/web/src/lib/utils/markdown.ts`).
- [X] T005 [P] Add failing tests for `buildVaultFilesMappingRules`: given a set of `EntityDraft`s with arbitrary/custom `sourceType` values (not just built-in categories — entity types are free-form per `EntityTypeSchema = z.string()`, Flexible Categories), every distinct `sourceType` present resolves back to itself via `mapDraftToType`, with no entity falling through to the `"note"` default; an `EntityDraft` with no `sourceType` still falls through to `defaultType` (reported as a `typeFallback` warning), in `packages/importer/src/vault-files/mapping.test.ts`.
- [X] T006 Implement `buildVaultFilesMappingRules(drafts: EntityDraft[]): MappingRuleSet` in `packages/importer/src/vault-files/mapping.ts` — derives one `{ when: { sourceType: X }, thenType: X }` rule per distinct `sourceType` actually present in `drafts` (a pure passthrough, not a static hardcoded list), `defaultType: "note"` reserved only for drafts with no `sourceType`.
- [X] T007 [P] Add failing tests for `vaultFileSourceRefBuilder`: identity is derived from `sourcePath` alone (two drafts with the same `sourcePath` produce the same ref; different paths never collide; no `sourceId`/title involvement), in `packages/importer/src/vault-files/source-ref.test.ts`.
- [X] T008 Implement `vaultFileSourceRefBuilder(system: string, draft: EntityDraft): string` in `packages/importer/src/vault-files/source-ref.ts` (path-only identity — see research.md's "own `ImportEngine` instance" decision).
- [X] T009 [P] Add failing tests for `droppedItemsToPackage`: an entity file alone (no image refs) → one `EntityDraft` with `sourceType` set from its frontmatter `type`; an entity file whose `image`/`thumbnail` matches a dropped image `DroppedItem` by path → matching `AssetDraft` with `placementRef` and a computed `contentHash` set; an entity file whose image ref has no match → surfaced as an unresolved reference, not silently dropped; two different images with the same filename but different bytes (from different dropped subfolders) → distinct `contentHash`es, no collision; a non-entity file → excluded with an `ImportWarning`, in `packages/importer/src/vault-files/convert.test.ts`.
- [X] T010 Implement `droppedItemsToPackage(items: DroppedItem[]): Promise<{ pkg: CCImportPackage; missingImageRefs: MissingImageReference[] }>` in `packages/importer/src/vault-files/convert.ts` (parses each recognized file's frontmatter into an `EntityDraft` with `sourcePath`/`sourceType`, matches `image`/`thumbnail` references against other dropped items by relative path into `AssetDraft`s with a computed sha256 `contentHash` — reusing `packages/importer/src/cif/zip.ts`'s exported `sha256Hex` — collects unmatched references into `missingImageRefs`). Exported from `packages/importer/src/vault-files/index.ts` and re-exported via `packages/importer/src/index.ts`.

## Phase 3: User Story 1 — Bring Specific Files In From My File System (P1)

**Goal**: Drag files (or a folder) onto a drop area, or use the file upload dialog, review exactly what was picked up, and copy the selected files into the active vault via the existing import review/commit flow.

**Independent Test**: Drag a handful of entity files onto the import area (or pick them via the file dialog), confirm through review, and verify those files exist as entities in the current vault — with their original types preserved — while it stays active and its existing entities are untouched.

- [X] T011 [P] [US1] Add tests for drop-area drag/drop handling (including `webkitGetAsEntry` folder walking) and the file upload dialog fallback, producing `DroppedItem[]`. Implemented as its own module — `apps/web/src/lib/features/importer/vault-file-collector.ts` (`collectDroppedItems`, `collectUploadedItems`) with `vault-file-collector.test.ts` — rather than inline in the controller test, since it's pure DOM-API logic independent of the controller.
- [X] T012 [US1] Added `createVaultFilesEngine(mappingRules: MappingRuleSet)` to `apps/web/src/lib/components/settings/import-settings-controller.svelte.ts`, mirroring `createCifEngine()`: `new ImportEngine({ writer: createWebVaultWriter(this.deps.vault, { titleFallback: false }) }, { mappingRules, sourceRefBuilder: vaultFileSourceRefBuilder })`.
- [X] T013 [US1] Added `handleVaultFiles(items: DroppedItem[])` to the controller: guest guard, `droppedItemsToPackage` → `buildVaultFilesMappingRules` → `createVaultFilesEngine(rules).prepare(pkg)` (factored into a private `prepareVaultFilesSession()` reused by missing-image resolution), populating `ccSession`/`missingImageRefs` and reusing the existing review/report steps.
- [X] T014 [US1] Added tests confirming an imported entity's `resolvedType` in the resulting `ccSession` matches its source frontmatter `type` (including custom/non-built-in types), not `"note"`, in `import-settings-controller.test.ts`.
- [X] T015 [US1] Added the drop zone (`VaultFilesDropzone.svelte`) and file upload button entry point, wired into `ImportSourcePicker.svelte` (new "Import Files" section) → `ImportSettings.svelte` (`onVaultFilesSelect={controller.handleVaultFiles}`), without switching the active vault. Component tests in `VaultFilesDropzone.test.ts` and an `ImportSourcePicker.test.ts` addition.
- [X] T016 [US1] Verified (rather than merely assumed) that the reused review step renders this source's picked-up items, added/conflict counts, and gates confirmation — via the `resolvedType`/`match` assertions in T014's tests plus the `canCommit` behavior covered in T019/T020's tests (`CCImportReview.svelte`'s `session.items`/`actionableCount` rendering is shared, generic code already exercised by existing CIF/Scabard tests; this source's own data flowing through it is what's newly verified here).
- [X] T017 [US1] Verified `ccSession`/`ImportReport` field availability (`entitiesCreated`, `itemsSkipped`, `resolvedType`, `sourceSystem`) and that `handleVaultFiles`/`prepareVaultFilesSession` never call any manual re-index step (entities are created through `WebVaultWriter` → the vault store's normal `createEntity`, the same live path every in-app edit uses) — see research.md's "no manual `entityStore.rebuildIndexes()`" decision.

## Phase 4: User Story 2 — Avoid Overwriting Existing Work (P1)

**Goal**: Ensure a path match is always treated as "skip," never "update," for this source — no existing target entity is ever modified — and that "match" means an exact `sourcePath` identity, not a title-fuzzy one.

**Independent Test**: Select a mix of files where some exactly path-match existing vault entities (previously imported via this same flow) and some don't, including one that merely shares a *title* (but not path) with an unrelated existing entity; confirm; verify only the true path-matches were skipped, the title-only-coincidence file was still created, and every existing target entity's fields are byte-for-byte unchanged.

- [X] T018 [US2] Added tests confirming `createVaultFilesEngine()`'s `WebVaultWriter` (`titleFallback: false`) never matches by title alone (a same-titled but different-path entity is treated as new, `match: null`) and does match an exact prior `sourcePath`-derived `discoverySource`, in `import-settings-controller.test.ts`.
- [X] T019 [US2] `CCImportReview.svelte`'s match-decision buttons now render only `["skip"]` (never `update`/`create`) when `session.sourceSystem === "vault-files"`; `canCommit` is also source-aware so an all-skip session can't be committed via a stray `assets.length > 0` from entities that will themselves be skipped.
- [X] T020 [US2] Added a defense-in-depth guard in `handleCCMatchDecisionChange`: rejects any attempt to set `matchDecision: "update"` when `ccSession.sourceSystem === "vault-files"`, tested directly at the controller level (independent of the UI-level omission in T019).

## Phase 5: User Story 3 — Bring Images Along With Their Files (P1)

**Goal**: Automatically include a selected file's referenced images when they were part of the drop/selection (including a dropped folder), and offer a clear resolution path when they weren't.

**Independent Test**: Drop a folder containing an entity file and its referenced image; verify the image imports automatically as part of the entity's `AssetDraft`, content-addressed by hash. Separately, drop just the entity file alone; verify the review step prompts for the missing image and both resolution options work (add directly; grant folder access where supported).

- [X] T021 [P] [US3] Added tests for `resolveMissingImage` in `packages/importer/src/vault-files/convert.test.ts`: resolving via a directly-added `File`, via a granted `FileSystemDirectoryHandle` search (including a subdirectory), and remaining unresolved (`null`) when not found either way.
- [X] T022 [US3] Implemented `resolveMissingImage(ref, { addedFile?, sourceFolderHandle? }): Promise<AssetDraft[] | null>` in `packages/importer/src/vault-files/convert.ts` — returns one `AssetDraft` per referencing entity (sharing the same content hash) rather than a single draft, since a missing image can be referenced by more than one dropped entity.
- [X] T023 [US3] Added `MissingImageResolver.svelte` (new component) with tests (`MissingImageResolver.test.ts`): lists pending `missingImageRefs`, an "Add File" control per ref, and a "Use Folder" control shown only when `isFileSystemAccessSupported()` is true (with an explanatory note when it isn't).
- [X] T024 [US3] Wired `MissingImageResolver` into `ImportSettings.svelte`'s review step (shown only for `sourceSystem === "vault-files"`), calling the controller's `handleAddMissingImageFile`/`handleResolveMissingImageFromFolder`, which resolve the image, update `missingImageRefs`, and re-run `prepareVaultFilesSession()` with the augmented package.

## Phase 6: User Story 4 — Recover from Unavailable or Failed Imports (P2)

**Goal**: Explain clearly when a dropped/selected file can't be read or a commit fails partway through, without changing the active vault or reporting a false success.

**Independent Test**: Include a file that fails to read in the selection, and separately simulate `ImportEngine.commit` failing on one entity; verify clear messaging in both cases and that no existing target entity was touched.

- [X] T025 [US4] Added a test in `convert.test.ts` confirming a `DroppedItem` whose `file.text()` rejects is silently excluded (not surfaced as a warning — it was never readable enough to classify) without blocking the rest of the selection; `ImportEngine.commit`'s existing `failures` reporting (`engine.ts:568`) is reused verbatim (no controller-side change needed — it already flows into `ccReport.failures`).
- [X] T026 [US4] `droppedItemsToPackage` catches per-file `file.text()` failures and excludes them from `entityDrafts` without throwing or blocking sibling files (see T025); `handleVaultFiles`/`prepareVaultFilesSession` surface `ImportEngine.prepare`/`commit` failures via the existing `rejectedFiles`/`ccReport.failures` paths, matching every other source.

## Phase 7: Concurrency Guard (FR-017)

- [X] T027 The "Import Files" entry point (`ImportSourcePicker`, including its new `VaultFilesDropzone` section) is only rendered while `controller.step === "upload"` (`ImportSettings.svelte`'s `{#if controller.step === "upload"}`) — the same structural gate every other import source already relies on, so a second import can't start until the first reaches `"review"`/`"upload"` again. Cancellation before confirmation returns to `"upload"` via `handleCCReportDone`/the existing abort paths without writing anything.
- [X] T028 No new concurrency-control state was needed — verified the existing `step` state machine (shared across all sources) already satisfies FR-017 for this source; documented in `handleVaultFiles`'s docstring rather than duplicated as new guard logic.

## Phase 8: Polish & Validation

- [X] T029 Ran `prettier --write` across all new/changed files (Svelte formatting is prettier-driven in this repo; no separate "Svelte autofixer" script exists — confirmed via `apps/web/package.json`).
- [X] T030 Ran and confirmed green: `bun run --filter web lint:types` (svelte-check, 0 errors), `bun run --filter web lint` and `bun run --filter @codex/importer lint` (eslint, 0 errors), `bun test` in `packages/importer` (293 passed), and `vitest run` for `apps/web/src/lib/components/settings/` + `apps/web/src/lib/features/importer/` (124 passed).

## Parallel execution examples

- T003, T005, T007 (detect/mapping/source-ref tests) were written in parallel — different files, no shared state.
- T009 (conversion tests) depended on T004/T006/T008 landing first (it exercises all three); T011 (collector tests) proceeded in parallel with T021 (image-resolution engine tests) since they touch different packages.

## Implementation Strategy

Build the mechanical converter, its type-mapping rules, and its path-only source-ref builder in `packages/importer/src/vault-files/` first (T003–T010), since every user story depends on all three and none have UI dependencies. Ship US1 alone as the MVP (drag or upload files, review through the existing `ImportEngine` flow using this source's dedicated engine config, commit, with type preservation and inherited-UI behavior explicitly verified) — it's independently testable and delivers the core value by wiring a new source into infrastructure that already exists. Layer US2's forced-skip + exact-match behavior and US3's image handling (including content-hash dedupe and the missing-image fallback) on top before considering the feature complete, since both are P1 and part of what makes the import trustworthy. US4's failure-path polish and the FR-017 concurrency guard land last. No "update" review option, title-based matching, or content-aware entity merging was added in this feature.
