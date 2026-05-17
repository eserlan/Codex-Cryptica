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

## 2. Proposed Architecture: Command + Event-Driven Pattern

We will transition to a modular **Command Dispatcher** architecture that leverages the **App Event Bus** (`@codex/events`) to decouple business logic from side effects.

### Goal

- Reduce `oracle-executor.ts` to < 200 lines.
- Eliminate "Side Effect Bloat" in `OracleExecutionContext` by moving notifications, logging, and state synchronization to event listeners.

### Proposed Structure

```text
packages/oracle-engine/src/
├── executors/                 # Focused command handlers
│   ├── base-executor.ts       # Common logic/types
│   ├── chat-executor.ts       # AI logic (emits ORACLE:THINKING, ORACLE:CHUNK)
│   ├── create-executor.ts     # /create (emits ORACLE:ENTITY_CREATED)
│   ├── connect-executor.ts    # /connect (emits ORACLE:CONNECTION_CREATED)
│   └── ...
├── events.ts                  # Event definitions (module augmentation)
└── oracle-executor.ts         # The thin dispatcher
```

## 3. Decoupling Side Effects via AppEventBus

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
