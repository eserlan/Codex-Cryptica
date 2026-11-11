# Research: Generate Region for Hex Crawl Maps

**Feature**: `4659-hex-region-generation` | **Date**: 2026-11-11

Decisions that shape the design. Each records what was chosen, why, and what was set aside. There were no open `NEEDS CLARIFICATION` items after `/speckit-clarify`; these are the plan-level choices the spec left to planning.

## What the existing code already gives us

Read before designing, so that nothing is rebuilt:

- **Atomic save with rollback exists.** `HexCrawlStore.commit` (`apps/web/src/lib/stores/hex-crawl/hex-crawl.svelte.ts`) applies one state change, saves once through `saveMaps`, and restores the previous state if the save fails or returns `false`. A region written as a single state change therefore already meets "all or nothing" (FR-026). It is private today.
- **Sparse records exist.** `upsertHexRecord` and `pruneHexRecord` (`packages/hex-crawl-engine/src/model.ts`) keep a record only while it holds something (FR-032).
- **Guests never receive hex data.** `GuestExporter` drops `hexCrawl` from every map, so provenance added to a hex record is private with no extra work (FR-034).
- **The map schema does not constrain hex records.** `MapSchema.hexCrawl.hexes` is `z.record(z.string(), z.unknown())`; records are validated by `HexRecordSchema` in the engine. A new optional field needs no change in `packages/schema` and no migration (FR-033).
- **Hex geometry exists.** `map-engine` exports `getHexNeighbors`, `getHexRange`, `hexDistance`, `hexToPoint` and `getHexCorners`.
- **Only single-hex selection exists** (`HexCrawlStore.selectedHex`), which is why the spec settled on centre plus radius.
- **There is no seeded random generator in production code.** Existing engines take live randomness.
- **No map-bounds helper exists.** A map has pixel `dimensions` and a grid config; nothing yet answers "is this hex on the map".

## D1. How terrain is generated: seeded fields, anchored to existing terrain

**Decision**: Each hex gets two numbers, a **height** and a **wetness**, from smooth seeded noise over the hex's position. Every standard terrain has a nominal point in that height and wetness space. A hex is given the terrain whose nominal point is nearest, scaled by that terrain's weight. Existing terrain within 2 hexes acts as an **anchor** that pulls the hex's height and wetness towards the anchor's nominal point, more strongly the closer it is. A final repair pass enforces the coast rule (D3).

**Rationale**:

- Smooth noise gives clustering for free: nearby hexes have similar values, so they get similar terrain (FR-007, SC-004).
- Plausible transitions fall out of the layout of nominal points: water, coast, lowland, hills and mountains sit in order along height, so hills appear between lowland and mountains without a special rule.
- The value for a hex depends only on the seed, the settings, the hex's position and nearby fixed terrain. It does **not** depend on which other hexes are in the same request or the order they are processed. That is what makes multi-pass growth safe: a hex generated in pass two gets the value it would have had in pass one, and hexes committed earlier are anchors it must fit (FR-014, FR-016).
- Anchoring is what makes a proposal meet hand-set terrain without a hard edge (FR-008).

"Height" and "wetness" are tuning dials for a plausible look. They are not elevation or rainfall data, are never stored and are never shown to the GM (FR-012).

**Alternatives considered**:

- _Sequential neighbour-weighted rolls_ (roll each hex from weights adjusted by already-decided neighbours). Rejected: the result depends on processing order and on which hexes share a request, so growing in two passes gives a different landscape from one pass, and boundary consistency needs extra machinery.
- _Wave function collapse / constraint solving_. Rejected: far more code, can fail to find a solution, and is hard to explain in the plain-language rules the spec requires.
- _Region seeds with flood growth_ (drop terrain seeds and grow blobs). Rejected: blobs depend on the request area, with the same multi-pass problem.

## D2. Seeded randomness and cross-device repeatability

