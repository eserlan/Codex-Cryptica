# Implementation Plan: Hex Crawl Mode

**Branch**: `178-hex-crawl-mode` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/178-hex-crawl-mode/spec.md` · **Issue**: #4147 (epic #1957)

## Summary

Turn hex maps into playable hex crawls. The GM enables **Hex Crawl mode** per map. Each hex can then hold:

- terrain;
- GM notes;
- a separately marked AI notes section;
- an Explored flag;
- a pending discovery draft.

All of this is stored sparsely on the map in `maps.json`. Clicking a hex (or using Go to hex or This hex) opens a GM-only panel. Seen and Unknown are derived from the existing fog mask. Explored is set by party moves or by hand. **Explore** produces a six-part discovery draft, grounded in the hex and its surroundings, with AI as a first-class path and built-in terrain tables as the offline path. The GM saves the parts they want as draft entities pinned in the hex, with an optional link to the nearest location.

The prerequisite is that hex grid geometry moves from per-device storage onto the map, so hex records stay aligned everywhere. Grid changes that would misalign records are guarded by a confirmation.

**Technical approach (from [research.md](./research.md)):**

- A new framework-free package `hex-crawl-engine` holds the records, state derivation, terrain, context assembly, the discovery service with an injected model runner, the offline tables and the save planning.
- Thin, dependency-injected web stores and services wire it into the existing map, pin, fog, journal, AI and vault paths.
- New UI components are added, and existing large files gain only call-site wiring.
- Hex data is stripped from every guest and published projection.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**:

- `map-engine`: hex maths. It gains `parseHexLabel`.
- `random-source-engine`: offline rolling.
- `session-journal-engine`: gains `formatHexExplored`.
- `schema`: `MapSchema`, with two optional fields added.
- `vault-engine`: `GuestExporter` strips `hexCrawl`.
- `@codex/ai-engine` (`aiClientManager`).
- Existing `generator-engine` `formatCampaignContextBlock`, and the exported `extractJsonObject` from `ai-generator-gateway.ts`.
- `@codex/events` (`JOURNAL:CAPTURE`), Floating UI (already a dependency), `zod`, Tailwind 4 semantic tokens, Iconify Lucide classes.
- New internal package `packages/hex-crawl-engine`. **No new third-party dependency.**

**Storage**: Optional additive fields on the existing map records in `.codex/maps.json`: `grid` and `hexCrawl`. They are synced, backed up, exported and restored with maps. One new device-local display preference, `showTerrainIcons`, joins the existing per-map display settings. One device-local "AI notice dismissed" hint key. No IndexedDB, OPFS layout or migration change.
**Testing**: Vitest/bun test in packages (`bun run --filter <pkg> test`). Vitest with jsdom for web stores and components. Playwright for one end-to-end path. Impacted-only runs per AGENTS.md (`bun scripts/test-changed.mjs`).
**Target Platform**: Modern evergreen browsers (desktop and tablet). Offline-capable PWA.
**Project Type**: Monorepo web application (SvelteKit app plus framework-free workspace packages).
**Performance Goals**:

- Hex panel opens in under 0.5s with 2,000 touched hexes (SC-002).
- Offline draft in under 1s, AI draft in under 15s at the 95th percentile (SC-003).
- The overlay renders only records in the viewport.

**Constraints**:

- Local-first. Hex data never leaves the device except for the bounded context of an explicit AI discovery.
- Nothing is tracked.
- GM-only visibility.
- Keyboard-operable.
- Context capped at 8,000 characters.

**Scale/Scope**: Records are sparse (touched hexes only). Expect hundreds to a few thousand per large map. Six user stories and 45 functional requirements. About 1 new package, about 12 new web modules and components, and about 9 small touch points in existing files.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below)._

| Principle                         | Status | How the plan complies                                                                                                                                                                                                                                        |
| --------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Library-First                  | ✅     | All domain logic lives in `packages/hex-crawl-engine`. The web layer adapts and renders.                                                                                                                                                                     |
| II. TDD                           | ✅     | Every engine export and web adapter has success and negative tests listed in the contracts. Contract tests cover privacy (guest export, snapshots) and "never writes notes".                                                                                 |
| III. Simplicity & YAGNI / reuse   | ✅     | Reuses pins (no new link type), the fog mask (`hexAt`), the move hooks, the random-table engine, the journal formatters, `formatCampaignContextBlock` and the exported `extractJsonObject`. No fourth JSON-extraction copy (D10). No new dependency.         |
| IV. AI-First Extraction           | ✅     | Discovery feeds the model bounded, clean context and validates structured JSON output with zod (`HexStockingSchema`).                                                                                                                                        |
| V. Privacy & Client-Side          | ✅     | Data stays in the local vault. AI is called only on explicit action with AI enabled (FR-043). Hex data is stripped from guest and published bundles and is absent from VTT snapshots (D16). No telemetry (FR-042). The remote-storage exception is not used. |
| VI. Clean Implementation          | ✅     | Immutable record updates, zod at boundaries, plain error messages, AbortSignal cancellation, no silent AI fallback.                                                                                                                                          |
| VII. User Documentation           | ✅     | Extend `hexcrawl-maps.md` and add `hex-crawl-mode.md`, plus a `FeatureHint` (FR-044/045). See the User Help Check.                                                                                                                                           |
| VIII. DI                          | ✅     | Constructor-injected deps for `HexCrawlStore`, `GridChangeGuard`, `HexCrawlMoveObserver` and `HexDiscoveryController`. The engine takes `rng`, `clock` and `modelRunner`.                                                                                    |
| IX. Natural Language              | ✅     | Plain British English UI copy is specified in `contracts/ui-and-privacy.md`.                                                                                                                                                                                 |
| X. Quality & Coverage             | ✅     | New package with coverage config like the sibling engines. Impacted tests, lint and type-check per the PR gate.                                                                                                                                              |
| XI. Agent Operational Protocol    | ✅     | Small, scoped changes to existing files, recorded below. No speculative refactors. The `extractJsonObject` unification is recorded as a follow-up, not done here.                                                                                            |
| XII. Labels Over Tags             | ✅     | Discovery entities use **labels** (`hex-crawl-discovery`, `ai-drafted`, `rolled`).                                                                                                                                                                           |
| XIII. Discovery Intent Governance | N/A    | No public discovery page is added (see below).                                                                                                                                                                                                               |
| XIV. Bounded Responsibility       | ✅     | New behaviour goes into new modules. Large existing files get call-site wiring only (see below).                                                                                                                                                             |

### Discovery Intent Check

N/A. This feature adds in-app behaviour only, with no public, indexable page. The changelog entry at release is not a discovery page.

### Bounded Responsibility Check

- [x] Files this feature will touch that already exceed 500 lines (excluding tests and data-only modules):

| File                                                         | Lines | Single responsibility it keeps                                         | Change                                                                                                                                                 |
| ------------------------------------------------------------ | ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/src/lib/stores/map.svelte.ts`                      | 1,001 | Active-map view state and per-device display settings                  | Delegates geometry resolution and write-through to the new `map-grid-geometry.ts`. Adds the `showTerrainIcons` display preference. No hex crawl logic. |
| `apps/web/src/lib/components/map/map-interactions.svelte.ts` | 741   | Pointer and keyboard input routing for the map                         | Routes press and release to the new `HexClickInteractionHandler`. The click detection logic lives in the handler.                                      |
| `apps/web/src/lib/components/map/MapView.svelte`             | 581   | Map composition root (wires painter, recorder, interactions, overlays) | Instantiates `HexCrawlMoveObserver`, calls it at the two existing `onMoveSettled` sites, and mounts `HexCrawlOverlay` and `HexCrawlPanel`.             |
| `apps/web/src/lib/components/vtt/TokenDetail.svelte`         | 566   | Selected-token detail and actions                                      | Adds one **This hex** action button, which calls the store.                                                                                            |

