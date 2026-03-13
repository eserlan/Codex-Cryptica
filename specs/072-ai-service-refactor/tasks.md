---
description: "Task list for AI Service Refactor implementation"
---

# Tasks: AI Service Refactor

**Input**: Design documents from `/specs/072-ai-service-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create `apps/web/src/lib/services/ai/` and `apps/web/src/lib/services/ai/prompts/` directories
- [ ] T002 Create test directory `apps/web/src/tests/ai/`
- [ ] T003 Move `TIER_MODES` constants from `ai.ts` to `packages/schema/src/ai.ts` (create file if needed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Implement `AIClientManager` in `apps/web/src/lib/services/ai/client-manager.ts`
- [ ] T005 [P] Implement `AICapabilityGuard` in `apps/web/src/lib/services/ai/capability-guard.ts`
- [ ] T006 Update `OracleExecutionContext` interface in `packages/oracle-engine/src/types.ts` to include `textGeneration`, `imageGeneration`, and `contextRetrieval`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Context-Aware Oracle Chat (Priority: P1) 🎯 MVP

**Goal**: Users continue to interact with "The Oracle" to receive context-aware responses based on their vault content.

**Independent Test**: Can be fully tested by asking the Oracle specific questions about entities present in the current vault and verifying that it retrieves the correct context and provides a relevant response.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Extract system instructions prompt to `apps/web/src/lib/services/ai/prompts/system-instructions.ts`
- [ ] T008 [P] [US1] Extract query expansion prompt to `apps/web/src/lib/services/ai/prompts/query-expansion.ts`
- [ ] T009 [P] [US1] Extract plot analysis prompt to `apps/web/src/lib/services/ai/prompts/plot-analysis.ts`
- [ ] T010 [P] [US1] Extract merge proposal prompt to `apps/web/src/lib/services/ai/prompts/merge-proposal.ts`
- [ ] T011 [US1] Implement `ContextRetrievalService` in `apps/web/src/lib/services/ai/context-retrieval.service.ts`
- [ ] T012 [US1] Implement `TextGenerationService` in `apps/web/src/lib/services/ai/text-generation.service.ts` (depends on prompt extractions and AIClientManager)
- [ ] T013 [US1] Migrate context retrieval tests to `apps/web/src/tests/ai/context-retrieval.spec.ts`
- [ ] T014 [US1] Migrate text generation tests to `apps/web/src/tests/ai/text-generation.spec.ts`
- [ ] T015 [US1] Update `packages/oracle-engine/src/oracle-generator.ts` to use `context.textGeneration` and `context.contextRetrieval`
- [ ] T016 [US1] Update `apps/web/src/lib/stores/oracle.svelte.ts` to inject `TextGenerationService` and `ContextRetrievalService` into `OracleExecutionContext`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. The core Oracle chat should work without relying on the legacy `ai.ts` methods for text generation and context retrieval.

---

## Phase 4: User Story 2 - Multimodal Image Generation (Priority: P2)

**Goal**: Users can request visual representations of entities or scenes, and the system continues to generate high-quality images that respect the active campaign's art style.

**Independent Test**: Can be tested by requesting an image generation for a specific entity and verifying that an image is returned that reflects both the entity description and the current art style.

### Implementation for User Story 2

- [ ] T017 [P] [US2] Extract visual distillation prompt to `apps/web/src/lib/services/ai/prompts/visual-distillation.ts`
- [ ] T018 [US2] Implement `ImageGenerationService` in `apps/web/src/lib/services/ai/image-generation.service.ts` (depends on TextGenerationService for distillation)
- [ ] T019 [US2] Migrate image generation tests to `apps/web/src/tests/ai/image-generation.spec.ts`
- [ ] T020 [US2] Update `apps/web/src/lib/stores/oracle.svelte.ts` to inject `ImageGenerationService` into `OracleExecutionContext`
- [ ] T021 [US2] Update components/services that directly call `aiService.generateImage` (e.g., `ImageManager` in graph-engine or similar) to use the new `ImageGenerationService`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Image generation is now fully decoupled.

---

## Phase 5: User Story 3 - Consistent Feature Gating (Priority: P3)

**Goal**: Users who prefer to run the application in "Lite Mode" experience a consistent behavior where all AI-related capabilities are gracefully disabled.

**Independent Test**: Can be tested by enabling "Lite Mode" in settings and verifying that all Oracle chat and image generation features return clear, user-friendly "disabled" states or messages.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Integrate `AICapabilityGuard` into all public methods of `TextGenerationService`
- [ ] T023 [P] [US3] Integrate `AICapabilityGuard` into all public methods of `ImageGenerationService`
- [ ] T024 [US3] Ensure Lite Mode UI tests pass or add new unit tests in `apps/web/src/tests/ai/capability-guard.spec.ts`

**Checkpoint**: All user stories should now be independently functional. The AI services are fully guarded by Lite Mode settings.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and final deprecation of legacy code.

- [ ] T025 Create barrel export `apps/web/src/lib/services/ai/index.ts`
- [ ] T026 Delete legacy `apps/web/src/lib/services/ai.ts` file
- [ ] T027 Delete legacy `apps/web/src/lib/services/ai.test.ts` file (ensure all suites have migrated)
- [ ] T028 Run all type checks, linting, and unit tests (`npm run test`)
- [ ] T029 Run E2E tests (`npm run test:e2e`) to verify 100% functional parity

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 must be completed first as US2 depends on `TextGenerationService` for prompt distillation.
  - User Story 3 applies the guard to the completed services.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- Foundational infrastructure (Client Manager and Capability Guard) can be built simultaneously.
- Prompt extraction tasks (T007-T010, T017) can be executed in parallel as they have no dependencies on each other.
- Test migration can occur in parallel with service implementation or immediately after.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1).
3. Update `oracle.svelte.ts` to use a mix of the new Text/Context services and the old `ai.ts` for image generation temporarily.
4. Validate Oracle chat parity.

### Incremental Delivery

1. Foundation ready.
2. Deliver Oracle Chat Refactor (US1).
3. Deliver Image Gen Refactor (US2).
4. Enforce Lite Mode strictly across the new services (US3).
5. Delete the old God File in Phase 6.
