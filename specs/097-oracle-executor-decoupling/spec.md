# Feature Specification: Oracle Executor Decoupling

**Feature Branch**: `refactor/oracle-executor-monolith`  
**Created**: 2026-05-17  
**Status**: In Progress  
**Input**: Analysis of `packages/oracle-engine/src/oracle-executor.ts` (1,135 lines)

## User Scenarios & Testing

### User Story 1 - Simple Command Modularization (Priority: P1) 🎯 MVP

As a developer, I want to see simple slash commands (like /roll, /help, /clear) handled by specialized classes so that I can verify the Command Pattern with low-risk logic.

**Why this priority**: Crucial for establishing the infrastructure and pattern without risking core AI or data logic.

**Independent Test**: Verify that `/roll` continues to work through the new `DiceExecutor` while the old implementation is removed.

**Acceptance Scenarios**:

1. **Given** a parsed `/roll` intent, **When** the `OracleActionExecutor` receives it, **Then** it delegates execution to an isolated `DiceExecutor`.
2. **Given** a `/help` or `/clear` intent, **When** received, **Then** it is handled by a stateless `MetaExecutor`.

---

### User Story 2 - Mutation Command Decoupling (Priority: P2)

As a developer, I want complex mutation commands (/create, /connect, /merge) extracted into handlers that receive dependencies via DI so that I can test vault modifications in isolation.

**Why this priority**: Modularizes the highest-risk data operations and simplifies the dispatcher's dependency bag.

**Independent Test**: Use a unit test for `CreateExecutor` with a mocked Vault to verify entity creation without a full browser environment.

**Acceptance Scenarios**:

1. **Given** a `/create` command, **When** executed, **Then** the `CreateExecutor` uses its injected `VaultService` to perform the operation.
2. **Given** a `/merge` command, **When** executed, **Then** it coordinates between the vault and AI services via injected interfaces.

---

### User Story 3 - AI Orchestration Extraction (Priority: P3)

As a system architect, I want the core AI chat and regeneration logic extracted into an orchestration handler so that the complex multi-step generation pipeline is manageable.

**Why this priority**: Tackles the largest block of code (600+ lines) and enables advanced AI unit testing.

**Independent Test**: Verify that `ChatExecutor` can handle a full conversation flow, including "thinking" states and "discovery" triggers, using mocked generators.

**Acceptance Scenarios**:

1. **Given** a standard chat query, **When** processed, **Then** the `ChatExecutor` manages the generation, parsing, and eventual response emission.
2. **Given** a regeneration request, **When** triggered, **Then** the `RegenerateExecutor` handles the draft proposal and reconciliation flow.

---

### User Story 4 - Event-Driven Side Effects (Priority: P4)

As a system architect, I want all side effects (logging, notifications) to be handled via the App Event Bus so that the execution logic is decoupled from UI services.

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
