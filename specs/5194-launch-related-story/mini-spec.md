# Launch Selected Related Story in Existing Play Session (#5194) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

After a player completes a story arc (#5191 / #5192) and sees player-safe continuation pitches (#5193), they need an opt-in way to turn one chosen pitch into a single playable scenario inside their existing `AdventureSession`—preserving their character, persistent world, and completed-goal record—while keeping **Continue exploring**, **Fresh adventure**, and **Finish for now** distinct.

### Scope & Boundaries

- **In Scope**:
  - Add `buildContinuationScenarioSeed()` and `launchContinuationCandidate()` in `packages/adventure-engine/src/continuation-candidates.ts` using `addScenario()` with deterministic `origin: { kind: "manual", manualId: candidate.id }` so retries, double-clicks, and reloads never create duplicate scenarios.
  - Expose `launchContinuation(candidate, gmOnlyTruth?)` on `AdventureScenarios` and `AdventureManager` through the existing single-writer lease/revision `repository.save()` boundary.
  - Extend `AdventureCompletionPanel.svelte` and `AdventureFocusPlay.svelte` with an opt-in **Related adventures** picker (showing up to 3 player-safe pitches with anchor badges and uncertainty) alongside **Continue exploring**, **Fresh adventure** (`Find another adventure`), and **Finish for now**.
  - Add focused unit/integration tests covering emergent and seeded/package sessions, idempotency on retry/double-click/reload, zero-mutation on cancel/preview, and 100+ turn budget safety.
- **Out of Scope**:
  - Automatic Vault canon promotion (#4535) or modifying original imported Adventure JSON packages.
  - Mandatory extra normal-turn AI calls.

### Acceptance Criteria

- [ ] Selecting a character, place, or event pitch adds exactly one new `ScenarioItem` to the active `AdventureSession` while preserving `playerCharacter`, `places`, `people`, `emergentThreads`, and the original completed outcome.
- [ ] Previewing, declining, or dismissing creates zero scenarios.
- [ ] Re-selecting, retrying, double-clicking, or reloading never creates a duplicate scenario or erases the completed outcome.
- [ ] Original `sourcePackage` and GM-only hidden truths remain untouched and spoiler-safe.
- [ ] Works across 100+ turn sessions within `MAX_DURABLE_STATE_CHARS`, and handles save errors gracefully with retry preserved.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/continuation-candidates.ts`: Add `buildContinuationScenarioSeed()` and `launchContinuationCandidate()`.
  - `apps/web/src/lib/stores/oracle/adventure-scenarios.ts` & `adventure-manager.svelte.ts`: Add `launchContinuation()`.
  - `apps/web/src/lib/components/oracle/adventure/AdventureCompletionPanel.svelte` & `AdventureFocusPlay.svelte`: Add opt-in **Related adventures** disclosure/picker and wire `onLaunchContinuation`.
  - Tests: `packages/adventure-engine/tests/continuation-candidates.test.ts` and `apps/web/src/lib/components/oracle/adventure/AdventureCompletionPanel.test.ts`.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Clicking **Launch story** on a pitch persists one new `ScenarioItem`, focuses it, acknowledges the completion panel, and keeps the player in Play.
- **Negative / Error Path**: Save/revision failure shows a non-blocking error notification and keeps the panel open for retry.
- **Cancellation / Edge Case**: Toggling or closing **Related adventures** without launching creates zero scenarios.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Engine Seed & Launch** — Implement `buildContinuationScenarioSeed()` and `launchContinuationCandidate()` with tests.
- [ ] **Task 2: Store & UI** — Wire `launchContinuation()` into `AdventureScenarios`, `AdventureManager`, `AdventureCompletionPanel.svelte`, and `AdventureFocusPlay.svelte`.
- [ ] **Task 3: Tests** — Cover emergent/seeded sessions, idempotency, cancel/preview zero-mutation, and 100+ turn budget.
- [ ] **Task 4: Local Review (`codex-review`)** — Run `codex-review` (Sweeps 0–8) on `git diff feat/5193-related-adventure-pitches...HEAD`, fix findings, and stamp `HEAD` (`bun scripts/codex-review-stamp.mjs`).
- [ ] **Task 5: Verification Gate** — Run `lint:changed`, `test:changed`, `typecheck-changed`, and `fallow:audit`.

---

## 4. Verification Gate

```bash
bun run lint:changed -- --base feat/5193-related-adventure-pitches
bun run test:changed -- --base feat/5193-related-adventure-pitches
bun scripts/typecheck-changed.mjs --base feat/5193-related-adventure-pitches
bun run fallow:audit
```
