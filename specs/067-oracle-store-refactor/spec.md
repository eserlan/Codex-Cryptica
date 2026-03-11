# Feature Specification: Oracle Store Refactor

**Feature Branch**: `refactor/oracle-store-god-file`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Refactor the Oracle Store God File into smaller modular services."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Uninterrupted Chat Experience (Priority: P1)

As a user, I want the Oracle chat to function exactly as it did before, so that my workflow of interacting with the AI remains seamless and unbroken.

**Why this priority**: The core functionality of the Oracle must not regress during this massive under-the-hood structural change.

**Independent Test**: Can be fully tested by submitting standard chat messages, using `/roll`, `/create`, `/connect`, and `/merge` commands, and verifying that the responses and actions occur as expected.

**Acceptance Scenarios**:

1. **Given** an active vault and a valid Gemini API key, **When** the user types `/roll 2d6`, **Then** the dice roll UI appears in the chat and the outcome is logged.
2. **Given** an active vault, **When** the user types a command like `/create "New Hero"`, **Then** the entity is successfully added to the graph and the chat responds affirmatively.

---

### User Story 2 - Reliable Undo/Redo System (Priority: P2)

As a user, I want the "Undo" button in the Oracle chat to reliably reverse actions (like creating an entity or adding a connection), so that I can easily fix mistakes made by me or the AI.

**Why this priority**: Undo is a critical safety net. The refactoring involves moving the undo stack to a new service, which poses a high risk of breaking this specific feature.

**Independent Test**: Can be fully tested by creating an entity via chat, then clicking the undo button in the chat UI, and verifying the entity is removed from the graph.

**Acceptance Scenarios**:

1. **Given** the Oracle just successfully executed a `/create "Goblin"` command, **When** the user clicks "Undo", **Then** the "Goblin" entity is removed from the VaultStore and the graph updates.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST preserve all existing Oracle chat functionality without behavioral changes.
- **FR-002**: System MUST isolate IndexedDB and `BroadcastChannel` logic into a `ChatHistoryService`.
- **FR-003**: System MUST isolate regex and intent parsing into an `OracleCommandParser`.
- **FR-004**: System MUST isolate command execution logic (`ask` method switch statements) into an `OracleActionExecutor`.
- **FR-005**: System MUST isolate the undo/redo stack into an `UndoRedoService`.
- **FR-006**: The `OracleStore` class MUST be reduced to under 400 lines of code, functioning primarily as a UI state controller.

### Key Entities

- **ChatHistoryService**: Manages loading, saving, and syncing `ChatMessage` arrays across tabs.
- **OracleCommandParser**: Transforms raw strings into structured intent objects (e.g., `{ type: 'roll', formula: '1d20' }`).
- **OracleActionExecutor**: Consumes intent objects and executes them against the `VaultStore` or `AIService`.
- **UndoRedoService**: Manages the stack of `UndoableAction` closures.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `apps/web/src/lib/stores/oracle.svelte.ts` is reduced from 1,484 lines to fewer than 400 lines.
- **SC-002**: 100% of existing unit tests for the Oracle features continue to pass without changing the underlying business logic.
- **SC-003**: All new services (`ChatHistoryService`, `OracleCommandParser`, `OracleActionExecutor`, `UndoRedoService`) are independently unit-testable without requiring a DOM or complex UI state mocking.
