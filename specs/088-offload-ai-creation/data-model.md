# Data Model: Offload AI Creation

## Oracle Worker Events

Used for asynchronous communication over `BroadcastChannel("codex-oracle-events")`.

```typescript
export type OracleWorkerEventType =
  | "ORACLE_THINKING_START"
  | "ORACLE_THINKING_END"
  | "ORACLE_ENTITY_DISCOVERED"
  | "ORACLE_ERROR";

export interface OracleWorkerEvent {
  type: OracleWorkerEventType;
  payload?: any;
  vaultId?: string;
  requestId?: string;
}
```

- **`ORACLE_ENTITY_DISCOVERED`**:
  - `payload`: `DiscoveryProposal`
  - `requestId`: The ID of the `assistant` message being generated.

## Text Generation Interface

Updated to support metadata for event tracking.

```typescript
interface TextGenerationOptions {
  requestId?: string;
  vaultId?: string;
  existingEntities?: any[];
}

generateResponse(
  apiKey: string,
  query: string,
  history: ChatHistoryMessage[],
  context: string,
  modelName: string,
  onUpdate: (partial: string) => void,
  demoMode?: boolean,
  categories?: string[],
  options?: TextGenerationOptions
): Promise<void>;
```

## Discovery State

The `OracleWorker` maintains transient state per request to ensure idempotency.

```typescript
class OracleWorker {
  // ...
  private discoveredTitles: Set<string>; // Reset per generateResponse call
}
```
