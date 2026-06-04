# Feature Specification: Unified PeerJS Connection Manager

**Feature Branch**: `104-peerjs-connection-manager`  
**Created**: 2026-05-20  
**Status**: Draft  
**Input**: User description: "Unified PeerJS connection handling to lay foundations for multi-peer syncing and future direct audio/video calling channels."

---

## Clarifications

### Session 2026-05-20

- Q: What topology will the PeerJSConnectionManager enforce for database sync? → A: Star-Topology (Option A) where the Host is the central authority, and guests only connect directly to the host.
- Q: How should the Connection Manager handle persistent connection failures after exhausting retry attempts? → A: Option A (Transition to failed state and prompt the user to manually retry/refresh).
- Q: How should the Connection Manager handle connection admittance and security? → A: Option C (Open access via shareable link containing the host's Peer ID; trusted guests with the link are automatically admitted).
- Q: How should the Connection Manager propagate state changes and received messages to the rest of the application? → A: Option A (Reactive Runes + Callbacks/Direct Handler Hooks for maximum Svelte 5 alignment and simple payload routing).
- Q: What mechanism should be used for measuring connection health / latency? → A: Option A (Active ping-pong heartbeat periodically keeping WebRTC channels alive and measuring round-trip time).

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Peer Connection Lifecycle Management (Priority: P1)

As a Campaign Host, I want the application to handle peer-to-peer connection lifecycles centrally, so that guest state syncs are robust and do not fail silently when network states fluctuate.

**Why this priority**: Establish the architectural prerequisite for all cooperative and multiplayer interactions (syncing and future AV integration).

**Independent Test**: Verified by launching a host session, connecting a guest, and confirming all handshake state transitions are tracked inside a centralized state machine.

**Acceptance Scenarios**:

1. **Given** a Host has opened a campaign for guest connection, **When** a Guest uses the campaign's Peer ID to connect, **Then** the Connection Manager correctly initiates, verifies, and transitions the state from `connecting` to `handshaking` to `connected`.
2. **Given** an active connection between a Host and Guest, **When** a peer explicitly disconnects, **Then** all underlying sockets are disposed of cleanly and both players see the peer state transition to `disconnected`.

---

### User Story 2 - Graceful Disconnection Recovery (Priority: P2)

As a Player on a fluctuating connection, I want the connection manager to automatically attempt to reconnect me, so that minor signal drops don't force me to manually refresh and rejoin the VTT lobby.

**Why this priority**: Critical for seamless, distraction-free tabletop gaming sessions over residential networks.

**Independent Test**: Simulate connection dropout (disabling networks temporarily) and confirm automatic recovery and handshake renegotiation completes without user interaction.

**Acceptance Scenarios**:

1. **Given** a Host and Guest have an established connection, **When** the network drops for less than 15 seconds, **Then** the Connection Manager automatically attempts reconnection using exponential backoff up to 3 times.
2. **Given** a reconnection attempt is successful within the retry limit, **Then** the session state is restored without interrupting the map or active UI context.

---

### User Story 3 - Visual Connection Health & State Indicators (Priority: P3)

As a Host or Guest, I want to see real-time, clear status badges representing my connection status (connected, weak signal, reconnecting, disconnected), so that I know if I'm currently synchronized with the game session.

**Why this priority**: Essential UX feedback that prevents players from thinking a game is frozen when they have actually disconnected.

**Independent Test**: Connect and disconnect peers, verifying that the status badges update reactively in the VTT interface.

**Acceptance Scenarios**:

1. **Given** a change in a peer’s connection state, **When** a transition occurs, **Then** the UI reactive badge updates to match the new status with matching high-contrast thematic color tokens.

---

## Edge Cases

- **Duplicate Connections**: What happens if a player tries to connect with an active ID already registered in the session? The system must gracefully close the old socket and accept the new incoming socket.
- **ICE/STUN Blockage**: How does the system handle strict symmetric NAT firewalls? The connection manager must catch ICE-negotiation failures and fall back to custom/preconfigured STUN/TURN configurations.
- **Background Tab Hibernation**: What happens when mobile/tablet OS puts the browser tab into background hibernation? The manager must detect tab resumption and immediately trigger a synchronization ping.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST encapsulate all PeerJS socket listeners and connection setups inside a single unified `PeerJSConnectionManager` class.
- **FR-002**: System MUST expose reactive connection states (`idle`, `connecting`, `handshaking`, `connected`, `reconnecting`, `disconnected`, `failed`) and latency metrics as Svelte 5 Runes, and accept registered callback hooks for incoming message routing.
- **FR-003**: System MUST implement automatic retry policies with exponential backoff (e.g., 2s, 4s, 8s delay multipliers) when socket dropouts are encountered. When retries are exhausted, the state MUST transition to `failed` to prompt for manual retry/refresh.
- **FR-004**: System MUST cleanly release all hardware streams, socket listeners, and peer instances upon explicit session teardown to prevent memory leaks.
- **FR-005**: System MUST validate incoming connection handshakes with a standard JSON schema, rejecting rogue or malformed connection attempts.
- **FR-006**: System MUST enforce a Star-Topology where the Campaign Host is the central coordinator/authority, and guests only connect directly to the host.
- **FR-007**: System MUST support open access connection admittance via a shareable link containing the host's Peer ID, allowing trusted guests with the link to be automatically admitted.
- **FR-008**: System MUST implement an active ping-pong heartbeat (e.g., every 10 seconds) to keep WebRTC channels alive, prevent mobile browser hibernation, and measure round-trip time.

### Key Entities

- **PeerJSConnectionManager**: Singleton coordinator managing active PeerJS client instances, state machines, and retry registries.
- **ConnectionState**: Reactive state structure expressing current connection latencies, packet drop indicators, and lifecycle phases.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of transient socket disconnections (under 15s) must be successfully restored automatically without requiring manual player page reloads.
- **SC-002**: Cleanup routines must ensure exactly zero orphaned PeerJS event listeners remain active in the browser heap after explicit disconnection.
- **SC-003**: Connection status changes must propagate and reflect in Svelte VTT views in under 200ms from the socket event.
