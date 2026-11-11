# Tasks: Generate Region for Hex Crawl Maps

**Input**: Design documents from `/specs/4659-hex-region-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/region-engine-api.md, contracts/region-store-and-ui.md, quickstart.md

**Tests**: Required for all changed behaviour (Constitution II). Each test task is written and seen to fail before its implementation task, and covers a success path and at least one failure, cancellation or negative path.

**User Help (Constitution VII)**: Help tasks sit in the story phase that introduces the behaviour (T034, T046, T063, T068, T083) and are completed in Polish (T084, T085).

**Organisation**: Tasks are grouped by user story, in priority order: US1, US2, US3, US7 (all P1), then US4, US5, US6 (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task serves (US1 to US7)

## Path Conventions

- Engine: `packages/hex-crawl-engine/src/region/`, tests in `packages/hex-crawl-engine/tests/region/` (Bun test runner, `bun:test`)
- Web store: `apps/web/src/lib/stores/hex-crawl/`
- Web components: `apps/web/src/lib/components/map/hex-crawl/region/` (Vitest, jsdom, Testing Library)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the folders and shared types everything else imports.

- [x] T001 Create `packages/hex-crawl-engine/src/region/types.ts` with the types from data-model.md (`RegionOperation`, `TerrainLevel`, `LandscapePresetId`, `RegionSettings`, `RegionRequest`, `RegionTargets`, `RegionProposal`, `RegionAdjustments`, `RegionUndo`, `RegionRefusal`) and the constants from contracts/region-engine-api.md (`REGION_RULES_VERSION = 1`, `REGION_MIN_RADIUS = 1`, `REGION_MAX_RADIUS = 12`, `REGION_MAX_HEXES = 469`, `GAP_CORRIDOR_MAX = 4`, `LANDSCAPE_PRESET_IDS`, `TERRAIN_LEVELS`)
- [x] T002 Export the region module from `packages/hex-crawl-engine/src/index.ts` (add `export * from "./region/types"`; later tasks add their own export lines) and create empty folders `packages/hex-crawl-engine/tests/region/` and `apps/web/src/lib/components/map/hex-crawl/region/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Provenance on hex records, seeds, noise, settings, and the store seam every story uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests (write first, see them fail)

- [x] T003 [P] Add tests to `packages/hex-crawl-engine/tests/model.test.ts` for `generated` provenance: `normalizeHexCrawlState` keeps a valid `generated: { seed, rules }`; a malformed `generated` is dropped while the hex record is kept; a record without `generated` reads unchanged (FR-033); `upsertHexRecord` clears `generated` when the patch has a `terrain` key and no `generated` key (FR-022) and keeps it when the patch sets both; removing terrain removes `generated`; `pruneHexRecord` does not keep a record for `generated` alone; proves SC-010
- [x] T004 [P] Write `packages/hex-crawl-engine/tests/region/seed.test.ts`: `normalizeSeed` trims and upper-cases, returns null for empty text and for text longer than 32 characters ("1 to 32 characters after normalisation"); `formatSeed` gives the same text for the same bytes and the form `XXXX-XXXX`; the seed hash is stable for a fixed input (assert a literal expected number so a change is caught)
- [x] T005 [P] Write `packages/hex-crawl-engine/tests/region/noise.test.ts`: the same (seed, hex, channel) always gives the same value; values stay within 0 to 1; neighbouring hexes differ by less than a set bound (smoothness); different seeds and different channels give different fields; literal expected values for three fixed inputs (cross-device repeatability, FR-014)
- [x] T006 [P] Write `packages/hex-crawl-engine/tests/region/settings.test.ts`: `normalizeRegionSettings` returns Temperate with no levels for `undefined`, non-objects and unknown preset ids; drops unknown terrain ids and unknown levels; `availableTerrains` leaves out terrains at `none` and returns an empty list when all nine are `none`
- [x] T007 [P] Add tests to `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.test.ts`: `applyChange` writes one state change with a single `saveMaps` call and raises `revision` by one; when `saveMaps` rejects or returns false the previous hex state is restored, the error is rethrown and `revision` is unchanged; `applyChange` returns false and writes nothing for a non-GM and in a guest vault; existing methods (`setTerrain`, `setNotes`) also raise `revision`
- [x] T008 [P] Add tests to `apps/web/src/lib/components/map/hex-crawl/hex-crawl-view.test.ts` for `hexOnMap(dimensions, gridConfig)`: true for a hex whose centre is inside the map's pixel rectangle, false outside each of the four edges, false when there is no grid config

### Implementation

