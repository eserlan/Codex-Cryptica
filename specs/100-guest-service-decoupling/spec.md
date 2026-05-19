# Feature Specification: P2P Guest Service Decoupling

**Feature Branch**: `100-guest-service-decoupling`  
**Created**: 2026-05-18  
**Status**: Draft  
**Input**: Analysis of `apps/web/src/lib/cloud-bridge/p2p/guest-service.ts` (657 lines). Symmetric refactor mirroring Spec 098 (host-service decoupling).

## Clarifications

### Session 2026-05-18

Working assumptions (subject to clarification):

- Binary asset reassembly (chunked `FILE_RESPONSE`) is assumed to keep the same **16 KB chunk size and 15 s timeout** used today.
- Outbound token-move coalescing keeps its current **50 ms throttle** and 2-decimal precision rounding.
- Object URL lifecycle (map asset and fog masks) is assumed to remain owned by the guest, not delegated to a separate vault subsystem, but is extracted into a dedicated cache to prevent leaks.

Confirmed:

- Q: Transport interface — sibling, generalize, or unified with mode? → A: Sibling `P2PClientTransport`; reuse `P2PConnection` and transport-event types from host side. Host transport untouched.
- Q: Dispatcher and base-handler — share or duplicate? → A: Generalize and share — parameterize `P2PDispatcher` over a handler-context type and reuse `base-handler.ts`. Guest registers its own handler set.
- Q: Stale-connection gate — where does it live? → A: Transport filters at the source via an internal epoch; dispatcher and handlers see only current-connection events.
- Q: `MapAssetUrlCache` lifecycle scope? → A: Per-session instance — constructed when `connectToHost` succeeds, `revokeAll()` on `disconnect`. New session = new cache.
- Q: Snapshot decode failure — how should the Session handler react? → A: Log a warning and drop the message; keep current `mapSession` state intact. Next snapshot reconciles.

## User Scenarios & Testing

### User Story 1 - Guest Transport Abstraction (Priority: P1) 🎯 MVP

As a developer, I want the network transport (PeerJS client side) isolated from the guest logic so that I can swap or mock the transport without booting a real PeerJS peer.

**Why this priority**: foundational layer for all other refactoring; mirrors the host-side win from Spec 098.

**Independent Test**: Verify that the guest can complete a join handshake and receive inbound data using a mock `P2PClientTransport` implementation.

**Acceptance Scenarios**:

1. **Given** a new client transport instance, **When** the guest service initializes, **Then** it receives `open`, `data`, `close`, and `error` events via the transport interface — not via direct PeerJS callbacks.
2. **Given** a peer initialization error, **When** emitted by the transport, **Then** the guest service rejects the pending `connectToHost` promise without referencing PeerJS internals.
3. **Given** a 15 s timeout while connecting, **When** the timer elapses, **Then** the transport is told to disconnect and the join promise is rejected.

---

### User Story 2 - Protocol Dispatcher (Priority: P2)

As a developer, I want inbound P2P messages routed by a dedicated dispatcher so that the ~220-line `if/else` cascade in `connection.on("data", ...)` is eliminated and each message type has an isolated handler.

**Why this priority**: removes the largest code smell in `guest-service.ts` and gives each multiplayer feature an independently testable surface.

**Independent Test**: Send each supported message type (e.g., `TOKEN_ADDED`, `MAP_SYNC`, `GUEST_STATUS`) to the dispatcher with a mock handler set and assert that exactly one handler is invoked per message.

**Acceptance Scenarios**:

1. **Given** an incoming P2P message with a known `type`, **When** received by the dispatcher, **Then** it is routed to the registered handler for that type without traversing any other handlers.
2. **Given** a message that fails `isValidP2PMessage`, **When** received, **Then** it is rejected at the dispatcher boundary and no handler is invoked.
3. **Given** an unhandled message `type`, **When** received, **Then** the dispatcher logs a warning and does not crash the session.

---

### User Story 3 - Inbound Handler Isolation (Priority: P3)

As a developer, I want inbound message handling grouped into focused handlers (Vault, VTT, Map Asset, Presence, Session, Chat) so that I can maintain each multiplayer feature independently and write unit tests against handlers directly.

**Why this priority**: significantly improves readability and allows localized testing of complex flows like map asset sync and snapshot reconciliation.

