# Refactor Analysis: Oracle Executor Monolith

**File:** `packages/oracle-engine/src/oracle-executor.ts`  
**Current Size:** 1,135 Lines  
**Status:** 🔴 God File (Critical)

## 1. Problem Statement

The `OracleActionExecutor` class has become a "God Object" responsible for:

1.  **Command Routing**: Parsing and dispatching slash commands.
2.  **Logic Implementation**: Direct implementation of complex business rules for creation, connection, merging, and rolling.
3.  **AI Pipeline Orchestration**: Managing multi-step generation, parsing, discovery detection, and auto-reconciliation.
4.  **Effect Management**: Directly interacting with `vault`, `chatHistory`, `generator`, and `uiStore`.
5.  **Utility Logic**: Category validation, discovery mode resolution, and error handling.

This high coupling makes the file difficult to test in isolation, prone to regressions when adding new commands, and challenging for multiple developers to work on simultaneously.

## 2. Proposed Architecture: Command Pattern

## 2. Proposed Architecture: Command + Event + DI Pattern

We will transition to a modular **Command Dispatcher** architecture that leverages **Dependency Injection (DI)** and the **App Event Bus** to decouple logic from its environment.

### Goal

- Reduce `oracle-executor.ts` to < 200 lines.
- **Improved Testability**: Each executor can be unit-tested by mocking its injected dependencies.
- **Loose Coupling**: Avoid direct imports of global singletons (like `vault` or `uiStore`) inside engine packages.

### Proposed Structure

```text
packages/oracle-engine/src/
├── executors/                 # Focused command handlers
│   ├── base-executor.ts       # Common logic/types + DI base class
│   ├── chat-executor.ts       # Injects: generator, parser, draftingEngine
│   ├── create-executor.ts     # Injects: vault, eventBus
│   └── ...
├── events.ts                  # Event definitions
└── oracle-executor.ts         # The "Composer" and Dispatcher
```

## 3. Dependency Injection Strategy

Following the project's DI mandate, every executor will receive its required services via the constructor. This allows us to provide "sensible defaults" while remaining fully mockable.

### Example: CreateExecutor

```typescript
export class CreateExecutor extends BaseExecutor {
  constructor(
    private vault: VaultService,
    private eventBus: AppEventBus = defaultEventBus
  ) { super(); }

  async execute(...) {
    // Uses this.vault and this.eventBus instead of global singletons
  }
}
```

## 4. Decoupling Side Effects via AppEventBus

Currently, the `OracleExecutionContext` is bloated with functions like `logActivity` and `proposeConnectionsForEntity`. We will replace these with a unified event-based flow:

| Current direct call        | Proposed Event              | Listener / Reactor                      |
| :------------------------- | :-------------------------- | :-------------------------------------- |
| `context.logActivity(...)` | `ORACLE:ACTION_COMPLETED`   | `ActivityStore` (Search indexing, logs) |
| `uiStore.notify(...)`      | `ORACLE:ERROR` or `SUCCESS` | `ToastManager` (UI notifications)       |
| `undoRedo.push(...)`       | `ORACLE:UNDO_REGISTERED`    | `UndoRedoService`                       |
| `proposeConnections(...)`  | `ORACLE:ENTITY_DISCOVERED`  | `DiscoveryListener` (Suggests links)    |

## 4. Breakdown of extractions

... (rest of the table remains similar) ...

## 5. Transition Strategy

### Phase 1: Infrastructure & Events (In progress)

- Define `OracleCommand` interface.
- Register new `ORACLE:*` events in `packages/oracle-engine/src/events.ts`.
- Create `BaseExecutor` that handles event emission.

### Phase 2: Surgical Extractions

...

1.  **Low Complexity**: `Help`, `Roll`, `Clear`.
2.  **Medium Complexity**: `Create`, `Connect`, `Merge`, `Plot`.
3.  **High Complexity**: `Regenerate`, `Visualization`.
4.  **Critical Monolith**: `Chat` (This is the largest block and may need sub-extraction for discovery/reconciliation).

### Phase 3: Facade Refactor

- Update `OracleActionExecutor` to use a Map of `intent.type` -> `CommandExecutor`.
- Implement a `registerCommand` pattern for future extensibility.

## 5. Risk Assessment

- **State Leakage**: Ensuring `$state.snapshot` is used correctly when passing context to sub-executors.
- **Undo/Redo**: Maintaining consistent push/pop to the undo stack across different executors.
- **Recursive Calls**: Ensuring `chat-executor` can still trigger other executors if needed (e.g., auto-creating an entity).

---

**Next Step:** Extract `DiceExecutor` and `HelpExecutor` as low-risk proof-of-concepts.
