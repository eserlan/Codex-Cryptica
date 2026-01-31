# Contract: VaultStore.close()

## Method Signature

```typescript
/**
 * Detaches the current vault, clearing all in-memory campaign data 
 * and removing persistent directory references.
 */
async close(): Promise<void>;
```

## Logic Requirements

1. **Clear Memory**:
   - Set `this.entities = {}`.
   - Set `this.inboundConnections = {}`.
   - Set `this.rootHandle = undefined`.
   - Set `this.isAuthorized = false`.

2. **Clear Services**:
   - Call `searchService.clear()`.
   - Call `oracle.clearMessages()`.
   - Call `workerBridge.destroy()` (to stop sync workers).

3. **Clear Persistence**:
   - Remove the `codex-cryptica-vault-handle` from IndexedDB.

4. **Notify UI**:
   - Ensure the `status` is set to `"idle"`.
