# Tasks: Progressive Worker-Backed Search Indexing

**Input**: Design documents from `/specs/106-progressive-worker-search/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/search-indexing.md](./contracts/search-indexing.md), [quickstart.md](./quickstart.md)

**Tests**: Required by the project constitution and this feature plan. Write failing tests before implementation for each behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks.
- **[Story]**: User story label, used only inside story phases.
- Every task includes an exact file path.

---

## Phase 1: Setup

**Purpose**: Prepare shared types and test seams before feature behavior is implemented.

- [x] T001 [P] Add web-facing search progress type imports or local aliases in `apps/web/src/lib/services/search.ts`
- [x] T002 [P] Review existing search UI test fixtures for progress assertions in `apps/web/src/lib/components/search/SearchModal.test.ts`

---

## Phase 2: Foundational

**Purpose**: Core primitives that block all user stories.

**CRITICAL**: No user story implementation should start until this phase is complete.

- [x] T003 [P] Add failing tests for `addBatchProgressive` accepted counts and failed IDs in `packages/search-engine/tests/progressive-indexing.test.ts`
- [x] T004 Add failing tests for `SearchService` progress subscription defaults and constructor-injected dependencies in `apps/web/src/lib/services/search.test.ts`
- [x] T005 Implement `SearchIndexStatus`, `SearchIndexProgress`, `ProgressiveBatchOptions`, and `ProgressiveBatchResult` exports in `packages/search-engine/src/index.ts`
- [x] T006 Refactor `SearchService` constructor injection for worker factory, `entityDb`, event bus, timer, and debug dependencies in `apps/web/src/lib/services/search.ts`
- [x] T007 Implement progress listener storage, `getIndexProgress`, and `subscribeIndexProgress` in `apps/web/src/lib/services/search.ts`
- [x] T008 Add active run identity helpers and stale-run validation helpers in `apps/web/src/lib/services/search.ts`

**Checkpoint**: Shared types, service progress subscription, and run identity primitives exist.

---

## Phase 3: User Story 1 - Search Remains Usable During Large Vault Loads (Priority: P1) MVP

**Goal**: Cold or stale large-vault indexing runs in bounded worker batches while search remains usable with partial results.

**Independent Test**: Start with a vault containing at least 1,000 entities and no reusable search index, open the vault, and confirm UI interactions remain responsive while indexed records become searchable before the rebuild finishes.

### Tests for User Story 1

- [x] T009 [P] [US1] Add failing worker test for progressive batch indexing without breaking existing `addBatch` callers in `packages/search-engine/tests/progressive-indexing.test.ts`
- [x] T010 [US1] Add failing service test for cold metadata rebuild entering partial state and indexing chunks in `apps/web/src/lib/services/search.test.ts`
- [x] T011 [US1] Add failing service test for full-content background sweep staying chunked and searchable during rebuild in `apps/web/src/lib/services/search.test.ts`
- [x] T012 [US1] Add failing service performance test for yielded 1,000-entity rebuild batches and no batch over 100ms in `apps/web/src/lib/services/search.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement `addBatchProgressive` and delegate compatible `addBatch` behavior in `packages/search-engine/src/index.ts`
- [x] T014 [US1] Replace cold `CACHE_LOADED` metadata indexing with progressive rebuild orchestration in `apps/web/src/lib/services/search.ts`
- [x] T015 [US1] Convert `indexContentInBackground` to use active run IDs, bounded batches, yielded scheduling, and partial progress updates in `apps/web/src/lib/services/search.ts`
- [x] T016 [US1] Ensure search calls work while `SearchIndexProgress.isPartial` is true in `apps/web/src/lib/services/search.ts`
- [x] T017 [US1] Save per-vault index snapshots only after a successful ready state in `apps/web/src/lib/services/search.ts`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Rebuild Progress Is Visible And Plain (Priority: P2)

**Goal**: Users can see whether search is restoring, rebuilding, partial, ready, failed, or retryable.

**Independent Test**: Trigger a cold search-index rebuild and verify the UI exposes status, indexed count, total count when known, and completion or failure state in plain language.

### Tests for User Story 2

