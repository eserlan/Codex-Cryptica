# Contract: Reactive Service API

Services and stores in `apps/web/src` must adhere to the following Runic structure.

## Class Definition

```typescript
export class FeatureStore {
  // 1. Reactive state
  data = $state<DataType>(initialValue);

  // 2. Derived state
  count = $derived(this.data.length);

  // 3. Constructor with DI
  constructor(private dependency = defaultDependency) {}

  // 4. Mutations
  update(newData: DataType) {
    this.data = newData;
  }

  // 5. Async/Boundary safety
  async process() {
    const snapshot = $state.snapshot(this.data);
    await externalService(snapshot);
  }
}
```

## Component Usage

- **Direct Access**: Components access state via `store.property`.
- **No Auto-subscription**: Use of `$store` is prohibited.
- **Explicit Cleanup**: Use `$effect` for side effects requiring cleanup.
