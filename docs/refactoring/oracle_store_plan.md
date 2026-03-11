# Refactoring Plan: `oracle.svelte.ts`

## Current State Analysis

`apps/web/src/lib/stores/oracle.svelte.ts` is currently the largest file in the codebase (1,484 lines). It functions as a classic "God Object," taking on responsibilities far beyond simple state management for the Oracle UI.

Currently, `OracleStore` handles:

1.  **State Management:** Holds the chat messages, API keys, tiers, and loading states.
2.  **Cross-Tab Communication:** Manages a `BroadcastChannel` to sync state across browser tabs.
3.  **Persistence:** Directly interacts with IndexedDB (`getDB().transaction(...)`) to save and load chat history.
4.  **Undo/Redo System:** Implements an action stack and complex logic to revert actions (like deleting created entities or severing connections).
5.  **Intent Parsing & Regex:** Contains hardcoded regex patterns to detect intents (e.g., `detectImageIntent`, quoted argument parsing for commands).
6.  **Command Execution:** The monolithic `ask(query: string)` function handles standard chat as well as deep, nested execution paths for `/create`, `/connect`, `/merge`, `/plot`, and `/roll` commands.

## Refactoring Strategy: The "Controller & Services" Pattern

To fix this, we need to extract the heavy logic into domain-specific services and parsers, leaving `OracleStore` to act purely as a UI state controller.

### 1. Extract `ChatHistoryService` (Persistence & Sync)

Move all IndexedDB and BroadcastChannel logic out of the store.

- Create `src/lib/services/chat-history.ts`.
- It should expose methods like `loadHistory()`, `saveMessage(msg)`, `deleteMessage(id)`, and `clear()`.
- It should internally manage the `BroadcastChannel` to emit events when history changes, which `OracleStore` simply subscribes to.

### 2. Extract `OracleCommandParser` (Intent & Validation)

Remove all regex and string manipulation from the store.

- Create `src/lib/utils/oracle-parser.ts`.
- This utility should take a raw query string and return a structured intent object.
- Example: `parseQuery('/connect "A" to "B"')` returns `{ type: 'connect', source: 'A', label: 'to', target: 'B' }`.
- It should also handle the `detectImageIntent` logic.

### 3. Extract `OracleActionExecutor` (Command Execution)

Break down the massive `ask()` method. The execution of commands shouldn't live in the UI store.

- Create `src/lib/services/oracle-executor.ts`.
- Create dedicated handler functions for each command type: `handleCreate`, `handleConnect`, `handleMerge`, `handleRoll`.
- The `OracleStore.ask()` method will call the parser, then pass the parsed intent to the executor, and simply wait for the resulting `ChatMessage` to append to its state.

### 4. Extract `UndoRedoService`

The undo stack is currently mixed into the Oracle state.

- Move the `UndoableAction` type and the `undo()` execution logic into a dedicated service.
- The `OracleActionExecutor` will register compensating actions with this service as it performs operations (like creating an entity).

## Target Architecture

After refactoring, `oracle.svelte.ts` should be ~200-300 lines long, looking something like this:

```typescript
class OracleStore {
  messages = $state<ChatMessage[]>([]);
  // ... basic UI state ...

  constructor() {
    // Subscribe to external history changes
    chatHistoryService.onUpdate((msgs) => (this.messages = msgs));
  }

  async ask(query: string) {
    this.isLoading = true;
    try {
      const intent = OracleCommandParser.parse(query);
      const resultMessage = await OracleActionExecutor.execute(intent);
      await chatHistoryService.saveMessage(resultMessage);
    } finally {
      this.isLoading = false;
    }
  }

  async undo() {
    await UndoRedoService.undoLastAction();
  }
}
```

## Execution Plan

1. **Phase 1:** Create `ChatHistoryService` and migrate DB/Broadcast logic. (Safest first step).
2. **Phase 2:** Extract the regex and parsing logic into `OracleCommandParser`.
3. **Phase 3:** Create the `OracleActionExecutor` and migrate the individual command logic (`/roll`, `/create`, etc.) one by one out of the `ask()` method.
4. **Phase 4:** Migrate the Undo/Redo stack.