**Decision**: Add a small seeded hash and value-noise module to `hex-crawl-engine` (`region/noise.ts`, `region/seed.ts`). A seed is a short text string (for example `K7Q2-9FXM`), normalised to upper case and hashed to a 32-bit number. Lattice values come from an integer hash of (seed, lattice x, lattice y, channel); values between lattice points are blended with a polynomial smoothstep. Two octaves per channel. Only integer operations and `+ - * /` are used: no `Math.random`, no `Math.sin`/`Math.cos`, no reliance on object key order.

New seeds are produced by the web layer through an injected `newSeed()` (backed by `crypto.getRandomValues`), so the engine itself contains no source of randomness.

**Rationale**: FR-014 and SC-003 require identical results on every device. Trigonometric functions are not guaranteed to round identically across JavaScript engines; integer hashing and basic arithmetic are. Hashing by position rather than drawing from a running stream is what D1 needs.

**Alternatives considered**:

- _Add `seedrandom` or `simplex-noise`_. Rejected: a new third-party dependency for under 100 lines, and stream generators do not give position-stable values. Constitution III favours libraries for solved problems; here the need (position-hashed, arithmetic-only) is specific and small. Recorded under Complexity Tracking in the plan.
- _Reuse `random-source-engine` / `dice-engine`_. Rejected: both draw live randomness and have no seed.

## D3. The coast rule and other hard rules

**Decision**: After classification, a deterministic repair pass runs over the proposed hexes in fixed order (sorted by `q`, then `r`):

1. A proposed **coast** hex must have at least one water neighbour and at least one land neighbour. If it does not, it is reclassified without coast.
2. A proposed **water** hex next to land (other than coast) becomes coast, when coast is allowed by the settings.
3. A proposed land hex next to fixed water, where that land is not coast, becomes coast when coast is allowed.
4. A proposed **mountains** hex must have at least one hills or mountains neighbour. If it does not, it becomes hills, or the nearest allowed terrain when hills is set to None (FR-009a).

Neighbours that are **undecided** (empty hexes outside the request) or **off the map** count as "could be either", so a coast at the edge of a request is valid if it could still be completed by later growth. Fixed hexes are never changed by repair. The pass runs twice at most; it cannot loop.

**Rationale**: FR-009 is a hard rule and noise alone does not guarantee it. Treating undecided neighbours as wildcards keeps FR-016 intact: a later pass sees the committed coast as an anchor and the noise field places water or land beside it.

**Spec aligned**: FR-009 and FR-009a now state the rim rule: a still-empty or off-map neighbour counts as able to become either. The spec's Story 2 scenario 4 already allows for missing neighbours ("where a coast hex is available").

**Alternatives considered**: _Strict check with no wildcards_. Rejected: coast could never appear on the rim of a region, giving visible rings where passes meet.

## D4. Terrain settings: presets and levels

**Decision**: A preset is a data table: a nominal height and wetness point and a base weight for each of the nine standard terrains, plus small biases on the height and wetness fields. Five presets ship: Temperate (default), Coastal, Highlands, Arid, Frozen. A per-terrain level multiplies the weight: Less ×0.5, Normal ×1, More ×2. None removes the terrain from classification. Starting values are tuned during implementation against the seeded fixtures; the tables live in one data-only module (`region/presets.ts`).

If every terrain is None, the request is refused before any work (FR-010a).

**Rationale**: One mechanism (weighted nearest point) serves presets, levels and None. It keeps the rules explainable: "each terrain has a place on the height and wetness chart; More makes its patch of the chart bigger."

**Alternatives considered**: _Raw numeric weights in the UI_. Rejected in clarification (Q4).

## D5. Provenance on a hex

**Decision**: Add one optional field to `HexRecord`: `generated?: { seed: string; rules: number }`. `rules` is the generation rules version (`REGION_RULES_VERSION`, starting at 1).

