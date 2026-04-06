# AI Service Refactor Analysis

## Current State of `ai.ts`

The `apps/web/src/lib/services/ai.ts` file is currently a "God File" (~820 lines). It suffers from low cohesion and high coupling, violating the Single Responsibility Principle.

### Core Responsibilities Currently Mixed:

1. **RAG & Context Retrieval**:
   - `retrieveContext`: Orchestrates search, style lookup, explicit subject detection, follow-up detection, and context assembly.
   - `getConsolidatedContext`: Formats retrieved entities into a condensed string.
   - `findExplicitSubject`: Analyzes queries to prioritize specific entities.
   - `isFollowUp`: Heuristic checks to determine if a query relies on previous context.

2. **Text Generation & Intelligence**:
   - `generateResponse`: Handles streaming text generation for the Oracle chat.
   - `expandQuery`: Transforms conversational queries into standalone search terms.
   - `generatePlotAnalysis`: Domain-specific task for analyzing narrative structure.
   - `generateMergeProposal`: Domain-specific task for deduping entities.

3. **Multimodal / Image Generation**:
   - `distillVisualPrompt`: Converts descriptive text into optimized image generation prompts using Gemini.
   - `generateImage`: Communicates with an external REST API (Imagen) to generate visual assets.
   - `styleCache` / `styleTitleCache`: Session-scope cache for the active art style entity.

4. **Infrastructure & SDK Management**:
   - Manages the `GoogleGenerativeAI` instance lifecycle via `init()`.
   - The client is re-created inside `expandQuery` independently from `init()`, creating two separate initialization paths.

5. **Prompt Engineering**:
   - Massive hardcoded template literal strings defining system instructions and task constraints embedded directly inside method bodies.

6. **Lite Mode Gating**:
   - Every public method individually checks `if (uiStore.liteMode)`. This pattern is duplicated ~6 times across the class.

---

## The Problems

- **Testing**: Impossible to unit test individual capabilities without mocking the entire search engine and vault context.
- **Maintainability**: Modifying a prompt requires scrolling through hundreds of lines of API fetching logic.
- **Scalability**: Any new AI feature (audio, agentic workflows) will grow this file further.
- **Coupling**: `OracleExecutionContext` in `packages/oracle-engine` depends on the monolithic `aiService: any`, blocking reuse and type safety.
- **Unresolved cross-service dependency**: `styleCache` bridges context retrieval and image generation — its ownership is currently ambiguous.
- **Dual client initialization paths**: `init()` and `expandQuery` each independently create a `GoogleGenerativeAI` instance, risking state inconsistency.

---

## Proposed Refactoring Strategy

New location: `apps/web/src/lib/services/ai/`

### Revised Phase Order

> Phase 3 (Client Manager) is a prerequisite for Phase 2 (Services), so the correct order is:
> **Phase 1 → Phase 3 → Phase 2 → Phase 4**

---

### Phase 1: Prompt Extraction

1. Create `apps/web/src/lib/services/ai/prompts/`.
2. Extract all large template literals into dedicated files:
   - `prompts/system-instructions.ts` — Oracle persona, demo mode variant
   - `prompts/query-expansion.ts`
   - `prompts/visual-distillation.ts`
   - `prompts/plot-analysis.ts`
   - `prompts/merge-proposal.ts`
3. Expose via exported builder functions with typed args (e.g., `buildSystemPrompt(demoMode: boolean): string`).

---

### Phase 2: Infrastructure (AIClientManager)

Create `ai/client-manager.ts` as the **single source of truth** for the Gemini SDK client.

```typescript
export class AIClientManager {
  private client: GoogleGenerativeAI | null = null;
  private currentKey: string | null = null;

  getClient(apiKey: string): GoogleGenerativeAI {
    if (!this.client || this.client !== this.currentKey) {
      this.client = new GoogleGenerativeAI(apiKey);
      this.currentKey = apiKey;
    }
    return this.client;
  }
}
```

This eliminates the dual init path currently in `init()` vs `expandQuery`.

---

### Phase 3: Domain Service Isolation

Split into four distinct services (note: one more than the original plan):

#### 1. `ContextRetrievalService` (`ai/context-retrieval.service.ts`)

- **Responsibility**: Search, entity selection heuristics, context window assembly.
- **Dependencies**: `searchService`, `vault` (injected).
- **Key Methods**: `retrieveContext`, `getConsolidatedContext`, `findExplicitSubject`, `isFollowUp`.
- **Owns**: The style cache (`styleCache`, `styleTitleCache`) since it performs the style lookup.

