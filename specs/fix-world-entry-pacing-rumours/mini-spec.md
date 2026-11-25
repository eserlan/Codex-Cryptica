# Fix World-Entry Pacing Interruptions & Duplicate Rumour Batches Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

During active investigation of an already-heard World Entry lead (for example, examining physical clues or questioning a witness), `worldEntryPacing` treats any turn without a new `scenarioCollection` event, secret reveal, or `scenarioId`-tagged provisional fact as a "quiet turn" after just one turn (`WORLD_ENTRY_QUIET_TURN_LIMIT = 1`). This injects a `PACING` directive that causes random passersby to interrupt the scene with unrelated rumours. Compounding this, `needsContextualRumours` only checks for `unheard` scenarios at the current location, so once the initial batch of rumours has been heard, it generates a second, near-duplicate `"Rumours in <location>"` batch for the same settlement.

### Scope & Boundaries

- **In Scope**:
  - Update `hadPlayerSeedActivity` in `packages/adventure-engine/src/world-entry-pacing.ts` so active investigation turns on an existing open/heard lead (concrete `knownFacts`/`activeCharacters`/`relationships` additions, player-visible provisional facts, or `actionable-discovery` progress) reset `quietTurns` instead of triggering `signDue`.
  - Update `needsContextualRumours` in `packages/adventure-engine/src/contextual-rumours.ts` so a location with existing `open` scenarios (whether `unheard` or `heard`) does not trigger a fresh rumour batch for that same location.
  - Add unit tests in `packages/adventure-engine/tests/world-entry-pacing.test.ts` and `packages/adventure-engine/tests/contextual-rumours.test.ts` covering both positive and negative paths.
- **Out of Scope**:
  - Changing `WORLD_ENTRY_QUIET_TURN_LIMIT` (remains `1` for genuinely idle/quiet turns).
  - Modifying `prompt.ts` wording or GM Director ranking heuristics.
  - Retroactively deduplicating existing persisted sessions.

### Acceptance Criteria

- [ ] When an open, heard lead exists for the current location (or `focusedScenarioId` is set) and the latest turn records investigative progress (`knownFacts.add`/`update`, `activeCharacters.add`, `relationships.add`, a player-visible `provisionalFact`, or `generation.progressCategory === "actionable-discovery"`), `worldEntryPacing` returns `quietTurns: 0` and `signDue: false`.
- [ ] When an open, heard lead exists but the latest turn is genuinely quiet (no investigative progress and no seed activity), `worldEntryPacing` still returns `signDue: true` after `WORLD_ENTRY_QUIET_TURN_LIMIT` turns.
- [ ] When no open, heard lead exists yet, `worldEntryPacing` preserves existing behaviour (`knownFacts` alone do not suppress the first sign).
- [ ] `needsContextualRumours` returns `false` when the current location already has at least one `open` scenario (even if all local scenarios are `heard`), and returns `true` when all local scenarios are `resolved`/`abandoned` or belong to other locations.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/world-entry-pacing.ts`: Extend `hadPlayerSeedActivity` with an `hasActiveLead` flag (`activeLeadIds.length > 0 || Boolean(session.scenarioCollection?.focusedScenarioId)`) to count investigative turn progress as non-quiet.
  - `packages/adventure-engine/src/contextual-rumours.ts`: Update `needsContextualRumours` to check `item.status === "open" && matchesScenarioLocation(item, loc)` instead of `item.knowledge === "unheard" && matchesScenarioLocation(item, loc)`.
  - `packages/adventure-engine/tests/world-entry-pacing.test.ts`: Add tests for active investigation suppression vs. genuinely quiet turns and pre-lead turns.
  - `packages/adventure-engine/tests/contextual-rumours.test.ts`: Add tests for heard-open location suppression vs. resolved/abandoned re-seeding.
- **Data Contracts & State Flow**:
  - Pure, deterministic functions over `AdventureSession`; no schema, storage, or UI changes.

### Key Technical Decisions & Tradeoffs

- **Keep `WORLD_ENTRY_QUIET_TURN_LIMIT = 1` and gate on `hasActiveLead`**: Raising the global limit would delay first-sign surfacing in genuinely quiet openings and break existing pacing expectations. Gating investigative-progress suppression on `hasActiveLead` ensures the first sign still arrives promptly while preventing mid-investigation interruptions.
- **Check `status === "open"` in `needsContextualRumours`**: Checking `open` rather than `unheard` prevents duplicate batches while leads are actively in play, while still allowing a settlement to surface new rumours once prior ones are resolved or abandoned.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Active investigation on a heard lead keeps `signDue: false`; a location with open heard rumours does not generate a duplicate batch.
- **Negative / Idle Path**: A player with an open heard lead who takes an idle turn (`Look around` with empty patches and no `actionable-discovery`) still gets `signDue: true` if unheard seeds exist.
- **Edge Case**: A session with only `resolved` or `abandoned` scenarios at the current location (and `heardCount < MAX_SCENARIO_COLLECTION_ITEMS`) can still generate fresh rumours.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add unit tests in `world-entry-pacing.test.ts` and `contextual-rumours.test.ts` covering active investigation, idle turns with open leads, pre-lead turns, and heard-open vs. resolved/abandoned rumour batches.
- [ ] **Task 2: Core Logic** — Update `world-entry-pacing.ts` and `contextual-rumours.ts`.
- [ ] **Task 3: Local Review (`codex-review`)** — Run `codex-review` (Sweeps 0–8) on `git diff origin/staging...HEAD`, fix findings, and stamp `HEAD` (`bun scripts/codex-review-stamp.mjs`).
- [ ] **Task 4: Verification Gate** — Run impacted checks (`bun run test:changed`, `bun run lint:changed`, workspace type-check, and `bun run fallow:audit`).

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bun run fallow:audit
```
