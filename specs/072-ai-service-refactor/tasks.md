---
description: "Task list for AI Service Refactor implementation"
---

# Tasks: AI Service Refactor

**Input**: Design documents from `/specs/072-ai-service-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Foundation & Cleanup [P]

- [x] T001 Define core service interfaces in `packages/schema/src/ai.ts`
- [x] T002 Create directory structure at `apps/web/src/lib/services/ai/` and `apps/web/src/tests/ai/`
- [x] T003 Create `apps/web/src/lib/services/ai/capability-guard.ts` for Lite Mode logic
- [x] T004 Implement `apps/web/src/lib/services/ai/client-manager.ts` for Gemini API client lifecycle

## Phase 2: Prompt Extraction [P]

- [x] T005 [US1] Create `apps/web/src/lib/services/ai/prompts/query-expansion.ts`
- [x] T006 [US1] Create `apps/web/src/lib/services/ai/prompts/system-instructions.ts`
- [x] T007 [US1] Create `apps/web/src/lib/services/ai/prompts/merge-proposal.ts`
- [x] T008 [US1] Create `apps/web/src/lib/services/ai/prompts/plot-analysis.ts`
- [x] T009 [US2] Create `apps/web/src/lib/services/ai/prompts/visual-distillation.ts`

## Phase 3: User Story 1 - Context-Aware Oracle Chat

- [x] T011 [US1] Implement `ContextRetrievalService` in `apps/web/src/lib/services/ai/context-retrieval.service.ts`
- [x] T012 [US1] Implement `TextGenerationService` in `apps/web/src/lib/services/ai/text-generation.service.ts` (depends on prompt extractions and AIClientManager)
- [x] T013 [US1] Migrate context retrieval tests to `apps/web/src/tests/ai/context-retrieval.svelte.spec.ts`
- [x] T014 [US1] Migrate text generation tests to `apps/web/src/tests/ai/text-generation.svelte.spec.ts`
- [x] T015 [US1] Update `packages/oracle-engine/src/oracle-generator.ts` to use `context.textGeneration` and `context.contextRetrieval`
- [x] T016 [US1] Update `apps/web/src/lib/stores/oracle.svelte.ts` to inject `TextGenerationService` and `ContextRetrievalService` into `OracleExecutionContext`

## Phase 4: User Story 2 - Distributed Image Generation

- [x] T017 [US2] Extract image-specific prompt logic from legacy `ai.ts`
- [x] T018 [US2] Implement `ImageGenerationService` in `apps/web/src/lib/services/ai/image-generation.service.ts`
- [x] T019 [US2] Migrate image generation tests to `apps/web/src/tests/ai/image-generation.svelte.spec.ts`
- [x] T020 [US2] Update `OracleStore.drawEntity` and `OracleStore.drawMessage` to use `imageGenerationService`
- [x] T021 [US2] Verify `OracleGenerator.generateEntityVisualization` usage of new interfaces

## Phase 5: User Story 3 - Lite Mode Integrity

- [x] T022 [US3] Implement strict `assertAIEnabled()` checks within all new AI services
- [x] T023 [US3] Add unit tests for Lite Mode gating in each service spec
- [x] T024 [US3] Verify `/help` and `/roll` still work in Lite Mode via regression testing

## Phase 6: Final Integration & Deletion

- [x] T025 Create barrel export in `apps/web/src/lib/services/ai/index.ts`
- [x] T026 Update all remaining imports of `AIService` or `aiService` to use specific services
- [x] T027 Delete `apps/web/src/lib/services/ai/legacy-adapter.ts`
- [x] T028 Run full test suite to ensure 100% chat parity
- [x] T029 Delete obsolete `apps/web/src/lib/services/ai.test.ts` (already gone)

## Success Criteria Checklist

- [x] All AI logic decoupled from `oracle-engine` package.
- [x] `apps/web/src/lib/services/ai/` follows granular file structure.
- [x] 100% unit test coverage for new services.
- [x] Verified `/draw` and chat parity.

### Incremental Delivery

1. Foundation ready.
2. Deliver Oracle Chat Refactor (US1).
3. Deliver Image Gen Refactor (US2).
4. Enforce Lite Mode strictly across the new services (US3).
5. Delete the old God File in Phase 6.
