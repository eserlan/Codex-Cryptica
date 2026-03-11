# Feature Specification: Oracle Store Refactor

**Feature Branch**: `067-oracle-store-refactor`  
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

As a user, I want the "Undo" and "Redo" buttons in the Oracle chat to reliably reverse and re-apply actions (like creating an entity or adding a connection), so that I can easily fix mistakes or change my mind.

**Why this priority**: Undo/Redo is a critical safety net. The refactoring involves moving the undo/redo stack to a new service, which poses a high risk of breaking this specific feature.

**Independent Test**: Can be fully tested by creating an entity via chat, clicking the undo button, verifying removal, then clicking redo and verifying the entity reappears.

**Acceptance Scenarios**:

1. **Given** the Oracle just successfully executed a `/create "Goblin"` command, **When** the user clicks "Undo", **Then** the "Goblin" entity is removed from the VaultStore and the graph updates.
2. **Given** the user just undid a `/create "Goblin"` command, **When** the user clicks "Redo", **Then** the "Goblin" entity is restored to the VaultStore and the graph updates.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST preserve all existing Oracle chat functionality without behavioral changes.
- **FR-002**: System MUST isolate IndexedDB and `BroadcastChannel` logic into a `ChatHistoryService`.
- **FR-003**: System MUST isolate regex and intent parsing into an `OracleCommandParser`.
- **FR-004**: System MUST isolate command execution logic (`ask` method switch statements) into an `OracleActionExecutor`.
- **FR-005**: System MUST isolate AI prompt construction and generation orchestration into an `OracleGenerator`.
- **FR-006**: System MUST isolate the undo/redo stack into an `UndoRedoService`.
- **FR-007**: System MUST isolate API key resolution, tier management, and environment variable fallbacks into an `OracleSettingsService`.
- **FR-008**: System MUST isolate domain-specific message mutations (wizards, entity updates) into `ChatHistoryService`.
- **FR-009**: The `OracleStore` class MUST be reduced to under 150 lines of code, serving purely as a thin UI orchestration layer.

### Key Entities

- **ChatHistoryService**: Manages loading, saving, and syncing `ChatMessage` arrays, including domain mutations like wizard initialization.
- **OracleSettingsService**: Centralizes API key resolution, tier persistence, and cross-tab settings synchronization.
- **OracleCommandParser**: Transforms raw strings into structured intent objects.
- **OracleActionExecutor**: Consumes intent objects and executes them against the `VaultStore` or AI logic.
- **OracleGenerator**: Orchestrates prompt expansion, RAG context retrieval, and direct `AIService` interaction.
- **UndoRedoService**: Manages the stacks of `UndoableAction` objects.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of existing unit tests for the Oracle features continue to pass without changing the underlying business logic.
- **SC-002**: All new services (`ChatHistoryService`, `OracleCommandParser`, `OracleActionExecutor`, `UndoRedoService`) are independently unit-testable without requiring a DOM or complex UI state mocking.
