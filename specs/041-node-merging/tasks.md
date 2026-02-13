# Tasks: Node Merging

**Input**: Design documents from `specs/041-node-merging/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1, US2, US3

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize feature branch `041-node-merging` (Done)

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T002 Create operations directory `packages/editor-core/src/operations/`
- [x] T003 Create `packages/editor-core/src/operations/merge-utils.ts` with basic interfaces
- [x] T004 Create `apps/web/src/lib/services/node-merge.service.ts` with service shell
- [x] T005 Create `apps/web/src/lib/components/dialogs/MergeNodesDialog.svelte` skeleton

**Checkpoint**: Foundation ready - user story implementation can now begin

## Phase 3: User Story 1 - Merge Duplicate Nodes (Priority: P1)

**Goal**: Select nodes, preview simple merge, and execute delete/create.

**Independent Test**: Manually select 2 nodes, choose "Concatenate", and verify they merge into one.

### Implementation for User Story 1

- [x] T006 [P] [US1] Create unit tests for `packages/editor-core/src/operations/merge-utils.ts` (TDD First)
- [x] T007 [P] [US1] Implement `mergeFrontmatter` and `concatenateBody` in `packages/editor-core/src/operations/merge-utils.ts`
- [x] T008 [P] [US1] Implement `fetchNodeContent` in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T009 [US1] Implement `proposeMerge` (concat strategy) in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T010 [US1] Implement `executeMerge` (write new, delete old) in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T011 [US1] Add check for unsaved changes in `node-merge.service.ts` before merge (Edge Case)
- [x] T012 [US1] Implement UI to select nodes in Graph/List view and trigger dialog
- [x] T013 [US1] Implement `MergeNodesDialog.svelte` to show selected nodes and simple preview
- [x] T014 [US1] Wire up "Confirm Merge" button to `executeMerge` and close dialog

**Checkpoint**: Users can manually merge nodes (simple concatenation).

## Phase 4: User Story 2 - AI-Assisted Content Consolidation (Priority: P1)

**Goal**: Use AI to generate better merged content.

**Independent Test**: Select nodes, choose "AI Merge", verify description is a summary.

### Implementation for User Story 2

- [x] T015 [US2] Implement `generateMergedContent` using Gemini API in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T016 [US2] Update `proposeMerge` to handle `strategy: 'ai'`
- [x] T017 [US2] Update `MergeNodesDialog.svelte` to show "Generating..." state and populate AI result
- [x] T018 [US2] Enable editing of the preview content in `MergeNodesDialog.svelte` before confirmation

**Checkpoint**: Users get AI suggestions for merges.

## Phase 5: User Story 3 - Link Redirection (Priority: P2)

**Goal**: Fix broken links after merge.

**Independent Test**: Create Node C linking to Node A. Merge Node A into Node B. Verify Node C links to Node B.

### Implementation for User Story 3

- [x] T019 [US3] Implement `updateBacklinks` logic in `apps/web/src/lib/services/node-merge.service.ts` (find & replace)
- [x] T020 [US3] Integrate backlink update into `executeMerge` transaction
- [x] T021 [US3] Implement connection re-mapping (Cytoscape edges) in `apps/web/src/lib/services/node-merge.service.ts`

**Checkpoint**: Links and connections are preserved.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX improvements and documentation

- [x] T022 Add toast notifications for success/failure in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T023 Refresh graph view context after merge in `apps/web/src/lib/services/node-merge.service.ts`
- [x] T024 Create help documentation in `apps/web/src/lib/config/help-content.ts` (Constitution VII)

## Dependencies & Execution Order

1.  **Phase 2** blocks all User Stories.
2.  **US1** is the MVP.
3.  **US2** extends US1 logic.
4.  **US3** extends US1 execution logic (can be done parallel to US2).

## Parallel Opportunities

- T007 (Utils) and T008 (Fetch) can run in parallel.
- T015 (AI Logic) and T017 (UI Update) can run in parallel once US1 is done.
