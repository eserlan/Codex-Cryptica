# Tasks: P2P Host Service Decoupling

**Input**: Design documents from `/specs/098-p2p-host-service-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `research.md`

## Phase 1: Setup & Infrastructure (Shared)

**Purpose**: Initialize the directory structure and shared event types for the refactor.

- [x] T001 Create refactor directory structure in `apps/web/src/lib/cloud-bridge/p2p/`
- [x] T003 [P] Define `TransportEventType`, `P2PConnection`, and `TransportEvents` types in `apps/web/src/lib/cloud-bridge/p2p/transport/transport-interface.ts`

---

## Phase 2: Foundational - Transport Abstraction (P1)

**Goal**: Abstract the network layer (PeerJS) to enable testing and loose coupling.

### Tests for Transport Abstraction

- [x] T004 [P] Create mock transport for testing in `apps/web/src/lib/cloud-bridge/p2p/transport/mock-transport.ts`
- [x] T005 [P] Unit test for `PeerJSTransport` in `apps/web/src/lib/cloud-bridge/p2p/transport/peerjs-transport.test.ts`

### Implementation for Transport Abstraction

- [x] T006 [P] [US1] Define `P2PTransport` interface in `apps/web/src/lib/cloud-bridge/p2p/transport/transport-interface.ts`
- [x] T007 [P] [US1] Implement `PeerJSTransport` wrapper for PeerJS in `apps/web/src/lib/cloud-bridge/p2p/transport/peerjs-transport.ts`
- [x] T007b [US1] Implement 10-guest limit enforcement and rejection logic in `PeerJSTransport` (FR-006)
- [x] T008 [US1] Refactor `P2PHostService` to accept `P2PTransport` via constructor injection in `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`

**Checkpoint**: Host can start and listen using the new transport abstraction.

---

## Phase 3: Protocol Dispatcher (P2)

**Goal**: Implement the message routing layer to eliminate the giant if/else block.

### Tests for Protocol Dispatcher

- [x] T009 [P] Unit test for `P2PDispatcher` with mock handlers in `apps/web/src/lib/cloud-bridge/p2p/dispatcher/p2p-dispatcher.test.ts`

### Implementation for Protocol Dispatcher

- [x] T010 [P] [US2] Define `P2PMessageHandler` interface in `apps/web/src/lib/cloud-bridge/p2p/handlers/base-handler.ts`
- [x] T011 [P] [US2] Implement `P2PDispatcher` registry and router in `apps/web/src/lib/cloud-bridge/p2p/dispatcher/p2p-dispatcher.ts`
- [x] T012 [US2] Update `P2PHostService` to delegate incoming data events to the `P2PDispatcher` in `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`

---

## Phase 4: Action Handler Isolation (P3)

**Goal**: Extract domain logic (VTT, Vault, Files) into focused handlers.

### Tests for Action Handlers

- [x] T013 [P] Unit test for `VTTHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/vtt-handler.test.ts`
- [x] T014 [P] Unit test for `VaultHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/vault-handler.test.ts`
- [x] T015 [P] Unit test for `FileHandler` in `apps/web/src/lib/cloud-bridge/p2p/handlers/file-handler.test.ts`

### Implementation for Action Handlers

- [x] T016 [P] [US3] Extract VTT logic (Tokens, Pings, Measurements) into `apps/web/src/lib/cloud-bridge/p2p/handlers/vtt-handler.ts`
- [x] T017 [P] [US3] Extract Vault logic (Guest Join, Entity Update) into `apps/web/src/lib/cloud-bridge/p2p/handlers/vault-handler.ts`
- [x] T018 [P] [US3] Extract File logic (GET_FILE, Binary streaming) into `apps/web/src/lib/cloud-bridge/p2p/handlers/file-handler.ts`
- [x] T019 [US3] Finalize `P2PHostService` reduction to thin coordinator in `apps/web/src/lib/cloud-bridge/p2p/host-service.svelte.ts`
- [x] T019b [US3] Implement periodic state synchronization heartbeat in `P2PHostService` (FR-008)

**Checkpoint**: 1,100+ line monolith reduced to < 200 line facade.

---

## Phase 5: Agent Operational Protocol (P4)

**Goal**: Verify adherence to Constitution Rule XI.

- [x] T020 [US4] Perform a final audit of all refactored code against "Think First" and "Surgical Changes" rules.
- [x] T021 [US4] Verify all acceptance scenarios from `spec.md` are covered by tests.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T022 Implement standardized `TransportEvents` system for actionable errors (FR-009) in `apps/web/src/lib/cloud-bridge/p2p/transport/transport-events.ts`
- [x] T023 Final E2E verification of guest connectivity and map synchronization.
- [x] T024 Remove legacy `p2p-helpers.ts` if logic is fully migrated to handlers.
- [x] T025 Update `docs/refactoring/` with final architecture diagrams.
- [x] T026 Run coverage reports and verify `apps/web` P2P handlers meet 70% floor (Constitution Rule X)

## Implementation Strategy

1. **MVP (US1)**: First, establish the transport abstraction. This allows us to run the host in a "headless" test mode.
2. **Incremental Handlers**: Extract one handler at a time (e.g., VTT first as it's the most high-volume).
3. **Dispatcher Integration**: Once handlers are ready, swap the if/else block for the dispatcher.
4. **Final Polish**: Harden the error handling and binary streaming paths.
