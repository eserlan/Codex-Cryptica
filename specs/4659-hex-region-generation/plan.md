# Implementation Plan: Generate Region for Hex Crawl Maps

**Branch**: `4659-hex-region-generation` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/4659-hex-region-generation/spec.md`

## Summary

Add an optional **Generate Region** action to Hex Crawl maps. From an open hex the GM chooses Grow from this hex, Generate area, Fill gaps or Regenerate; the app proposes coherent terrain for the eligible hexes, shows it on the map, and saves nothing until the GM accepts. It runs on the device with AI off.

Technical approach (see [research.md](./research.md)):

- A new `region/` module in `packages/hex-crawl-engine`. Terrain comes from two seeded, position-hashed noise fields (height and wetness), anchored to existing terrain within 2 hexes, classified against per-preset terrain tables, then repaired for the coast rule. Because a hex's value depends on its position and not on the request, multi-pass growth stays consistent.
- One optional field on a hex record, `generated: { seed, rules }`. Absent means hand-set. No schema migration.
- A new `RegionGenerationStore` in `apps/web` holds the preview, adjustments and one-step undo in memory. Accept is a single atomic write through the existing `HexCrawlStore` commit path, which already rolls back on a failed save.
- New components under `components/map/hex-crawl/region/`: an entry control in the hex panel, a review bar, a proposal overlay and an undo bar.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14  
**Primary Dependencies**: Existing `hex-crawl-engine` (extended with `region/`), `map-engine` (`getHexNeighbors`, `getHexRange`, `hexDistance`, `hexToPoint`, `getHexCorners`), `zod`, the existing `HexCrawlStore`, `HexTerrainPicker`, Tailwind 4 semantic tokens, Iconify classes. No new third-party dependency.  
**Storage**: One optional additive field, `generated`, on existing hex records in `.codex/maps.json` (synced, backed up and exported with maps; removed from guest exports with the rest of `hexCrawl`). One device-local `localStorage` key, `codex-hex-region:<mapId>`. No IndexedDB, OPFS layout or migration change.  
**Testing**: `bun test` in `packages/hex-crawl-engine`; Vitest (jsdom) with Testing Library in `apps/web`. Impacted-only: `bun scripts/test-changed.mjs`, `bun scripts/lint-changed.mjs`, `svelte-check` in `apps/web`.  
**Target Platform**: Browser (desktop and phone), offline-capable, AI disabled.  
**Project Type**: Bun workspace monorepo: framework-free engine package plus SvelteKit web app.  
**Performance Goals**: A proposal for the largest request (469 hexes) is generated and drawn within 2 seconds on a typical phone (SC-002); generation itself budgeted at under 50 ms in the engine performance test.  
**Constraints**: No network call; no AI; deterministic across devices (integer hashing and basic arithmetic only); all-or-nothing save; touch and keyboard operable at 360 px wide.  
**Scale/Scope**: At most 469 hexes per request (radius 1 to 12). Roughly 8 small engine files, 1 store, 5 components, 1 help section.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Status         | Notes                                                                                                                                                                                 |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First           | PASS           | All generation logic is in `packages/hex-crawl-engine/src/region/`. The web app holds only preview state and UI.                                                                      |
| II. TDD                    | PASS           | Engine and store are specified by contracts with guarantees; tests are written first, each with a success and a failure or cancellation path.                                         |
| III. Simplicity & YAGNI    | PASS, one note | No new dependency, no stored region entity, no history, no worker. The seeded noise is written in-house; see Complexity Tracking.                                                     |
| IV. AI-First Extraction    | N/A            | The feature is deliberately AI-free (FR-035).                                                                                                                                         |
| V. Privacy & Client-Side   | PASS           | Everything runs on the device. Nothing new leaves it. The opt-in remote storage exception is not invoked: provenance travels only inside existing map data on the existing sync path. |
| VI. Clean Implementation   | PASS           | Style guide patterns, Runes, semantic tokens, impacted-only validation.                                                                                                               |
| VII. User Documentation    | PASS           | Help section and `FeatureHint` planned (research D12).                                                                                                                                |
| VIII. Dependency Injection | PASS           | `RegionGenerationStore` takes its dependencies in the constructor; a default is built in `hex-crawl-services.svelte.ts`.                                                              |
| IX. Natural Language       | PASS           | "Generate region", "Grow from this hex", "Fill gaps", "Regenerate", "protected", "Generated on this device. No AI is used."                                                           |
| X. Coverage                | PASS           | New engine code targets 70% or more; the store 50% or more.                                                                                                                           |
| XI. Agent Protocol         | PASS           | Surgical: two existing engine files, two existing components and one existing store are touched.                                                                                      |
| XII. Labels over Tags      | N/A            | No categorisation metadata.                                                                                                                                                           |

### Discovery Intent Check

N/A. No public, indexable discovery page is added or repositioned.

### Bounded Responsibility Check

- [x] Files this feature will touch that already exceed 500 lines are listed, excluding tests and data-only modules. **None.** Largest touched: `HexCrawlPanel.svelte` (401), `HexCrawlLayer.svelte` (231), `hex-crawl.svelte.ts` (182), `model.ts` (152).
- [x] For each, either the single responsibility it still holds is named, or a decomposition is planned as part of this work. N/A; none over the trigger. `HexCrawlPanel.svelte` gains one child component only, so it stays under 500.
- [x] New behaviour that does not belong to a listed file's existing responsibility has an extraction target. Generation → `hex-crawl-engine/src/region/`. Preview state → new `RegionGenerationStore`, not `HexCrawlStore`. UI → new `region/` components, not the panel.
- [x] Any planned split carries its tests across, or gains its own. No split planned.

### User Help Check

- [x] A help article or description is planned: a "Generating a region" section in `apps/web/src/lib/content/help/hex-crawl-mode.md`.
- [x] Help content explains what users can do, how to find and use the feature, and prerequisites and limits (Hex Crawl on, GM only, radius limit, what is protected, undo is one step).
- [x] A `FeatureHint` on the Generate region control, registered in `apps/web/src/lib/config/help-content.ts`.

**Post-design re-check**: PASS. Phase 1 added no dependency, no stored entity and no file over the size trigger.

## Project Structure

### Documentation (this feature)

```text
specs/4659-hex-region-generation/
├── plan.md              # This file
├── research.md          # Phase 0: decisions D1 to D12
├── data-model.md        # Phase 1: stored field, in-memory types, lifecycle
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── region-engine-api.md      # hex-crawl-engine region API and guarantees
│   └── region-store-and-ui.md    # store behaviour and UI contract
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/hex-crawl-engine/
├── src/
│   ├── model.ts                 # CHANGE: HexRecord.generated; upsert clears it on hand edit
│   ├── index.ts                 # CHANGE: export region/*
│   └── region/                  # NEW
│       ├── types.ts             # RegionRequest, RegionSettings, RegionProposal, RegionUndo, constants
│       ├── seed.ts              # normalizeSeed, formatSeed, seed → 32-bit hash
│       ├── noise.ts             # position-hashed value noise (height, wetness)
│       ├── presets.ts           # data only: five presets, terrain points, level multipliers
│       ├── settings.ts          # normalizeRegionSettings, availableTerrains
│       ├── targets.ts           # selectRegionTargets, gap rule
│       ├── generate.ts          # anchoring, classification, proposal assembly
│       ├── repair.ts            # coast rule
│       └── apply.ts             # applyRegionProposal, undoRegion
└── tests/region/                # NEW: one test file per module, plus fixtures and determinism

