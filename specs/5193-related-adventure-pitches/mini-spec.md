# Player-Safe Related Adventure Pitches (#5193) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

After an adventure arc reaches a committed outcome (#5191 / #5192), players who want to follow up on a surviving lead have no grounded, spoiler-safe way to see what threads remain open around established people, places, or consequences. We need a deterministic, player-safe continuation pitch contract (`AdventureContinuationCandidate`) that proposes up to three distinct next-adventure ideas (plus a fresh/unrelated option) without mutating canon, inventing motives, or leaking GM-only state.

### Scope & Boundaries

- **In Scope**:
  - Define a typed `AdventureContinuationCandidate` contract (`id`, `sourceOutcomeId`, `anchorType: "character" | "place" | "event"`, `sourceRecordIds`, `playerSafeTitle`, `playerSafePremise`, `uncertainty`, `sourceRevision`, `genreHint?`) in `packages/adventure-engine/src/types.ts` (and Zod schema if persisted/validated).
  - Implement pure, deterministic candidate selection in `packages/adventure-engine/src/continuation-candidates.ts`:
    - Sources strictly from **player-visible** projections (`session.people`, `session.places`, `session.visibleState.knownFacts`, player-visible `session.provisionalFacts`, `EmergentThread.outcome.unresolvedConsequences`, and player-visible `ScenarioItem` events).
    - Never reads or exposes `gmOnly`, `hiddenState`, unrevealed `ScenarioItem` secrets, `causalCommitments` summaries as proven motives, or `unheard` scenarios.
    - Composes up to 3 genuinely distinct pitches (at most one per anchor type when distinct evidence supports them; fewer than 3 when evidence is scarce—no filler, repetition, or mandatory crisis) plus a separate fresh/unrelated continuation option.
    - Genre-agnostic templates (no hardcoded fantasy or water-compact narrative; works for sci-fi, modern, or any Vault style).
  - Optional bounded AI pitch enrichment reusing the existing generator gateway (`aiGeneratorGateway` / `#4534` Idea & Adventure generators) only when the user explicitly chooses to explore ideas, with immediate deterministic seed/manual fallback when offline or on generation failure.
  - Non-mutating preview & provenance: previewing candidates never mutates `scenarioCollection`, `AdventureSession`, `sourcePackage`, or Vault canon, and tracks `sourceRevision` so stale candidates regenerate cleanly after world changes while preserving earlier dismissals.
- **Out of Scope**:
  - Automatically creating `ScenarioItem` entries, `AdventureSession` records, or Vault entities on preview.
  - Modifying authored Adventure JSON packages or retroactively rewriting completed arc events.
  - Full UI picker/handoff integration across `AdventureEntryFlow` (covered in #5194 / 04/04).

### Acceptance Criteria

- [ ] Character, place, and event candidates are grounded to distinct, stable committed IDs (`people`, `places`, `knownFacts`, or player-visible `provisionalFacts` / `ScenarioEvent`s); no clue-only filler or duplicate paraphrases.
- [ ] All candidate fields (`playerSafeTitle`, `playerSafePremise`, `uncertainty`, `sourceRecordIds`) pass `detectHiddenTextLeakage()` and contain zero GM-only secrets, unrevealed package truth, or fabricated motives.
- [ ] When only one known NPC exists and no meaningful event/place refs qualify, returns at most one valid pitch (or none) alongside manual/fresh/free-explore alternatives.
- [ ] Retrying, reopening, or running offline never creates a `ScenarioItem`, an extra active `AdventureSession`, or mutates canon; optional AI pitch enrichment falls back cleanly to deterministic seed pitches on failure.
- [ ] Non-fantasy (e.g. sci-fi) sessions produce genre-appropriate, unhardcoded pitches within bounded prompt/context budgets.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts`: Add `ContinuationAnchorType`, `AdventureContinuationCandidate`, and `AdventureContinuationSet` (including `sourceRevision` and `freshOption`).
  - `packages/adventure-engine/src/continuation-candidates.ts` (new): Pure `selectAdventureContinuationCandidates(session, completionSummary?)`, anchor-scoring/deduplication helpers, and `detectHiddenTextLeakage` filtering.
  - `packages/adventure-engine/src/index.ts`: Export `continuation-candidates.ts`.
  - `apps/web/src/lib/services/adventure/adventure-continuation-service.ts` (new, optional): Bounded, opt-in AI pitch polisher wrapping existing generator services with deterministic seed fallback and `AbortSignal` support.
  - `packages/adventure-engine/tests/continuation-candidates.test.ts` (new): Unit tests covering character/place/event selection, scarcity, secrecy/no-leakage, sci-fi genre neutrality, and idempotency/non-mutation.
- **Data Contracts & State Flow**:
  - `selectAdventureContinuationCandidates(session)` reads only committed player-visible state + `completionEventId` / `session.revision` and returns a read-only `AdventureContinuationSet` (`candidates: AdventureContinuationCandidate[]`, `sourceRevision: number`, `sourceOutcomeId?: string`).
  - Previewing never writes to `AdventureSessionRepository` or `vault`.
- **UI & Design Tokens**: N/A for core engine slice; any preview/trigger surfaces reuse existing Tailwind 4 semantic tokens and Iconify classes (`icon-[lucide--*]`).

### Key Technical Decisions & Tradeoffs

- **Deterministic-first selection**: Candidate selection and baseline pitches are 100% deterministic and offline-ready; AI enrichment is strictly optional and bounded, never blocking Play or completion dismissal.
- **Strict player-visible projection boundary**: Rather than passing `EmergentThread` or `ScenarioItem` raw objects to pitch builders, extract only player-visible `people`, `places`, `knownFacts`, `provisionalFacts` (`visibility === "player-visible"`), and `unresolvedConsequences` already filtered by `detectHiddenTextLeakage()`.
- **Anti-repetition & scarcity**: Enforce at most one candidate per `(anchorType, primaryTargetId)` and deduplicate overlapping topic tokens so scarce sessions return 0–2 crisp pitches instead of 3 padded paraphrases.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Completed arc with established NPC, visited place, and unresolved consequence yields up to 3 distinct, player-safe pitches with exact `sourceRecordIds` and explicit `uncertainty`.
- **Negative / Error Path**: Any candidate text hitting `detectHiddenTextLeakage()` is dropped/sanitized; AI enrichment failure or offline state immediately returns the deterministic baseline pitches without throwing.
- **Cancellation / Edge Case**: `AbortSignal` cancels in-flight AI enrichment cleanly; empty/minimal sessions (e.g. 1 NPC, no events) return 0–1 pitches plus fresh/free-explore alternatives without error.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Create `packages/adventure-engine/tests/continuation-candidates.test.ts` covering character/place/event grounding, scarcity, secrecy/no-leakage, sci-fi genre neutrality, and non-mutation.
- [ ] **Task 2: Types & Selection Engine** — Add `AdventureContinuationCandidate` types in `types.ts` and implement `continuation-candidates.ts` + export in `index.ts`.
- [ ] **Task 3: Optional AI Pitch Enrichment** — Add bounded, abortable `adventure-continuation-service.ts` with offline/failure deterministic fallback and unit tests.
- [ ] **Task 4: Edge Cases & Polish** — Verify `sourceRevision` invalidation, deduplication, and zero `scenarioCollection` mutation.
- [ ] **Task 5: Local Review (`codex-review`)** — Run `codex-review` (Sweeps 0–8) on `git diff origin/staging...HEAD`, fix findings, and stamp `HEAD` (`bun scripts/codex-review-stamp.mjs`).
- [ ] **Task 6: Verification Gate** — Execute repository quality checks.

---

## 4. Verification Gate

```bash
bun run lint:changed -- --base origin/staging
bun run test:changed -- --base origin/staging
bun scripts/typecheck-changed.mjs --base origin/staging
bun run fallow:audit
```