- [x] T009 Add `generated?: { seed: string; rules: number }` to `HexRecord` and `HexRecordSchema` in `packages/hex-crawl-engine/src/model.ts` (`seed`: 1 to 32 characters; `rules`: positive integer; malformed value dropped with `.catch(undefined)` so the record survives); make `upsertHexRecord` clear `generated` when the patch has a `terrain` key and no `generated` key, and when terrain is removed (T003)
- [x] T010 [P] Implement `normalizeSeed`, `formatSeed` and the 32-bit seed hash in `packages/hex-crawl-engine/src/region/seed.ts`, using integer operations only; export from `src/index.ts` (T004)
- [x] T011 [P] Implement position-hashed value noise in `packages/hex-crawl-engine/src/region/noise.ts`: integer lattice hash of (seed hash, lattice x, lattice y, channel), polynomial smoothstep blend, two octaves, channels `height` and `wetness`; no `Math.random`, `Math.sin` or `Math.cos` (research D2) (T005)
- [x] T012 [P] Create the data-only module `packages/hex-crawl-engine/src/region/presets.ts`: for each of the five presets (Temperate, Coastal, Highlands, Arid, Frozen) a nominal height and wetness point and base weight for each of the nine standard terrains, field biases, and the level multipliers Less ×0.5, Normal ×1, More ×2 (research D4)
- [x] T013 Implement `normalizeRegionSettings` and `availableTerrains` in `packages/hex-crawl-engine/src/region/settings.ts`; export from `src/index.ts` (T006; depends on T012)
- [x] T014 Make `stateFor` public, rename the private `commit` to a public `applyChange(mapId, change)` and add a `revision` `$state` counter raised after every successful write in `apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`; existing callers use `applyChange` (T007)
- [x] T015 [P] Add `hexOnMap(dimensions, gridConfig)` to `apps/web/src/lib/components/map/hex-crawl/hex-crawl-view.ts` using `hexToPoint` from `map-engine` (T008)

**Checkpoint**: Hex records can carry provenance, seeds and noise are repeatable, and the store exposes one atomic write.

---

## Phase 3: User Story 1 - Generate terrain for a selected area and review it before saving (Priority: P1) 🎯 MVP

**Goal**: From an open hex the GM chooses Generate area, sets a radius, sees proposed terrain on the map, and accepts or cancels. Nothing is saved before accept.

**Independent Test**: Pick a centre hex and a radius on a map with empty hexes, generate, confirm the proposal is shown, that Cancel leaves every hex unchanged, and that Accept saves terrain on exactly the proposed hexes (quickstart scenarios 1, 3 and 9).

### Tests for User Story 1 ⚠️

- [x] T016 [P] [US1] Write `packages/hex-crawl-engine/tests/region/targets.test.ts` for the `area` operation: targets are the hexes within `radius` with no terrain, sorted by `q` then `r`; hexes with hand-set or generated terrain are left out and counted in `protected` (FR-018); a hex with only notes or an Explored flag is a target; off-map hexes are never targets (FR-006); refusals `nothing-to-generate`, `invalid-radius` (0, 13, non-integer; valid is "1 to 12"), `centre-off-map` and `too-large` (above "At most 469"); the input state is not mutated (FR-002)
- [x] T017 [P] [US1] Write `packages/hex-crawl-engine/tests/region/generate.test.ts` (base cases): every target gets one standard terrain; no terrain at level `none` is proposed; refusal `no-terrain-available` when all are `none` (FR-010a); `proposal.stamps` holds each target's `updatedAt` (0 when it has no record); `proposal.rules` is `REGION_RULES_VERSION`; hexes that are not targets are absent from `proposal.hexes`; the input state is not mutated (FR-007, FR-008 base)
- [x] T018 [P] [US1] Write `packages/hex-crawl-engine/tests/region/apply.test.ts` for `applyRegionProposal` (`area`): applied hexes get the proposed terrain, `generated: { seed, rules }` and `updatedAt = now`; `notes`, `aiNotes`, `explored`, `exploredAt` and `draft` on an applied hex are unchanged (FR-017); a target that gained terrain since the proposal is skipped and listed in `skipped` (FR-027); no record is created for a hex outside the proposal (FR-032); `undo.before` and `undo.stamps` cover exactly the applied hexes; the input state is not mutated; applied terrain is ordinary preset terrain, `{ kind: "preset", id }`, that `terrainLabel` and `terrainIcon` read unchanged (FR-029); provenance is exactly `{ seed, rules }` (FR-030)
- [x] T019 [P] [US1] Write `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.test.ts` (core): `open` does nothing when `canEdit()` is false or Hex Crawl is off (FR-001); `open` with no eligible hexes sets `message` and leaves `review` null (FR-005); `open` sets `review` with a proposal; `setRadius` replaces the proposal and updates `hexCount`; `cancel` and `leave` clear `review` and make no `applyChange` call, and the hex state is deeply equal to before (FR-025, SC-005, SC-006); `accept` makes exactly one `applyChange` call and clears `review`; when `applyChange` throws or returns false, `review` is kept, `saving` is false and `message` says the map is unchanged (FR-026); a second `accept` while `saving` is ignored; skipped hexes are reported in `message` (FR-027)
- [x] T020 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/region/RegionGenerateMenu.test.ts`: shows a Generate region control with a Generate area choice for a GM on an editable map with Hex Crawl on; renders nothing for a non-GM, a guest vault, or Hex Crawl off (FR-001); choosing Generate area calls `open(mapId, "area", hex)`
- [x] T021 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.test.ts` (core): shows the operation title, the radius stepper bounded 1 to 12, "Covers N hexes", "N hexes to generate" and "N protected"; Accept calls `accept`; Cancel and Escape call `cancel`; Accept is disabled while saving and when nothing can be applied; a store `message` is shown with `role="status"` and a save failure with `role="alert"`; the bar offers Accept, Cancel and the radius control from one surface (FR-024)
- [x] T022 [P] [US1] Write `apps/web/src/lib/components/map/hex-crawl/region/RegionProposalOverlay.test.ts`: draws one shape per proposed hex with a dashed outline, a fill and the terrain icon (readable with no base image, FR-023); renders nothing when there is no review, and nothing when `visible` is false (players, guests, Player View; FR-028); culls hexes outside the viewport
- [x] T023 [P] [US1] Add tests to `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.test.ts`: the proposal overlay and review bar mount while a review is open; changing the active map and unmounting call `leave()`; while a review is open a tap on a hex outside the proposal does not open the hex panel
- [x] T024 [P] [US1] Add a test to `packages/vault-engine/src/services/GuestExporter.test.ts` that a map whose hexes carry `generated` provenance is exported to guests with no `hexCrawl` at all (FR-034)