apps/web/src/lib/
├── stores/hex-crawl/
│   ├── hex-crawl.svelte.ts              # CHANGE: revision, public stateFor and applyChange
│   ├── region-generation.svelte.ts      # NEW
│   └── region-generation.svelte.test.ts # NEW
├── components/map/hex-crawl/
│   ├── HexCrawlPanel.svelte             # CHANGE: mount RegionGenerateMenu
│   ├── HexCrawlLayer.svelte             # CHANGE: overlay, review bar, undo bar, tap routing, leave()
│   ├── hex-crawl-services.svelte.ts     # CHANGE: build RegionGenerationStore
│   ├── hex-crawl-view.ts                # CHANGE: hexOnMap(dimensions, gridConfig) helper
│   └── region/                          # NEW (each with a test)
│       ├── RegionGenerateMenu.svelte
│       ├── RegionReviewBar.svelte
│       ├── RegionSettings.svelte
│       ├── RegionProposalOverlay.svelte
│       └── RegionUndoBar.svelte
├── content/help/hex-crawl-mode.md       # CHANGE: "Generating a region"
└── config/help-content.ts               # CHANGE: FeatureHint
```

**Structure Decision**: Extend the existing `hex-crawl-engine` package with a `region/` folder instead of creating a new package. Region generation reads and writes the engine's own `HexCrawlState` and terrain set, so a separate package would only add a dependency edge. The web side mirrors the existing split: a store under `stores/hex-crawl/` and components under `components/map/hex-crawl/`.

## Delivery order

Each step is independently testable and leaves the app working.

1. **Engine foundation**: provenance on `HexRecord`, seeds, noise, presets and settings.
2. **Engine generation**: targets for `area`, generate, coast repair, apply, with seeded fixtures. Covers Stories 1 to 3 at engine level.
3. **Web MVP**: store, entry control, review bar, overlay, accept and cancel for **Generate area**. Stories 1, 2, 3 and 7 are demonstrable.
4. **Grow** and **Fill gaps**: target rules and menu entries (Stories 4 and 5).
5. **Adjust, Regenerate, explored warning, Undo** (Story 6, FR-028a/b).
6. **Presets and Customise** UI beyond the default (FR-010).
7. **Help, hint, performance test, quickstart run.**

## Points settled during planning

These were found while planning and are now written into the spec, so spec and plan agree. Reasons are in research.md.

1. **FR-004**: the corridor rule is an unbroken run of at most 4 empty hexes along a hex axis with terrain at both ends. The earlier wording ("within 2 hexes on opposite sides") could not bridge a strip 4 wide (D6).
2. **FR-009, FR-009a**: at the rim of a request, still-empty and off-map neighbours count as able to become either; mountains get the same kind of hard rule as coast (D3).
3. **FR-028b**: undo is withdrawn by any further change to the map's hex data, by leaving the map or by reloading; pin and fog edits do not withdraw it (D8).
4. **Assumptions**: the last seed, as well as the settings, is remembered per map on the device (D9).
5. **FR-037**: a hex in the proposal can be adjusted by typing its label, so adjusting needs no pointer (D10).

## Complexity Tracking

| Violation                                                                                                    | Why Needed                                                                                                                                                                          | Simpler Alternative Rejected Because                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| In-house seeded hash and value noise (about 80 lines), where Constitution III prefers an established library | The design needs values hashed from a hex's position, using only integer operations and basic arithmetic, so results are identical on every device and independent of request order | `seedrandom` gives a running stream, not position-stable values; `simplex-noise` adds a dependency and still needs a seeded permutation source; both are larger than the code they would replace |