**Independent Test**: Test `GuestVTTHandler` in isolation by feeding it a mock `TOKEN_ADDED` message and verifying it calls `mapSession.handleRemoteTokenAdded` with the correct payload, without instantiating a transport.

**Acceptance Scenarios**:

1. **Given** a `GRAPH_SYNC`, `ENTITY_UPDATE`, `ENTITY_BATCH_UPDATE`, `ENTITY_DELETE`, or `THEME_UPDATE` message, **When** dispatched, **Then** the **Vault handler** updates the corresponding stores or invokes the corresponding callback.
2. **Given** a `MAP_SYNC` or `MAP_FOG_SYNC` message containing binary blobs, **When** dispatched, **Then** the **Map Asset handler** creates Object URLs through a dedicated cache and revokes prior URLs to prevent leaks.
3. **Given** a `SESSION_SNAPSHOT` or `SESSION_SNAPSHOT_GZIP` message, **When** dispatched, **Then** the **Session handler** decodes and applies the snapshot via `mapSession.syncFromRemoteSession`.
4. **Given** any VTT real-time message (`TOKEN_ADDED`, `TOKEN_STATE_UPDATE`, `TOKEN_REMOVED`, `SHOW_TOKEN_IMAGE`, `TURN_ADVANCE`, `SET_MODE`, `SET_GRID_SETTINGS`, `MAP_PING`, `MAP_MEASUREMENT`, `FOG_REVEAL`), **When** dispatched, **Then** the **VTT handler** invokes the matching `mapSession.handleRemote*` method.
5. **Given** a `CHAT_MESSAGE` or `CHAT_CLEAR` message, **When** dispatched, **Then** the **Chat handler** forwards the payload to the chat surface on `mapSession`.
6. **Given** a `GUEST_STATUS` or `GUEST_JOIN_REJECTED` message, **When** dispatched, **Then** the **Presence handler** updates the guest roster, marks the join state, and (on rejection) tears the session down via the lifecycle facade.
7. **Given** a `SESSION_ENDED` message, **When** dispatched, **Then** the **Session handler** clears the local map session.

---

### User Story 4 - File Request Channel Extraction (Priority: P3)

As a developer, I want guest file requests (`GET_FILE` / `FILE_RESPONSE` chunked reassembly) handled by a dedicated request/response component so that the dispatcher does not see file traffic and the chunk reassembly logic is unit-testable.

**Why this priority**: file transfer uses a parallel request/response pattern (out-of-band of the normal dispatcher) and is the single largest method in the current service.

**Independent Test**: Drive a mock transport that emits a multi-chunk `FILE_RESPONSE` and verify the resulting `Blob` matches the expected concatenated bytes and MIME.

**Acceptance Scenarios**:

1. **Given** a `getFile(path)` call, **When** the host responds with a single chunk, **Then** the returned `Blob` is resolved with the correct MIME type.
2. **Given** an N-chunk response, **When** all chunks arrive in any order, **Then** the chunks are reassembled in index order and the resulting `Blob` is resolved.
3. **Given** a `getFile(path)` call, **When** no complete response arrives within 15 s, **Then** the promise rejects with a timeout error and all transport listeners are cleaned up.
4. **Given** a `FILE_RESPONSE` with `found: false`, **When** received, **Then** the promise rejects with "File not found on host" and all transport listeners are cleaned up.

---

### User Story 5 - Outbound Coordination Facade (Priority: P4)

As a developer, I want the guest service reduced to a thin lifecycle and outbound-coordination facade so that join/leave, presence updates, token-move throttling, and broadcaster wiring are the only top-level responsibilities.

**Why this priority**: this is the natural endpoint of the refactor — the file becomes small enough to read in one screen.

**Independent Test**: Verify that the post-refactor `P2PGuestService` exposes `connectToHost`, `disconnect`, `leaveSession`, `getFile`, `updateGuestStatus`, `requestTokenMove`, `requestTokenRemove`, `connected`, and `peerId` with unchanged behavior, while delegating all message processing.

**Acceptance Scenarios**:

1. **Given** a successful join, **When** `connectToHost` resolves, **Then** the service has wired the `mapSession` broadcaster, set `myPeerId`, and emitted `GUEST_JOIN` exactly once.
2. **Given** repeated `requestTokenMove` calls within 50 ms for the same token, **When** the throttle window elapses, **Then** exactly one `TOKEN_MOVE` message is sent reflecting the latest coordinates.
3. **Given** `updateGuestStatus` is called before the host accepts the join, **When** the host later sends the accepting `GUEST_STATUS`, **Then** the pending status is flushed exactly once.

