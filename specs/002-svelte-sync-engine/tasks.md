# Tasks: Svelte-Native Sync Engine ("The Pulse")

**Spec**: [specs/002-svelte-sync-engine/spec.md](spec.md)
**Branch**: `002-svelte-sync-engine`

## Phase 1: Setup
*Goal: Initialize project structure and dependencies.*

- [x] T001 Create `packages/schema/src` directory structure
- [x] T002 Create `packages/graph-engine/src` directory structure
- [x] T003 Create `apps/web/src/lib/stores` directory
- [x] T004 Create `apps/web/src/lib/workers` directory

## Phase 2: Foundational (Core Logic)
*Goal: Define shared types and pure functional transformations. Must be completed before Store implementation.*

- [x] T005 [P] Define `Entity` and `Connection` interfaces in `packages/schema/src/entity.ts`
- [x] T006 [P] Create Zod schemas for validation in `packages/schema/src/validation.ts`
- [x] T007 Export schema types in `packages/schema/src/index.ts`
- [x] T008 [P] Create `GraphTransformer` class in `packages/graph-engine/src/transformer.ts`
- [x] T009 Implement `entitiesToElements` pure function in `packages/graph-engine/src/transformer.ts`
- [x] T010 Create unit tests for schema validation in `packages/schema/src/schema.test.ts`
- [x] T011 Create unit tests for graph transformation in `packages/graph-engine/src/transformer.test.ts`

## Phase 3: User Story 1 (The Vault)
*Goal: "The Single Store of Truth". Load and manage Markdown files in memory.*

- [x] T012 [US1] Create `VaultStore` class skeleton using Svelte 5 runes in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T013 [US1] Implement `FileSystemHandle` state management in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T014 [US1] Create recursive directory walker utility in `apps/web/src/lib/utils/fs.ts`
- [x] T015 [US1] Implement `openDirectory` action to read all .md files in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T016 [US1] Implement Frontmatter parsing and Wiki-Link extraction in `apps/web/src/lib/utils/markdown.ts`
- [x] T017 [US1] Implement `createEntity` action (in-memory update) in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T018 [US1] Create basic UI button to trigger `openDirectory` in `apps/web/src/routes/+layout.svelte`
- [x] T019 [US1] Create `VaultStore` unit tests (mocking FS API) in `apps/web/src/lib/stores/vault.test.ts`

## Phase 4: User Story 2 (The Graph Connection)
*Goal: "The Reactive Loop". Drive Cytoscape from Vault state.*

- [x] T020 [US2] Create `GraphStore` derived store in `apps/web/src/lib/stores/graph.svelte.ts`
- [x] T021 [US2] Connect `GraphStore` to `packages/graph-engine` transformer in `apps/web/src/lib/stores/graph.svelte.ts`
- [x] T022 [US2] Create Cytoscape container component in `apps/web/src/lib/components/GraphView.svelte`
- [x] T023 [US2] Implement `$effect` to update Cytoscape elements when store changes in `apps/web/src/lib/components/GraphView.svelte`
- [x] T024 [US2] Add `GraphView` to main layout for visualization in `apps/web/src/routes/+page.svelte`
- [x] T024b [US2] Implement robust layout and resizing logic in `apps/web/src/lib/components/GraphView.svelte`
- [x] T024c [US2] Implement "Connect Mode" UI and interaction logic in `apps/web/src/lib/components/GraphView.svelte`

## Phase 5: User Story 3 (Persistence)
*Goal: "Auto-Save". Write changes back to the File System.*

- [x] T025 [US3] Implement `writeEntity` utility with File System Access API in `apps/web/src/lib/utils/fs.ts`
- [x] T026 [US3] Add debounce logic to `VaultStore` in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T027 [US3] Trigger `writeEntity` on `updateEntity` in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T028 [US3] Implement `deleteEntity` action (disk deletion) in `apps/web/src/lib/stores/vault.svelte.ts`
- [x] T029 [US3] Add "Reload Vault" button for manual sync in `apps/web/src/lib/components/VaultControls.svelte`

## Phase 6: Polish & Cross-Cutting
*Goal: Optimization and final verification.*

- [ ] T030 Refactor heavy parsing logic to Web Worker in `apps/web/src/lib/workers/sync.ts`
- [ ] T031 Integrate Web Worker with `VaultStore` in `apps/web/src/lib/stores/vault.svelte.ts`
- [ ] T032 Verify offline capability (Service Worker check) in `apps/web/src/service-worker.ts`
- [x] T033 Run full E2E test suite for "Edit -> Graph Update -> Persist" flow

## Dependencies

1. **Foundational** (T005-T011) must be complete before **US1**.
2. **US1** (Vault) must be complete before **US2** (Graph).
3. **US1** must be complete before **US3** (Persistence).
4. **US2** and **US3** can be implemented in parallel.

## Implementation Strategy

*   **MVP**: Complete Phases 1, 2, and 3. This gives a "Read-Only" graph visualizer of a local folder.
*   **Beta**: Complete Phase 4. Adds reactive updates.
*   **RC**: Complete Phase 5. Adds persistence and full two-way sync.
