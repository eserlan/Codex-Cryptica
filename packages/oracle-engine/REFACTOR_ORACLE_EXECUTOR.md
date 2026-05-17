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

We will transition to a modular **Command Dispatcher** architecture.

### Goal

Reduce `oracle-executor.ts` to < 200 lines by delegating all work to specialized command handlers.

### Proposed Structure

```text
packages/oracle-engine/src/
├── executors/                 # New directory for handlers
│   ├── base-executor.ts       # Common logic/types
│   ├── chat-executor.ts       # The complex AI logic (formerly executeChat)
│   ├── create-executor.ts     # /create
│   ├── connect-executor.ts    # /connect & /connect-ai
│   ├── merge-executor.ts      # /merge & /merge-ai
│   ├── dice-executor.ts       # /roll
│   ├── visualization-executor.ts # drawEntity & drawMessage
│   └── meta-executor.ts       # /help, /clear, /regen
└── oracle-executor.ts         # The thin router/facade
```

## 3. Breakdown of extractions

| Extraction Target     | Line Range (Approx) | Dependencies                            |
| :-------------------- | :------------------ | :-------------------------------------- |
| **Command Router**    | 45-120              | Switches on `intent.type`               |
| **Help Handler**      | 126-172             | Static text                             |
| **Regen Handler**     | 174-228             | `generator`, `vault`                    |
| **Roll Handler**      | 230-259             | `dice-engine` (external)                |
| **Create Handler**    | 261-330             | `vault`, `draftingEngine`               |
| **Connect Handler**   | 332-407             | `vault`                                 |
| **Merge Handler**     | 409-491             | `vault`                                 |
| **AI Connect/Merge**  | 493-556             | `textGeneration`, `vault`               |
| **Plot Handler**      | 558-641             | `textGeneration`, `vault`               |
| **Chat Orchestrator** | 643-1000            | `generator`, `parser`, `draftingEngine` |
| **Image/Viz Handler** | 1045-1130           | `generator`, `vault`                    |

## 4. Transition Strategy

### Phase 1: Infrastructure (In progress)

- Define `OracleCommand` interface.
- Create `BaseExecutor` with shared utilities (like `getAvailableCategories`).

### Phase 2: Surgical Extractions (Ordered by complexity)

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
