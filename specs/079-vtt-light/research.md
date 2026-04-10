# Research: Lightweight VTT Functionality

## Decision 1: Token Rendering Approach

**Context**: The existing `MapView.svelte` renders everything on a single canvas via `renderMap()` in the map-engine. Pins, grid, fog, and the map image are all composited in one pass.

**Decision**: Render tokens as a post-render canvas overlay inside `MapView.svelte`'s existing `draw()` loop, after `renderMap()` returns but before the frame completes.

**Rationale**:

- The existing `draw()` function already draws the GM brush indicator after `renderMap()`, which is a proven pattern
- Tokens need to be on the same canvas as the map to share the viewport transform (pan/zoom)
- Canvas rendering gives smooth 60fps drag performance even with 20+ tokens
- DOM overlays would require coordinate reprojection on every viewport change and suffer from CSS layout overhead
- Token hit-testing can reuse the same pointer coordinate math as pin hit-testing (`map-view-helpers.ts`)

**Alternatives considered**:

- **DOM overlay with absolute positioning**: Rejected because it requires reprojecting token positions on every pan/zoom tick, and DOM drag performance degrades with 15+ tokens
- **Separate canvas element layered on top with CSS**: Rejected because coordinate system divergence between canvases during viewport transforms would cause visual drift
- **SVG overlay**: Rejected because SVG has higher memory overhead per element and slower repaint than canvas for this use case

## Decision 2: Session State Storage

**Context**: The spec requires ephemeral session state with optional vault persistence for encounter snapshots.

**Decision**: Store live session state in a Svelte 5 `$state` object within `map-session.svelte.ts`. For encounter snapshots, serialize to JSON and persist via OPFS using the same pattern as map masks (`maps/{mapId}_encounter_{encounterId}.json`).

**Rationale**:

- `$state` gives automatic reactivity for all UI consumers without manual subscriptions
- OPFS is already used for map assets and masks, so it is a consistent storage pattern
- JSON serialization is sufficient for the expected session state size (<100KB for 20 tokens)
- No need for IndexedDB because session state is either ephemeral (memory) or file-backed (OPFS)

**Alternatives considered**:

- **IndexedDB**: Rejected because it is overkill for JSON blobs; OPFS is simpler and already in use
- **LocalStorage**: Rejected because its limit is too small for encounter snapshots with token image references
- **Vault OPFS via Dexie**: Rejected because Dexie is for IndexedDB; OPFS direct access is cleaner

## Decision 3: P2P Session Sync Protocol

**Context**: The existing P2P layer uses flat message objects (`{ type: "...", payload: ... }`) over PeerJS DataConnection. There is no typed message union or acknowledgment protocol.

**Decision**: Extend the existing P2P message protocol by adding new message types to the host and guest data handlers. Add a typed message union in a new `p2p-protocol.ts` file for compile-time safety. Use fire-and-forget for token moves with periodic state reconciliation.

**Rationale**:

- The existing pattern is simple and works, so there is no need to introduce WebRTC data channels, WebSockets, or CRDTs
- Host-authoritative model means no conflict resolution is needed because the host's state is canonical
- Periodic snapshots prevent drift accumulation
- Adding a typed union gives exhaustiveness checking without changing the wire format

**Alternatives considered**:

- **CRDT-based sync (Yjs)**: Rejected because it is overkill for a host-authoritative model and adds significant dependency weight
- **WebSocket relay server**: Rejected because it breaks the local-first, peer-to-peer architecture and introduces server costs
- **Acknowledgment protocol with retries**: Rejected for the lightweight version because if a message is dropped, the next move or periodic snapshot will correct state

## Decision 4: Grid Snapping

**Context**: The existing grid system uses `mapStore.gridSize` (image-space units) and `mapStore.showGrid`. The grid is drawn as a CanvasPattern.

**Decision**: Tokens snap to the existing grid cell boundaries using `mapStore.gridSize`. Snap position = `Math.round(imageX / gridSize) * gridSize`. If no grid is defined, tokens use free placement.

**Rationale**:

- Reuses existing grid metadata without duplication
- Simple math means no complex snapping logic is needed
- Aligns with the spec's requirement to inherit grid from the map

**Alternatives considered**:

