# Feature Specification: Oracle Executor Decoupling

**Feature Branch**: `refactor/oracle-executor-monolith`  
**Created**: 2026-05-17  
**Status**: In Progress  
**Input**: Analysis of `packages/oracle-engine/src/oracle-executor.ts` (1,135 lines)

## User Scenarios & Testing

### User Story 1 - Simple Command Modularization (Priority: P1) 🎯 MVP

As a developer, I want to see simple slash commands (like /roll, /help, /clear) handled by specialized classes so that I can verify the Command Pattern with low-risk logic.

**Why this priority**: Establish the architectural pattern and DI infrastructure using low-complexity commands.

**Independent Test**: Verify that `/roll` continues to work through the new `DiceExecutor` while the old implementation is removed.

**Acceptance Scenarios**:

1. **Given** a parsed `/roll` intent, **When** the `OracleActionExecutor` receives it, **Then** it delegates execution to an isolated `DiceExecutor`.
2. **Given** a `/help` or `/clear` intent, **When** received, **Then** it is handled by a stateless `MetaExecutor`.

---

### User Story 2 - Event-Driven Side Effects (Priority: P2)

As a system architect, I want execution side effects (like logging and notifications) to be handled via the App Event Bus so that the execution logic is decoupled from UI and storage services.

**Why this priority**: Essential foundation for mutation commands (US3) to signal success/failure without tight coupling.

**Independent Test**: Verify that `ORACLE:ENTITY_CREATED` is emitted after a successful `/create` command.

**Acceptance Scenarios**:

1. **Given** a successful command execution, **When** it completes, **Then** an `ORACLE:COMMAND_COMPLETED` event is emitted.
2. **Given** a failed command execution, **When** an error occurs, **Then** an `ORACLE:COMMAND_FAILED` event is emitted with the error details.

---

### User Story 3 - Mutation & Visualization Decoupling (Priority: P3)

As a developer, I want complex mutation commands (/create, /connect, /merge) and visualization actions (drawEntity, drawMessage) extracted into handlers that receive dependencies via DI so that I can test data operations and generation in isolation.

**Why this priority**: Modularizes high-risk data and media operations and simplifies the dispatcher's dependency bag.

**Independent Test**: Use a unit test for `VisualizationExecutor` with a mocked Generator to verify image metadata updates without a full Oracle integration.

**Acceptance Scenarios**:

1. **Given** a `/create` command, **When** executed, **Then** the `CreateExecutor` uses its injected `VaultService` to perform the operation.
2. **Given** a request to draw an entity, **When** processed, **Then** the `VisualizationExecutor` handles the generation and vault update via injected services.

---

### User Story 4 - AI Orchestration Extraction (Priority: P4)

As a system architect, I want the core AI chat and regeneration logic extracted into an orchestration handler so that the complex multi-step generation pipeline is manageable.

**Why this priority**: Tackles the largest code block (600+ lines) after the architectural foundations are solid.

**Independent Test**: Verify that `ChatExecutor` can handle a full conversation flow using mocked generators.

**Acceptance Scenarios**:

1. **Given** a standard chat query, **When** processed, **Then** the `ChatExecutor` manages the generation, parsing, and eventual response emission.

---

### User Story 5 - Comprehensive Unit Testing (Priority: P5)

As a quality assurance engineer, I want every command handler to have its own unit test suite so that regressions can be identified instantly.

**Why this priority**: Ensures long-term maintainability and satisfies Constitution Rule X (70% coverage).

**Independent Test**: Running `vitest` on a single executor provides 100% logic coverage of that command.

**Acceptance Scenarios**:

1. **Given** a new command handler, **When** it is implemented, **Then** it MUST have a corresponding test file with 100% logic coverage.

### Edge Cases

- **Circular Dependencies**: Handling cases where an executor might need to trigger another command (e.g., auto-reconciliation triggering entity creation).
- **Execution Context Lifecycle**: Ensuring `$state.snapshot` is applied correctly at the dispatcher level to prevent stale proxy data in async handlers.
- **Permission Leakage**: ensuring guest restrictions and Fog of War are enforced identically across all extracted handlers.

## Requirements

### Functional Requirements

- **FR-001**: System MUST utilize a Command Pattern to route `OracleIntent` to specialized `OracleCommandExecutor` implementations.
- **FR-002**: System MUST inject all required services (Vault, Generator, EventBus) via constructors. Defaults MUST be restricted to `null` or engine-internal mocks to maintain package purity.
- **FR-003**: System MUST emit domain-specific events (`ORACLE:*`) for all major execution state transitions.
- **FR-004**: System MUST preserve existing guest-mode restrictions and Fog of War visibility checks in all handlers.
- **FR-005**: System MUST reduce the `OracleActionExecutor.ts` file to under 300 lines by the end of the refactor.
- **FR-006**: Implementing AI agents MUST strictly follow **Constitution Rule XI (Agent Operational Protocol)**: Think First, Simple Solutions, Surgical Changes, and Verify Everything.

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