- [x] T018 [P] [US2] Add failing store test for mirrored `indexProgress` and retry delegation in `apps/web/src/lib/stores/search.test.ts`
- [x] T019 [P] [US2] Add failing UI test for partial indexing message and progress counts in `apps/web/src/lib/components/search/SearchModal.test.ts`
- [x] T020 [US2] Add failing service test for worker failure setting `failed` with `canRetry` in `apps/web/src/lib/services/search.test.ts`
- [x] T021 [US2] Add failing store test for shared-session visibility filtering while `indexProgress.isPartial` is true in `apps/web/src/lib/stores/search.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Expose reactive `indexProgress` and `retryIndexing` from `SearchStore` in `apps/web/src/lib/stores/search.svelte.ts`
- [x] T023 [US2] Render plain partial, ready, failed, and retry states in `apps/web/src/lib/components/search/SearchModal.svelte`
- [x] T024 [US2] Implement `retryIndexing` to start a new guarded rebuild from the active vault in `apps/web/src/lib/services/search.ts`
- [x] T025 [US2] Add recoverable worker and snapshot failure handling that updates user-facing progress in `apps/web/src/lib/services/search.ts`
- [x] T026 [US2] Preserve existing entity visibility filtering while search results are partial in `apps/web/src/lib/stores/search.svelte.ts`
- [x] T027 [US2] Add user help copy for search indexing status and retry behavior in `apps/web/src/lib/config/help-content.ts`

**Checkpoint**: User Story 2 is independently functional and testable with visible progress and retry behavior.

---

## Phase 5: User Story 3 - Rebuilds Cancel Safely On Vault Switch (Priority: P3)

**Goal**: In-progress indexing for an old vault is cancelled or invalidated before the new vault can receive search mutations.

**Independent Test**: Start a rebuild for Vault A, switch to Vault B before completion, and confirm no Vault A result appears in Vault B search, even after late Vault A worker promises resolve.

### Tests for User Story 3

- [x] T028 [US3] Add failing service test for `VAULT_OPENING` cancelling active rebuilds in `apps/web/src/lib/services/search.test.ts`
- [x] T029 [US3] Add failing service test for late batch results ignored when `runId` or `vaultId` is stale in `apps/web/src/lib/services/search.test.ts`
- [x] T030 [P] [US3] Add failing store or UI test that stale progress is not displayed after vault switch in `apps/web/src/lib/stores/search.test.ts`

### Implementation for User Story 3

- [x] T031 [US3] Implement `cancelIndexing` and mark old active jobs cancelled in `apps/web/src/lib/services/search.ts`
- [x] T032 [US3] Call cancellation before `clear`, restore, or rebuild work on `VAULT_OPENING` and `VAULT_SWITCHED` in `apps/web/src/lib/services/search.ts`
- [x] T033 [US3] Guard all progressive batch completions and progress emissions with active `runId` and `vaultId` checks in `apps/web/src/lib/services/search.ts`
- [x] T034 [US3] Ensure entity create, update, delete, and batch-created events apply through the active run guard during rebuilds in `apps/web/src/lib/services/search.ts`
- [x] T035 [US3] Clear or replace stale store progress on vault switch in `apps/web/src/lib/stores/search.svelte.ts`

**Checkpoint**: User Story 3 is independently functional and cross-vault leakage is prevented.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final documentation, validation, and cleanup across all stories.

- [x] T036 [P] Update implementation notes or quickstart results in `specs/106-progressive-worker-search/quickstart.md`
- [x] T037 [P] Add or update worker exposure coverage if public API shape changed in `apps/web/src/lib/workers/search.worker.test.ts`
- [x] T038 [P] Run `pnpm --filter @codex/search-engine test` and address failures in `packages/search-engine/tests/progressive-indexing.test.ts`
- [x] T039 Run explicit web search-related Vitest targets and address failures in `apps/web/src/lib/services/search.test.ts`
- [x] T040 Attempt full root validation with `pnpm run lint` and `pnpm test`, documenting the Android arm64 Turbo blocker in `specs/106-progressive-worker-search/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can be developed after or beside US1, but UI value is clearer once US1 emits progress.
- **User Story 3 (Phase 5)**: Depends on Foundational; can be developed after or beside US1, but final leakage validation needs US1 rebuild behavior.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on US2 or US3 after Foundational.
- **US2 (P2)**: Depends on progress contract from Foundational; integrates with US1 progress emissions.
- **US3 (P3)**: Depends on run identity from Foundational; validates cancellation around US1 rebuilds.

### Within Each User Story

- Tests must be written first and fail before implementation.
- Worker/package behavior should be implemented before service orchestration that depends on it.
- Service orchestration should be implemented before store/UI integration.
- Each story checkpoint should pass its own independent tests before moving to the next priority.

---

## Parallel Opportunities

- T002 and T003 can run after T001 is understood because they touch separate web files.
- T004 and T005 can run in parallel because they test different layers.
- T009, T010, and T011 can run in parallel before US1 implementation.
- T017, T018, and T019 can run in parallel before US2 implementation.
- T025, T026, and T027 can run in parallel before US3 implementation.
- T033, T034, and T035 can run in parallel during final polish.

## Parallel Example: User Story 1

```text
Task: "T009 [P] [US1] Add failing worker test for progressive batch indexing without breaking existing addBatch callers in packages/search-engine/tests/progressive-indexing.test.ts"
Task: "T010 [P] [US1] Add failing service test for cold metadata rebuild entering partial state and indexing chunks in apps/web/src/lib/services/search.test.ts"
Task: "T011 [P] [US1] Add failing service test for full-content background sweep staying chunked and searchable during rebuild in apps/web/src/lib/services/search.test.ts"
```

## Parallel Example: User Story 2

```text
Task: "T017 [P] [US2] Add failing store test for mirrored indexProgress and retry delegation in apps/web/src/lib/stores/search.test.ts"
Task: "T018 [P] [US2] Add failing UI test for partial indexing message and progress counts in apps/web/src/lib/components/search/SearchModal.test.ts"
Task: "T019 [P] [US2] Add failing service test for worker failure setting failed with canRetry in apps/web/src/lib/services/search.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "T025 [P] [US3] Add failing service test for VAULT_OPENING cancelling active rebuilds in apps/web/src/lib/services/search.test.ts"
Task: "T026 [P] [US3] Add failing service test for late batch results ignored when runId or vaultId is stale in apps/web/src/lib/services/search.test.ts"
Task: "T027 [P] [US3] Add failing store or UI test that stale progress is not displayed after vault switch in apps/web/src/lib/stores/search.test.ts"
```

---

## Implementation Strategy

### MVP First: User Story 1

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 only.
3. Validate cold large-vault progressive indexing with package and service tests.
4. Stop and confirm partial search behavior before adding visible UI progress.

### Incremental Delivery

1. US1 delivers background worker-backed progressive indexing and partial results.
2. US2 adds visible status, failure state, retry, and help text.
3. US3 hardens vault switching and late-batch cancellation.
4. Phase 6 validates the full feature with targeted and full repo checks.

### Validation Commands

```sh
pnpm --filter @codex/search-engine test
pnpm --filter web test -- search
pnpm run lint
pnpm test
```

## Notes

- Avoid introducing a second worker or separate indexing backend.
- Keep all indexing and snapshots scoped to the active vault.
- Do not persist partial snapshots in the first implementation.
- Keep user-facing copy plain and non-technical.
