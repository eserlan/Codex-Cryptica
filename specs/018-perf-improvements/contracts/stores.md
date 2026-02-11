# Internal Store Contracts

## VaultStore Refinements

Optimizing connection management from O(N\*M) to O(1) per update.

### `addInboundConnection(sourceId: string, targetId: string): void`

- **Purpose**: Incrementally updates the `inboundMap`.
- **Precondition**: `sourceId` and `targetId` must exist.
- **Side Effect**: Adds `sourceId` to the set associated with `targetId`.

### `removeInboundConnection(sourceId: string, targetId: string): void`

- **Purpose**: Incrementally updates the `inboundMap`.
- **Side Effect**: Removes `sourceId` from the set associated with `targetId`.

---

## OracleStore Sync Protocol

Updating the `BroadcastChannel` payload to avoid unnecessary serialization.

### Message Payload

```typescript
interface OracleSyncPayload {
  messages: ChatMessage[];
  lastUpdated: number; // Checked first before deep comparison
}
```
