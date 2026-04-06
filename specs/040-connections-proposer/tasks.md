---
description: "Task list for Connections Proposer implementation"
---

# Tasks: Connections Proposer

**Input**: Design documents from `/specs/040-connections-proposer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Update IndexedDB schema to include 'proposals' store in `apps/web/src/lib/utils/idb.ts`
- [x] T002 Create directory structure for proposer sub-components in `apps/web/src/lib/components/entity-detail/proposals/`
- [x] T003 [P] Initialize `packages/proposer` workspace with basic TypeScript config and `types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T004 Implement `ProposerService` skeleton in `packages/proposer/src/service.ts`
- [x] T005 [P] Create `ProposerStore` in `apps/web/src/lib/stores/proposer.svelte.ts` for orchestration
- [x] T006 Setup `ProposerWorker` infrastructure in `apps/web/src/lib/workers/proposer.worker.ts`
- [x] T007 [P] Configure worker bridge for proposer in `apps/web/src/lib/cloud-bridge/proposer-bridge.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Viewing Background Connection Suggestions (Priority: P1) 🎯 MVP

**Goal**: Identify and display potential semantic connections using AI.

**Independent Test**: Opening an entity should trigger a background scan (if needed) and display "Proposed Connections" in the detail panel.

### Implementation for User Story 1

- [x] T008 [US1] Implement semantic scan logic in `ProposerService.analyzeEntity` using Gemini SDK in `packages/proposer/src/service.ts`
- [x] T009 [US1] Implement background scan orchestration in `ProposerStore` (watch `vault.status`) in `apps/web/src/lib/stores/proposer.svelte.ts`
- [x] T010 [P] [US1] Create `DetailProposals.svelte` component in `apps/web/src/lib/components/entity-detail/DetailProposals.svelte`
- [x] T011 [US1] Integrate `DetailProposals` into `apps/web/src/lib/components/EntityDetailPanel.svelte`
- [x] T012 [US1] Implement duplicate connection prevention (FR-007) in `packages/proposer/src/service.ts`
- [x] T013 [US1] Add unit tests for semantic matching in `packages/proposer/tests/service.test.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Managing Proposals (Priority: P2)

**Goal**: Accept or dismiss proposals with persistence.

**Independent Test**: Processed proposals should disappear from the active list and persist across reloads.

### Implementation for User Story 2

- [x] T014 [US2] Implement `applyProposal` logic (connection creation + IDB update) in `packages/proposer/src/service.ts`
- [x] T015 [US2] Implement `dismissProposal` logic (rejection state + IDB update) in `packages/proposer/src/service.ts`
- [x] T016 [US2] Add action buttons (Apply/Dismiss) to `apps/web/src/lib/components/entity-detail/DetailProposals.svelte`
- [x] T017 [US2] Add integration tests for proposal processing in `apps/web/tests/proposer-e2e.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Reviewing Dismissed Proposals (Priority: P3)

**Goal**: View and re-evaluate rejected proposals.

**Independent Test**: Access the "Rejected History" and restore a dismissed proposal to the active list.

### Implementation for User Story 3

- [x] T018 [US3] Implement circular buffer logic (max 20) for rejected proposals in `packages/proposer/src/service.ts`
- [x] T019 [P] [US3] Create `ProposalHistory.svelte` component in `apps/web/src/lib/components/entity-detail/proposals/ProposalHistory.svelte`
- [x] T020 [US3] Implement `reEvaluateProposal` logic in `ProposerStore` and `ProposerService`.
- [x] T021 [US3] Integrate history view into `DetailProposals` (e.g., a "History" tab or modal).

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: User Documentation

**Purpose**: Provide user-facing guidance for the new feature per Constitution VII.

- [x] T022 [P] Create help article for Connections Proposer in `apps/web/src/lib/config/help-content.ts`
- [x] T023 [P] Add `proposer-discovery` feature hint to `FEATURE_HINTS` in `apps/web/src/lib/config/help-content.ts`
- [x] T024 Trigger the `proposer-discovery` hint when the first AI proposal is generated in `ProposerStore`.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Tune AI prompt confidence thresholds in `packages/proposer/src/service.ts` for better signal-to-noise ratio.
- [x] T026 Optimize background scan debouncing to minimize Gemini API costs.
- [x] T027 [P] Add loading skeletons/spinners for active background scans in the UI.
- [x] T028 Performance audit: verify 60fps target during background worker execution.
- [x] T029 Final E2E verification of `quickstart.md` scenarios.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Blocks Phase 2.
- **Phase 2 (Foundational)**: Blocks all User Stories.
- **Phase 3 (US1)**: MVP - No dependencies on US2/US3.
- **Phase 4 (US2)**: Depends on US1 UI/Service structure.
- **Phase 5 (US3)**: Depends on US2 persistence logic.
- **Phase 6 (Docs)**: Can run after US1.
- **Phase 7 (Polish)**: Final cleanup.

---

## Parallel Example: Setup & Foundation

```bash
# Launch setup tasks in parallel:
Task: "Update IndexedDB schema in apps/web/src/lib/utils/idb.ts"
Task: "Initialize packages/proposer workspace"

# Launch foundation tasks in parallel:
Task: "Implement ProposerService skeleton in packages/proposer/src/service.ts"
Task: "Create ProposerStore in apps/web/src/lib/stores/proposer.svelte.ts"
Task: "Configure worker bridge in apps/web/src/lib/cloud-bridge/proposer-bridge.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Verify AI suggestions appear correctly in the sidebar.

### Incremental Delivery

1. Foundation → Store/Service established.
2. US1 → Semantic discovery live (MVP).
3. US2 → User control (Accept/Dismiss) live.
4. US3 → Rejection safety (History) live.
5. Docs → User-facing help added.
