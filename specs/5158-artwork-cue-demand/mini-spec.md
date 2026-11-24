# Central Adventure Artwork Cue-Demand Database (#5158) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Solo Adventure Mode artwork matching relies on a fixed cue vocabulary (`ARTWORK_CUES`) and static catalogue (`seedArtwork`). When AI GM sessions encounter locations, NPCs, scenes, atmospheres, or monsters whose structured cues are unmapped or lack matching artwork, those misses fall back to text-only without any central visibility into what assets or synonyms are most needed.

### Scope & Boundaries

- **In Scope**:
  - Add a D1 migration (`0002_artwork_cue_demand.sql`) in `apps/workers/oracle-proxy/migrations/` reusing the existing `ANSWER_AGGREGATES` D1 binding.
  - Add `POST /api/artwork-demand` (strictly validated cue-tuple upsert incrementing `hit_count`) and `GET /api/artwork-demand` (filterable by `status`, `type`, `genre`, `limit`, returning ranked misses and top `unmappedSummary` cues) to `apps/workers/oracle-proxy`.
  - Add a feature-flagged (`artworkDemandTelemetry`, default `false`) and per-session deduplicated client reporter in `apps/web` that sends only normalised/structured cue tags and `matchedAssetId` (never character names, place names, narration, or vault/session IDs).
  - Add `scripts/harvest-adventure-cues.ts` to extract cue-only tuples from exported diagnostic snapshot JSONs and optionally backfill them via `POST /api/artwork-demand`.
- **Out of Scope**:
  - Automatic image generation or R2 upload from demand records.
  - Storing player-authored text, entity names, vault identifiers, IP addresses, or session IDs.
  - Public UI dashboard in the web app (querying `GET /api/artwork-demand` or a future `/gallery` panel is sufficient for curation).

### Acceptance Criteria

- [ ] `POST /api/artwork-demand` accepts valid `{ type, genre, knownCues, unmappedCues, demographicCues, matchedAssetId }` payloads, computes a deterministic SHA-256 signature, and increments `hit_count` in `artwork_cue_demand`.
- [ ] `POST /api/artwork-demand` rejects invalid `type`/`genre`, empty cue sets, oversized arrays (>16 cues), or strings containing punctuation/freeform text with HTTP `400`.
- [ ] `GET /api/artwork-demand` returns ranked demand rows (`status=missing` by default) and an aggregated `unmappedSummary` list ordered by `hit_count DESC`.
- [ ] Client reporter sends zero requests when `artworkDemandTelemetry` is disabled or offline, deduplicates identical `(type, genre, matchedAssetId, cues)` signatures within a session, and never includes entity/place names or narration.
- [ ] `bun scripts/harvest-adventure-cues.ts <snapshot.json>` extracts cue-only demand tuples and supports `--post <oracle-proxy-url>` for historical backfill.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/workers/oracle-proxy/migrations/0002_artwork_cue_demand.sql`: `artwork_cue_demand` table + miss-ranking index on `(matched_asset_id, type, genre, hit_count DESC)`.
  - `apps/workers/oracle-proxy/src/artwork-demand.ts`: Input validation/sanitisation, SHA-256 signature generation, D1 upsert & query handlers, CORS + rate-limiting integration.
  - `apps/workers/oracle-proxy/src/feature-flags.ts` & `apps/web/src/lib/stores/feature-flags.svelte.ts`: Add `artworkDemandTelemetry: false` default flag.
  - `apps/workers/oracle-proxy/src/index.ts`: Route `/api/artwork-demand`.
  - `apps/web/src/lib/services/adventure/artwork/artwork-cue-summary.ts`: Include bounded `unmappedCues` (from structured `place.cues` / `fact.cues` only) and `demographicCues` in `ArtworkCueIndicator`.
  - `apps/web/src/lib/services/adventure/artwork/artwork-demand-reporter.ts`: Constructor-DI `ArtworkDemandReporter` with per-session `Set<string>` deduplication and `keepalive` best-effort `POST`.
  - `apps/web/src/lib/components/oracle/adventure/AdventureFocusPlay.svelte`: Trigger `artworkDemandReporter.reportFromSummary(cueSummary)` in `$effect`.
  - `scripts/harvest-adventure-cues.ts`: Offline diagnostic JSON cue extractor and optional `--post` uploader.
- **Data Contracts & State Flow**:
  - `AdventureFocusPlay.svelte` derives `cueSummary` via Svelte 5 `$derived`, and an `$effect` passes it to `artworkDemandReporter`.
  - No IndexedDB or OPFS changes; deduplication state is transient in-memory per session.
  - Central persistence is aggregated counters in Cloudflare D1 (`ANSWER_AGGREGATES`).

### Key Technical Decisions & Tradeoffs

- **Reuse `ANSWER_AGGREGATES` D1 binding**: Avoids provisioning a separate D1 database while keeping `artwork_cue_demand` isolated in its own table and migration.
- **Structured cues only (no freeform text)**: Restricting `knownCues` to kebab-case and `unmappedCues` to `[a-z0-9 -]` (max 32 chars, max 16 items) prevents accidental PII/narration leakage and abuse.
- **Feature-flag gated (`artworkDemandTelemetry: false`)**: Preserves local-first defaults until explicitly enabled in `FEATURE_FLAGS` KV or build env.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Valid cue tuple upserts into D1 (`hit_count` incremented) and client deduplicates subsequent renders of the same state.
- **Negative / Error Path**: Missing D1 binding returns `500`; malformed JSON or disallowed cue strings return `400`; rate-limited POST returns `429`; client swallows network errors silently so gameplay is never interrupted.
- **Cancellation / Edge Case**: Offline browser or disabled feature flag skips `fetch` entirely; vault-custom images map to `"vault-custom"` rather than leaking local image paths.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add unit tests in `apps/workers/oracle-proxy/src/artwork-demand.test.ts` (happy path, hit increment, invalid payload rejection, missing DB `500`, `GET` filtering) and `apps/web/src/lib/services/adventure/artwork/artwork-demand-reporter.test.ts` (disabled/offline skip, deduplication, no name leakage).
- [ ] **Task 2: D1 Migration & Worker Routes** — Create `0002_artwork_cue_demand.sql`, `artwork-demand.ts`, add `artworkDemandTelemetry` flag, and wire `/api/artwork-demand` in `index.ts`.
- [ ] **Task 3: Client Reporter & UI Wiring** — Extend `artwork-cue-summary.ts`, implement `ArtworkDemandReporter`, and wire `$effect` in `AdventureFocusPlay.svelte`.
- [ ] **Task 4: Diagnostic Backfill CLI** — Add `scripts/harvest-adventure-cues.ts` for offline extraction and `--post` backfill.
- [ ] **Task 5: Verification Gate** — Run impacted tests, type-checks, and changed-file lint.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```
