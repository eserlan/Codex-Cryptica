# Entity Mutation API Contract

Internal TypeScript contract between the web vault facade and its mutation service.

```ts
export interface BatchMutationFailure {
  id: string;
  error: string;
}

export interface BatchMutationResult {
  succeededIds: string[];
  failed: BatchMutationFailure[];
  skippedIds: string[];
  cancelled: boolean;
}
```

Required operations:

```ts
batchChangeEntityType(
  ids: string[],
  type: Entity["type"],
): Promise<BatchMutationResult>;

batchDeleteEntities(ids: string[]): Promise<BatchMutationResult>;

flushPendingSaves(timeoutMs?: number): Promise<void>;
```

Compatibility requirements:

- Existing single-entity methods remain available.
- Existing `batchUpdate` callers retain their current boolean result unless migrated deliberately.
- Guest/demo and active-vault guards run before filesystem mutation.
- Events use existing vault event types with explicit affected entities.
