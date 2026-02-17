# Tasks: Import Progress Management

## Phase 1: Setup

- [x] T001 Define `ImportRegistry` and `ImportQueueItem` types in `packages/importer/src/types.ts`
- [x] T002 Add `import_registry` object store to IndexedDB initialization in `apps/web/src/lib/utils/idb.ts`
- [x] T003 [P] Implement SHA-256 hashing utility using Web Crypto API in `packages/importer/src/utils.ts`

## Phase 2: Foundational (Importer Logic)

- [x] T004 Implement `getRegistry` and `markChunkComplete` logic in `packages/importer/src/persistence.ts`
- [x] T005 Implement `pruneRegistry` (LRU logic) in `packages/importer/src/persistence.ts`
- [x] T006 [P] Add unit tests for hashing and registry management in `packages/importer/tests/persistence.spec.ts`
- [x] T007 Update `OracleAnalyzer` to accept a starting index and emit chunk status events in `packages/importer/src/oracle/analyzer.ts`

## Phase 3: User Story 1 - Resuming a Large Import

**Goal**: Allow users to resume interrupted imports based on file content hash.
**Independent Test**: Start an import, stop at 50%, refresh, and select the same file. It should skip the first 50%.

- [x] T008 Implement `ImportQueueStore` with strict queueing in `apps/web/src/lib/stores/import-queue.svelte.ts`
- [x] T009 Update file selection logic to calculate hash and check registry in `apps/web/src/lib/stores/vault/io.ts` (Integrated in `ImportModal.svelte`)
- [x] T010 Integrate `ImportQueueStore` with `OracleAnalyzer` to skip completed chunks in `packages/importer/src/index.ts` (Integrated in `ImportModal.svelte`)
- [x] T011 [US1] Verify resume logic works via manual test with a multi-chunk document

## Phase 4: User Story 2 - Avoiding Redundant Processing

**Goal**: Detect and skip already processed files entirely.
**Independent Test**: Import a file to 100%, then import it again. It should immediately show 100%.

- [x] T012 Implement "Restart" capability to clear registry entry for a hash in `packages/importer/src/persistence.ts`
- [x] T013 Update Import UI to show "Already Processed" state and "Restart" button in `apps/web/src/lib/components/import/ImportModal.svelte`
- [x] T014 [US2] Verify duplicate file identification via manual test

## Phase 5: User Story 3 - Visual Progress Tracking

**Goal**: Show a segmented progress bar reflecting chunk-level state.
**Independent Test**: Observe segmented bar during import; verify "Skipped", "Active", and "Completed" colors.

- [x] T015 Create `ImportProgress.svelte` component with CSS-grid segmentation in `apps/web/src/lib/components/import/`
- [x] T016 Connect `ImportProgress` component to `ImportQueueStore` events in `apps/web/src/lib/components/import/ImportModal.svelte`
- [x] T017 [US3] Add E2E test for visual progress states and benchmark latency (SC-002/SC-003) in `apps/web/tests/import-progress.spec.ts`

## Phase 6: Polish & Cross-Cutting

- [x] T018 Implement "Resume Toast" notification when a partial import is detected in `apps/web/src/lib/components/import/ImportModal.svelte`
- [x] T019 Update chronology/import help guide with progress tracking info in `apps/web/src/lib/content/help/importing.md`
- [x] T020 Add `FeatureHint` for the new resume capability in `apps/web/src/lib/config/help-content.ts`

## Dependencies

- Phase 1 & 2 must be completed before any User Story tasks.
- US1 (Resume) is the MVP and should be completed before US2 and US3.
- US2 and US3 can be implemented in parallel after US1 foundational logic is in place.

## Parallel Execution Examples

- **Setup**: T003 (Hashing) and T002 (DB Schema) can start simultaneously.
- **Foundational**: T006 (Tests) can start as soon as T004/T005 interfaces are defined.

## Implementation Strategy

- **MVP**: Focus on Phase 1, 2, and 3 to deliver content-aware resume functionality first.
- **Incremental**: Add duplicate detection UI (Phase 4) and then the visual segmented progress (Phase 5).