- [x] New behaviour with an extraction target:
  - domain logic → `packages/hex-crawl-engine`;
  - geometry precedence → `stores/map-grid-geometry.ts`;
  - hex click → `interactions/hex-click-interaction-handler.ts`;
  - the shared 5px constant → `interactions/pointer-thresholds.ts` (moved from `token-drag-handler.ts`, whose tests are kept);
  - `help-content.ts` (856 lines) is a data module, and only adds configuration entries.
- [x] Planned splits carry their tests: the threshold-constant move keeps `token-drag-handler` tests green, and the new modules get their own tests.

### User Help Check

- [x] **New article** `apps/web/src/lib/content/help/hex-crawl-mode.md`, registered in `help-content.ts`. It explains:
  - turning the mode on;
  - the three states and how Seen relates to fog;
  - the hex panel, terrain and notes versus AI notes;
  - attaching and creating entities, Go to hex and This hex;
  - Explore, review and saving, and linking;
  - what is sent to the AI service, AI Disabled and the terrain tables;
  - guests and players never seeing hex data;
  - grid changes and the confirmation.
- [x] Extend `hexcrawl-maps.md` with a short "Hex Crawl mode" pointer.
- [x] A `FeatureHint` on the first hex panel open (FR-045).

## Project Structure

### Documentation (this feature)

