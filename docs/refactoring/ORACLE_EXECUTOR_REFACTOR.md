# Refactor Analysis: Oracle Executor Monolith

**File:** `packages/oracle-engine/src/oracle-executor.ts`  
**Pre-Refactor Size:** 1,135 Lines  
**Status:** 🟢 Decoupled (Spec 097 complete)

## 1. Problem Statement

The `OracleActionExecutor` class was a "God Object" responsible for:

1.  **Command Routing**: Parsing and dispatching slash commands.
2.  **Logic Implementation**: Direct implementation of complex business rules for creation, connection, merging, and rolling.
3.  **AI Pipeline Orchestration**: Managing multi-step generation, parsing, discovery detection, and auto-reconciliation.
4.  **Effect Management**: Directly interacting with `vault`, `chatHistory`, `generator`, and `uiStore`.
5.  **Utility Logic**: Category validation, discovery mode resolution, and error handling.

This high coupling made the file difficult to test in isolation, prone to regressions when adding new commands, and challenging for multiple developers to work on simultaneously.

## 2. Proposed Architecture: Command + Event + DI Pattern

We transitioned to a modular **Command Dispatcher** architecture that leverages **Dependency Injection (DI)** and the **App Event Bus** to decouple logic from its environment.

### Goal

- Reduce `oracle-executor.ts` to < 200 lines (Achieved: 127 LOC).
- **Improved Testability**: Each executor can be unit-tested by mocking its injected dependencies.
- **Loose Coupling**: Avoid direct imports of global singletons (like `vault` or `uiStore`) inside engine packages.

### Current Structure

```text
packages/oracle-engine/src/
├── executors/                 # Focused command handlers
│   ├── base-executor.ts       # Common logic/types + DI base class
│   ├── chat-executor.ts       # AI Orchestration
│   ├── create-executor.ts     # /create logic
│   ├── dice-executor.ts       # /roll logic
│   ├── connect-executor.ts    # /connect logic
│   ├── merge-executor.ts      # /merge logic
│   ├── plot-executor.ts       # /plot logic
│   ├── regenerate-executor.ts # /regenerate logic
│   └── visualization-executor.ts # drawEntity / drawMessage
├── events.ts                  # Event definitions
└── oracle-executor.ts         # The thin dispatcher (Composer)
```

## 3. Dependency Injection Strategy

Following the project's DI mandate (Constitution Rule VIII), every executor receives its required services via the constructor. This allows for full isolation during testing.

### Example: CreateExecutor

```typescript
export class CreateExecutor extends BaseExecutor {
  constructor(
    private vault: VaultService,
    private eventBus: AppEventBus
  ) { super(); }

  async execute(...) {
    // Uses this.vault and this.eventBus instead of global singletons
  }
}
```

## 4. Decoupling Side Effects via AppEventBus

The `OracleExecutionContext` callback bloat was replaced with a unified event-based flow:

| Legacy direct call         | Modern Event                | Listener / Reactor                      |
| :------------------------- | :-------------------------- | :-------------------------------------- |
| `context.logActivity(...)` | `ORACLE:ACTION_COMPLETED`   | `ActivityStore` (Search indexing, logs) |
| `uiStore.notify(...)`      | `ORACLE:ERROR` or `SUCCESS` | `ToastManager` (UI notifications)       |
| `undoRedo.push(...)`       | `ORACLE:UNDO_REGISTERED`    | `UndoRedoService`                       |
| `proposeConnections(...)`  | `ORACLE:ENTITY_DISCOVERED`  | `DiscoveryListener` (Suggests links)    |

## 5. Risk Mitigation

- **Race Conditions**: Implemented `isExecuting` guards in all async streaming handlers (`Chat`, `Regenerate`).
- **Circular Dependencies**: Implemented `commandStack` tracking in `BaseExecutor` to block execution loops.
- **Proxy Safety**: Ensured clean separation from Svelte 5 reactive proxies via `$state.snapshot` at the engine boundary.

---

**Refactor completed on May 17, 2026.**
