# Tasks: Oracle RAG Improvements

**Input**: Design documents from `/specs/019-oracle-rag-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Register feature context in `specs/019-oracle-rag-improvements/tasks.md`
- [x] T002 Update `ChatMessage` interface to include optional `sources: string[]` in `apps/web/src/lib/stores/oracle.svelte.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T003 [P] Implement Chat History persistence (load/save messages to IndexedDB) and include the `sources` field in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T004 [P] Update search indexing to include the `lore` frontmatter field in `apps/web/src/lib/services/search.ts`
- [x] T005 Implement `getConsolidatedContext` helper in `apps/web/src/lib/services/ai.ts` to combine lore and content (FR-006)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 4 - Deep Fact Retrieval (Priority: P1) 🎯 MVP

**Goal**: Ensure Oracle can answer questions about details located in the Lore field.

**Independent Test**: ask about a detail located only in the "Lore" field; verify correct response.

### Implementation for User Story 4

- [x] T006 [US4] Refactor `retrieveContext` in `apps/web/src/lib/services/ai.ts` to use `getConsolidatedContext` for all retrieved entities
- [x] T007 [US4] Implement 10k character truncation logic that respects the FR-005 priority list (Primary > Subjects > Neighbors) in `apps/web/src/lib/services/ai.ts`
- [x] T008 [P] [US4] Add unit test for Context Fusion logic in `apps/web/src/lib/services/ai.test.ts`

---

## Phase 4: User Story 1 - Internal Context Logging (Priority: P1)

**Goal**: Log exactly which files were consulted by the Oracle for debugging.

**Independent Test**: verify `sources` metadata is populated in assistant messages.

### Implementation for User Story 1

- [x] T009 [US1] Update `retrieveContext` return type to include `sourceIds: string[]` in `apps/web/src/lib/services/ai.ts`
- [x] T010 [US1] Pass `sourceIds` from `retrieveContext` to the assistant message creation in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T011 [P] [US1] Add console logging for context sources in `apps/web/src/lib/services/ai.ts` for developer visibility

---

## Phase 5: User Story 3 - Conversational Query Expansion (Priority: P2)

**Goal**: Resolve pronouns and implied subjects in follow-up questions.

**Independent Test**: Ask follow-up with pronouns; verify correct subject retrieval.

### Implementation for User Story 3

- [x] T012 [US3] Implement `expandQuery` method using Lite model in `apps/web/src/lib/services/ai.ts` (FR-004)
- [x] T013 [US3] Integrate `expandQuery` into the `ask` workflow in `apps/web/src/lib/stores/oracle.svelte.ts`
- [x] T014 [P] [US3] Add unit test for query expansion prompt and logic in `apps/web/src/lib/services/ai.test.ts`

---

## Phase 6: User Story 2 - Neighborhood Context Enrichment (Priority: P2)

**Goal**: Include "Chronicle" of entities linked to primary search results.

**Independent Test**: verify linked entity info is included in Oracle response.

### Implementation for User Story 2

- [x] T015 [US2] Implement BFS (depth 1) neighbor retrieval using `vault.inboundConnections` in `apps/web/src/lib/services/ai.ts`
- [x] T016 [US2] Refactor `retrieveContext` to include neighbor chronicles in the `contents` array (FR-003)
- [x] T017 [US2] Implement neighbor-first truncation logic to prioritize primary matches in `apps/web/src/lib/services/ai.ts`
- [x] T018 [P] [US2] Add unit test for neighborhood enrichment logic in `apps/web/src/lib/services/ai.test.ts`

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation.

- [x] T019 [P] Update `quickstart.md` if any verification steps changed during implementation
- [x] T020 Code cleanup and removal of temporary debug logs
- [x] T021 Run full suite of Oracle unit tests
- [x] T022 **Offline Functionality Verification** (Verify that expansion logic fails gracefully with informative error when offline)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Phase 1.
- **User Stories (Phase 3-6)**: All depend on Phase 2.
- **Polish (Phase 7)**: Depends on all stories.

### Implementation Strategy

- **MVP First**: US4 (Deep Fact Retrieval) is the most critical fix for the "Named Cat" issue.
- **Incremental**: Add logging (US1), then expansion (US3), then enrichment (US2).