```text
specs/178-hex-crawl-mode/
├── spec.md
├── plan.md                         # this file
├── research.md                     # Phase 0
├── data-model.md                   # Phase 1
├── quickstart.md                   # Phase 1
├── contracts/
│   ├── hex-crawl-engine-api.md
│   ├── hex-crawl-store-api.md
│   └── ui-and-privacy.md
├── checklists/requirements.md
└── tasks.md                        # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/hex-crawl-engine/                    # NEW framework-free package
├── package.json · tsconfig.json · bunfig.toml
├── src/
│   ├── index.ts
│   ├── model.ts                  # HexKey, HexRecord, HexCrawlState, normalise/upsert/prune/count
│   ├── terrain.ts                # catalogue (data), labels, icons, parseTerrainInput
│   ├── state.ts                  # deriveHexState
│   ├── proximity.ts              # pinsInHex, selectNearestLocation
│   ├── context.ts                # buildHexContext, renderHexContext (bounded)
│   ├── discovery/
│   │   ├── schema.ts             # HexStockingSchema (zod), part schemas
│   │   ├── prompts.ts            # system/user prompt builders, per-part regeneration
│   │   ├── draft.ts              # draft lifecycle helpers
│   │   ├── service.ts            # HexDiscoveryService
│   │   └── save.ts               # planDiscoverySave, appendToAiNotes, matchFaction
│   └── tables/                   # offline RandomSource tables per terrain + general (data)
└── tests/                        # one spec per module

packages/schema/src/map.ts                    # + MapGridGeometrySchema, optional grid, optional hexCrawl (passthrough record)
packages/map-engine/src/hex-labels.ts         # + parseHexLabel (inverse of formatHexLabel)
packages/session-journal-engine/src/capture.ts # + formatHexExplored
packages/vault-engine/src/services/GuestExporter.ts # strip hexCrawl from exported maps

apps/web/src/lib/
├── stores/
│   ├── map-grid-geometry.ts                  # NEW resolve/adopt/write-through (D3)
│   ├── map.svelte.ts                         # delegate geometry; + showTerrainIcons pref
│   └── hex-crawl/                            # NEW
│       ├── hex-crawl.svelte.ts               # HexCrawlStore
│       ├── grid-change-guard.svelte.ts       # GridChangeGuard
│       └── hex-crawl-move-observer.ts        # HexCrawlMoveObserver
├── services/
│   └── hex-discovery.ts                      # NEW HexDiscoveryController (AI runner, context gathering, saving)
├── components/map/
│   ├── interactions/
│   │   ├── hex-click-interaction-handler.ts  # NEW
│   │   └── pointer-thresholds.ts             # NEW shared 5px constant
│   ├── map-interactions.svelte.ts            # route to hex click handler
│   ├── MapView.svelte                        # wire observer, overlay, panel
│   ├── VTTGridSettings.svelte                # hosts HexCrawlModeToggle; guard session begin/end + requestChange
│   ├── MapOverlays.svelte                    # "This hex" on selected pin
│   └── hex-crawl/                            # NEW
│       ├── HexCrawlModeToggle.svelte
│       ├── HexCrawlDisplayToggle.svelte
│       ├── HexGoTo.svelte
│       ├── HexCrawlPanel.svelte
│       ├── HexTerrainPicker.svelte
│       ├── HexNotes.svelte
│       ├── HexContentsList.svelte
│       ├── HexDiscoveryReview.svelte
│       ├── HexExploreOffer.svelte
│       └── HexCrawlOverlay.svelte
├── components/vtt/TokenDetail.svelte         # "This hex" action
├── config/help-content.ts                    # article registration + FeatureHint + AI-notice hint key
└── content/help/
    ├── hex-crawl-mode.md                     # NEW
    └── hexcrawl-maps.md                      # pointer to the new article

apps/web/tests/                               # one Playwright journey (enable → click → attach → explore offline → save)
```

**Structure Decision**: A monorepo with a new library package for the domain plus thin web adapters and components. This mirrors `solo-session-engine` and `session-journal-engine` (Constitution I, VIII, XIV).

## Phasing (input for /speckit-tasks)

Work is ordered so every slice can be shipped and tested on its own:

1. **Foundation (blocking):**
   - `hex-crawl-engine` model, terrain and state;
   - schema fields;
   - grid geometry into the map (D3);
   - `GuestExporter` strip and its privacy tests.
2. **US1 hex panel:** toggle, click handler, panel, terrain, notes, contents, attach and create, Go to hex, This hex, terrain icons overlay.
3. **US2 states:** state derivation in the panel, `HexCrawlMoveObserver`, explored marker, journal formatter.
4. **US3 discovery:** engine context, schema, prompts, service and tables; web controller; review card; saving and linking; draft persistence; AI notice.
5. **US4 solo offer.**
6. **US5 grid guard** (geometry storage itself is in Foundation).
7. **US6 help and hint**, then one end-to-end journey and polish.

## Post-Design Constitution Re-check

Re-evaluated after writing `data-model.md` and `contracts/`. Still ✅ on every principle. Specifically:

- The privacy contract (D16) adds explicit tests rather than relying on review.
- "Never write GM notes" is made structural through separate `notes` and `aiNotes` fields, plus a contract test (SC-006).
- No file over 500 lines gains new responsibilities.
- No new third-party dependency.

There are no violations to justify.

## Complexity Tracking

No constitution violations, so nothing to justify.
