# Research & Technical Decisions: Oracle Store Refactor

## Analyzed "God File": `apps/web/src/lib/stores/oracle.svelte.ts` (1,485 lines)

### 1. BroadcastChannel Sync Logic

- **Channel Name**: `codex-oracle-sync`
- **Messages**:
  - `SYNC_STATE`: Syncs `messages`, `lastUpdated`, `isLoading`, `isUndoing`, `apiKey`, `tier`, `activeStyleTitle`.
  - `REQUEST_STATE`: Triggered on tab load to request state from existing tabs.
  - `UNDO_PERFORMED`: Broadcasted when an undo action is completed to update UI states in other tabs.
- **Decision**: Move this logic to `ChatHistoryService`. The service will manage both the persistence (IndexedDB) and the cross-tab synchronization.

### 2. Command Parsing Regex & Intent Detection

- **Trigger Detection**: `detectImageIntent` uses a complex combination of keyword arrays (`imageNouns`, `verbs`) and regex patterns (e.g., `/\bportrait of\b/`).
- **Slash Commands**:
  - `/create`: `/\/create\s+"([^"]+)"(?:\s+as\s+("([^"]+)"|(\w+)))?/i`
  - `/connect`: `/\/connect\s+"([^"]+)"\s+(.+?)\s+"([^"]+)"/i`
  - `/merge`: `/\/merge\s+"([^"]+)"\s+into\s+"([^"]+)"/i`
  - `/plot`: `query.replace(/^\/plot\s*/i, "").trim()`
  - `/roll`: `query.slice(5).trim()`
- **Decision**: Encapsulate all parsing into `OracleCommandParser`. This will return a strongly-typed `OracleIntent` object.

### 3. Undo/Redo Stack

- **Current State**: `undoStack = $state<UndoableAction[]>([]);` limited to 50 actions.
- **Actions**: Stores `revert: () => Promise<void>` closures.
- **Decision**: Move to `UndoRedoService`. This service will manage the stack and provide a clean `undo()` method that the `OracleStore` can call.

### 4. Action Execution

- **Complexity**: The `ask()` method contains mixed logic for vault operations, AI service calls, and UI state updates.
- **Decision**: `OracleActionExecutor` will handle the business logic of executing an `OracleIntent`. It will take the intent and necessary dependencies (vault, aiService) as input.

## Technical Decisions

### 1. Svelte 5 Reactive Services (`.svelte.ts`)

- **Decision**: Extract `ChatHistoryService` and `UndoRedoService` as classes inside `.svelte.ts` files.
- **Rationale**: These services need to maintain reactive arrays (e.g., `messages = $state<ChatMessage[]>([])`) that the `OracleStore` UI controller can subscribe to.

### 2. Pure Utility Parser

- **Decision**: `OracleCommandParser` will be a pure TypeScript utility class/set of functions.
- **Rationale**: Highly testable, no side effects, no dependency on Svelte runes.

### 3. Dependency Injection for Executor

- **Decision**: The `OracleActionExecutor` will be a service class that receives the `vault` and `aiService` singletons.
- **Rationale**: Facilitates unit testing by allowing mocked stores.
