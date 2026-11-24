# [P1][AI GM] Keep `visibleState.location` and `visibleState.situation` in Sync with Committed `moveTo` (#5187) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In `packages/adventure-engine`, a committed `moveTo` updates `session.currentPlaceId`, registers or resolves the target `Place` in `session.places`, and re-tags `activeCharacters` and `knownFacts` via `applyPlaces`, but leaves `session.visibleState.location` and `session.visibleState.situation` untouched when the model omits `visiblePatch.location` or `visiblePatch.situation`. As a result, `session.currentPlaceId` and `activeCharacters` point to the new place while `visibleState.location` and `visibleState.situation` (and thus the next GM prompt, player-facing recaps, and GM-only diagnostics such as `diagnosticPlaceSummary`) continue to report the previous place and scene.

### Scope & Boundaries

- **In Scope**:
  - Reconcile `candidate.visibleState.location` in `packages/adventure-engine` when `applyPlaces` commits a valid `moveTo` to a different place (`moved === true`) and `visiblePatch.location` is absent or clearly refers to the old place.
  - Clear or prevent stale `previous.visibleState.situation` from persisting as the current scene after a committed move when the model omits `visiblePatch.situation` (without inventing ungrounded events).
  - Keep `turn.visiblePatch` / `classifyActionResolution` coherent with the reconciled move state so action-fulfilment and post-commit diagnostics agree.
  - Add an additive GM-only / evaluation integrity check for `currentPlaceId` vs `visibleState.location` / `visibleState.situation` coherence without naive string-equality false positives.
  - Add unit and regression tests covering all six scenarios listed in #5187.
- **Out of Scope**:
  - Inferring movement from narration alone when no validated `moveTo` proposal is present.
  - Adding an extra AI call to rewrite `location` or `situation`.
  - Modifying UI components, IndexedDB/OPFS schemas, or #5153 action-fulfilment retry logic.
  - Attaching GM-only diagnostic snapshots to public GitHub issues.

### Acceptance Criteria

