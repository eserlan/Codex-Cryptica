# Research: Context-Aware Entity Generator

This document details the architectural decisions, AI prompt design, and data flow for the Context-Aware Entity Generator.

## Technical Decisions

### Decision 1: Prompt Location & Service Integration

- **Choice**: Implement the prompt builder in `apps/web/src/lib/services/ai/prompts/related-entity-generation.ts` and add a new method `generateRelatedEntity` in `TextGenerationService` (`apps/web/src/lib/services/ai/text-generation.service.svelte.ts`).
- **Rationale**: Keeps AI text generation concerns centralized within `TextGenerationService` which already holds methods like `reconcileEntityUpdate`, `generatePlotAnalysis`, etc. It leverages the existing `@google/generative-ai` integration and configuration.
- **Alternatives considered**: Adding it to `packages/oracle-engine`. Rejected because the application prompt templates are currently managed in the web app's service layer, whereas `oracle-engine` hosts lower-level structures like executors and settings.

### Decision 2: Context Gathering & Prompt Format

- **Choice**: The system will extract first-degree neighbors in the graph using the active entity ID and retrieve their metadata + chronicle (the `content` field). These neighbors are formatted clearly as a context block in the AI prompt.
- **Rationale**: Adheres to the user clarification (Option A: direct neighbors, Option B: include neighbor Title, Type, Relationship label, and Chronicle content). Using the Chronicle content provides enough background about the neighbor without bloating the token window.
- **Alternatives considered**: Passing full lore. Rejected to avoid hitting Gemini token limits and bloating response time.

### Decision 3: Relationship Suggestion Mechanics

- **Choice**: Static mapping function `getSuggestedRelationships(sourceType, targetType)` to define relationships (e.g., Character -> Character suggests ally, rival, enemy, etc.). Plus a text input for custom inputs.
- **Rationale**: Simple, zero-latency, and highly predictable.
- **Alternatives considered**: Asking AI to suggest relationships before generation. Rejected to save API roundtrips and keep generation fast.

### Decision 4: Draft Entity Persistence & Security

- **Choice**: The generated draft is transient (stored in local UI state of the modal component). Once accepted, the new entity is created in the vault via `vault.createEntity()`, and the connection is created via `vault.addConnection(sourceId, targetId, "related_to", relationship)`.
- **Rationale**: Adheres to client-side privacy, client-side processing, and security guidelines. No network requests are made outside of the Gemini API endpoint.
- **Alternatives considered**: Storing drafts in IndexedDB. Rejected as unnecessary complexity since drafts are transient and meant to be processed immediately or discarded.

### Decision 5: Template System Integration

- **Choice**: The system will call `entityTemplateService.resolveTemplate(targetType)` to fetch the active theme template for the target entity type. This template outline is passed into the prompt, and the AI is instructed to structure its generated `description` (lore) fields using those exact markdown headings.
- **Rationale**: Reuses the existing robust default and custom templates system, ensuring that generated entities are structured exactly as if they had been created manually by the user, maintaining vault consistency.
- **Alternatives considered**: Merging AI output into the template dynamically after generation. Rejected because AI-generated text flows much better when it directly fills out a template's section headers during the generation phase.

## External Dependencies & API

- **Gemini Pro (Gemini 1.5/2.0/3.5)**: Used for generating the structured draft. Output format will be strictly JSON containing `name`, `type`, `summary`, `description`, `labels` (as a string array), and `plotHook`.
