# Tasks: Unified PeerJS Connection Manager

**Input**: Design documents from `/specs/104-peerjs-connection-manager/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create directory structure for the connection manager tests in `apps/web/src/lib/cloud-bridge/p2p/tests/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core interfaces and types setup

- [ ] T002 Define TypeScript interfaces (`ConnectionState`, `PeerJSMessage`) in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`

---

## Phase 3: User Story 1 - Peer Connection Lifecycle Management (Priority: P1) 🎯 MVP

**Goal**: Host opens a session, guest connects, handshake state is verified and tracked centrally.

**Independent Test**: Spin up a mock host and guest in Vitest, and assert transitions through `connecting`, `handshaking`, and `connected`.

### Tests for User Story 1

- [ ] T003 Write failing tests for basic host starting and guest connection handshake transitions in `apps/web/src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts`

### Implementation for User Story 1

- [ ] T004 Implement Peer initialization and local/remote Peer ID tracking in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T005 Implement `startHost()` and `connect()` methods in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T006 Implement Svelte 5 Rune-based connection state tracking (`status` transitions) in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T007 Implement handshake schema validation and custom message handlers registration (`onMessage`) in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Graceful Disconnection Recovery (Priority: P2)

**Goal**: Automatic reconnection retry loop with exponential backoff up to 3 times on connection dropouts.

**Independent Test**: Simulate dropouts and assert state transitions into `reconnecting` and eventually `failed` when max retries are exhausted.

### Tests for User Story 2

- [ ] T008 [P] Write failing tests for exponential backoff timing and retry limit boundaries in `apps/web/src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts`

### Implementation for User Story 2

- [ ] T009 Implement exponential backoff timing registry in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T010 Implement the reconnection retry loop inside `PeerJSConnectionManager` in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T011 Handle transition to `failed` state and graceful cleanup of resources when retries exhaust in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Visual Connection Health & State Indicators (Priority: P3)

**Goal**: Active ping-pong heartbeats every 10 seconds to measure rolling average latency (RTT) and drive status badges.

**Independent Test**: Spin up the heartbeat loop, mock responses, and verify `latencyMs` is updated.

### Tests for User Story 3

- [ ] T012 [P] Write failing tests for active ping-pong heartbeat and RTT latency calculation in `apps/web/src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts`

### Implementation for User Story 3

- [ ] T013 Implement the periodic ping-pong heartbeat scheduler (10s intervals) in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T014 Implement round-trip-time (RTT) calculation and update the reactive `latencyMs` rune in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Resource cleanup and integration checks.

- [ ] T015 Implement detailed teardown logic `disconnect()` to destroy peers, clear timeouts, and reset state in `apps/web/src/lib/cloud-bridge/p2p/connection-manager.svelte.ts`
- [ ] T016 Run full test suite and confirm 100% pass rate in `apps/web/src/lib/cloud-bridge/p2p/tests/connection-manager.test.ts`
- [x] T017 Register user-facing guide/help description in `apps/web/src/lib/config/help-content.ts` (Core Principle VII)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - Blocks all User Stories.
- **User Stories (Phases 3-5)**: Depend on Phase 2.
  - Sequenced in order of priority (P1 ➔ P2 ➔ P3).
- **Polish (Phase 6)**: Depends on completion of all stories.

### Parallel Opportunities

- Task T008, T012 can run in parallel since they reside inside separate test suite hooks.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational blocks (Phase 1 & Phase 2).
2. Code and test the P1 Lifecycle handling (Phase 3).
3. Validate and confirm WebRTC signals function locally.
