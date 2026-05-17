# Tasks: P2P Host Service Decoupling

**Input**: Design documents from `/specs/098-p2p-host-service-decoupling/`
**Prerequisites**: `plan.md`, `spec.md`

## Phase 1: Infrastructure & Transport (P1)

**Goal**: Abstract the network layer.

- [ ] T001 Define `P2PTransport` interface in `transport/transport-interface.ts`
- [ ] T002 Implement `PeerJSTransport` in `transport/peerjs-transport.ts`
- [ ] T003 [P] Unit test for `PeerJSTransport` (mocking PeerJS)
- [ ] T004 Refactor `P2PHostService` to use `P2PTransport` via constructor injection

---

## Phase 2: Dispatcher & Handlers (P2)

**Goal**: Break the giant routing block.

- [ ] T005 Define `P2PMessageHandler` interface in `handlers/base-handler.ts`
- [ ] T006 Implement `P2PDispatcher` in `dispatcher/p2p-dispatcher.ts`
- [ ] T007 [P] Unit test for `P2PDispatcher` with mock handlers
- [ ] T008 Extract `VTTHandler` (/tokens, /pings, /turns) in `handlers/vtt-handler.ts`
- [ ] T009 Extract `VaultHandler` (/guest-join, /entity-update) in `handlers/vault-handler.ts`
- [ ] T010 Extract `FileHandler` (/get-file) in `handlers/file-handler.ts`

---

## Phase 3: Integration & Polish (P3)

**Goal**: Final monolith reduction and verification.

- [ ] T011 [P] Unit tests for all action handlers
- [ ] T012 Finalize `P2PHostService` reduction (Target: < 200 LOC)
- [ ] T013 [US4] Audit code against Agent Operational Protocol (Rule XI)
- [ ] T014 Run full P2P integration test suite to verify guest connectivity parity
- [ ] T015 Final cleanup of `docs/refactoring/`