---

### User Story 6 - Agent Operational Protocol (Priority: P4)

As a quality assurance engineer, I want the refactor to follow strict surgical guidelines so that no unrelated logic is touched and every phase is verified independently.

**Why this priority**: mandated by Constitution Rule XI; matches the protocol used in Specs 097–099.

**Acceptance Scenarios**:

1. **Given** a code change in any phase, **When** applied, **Then** it MUST be surgical, leave unrelated behavior untouched, and be verified with `pnpm test` before the next phase begins.

---

### Edge Cases

- **Stale connection events**: when a previous connection closes after a new one is established, late `open`/`data`/`close`/`error` callbacks for the stale connection MUST be dropped. After this refactor the responsibility lives in the transport (epoch-based), not in the dispatcher or handlers.
- **Object URL leaks**: a `MAP_SYNC` followed by another `MAP_SYNC` must revoke prior asset and fog URLs before creating new ones; a `disconnect` must revoke all outstanding URLs.
- **Join rejection mid-handshake**: when a `GUEST_JOIN_REJECTED` arrives, presence state, guest mode flags, vault status, and broadcaster registration must all be reset together — atomically from the user's perspective.
- **Snapshot decode failure**: if `decodeSessionSnapshot` throws or returns invalid data, the Session handler MUST log a warning and drop the message, leaving the existing `mapSession` state untouched. Recovery happens on the next snapshot.
- **Token-move flood**: if the user drags a token continuously for many seconds, memory usage from `pendingTokenMoves` / `lastSentTokenMoves` must remain bounded (current behavior: one entry per token).
- **Reconnect to same host**: `connectToHost` called twice with the same `hostId` while already connected must short-circuit without reinitializing peer state.

## Requirements

### Functional Requirements

- **FR-001**: System MUST define a `P2PClientTransport` interface — as a **sibling** to the existing host-side `P2PTransport` — that abstracts the PeerJS client connection lifecycle (peer creation, single outbound connection, open/data/close/error events, timeout, teardown). Lower-level types (`P2PConnection`, transport-event names) MUST be shared with the host side; the host transport interface MUST NOT be modified.
- **FR-002**: System MUST provide a concrete `PeerJsClientTransport` implementation and a `MockClientTransport` test double satisfying the interface.
- **FR-003**: System MUST route all inbound P2P messages through a dispatcher that validates messages via `isValidP2PMessage` before invoking any handler. The dispatcher MUST be the existing `P2PDispatcher` from Spec 098, generalized so that its handler-context type is a type parameter; if the dispatcher is not already generic, generalizing it is part of this refactor and the host-side registration MUST continue to work unchanged.
- **FR-004**: System MUST partition inbound message handling into the following handlers, each independently constructible and unit-testable:
  - **Vault Handler**: `GRAPH_SYNC`, `ENTITY_UPDATE`, `ENTITY_BATCH_UPDATE`, `ENTITY_DELETE`, `THEME_UPDATE`.
  - **Map Asset Handler**: `MAP_SYNC`, `MAP_FOG_SYNC` (including Object URL lifecycle).
  - **Session Handler**: `SESSION_SNAPSHOT`, `SESSION_SNAPSHOT_GZIP`, `SESSION_ENDED`.
  - **VTT Handler**: `TOKEN_ADDED`, `TOKEN_STATE_UPDATE`, `TOKEN_REMOVED`, `SHOW_TOKEN_IMAGE`, `TURN_ADVANCE`, `SET_MODE`, `SET_GRID_SETTINGS`, `MAP_PING`, `MAP_MEASUREMENT`, `FOG_REVEAL`.
  - **Chat Handler**: `CHAT_MESSAGE`, `CHAT_CLEAR`.
  - **Presence Handler**: `GUEST_STATUS`, `GUEST_JOIN_REJECTED`.
