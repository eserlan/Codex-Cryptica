# Research: Hex Crawl Mode

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-10-16

The spec had no open clarification markers. This document records the codebase findings and design decisions the plan relies on. Each entry gives the decision, why it was chosen, and the alternatives considered.

## Codebase findings

| Finding                                                                                                                                                                               | Where                                                                                                                                                                                            | Consequence                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pins on hex maps already snap to a hex and store `hexCoordinates`                                                                                                                     | `packages/schema/src/map.ts` (`MapPinSchema`), `apps/web/src/lib/stores/map.svelte.ts` (`computeHexPosition`, `addPin`)                                                                          | "In this hex" and "attach entity" reuse pins. No new link type is needed.                                                              |
| Hex grid geometry (`gridType`, `gridSize`, offsets, `hexLabelConfig`) is persisted per device in `localStorage`                                                                       | `map.svelte.ts` (`PersistedMapSettings`, `readPersistedSettings`)                                                                                                                                | Hex records keyed by `q,r` would misalign on other devices or after a restore. The geometry must move into the map (FR-037).           |
| `maps.json` is read with a plain `JSON.parse`, with no schema validation                                                                                                              | `apps/web/src/lib/stores/vault/io.ts` (`loadMapsFromDisk`)                                                                                                                                       | Additive optional fields survive load and save. No migration is needed (FR-012).                                                       |
| The published guest bundle copies whole map objects (`...m`)                                                                                                                          | `packages/vault-engine/src/services/GuestExporter.ts`                                                                                                                                            | A new `hexCrawl` field **would leak GM notes and drafts to guests** unless it is stripped there (FR-041).                              |
| `MapFogPainter.hexAt(point)` returns whether the hex centre is fogged                                                                                                                 | `apps/web/src/lib/components/map/map-fog-painter.ts`                                                                                                                                             | This is exactly the Seen rule (FR-014). Reuse it; add no new fog logic (FR-015).                                                       |
| End-of-move hook `onMoveSettled` is called from two places in `MapView.svelte`: local drags, and the token-change effect that also covers remote moves                                | `MapView.svelte`, `interactions/token-drag-handler.ts`                                                                                                                                           | Auto-explore attaches there. The solo recorder's own `onMoveSettled` only runs in solo play, so it can't be reused directly for VTT.   |
| Left-clicking empty map starts panning. Pins and tokens are hit-tested first                                                                                                          | `components/map/map-interactions.svelte.ts` (`handlePointerDown`/`Up`)                                                                                                                           | A hex click is a press-and-release with displacement under 5px while panning. A 5px threshold already exists (`TOKEN_DRAG_THRESHOLD`). |
| Pins render as an HTML overlay projected with `mapStore.project`                                                                                                                      | `components/map/MapOverlays.svelte`                                                                                                                                                              | Explored markers and terrain icons use the same overlay pattern with Iconify classes.                                                  |
| AI area stocking pattern: injected `modelRunner(system, user)`, an `aiDisabled` flag, and a deterministic fallback inside the package                                                 | `packages/generator-engine/src/dungeon/delve-stocking-service.ts`, `apps/web/src/lib/services/delve-area-enhancement.ts`                                                                         | Hex discovery follows the same shape.                                                                                                  |
| `extractJsonObject` exists in three diverging copies                                                                                                                                  | `generator-engine/src/generator-refinement.ts`, `generator-engine/src/dungeon/delve-stocking-service.ts`, `apps/web/src/lib/services/generators/ai-generator-gateway.ts` (exported, most robust) | Do not add a fourth (Constitution III). See D10.                                                                                       |
| Generated entities are marked by labels and `status: "draft"`                                                                                                                         | `packages/generator-engine/src/point-crawl-save.ts` (`imported-draft`)                                                                                                                           | Discovery entities follow the same convention (FR-028).                                                                                |
| The AI disclosure for Generate Related is help text, not an in-app dialog                                                                                                             | `apps/web/src/lib/content/help/generate-related.md`, `in-app-generators.md`                                                                                                                      | FR-031 needs a small in-app notice whose wording matches that help text (D13).                                                         |
| Random tables: `RandomSource { kind: "table", entries }`, rolled by a pure engine                                                                                                     | `packages/random-source-engine`                                                                                                                                                                  | Offline terrain tables are data, rolled by the existing engine (FR-030).                                                               |
| Journal capture helpers are pure formatters in `session-journal-engine` (`formatMapMove`, `formatGeneratedSaved`)                                                                     | `packages/session-journal-engine/src/capture.ts`                                                                                                                                                 | Add `formatHexExplored` and reuse `formatGeneratedSaved` (FR-019).                                                                     |
| Large files the feature touches: `map.svelte.ts` (1,001 lines), `map-interactions.svelte.ts` (741), `MapView.svelte` (581), `TokenDetail.svelte` (566), `help-content.ts` (856, data) | —                                                                                                                                                                                                | New behaviour goes into new modules. See the plan's Bounded Responsibility Check.                                                      |

