# Implementation Plan: Solo Map Play

**Branch**: `feat/3841-solo-map-play` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/3841-solo-map-play/spec.md`

## Summary

Solo play has one person, the GM, who is also the only player. #3818 shipped the SOLO switch, which draws fog opaque in GM view while every GM tool keeps working. This feature completes it:

- **Concealment:** fail safe while the fog state is unknown, and confirm nothing else leaks.
- **Exploring by moving the party:** sight in whole hexes, one undo step per move, and a travel readout in the map's units.
- **The journal:** recording each move, with a per-journal switch.
- **Help and Cif:** a complete solo play guide.

Technically it adds one framework-free module to `map-engine` (hex travel), extracts a shared mask-undo helper, and moves the reveal-on-move effect out of `MapView.svelte` into a new `SoloExplorationRecorder`. It also adds one optional journal field and one journal entry type, published through the existing `JOURNAL:CAPTURE` event. No new dependency, store or network call. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), SvelteKit 2, Bun 1.3.14
**Primary Dependencies**: Existing `map-engine` (hex maths, renderer), `session-journal-engine` (capture, promote), `@codex/events` (`JOURNAL:CAPTURE`), `help-engine`, Tailwind 4 semantic tokens. No new third-party dependency.
**Storage**: Existing per-map settings in `localStorage` (`soloFog`, `visionRange`; unchanged); existing IndexedDB `session_journals` (one optional field, `captureMapMoves`; no migration). Travel tally in memory only.
**Testing**: Vitest (unit, component with jsdom); Playwright smoke only if CI covers the map page.
**Target Platform**: Browser (desktop and phone), offline-capable.
**Project Type**: Web application in a Bun monorepo (`apps/web` plus `packages/*`).
**Performance Goals**: A move's reveal, undo snapshot and journal capture finish within one frame budget for typical sight (≤ 3 hexes); no extra redraw while nothing moves.
**Constraints**: Local-first; nothing about solo play leaves the device (FR-021); non-solo reveal behaviour unchanged (SOLO off keeps today's passive, no-undo reveal).
**Scale/Scope**: One user, one map at a time; maps up to the existing 15,000-hex render guard.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                   | Status | How                                                                                                                                                                                              |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Library-First            | PASS   | Hex travel maths goes into `packages/map-engine` (`hex-travel.ts`), pure and framework-free. Journal formatting stays in `session-journal-engine`.                                               |
| II. TDD                     | PASS   | Each contract in [contracts](./contracts/solo-exploration.md) gets tests first; quickstart lists them. Success and failure paths covered (for example no journal, capture off, guest, SOLO off). |
| III. Simplicity & YAGNI     | PASS   | Reuses `TokenVisionRevealer`, `punchHexFogRadius`, `hexDistance`, `JOURNAL:CAPTURE`, the painter's undo. One stored setting for vision (R4). Travel not persisted (R6).                          |
| IV. AI-First Extraction     | N/A    | No extraction.                                                                                                                                                                                   |
| V. Privacy & Client-Side    | PASS   | All state local; no remote storage, so the opt-in exception does not apply. Journal entries carry hex numbers and distances only, no names or vault text.                                        |
| VI. Clean Implementation    | PASS   | Small modules with injected dependencies; no speculative options.                                                                                                                                |
| VII. User Documentation     | PASS   | New `vtt-solo-play` article; updates to fog, hexcrawl and overview articles; Cif registry and evaluation questions.                                                                              |
| VIII. Dependency Injection  | PASS   | `SoloExplorationRecorder` and `MaskUndoRecorder` take constructor dependencies; no store imports inside them.                                                                                    |
| IX. Natural Language        | PASS   | UI text plain ("Vision: 2 hexes", "Last: 3 hexes (18 mi)").                                                                                                                                      |
| X. Quality & Coverage       | PASS   | Changed-file lint, tests and type-check; Fallow gate.                                                                                                                                            |
| XI. Agent Protocol          | PASS   | Impacted-only validation.                                                                                                                                                                        |
| XII. Labels over Tags       | N/A    | No tagging UI.                                                                                                                                                                                   |
| XIII. Discovery Intent      | N/A    | No public discovery page.                                                                                                                                                                        |
| XIV. Bounded Responsibility | PASS   | See below.                                                                                                                                                                                       |

### Discovery Intent Check

N/A: no public, indexable page is added or repositioned.

### Bounded Responsibility Check

- [x] Files over 500 lines this feature touches: `MapView.svelte` (572), `stores/map.svelte.ts` (945).
- [x] `MapView.svelte` keeps composing the map view. The vision reveal effect moves out to `SoloExplorationRecorder`, so it gets shorter. `map.svelte.ts` keeps its map registry and settings responsibility and gains no behaviour (it already holds `soloFog`).
- [x] New behaviour has its own home: `packages/map-engine/src/hex-travel.ts` (not app-specific), `components/map/solo-exploration-recorder.svelte.ts` and `components/map/mask-undo-recorder.ts` (app-specific, siblings of the painter).
- [x] The painter's undo tests move with the extraction to `mask-undo-recorder`, and the painter keeps its own tests.

### User Help Check

- [x] Help article planned: `vtt-solo-play` (complete guide), plus updates to `vtt-fog-player-view`, `hexcrawl-maps`, `vtt-session`.
- [x] It covers what solo play is, finding SOLO, exploring by moving, sight in hexes, travel, the journal, and limits (fog must be on; a GM-only feature).
- [x] FeatureHint: not used. Hint cards were retired in #3836, and discoverability comes from the SOLO tooltip and Cif.

**Post-design re-check**: PASS on all gates. No violations, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/3841-solo-map-play/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── solo-exploration.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/map-engine/src/
├── hex-travel.ts                      # new: hexTravel, visionRangeInHexes, newlyRevealedHexes
└── hex-travel.test.ts                 # new

packages/session-journal-engine/src/
├── types.ts                           # SessionJournal.captureMapMoves?: boolean
├── engine.ts                          # setCaptureMapMoves(journal, on)
└── capture.ts                         # formatMapMove(...) -> JournalCapturePayload

packages/help-engine/src/
├── actions/catalogue.ts               # vtt-travel-readout target
└── registry/features/vtt-map.ts       # helpIds += vtt-solo-play; action "Show me the travel readout"

apps/web/src/lib/components/map/
├── mask-undo-recorder.ts              # new: extracted from map-fog-painter
├── solo-exploration-recorder.svelte.ts# new: reveal-on-move, undo, travel, capture
├── map-fog-painter.ts                 # uses MaskUndoRecorder; isRevealedAt fail-safe (FR-006)
├── MapView.svelte                     # wires the recorder; vision $effect moves out
├── SoloTravelReadout.svelte           # new: "Last … · Total …" + Reset, polite announcement
├── MapVTTControlsHUD.svelte           # mounts the readout; Vision label in hexes on hex maps
└── MapOverlays.svelte                 # unchanged behaviour; relies on fail-safe check

apps/web/src/lib/stores/
├── session-journal-capture.ts         # skip map-move when captureMapMoves === false
└── session-journal.svelte.ts          # expose captureMapMoves toggle

apps/web/src/lib/components/quicknote/
└── SessionJournalView.svelte          # "Record map moves" switch

apps/web/src/lib/services/help-assistant/vtt-help-actions.ts  # travel readout reachable (GM)
apps/web/src/lib/content/help/
├── vtt-solo-play.md                   # new article
├── vtt-fog-player-view.md / hexcrawl-maps.md / vtt-session.md  # links
```

**Structure Decision**: Monorepo web app. The maths goes in `packages/map-engine`, journal shape in `packages/session-journal-engine`, and Cif knowledge in `packages/help-engine`. App wiring and UI go in `apps/web/src/lib/components/map` beside the existing fog painter and vision revealer.

## Delivery slices

Each slice is independently testable and shippable, matching the spec's stories.

1. **US1 Concealment** (P1): `isRevealedAt` fail-safe and a test that it hides labels while no mask is loaded. A short audit test asserts the renderer draws fog after tokens, notes, pins and grid. Smallest slice, ships alone.
2. **US2 Exploring by moving** (P2):
   - `hex-travel.ts`
   - `MaskUndoRecorder` extraction
   - `SoloExplorationRecorder` replacing the `MapView` effect
   - the Vision label in hexes
   - `SoloTravelReadout`
3. **US3 Journal** (P3): `captureMapMoves` field and toggle; the `map-move` payload; the listener skip; recorder publishing.
4. **US4 Help and Cif** (P3): the `vtt-solo-play` article, the links, the registry target and action, evaluation questions, embeddings, then a Worker redeploy.

## Risks

- **Undo noise**: one undo step per move could crowd the undo stack on a long trip. Mitigation: record only completed moves that reveal something new.
- **Drags update position every frame**: `TokenDragHandler.move()` moves the token on each pointer movement, so treating every change as a move would flood undo, travel and the journal. Mitigation: reveal live, record once on drag end via an injected settle signal (contract §3).
- **Moving the effect out of `MapView`**: the reveal-on-move effect is load-bearing for multiplayer GM vision. Mitigation: SOLO-off behaviour is pinned by tests before the move.
- **Mask reads**: `getImageData` per hex for `newlyRevealedHexes` stays at most about 37 reads for a sight of 3, so it is negligible.

## Complexity Tracking

None.