### Implementation for User Story 1

- [x] T025 [US1] Implement `selectRegionTargets` for `area` with all refusals in `packages/hex-crawl-engine/src/region/targets.ts`, using `getHexRange` from `map-engine`; export from `src/index.ts` (T016)
- [x] T026 [US1] Implement `generateRegion` in `packages/hex-crawl-engine/src/region/generate.ts`: per target, read the `height` and `wetness` noise, apply the preset biases, and choose the available terrain with the nearest weighted nominal point; build `RegionProposal` with `stamps`; export from `src/index.ts` (T017; depends on T011, T012, T013)
- [x] T027 [US1] Implement `applyRegionProposal` in `packages/hex-crawl-engine/src/region/apply.ts` for `area`, building the new state in one pass and returning `applied`, `skipped` and `undo`; export from `src/index.ts` (T018)
- [x] T028 [US1] Implement `RegionGenerationStore` (constructor-injected `RegionGenerationDeps`; `review`, `message`, `open`, `setRadius`, `accept`, `cancel`, `leave`) in `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts` per contracts/region-store-and-ui.md (T019)
- [x] T029 [US1] Build the store in `apps/web/src/lib/components/map/hex-crawl/hex-crawl-services.svelte.ts` with real dependencies (`hexOnMap` from the active map's `dimensions` and grid config, `newSeed` from `crypto.getRandomValues` through `formatSeed`, `systemClock`, GM and guest checks) and add it to `HexCrawlServices`
- [x] T030 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/region/RegionGenerateMenu.svelte` with the Generate area choice (T020)
- [x] T031 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.svelte` with title, radius stepper, counts, messages, Accept and Cancel, using semantic tokens and Iconify classes (T021)
- [x] T032 [P] [US1] Create `apps/web/src/lib/components/map/hex-crawl/region/RegionProposalOverlay.svelte` drawing tinted hex shapes from `getHexCorners`, dashed outline and terrain icon, culled to the viewport (T022)
- [x] T033 [US1] Mount `RegionGenerateMenu` in `apps/web/src/lib/components/map/hex-crawl/HexCrawlPanel.svelte` (one child component; file stays under 500 lines) and mount the overlay and review bar, call `leave()` on map change and unmount, and block hex-panel opening during a review in `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.svelte` (T023)
- [x] T034 [US1] Add a "Generating a region" section to `apps/web/src/lib/content/help/hex-crawl-mode.md` covering where to find it, Generate area and the radius, the preview, accept and cancel, and that existing terrain, notes, pins, exploration and discoveries are never changed

**Checkpoint**: Generate area works end to end with default settings; cancel and a failed save leave the map untouched.

---

## Phase 4: User Story 2 - Terrain reads as a coherent landscape (Priority: P1)

**Goal**: Proposals cluster, follow plausible transitions, and fit the terrain already around them. The GM can steer the landscape with a preset and per-terrain levels.

**Independent Test**: Generate from the fixed seeded layouts and check them against the continuity rules (quickstart scenarios 2 and 7).

### Tests for User Story 2 ⚠️

- [x] T035 [P] [US2] Create seeded layout fixtures in `packages/hex-crawl-engine/tests/region/fixtures.ts`: open empty area; forest to the west and plains to the east; hills and mountains on opposite sides; land with water along one side; custom-terrain neighbours; each with at least five fixed seeds
- [x] T036 [P] [US2] Write `packages/hex-crawl-engine/tests/region/coherence.test.ts` over the fixtures: at least 80% of generated hexes share terrain with at least one neighbour (SC-004); next to fixed forest the proposal is mostly forest and next to fixed plains mostly plains, with no unrelated terrain forced between them; mountains appear only beside hills or mountains; custom terrain neighbours are never copied or replaced (FR-011); proves FR-007 and FR-008
- [x] T037 [P] [US2] Write `packages/hex-crawl-engine/tests/region/repair.test.ts`: every proposed coast hex has at least one water-or-undecided neighbour and one land-or-undecided neighbour (FR-009); proposed water never sits directly beside non-coast land when coast is allowed; with coast at `none` no coast is proposed and the pass still ends; every proposed mountains hex has at least one hills-or-mountains-or-undecided neighbour, and becomes hills (or the nearest allowed terrain when hills is at `none`) when it does not (FR-009a); fixed hexes are never changed; the pass runs at most twice
- [x] T038 [P] [US2] Add preset and level cases to `packages/hex-crawl-engine/tests/region/generate.test.ts`: over the open fixture, Arid proposes more desert than Temperate and Frozen more tundra; setting a terrain to More raises and to Less lowers its share; a terrain at `none` is never proposed while fixed hexes of that terrain still act as neighbours (FR-010a)
- [x] T039 [P] [US2] Write `apps/web/src/lib/components/map/hex-crawl/region/RegionSettings.test.ts`: the preset select lists Temperate, Coastal, Highlands, Arid and Frozen with Temperate chosen by default; Customise is closed by default and lists nine terrains each with None, Less, Normal, More; changing a preset or level calls `setPreset` or `setLevel` (FR-010)
- [x] T040 [P] [US2] Add settings cases to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.test.ts`: `setPreset` and `setLevel` produce a new proposal with the same seed and make no `applyChange` call (FR-010b); setting every terrain to None sets `message` and keeps the previous proposal (FR-010a)

### Implementation for User Story 2

- [x] T041 [US2] Add anchoring to `packages/hex-crawl-engine/src/region/generate.ts`: fixed standard terrain within 2 hexes pulls a target's height and wetness towards that terrain's nominal point, weighted by distance; custom terrain is ignored as an anchor (research D1) (T036)
- [x] T042 [US2] Implement the repair pass (coast rule FR-009 and mountains rule FR-009a) in `packages/hex-crawl-engine/src/region/repair.ts` and call it from `generate.ts`; undecided and off-map neighbours count as "could be either" (research D3) (T037)
- [x] T043 [US2] Tune the preset tables in `packages/hex-crawl-engine/src/region/presets.ts` until T036 and T038 pass for every fixture seed
- [x] T044 [P] [US2] Create `apps/web/src/lib/components/map/hex-crawl/region/RegionSettings.svelte` and mount it in `RegionReviewBar.svelte` (T039)
- [x] T045 [US2] Add `setPreset` and `setLevel` to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts` (T040)
- [x] T046 [US2] Extend the help section in `apps/web/src/lib/content/help/hex-crawl-mode.md` with presets, Customise levels, and a plain-language note that the landscape follows simple tunable rules and is not a climate simulation (FR-012)

**Checkpoint**: Proposals look like geography and meet existing terrain cleanly.

---

## Phase 5: User Story 3 - Same seed, same landscape (Priority: P1)

**Goal**: The seed is visible, copyable and editable; the same seed and inputs always give the same proposal; Reroll gives a new one.

**Independent Test**: Generate twice with one seed and compare; reroll; type a seed (quickstart scenario 1, steps 4 to 6).

### Tests for User Story 3 ⚠️

- [x] T047 [P] [US3] Write `packages/hex-crawl-engine/tests/region/determinism.test.ts`: equal request, state and targets give deeply equal proposals over 20 runs (SC-003); a literal snapshot of one small proposal guards cross-device results; a different seed gives a different proposal; splitting an area into two requests, with the first applied before the second is generated, changes no hex from the first pass and gives the same terrain as a single request for every hex not next to the seam (FR-016)
- [x] T048 [P] [US3] Add seed cases to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.test.ts`: `reroll` takes a seed from `newSeed()`, replaces the proposal and makes no `applyChange` call; `setSeed` with a valid seed shows that seed's proposal; `setSeed` with empty or over-long text keeps the proposal and sets `message`; after `accept` the seed and settings are written to storage under `codex-hex-region:<mapId>`; `open` on that map starts from them; unreadable storage falls back to a new seed and Temperate; a null storage does not throw (FR-013, FR-015)
- [x] T049 [P] [US3] Add seed cases to `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.test.ts`: the seed is shown in an editable field; Copy writes it to the clipboard; submitting a typed seed calls `setSeed`; Reroll calls `reroll` (FR-013, FR-015)

### Implementation for User Story 3

- [x] T050 [US3] Add `setSeed`, `reroll` and remembered seed and settings (read on `open`, written on a successful `accept`, through the injected `StorageLike`) to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts` (T048)
- [x] T051 [US3] Add the seed field, Copy (existing `ClipboardService`) and Reroll to `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.svelte` (T049)
- [x] T052 [US3] Fix any position-stability failure from T047 in `packages/hex-crawl-engine/src/region/generate.ts` or `repair.ts` so that committed hexes are treated purely as anchors

**Checkpoint**: Seeds are shareable and multi-pass results stay consistent.

---

## Phase 6: User Story 7 - Works with AI off, on any device (Priority: P1)

**Goal**: The whole flow runs with AI off and no network, says so, and is usable on a phone by touch and on desktop by keyboard.

**Independent Test**: With AI disabled and the network off, run the flow; repeat at 360 px with touch (quickstart scenarios 1 and 10).

### Tests for User Story 7 ⚠️

- [x] T053 [P] [US7] Add cases to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.test.ts`: with `fetch` stubbed to throw, `open`, `reroll`, `accept` and `undo` complete and `fetch` is never called (FR-035, SC-008); the store module imports nothing from `@codex/ai-engine`; nothing is generated or written until `open` is called, and neither `apps/web/src/lib/stores/hex-crawl/hex-crawl-move-observer.ts` nor `hex-journey.svelte.ts` imports the region store, so party movement and solo travel can never trigger generation (FR-038)
- [x] T054 [P] [US7] Add cases to `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.test.ts`: the text "Generated on this device. No AI is used." is shown (FR-036); the bar can be collapsed to one row and expanded again; focus moves to the bar when it opens; every control is reachable with Tab and Accept and Cancel work with Enter (FR-037) — Tab reachability and Enter on Accept, and Escape handling, asserted live in the Playwright spec
- [x] T055 [P] [US7] Write `packages/hex-crawl-engine/tests/region/performance.test.ts`: targets, generate and apply for a radius-12 request (469 hexes) finish within the 50 ms budget from plan.md on the test machine, following the pattern in `apps/web/src/lib/components/map/hex-crawl/hex-overlay-performance.test.ts` (supports SC-002)

### Implementation for User Story 7

- [x] T056 [US7] Add the AI-off line, the collapse control, focus on open and focus return on close to `apps/web/src/lib/components/map/hex-crawl/region/RegionReviewBar.svelte`; lay it out as a bottom sheet of at most half the viewport height below the `md` breakpoint and a side card above it, with 44 × 44 px minimum touch targets (T054)
- [x] T057 [US7] Check the phone layout by hand at 360 px with touch emulation (quickstart scenario 10) and adjust spacing in `RegionReviewBar.svelte` and `RegionSettings.svelte` so the proposal stays visible above the sheet (SC-009)

**Checkpoint**: All P1 stories are complete; the feature is shippable for Generate area.

---

## Phase 7: User Story 4 - Grow the map outward from a hex (Priority: P2)

**Goal**: Grow from this hex proposes terrain for the chosen hex, if empty, and its empty neighbours.

**Independent Test**: Grow from a hex with mixed neighbours and confirm only empty hexes get proposals and repeated growth never alters earlier hexes (quickstart scenario 4).

### Tests for User Story 4 ⚠️

- [x] T058 [P] [US4] Add `grow` cases to `packages/hex-crawl-engine/tests/region/targets.test.ts`: targets are the centre, if it has no terrain, and its empty neighbours; `radius` is ignored; neighbours off the map are left out (FR-006); `nothing-to-generate` when the centre and all neighbours have terrain (FR-003)
- [x] T059 [P] [US4] Add a multi-pass `grow` case to `packages/hex-crawl-engine/tests/region/determinism.test.ts`: three grow passes from neighbouring hexes, each applied before the next, never change an earlier hex and leave no invalid coast (FR-016)
- [x] T060 [P] [US4] Add cases to `RegionGenerateMenu.test.ts` and `RegionReviewBar.test.ts` in `apps/web/src/lib/components/map/hex-crawl/region/`: the menu offers Grow from this hex and calls `open(mapId, "grow", hex)`; the review bar hides the radius stepper for `grow`; the "nothing to generate" message is shown when the store refuses

### Implementation for User Story 4

- [x] T061 [US4] Add the `grow` operation to `selectRegionTargets` in `packages/hex-crawl-engine/src/region/targets.ts` using `getHexNeighbors` (T058)
- [x] T062 [US4] Add the Grow from this hex choice to `apps/web/src/lib/components/map/hex-crawl/region/RegionGenerateMenu.svelte` and hide the radius stepper for `grow` in `RegionReviewBar.svelte` (T060)
- [x] T063 [US4] Add Grow from this hex to the help section in `apps/web/src/lib/content/help/hex-crawl-mode.md`, including that growing step by step with the same seed gives one continuous landscape

**Checkpoint**: The map can be extended a hex at a time.

---

## Phase 8: User Story 5 - Fill the gaps between established areas (Priority: P2)

**Goal**: Fill gaps proposes terrain only for enclosed holes and for corridors up to 4 hexes wide between established terrain.

**Independent Test**: With two areas separated by a narrow strip, a wide strip and an enclosed hole, confirm only the narrow strip and the hole get proposals (quickstart scenario 5).

### Tests for User Story 5 ⚠️

- [x] T064 [P] [US5] Add `gaps` cases to `packages/hex-crawl-engine/tests/region/targets.test.ts`: an empty hex fully surrounded by terrain is a target; a hole of any size that cannot be reached from the ring outside the radius through empty on-map hexes is a target; a hole against the map edge is a target (off-map counts as a wall); empty runs of length 1, 2, 3 and 4 along each of the three hex axes with terrain at both ends are targets; a run of 5 is not; open country beside a single area is not; `nothing-to-generate` when there are no gaps; custom terrain counts as established terrain (FR-004)
- [x] T065 [P] [US5] Add cases to `RegionGenerateMenu.test.ts` in `apps/web/src/lib/components/map/hex-crawl/region/`: the menu offers Fill gaps and calls `open(mapId, "gaps", hex)`

### Implementation for User Story 5

- [x] T066 [US5] Add the `gaps` operation to `packages/hex-crawl-engine/src/region/targets.ts`: flood fill from the ring just outside the radius for enclosure, and run-length checks along the three axes bounded by `GAP_CORRIDOR_MAX` for corridors (research D6) (T064)
- [x] T067 [US5] Add the Fill gaps choice to `apps/web/src/lib/components/map/hex-crawl/region/RegionGenerateMenu.svelte` (T065)
- [x] T068 [US5] Add Fill gaps to the help section in `apps/web/src/lib/content/help/hex-crawl-mode.md`, stating in plain words what counts as a gap and that open country is left alone

**Checkpoint**: Separate areas can be joined into one landscape.

---

## Phase 9: User Story 6 - Adjust a proposal and regenerate generated terrain safely (Priority: P2)

**Goal**: The GM can change individual proposed hexes before accepting, regenerate previously generated terrain with a clear impact preview, and undo the last accepted region once.

**Independent Test**: Adjust one hex and accept; regenerate over a mix of generated and hand-set hexes and confirm only generated ones are offered, with counts; undo (quickstart scenarios 6 and 8).

### Tests for User Story 6 ⚠️

- [x] T069 [P] [US6] Add `regenerate` cases to `packages/hex-crawl-engine/tests/region/targets.test.ts`: targets are the hexes within `radius` whose terrain has `generated`; hand-set terrain and terrain without provenance are counted as `protected` (FR-019, FR-021); `nothing-to-generate` when no hex in range is generated
- [x] T070 [P] [US6] Add `regenerate` cases to `packages/hex-crawl-engine/tests/region/generate.test.ts`: `changes` lists exactly the targets whose proposed terrain differs from their current terrain; `exploredChanges` is the explored subset (FR-020, FR-020a); a target regenerated with its own stored seed and unchanged surroundings is not in `changes`
- [x] T071 [P] [US6] Add cases to `packages/hex-crawl-engine/tests/region/apply.test.ts`: an adjusted hex is saved with the adjusted terrain and no `generated` (FR-022); for `regenerate`, a target whose terrain is no longer generated, or whose `updatedAt` differs from `proposal.stamps`, is skipped (FR-027); a regenerated explored hex keeps `explored`, `exploredAt`, `notes` and `draft` (FR-017); `undoRegion` restores every hex in `undo.before` exactly, removing records that did not exist before, including terrain replaced by a regeneration (FR-028a); `undoRegion` returns null and changes nothing when any stamped hex has a different `updatedAt` (FR-028b)
- [x] T072 [P] [US6] Add cases to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.test.ts`: `adjust(hex, terrain)` records an adjustment only for a hex in the proposal and `adjust(hex, null)` removes it; adjustments on hexes still in the proposal survive `setRadius`, `setPreset` and `setLevel` and are cleared by `reroll`; `undoAvailable` is true after a successful `accept`; `undo` makes one `applyChange` call and restores the prior records; `undoAvailable` becomes false when `revision` changes through another write and on `leave`; when the engine refuses the undo it is withdrawn and `message` explains; a failed undo save leaves the map as accepted and reports it
- [x] T073 [P] [US6] Add cases to `RegionGenerateMenu.test.ts`, `RegionReviewBar.test.ts` and `RegionProposalOverlay.test.ts` in `apps/web/src/lib/components/map/hex-crawl/region/`: the menu offers Regenerate and calls `open(mapId, "regenerate", hex)`; for `regenerate` the bar shows "N will change" and, when above zero, "N explored hexes will change"; adjusted hexes are drawn with a solid outline; hexes in `exploredChanges` carry a warning mark; the bar's **Adjust a hex** field opens the terrain picker for a typed hex label that is in the proposal and shows a message for one that is not (FR-037)
- [x] T074 [P] [US6] Write `apps/web/src/lib/components/map/hex-crawl/region/RegionUndoBar.test.ts`: shown only while `undoAvailable` is true; Undo calls `undo`; hidden for non-GMs
- [x] T075 [P] [US6] Add cases to `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.test.ts`: while a review is open, tapping a proposed hex opens the terrain picker for that hex and choosing a terrain calls `adjust`; the undo bar mounts after accept

### Implementation for User Story 6

- [x] T076 [US6] Add the `regenerate` operation to `packages/hex-crawl-engine/src/region/targets.ts` (T069)
- [x] T077 [US6] Compute `changes` and `exploredChanges` for `regenerate` in `packages/hex-crawl-engine/src/region/generate.ts` (T070)
- [x] T078 [US6] Add adjustments, the `regenerate` skip rule and `undoRegion` to `packages/hex-crawl-engine/src/region/apply.ts`; export `undoRegion` from `src/index.ts` (T071)
- [x] T079 [US6] Add `adjust`, `undo`, `undoAvailable` (tracking `HexCrawlStore.revision` and the open map) and undo cleanup in `leave` to `apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts` (T072)
- [x] T080 [P] [US6] Add the Regenerate choice to `RegionGenerateMenu.svelte`, the change counts and the **Adjust a hex** label field (reusing the label parsing in `HexGoTo.svelte`) to `RegionReviewBar.svelte`, and the adjusted outline and explored warning mark to `RegionProposalOverlay.svelte` in `apps/web/src/lib/components/map/hex-crawl/region/` (T073)
- [x] T081 [P] [US6] Create `apps/web/src/lib/components/map/hex-crawl/region/RegionUndoBar.svelte` (T074)
- [x] T082 [US6] Route taps on proposed hexes to the existing `HexTerrainPicker` and mount `RegionUndoBar` in `apps/web/src/lib/components/map/hex-crawl/HexCrawlLayer.svelte` (T075)
- [x] T083 [US6] Add adjusting a proposal, Regenerate (what is protected, the explored warning) and the one-step Undo with its limits to the help section in `apps/web/src/lib/content/help/hex-crawl-mode.md`

**Checkpoint**: All seven user stories are complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Help completeness, first-use guidance and final validation.

- [x] T084 [P] Register a `FeatureHint` for the Generate region control in `apps/web/src/lib/config/help-content.ts` and show it once from `apps/web/src/lib/components/map/hex-crawl/region/RegionGenerateMenu.svelte`, with a test that it is shown once and can be dismissed
- [x] T085 [P] Review the finished "Generating a region" section in `apps/web/src/lib/content/help/hex-crawl-mode.md` against FR-039 (the operations, the seed, what is protected, how to regenerate) and for plain British English; check whether `packages/help-engine` lists Hex Crawl capabilities individually and, if so, add Generate region there
- [x] T086 [P] Add a round-trip test in `packages/hex-crawl-engine/tests/region/apply.test.ts`: a state with generated hexes survives `JSON.stringify`, `JSON.parse` and `normalizeHexCrawlState` with terrain and `generated` intact, and regenerating afterwards still targets those hexes (SC-007) (FR-031)
- [x] T087 Confirm coverage for `packages/hex-crawl-engine/src/region/` is at or above 70% (`cd packages/hex-crawl-engine && bun test --coverage tests/region`) and add tests for any uncovered branch
- [x] T088 Run the impacted-only gates from the repository root: `bun scripts/lint-changed.mjs --base origin/staging`, `bun scripts/test-changed.mjs --base origin/staging`, `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` in `apps/web`, and `bunx fallow audit --format json --quiet --explain --gate-marker agent`; fix every finding
- [x] T089 Run every scenario in `specs/4659-hex-region-generation/quickstart.md` in the live app with AI off and record the result of each in the pull request description — run live in a browser with AI off by apps/web/tests/hex-region-generation.spec.ts: scenarios 1 (cancel, accept, reload), 2, 3 (hand-set terrain), 4, 5, 6, 7, 8, 9, 10 and 11. Re-entering a typed seed and checking notes, pins and discoveries on protected hexes are covered by unit tests only
- [x] T090 Run the `codex-review` specialist review on the branch and resolve its findings before opening the pull request — separate reviewer agent run; findings fixed, see PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. Blocks every user story.
- **US1 (Phase 3)**: depends on Foundational. The MVP.
- **US2 (Phase 4)**: depends on US1 (`generate.ts` and the review bar exist).
- **US3 (Phase 5)**: depends on US1; its position-stability test is most meaningful after US2.
- **US7 (Phase 6)**: depends on US1 (review bar and store).
- **US4 (Phase 7)** and **US5 (Phase 8)**: each depends on US1 only, and are independent of each other.
- **US6 (Phase 9)**: depends on US1; the settings cases in T072 depend on US2.
- **Polish (Phase 10)**: after the stories being shipped.

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬→ US2 ─┬→ US3
                            │       └→ US6
                            ├→ US7
                            ├→ US4
                            └→ US5
```

### Within Each User Story

- Tests are written first and seen to fail.
- Engine before store, store before components, components before layer wiring.
- Help text is updated in the same phase as the behaviour it describes.

### Parallel Opportunities

- Phase 2: T003 to T008 together; then T010, T011, T012 and T015 together.
- US1: T016 to T024 together; then T030, T031 and T032 together once T028 exists.
- US2: T035 to T040 together.
- US4 and US5 can be built at the same time by different people, as can US7.
- Files shared across stories (`targets.ts`, `generate.ts`, `apply.ts`, `region-generation.svelte.ts`, `RegionReviewBar.svelte`, `RegionGenerateMenu.svelte`, `HexCrawlLayer.svelte`, `hex-crawl-mode.md`) are edited in story order; tasks touching the same file are never marked [P] against each other.

---

## Parallel Example: User Story 1

```bash
# Tests first, all in different files:
T016 targets.test.ts          T017 generate.test.ts        T018 apply.test.ts
T019 region-generation.svelte.test.ts
T020 RegionGenerateMenu.test.ts   T021 RegionReviewBar.test.ts   T022 RegionProposalOverlay.test.ts
T023 HexCrawlLayer.test.ts    T024 GuestExporter test

# Then engine in order: T025 → T026 → T027, then the store T028 → T029
# Then the three components together:
T030 RegionGenerateMenu.svelte    T031 RegionReviewBar.svelte    T032 RegionProposalOverlay.svelte
# Then wiring and help: T033, T034
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2.
2. Phase 3 (US1): Generate area with default settings, preview, accept, cancel, safe save.
3. **Stop and validate** with quickstart scenarios 1, 3 and 9.

US1 alone is usable but its terrain is only as coherent as raw noise. Ship to users after US2, US3 and US7, which complete the P1 set.

### Incremental Delivery

1. Setup + Foundational → provenance and the atomic write are in place.
2. US1 → Generate area works end to end.
3. US2 → coherent landscape, presets and levels.
4. US3 → seeds, reroll, remembered seed; multi-pass consistency proven.
5. US7 → AI-off statement, phone layout, performance. **First release point (all P1).**
6. US4, US5 → Grow and Fill gaps.
7. US6 → adjust, regenerate, undo. **Second release point.**
8. Polish.

### Parallel Team Strategy

After US1: one person takes US2 then US3 (engine-heavy), another takes US7 then US4 and US5 (UI and target rules). US6 follows once US2 is merged.

---

## Notes

- Every task names its file. Test tasks name the requirement they prove.
- Any change that alters output for an existing seed after first release must raise `REGION_RULES_VERSION` (contracts/region-engine-api.md).
- Do not run repository-wide test, lint or type-check commands; use the impacted-only commands in T088.
- `HexCrawlPanel.svelte` must stay under 500 lines; it gains one child component only.