## Decisions

### D1. A new framework-free package: `packages/hex-crawl-engine`

- **Decision**: All hex crawl domain logic lives in a new workspace package, `hex-crawl-engine`. That covers the record model and normalisation, state derivation, the terrain catalogue, context assembly, the discovery prompt and schema, the offline tables and fallback, nearest-location selection, and the grid-change impact count. It depends on `map-engine` (hex maths), `random-source-engine` (rolling) and `zod`.
- **Rationale**: Constitution I (library-first) and VIII (DI). It mirrors `solo-session-engine` and `session-journal-engine`. The web app stays a thin UI.
- **Alternatives**:
  - Extend `map-engine`. Rejected: it is geometry and rendering, and an AI prompt and records do not belong there.
  - Put it in `generator-engine`. Rejected: that package is a generator registry, and records, state and grid impact are not generation.

### D2. Storage: additive optional fields on the map in `maps.json`

- **Decision**: `MapSchema` gains `grid?: MapGridGeometry` and `hexCrawl?: { enabled: boolean; hexes: Record<HexKey, HexRecord> }`, where `HexKey` is `"q,r"`. Records are sparse. `hex-crawl-engine` normalises them on read and drops malformed entries instead of throwing.
- **Rationale**: Map data is already synced, backed up, exported and restored as part of `maps.json`. Adding fields needs no new store and no migration (FR-010, FR-012).
- **Alternatives**:
  - A separate `.codex/hexcrawl/<mapId>.json`. Rejected: it would need its own sync, backup, delete and publish handling.
  - IndexedDB. Rejected: not part of the vault files and not backed up with maps.
  - VTT session drafts. Rejected: session-scoped.

### D3. Grid geometry: stored on the map, adopted from local settings once

- **Decision**: A new sibling module `apps/web/src/lib/stores/map-grid-geometry.ts` resolves a map's geometry with this precedence: `map.grid`, then this device's existing persisted settings, then defaults. When a map without `grid` is opened and this device has geometry for it, that geometry is written into `map.grid` once (FR-038). Geometry edits write through to `map.grid` (debounced through the existing map save queue). Display preferences stay in `localStorage` (FR-040).
- **Rationale**: Hex keys stay aligned on every device (SC-005), and nothing visibly changes for existing users (SC-007). Keeping the logic out of the 1,001-line `map.svelte.ts` follows Constitution XIV.
- **Alternatives**:
  - Store a grid fingerprint on each record and re-key on mismatch. Rejected: more complex, and silently moving records is out of scope.
  - Store geometry only in `localStorage`. Rejected: the problem this fixes.

### D4. Grid-change guard: one confirmation per geometry edit session

- **Decision**: When a map has at least one hex record, the first geometry change in a grid-settings session asks for confirmation, stating the record count from `countHexRecords`. That covers type, size and offsets, a fit, or "fit to existing hexes". Confirming allows further edits until the grid settings close. Cancelling restores the previous geometry (FR-039). Maps with no records are never asked (acceptance 5.5).
- **Rationale**: Sliders emit many input events, and asking on every one would be unusable. One clear warning per session meets the intent.
- **Alternatives**:
  - Confirm on every change. Rejected: dialog spam.
  - Confirm only when settings close. Rejected: the GM would see records misaligned before being asked.

### D5. Exploration state is derived, not stored (except Explored)

- **Decision**: `deriveHexState(record, revealed)` returns `"explored"` when `record.explored` is true, otherwise `"seen"` when `revealed`, otherwise `"unknown"`. The web side supplies `revealed` from `MapFogPainter.hexAt(hexCentre).fogged === false`, or `true` when fog is off (FR-014).
- **Rationale**: There is one source of truth for fog, the mask. It needs no new fog layer (FR-015), and Explored survives re-fogging (edge case).
- **Alternatives**: Store Seen on records. Rejected: it would drift from the mask.

### D6. Auto-explore on party moves

