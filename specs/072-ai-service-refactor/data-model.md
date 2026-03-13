# Data Model: AI Service Refactor

This feature primarily involves a structural refactoring rather than introducing new data entities. However, it does alter the internal interfaces used to inject dependencies into the Oracle Engine.

## Internal Interfaces

### `OracleExecutionContext` (Updated)

This interface (located in `@codex/oracle-engine` or `packages/schema`) must be updated to replace the monolithic `aiService: any` with the new specialized service interfaces.

```typescript
export interface OracleExecutionContext {
  // NEW INJECTIONS
  textGeneration: TextGenerationService;
  imageGeneration: ImageGenerationService;
  contextRetrieval: ContextRetrievalService;

  // EXISTING INJECTIONS
  vault: VaultStore;
  graph: GraphStore;
  chatHistory: ChatHistoryService;
  // ... other context properties
}
```

### Specialized Service Interfaces

#### `ContextRetrievalService`

- `retrieveContext(query: string, excludeIds?: string[]): Promise<string>`
- `getConsolidatedContext(entities: Entity[]): string`
- `findExplicitSubject(query: string, context: string): Promise<string | null>`

#### `TextGenerationService`

- `generateResponse(query: string, context: string, history: any[], onChunk: (chunk: string) => void): Promise<string>`
- `expandQuery(apiKey: string, query: string, history: any[]): Promise<string>`
- `generateMergeProposal(...)`
- `generatePlotAnalysis(...)`

#### `ImageGenerationService`

- `generateImage(prompt: string, styleId?: string): Promise<string>`
- `distillVisualPrompt(entityData: any, styleContext: string): Promise<string>`
