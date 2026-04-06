# Store Contracts: Oracle RAG

## AIService (Updated)

```typescript
interface AIService {
  /**
   * Transforms a conversational query into a standalone search term.
   * Uses Lite model.
   */
  expandQuery(query: string, history: ChatMessage[]): Promise<string>;

  /**
   * Retrieves full context including fusion and enrichment.
   */
  retrieveContext(
    query: string,
    excludeTitles: Set<string>,
    lastEntityId?: string,
    isImage?: boolean,
  ): Promise<{
    content: string;
    primaryEntityId?: string;
    sourceIds: string[]; // FR-001
  }>;
}
```

## OracleStore (Updated)

```typescript
class OracleStore {
  // Now includes sources for internal logging
  messages: ChatMessage[];

  // Persists to IndexedDB
  async ask(query: string): Promise<void>;
}
```
