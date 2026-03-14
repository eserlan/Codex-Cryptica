# Quickstart: Using the New AI Services

With the `ai.ts` refactoring, capabilities are now isolated into domain-specific services within `apps/web/src/lib/services/ai/`.

## 1. Initializing the Services

Instead of calling `aiService.init()`, the services handle their own API key management via the shared `AIClientManager`. You simply import the singleton instances.

```typescript
import {
  textGeneration,
  imageGeneration,
  contextRetrieval,
} from "$lib/services/ai";
```

## 2. Text Generation (e.g., Query Expansion)

```typescript
// The API key is passed explicitly to methods that require communication with the LLM
const expandedQuery = await textGeneration.expandQuery(
  userApiKey,
  "Where did he go?",
  chatHistory,
);
```

## 3. Context Retrieval (RAG)

```typescript
// Context retrieval relies on the vault and search services internally
const contextString = await contextRetrieval.retrieveContext(expandedQuery);
```

## 4. Image Generation

```typescript
// Generate an image based on an entity description and current style
const imageUrl = await imageGeneration.generateImage(
  "A dark spooky tavern",
  activeStyleId,
);
```

## 5. Oracle Engine Integration

When creating the `OracleExecutionContext` (usually in `stores/oracle.svelte.ts`), you inject all three services:

```typescript
import {
  textGeneration,
  imageGeneration,
  contextRetrieval,
} from "$lib/services/ai";

const context: OracleExecutionContext = {
  textGeneration,
  imageGeneration,
  contextRetrieval,
  vault: vaultStore,
  graph: graphStore,
  // ...
};

// The Oracle Engine will now use context.textGeneration.generateResponse(...)
// instead of context.aiService.generateResponse(...)
```