- `upsertHexRecord` clears `generated` whenever a patch sets `terrain` without also setting `generated`. Every existing terrain writer (the terrain picker, any future one) therefore turns a hex hand-set without knowing about this feature (FR-022).
- `HexRecordSchema` reads `generated` defensively: a malformed value is dropped, the hex is kept (existing "never throws" rule).
- `generated` alone does not keep a record alive; terrain does.
- Settings are **not** stored per hex (spec Assumptions).

**Rationale**: Smallest additive change. Absent means hand-set (FR-021), so old data is protected by default.

**Older app versions**: an older client strips unknown fields when it normalises and saves. If such a client edits the map, provenance is lost for that map and the terrain becomes hand-set. That is the safe direction (more protection, no data loss) and is accepted.

**Alternatives considered**: _A per-map list of generation runs_. Rejected: a second place to keep in step with hexes, and the spec asks for minimal metadata.

## D6. Which hexes a request covers

**Decision**: A pure function, `selectRegionTargets`, turns an operation into a list of target hexes and a count of protected ones. All operations take a centre hex, and all are limited to hexes on the map.

| Operation    | Candidates                      | Targets                                        |
| ------------ | ------------------------------- | ---------------------------------------------- |
| `area`       | Hexes within `radius` of centre | Those with no terrain                          |
| `grow`       | Centre and its six neighbours   | Those with no terrain                          |
| `gaps`       | Hexes within `radius` of centre | Those with no terrain that are a gap (below)   |
| `regenerate` | Hexes within `radius` of centre | Those whose terrain has `generated` provenance |

"No terrain" means the record has no `terrain`; a hex with only notes or an Explored flag is still a target, and only its terrain is written.

**Gap rule** (refines FR-004; see the note below). An empty on-map hex is a gap if either:

- **Enclosed**: it cannot be reached from the ring just outside the radius by stepping through empty on-map hexes. Off-map positions count as walls, so a hole against the map edge is enclosed.
- **Corridor**: along one of the three hex axes, the unbroken run of empty hexes containing it is at most 4 long and has a hex with terrain at both ends.

**Note for review (spec wording fixed)**: clarification Q2 described corridors as "established terrain within 2 hexes on opposite sides (strips up to 4 hexes wide)". Those two phrasings disagree: in a strip 4 wide, the second hex is 2 from one side and 3 from the other. The plan keeps the user-visible promise, **strips up to 4 wide**, and defines it by run length. FR-004 in the spec has been reworded to match.

**On-map test**: a hex is on the map when its centre point lies inside the map's pixel rectangle. The web layer supplies this as an `inBounds` predicate built from `map.dimensions` and the active grid config; the engine does not know about pixels.

**Size**: radius is 1 to 12, so no request exceeds 469 hexes (`REGION_MAX_HEXES`). The engine still checks the count and refuses above it.

## D7. Preview state lives in a new store, not in the map

**Decision**: A new `RegionGenerationStore` (`apps/web/src/lib/stores/hex-crawl/region-generation.svelte.ts`) holds the open request, the current proposal, the GM's adjustments and the one-step undo token. None of it is written to the map, synced or exported (FR-025, FR-028). `HexCrawlStore` gains one small public method, `applyChange(mapId, change)`, which exposes the existing atomic commit, and a `revision` counter that goes up on every successful write.

**Rationale**: Keeps `HexCrawlStore` to its one job (read and write hex data) per Constitution XIV, and makes "cancel changes nothing" true by construction: the map is never touched until accept.

**Alternatives considered**: _Store the proposal as a draft on the map_ (as discovery drafts are). Rejected: it would sync to other devices and need pruning, against FR-028 and the spec's "proposals are not synced".

## D8. Accept, skip and undo

**Decision**:

