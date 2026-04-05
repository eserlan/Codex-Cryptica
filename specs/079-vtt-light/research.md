# Research: Lightweight VTT Functionality

## Decision 1: Token Rendering Approach

**Context**: The existing `MapView.svelte` renders everything on a single canvas via `renderMap()` in the map-engine. Pins, grid, fog, and the map image are all composited in one pass.

**Decision**: Render tokens as a **post-render canvas overlay** inside `MapView.svelte`'s existing `draw()` loop, after `renderMap()` returns but before the frame completes.

**Rationale**:

- The existing `draw()` function already draws the GM brush indicator after `renderMap()` — this is a proven pattern
- Tokens need to be on the same canvas as the map to share the viewport transform (pan/zoom)
- Canvas rendering gives smooth 60fps drag performance even with 20+ tokens
- DOM overlays would require coordinate reprojection on every viewport change and suffer from CSS layout overhead
- Token hit-testing can reuse the same pointer coordinate math as pin hit-testing (`map-view-helpers.ts`)

**Alternatives considered**:

- **DOM overlay with absolute positioning**: Rejected — requires reprojecting token positions on every pan/zoom tick, and DOM drag performance degrades with 15+ tokens
- **Separate canvas element layered on top with CSS**: Rejected — coordinate system divergence between canvases during viewport transforms would cause visual drift
- **SVG overlay**: Rejected — SVG has higher memory overhead per element and slower repaint than canvas for this use case

## Decision 2: Session State Storage

**Context**: The spec requires ephemeral session state with optional vault persistence for encounter snapshots.

**Decision**: Store live session state in a Svelte 5 `$state` object within `map-session.svelte.ts`. For encounter snapshots, serialize to JSON and persist via OPFS using the same pattern as map masks (`maps/{mapId}_encounter_{encounterId}.json`).

**Rationale**:

- `$state` gives automatic reactivity for all UI consumers without manual subscriptions
- OPFS is already used for map assets and masks — consistent storage pattern
- JSON serialization is sufficient for the expected session state size (<100KB for 20 tokens)
- No need for IndexedDB — session state is either ephemeral (memory) or file-backed (OPFS)

**Alternatives considered**:

- **IndexedDB**: Rejected — overkill for JSON blobs; OPFS is simpler and already in use
- **LocalStorage**: Rejected — 5MB limit too small for encounter snapshots with token image references
- **Vault OPFS via Dexie**: Rejected — Dexie is for IndexedDB; OPFS direct access is cleaner

## Decision 3: P2P Session Sync Protocol

**Context**: The existing P2P layer uses flat message objects (`{ type: "...", payload: ... }`) over PeerJS DataConnection. There is no typed message union or acknowledgment protocol.

**Decision**: Extend the existing P2P message protocol by adding new message types to the host and guest data handlers. Add a typed message union in a new `p2p-protocol.ts` file for compile-time safety. Use fire-and-forget for token moves (host is authoritative) with periodic state reconciliation.

**Rationale**:

- The existing pattern is simple and works — no need to introduce WebRTC data channels, WebSockets, or CRDTs
- Host-authoritative model means no conflict resolution is needed — the host's state is canonical
- Periodic snapshots (every N moves or on turn advance) prevent drift accumulation
- Adding a typed union gives exhaustiveness checking without changing the wire format

**Alternatives considered**:

- **CRDT-based sync (Yjs)**: Rejected — overkill for host-authoritative model; adds significant dependency weight
- **WebSocket relay server**: Rejected — breaks the local-first, peer-to-peer architecture; introduces server costs
- **Acknowledgment protocol with retries**: Rejected for lightweight version — if a message is dropped, the next move or periodic snapshot will correct state; can be added later if needed

## Decision 4: Grid Snapping

**Context**: The existing grid system uses `mapStore.gridSize` (image-space units) and `mapStore.showGrid`. The grid is drawn as a CanvasPattern.

**Decision**: Tokens snap to the existing grid cell boundaries using `mapStore.gridSize`. Snap position = `Math.round(imageX / gridSize) * gridSize`. If no grid is defined, tokens use free placement.

**Rationale**:

- Reuses existing grid metadata — no duplication
- Simple math — no complex snapping logic needed
- Aligns with the spec's requirement to inherit grid from the map

**Alternatives considered**:

- **Session-defined grid**: Rejected — would require session to override map grid, creating two sources of truth
- **Sub-cell snapping (e.g., 5-foot increments within a square)**: Rejected for lightweight version — can be added as an advanced option later

## Decision 5: Token Image Sourcing

**Context**: Tokens can be linked to vault entities (characters, creatures) or freeform. Linked tokens should ideally show the entity's image.

**Decision**: Linked tokens use the entity's image field (if set) as the token visual. Freeform tokens use a colored circle with the token name as a text label. Token images are rendered as scaled thumbnails on the canvas using `drawImage()` with the entity's image blob URL.

**Rationale**:

- Entity images are already loaded and cached by the existing system
- Colored circles for freeform tokens match the existing pin visual language
- Canvas `drawImage()` is performant and works within the existing render loop

**Alternatives considered**:

- **Custom token image upload**: Deferred to a future phase — adds file handling complexity
- **Avatar generation via AI Oracle**: Deferred — adds API dependency and latency to token creation

## Decision 6: Fog Reveal in Sessions

**Context**: Existing fog is saved as a PNG mask in OPFS tied to the map asset. The spec requires session-specific fog reveal that can be reset independently.

**Decision**: Session fog uses an **in-memory mask canvas** that composites over the base map mask. The reveal state is the intersection of (base mask revealed) AND (session mask revealed). When the session ends, the session mask is discarded. If the host saves an encounter, the session mask is serialized as a compressed PNG blob in the encounter snapshot.

**Rationale**:

- Non-destructive — base map fog is never altered by session reveals
- Fast — canvas compositing is GPU-accelerated
- Compatible with existing fog painting tools — the same brush logic applies

**Alternatives considered**:

- **Modify base mask temporarily and restore on session end**: Rejected — risky; if session crashes, base mask could be corrupted
- **Separate fog layer rendered as an additional overlay**: Considered but more complex — compositing is cleaner

## Decision 7: VTT Mode Entry Point

**Context**: The spec needs a way for the GM to enter VTT mode on a map.

**Decision**: Add a "VTT Mode" toggle button to the existing `VTTControls.svelte` component, which appears as a new toolbar within `MapView.svelte`. When toggled on, the map switches to VTT rendering mode (token overlay enabled, fog becomes session-aware, grid becomes more prominent). The toggle state is stored in `map-session.svelte.ts`.

**Rationale**:

- Minimal UI change — a single toggle button
- Reuses the existing MapView component as the scene renderer
- Clear mental model: VTT mode is a layer on top of the map, not a separate screen

**Alternatives considered**:

- **Separate VTT route/page**: Rejected — would require duplicating map rendering logic
- **Context menu option on map**: Rejected — less discoverable than a toolbar button
