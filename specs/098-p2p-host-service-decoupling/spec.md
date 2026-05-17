# Feature Specification: P2P Host Service Decoupling

**Feature Branch**: `098-p2p-host-service-decoupling`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: Analysis of `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts` (918 lines)

## User Scenarios & Testing

### User Story 1 - Transport Abstraction (Priority: P1) 🎯 MVP

As a developer, I want the network transport (PeerJS) isolated from the host logic so that I can swap or mock the transport layer without breaking the application.

**Why this priority**: foundational layer for all other refactorings.

**Independent Test**: Verify that the host can still start and listen for connections using a mock `P2PTransport` implementation.

**Acceptance Scenarios**:

1. **Given** a new transport instance, **When** the host service initializes, **Then** it receives connection and data events via the transport interface.
2. **Given** a network error, **When** emitted by the transport, **Then** the host service handles it gracefully without direct PeerJS coupling.

---

### User Story 2 - Protocol Dispatcher (Priority: P2)

As a developer, I want P2P messages routed by a dedicated dispatcher so that the giant `if/else` block is eliminated and message handling is isolated.

**Why this priority**: Resolves the most significant code smell and reduces the risk of protocol-wide crashes.

**Independent Test**: Send a mock `TOKEN_MOVE` message and verify it reaches the correct handler without passing through the host service's main loop.

**Acceptance Scenarios**:

1. **Given** an incoming P2P message, **When** received by the dispatcher, **Then** it is routed to a specialized action handler based on its `type`.
2. **Given** an invalid message, **When** received, **Then** it is rejected by the dispatcher before reaching any business logic.

---

### User Story 3 - Action Handler Isolation (Priority: P3)

As a developer, I want specific domain logic (VTT, Vault, Files) moved into focused handlers so that I can maintain each multiplayer feature independently.

**Why this priority**: Significantly improves readability and allows for localized testing of complex features like file streaming.

**Independent Test**: Test the `FileHandler` in isolation by mocking a file request and verifying the OPFS read and connection send calls.

**Acceptance Scenarios**:

1. **Given** a `GET_FILE` request, **When** processed by the `FileHandler`, **Then** it fetches the correct blob from the vault and sends it to the guest.
2. **Given** a `TOKEN_ADD` request, **When** processed by the `VTTHandler`, **Then** it correctly updates the `mapSession` store.

---

### User Story 4 - Agent Operational Protocol (Priority: P4)

As a quality assurance engineer, I want the refactor to follow strict surgical guidelines so that no unrelated logic is touched and all changes are verified.

**Why this priority**: mandated by Constitution Rule XI.

**Acceptance Scenarios**:

1. **Given** a code change, **When** applied, **Then** it MUST be surgical and verified with tests before moving to the next task.

## Requirements

### Functional Requirements

- **FR-001**: System MUST abstract PeerJS behind a `P2PTransport` interface.
- **FR-002**: System MUST utilize a Message Dispatcher to route incoming protocol messages.
- **FR-003**: System MUST extract VTT, Vault, and File logic into isolated Action Handlers.
- **FR-004**: System MUST reduce `host-service.svelte.ts` to under 200 lines.
- **FR-005**: All new components MUST follow the project's DI mandate (Rule VIII).

## Success Criteria

### Measurable Outcomes

- **SC-001**: `host-service.svelte.ts` line count reduced by > 75%.
- **SC-002**: 100% unit test coverage for new handlers and dispatcher.
- **SC-003**: Zero regressions in guest joining or session synchronization (verified via E2E tests).