- **Accept** re-reads the map's current hex state and calls the pure `applyRegionProposal`. For `area`, `grow` and `gaps`, any proposed hex that now has terrain is skipped. For `regenerate`, any hex whose terrain is no longer generated, or whose record changed since the proposal was made (`updatedAt` differs), is skipped. The result is written in one `applyChange`. The number skipped is reported (FR-027).
- Hexes the GM adjusted in the preview are saved without `generated` (hand-set).
- **Undo** keeps, in memory only, each affected hex's record from before the accept and the `updatedAt` stamp the accept wrote. `undoRegion` restores all of them in one `applyChange`, and returns nothing if any affected hex no longer carries its stamp (FR-028b).
- Undo is offered while `HexCrawlStore.revision` still equals the value recorded at accept and the same map is open. It is cleared on any further hex write, on map switch, on leaving and on reload.

**Spec aligned**: FR-028b now says undo is withdrawn by any further change to the map's **hex data**, by leaving the map or by reloading. Edits to pins or fog go through other stores and cannot affect what undo restores, so they do not withdraw it.

**Rationale**: Reuses per-hex `updatedAt`, which already exists, as the change detector for both the sync race and undo safety.

## D9. Seed and settings remembered per map on the device

**Decision**: The last seed, preset and levels used on a map are kept in `localStorage` under `codex-hex-region:<mapId>` through the injected `StorageLike`. Opening Generate Region on that map starts from them; a map with nothing remembered starts with a new seed and Temperate.

**Rationale**: Growing a map hex by hex only gives one continuous landscape if each pass uses the same seed and settings (D1). Remembering them makes the good behaviour the default. Reroll still gives a new seed.

**Spec aligned**: the spec's Assumptions now say the last seed and settings are remembered.

## D10. Where it appears in the app

**Decision**: The entry point is the existing hex panel. With a hex open, the GM sees a **Generate region** control with four choices: Grow from this hex, Generate area, Fill gaps, Regenerate. Choosing one closes the panel and opens a review bar: a bottom sheet on phones, a side card on wider screens.

- The review bar shows: the operation, a radius stepper with the live hex count (not for Grow), the seed with copy and edit, Reroll, the preset, a Customise disclosure, the counts (to generate, protected, explored that would change), the line "Generated on this device. No AI is used.", and Accept and Cancel.
- Proposed hexes are drawn by a new `RegionProposalOverlay` as tinted hex shapes with a dashed outline and the terrain icon, so they read without a base image and are distinct from saved terrain (FR-023). Explored hexes that would change carry a warning mark (FR-020a).
- While a review is open, tapping a proposed hex opens the existing terrain picker for that hex; the choice is recorded as an adjustment. Tapping elsewhere does nothing, so a stray tap cannot open another hex panel mid-review.
- For keyboard use, the review bar has an **Adjust a hex** field that takes a hex label (reusing `HexGoTo`'s label parsing) and opens the same terrain picker (FR-037).
- After accept, a small bar offers Undo.

New components live in `apps/web/src/lib/components/map/hex-crawl/region/`. `HexCrawlPanel.svelte` (401 lines) gains only the entry control and stays under the 500-line review trigger; `HexCrawlLayer.svelte` (231 lines) gains the overlay, the review bar and click routing.

**Rationale**: Reuses the hex panel, the single-hex selection and the terrain picker. Putting the review in its own bar keeps the map visible while reviewing (SC-009, Story 7 scenario 3).

## D11. Performance

**Decision**: Generate synchronously on the main thread. 469 hexes × 2 channels × 2 octaves is a few thousand hash and blend operations, well under a millisecond-scale budget; no worker is needed. The proposal overlay draws at most 469 shapes, below the existing overlay cap of 2,000 items. A performance test asserts the largest request generates within a set budget, following `hex-overlay-performance.test.ts`.

## D12. Help

**Decision**: Add a "Generating a region" section to `apps/web/src/lib/content/help/hex-crawl-mode.md` covering the four operations, the seed, presets and levels, what is protected, regeneration and the explored warning, and undo (FR-039). Add a first-use `FeatureHint` on the Generate region control, registered in `apps/web/src/lib/config/help-content.ts`. Update `packages/help-engine` feature knowledge only if the registry lists Hex Crawl capabilities individually.