- **FR-005**: System MUST extract guest file-transfer (request/chunk-reassembly/timeout/cleanup) into a dedicated `GuestFileClient` that subscribes to the transport directly and does not flow through the main dispatcher.
- **FR-006**: System MUST extract Object URL lifecycle (map asset URL, fog mask URL) into a dedicated `MapAssetUrlCache` that exposes `setAsset`, `setFog`, and `revokeAll` operations and is owned by the Map Asset Handler. The cache MUST be a **per-session instance**: constructed when `connectToHost` succeeds and disposed via `revokeAll()` on `disconnect`. The same cache instance MUST NOT be reused across sessions.
- **FR-007**: System MUST reduce `guest-service.ts` to **under 200 lines** (≥ 70 % reduction), retaining only: construction, `connectToHost` orchestration, `disconnect` / `leaveSession`, outbound public API (`updateGuestStatus`, `requestTokenMove`, `requestTokenRemove`, `getFile`), and accessor getters (`connected`, `peerId`).
- **FR-008**: System MUST preserve the existing connection-gating invariant: callbacks for a stale `connection` reference MUST NOT mutate state belonging to a newer connection. This gate MUST be enforced by the transport itself (via an internal epoch incremented on each `connect()`); the dispatcher and handlers MUST NOT need to perform their own staleness checks.
- **FR-009**: System MUST preserve the existing outbound throttling behavior: at most one `TOKEN_MOVE` per token per 50 ms window, with 2-decimal-place rounding and deduplication against the last sent coordinates.
- **FR-010**: System MUST preserve the existing pending-status flush behavior: a `GUEST_STATUS` queued via `updateGuestStatus` before the host accepts the join MUST be sent exactly once on acceptance.
- **FR-011**: System MUST follow the project DI mandate (Rule VIII): the guest service constructor MUST accept the transport, dispatcher, handlers, and asset cache as injectable dependencies, with sensible defaults.
- **FR-012**: System MUST keep the singleton export (`p2pGuestService`) and `window.p2pGuestService` registration unchanged so that existing call sites are not affected.
- **FR-013**: System MUST keep the symmetric handler surface aligned with the host-side handlers from Spec 098 where the same message types exist on both sides (so future protocol-version migrations can be coordinated in one place).
- **FR-014**: System MUST reuse the existing `base-handler.ts` from Spec 098 as the contract for all guest handlers. If the base-handler is host-coupled in any way, that coupling MUST be lifted as part of this refactor without changing host-side handler signatures.
- **FR-015**: The Session handler MUST treat a snapshot decode failure (`SESSION_SNAPSHOT` / `SESSION_SNAPSHOT_GZIP`) as non-fatal: log a warning, drop the message, and leave existing `mapSession` state untouched. It MUST NOT tear the session down or rethrow.

### Key Entities

- **P2PClientTransport**: low-level network IO for the guest side — owns the PeerJS `peer` and a single outbound `connection`; exposes `connect(hostId)`, `send(message)`, `disconnect()`, and a typed event interface.
- **GuestProtocolDispatcher**: routes validated inbound messages to a registered handler keyed on `data.type`; rejects invalid messages and warns on unhandled types.
- **GuestMessageHandler** (base): contract for all inbound handlers; declares the set of `data.type` values it accepts and an `async handle(message, context)` method.
- **MapAssetUrlCache**: owns Object URL lifecycle for the active map asset and fog mask; per-session instance; guarantees prior URLs are revoked before new ones are issued, and that all URLs are revoked on session disconnect.
- **GuestFileClient**: handles the `GET_FILE` request/response pattern with chunked reassembly, per-request timeout, and listener cleanup; operates against the transport directly, not through the dispatcher.
- **GuestSessionContext**: ambient dependencies (stores, callbacks supplied by `connectToHost`) injected into handlers; centralizes the lazy store imports currently scattered across the file.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `guest-service.ts` line count reduced by **≥ 70 %** (from 657 to ≤ 200 lines).
- **SC-002**: Each new component (transport, dispatcher, every handler, asset cache, file client) has a dedicated unit test file with **≥ 90 % statement coverage** of its public API.
- **SC-003**: Zero regressions in the end-to-end guest journey (join → receive snapshot → token interaction → chat → file fetch → leave), verified via existing P2P E2E tests plus one new test that exercises the rejection path.
- **SC-004**: Inbound message dispatch (excluding async store I/O) completes in **≤ 1 ms per message** on a baseline laptop, matching pre-refactor measurements within ±10 %.
- **SC-005**: Object URL leaks are eliminated: after a session disconnect, **zero** outstanding map-asset or fog Object URLs remain (verified via a leak test that asserts `URL.revokeObjectURL` is called for every `URL.createObjectURL`).
- **SC-006**: After the refactor, adding a new inbound message type requires changes to **exactly one handler file and one registration line** (no edits to `guest-service.ts` itself).
