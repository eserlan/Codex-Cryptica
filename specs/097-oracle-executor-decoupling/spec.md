# Feature Specification: Oracle Executor Decoupling

**Feature Branch**: `refactor/oracle-executor-monolith`  
**Created**: 2026-05-17  
**Status**: In Progress  
**Input**: Analysis of `packages/oracle-engine/src/oracle-executor.ts` (1,135 lines)

## User Scenarios & Testing

### User Story 1 - Command Modularization (Priority: P1) 🎯 MVP

As a developer, I want to see slash commands handled by specialized classes so that I can modify or add new commands without touching a 1,100-line monolith.

**Why this priority**: Crucial for system stability and preventing the "God Object" from growing further.

**Independent Test**: Can be tested by verifying that `/roll` continues to work through the new `DiceExecutor` while the old implementation is removed.

**Acceptance Scenarios**:

1. **Given** a parsed `/roll` intent, **When** the `OracleActionExecutor` receives it, **Then** it delegates execution to an isolated `DiceExecutor`.
2. **Given** a system command execution, **When** dependencies are needed, **Then** they are provided via constructor injection instead of global lookups.

---

### User Story 2 - Event-Driven Side Effects (Priority: P2)

As a system architect, I want execution side effects (like logging and notifications) to be handled via the App Event Bus so that the execution logic is decoupled from UI and storage services.

**Why this priority**: Reduces "Callback Bloat" in the execution context and improves system observability.

**Independent Test**: Verify that `ORACLE:ENTITY_CREATED` is emitted after a successful `/create` command and is picked up by the activity logger.

**Acceptance Scenarios**:

1. **Given** a successful command execution, **When** the command completes, **Then** an `ORACLE:COMMAND_COMPLETED` event is emitted.
2. **Given** a failed command execution, **When** an error occurs, **Then** an `ORACLE:COMMAND_FAILED` event is emitted with the error details.

---

### User Story 3 - Comprehensive Unit Testing (Priority: P3)

As a quality assurance engineer, I want every command handler to have its own unit test suite so that regressions can be identified instantly without running the entire Oracle integration.

**Why this priority**: Ensures long-term maintainability and allows for safe refactoring of individual handlers.

**Independent Test**: Running `vitest` on a single executor (e.g., `DiceExecutor.test.ts`) should provide full coverage of that command's logic.

**Acceptance Scenarios**:

1. **Given** a new command handler, **When** it is implemented, **Then** it MUST have a corresponding test file with 100% logic coverage.

### Edge Cases

- **Circular Dependencies**: Handling cases where an executor might need to trigger another command (e.g., auto-reconciliation triggering entity creation).
- **Execution Context Lifecycle**: Ensuring `$state.snapshot` is applied correctly at the dispatcher level to prevent stale proxy data in async handlers.
- **Permission Leakage**: ensuring guest restrictions and Fog of War are enforced identically across all extracted handlers.

## Requirements

### Functional Requirements

- **FR-001**: System MUST utilize a Command Pattern to route `OracleIntent` to specialized `OracleCommandExecutor` implementations.
- **FR-002**: System MUST inject all required services (Vault, Generator, EventBus) via constructors with sensible defaults.
- **FR-003**: System MUST emit domain-specific events (`ORACLE:*`) for all major execution state transitions.
- **FR-004**: System MUST preserve existing guest-mode restrictions and Fog of War visibility checks in all handlers.
- **FR-005**: System MUST reduce the `OracleActionExecutor.ts` file to under 300 lines by the end of the refactor.

### Key Entities

- **OracleCommandExecutor**: Interface for all specialized handlers.
- **OracleExecutionContext**: The state and service bag passed to executors.
- **AppEventBus**: The centralized hub for side-effect signaling.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of slash commands extracted from the main monolith.
- **SC-002**: `OracleActionExecutor.ts` line count reduced by at least 70%.
- **SC-003**: 100% unit test pass rate for all new specialized executors.
- **SC-004**: Zero regressions in guest-mode privacy or Fog of War enforcement (verified via existing integration tests).
