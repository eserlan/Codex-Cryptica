# Implementation Plan: Context-Aware Entity Generator

**Branch**: `127-context-aware-entity-generator` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/127-context-aware-entity-generator/spec.md`

## Summary

Add a **Generate Related** action to entity views (sidebar detail view and Zen mode content/detail area). This action opens a configuration modal where users choose target entity type and relationship. The backend AI compiler uses the active entity and its first-degree graph neighbors (including their chronicles) to generate a grounded, context-aware draft entity. Users can review, edit, regenerate, or save the draft, which automatically creates the new entity in the vault and links it back to the source entity with a directed edge.

## Technical Context

**Language/Version**: TypeScript 6.0.3  
**Primary Dependencies**: Svelte 5 Runes, SvelteKit, `@google/generative-ai`  
**Storage**: OPFS (Vault Files), IndexedDB (via existing stores/vault.svelte.ts)  
**Testing**: Vitest for service/prompt unit tests, Svelte Testing Library for component tests  
**Target Platform**: Browser (Client-side offline-first architecture)  
**Performance Goals**: Prompt compilation under 50ms, modal opening under 100ms  
**Constraints**: Zero-leak of custom API keys, must respect AI-disabled setting, strictly client-side

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: The prompt construction and AI generation logic resides inside standard service architectures. No monolithic logic bloat.
2. **TDD**: Corresponding unit tests MUST be written for the prompt builder (`related-entity-generation.test.ts`) and the text-generation service method (`text-generation.service.test.ts`).
3. **Labels Over Tags**: Strict convergence on "Labels" for all suggested categories/tags. No user-facing mention of tags.
4. **Privacy**: Executed fully client-side using local state for drafts and direct vault API operations.

## Project Structure

### Documentation (this feature)

```text
specs/127-context-aware-entity-generator/
├── plan.md              # This file
├── research.md          # Technical decisions and rationale
├── data-model.md        # Transient request/draft structures
├── quickstart.md        # Code snippets and integration guidelines
├── contracts/
│   └── generation.md    # AI prompt & JSON response schema contract
└── tasks.md             # Task breakdown and checklist
```

### Source Code Paths

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── entity-detail/
│   │   │   ├── DetailStatusTab.svelte          # Add "Generate Related" action here
│   │   │   └── RelatedEntityModal.svelte       # New configuration/review modal
│   │   └── zen/
│   │       └── ZenContent.svelte               # Add "Generate Related" action here
│   ├── services/
│   │   └── ai/
│   │       ├── prompts/
│   │       │   ├── related-entity-generation.ts      # Prompt template builder
│   │       │   └── related-entity-generation.test.ts # Prompt unit tests
│   │       └── text-generation.service.svelte.ts     # Add generation orchestration
│   └── stores/
│       └── vault.svelte.ts                     # vault.createEntity and addConnection APIs
```

**Structure Decision**: Fully integrated with existing `apps/web/src/lib/services/ai/` structures and standard entity detail UI components.

## Complexity Tracking

No constitution violations detected. Complexity remains low.