#### 2. `TextGenerationService` (`ai/text-generation.service.ts`)

- **Responsibility**: All text-in / text-out operations via the Gemini SDK.
- **Dependencies**: `AIClientManager`, prompt templates.
- **Key Methods**: `generateResponse` (streaming), `expandQuery`, `generateMergeProposal`, `generatePlotAnalysis`.
- **Does NOT absorb**: `parseConnectionIntent`, `parseMergeIntent`, `generateConnectionProposal` — these already delegate to `@codex/proposer` and should stay there.

#### 3. `ImageGenerationService` (`ai/image-generation.service.ts`)

- **Responsibility**: All text-in / image-out operations.
- **Dependencies**: `TextGenerationService` (for `distillVisualPrompt`), `ContextRetrievalService` (for style context via `retrieveContext`), fetch/REST client.
- **Key Methods**: `generateImage`, `distillVisualPrompt`, `enhancePrompt`.

#### 4. `AICapabilityGuard` (`ai/capability-guard.ts`)

- **Responsibility**: Centralize `liteMode` enforcement so it isn't duplicated across all services.
- **Pattern**: Wrap service methods or provide a guard utility that each service calls once at the top of public methods.

```typescript
export function assertAIEnabled(uiStore: { liteMode: boolean }) {
  if (uiStore.liteMode)
    throw new Error("AI features are disabled in Lite Mode.");
}
```

---

### Phase 4: Oracle Engine Integration

#### 4a. Type-harden `OracleExecutionContext`

Replace all `any` types with proper interfaces:

```typescript
// Before
export interface OracleExecutionContext {
  aiService: any;
  vault: any;
  graph: any;
  // ...
}

// After
export interface OracleExecutionContext {
  textGeneration: TextGenerationService;
  imageGeneration: ImageGenerationService;
  contextRetrieval: ContextRetrievalService;
  vault: VaultStore; // typed interface from packages/schema
  graph: GraphStore; // typed interface
  chatHistory: ChatHistoryService;
  // ...
}
```

Move `TIER_MODES` constants to `packages/schema` (currently in `ai.ts`, used everywhere).

#### 4b. Update `OracleGenerator`

`packages/oracle-engine/src/oracle-generator.ts` currently calls `context.aiService.expandQuery`, `context.aiService.retrieveContext`, etc. Update to use the new split context keys:

```typescript
// Before
await context.aiService.expandQuery(...)
await context.aiService.retrieveContext(...)
await context.aiService.generateResponse(...)

// After
await context.textGeneration.expandQuery(...)
await context.contextRetrieval.retrieveContext(...)
await context.textGeneration.generateResponse(...)
```

#### 4c. Update `oracle.svelte.ts`

Update the Svelte store that builds `OracleExecutionContext` to inject the new specialized service instances.

---

### Phase 5: Test Migration

For each new service, create a corresponding test file:

| New File                       | Test File                           |
| ------------------------------ | ----------------------------------- |
| `context-retrieval.service.ts` | `context-retrieval.service.test.ts` |
| `text-generation.service.ts`   | `text-generation.service.test.ts`   |
| `image-generation.service.ts`  | `image-generation.service.test.ts`  |
| `client-manager.ts`            | `client-manager.test.ts`            |

Migrate the relevant suites from `ai.test.ts` into these files. The `ai.test.ts` file can then be deleted or reduced to a barrel-level smoke test.

---

## Final File Structure

```
apps/web/src/lib/services/ai/
  index.ts                          # Barrel export (replaces ai.ts)
  client-manager.ts                 # GoogleGenerativeAI lifecycle
  capability-guard.ts               # liteMode enforcement utility
  context-retrieval.service.ts      # RAG & context assembly
  text-generation.service.ts        # Streaming text, query expansion
  image-generation.service.ts       # Imagen REST + distillation
  prompts/
    system-instructions.ts
    query-expansion.ts
    visual-distillation.ts
    plot-analysis.ts
    merge-proposal.ts
```

---

## Expected Outcome

- **`ai.ts` is deleted**; `index.ts` becomes a thin barrel re-exporting the service singletons.
- Prompt engineering is fully decoupled from execution logic.
- `liteMode` gating is a single shared utility, not 6 scattered guards.
- `styleCache` has clear ownership (`ContextRetrievalService`).
- The Gemini SDK client has a single initialization path (`AIClientManager`).
- `oracle-engine` depends on typed specialized services — not a monolithic `any`.
- All existing `ai.test.ts` suites migrate cleanly to per-service test files.
