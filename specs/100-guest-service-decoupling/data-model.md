# Data Model: P2P Guest Service Decoupling

## Component: P2PClientTransport

**State**:

- `id: string | null`: The guest's own Peer ID.
- `connected: boolean`: Whether a connection to a host is active.
- `activeEpoch: number`: Internal counter to invalidate stale connection callbacks.

**Events**:

- `open`: Fired when the connection to the host is established.
- `data(message)`: Fired when a valid P2P message is received.
- `close`: Fired when the connection is closed.
- `error(err)`: Fired on network or PeerJS error.

## Component: GuestHandlerContext

**Injected dependencies for handlers**:

- `vault`: Vault repository (for graph/entity updates).
- `uiStore`: UI state (for mode/loading updates).
- `mapSession`: VTT session logic (for token/snapshot updates).
- `mapStore`: Active map state.
- `themeStore`: Active theme state.
- `assetCache`: `MapAssetUrlCache` instance.
- `guestRoster`: Shared guest registry.
- `transport`: The `P2PClientTransport` instance (for sending responses).

## Component: MapAssetUrlCache

**State**:

- `mapUrl: string | null`: Object URL for the current map image.
- `fogUrl: string | null`: Object URL for the current fog mask.

**Operations**:

- `setMap(blob)`: Revokes old map URL, creates new one, returns URL.
- `setFog(blob)`: Revokes old fog URL, creates new one, returns URL.
- `revokeAll()`: Revokes both URLs and clears state.

## Component: GuestFileClient

**State**:

- `activeRequests: Map<string, RequestState>`: Tracking chunks for multi-part file transfers.

**RequestState**:

- `chunks: ArrayBuffer[]`: Ordered list of received bytes.
- `receivedCount: number`: Number of chunks received so far.
- `totalChunks: number`: Expected total chunks.
- `mime: string`: File MIME type.
- `timeoutId: number`: Request-specific timeout timer.
