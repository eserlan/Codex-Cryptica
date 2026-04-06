# Tasks: Import Progress Management

## Phase 1: Setup

- [x] T001 Define `ImportRegistry` and `ImportQueueItem` types in `packages/importer/src/types.ts`
- [x] T002 Implement SHA-256 hashing utility using Web Crypto API in `packages/importer/src/utils.ts`
- [x] T003 Extract text chunking logic to a standalone utility function in `packages/importer/src/utils.ts`

## Phase 2: Foundational (Importer Logic)

- [x] T004 Implement `getRegistry` and `markChunkComplete` logic using a decoupled `CodexImporterRegistry` database in `packages/importer/src/persistence.ts`
- [x] T005 Implement `pruneRegistry` (LRU logic) in `packages/importer/src/persistence.ts`
- [x] T006 [P] Add unit tests for hashing and registry management in `packages/importer/tests/persistence.spec.ts`
- [x] T007 Update `OracleAnalyzer` to support starting indices, AbortSignal cancellation, and chunk status events in `packages/importer/src/oracle/analyzer.ts`

## Phase 3: Entity Reconciliation

- [x] T008 Update `AnalysisOptions` to support passing a mapping of known entities in `packages/importer/src/types.ts`
- [x] T009 Implement case-insensitive title matching in `OracleAnalyzer.processChunk` to populate `matchedEntityId` in `packages/importer/src/oracle/analyzer.ts`
- [x] T010 Integrate existing vault entity data into the analysis loop in `apps/web/src/lib/features/importer/ImportModal.svelte`

## Phase 4: User Story 1 - Resuming a Large Import

- [x] T011 Implement `ImportQueueStore` with strict queueing in `apps/web/src/lib/stores/import-queue.svelte.ts`
- [x] T012 Update file selection logic to calculate hash and check registry in `apps/web/src/lib/features/importer/ImportModal.svelte`
- [x] T013 [US1] Verify resume logic works via manual test with a multi-chunk document

## Phase 5: User Story 2 - Avoiding Redundant Processing

- [x] T014 Implement "Restart" capability to clear registry entry for a hash in `packages/importer/src/persistence.ts`
- [x] T015 Update Import UI to show "Already Processed" state and "Restart" button in `apps/web/src/lib/features/importer/ImportModal.svelte`
- [x] T016 [US2] Verify duplicate file identification via manual test

## Phase 6: User Story 3 - Visual Progress Tracking

- [x] T017 Create `ImportProgress.svelte` component with CSS-grid segmentation in `apps/web/src/lib/components/import/`
- [x] T018 Connect `ImportProgress` component to `ImportQueueStore` events in `apps/web/src/lib/features/importer/ImportModal.svelte`
- [x] T019 [US3] Add E2E test for visual progress states and benchmark latency (SC-002/SC-003) in `apps/web/tests/import-progress.spec.ts`

## Phase 7: Polish & Cross-Cutting

- [x] T020 Implement "Resume Toast" notification when a partial import is detected in `apps/web/src/lib/features/importer/ImportModal.svelte`
- [x] T021 Update chronology/import help guide with progress tracking info in `apps/web/src/lib/content/help/importing.md`
- [x] T022 Add `FeatureHint` for the new resume capability in `apps/web/src/lib/config/help-content.ts`

## Dependencies

- Phase 1 & 2 must be completed before any User Story tasks.
- US1 (Resume) is the MVP and should be completed before US2 and US3.
- US2 and US3 can be implemented in parallel after US1 foundational logic is in place.

## Parallel Execution Examples

- **Setup**: T002 (Hashing) and T003 (Chunking) can start simultaneously.
- **Foundational**: T006 (Tests) can start as soon as T004/T005 interfaces are defined.

## Implementation Strategy

- **MVP**: Focus on Phase 1, 2, and 4 to deliver content-aware resume functionality first.
- **Reconciliation**: Phase 3 ensures existing entities are identified early in the process.
- **Incremental**: Add duplicate detection UI (Phase 5) and then the visual segmented progress (Phase 6).
