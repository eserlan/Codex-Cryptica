# Contract: web stores and services

These are thin, dependency-injected adapters over `hex-crawl-engine` in `apps/web` (Constitution I, VIII). New files only, except for the touch points listed in the plan.

## `MapGridGeometry` resolver — `apps/web/src/lib/stores/map-grid-geometry.ts`

```ts
resolveGridGeometry(map: Map, deviceSettings: PersistedMapSettings | null): MapGridGeometry
shouldAdoptDeviceGeometry(map: Map, deviceSettings: PersistedMapSettings | null): boolean
geometryEquals(a: MapGridGeometry, b: MapGridGeometry): boolean
```

- **Precedence:** `map.grid`, then device settings, then defaults (D3).
- **Adoption:** happens once, when `map.grid` is absent and the device has settings (FR-038).
- **Write-through:** `map.svelte.ts` keeps its existing setters. On a geometry change it calls `writeGridGeometry(mapId, geometry)`, which updates `vault.maps[mapId].grid` and queues `vault.saveMaps()`. Display preferences keep using the existing `localStorage` path (FR-040).

## `GridChangeGuard` — `apps/web/src/lib/stores/hex-crawl/grid-change-guard.svelte.ts`

```ts
constructor(deps: { confirm: (opts) => Promise<boolean>; getRecordCount: (mapId) => number })
beginSession(mapId: string): void            // called when grid settings / fit mode opens
requestChange(mapId: string): Promise<boolean>  // true → proceed; asks at most once per session when count > 0
endSession(): void
```

The confirmation copy reads: "This map has {n} hex records. Changing the grid will leave them on different hexes. Continue?" It offers **Change grid** and **Cancel**. Cancelling restores the geometry from before the session (FR-039).

## `HexCrawlStore` — `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`

```ts
constructor(deps: {
  getMap: (mapId) => Map | undefined;
  saveMaps: () => Promise<boolean>;
  clock: Clock;
  publishCapture: (payload: JournalCapturePayload) => void;
  isGM: () => boolean;
  isGuest: () => boolean;
})

// state
selectedHex: { mapId: string; hex: HexCoord } | null
isEnabled(mapId): boolean
recordFor(mapId, hex): HexRecord | undefined

// commands (no-ops for guests / non-GM; all persist via saveMaps)
setEnabled(mapId, enabled: boolean): Promise<void>          // FR-001/002 (hex grids only — caller checks grid type)
openHex(mapId, hex, opener?: HTMLElement): void              // records focus origin (FR-003c)
closeHex(): void                                            // aborts in-flight discovery (FR-033), restores focus
setTerrain(mapId, hex, terrain: Terrain | null): Promise<void>
setNotes(mapId, hex, notes: string): Promise<void>
setAiNotes(mapId, hex, aiNotes: string): Promise<void>
setExplored(mapId, hex, explored: boolean, via: "gm" | "party"): Promise<{ newlyExplored: boolean }>
setDraft(mapId, hex, draft: HexDiscoveryDraft | null): Promise<void>
```

**Rules**

- Every write goes through `upsertHexRecord` and prunes empty records (FR-011).
- `setExplored(…, true, via)` publishes `formatHexExplored` exactly once each time a hex goes from not explored to explored, whether `via` is `"party"` or `"gm"` (FR-019). Setting an already-explored hex again publishes nothing. `via` is kept for the solo offer, which only party moves trigger.
- Writes are queued through the existing `maps-metadata` save queue, so they never race map saves.

## `HexCrawlMoveObserver` — `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.ts`

```ts
constructor(deps: { store: HexCrawlStore; getActiveMapId; getHexConfig; isHexCrawlOn; isGM; isSolo;
                    offerExplore: (mapId, hex) => void })
onMoveSettled(tokens: readonly Token[]): Promise<void>
```

- It considers only vision-source tokens (the party, as in spec 171). It uses each token's end position: the end hex only.
- When a hex becomes Explored and solo play is on, it calls `offerExplore` (FR-035). It never generates by itself (FR-036).
- It does nothing when the map is not a hex grid, the mode is off, or the client is not the GM.

## `HexDiscoveryController` — `apps/web/src/lib/services/hex-discovery.ts`

```ts
constructor(deps: { service: HexDiscoveryService; aiClient; settings; isAiDisabled: () => boolean;
                    isGuest: () => boolean; vault; mapStore; store: HexCrawlStore; clock })
explore(mapId, hex, signal: AbortSignal): Promise<ExploreResult>       // returns existing draft if one is pending (edge case)
regenerate(mapId, hex, part, signal): Promise<ExploreResult>
rollTables(mapId, hex): Promise<ExploreResult>
discardPart(mapId, hex, part): Promise<void>
discardDraft(mapId, hex): Promise<void>
saveEntityPart(mapId, hex, part: "landmark" | "encounter", opts: { encounterType?; linkTicked: boolean }): Promise<{ entityId }>
saveNotePart(mapId, hex, part: "hazard" | "secret" | "atmosphere"): Promise<void>
saveFactionPart(mapId, hex, opts: { createIfMissing: boolean }): Promise<{ factionId: string | null }>  // FR-025: links the faction to every entity already saved from this hex's discoveries, adds the aiNotes line, and remembers the faction so entities saved later from the same draft are linked too
proposedLinkFor(mapId, hex): { entityId: string; title: string } | null
```

- **Guest vaults:** every method rejects, and the UI never shows Explore (FR-032).
- **Context:** gathered from `vault` and `mapStore` pins, then passed to `buildHexContext` (D11).
- **Model runner:** built like `delve-area-enhancement.ts` (`aiClientManager.getModel`, JSON response mode). The response is parsed with the exported `extractJsonObject` from `services/generators/ai-generator-gateway.ts` (D10).
- **Saving:** entities are created through `vault.createEntity`, pinned through `mapStore.addPin`, and linked through `vault.addConnection`. The journal gets `formatGeneratedSaved`.
