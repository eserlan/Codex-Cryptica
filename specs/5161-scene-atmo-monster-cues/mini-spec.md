# Scene, Atmosphere & Monster Cue-Demand Telemetry (#5161) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Issue #5158 wired `location` and `npc` cue-demand reporting into `oracle-proxy`, leaving `scene`, `atmosphere`, and `monster` demand unreported from live Solo Adventure Mode sessions. Although `@codex/adventure-artwork-engine` already supports `scene` and `atmosphere` resolution (`resolveSceneWithAtmosphere`) and `artwork_cue_demand` already accepts all five types, `summarizeArtworkCues` and `ArtworkDemandReporter` do not yet emit them.

### Scope & Boundaries

- **In Scope**:
  - Extend `ArtworkCueIndicator` in `apps/web/src/lib/services/adventure/artwork/artwork-cue-summary.ts` with optional `scene`, `atmosphere`, and `monsters` entries.
  - Derive `scene` and `atmosphere` cues from active situation/place mood & time cues and evaluate them via `resolveSceneWithAtmosphere` (`@codex/adventure-artwork-engine`).
  - Derive `monster` cues from active non-humanoid / `Creature` entries (e.g. `Creature` Vault entities or structured creature/monster `cues` on `hereCharacters`) without duplicating `npc` reports.
  - Forward `scene`, `atmosphere`, and `monster` tuples in `ArtworkDemandReporter` (`artwork-demand-reporter.ts`) with existing per-session deduplication and privacy-safe cue-only payloads.
  - Extend `scripts/harvest-adventure-cues.ts` to extract `scene`/`atmosphere`/`monster` cues from diagnostic snapshots when present.
- **Out of Scope**:
  - Adding `"monster"` to `assetSchema` in `packages/adventure-artwork-engine/src/catalogue.ts` or generating monster artwork (deferred until monster demand data justifies a cue taxonomy).
  - Sending raw situation prose, turn narration, or creature names to `oracle-proxy`.

### Acceptance Criteria

- [ ] `summarizeArtworkCues` returns `scene`, `atmosphere`, and `monsters` cue summaries alongside `place` and `npcs` when relevant cues are present.
- [ ] `ArtworkDemandReporter` posts `type: "scene" | "atmosphere" | "monster"` payloads to `POST /api/artwork-demand` when `artworkDemandTelemetry` is enabled, deduplicated per session and free of entity names or narration.
- [ ] Creature/monster entries are classified as `monster` rather than `npc` when backed by a `Creature` entity or explicit non-humanoid/monster cues.
- [ ] Missing `scene`/`atmosphere`/`monster` matches record `matchedAssetId: null` cleanly so `GET /api/artwork-demand?status=missing&type=monster` surfaces monster demand immediately.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/web/src/lib/services/adventure/artwork/artwork-cue-summary.ts`: Add `scene`, `atmosphere`, and `monsters` to `ArtworkCueIndicator`; resolve `scene`/`atmosphere` via `resolveSceneWithAtmosphere` and partition `Creature` / monster facts from humanoid `npcs`.
  - `apps/web/src/lib/services/adventure/artwork/artwork-demand-reporter.ts`: Widen `ArtworkDemandReportPayload["type"]` to `"location" | "npc" | "scene" | "atmosphere" | "monster"` and enqueue `summary.scene`, `summary.atmosphere`, and `summary.monsters`.
  - `apps/web/src/lib/services/adventure/artwork/artwork-cue-summary.test.ts` & `artwork-demand-reporter.test.ts`: Cover `scene`, `atmosphere`, and `monster` extraction, deduplication, and negative/empty cases.
  - `scripts/harvest-adventure-cues.ts` & `scripts/harvest-adventure-cues.test.ts`: Extract `scene`/`atmosphere`/`monster` cues from diagnostic snapshots.
- **Data Contracts & State Flow**:
  - `AdventureFocusPlay.svelte` already reacts to `cueSummary` via `$derived` and `$effect`; no component changes required once `summarizeArtworkCues` and `ArtworkDemandReporter` emit the additional types.
  - All telemetry remains fire-and-forget async `fetch` (`keepalive: true`), gated by `artworkDemandTelemetry`.

### Key Technical Decisions & Tradeoffs

- **Reuse existing `POST /api/artwork-demand` schema**: The worker and D1 table (`0002_artwork_cue_demand.sql`) already accept `"scene"`, `"atmosphere"`, and `"monster"`, so no backend or migration changes are needed.
- **Record `monster` demand before adding `monster` assets**: Allowing `monster` misses to accumulate in `unmappedCues` first lets real play data shape the `ARTWORK_CUES` monster taxonomy before committing to `catalogue.ts` enum values.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Active mood/situation cues resolve via `resolveSceneWithAtmosphere` and report `scene`/`atmosphere` hits or misses; `Creature` entities report `type: "monster"` with `matchedAssetId: null`.
- **Negative / Error Path**: Empty `currentSituation` or scenes with zero mood/time/setting cues omit `scene`/`atmosphere` instead of sending empty payloads.
- **Cancellation / Edge Case**: Ambiguous facts without `Creature` entity backing or monster cues remain `npc` so existing NPC portrait matching does not regress.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing tests in `artwork-cue-summary.test.ts`, `artwork-demand-reporter.test.ts`, and `harvest-adventure-cues.test.ts` for `scene`, `atmosphere`, and `monster` cues (plus empty/ambiguous fallback).
- [ ] **Task 2: Cue Summary Extraction** — Extend `artwork-cue-summary.ts` with `scene`, `atmosphere`, and `monsters`.
- [ ] **Task 3: Demand Reporter Wiring** — Widen `ArtworkDemandReportPayload` and enqueue the new types in `artwork-demand-reporter.ts`.
- [ ] **Task 4: Diagnostic Harvester** — Update `scripts/harvest-adventure-cues.ts` to harvest `scene`/`atmosphere`/`monster` tuples.
- [ ] **Task 5: Verification Gate** — Run impacted tests, `svelte-check`, `lint:changed`, and `fallow:audit`.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bun run fallow:audit
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```
