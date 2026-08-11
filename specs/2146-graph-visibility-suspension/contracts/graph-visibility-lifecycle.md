# Graph Visibility Lifecycle Contract

The contract is internal to `apps/web` and exists to keep the graph controller,
GraphView, and Minimap behavior consistent.

```ts
export type GraphVisibilityReason =
  "document-hidden" | "surface-covered" | "offscreen" | null;

export interface GraphVisibilityInputs {
  documentVisible: boolean;
  surfaceCovered: boolean;
  containerIntersecting: boolean;
}

export interface GraphVisibilitySnapshot extends GraphVisibilityInputs {
  suspended: boolean;
  reason: GraphVisibilityReason;
}

export interface GraphVisibilityLifecycle {
  readonly snapshot: GraphVisibilitySnapshot;
  setInputs(inputs: GraphVisibilityInputs): void;
  suspend(reason?: Exclude<GraphVisibilityReason, null>): void;
  resume(): void;
  destroy(): void;
}
```

Required behavior:

- `suspended` is true if any input says the graph cannot be usefully rendered.
- Repeated identical input updates are idempotent.
- `suspend` and `resume` are idempotent.
- Every transition invalidates stale asynchronous work through a generation
  token.
- The lifecycle owns no vault data and performs no persistence.
