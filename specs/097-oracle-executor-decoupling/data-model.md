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

### `BaseExecutor` (Abstract)

Provides shared logic for all command handlers.

- **`protected getAvailableCategories(context)`**: Normalizes category list from context.
- **`protected getValidCategoryId(context, id)`**: Validates if a category ID exists in current context.
- **`protected emit(eventBus, event)`**: Helper for standardized event emission.

### `SpecializedExecutors`

Concrete implementations of `OracleCommandExecutor`:

- `DiceExecutor`: Handles `/roll`.
- `MetaExecutor`: Handles `/help`, `/clear`.
- `CreateExecutor`: Handles `/create`.
- `ConnectExecutor`: Handles `/connect`, `/connect-ai`.
- `MergeExecutor`: Handles `/merge`, `/merge-ai`.
- `PlotExecutor`: Handles `/plot`.
- `VisualizationExecutor`: Handles `drawEntity`, `drawMessage`.
- `ChatExecutor`: Orchestrates multi-step AI chat generation.
- `RegenerateExecutor`: Orchestrates AI-driven entity regeneration.