- **Decision**: A `HexCrawlMoveObserver` (web, DI) is called from both existing `onMoveSettled` sites in `MapView.svelte`. For each vision-source token that settled, it computes the hex of the token centre with `pointToHex` and marks it explored if it is not already. It runs only when Hex Crawl mode is on, the map uses a hex grid, and the client is the GM (not a guest). Newly explored hexes publish a journal capture (`formatHexExplored`, D15). In solo play they also raise the Explore offer (FR-035). Only the end hex of a move counts (edge case).
- **Rationale**: This reuses the party definition from spec 171 (vision sources) and the existing move hooks. Only the GM writes vault data.
- **Alternatives**: Extend the solo recorder. Rejected: it is solo-only and owns travel tallies, a different responsibility.

### D7. Hex click: a new interaction handler with a 5px gate

- **Decision**: `HexClickInteractionHandler` (`components/map/interactions/`) records the pointer-down position when an empty-map pan begins. On pointer-up, if displacement is under the shared 5px threshold, it resolves the hex under the point and opens the panel. The 5px constant is extracted from `token-drag-handler.ts` into a shared module. It is suppressed for Alt (fog painting), grid move or fit, note or tile placement, measurement, guests, and non-GM views. `MapInteractionManager` only routes to it.
- **Rationale**: Panning keeps working, and pins and tokens keep their behaviour (acceptance 1.8). The routing file (741 lines) gains a call, not logic (Constitution XIV).
- **Alternatives**:
  - A dedicated "hex select" tool mode. Rejected: an extra mode switch for a core action.
  - Double-click. Rejected: conflicts with zoom habits and is less discoverable.

### D8. Hex panel UI

- **Decision**: A GM-only floating panel anchored to the hex with Floating UI (already a dependency), which becomes a bottom sheet below the `md` breakpoint. Components live in `apps/web/src/lib/components/map/hex-crawl/`. Focus moves into the panel on open and returns to the opener on close (FR-003c). Escape closes it. All controls are buttons or inputs with labels.
- **Rationale**: It matches the existing map popovers and the style guide. The keyboard requirement is met by construction.

### D9. Overlay rendering for explored markers and terrain icons

- **Decision**: `HexCrawlOverlay.svelte`, an HTML overlay like `MapOverlays.svelte`, renders only hexes that have a record and intersect the viewport. Explored hexes get a subtle corner badge (`icon-[lucide--circle-check-big]`) plus a thin inner outline in theme tokens. When `showTerrainIcons` is on, terrain icons are drawn (D17). It is rendered only for the GM, never for guests, Player View or connected players (FR-018, FR-005a, FR-041).
- **Rationale**: Iconify icons are CSS classes, so an HTML overlay is natural. Sparse records plus viewport culling keep the element count bounded (SC-002).
- **Alternatives**: Draw on the canvas in `map-engine`'s renderer. Rejected for now: icon fonts on canvas need rasterising. It can be revisited if profiling shows a need.

### D10. Discovery service shape and JSON handling

- **Decision**: `hex-crawl-engine` exports `HexDiscoveryService` with injected `modelRunner(system, user, signal) => Promise<unknown>` (already-parsed JSON), `aiDisabled`, and `rng`. It builds prompts from a `HexContext`, validates with zod (`HexStockingSchema`), supports regenerating a single part, and falls back to terrain tables. The web adapter `apps/web/src/lib/services/hex-discovery.ts` builds the runner the same way `delve-area-enhancement.ts` does (`aiClientManager`, settings, JSON response mode) and parses with the existing exported `extractJsonObject` from `services/generators/ai-generator-gateway.ts`.
- **Rationale**: The engine stays pure and testable, and no fourth copy of `extractJsonObject` is added (Constitution III). Unifying the three existing variants is a separate clean-up, because they behave differently.
- **Alternatives**: Add `extractJsonObject` to the engine. Rejected: a fourth copy.

### D11. Context assembly and limits

- **Decision**: `buildHexContext` gathers:
  - the hex's terrain, notes and AI notes;
  - entities already in the hex;
  - neighbours within radius 2 (`getHexRange`), with terrain, explored state and the titles and short summaries of their entities;
  - the nearest locations and factions on the map by `hexDistance`;
  - the map's region entity (its parent entity), if any;
  - the campaign context block (existing `formatCampaignContextBlock`).

  Limits: at most 18 neighbour hexes (radius 2 gives 18), 12 neighbouring entities, 5 nearest locations, 5 nearest factions, 600 characters per entity excerpt, and 8,000 characters in total. Truncation is deterministic.

- **Rationale**: FR-022 asks for bounded context. Fixed limits keep latency and cost predictable on large maps (SC-003).

### D12. Saving discoveries

