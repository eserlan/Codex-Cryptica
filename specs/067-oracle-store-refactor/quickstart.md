# Quickstart: Implementing the Oracle Store Refactor

## Prerequisites

- [ ] Read the [Feature Spec](./spec.md) and [Implementation Plan](./plan.md).
- [ ] Familiarize yourself with the existing `OracleStore` in `apps/web/src/lib/stores/oracle.svelte.ts`.
- [ ] Understand Svelte 5 Runes ($state, $derived, $effect).

## Steps

### 1. Extract Pure Logic to `OracleCommandParser`

- **Location**: `packages/oracle-engine/src/oracle-parser.ts`
- **Task**: Move all regex and intent detection logic.
- **Verification**: Write unit tests in `oracle-parser.test.ts` to verify every slash command and image intent detection.

### 2. Implement `ChatHistoryService`

- **Location**: `packages/oracle-engine/src/chat-history.svelte.ts`
- **Task**: Handle IndexedDB persistence and `BroadcastChannel` syncing.
- **Verification**: Verify that messages are synced across two tabs when one tab adds a message.

### 3. Implement `UndoRedoService`

- **Location**: `packages/oracle-engine/src/undo-redo.svelte.ts`
- **Task**: Manage the `undoStack` and the `undo()` execution.
- **Verification**: Unit tests to verify stack size limits (50 actions) and successful/failed undos.

### 4. Implement `OracleActionExecutor`

- **Location**: `packages/oracle-engine/src/oracle-executor.ts`
- **Task**: Extract the `ask()` method logic. This is the most complex step.
- **Strategy**: Break down the execution of each `OracleIntent` into private methods (`executeRoll`, `executeCreate`, etc.).

### 5. Refactor `OracleStore`

- **Location**: `apps/web/src/lib/stores/oracle.svelte.ts`
- **Task**: Replace internal logic with calls to the new services from `@codex/oracle-engine`. It should now be a thin controller.
- **Verification**: Run existing `oracle.test.ts` and E2E tests.

## Key Files to Touch

- `apps/web/src/lib/stores/oracle.svelte.ts` (Refactored)
- `packages/oracle-engine/src/*` (New Package)
