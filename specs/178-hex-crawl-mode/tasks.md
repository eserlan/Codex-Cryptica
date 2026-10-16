---
description: "Task list for Hex Crawl Mode (spec 178, issue #4147)"
---

# Tasks: Hex Crawl Mode

**Input**: Design documents from `/specs/178-hex-crawl-mode/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required for all changed behaviour (Constitution II). Each test task covers a success path and at least one failure, cancellation or negative path. Write tests first and see them fail.

**User Help (Constitution VII)**:

- Each story adds its own section to `apps/web/src/lib/content/help/hex-crawl-mode.md`.
- US6 registers the article and adds the `FeatureHint`.

**Organisation**: Tasks are grouped by user story (spec priorities: US1–US3 are P1, US4–US5 are P2, US6 is P3), so each story can be built and tested on its own.

**Validation rule (AGENTS.md)**: Never run repo-wide `bun run test`, `bun run lint` or `bun run lint:types`. Use per-package `bun run --filter <pkg> test`, `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, and `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story it belongs to (US1–US6)

## Path Conventions

| What               | Where                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| New engine package | `packages/hex-crawl-engine/src/`, tests in `packages/hex-crawl-engine/tests/`                                            |
| Other packages     | Tests in `packages/<pkg>/tests/` (session-journal-engine) or next to the source (`map-engine`, `vault-engine`, `schema`) |
| Web                | Next to the source in `apps/web/src/lib/**` as `*.test.ts`. Playwright in `apps/web/tests/*.spec.ts`                     |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new package and wire it into the workspace.

- [x] T001 Scaffold the `hex-crawl-engine` package, mirroring `packages/solo-session-engine`:
  - `packages/hex-crawl-engine/package.json`:
    - `"name": "hex-crawl-engine"`, `"type": "module"`, `"private": true`
    - `"main"` and `"types"`: `./src/index.ts`
    - scripts `test`, `test:coverage` and `lint`, same as the sibling
    - dependencies `map-engine`, `random-source-engine`, `schema` (all `workspace:*`) and `zod`
    - devDependencies matching the sibling
  - `packages/hex-crawl-engine/tsconfig.json` and `packages/hex-crawl-engine/bunfig.toml`, copied from `packages/solo-session-engine/`
  - an empty `packages/hex-crawl-engine/src/index.ts`
- [x] T002 Add `"hex-crawl-engine": "workspace:*"` to the dependencies in `apps/web/package.json`, then run `bun install` at the repo root and confirm `apps/web` resolves `import {} from "hex-crawl-engine"`
- [x] T003 [P] Extract the 5px click/drag displacement constant into `apps/web/src/lib/components/map/interactions/pointer-thresholds.ts` (`export const POINTER_DISPLACEMENT_THRESHOLD = 5`). Replace `TOKEN_DRAG_THRESHOLD` in `apps/web/src/lib/components/map/interactions/token-drag-handler.ts` with an import, and keep `token-drag-handler` tests green (Constitution XIV split rule)

No discovery-intent task: this feature adds no public, indexable page (plan: Discovery Intent Check N/A).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The persisted data shape, grid geometry stored on the map, the privacy strip, and the core store, which every story builds on.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Tests first

- [x] T004 [P] Write schema tests in `packages/schema/src/map.test.ts`:
  - `MapSchema` accepts a map with no `grid` or `hexCrawl` (unchanged behaviour)
  - it accepts a valid `grid`: `type` one of `"square" | "hex-pointy" | "hex-flat"`, `size` finite and `> 0`, `offsetX` and `offsetY` finite, optional `labels` with the existing hex label styles
  - it rejects `size: 0`, `size: -1` and a non-finite offset
  - it accepts a `hexCrawl` object without validating record internals (normalisation is the engine's job)
- [x] T005 [P] Write model tests in `packages/hex-crawl-engine/tests/model.test.ts`:
  - **Keys:** `toHexKey`/`parseHexKey` round-trip; `parseHexKey` returns `null` for `"1"`, `"a,b"`, `"1.5,2"` and `""`
  - **Normalisation:** `normalizeHexCrawlState` never throws on `null`, arrays, strings or junk records. It drops invalid keys and records, defaults `enabled: false`, and clamps `notes` and `aiNotes` to "≤ 20,000 chars"
  - **Updates:** `upsertHexRecord` is immutable and sets `updatedAt`. Setting `explored: true` sets `exploredAt = now` only when the hex wasn't explored before; `explored: false` clears `exploredAt`
  - **Existence rule:** a record stays only if one of `terrain`, a non-empty `notes`, a non-empty `aiNotes`, `explored` or `draft` is set; `pruneHexRecord` returns `null` otherwise, and `upsertHexRecord` removes the key
  - **Counting:** `countHexRecords` returns 0 for `undefined`
- [x] T006 [P] Write terrain and state tests in `packages/hex-crawl-engine/tests/terrain.test.ts` and `packages/hex-crawl-engine/tests/state.test.ts`:
  - **Catalogue:** all nine presets (`plains`, `forest`, `hills`, `mountains`, `swamp`, `desert`, `water`, `coast`, `tundra`) have a label and an icon
  - **Parsing:** `parseTerrainInput` matches presets case-insensitively; it returns custom terrain for other text "trimmed, 1–40 chars", `null` for `""` and whitespace, and `null` for over 40 chars
  - **Icons:** `terrainIcon` returns `icon-[lucide--map-pin]` for custom
  - **State:** `deriveHexState` returns `explored` whenever `record.explored`, `seen` when revealed and not explored, and `unknown` otherwise (including `record` undefined)
- [x] T007 [P] Write geometry tests in `apps/web/src/lib/stores/map-grid-geometry.test.ts`:
  - `resolveGridGeometry` precedence: `map.grid`, then device settings, then defaults
  - `shouldAdoptDeviceGeometry` is true only when `map.grid` is absent and device settings exist
  - `geometryEquals` handles a `labels` difference
  - negative case: a corrupt `map.grid` falls back to the device settings
  - `writeGridGeometry` updates `vault.maps[id].grid` and queues exactly one save; writing an equal geometry queues nothing
- [x] T008 [P] Write a privacy contract test in `packages/vault-engine/src/services/GuestExporter.test.ts`:
  - exported maps never contain `hexCrawl` (with `playerVisible: true`)
  - `grid` is preserved
  - a map with `playerVisible: false` is still excluded
- [x] T009 [P] Write a privacy test in `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.test.ts`: a session snapshot created while the active map has `hexCrawl` data contains no `hexCrawl` key anywhere (deep search of the serialised snapshot)
- [x] T010 [P] Write store tests in `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.test.ts`, with injected fakes for `getMap`, `saveMaps`, `clock`, `publishCapture`, `isGM` and `isGuest`:
  - `setEnabled` persists and turning it off keeps `hexes` (FR-002)
  - `setTerrain`, `setNotes` and `setAiNotes` persist and prune empty records (FR-011)
  - every command is a no-op for guests and non-GM clients
  - `openHex`/`closeHex` track `selectedHex`
  - `setDraft` persists a draft and `setDraft(…, null)` removes it, pruning the record if nothing else is set (FR-033a)
- [x] T011 [P] Write map store integration tests in `apps/web/src/lib/stores/map.svelte.test.ts` (FR-012, FR-037, FR-038, SC-007):
  - opening a map with no `grid` while this device has persisted geometry adopts it into `map.grid` exactly once, and the resolved geometry equals what the map showed before (legacy regression)
  - opening a map with no `grid` and no device settings leaves `map.grid` absent and uses the defaults
  - after adoption, changing `gridSize`, `gridType` or an offset writes through to `map.grid`
  - display preferences (`showGrid`, `gridColor`, `showHexCoordinates`) still write only to `localStorage`, never to `map.grid`

### Implementation

- [x] T012 Add `MapGridGeometrySchema` and the optional `grid` and `hexCrawl` fields to `MapSchema` in `packages/schema/src/map.ts`, per `data-model.md` §1–2, and export the types. `hexCrawl` is `z.object({ enabled: z.boolean(), hexes: z.record(z.string(), z.unknown()) }).optional()`
- [x] T013 Implement `packages/hex-crawl-engine/src/model.ts`: `HexKey`, `HexRecord`, `HexCrawlState`, `toHexKey`, `parseHexKey`, `normalizeHexCrawlState`, `getHexRecord`, `upsertHexRecord`, `pruneHexRecord` and `countHexRecords`, per `contracts/hex-crawl-engine-api.md` and `data-model.md` §3–4. Use limits "≤ 20,000 chars" for `notes` and `aiNotes`
- [x] T014 [P] Implement `packages/hex-crawl-engine/src/terrain.ts`:
  - `TerrainId`, `Terrain`, and `TERRAIN_CATALOGUE`, a data module with labels and the icons from research D17: plains `wheat`, forest `trees`, hills `land-plot`, mountains `mountain`, swamp `droplets`, desert `sun`, water `waves`, coast `anchor`, tundra `snowflake`; custom `map-pin`
  - `terrainLabel`, `terrainIcon` and `parseTerrainInput`
- [x] T015 [P] Implement `packages/hex-crawl-engine/src/state.ts` (`deriveHexState`), then export model, terrain and state from `packages/hex-crawl-engine/src/index.ts`
- [x] T016 Implement `apps/web/src/lib/stores/map-grid-geometry.ts` (`resolveGridGeometry`, `shouldAdoptDeviceGeometry`, `geometryEquals`, `writeGridGeometry`) per `contracts/hex-crawl-store-api.md`
  - Then make `apps/web/src/lib/stores/map.svelte.ts` delegate to it:
    - on map activation, resolve the geometry and adopt it once (FR-038);
    - geometry setters (`gridType`, `gridSize`, `gridOffsetX/Y`, `hexLabelConfig`) write through to `vault.maps[id].grid` via `vault.saveMaps()`.
  - Display preferences stay in `localStorage` (FR-040). No hex crawl logic goes into `map.svelte.ts` (Constitution XIV).
- [x] T017 [P] Strip `hexCrawl` from exported maps in `packages/vault-engine/src/services/GuestExporter.ts` (in the map sanitising step, keep `grid`) so T008 passes
- [x] T018 [P] Make T009 pass: confirm `apps/web/src/lib/stores/vtt/vtt-session-snapshot-manager.ts` never serialises the map object. If any path includes map data, explicitly omit `hexCrawl`
- [x] T019 Implement `HexCrawlStore` in `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`:
  - constructor DI per `contracts/hex-crawl-store-api.md`
  - `selectedHex`, `isEnabled`, `recordFor`, `setEnabled`, `openHex`, `closeHex`, `setTerrain`, `setNotes`, `setAiNotes` and `setDraft`
  - all writes go through `upsertHexRecord` and are queued on the existing `maps-metadata` save queue
  - export a singleton wired to `vault`, `mapStore`, `systemClock`, `appEventBus` and `sessionModeStore`

**Checkpoint**: Grid geometry travels with the map, hex data can be stored and is stripped from guest outputs, and T004–T011 pass.

---

## Phase 3: User Story 1 — Keep what each hex holds (Priority: P1) 🎯 MVP

**Goal**: The GM turns on Hex Crawl mode, opens a hex (click, Go to hex, or This hex), and sets terrain, notes and linked entities that persist with the map.

**Independent Test**: Spec US1. Enable the mode, click a hex, set forest, write a note, attach Millbrook, create a character, then reload: everything persists. Dragging pans without opening the panel.

### Tests for User Story 1 ⚠️

- [x] T020 [P] [US1] Write `parseHexLabel` tests in `packages/map-engine/src/hex-labels.test.ts`:
  - round-trip `formatHexLabel` → `parseHexLabel` for the `numeric`, `alphanumeric` and `axial` styles, pointy and flat
  - with style `"none"` or `"off"`, it accepts the default numeric format
  - it returns `null` for `""`, `"ZZ99999"`, `"12"` (incomplete) and labels outside the grid bounds
- [x] T021 [P] [US1] Write proximity tests in `packages/hex-crawl-engine/tests/proximity.test.ts`:
  - `pinsInHex` returns only pins whose `hexCoordinates` equal the hex, and excludes pins whose entity no longer exists
  - it returns an empty list for a hex with no pins and for pins without `hexCoordinates`
- [x] T022 [P] [US1] Write `apps/web/src/lib/components/map/interactions/hex-click-interaction-handler.test.ts`:
  - press and release under `POINTER_DISPLACEMENT_THRESHOLD` on the empty map opens the hex under the point
  - displacement ≥ 5px (a pan) does nothing
  - Alt (fog painting), grid move or fit mode, note or tile placement, measurement, guest mode, non-GM, Hex Crawl mode off and a non-hex grid each do nothing
- [x] T023 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.test.ts` (Testing Library):
  - shows the label, a state chip, terrain, **Your notes** and **In this hex**
  - choosing a preset terrain and a custom terrain persists through the store
  - **Attach entity** calls `mapStore.addPin` at the hex centre
  - **Create entity here** creates, pins and opens the entity
  - Escape closes the panel and returns focus to the opener (FR-003c)
  - a guest or non-GM render shows nothing
- [x] T024 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/HexGoTo.test.ts`:
  - a valid label centres the map and opens the panel
  - an unknown label shows "There is no hex {text} on this map." and opens nothing
  - empty input does nothing
- [x] T025 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/HexCrawlModeToggle.test.ts`: the switch shows only for `hex-pointy` and `hex-flat` grids and only for the GM; it is reachable from the grid settings panel with the VTT off (prep without a session); toggling persists through the store
- [x] T026 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/HexCrawlOverlay.test.ts`:
  - with `showTerrainIcons` on, only hexes with a terrain inside the viewport render an icon
  - custom terrain uses `icon-[lucide--map-pin]`
  - with the toggle off (the default), no icons render
  - Player View, guest and connected-player renders produce no overlay (FR-041)
- [x] T027 [P] [US1] Write **This hex** tests (FR-003b) in `apps/web/src/lib/components/vtt/TokenDetail.test.ts` and `apps/web/src/lib/components/map/MapOverlays.test.ts` (create either if absent):
  - with Hex Crawl mode on, choosing **This hex** on a selected token or pin opens the panel for the hex it stands in
  - the action is absent when the mode is off, on a non-hex grid, and for guests

### Implementation for User Story 1

- [x] T028 [P] [US1] Implement `parseHexLabel(text, labelConfig, gridConfig)` in `packages/map-engine/src/hex-labels.ts` (the inverse of `formatHexLabel`, research D14) and export it from `packages/map-engine/src/index.ts`
- [x] T029 [P] [US1] Implement `packages/hex-crawl-engine/src/proximity.ts` (`pinsInHex`) and export it from `index.ts`
- [x] T030 [US1] Implement `apps/web/src/lib/components/map/interactions/hex-click-interaction-handler.ts` (research D7), using `POINTER_DISPLACEMENT_THRESHOLD`, `pointToHex` and `hexCrawlStore.openHex`
- [x] T031 [US1] Route press and release to the hex click handler in `apps/web/src/lib/components/map/map-interactions.svelte.ts`:
  - record the start point when an empty-map pan begins in `handlePointerDown`
  - on `handlePointerUp`, call the handler
  - only the call sites are added; no logic (Constitution XIV)
- [x] T032 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexCrawlModeToggle.svelte` and host it inside the grid settings panel, `apps/web/src/lib/components/map/VTTGridSettings.svelte`, which opens with or without the VTT (`contracts/ui-and-privacy.md`)
- [x] T033 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexTerrainPicker.svelte`: nine preset buttons with icons and labels, **Custom…** (a text input "trimmed, 1–40 chars"), and **Clear**
- [x] T034 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexNotes.svelte`:
  - a **Your notes** textarea, debounced save through `hexCrawlStore.setNotes`, "≤ 20,000 chars"
  - a separate framed **AI-drafted** section bound to `setAiNotes`, editable and clearable, shown only when non-empty
- [x] T035 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexContentsList.svelte`:
  - **In this hex**, built with `pinsInHex`; each row opens its entity
  - **Attach entity**: entity search, then `mapStore.addPin(entityId, hexCentre)`
  - **Create entity here**: type select and title, then `vault.createEntity`, `mapStore.addPin`, and open in the detail panel
- [x] T036 [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.svelte`:
  - floating via Floating UI on `md` and up, a bottom sheet below
  - header with the hex label (map label style, or numeric when labels are hidden or `none`), a state chip (Unknown or Seen until US2 adds Explored) and close
  - composes T033–T035
  - focus management and Escape per `contracts/ui-and-privacy.md`
  - renders only for the GM when not a guest
- [x] T037 [US1] Mount `HexCrawlPanel` in `apps/web/src/lib/components/map/MapView.svelte` (wiring only). Supply the state chip's `revealed` from `painter.hexAt(hexCentre).fogged === false`, or `true` when fog is off (FR-014)
- [x] T038 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexGoTo.svelte` (a labelled field and **Go** button using `parseHexLabel`), shown in the map controls when Hex Crawl mode is on
- [x] T039 [P] [US1] Add a **This hex** action:
  - for a selected token: one button in `apps/web/src/lib/components/vtt/TokenDetail.svelte`
  - for a selected pin: in `apps/web/src/lib/components/map/MapOverlays.svelte`
  - each calls `hexCrawlStore.openHex` for the hex the item stands in (FR-003b)
- [x] T040 [US1] Add the `showTerrainIcons` display preference to `PersistedMapSettings` in `apps/web/src/lib/stores/map.svelte.ts` (default `false`, device-local, read and write like `showHexCoordinates`), and test the default and persistence in `apps/web/src/lib/stores/map.svelte.test.ts`
- [x] T041 [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexCrawlOverlay.svelte`:
  - an HTML overlay like `MapOverlays.svelte`, culled to the viewport, rendering only hexes with records
  - terrain icons when `showTerrainIcons` is on
  - GM only
  - mount it in `MapView.svelte`
- [x] T042 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/HexCrawlDisplayToggle.svelte` (the terrain icons toggle, FR-005a) in the map display options
- [x] T043 [US1] Write the "Turning on Hex Crawl mode", "The hex panel", "Terrain and notes", "Attaching and creating entities" and "Go to hex and This hex" sections in a new `apps/web/src/lib/content/help/hex-crawl-mode.md`, with frontmatter `id`, `title`, `description`, `tags` and `rank` matching the sibling articles

**Checkpoint**: US1 works on its own. The Hex Crawl tool is useful for prep even without states or discovery.

---

## Phase 4: User Story 2 — See what the party has explored (Priority: P1)

**Goal**: Unknown, Seen and Explored states, with auto-explore on party moves, a manual toggle, an explored marker, and a journal entry.

**Independent Test**: Spec US2. Reveal a hex and see Seen. Move the party into it and see Explored, the marker and a journal entry. Re-fog it and it stays Explored. Player View shows nothing.

### Tests for User Story 2 ⚠️

- [x] T044 [P] [US2] Write `formatHexExplored` tests in `packages/session-journal-engine/tests/capture.test.ts`:
  - the summary is "Explored hex {label} ({terrain})"; without a terrain, the parentheses are omitted
  - it is name-free and bounded by `JOURNAL_CAPTURE_LIMITS`
  - an over-long terrain label is truncated, not thrown
- [x] T045 [P] [US2] Write `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.test.ts`:
  - a vision-source token that settles in a new hex marks it explored and publishes exactly one capture
  - settling again in an explored hex publishes nothing
  - only the end hex counts
  - non-vision tokens, mode off, a non-hex grid, guest and non-GM each do nothing
- [x] T046 [P] [US2] Extend `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.test.ts`: `setExplored(…, true, "party")` and `setExplored(…, true, "gm")` each return `newlyExplored: true` and publish exactly one `formatHexExplored` capture when the hex was not explored (FR-019); setting an already-explored hex again returns `false` and publishes nothing; `exploredAt` comes from the injected clock; `setExplored(…, false)` clears it and publishes nothing
- [x] T047 [P] [US2] Extend `HexCrawlOverlay.test.ts` and `HexCrawlPanel.test.ts`:
  - the explored marker renders for explored records in the GM view only
  - the panel chip shows **Explored**, and **Mark explored** / **Mark unexplored** toggles it
  - with fog off, unexplored hexes show **Seen**

### Implementation for User Story 2

- [x] T048 [P] [US2] Implement `formatHexExplored({ mapId, hex, hexLabel, terrainLabel })` in `packages/session-journal-engine/src/capture.ts` and export it from the package index
- [x] T049 [US2] Add `setExplored(mapId, hex, explored, via)` to `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`. Publish `formatHexExplored` on the `JOURNAL:CAPTURE` bus whenever a hex goes from not explored to explored, for both `via` values, respecting existing capture settings (FR-019). `via` is kept for the US4 solo offer
- [x] T050 [US2] Implement `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.ts` per `contracts/hex-crawl-store-api.md`, leaving `offerExplore` as an injected no-op until US4
- [x] T051 [US2] Call `HexCrawlMoveObserver.onMoveSettled` at both existing `onMoveSettled` sites in `apps/web/src/lib/components/map/MapView.svelte` (the `MapInteractionManager` callback and the token-change effect). Wiring only
- [x] T052 [P] [US2] Add the explored marker (corner `icon-[lucide--circle-check-big]` with `aria-hidden="true"`, plus a thin inner outline using theme tokens) to `HexCrawlOverlay.svelte`
- [x] T053 [P] [US2] Add the Explored chip state and the **Mark explored** / **Mark unexplored** footer button to `HexCrawlPanel.svelte`
- [x] T054 [US2] Add the "Unknown, Seen and Explored" section to `apps/web/src/lib/content/help/hex-crawl-mode.md`. Cover how Seen follows fog, that the hex centre decides, that Explored survives re-fogging, that only the end of a move counts, and that the journal records it

**Checkpoint**: US1 and US2 work together. The map tracks exploration.

---

## Phase 5: User Story 3 — Find out what is in a hex (Priority: P1)

**Goal**: **Explore** drafts a six-part discovery from bounded context, with AI first-class and terrain tables offline. The GM reviews each part and saves entities pinned in the hex, with the proposed nearest-location link. Drafts persist until resolved.

**Independent Test**: Spec US3 and quickstart scenarios 4–5.

### Tests for User Story 3 ⚠️

- [x] T055 [P] [US3] Write `packages/hex-crawl-engine/tests/discovery-schema.test.ts`:
  - `HexStockingSchema` accepts valid output
  - it rejects missing parts and over-long fields: landmark and encounter `title` "1..80" and `description` "1..1200"; `hazard` and `secret` "1..600"; `factionPresence.description` "1..600"; `faction` "1..80"; `atmosphere` "1..400"
  - per-part sub-schemas validate on their own
- [x] T056 [P] [US3] Write `packages/hex-crawl-engine/tests/context.test.ts`:
  - `buildHexContext` includes terrain, notes, contents, neighbours within radius 2, nearest locations and factions by `hexDistance`, region and campaign
  - it enforces the limits: ≤ 18 neighbour hexes, ≤ 12 neighbour entities, ≤ 5 locations, ≤ 5 factions, ≤ 600 chars per excerpt, ≤ 1,500 for the notes excerpt and the campaign block
  - `renderHexContext` is ≤ 8,000 chars, with deterministic truncation (the same input gives the same output)
  - empty surroundings still produce valid context
- [x] T057 [P] [US3] Extend `packages/hex-crawl-engine/tests/proximity.test.ts` for `selectNearestLocation`:
  - nearest within `maxDistance = 2`
  - ties broken by distance, then title, then id
  - `null` when nothing is within 2
- [x] T058 [P] [US3] Write `packages/hex-crawl-engine/tests/discovery-service.test.ts` with a fake `modelRunner`, seeded `rng` and fake `clock`:
  - **AI:** valid output gives a `source: "ai"` draft with all six parts `pending`
  - **Failure:** invalid output, or the runner throwing, gives `failure: "ai-failed"` and does not silently fall back
  - **Abort:** an aborted signal rejects with `AbortError`
  - **AI disabled or no runner:** never calls the runner and returns a `source: "tables"` draft
  - **Custom or no terrain:** sets `usedGeneralTables: true`
  - **Regenerate one part:** changes only that part, and the other five are deep-equal to before (FR-023)
  - **Prompts:** include the "avoid repeating existing hex contents" instruction (FR-029)
  - **Offline speed (SC-003):** `rollFromTables` with a fixed seed completes in under 1 second for every preset terrain and for custom terrain
- [x] T059 [P] [US3] Write `packages/hex-crawl-engine/tests/discovery-save.test.ts`:
  - **`planDiscoverySave`:** landmark gives a `location`; encounter gives an `event` by default and a `note` when chosen. `status: "draft"`, labels `["hex-crawl-discovery", "ai-drafted"]` or `["hex-crawl-discovery", "rolled"]`, the link only when `linkTicked`, and the part marked `saved`
  - **`appendToAiNotes`:** only ever touches `aiNotes` and `draft`. A property test over random records asserts the returned patch never contains `notes` (FR-027, SC-006)
  - **`matchFaction`:** case-insensitive exact match, and `null` for partial matches
  - **`planFactionSave` (FR-025):** returns a `related_to` link from every already-saved entity of this hex to the faction; with no saved entities, returns no links but still adds "Faction presence: {faction}" to `aiNotes`; the patch never contains `notes`; the draft remembers the faction id for later saves
  - **Draft lifecycle:** the draft is removed once no part is `pending`
- [x] T060 [P] [US3] Write `apps/web/src/lib/services/hex-discovery.test.ts` with fakes for `aiClient`, `vault`, `mapStore` and the store:
  - **Explore:** gathers context and persists the draft through `setDraft`; an existing pending draft is returned instead of generating
  - **Guest vault:** every method rejects, and the model runner is never called
  - **AI disabled:** the model runner is never called (FR-043)
  - **Cancel:** an abort mid-generation leaves the record unchanged (FR-033)
  - **`saveEntityPart`:** creates the entity, pins it at the hex centre with `hexCoordinates`, links only when ticked, and publishes `formatGeneratedSaved`
  - **`saveNotePart`:** appends to `aiNotes` only
  - **`saveFactionPart` (FR-025):** an existing faction is linked to every entity already saved from this hex's discoveries and the aiNotes line is added; a landmark or encounter saved afterwards from the same draft is linked too; a missing faction is created only when `createIfMissing`, otherwise nothing is written
- [x] T061 [P] [US3] Write `apps/web/src/lib/components/map/hex-crawl/HexDiscoveryReview.test.ts`:
  - renders six parts with source badges
  - Regenerate, Discard and Save call the controller
  - the proposed link checkbox is ticked by default and absent when there is no location within 2
  - failure shows "The AI couldn't draft this hex." with **Try again** and **Roll on terrain tables**
  - the custom-terrain message
  - **Cancel** while generating aborts
  - progress is announced through `aria-live="polite"`
  - the AI notice shows until dismissed and stays hidden after (device-local key)
- [x] T062 [P] [US3] Write panel-level discovery tests in `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.test.ts`:
  - **Explore** is the primary action for an Unknown or Seen hex and still available, as a secondary action, for an Explored hex (FR-020)
  - with a pending draft the action reads **Review discovery** and opens the stored draft without generating (FR-033a)
  - in a guest vault no Explore action renders (FR-032)
  - closing the panel during generation aborts it and nothing is saved (FR-033)

### Implementation for User Story 3

- [x] T063 [P] [US3] Implement `packages/hex-crawl-engine/src/discovery/schema.ts` (`HexStockingSchema` and the per-part schemas, with the limits quoted in T055) and `packages/hex-crawl-engine/src/discovery/draft.ts`:
  - `HexDiscoveryDraft` and `DraftPart` types, with `status` `"pending" | "saved" | "discarded"`, `source` `"ai" | "tables"` and `usedGeneralTables?`
  - the lifecycle helpers
- [x] T064 [P] [US3] Implement `packages/hex-crawl-engine/src/context.ts` (`buildHexContext`, `renderHexContext`) with the limits from research D11, using `getHexRange` and `hexDistance` from `map-engine`
- [x] T065 [P] [US3] Add `selectNearestLocation` to `packages/hex-crawl-engine/src/proximity.ts`
- [x] T066 [P] [US3] Author the offline tables as `RandomSource` data:
  - `packages/hex-crawl-engine/src/tables/terrain-tables.ts`: per preset terrain, tables for landmark, encounter, hazard, secret and atmosphere, at least 8 entries each
  - `packages/hex-crawl-engine/src/tables/general-tables.ts`: the general set
  - both use plain British English and are system-neutral
- [x] T067 [US3] Implement `packages/hex-crawl-engine/src/discovery/prompts.ts`:
  - **System prompt:** treat the supplied context as canon; never contradict it; avoid repeating entities already in the hex or its neighbours; answer only with JSON matching the schema
  - **User prompt:** built from `renderHexContext`
  - **Single-part regeneration prompt:** includes the other parts as fixed context
- [x] T068 [US3] Implement `HexDiscoveryService` in `packages/hex-crawl-engine/src/discovery/service.ts` (`generate`, `regeneratePart`, `rollFromTables`):
  - injected `rng` and `clock`
  - rolls through `random-source-engine`
  - offline faction presence: the nearest named faction, or "No faction holds sway here."
  - behaviour table per `contracts/hex-crawl-engine-api.md`
- [x] T069 [US3] Implement `packages/hex-crawl-engine/src/discovery/save.ts` (`planDiscoverySave`, `appendToAiNotes`, `matchFaction`, `planFactionSave` per `contracts/hex-crawl-engine-api.md`) and export the whole discovery API from `packages/hex-crawl-engine/src/index.ts`
- [x] T070 [US3] Implement `HexDiscoveryController` in `apps/web/src/lib/services/hex-discovery.ts` per `contracts/hex-crawl-store-api.md`:
  - **Model runner:** like `apps/web/src/lib/services/delve-area-enhancement.ts` `runModel` (`aiClientManager.getModel`, JSON response mode), parsed with the exported `extractJsonObject` from `apps/web/src/lib/services/generators/ai-generator-gateway.ts`. Do not copy the helper (research D10)
  - **Context:** campaign context via `formatCampaignContextBlock`
  - **Gating:** guests via `sessionModeStore.isGuestMode`; AI via `discoveryPolicyStore.aiDisabled`
- [x] T071 [US3] Create `apps/web/src/lib/components/map/hex-crawl/HexDiscoveryReview.svelte` per `contracts/ui-and-privacy.md` (six part cards, source badges, actions, proposed link, faction match or create, failure and custom-terrain messages, Cancel, Discard draft, `aria-live` status, and the one-time AI notice text from research D13)
- [x] T072 [US3] Add the prominent **Explore** / **Review discovery** action to `HexCrawlPanel.svelte`:
  - hidden for guests
  - opening the panel with a pending draft shows **Review discovery**
  - closing the panel aborts in-flight generation
- [x] T073 [US3] Register the AI notice's device-local dismissal key with the existing hint storage keys in `apps/web/src/lib/config/help-content.ts`
- [x] T074 [US3] Add the "Exploring a hex" section to `apps/web/src/lib/content/help/hex-crawl-mode.md`:
  - the six parts, regenerate, discard and save
  - the proposed link to the nearest location within 2 hexes
  - faction matching, and AI notes versus your notes
  - drafts are kept until resolved
  - **What is sent to the AI service:** wording consistent with `generate-related.md` and `in-app-generators.md`
  - AI Disabled and terrain tables, including the general-table message
  - not available in guest vaults

**Checkpoint**: The full core loop works: prep, explore, discover, save.

---

## Phase 6: User Story 4 — Explore while playing solo (Priority: P2)

**Goal**: In solo play, entering an unexplored hex offers Explore. It never generates automatically.

**Independent Test**: Spec US4 and quickstart scenario 6.

### Tests for User Story 4 ⚠️

- [x] T075 [P] [US4] Extend `hex-crawl-move-observer.test.ts`:
  - with solo on, a newly explored hex calls `offerExplore` exactly once
  - a hex that was already explored, solo off, or mode off does not call it
  - the observer never calls the discovery controller itself (FR-036)
- [x] T076 [P] [US4] Write `apps/web/src/lib/components/map/hex-crawl/HexExploreOffer.test.ts`:
  - **Explore** opens the panel with discovery started for that hex
  - **Not now** dismisses without generating
  - a new move replaces the offer
  - the offer is hidden for guests

### Implementation for User Story 4

- [x] T077 [US4] Create `apps/web/src/lib/components/map/hex-crawl/HexExploreOffer.svelte`, a non-blocking inline prompt near the travel readout (`SoloTravelReadout.svelte` area) with **Explore** and **Not now**
- [x] T078 [US4] Wire the observer's `offerExplore` dependency to `HexExploreOffer` in `apps/web/src/lib/components/map/MapView.svelte` (wiring only)
- [x] T079 [US4] Add the "Hex crawling solo" section to `apps/web/src/lib/content/help/hex-crawl-mode.md` (the offer appears on entering an unexplored hex and is never automatic)

**Checkpoint**: Solo play gets the discovery moment without extra clicks.

---

## Phase 7: User Story 5 — Keep hex data safe across devices and grid changes (Priority: P2)

**Goal**: Guard grid changes that would misalign hex records. Geometry storage itself shipped in Phase 2.

**Independent Test**: Spec US5 and quickstart scenarios 1 and 7.

### Tests for User Story 5 ⚠️

- [x] T080 [P] [US5] Write `apps/web/src/lib/stores/hex-crawl/grid-change-guard.svelte.test.ts`:
  - with 0 records, `requestChange` resolves `true` without asking
  - with N > 0 records, it asks once per session, with copy containing N
  - after a confirm, later changes in the same session don't ask again
  - a cancel resolves `false`
  - `endSession` resets
- [x] T081 [P] [US5] Extend `VTTGridSettings` coverage in `apps/web/src/lib/components/map/VTTGridSettings.test.ts` (create it if absent):
  - changing the size or type with records present asks first, and **Cancel** restores the geometry from before the session
  - with no records, nothing is asked
  - grid fit and "fit to existing hexes" are guarded the same way

### Implementation for User Story 5

- [x] T082 [US5] Implement `GridChangeGuard` in `apps/web/src/lib/stores/hex-crawl/grid-change-guard.svelte.ts`, with `confirm` injected from `notificationStore.confirm`. Copy: "This map has {n} hex records. Changing the grid will leave them on different hexes. Continue?", with **Change grid** and **Cancel**
- [x] T083 [US5] Wire the guard into `apps/web/src/lib/components/map/VTTGridSettings.svelte` and the grid fit flow (`apps/web/src/lib/components/map/VTTGridFitSection.svelte`):
  - `beginSession` on open, `requestChange` before applying a geometry change, `endSession` on close
  - restore the snapshot on cancel
- [x] T084 [US5] Add the "Your hex grid travels with the map" section to `apps/web/src/lib/content/help/hex-crawl-mode.md`: the grid is saved with the map, and changing it with hex data present asks first

**Checkpoint**: Hex data is trustworthy across devices, restores and grid edits.

---

## Phase 8: User Story 6 — Learn how hex crawling works (Priority: P3)

**Goal**: Help is findable, and a first-use hint explains the panel.

**Independent Test**: Spec US6. Help search finds "hex crawl", and the first hex click shows a hint once.

### Tests for User Story 6 ⚠️

- [x] T085 [P] [US6] Extend the help registry tests in `apps/web/src/lib/content/help-registry.test.ts`:
  - the `hex-crawl-mode` article is registered and searchable by "hex crawl"
  - it covers the required topics (FR-044)
  - `hexcrawl-maps.md` links to it
- [x] T086 [P] [US6] Write a `FeatureHint` test (next to the panel, `HexCrawlPanel.test.ts`): the hint shows on the first panel open, and once dismissed it doesn't show again

### Implementation for User Story 6

- [x] T087 [US6] Register `hex-crawl-mode` in `apps/web/src/lib/config/help-content.ts` (id, title, description, icon `icon-[lucide--hexagon]`, related to `hexcrawl-maps`), and add the `FeatureHint` configuration for the first hex panel open (FR-045)
- [x] T088 [US6] Add a short "Hex Crawl mode" pointer section linking to the new article in `apps/web/src/lib/content/help/hexcrawl-maps.md`
- [x] T089 [US6] Final pass over `apps/web/src/lib/content/help/hex-crawl-mode.md` against FR-044: every required topic present, plain British English, and the statement "Players and guests never see hex notes, terrain, drafts or explored markers"

**Checkpoint**: The feature is documented and discoverable.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T090 Write one Playwright journey in `apps/web/tests/hex-crawl.spec.ts`. With **AI Disabled**:
  - **Done (2026-10-16):** `apps/web/tests/hex-crawl.spec.ts`, three tests passing against this branch (journey with AI disabled, Player View negative path, 2,000-record budget). Fixed on the way: hex crawl read the grid through the fog helper, which returned nothing when grid lines were hidden, so hiding lines switched off the panel and exploration.
  - enable Hex Crawl mode on a hex map, click a hex, set terrain, attach an entity
  - Explore, save the landmark with the link, reload, and assert persistence
  - check Player View shows no markers
- [x] T091 [P] Accessibility pass on all `apps/web/src/lib/components/map/hex-crawl/*.svelte`:
  - `type="button"` everywhere, `aria-label` on icon-only controls, `aria-hidden` on decorative icons, labelled regions
  - chip and badge text alongside colour
  - 3:1 contrast in the Fantasy Dark, Modern Light and Cyberpunk themes
- [x] T092 [P] Performance check against SC-002: seed 2,000 hex records in a test map and confirm the panel opens in under 0.5s and the overlay renders only in-viewport records. Record the result in `specs/178-hex-crawl-mode/quickstart.md` notes
  - **Done (2026-10-16):** click to panel open with 2,000 records measured at 179 ms in Chromium (budget 500 ms; test in `hex-crawl.spec.ts`). Overlay culling covered by `hex-overlay-performance.test.ts`. Pan frame timing was not measured.
- [ ] T093 [P] Grounding check for SC-004 using AI: build 10 fixture hexes in `packages/hex-crawl-engine/tests/fixtures/grounding-hexes.ts` (each with terrain, and 6 of them with a location or faction within 2 hexes), run them through the AI path, and record in `specs/178-hex-crawl-mode/quickstart.md` notes how many drafts mention the terrain (target 10/10) and the nearby location or faction or its surroundings (target at least 5 of 6, i.e. 80%). Manual run; not part of CI
  - **Not run:** needs a live model key. The 10 fixtures exist; the run is manual.
- [ ] T094 Run the quickstart scenarios 1–9 in `specs/178-hex-crawl-mode/quickstart.md` and fix any mismatch
  - **Partly run (2026-10-16), in `apps/web/tests/hex-crawl.spec.ts`:** scenario 1 on this device (grid kept after reload; cross-device not checkable here), scenario 2 (panel, terrain, notes, attach-free save), scenario 4 on tables (explore, save landmark, reload), scenario 8 (Go to hex, typed and refused; keyboard focus return not checked), scenario 9 (Player View). **Now also run (2026-10-16):** scenario 5 (custom terrain, offline general-tables message; this exposed and fixed a bug where the message never appeared) and scenario 7 (grid change with hex records asks first; cancel keeps the grid). **Not run:** scenario 3 (party-token moves mark explored) and 6 (solo offer), which need token creation and move automation; and scenario 8 focus return. Also found: settings saved on a 250 ms debounce, so a reload within that window loses the last grid change.
- [x] T095 Constitution XIV review: confirm `map.svelte.ts`, `map-interactions.svelte.ts`, `MapView.svelte` and `TokenDetail.svelte` gained only wiring (diff review), and that no new file exceeds 500 lines without a named single responsibility. Also check FR-042: `git diff staging --name-only | xargs grep -n -i -E "zaraz|analytics|telemetry|track\("` finds nothing new
  - **Review result (2026-10-16):** files over 500 lines that this feature touched, with the responsibility each still holds. Each gained wiring only; new logic lives in its own modules.
    - `apps/web/src/lib/stores/map.svelte.ts` (1092, was 1001): active-map view state and its persisted per-device settings. Grid geometry resolution and writes live in `map-grid-geometry.ts`.
    - `apps/web/src/lib/components/map/map-interactions.svelte.ts` (766, was 741): pointer and keyboard routing. The hex click logic lives in `interactions/hex-click-interaction-handler.ts`.
    - `apps/web/src/lib/components/map/MapView.svelte` (597, was 581): map composition root. It mounts `HexCrawlLayer` and calls the observer at the two move sites.
    - `apps/web/src/lib/components/vtt/TokenDetail.svelte` (583, was 566): selected-token detail. Adds one **This hex** button.
    - `apps/web/src/lib/components/map/VTTGridSettings.svelte` (530, was 448): grid settings. Adds the mode switch and the grid-change guard calls.
    - `apps/web/src/lib/config/help-content.ts` (866): a data module, exempt from the size trigger (Principle XIV rule 4).
- [x] T096 Run the PR quality gate defined in `AGENTS.md` (PR Quality Gate, opened as #4152):
  - `bun run --filter hex-crawl-engine test`, plus the map-engine, session-journal-engine, vault-engine and schema tests
  - `bun run --filter hex-crawl-engine test:coverage` shows **at least 70%** coverage for the new package (Constitution X)
  - `bun scripts/test-changed.mjs` and `bun scripts/lint-changed.mjs`
  - `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`
  - `bunx fallow audit --format json --quiet --explain --gate-marker agent`
  - the `codex-review` specialist review
- [x] T097 Open a GitHub follow-up issue (filed as #4153) "Unify the three `extractJsonObject` variants" (research D10) and add its number to the "Out of this feature" list in `specs/178-hex-crawl-mode/research.md`. The changelog entry is written at release via the `write-release-entry` skill, not in this branch

---

## Dependencies & Execution Order

### Phase dependencies

| Phase            | Depends on                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup (1)        | nothing                                                                                                                                            |
| Foundational (2) | Setup. **Blocks all stories**                                                                                                                      |
| US1 (3)          | Foundational                                                                                                                                       |
| US2 (4)          | Foundational. Its panel and overlay tasks (T047, T052, T053) build on US1's components (T036, T041)                                                |
| US3 (5)          | Foundational. Its panel integration (T072) needs US1's panel (T036). The engine and controller work (T055–T070) can start right after Foundational |
| US4 (6)          | US2's observer (T050) and US3's controller (T070)                                                                                                  |
| US5 (7)          | Foundational only (geometry is stored there). Independent of US1–US4                                                                               |
| US6 (8)          | Each story's help section. T087–T089 run last                                                                                                      |
| Polish (9)       | All desired stories                                                                                                                                |

### Story completion order

```text
Setup → Foundational ─┬─ US1 ─┬─ US2 ─┐
                      │       └─ US3 ─┴─ US4
                      ├─ US5 (any time after Foundational)
                      └─ (help sections per story) ─ US6 ─ Polish
```

### Within each story

Tests are written first and must fail, then come the engine modules, then web stores and services, then components, then wiring, then the help section.

---

## Parallel Opportunities

- **Setup:** T003 alongside T001–T002.
- **Foundational tests:** T004–T011 all in parallel. Implementation: T014, T015, T017 and T018 in parallel once T012 and T013 land.
- **US1:** tests T020–T027 in parallel; T028, T029, T032–T035, T038, T039 and T042 in parallel.
- **US2:** T044–T047 in parallel; T048, T052 and T053 in parallel.
- **US3:** tests T055–T062 in parallel; engine modules T063–T066 in parallel (different files), then T067 → T068 → T069 in sequence.
- **US5** can be built by a second developer in parallel with US1–US3.

### Parallel example: User Story 3

```text
# Tests together:
T055 discovery-schema.test.ts · T056 context.test.ts · T057 proximity.test.ts
T058 discovery-service.test.ts · T059 discovery-save.test.ts
T060 hex-discovery.test.ts · T061 HexDiscoveryReview.test.ts · T062 HexCrawlPanel.test.ts

# Engine modules together:
T063 schema.ts + draft.ts · T064 context.ts · T065 proximity.ts · T066 tables/*
```

---

## Implementation Strategy

### MVP first

1. Phases 1–2 (Setup and Foundational): grid geometry on the map and the privacy strip ship value on their own (SC-005, SC-007).
2. Phase 3 (US1): hex prep tool. **Stop and validate** with quickstart scenario 2.
3. Phase 4 (US2): exploration tracking. Validate scenario 3.
4. Phase 5 (US3): discovery, completing the agreed Release 1 scope ("MVP + AI discovery first"). Validate scenarios 4–5.

### Incremental delivery after that

5. US4 (solo offer), then US5 (grid guard), then US6 (help registration and hint), then Polish.
6. Each phase ends at a checkpoint that can be demoed. Commit per task or logical group with a Gitmoji conventional message.

### Notes

- Never add a fourth `extractJsonObject` copy (T070).
- Never write `HexRecord.notes` from discovery code. T059's property test guards this.
- Never add analytics or telemetry (FR-042). Guests and players must never receive `hexCrawl` (T008, T009).
