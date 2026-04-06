# Implementation Plan: AI Service Refactor

**Branch**: `072-ai-service-refactor` | **Date**: 2026-03-13 | **Spec**: `/specs/072-ai-service-refactor/spec.md`
**Input**: Feature specification from `/specs/072-ai-service-refactor/spec.md`

## Summary

Decompose the monolithic `ai.ts` service into specialized domain services (`TextGenerationService`, `ImageGenerationService`, `ContextRetrievalService`), centralize SDK initialization via `AIClientManager`, and extract all hardcoded prompt templates into a dedicated registry.

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**: `@google/generative-ai`
**Storage**: N/A (Stateless services)
**Testing**: Vitest
**Target Platform**: Browser (SvelteKit Web App)
**Project Type**: Monorepo packages and web app (`apps/web` and `packages/oracle-engine`)
**Performance Goals**: Maintain existing LLM response latency
**Constraints**: Must strictly honor `liteMode` setting across all services
**Scale/Scope**: Impacts all AI-driven features (Oracle chat, Plot Analysis, Merging, Image Gen)

## Constitution Check

- **Library-First**: The refactored services remain in `apps/web/src/lib/services/` for now, but decoupling them prepares them for eventual extraction if needed. The `oracle-engine` package relies on injected abstractions, adhering strictly to this.
- **Test-Driven Development (TDD)**: All existing tests in `ai.test.ts` MUST be preserved and migrated to per-service test files to guarantee no behavioral regressions.
- **Dependency Injection (DI)**: The `OracleExecutionContext` is being updated specifically to inject these isolated capabilities rather than a global singleton.
- **Clean Implementation**: Avoid state warnings; use functional closures or class methods appropriately.

## Project Structure

### Documentation (this feature)

```text
specs/072-ai-service-refactor/
├── plan.md              # This file
├── research.md          # Domain separation and extraction strategy
├── data-model.md        # OracleExecutionContext interface updates
├── quickstart.md        # Guide on injecting new services
└── tasks.md             # Implementation steps (to be generated)
```

### Source Code

```text
apps/web/src/lib/services/ai/
├── index.ts                           # Barrel export
├── client-manager.ts                  # SDK Initialization singleton
├── capability-guard.ts                # liteMode enforcement
├── context-retrieval.service.ts       # RAG logic
├── text-generation.service.ts         # Chat and LLM reasoning
├── image-generation.service.ts        # Imagen logic
└── prompts/
    ├── system-instructions.ts
    ├── query-expansion.ts
    ├── visual-distillation.ts
    ├── plot-analysis.ts
    └── merge-proposal.ts

apps/web/src/tests/ai/                 # Migrated from ai.test.ts
├── context-retrieval.spec.ts
├── text-generation.spec.ts
└── image-generation.spec.ts

packages/schema/src/
└── ai.ts                              # Move TIER_MODES here

packages/oracle-engine/src/
└── types.ts                           # Update OracleExecutionContext
```

**Structure Decision**: A dedicated `ai/` module inside `apps/web/src/lib/services/` containing granular service files and a `prompts/` subdirectory, matching the architectural breakdown.

## Complexity Tracking

N/A - This is a simplification and decoupling effort, explicitly reducing complexity within a God File.
