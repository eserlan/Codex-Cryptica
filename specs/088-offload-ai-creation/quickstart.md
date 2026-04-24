# Quickstart: Offload AI Creation

## Working with the Oracle Worker

The Lore Oracle now runs in a background thread to maintain UI responsiveness.

### Adding a New Worker Method

1.  Update the `OracleWorker` class in `apps/web/src/lib/workers/oracle.worker.ts`.
2.  Expose the method in the `OracleBridge` (or use the existing `api` proxy) in `apps/web/src/lib/cloud-bridge/oracle-bridge.ts`.
3.  Consume it via `oracleStore.textGeneration` or `oracleStore.draftingEngine`.

### Emitting Background Events

If you need to notify the UI of a background event without a direct request-response loop:

```typescript
// Inside OracleWorker
this.emit({
  type: "SOME_EVENT",
  payload: { data: "..." }
});
```

The `OracleStore` will catch this in its `handleWorkerEvent` method.

### Fallback Behavior

Always ensure you handle the case where the worker is not ready (e.g., during SSR). Use the `oracleBridge.isReady` check provided in the `OracleStore`.

### Testing

Run unit tests for the core logic in isolation:

```bash
cd apps/web && npm test -- src/lib/services/ai/text-generation.service.test.ts
```

To test the bridge, use Playwright tests or manual verification in a browser environment.
