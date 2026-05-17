# Data Model: Oracle Executor Decoupling

## 1. Interfaces

### `OracleCommandExecutor`

Located in `packages/oracle-engine/src/types.ts`.

```typescript
export interface OracleCommandExecutor {
  execute(
    intent: OracleIntent,
    context: OracleExecutionContext,
    onPartialResponse?: (partial: string) => void,
  ): Promise<void>;
}
```

## 2. Event Definitions

Located in `packages/oracle-engine/src/events.ts`.

| Event Type                 | Payload                                   |
| :------------------------- | :---------------------------------------- |
| `ORACLE:COMMAND_STARTED`   | `{ intent: OracleIntent }`                |
| `ORACLE:COMMAND_COMPLETED` | `{ intent: OracleIntent; result?: any }`  |
| `ORACLE:COMMAND_FAILED`    | `{ intent: OracleIntent; error: string }` |
| `ORACLE:ENTITY_DISCOVERED` | `{ proposal: DiscoveryProposal }`         |
| `ORACLE:ENTITY_CREATED`    | `{ entityId: string; title: string }`     |

## 3. Executor Hierarchy

- `BaseExecutor`: Abstract class providing shared utilities for all handlers.
- `SpecializedExecutors`: Concrete implementations of `OracleCommandExecutor`.