- [ ] When `applyCompletedTurn` commits a valid `moveTo` to a different place and `visiblePatch.location` is omitted (or clearly points to the previous place), `session.visibleState.location` is deterministically updated from the resolved `Place` (preserving `sourceRecordId` when canonical and `placeId`), matching `session.currentPlaceId`.
- [ ] When `applyCompletedTurn` commits a valid `moveTo` with a model-supplied `visiblePatch.location` that is consistent with the destination place, the richer model description is preserved.
- [ ] When `applyCompletedTurn` commits a valid `moveTo` to a different place and `visiblePatch.situation` is omitted, the previous place's `visibleState.situation` is cleared (`undefined`) rather than remaining as the current scene.
- [ ] An invalid `moveTo` (unknown `placeId` with no `name`, or full place registry leaving `currentPlaceId` unchanged/unplaced) does not synthesise a move or overwrite `visibleState.location` / `visibleState.situation`.
- [ ] Companion travel during `moveTo` preserves a single identity (`reconcileDuplicateActiveCharacters` + `detectCompanionTravelIds`) and places both player and companion in the new `currentPlaceId`.
- [ ] Returning to a previously visited place reuses its existing `Place.id` and updates `visibleState.location` accurately; legacy sessions and no-move turns preserve existing fields unchanged.
- [ ] No secret leakage (`hiddenState.secrets`), no duplicated character presence, and no extra AI call.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/places.ts`: Extend `applyPlaces` (or add a focused helper called from `applyPlaces`) to reconcile `candidate.visibleState.location` and clear stale `candidate.visibleState.situation` when `moved === true`.
  - `packages/adventure-engine/src/completed-turn.ts`: Pass/reflect any reconciled `location` / `situation` coherence into `createCommittedTurn` / `classifyActionResolution` if needed, keeping `candidate.visibleState` and `turn.visiblePatch` consistent.
  - `packages/adventure-engine/src/evaluations.ts`: Add an additive integrity check alongside `hasValidCurrentPlace` that flags clear contradictions (e.g. `currentPlaceId` changed on a `moveTo` turn while `visibleState.location.text` still matches the previous place's name/location and not the new place, or `visibleState.location.placeId` disagrees with `currentPlaceId`), avoiding false positives when a model uses a valid descriptive variant.
  - `packages/adventure-engine/tests/places.test.ts`: Unit tests for `applyPlaces` location synthesis, stale-location detection, situation clearing, invalid `moveTo`, and no-move preservation.
  - `packages/adventure-engine/tests/completed-turn.test.ts`: End-to-end `applyCompletedTurn` regression tests for the six #5187 scenarios (including companion escort, revisit after transcript/reset, legacy session, and secret non-leakage).
  - `packages/adventure-engine/tests/evaluations.test.ts`: Tests for the additive integrity check.
- **Data Contracts & State Flow**:
  - `applyCompletedTurn` (`completed-turn.ts`) runs `materializeTurnState` -> sets `candidate.visibleState = materialized.visibleState` -> calls `applyPlaces(candidate, session, proposal.moveTo, materialized.visiblePatch, createId, ...)`.
  - `applyPlaces` (`places.ts`) computes `moved = Boolean(move) && currentId !== seeded.previousId`.
  - When `moved && currentId`:
    - Resolve `targetPlace = list.find((p) => p.id === currentId)` and `previousPlace = seeded.previousId ? list.find((p) => p.id === seeded.previousId) : undefined`.
    - **Location reconciliation**: Check whether `visiblePatch.location` was omitted (`visiblePatch.location == null`) or clearly points to `previousPlace` (e.g. `previousPlace` matches `candidate.visibleState.location.text` via `matchPlace([previousPlace], ...)` or equals `previous.visibleState.location?.text`, while `targetPlace` does not match). If so, synthesise a `StateFact` using `allocateId(existingIds(candidate), createId)`:
      - `text`: `targetPlace.relation ? "${targetPlace.name} (${targetPlace.relation})" : targetPlace.name` (or `targetPlace.name` if already descriptive).
      - `source`: `targetPlace.sourceRecordId ? "canonical" : "provisional"`.
      - `sourceRecordId`: `targetPlace.sourceRecordId` when present.
      - `placeId`: `targetPlace.id`.
    - **Situation reconciliation**: If `visiblePatch.situation === undefined` (model omitted a situation patch, so `candidate.visibleState.situation` still holds `previous.visibleState.situation`), clear `delete candidate.visibleState.situation` so the old scene is not presented as current.
  - `projectVisibleState` (`prompt-state.ts`) and `diagnosticPlaceSummary` (`apps/web/src/lib/services/adventure/adventure-review-capture.ts`) both read `session.visibleState.location`, `session.visibleState.situation`, and `session.currentPlaceId` directly, so they automatically stay in sync with zero UI or worker changes.

### Key Technical Decisions & Tradeoffs

- **Reconcile inside `applyPlaces` rather than `materializeVisiblePatch`**: `applyPlaces` is the single authority that resolves `moveTo` against `session.places`, handles invalid `placeId` fallbacks, and determines whether `moved` actually occurred. Reconciling `location` and `situation` there guarantees no divergence between `currentPlaceId` and `visibleState`.
- **Clear stale `situation` rather than synthesising prose**: When `visiblePatch.situation` is omitted on a move, clearing `candidate.visibleState.situation` (`undefined`) is safer than fabricating a summary from narration, avoids inventing ungrounded events, and matches existing `VisibleAdventureState` semantics where `situation` is optional.
- **Conservative old-place detection**: Only overwrite a model-supplied `visiblePatch.location` if it clearly matches the previous place (via `matchPlace([previousPlace], text)` or exact match with `previous.visibleState.location?.text`) and does not match the destination place. Otherwise, preserve the model's richer description.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: `moveTo` resolves to a new or existing destination `Place`; `visiblePatch.location` and `visiblePatch.situation` are omitted -> `currentPlaceId` updates to destination, `visibleState.location` is synthesised from the destination `Place` (preserving `sourceRecordId` if canonical), and stale `visibleState.situation` is cleared.
- **Negative / Error Path**: `moveTo` references an unknown `placeId` with no `name` (or `MAX_PLACES` is reached and `currentId === undefined`) -> `moved` is `false` (or no valid destination place exists), so `visibleState.location` and `visibleState.situation` are left untouched.
- **Cancellation / Edge Case**:
  - `id` allocation fails (`allocateId` returns `null`) -> `applyPlaces` returns `{ ok: false, message: "id-allocation-failed" }`, which `applyCompletedTurn` converts to `conflicting-patch` without mutating the session.
  - `moveTo` resolves to the same `previousId` (`moved === false`) -> no-op for `location` and `situation`.
  - Legacy session without `places` / `currentPlaceId` on a no-move turn -> existing `visibleState.location` and `visibleState.situation` remain unchanged.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing tests in `packages/adventure-engine/tests/places.test.ts` and `packages/adventure-engine/tests/completed-turn.test.ts` covering:
  1. Explicit `moveTo` with omitted `visiblePatch.location` and `visiblePatch.situation` -> `currentPlaceId` and `visibleState.location` align, stale `situation` cleared.
  2. `moveTo` with valid model-supplied `visiblePatch.location` -> natural description retained.
  3. `moveTo` with invalid `placeId` and no `name` -> no synthetic move or location overwrite.
  4. Escort companion moves with player, preserving single identity and placing both in destination `currentPlaceId`.
  5. Revisiting a previously visited place after transcript/reset reuses the same `Place.id` and updates `visibleState.location`.
  6. Legacy session and no-move turn preserve `location` and `situation` unchanged.
- [ ] **Task 2: Core Engine Logic** — Implement `location` synthesis/stale-patch replacement and stale `situation` clearing in `packages/adventure-engine/src/places.ts`, and ensure `completed-turn.ts` keeps `turn` metadata/progress consistent.
- [ ] **Task 3: Integrity Check** — Add additive GM-only/evaluation coherence check in `packages/adventure-engine/src/evaluations.ts` and unit tests in `packages/adventure-engine/tests/evaluations.test.ts`.
- [ ] **Task 4: Verification Gate** — Run impacted checks (`test:changed`, `lint:changed`, and `adventure-engine` typecheck/tests).

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx tsc --noEmit -p packages/adventure-engine/tsconfig.json
```
