# SPEC-105: P2P Transport Integration

**Feature Branch**: `105-p2p-transport-integration`  
**Created**: 2026-05-20  
**Status**: Completed

---

## 1. Goal & Context

The goal of SPEC-105 is to integrate the rune-reactive `PeerJSConnectionManager` class (from SPEC-104) into the existing Host and Guest services (`P2PHostService` and `P2PGuestService`). This integration will replace the legacy, ad-hoc, and overlapping PeerJS connection logic with a robust, unified connection lifecycle manager.

By doing so, we ensure that:

1. Low-level connection handling, handshake negotiation, heartbeat ping-pong, latency calculation, and reconnection backoff are delegated entirely to `PeerJSConnectionManager`.
2. Both services benefit from robust automatic reconnection, zero-leak cleanups, and standard schema-validated handshakes.
3. The Svelte 5 rune-reactive state of the connection manager is cleanly propagated up to the global UI.
4. Real-time visual connection indicators/badges display WebRTC status (e.g., connected, reconnecting, failed) and round-trip latency to the user.

---

## 2. User Scenarios & Testing

### User Story 1: Unified Guest Connection & Reconnection (Priority: P1)

As a Guest Player, I want my session connection to use the unified connection manager, so that if my connection drops temporarily, the application automatically tries to reconnect me, keeping me in the loop without needing to refresh or log in again.

**Why this priority**: Essential to resolve flaky connections in long gaming sessions.

**Acceptance Scenarios**:

1. **Given** a guest session with a valid share ID, **When** the guest connects, **Then** `P2PGuestService` delegates connection setup to `PeerJSConnectionManager`, which transitions reactively through `connecting`, `handshaking`, and `connected`.
2. **Given** an active guest connection, **When** a brief network dropout occurs, **Then** `PeerJSConnectionManager` reactively transitions to `reconnecting` and automatically tries to re-establish the connection. The UI badge updates immediately.
3. **Given** a permanent connection failure, **When** re-establishment retries are exhausted, **Then** the state transitions to `failed`, and the UI displays a failure indicator prompting a manual retry.

---

### User Story 2: Reactive UI Connection Badges (Priority: P2)

As a Player (Host or Guest), I want to see a clear, high-contrast, real-time visual badge representing my P2P WebRTC status and network latency in the application header, so that I have instant, premium-looking feedback on my connection health.

**Why this priority**: Key UX element to prevent confusion when network issues occur.

**Acceptance Scenarios**:

1. **Given** the user is hosting or joined as a guest, **When** connection state or latency updates, **Then** the global header displays a responsive, animated badge with harmonious theme-specific tokens representing the active status (e.g., pulsing cyan for connected, amber for reconnecting, red for failed).

---

## 3. Requirements

### Functional Requirements

- **FR-001**: `P2PHostService` MUST support constructor dependency injection of `PeerJSConnectionManager` for managing P2P transport.
- **FR-002**: `P2PGuestService` MUST support constructor dependency injection of `PeerJSConnectionManager` to handle client transport.
- **FR-003**: The services MUST delegate WebRTC socket event listening, handshakes, ping-pong heartbeats, and client reconnect loops entirely to the connection manager.
- **FR-004**: `P2PGuestService` and `P2PHostService` MUST expose the connection manager's reactive Svelte 5 state to the UI.
- **FR-005**: The application header MUST render a dedicated status badge (`P2PStatus.svelte`) showing current connection state and round-trip latency (RTT) when hosting or participating in a guest session.
- **FR-006**: Teardown routines (`stopHosting()` and `disconnect()`) MUST cleanly release all connection manager resources, stopping heartbeats and destroying sockets to avoid memory leaks.

---

## 4. Success Criteria

- **SC-001**: The connection manager successfully handles WebRTC socket setup and state transitions in both host and guest roles.
- **SC-002**: Visual connection status and latency updates reflect in Svelte VTT views reactively in under 200ms from the socket events.
- **SC-003**: All unit tests in the Vitest suite pass cleanly, confirming integration success and zero regressions in existing synchronization logic.