- **Decision**:
  - **Landmark** → a `location` entity. **Encounter** → an `event` (default) or `note`, chosen in the review card.
  - Both get `status: "draft"` and the labels `hex-crawl-discovery` plus `ai-drafted` (AI source) or `rolled` (table source). Each is pinned at the hex centre.
  - **Proposed link:** the nearest location within 2 hexes (`selectNearestLocation`; ties broken by distance, then title, then id), ticked by default and created only if still ticked (FR-024a).
  - **Faction presence** → a case-insensitive exact title match against existing faction entities. On a match it links the hex's saved entities and adds a note line. With no match it offers "Create faction".
  - **Hazard, secret, atmosphere** → appended to the hex record's `aiNotes`, never to `notes` (FR-026, FR-027).
- **Rationale**: Keeping `notes` and `aiNotes` as separate fields makes "never overwrite GM text" structural, so it can be tested (SC-006). The labels and draft status match existing generator output.

### D13. AI disclosure notice

- **Decision**: Before the first AI discovery on a device, the Explore area shows a short inline notice: "Exploring sends this hex's terrain, notes and nearby lore to the AI service. Your full vault is never sent. Turn on AI Disabled to use built-in terrain tables instead." Dismissing it is remembered per device, using the hint-storage keys in `help-content.ts`. The help article carries the same wording as `generate-related.md` and `in-app-generators.md`.
- **Rationale**: FR-031 asks for an in-app notice, and Generate Related only discloses in help. This is the smallest compliant surface. There is no tracking (FR-042).

### D14. Go to hex

- **Decision**: Add `parseHexLabel(text, labelConfig, gridConfig)` to `map-engine/src/hex-labels.ts`, the inverse of `formatHexLabel` for the numeric, alphanumeric and axial styles. It returns `HexCoord | null`. When labels are hidden or the style is `"none"`, it accepts the default numeric format (edge case). The `HexGoTo` control in the map controls centres the map and opens the panel, or shows "There is no hex <text> on this map."
- **Rationale**: Label logic already lives in `map-engine`, so the inverse belongs there.

### D15. Journal capture

- **Decision**: Add `formatHexExplored({ mapId, hex, hexLabel, terrainLabel })` to `session-journal-engine/src/capture.ts`. It is name-free and bounded like `formatMapMove`. It is published on the existing `JOURNAL:CAPTURE` bus and respects existing capture settings. Saved discoveries reuse `formatGeneratedSaved`.
- **Rationale**: FR-019, reusing the existing path.

### D16. Privacy boundaries

- **Decision**:
  - `GuestExporter` strips `hexCrawl` from every exported map and keeps `grid`, which is harmless geometry. A contract test asserts this.
  - VTT session snapshots carry `mapId` and settings, not the map object. A test confirms that `hexCrawl` never appears in a snapshot.
  - Map registry guest mode reads only the guest bundle.
  - No analytics calls are added anywhere (FR-042).
  - AI requests happen only from an explicit Explore, Regenerate or solo offer acceptance with AI enabled (FR-043).
- **Rationale**: The constitution's privacy principle, and the project's rule that nothing inside the vault is tracked.

### D17. Terrain catalogue and icons

- **Decision**: Terrain is `{ kind: "preset", id }` or `{ kind: "custom", label }` (custom labels trimmed, 1–40 characters). Preset icons:

  | Terrain   | Icon        |
  | --------- | ----------- |
  | plains    | `wheat`     |
  | forest    | `trees`     |
  | hills     | `land-plot` |
  | mountains | `mountain`  |
  | swamp     | `droplets`  |
  | desert    | `sun`       |
  | water     | `waves`     |
  | coast     | `anchor`    |
  | tundra    | `snowflake` |

  Custom terrains use `map-pin`. `showTerrainIcons` is a new device-local display preference in `PersistedMapSettings`, default `false`.

- **Rationale**: FR-005 and FR-005a. All icons exist in `@iconify-json/lucide`.

### D18. Offline terrain tables

- **Decision**: Built-in `RandomSource` tables per preset terrain for each part (landmark, encounter, hazard, secret, atmosphere), with a general table set for custom terrain. Faction presence offline is a named existing faction picked by distance when one is within range, otherwise "No faction holds sway here." Tables are data modules in `hex-crawl-engine/src/tables/`, rolled through `random-source-engine` with an injected RNG.
- **Rationale**: FR-030 and SC-003 (under 1 second offline). It reuses the existing roller.

## Out of this feature (recorded follow-ups)

- Unify the three `extractJsonObject` variants into one shared helper.
- Canvas rendering of overlays, if profiling shows a need.
- Journey mode (#4148).