- **Session-defined grid**: Rejected because it would require the session to override the map grid, creating two sources of truth
- **Sub-cell snapping**: Rejected for the lightweight version because it can be added as an advanced option later

## Decision 5: Token Image Sourcing

**Context**: Tokens can be linked to vault entities or created freeform. Linked tokens should ideally show the entity's image.

**Decision**: Linked tokens use the entity's image field if set as the token visual. Freeform tokens use a colored circle with the token name as a text label. Token images are rendered as scaled thumbnails on the canvas using `drawImage()` with the entity's image blob URL.

**Rationale**:

- Entity images are already loaded and cached by the existing system
- Colored circles for freeform tokens match the existing pin visual language
- Canvas `drawImage()` is performant and works within the existing render loop

**Alternatives considered**:

- **Custom token image upload**: Deferred to a future phase because it adds file handling complexity
- **Avatar generation via AI Oracle**: Deferred because it adds API dependency and latency to token creation

## Decision 6: Fog Reveal in Sessions

**Context**: Existing fog is saved as a PNG mask in OPFS tied to the map asset. The spec requires session-specific fog reveal that can be reset independently.

**Decision**: Session fog uses an in-memory mask canvas that composites over the base map mask. The reveal state is the intersection of base-mask revealed and session-mask revealed. When the session ends, the session mask is discarded. If the host saves an encounter, the session mask is serialized as a compressed PNG blob in the encounter snapshot.

**Rationale**:

- Non-destructive because base map fog is never altered by session reveals
- Fast because canvas compositing is GPU-accelerated
- Compatible with existing fog painting tools because the same brush logic applies

**Alternatives considered**:

- **Modify base mask temporarily and restore on session end**: Rejected because if the session crashes, the base mask could be corrupted
- **Separate fog layer rendered as an additional overlay**: Considered but more complex; compositing is cleaner

## Decision 7: VTT Mode Entry Point

**Context**: The spec needs a way for the GM to enter VTT mode on a map.

**Decision**: Add a "VTT Mode" toggle button to the existing `VTTControls.svelte` component, which appears as a new toolbar within `MapView.svelte`. When toggled on, the map switches to VTT rendering mode (token overlay enabled, fog becomes session-aware, grid becomes more prominent). The toggle state is stored in `map-session.svelte.ts`.

**Rationale**:

- Minimal UI change with a single toggle button
- Reuses the existing MapView component as the scene renderer
- Clear mental model: VTT mode is a layer on top of the map, not a separate screen

**Alternatives considered**:

- **Separate VTT route/page**: Rejected because it would require duplicating map rendering logic
- **Context menu option on map**: Rejected because it is less discoverable than a toolbar button

## Decision 8: VTT Chat Layout

**Context**: Tactical play needs a shared chat surface that does not compete with token controls or the main map canvas.

**Decision**: Add a dedicated left-side `VTTChatSidebar` that hosts the shared VTT chat transcript and input row. Keep the token/initiative sidebar on the right so chat, encounter controls, and map controls remain visually separated.

**Rationale**:

- Keeps the chat path visible without forcing the user out of VTT mode
- Avoids mixing messaging into the token control strip
- Makes room for compact icon-only controls in the VTT toolbar

**Alternatives considered**:

- **Embed chat inside the right sidebar**: Rejected because it would crowd token and initiative controls
- **Floating chat window**: Rejected because it adds clutter and is harder to keep aligned with VTT play

## Decision 9: Shared Dice Roll Flow

**Context**: VTT chat and the shared dice roller both need to produce the same visible result and synchronize to connected participants.

**Decision**: Reuse the Oracle-style command menu for `/roll` in VTT chat, route dice modal executions through the VTT session store, and render roll output with a shared `DiceRollResult` component. When VTT mode is active, modal rolls are appended to the chat transcript and broadcast through the existing P2P chat message path.

**Rationale**:

- Keeps dice interactions consistent across Oracle chat and VTT chat
- Ensures modal rolls do not diverge from chat rolls
- Minimizes duplicate rendering and payload-shaping logic

**Alternatives considered**:

- **Separate VTT-only roll renderer**: Rejected because it duplicates presentation logic
- **Keep modal rolls local-only**: Rejected because it would split session history and confuse shared play
