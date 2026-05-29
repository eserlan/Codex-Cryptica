# Research: P2P Guest Service Decoupling

## Decision: Generalized Dispatcher and Handler Contract

**Rationale**: The `P2PDispatcher` and `BaseHandler` introduced in Spec 098 are highly effective but currently coupled to the `P2PHandlerContext` which contains host-side stores (like `vault` and `guestRoster`). By making these types generic (e.g., `P2PDispatcher<TContext>`), we can reuse the routing logic for both Host and Guest sessions while keeping the handlers focused on their specific role.

**Alternatives considered**:

- **Duplication**: Creating a `GuestP2PDispatcher` would be easier in the short term but would lead to maintenance drift.
- **Unified Context**: Creating a "God Context" with all stores would violate the separation of concerns between host (authoritative) and guest (follower).

## Decision: Epoch-based Transport Staleness Filtering

**Rationale**: FR-008 requires that stale connection events do not leak into the dispatcher. By implementing an `epoch` counter inside the `P2PClientTransport`, we can tag every new connection attempt. The transport will only emit events (data, error, close) that match the _latest_ epoch. This removes the need for every handler or the dispatcher to track the current connection reference.

**Implementation Details**:

- `activeEpoch` incremented on every `connect()` call.
- Listeners inside the transport check `if (epoch !== this.activeEpoch) return;` before emitting to the service.

## Decision: Per-Session `MapAssetUrlCache`

**Rationale**: Guest sessions frequently swap map images and fog masks, which creates Object URLs that leak memory if not revoked.
**Implementation**:

- `MapAssetUrlCache` will manage exactly two slots: `activeMap` and `activeFog`.
- Calling `setMap(blob)` will automatically `revokeObjectURL` on the previous map URL.
- The `P2PGuestService` will create a new instance of the cache on `connectToHost` and call `revokeAll()` on `disconnect`.

## Decision: Separate `GuestFileClient`

**Rationale**: File transfer in Codex-Arcana uses a request/response pattern over the P2P data channel that involves chunk reassembly and specific timeouts. This logic is distinct from the fire-and-forget message pattern of the main dispatcher.
**Implementation**:

- `GuestFileClient` will subscribe to the transport's `data` event directly.
- It will filter for `FILE_RESPONSE` types and manage its own internal reassembly state.
- This keeps the main `P2PDispatcher` cleaner and makes the file logic independently testable.
