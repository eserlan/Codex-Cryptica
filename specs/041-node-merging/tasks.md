# Tasks: Node Merging

**Input**: Design documents from `specs/041-node-merging/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel
- **[Story]**: US1, US2, US3

## Phase 1: Setup

- [ ] T001 Initialize feature branch `041-node-merging`

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T002 Create `apps/web/src/lib/services/node-merge.service.ts` with interface definitions.
- [ ] T003 Create `apps/web/src/lib/components/dialogs/MergeNodesDialog.svelte` skeleton.

**Checkpoint**: Foundation ready.

## Phase 3: User Story 1 - Merge Duplicate Nodes (Priority: P1)

**Goal**: Select nodes, preview simple merge, and execute delete/create.

### Implementation for User Story 1

- [ ] T004 [US1] Implement function to fetch full content of multiple nodes in `node-merge.service.ts`.
- [ ] T005 [US1] Implement basic merge logic (concatenation) in `node-merge.service.ts` as fallback.
- [ ] T006 [US1] Implement `deleteNode` and `writeNode` usage in `node-merge.service.ts`.
- [ ] T007 [US1] Implement UI to select nodes and open Merge Dialog.
- [ ] T008 [US1] Implement Merge Dialog UI to show selected nodes and simple preview.
- [ ] T009 [US1] Wire up "Confirm Merge" button to execute merge and close dialog.

**Checkpoint**: Users can manually merge nodes (simple concatenation).

## Phase 4: User Story 2 - AI-Assisted Content Consolidation (Priority: P1)

**Goal**: Use AI to generate better merged content.

### Implementation for User Story 2

- [ ] T010 [US2] Implement `generateMergedContent` in `node-merge.service.ts` using Gemini API.
- [ ] T011 [US2] Update Merge Dialog to show "Generating..." state.
- [ ] T012 [US2] Update Merge Dialog to populate preview with AI result.
- [ ] T013 [US2] Allow user to edit the AI-generated preview in the Dialog.

**Checkpoint**: Users get AI suggestions for merges.

## Phase 5: User Story 3 - Link Redirection (Priority: P2)

**Goal**: Fix broken links after merge.

### Implementation for User Story 3

- [ ] T014 [US3] Implement `updateBacklinks` in `node-merge.service.ts` to find referencing files.
- [ ] T015 [US3] Implement logic to replace `[[Old Node]]` with `[[New Node]]` in referencing files.
- [ ] T016 [US3] Integrate backlink update into the main merge transaction.

**Checkpoint**: Links are preserved.

## Phase 6: Polish

- [ ] T017 Add toast notifications for success/failure.
- [ ] T018 Refresh graph view after merge.
