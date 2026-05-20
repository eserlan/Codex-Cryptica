# Manager Contracts

All managers must adhere to the following architectural patterns to ensure stability during the refactor.

## Constructor Pattern

Managers must accept the parent `OracleStore` (facade) and an optional dependency object for testing.

```typescript
export class OracleUiManager {
  constructor(
    private store: OracleStore,
    deps: {
      /* optional mocks */
    } = {},
  ) {}
}
```

## Internal Dependencies

Managers should access other managers via the `store` reference.

```typescript
// Inside OracleActionManager
const context = this.store.context.getExecutionContext();
```

## Backward Compatibility (Facade)

The `OracleStore` must maintain the following public surface:

| Property/Method            | Delegation Target                         |
| :------------------------- | :---------------------------------------- |
| `isOpen`                   | `ui.isOpen`                               |
| `isThinking`               | `ui.isThinking`                           |
| `messages`                 | `chat.messages`                           |
| `apiKey`                   | `settings.apiKey`                         |
| `ask(content)`             | `chat.ask(content)`                       |
| `regenerate(id)`           | `actions.regenerate(id)`                  |
| `reconcileSmartApply(...)` | `reconciliation.reconcileSmartApply(...)` |
| `getExecutionContext()`    | `context.getExecutionContext()`           |

## Event Bus Handling

The Facade remains the sole owner of the `BroadcastChannel`. It routes events as follows:

- `ORACLE_THINKING_START/END` -> `ui.updateThinking()`
- `ORACLE_ENTITY_DISCOVERED` -> `chat.addProposal()`
