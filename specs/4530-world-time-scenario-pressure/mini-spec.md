# Event-Driven World Time, Scenario Pressure & NPC Reactions (#4530) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In-world time in Oracle Adventure Mode can already be advanced manually (#4699) or via turn proposals, and legacy `gmThreads` can record time developments. However, structured multi-scenario adventures (`scenarioCollection`) lack a model for speculative actor intentions and scenario pressure, deterministic time-threshold triggers for AI-off manual advancement, and deferred observation of off-screen consequences when a player returns to a location. Situations need to evolve credibly when fictional time passes or consequential actions occur—without background timers, omniscient player notifications, or duplicate triggers on retry/refresh.

### Scope & Boundaries

- **In Scope**:
  - **Scenario Pressure & Actor-Intention Model (`ScenarioPressure`)**: Add an optional GM-only `pressure` structure on `ScenarioSeed` / `ScenarioState` / `ScenarioItem` capturing `actor`, `goal`, `currentStance`, `trigger`, `progression`, `expectedConsequence`, optional deterministic `triggerAfterMinutes`, and `triggeredAtMinute` (to guarantee at-most-once execution).
  - **Distinguish Speculative Plans from Committed History**: Keep `pressure` strictly in GM-only state (omitted from `playerScenarioProjection`, `createPlayerTranscript`, and `AdventureRecap`), while committed outcomes are recorded as `ScenarioEvent` entries (`kind: "consequence"`).
  - **Deterministic & Turn-Based Pressure Evaluation**:
    - When world time advances via `advanceManualWorldTime` (AI-off) or `applyCompletedTurn` / `applyTimeAdvance`, evaluate open scenarios with `pressure.triggerAfterMinutes`: if `elapsedMinutes >= triggerAfterMinutes` and `triggeredAtMinute === undefined`, fire at most once by setting `triggeredAtMinute` and recording a GM-only consequence event bound in `secretBindings.eventIds` plus a `worldTime.events` audit entry.
    - Extend `applyTimeAdvance` and `applyCompletedTurn` so `timeAdvance.developments` can reference open `scenarioCollection.items` IDs (in addition to legacy `hiddenState.gmThreads`), committing a GM-only `consequence` event on the target scenario.
  - **Observed Consequences (Not Omniscient Notifications)**:
    - Off-screen consequences triggered by time passage are recorded with `visibility: "gm"` and bound in `secretBindings.eventIds` so `detectHiddenLeakage` guards them and the player is not omnisciently notified while away.
    - When the consequence secret ID is revealed on a relevant return (`revealSecretIds`), `playerScenarioProjection` surfaces the revealed consequence event to the player.
  - **Oracle GM Prompt Guidance**: Include scenario `pressure` in `"GM-ONLY scenarios"` in `buildAdventurePrompt` and instruct the GM to use actor goals, stances, and unrevealed off-screen consequences when the player returns to or investigates relevant locations.
  - **UI Clarity for AI-Off vs Oracle Reactions**: Update `AdventureSituationSettings.svelte` copy/feedback so manual time advancement clearly indicates that deterministic clock updates happen locally offline while open-ended NPC reactions require an Oracle turn.
- **Out of Scope**:
  - Wall-clock timers, cron jobs, or background progression while the app is closed.
  - Numerical faction simulator mechanics (#4539 / #2396).
  - Map/hex/pointcrawl travel adapter (#4538).

### Acceptance Criteria

- [ ] Ignoring a miller rumour and advancing fictional time by four days (`5760` minutes) triggers its expected consequence **at most once** as a hidden GM event, without notifying the player while away, and surfaces it in `playerScenarioProjection` once revealed upon return.
- [ ] Scenarios without a trigger, or whose trigger threshold is not yet met, remain completely unchanged when fictional time passes.
- [ ] Refreshing, JSON round-tripping (`parseAdventureSession`), retrying a turn (`inputId`), or replaying `advanceManualWorldTime` (`eventId`) never reapplies world time or duplicates a triggered scenario consequence.
- [ ] Advancing time affects eligible open scenarios across `scenarioCollection` without leaking unrevealed truths, actor intentions, or off-screen consequences into player-facing projections.
- [ ] AI-off manual advancement (`advanceManualWorldTime`) deterministically fires eligible `triggerAfterMinutes` scenario pressures without an LLM call, while qualitative actor reactions are surfaced to the Oracle GM via `buildAdventurePrompt`.
- [ ] Verified by automated tests covering at least three independent scenarios alongside established `worldEntry.at` calendar and canon context.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts`: Define `ScenarioPressure` interface and add optional `pressure?: ScenarioPressure` to `ScenarioSeed` (inherited by `ScenarioState` and `ScenarioItem`).
  - `packages/adventure-engine/src/scenario-schemas.ts`: Add `scenarioPressureSchema` and attach `pressure: scenarioPressureSchema.optional()` to `scenarioItemSchema`.
  - `packages/adventure-engine/src/schemas.ts`: Add `pressure` to `scenarioStateSchema` so single-scenario migration and session parsing preserve it.
  - `packages/adventure-engine/src/world-time.ts`:
    - Allow `applyTimeAdvance` developments to reference open `scenarioCollection.items` IDs as well as `hiddenState.gmThreads`.
    - Export `applyScenarioTimePressures(session, elapsedMinutes, turnOrEventId, now)` to deterministically evaluate open scenarios with `pressure.triggerAfterMinutes <= elapsedMinutes` and `triggeredAtMinute === undefined`, appending a bound GM-only consequence event (`id: "${turnOrEventId}:pressure:${scenario.id}"`) and recording `triggeredAtMinute = elapsedMinutes`.
  - `packages/adventure-engine/src/manual-world-time.ts`: Call `applyScenarioTimePressures` during `advanceManualWorldTime` so AI-off manual clock steps deterministically trigger eligible scenario pressures.
  - `packages/adventure-engine/src/completed-turn.ts`: When `proposal.timeAdvance` is present, commit any scenario-targeted `developments` as GM-only scenario consequence events and run `applyScenarioTimePressures`.
  - `packages/adventure-engine/src/hidden-state.ts`:
    - Exclude `timeAdvance.developments` from `playerFacingStrings` (only `timeAdvance.cause` is player-facing) so GM-only development text does not false-positive the leakage guard.
    - Register unrevealed `pressure.expectedConsequence` in `scenarioSecretSources` so the leakage guard prevents premature narration before disclosure.
  - `packages/adventure-engine/src/scenario-state.ts`:
    - Preserve `pressure` in `createScenarioState`.
    - Omit `pressure` from `playerScenarioProjection`.
    - In `playerScenarioProjection`, include scenario events where `event.visibility === "player"` OR the event's bound secret ID (`secretBindings.eventIds[event.id]`) is present in `scenario.revealedSecretIds`.
  - `packages/adventure-engine/src/prompt.ts`: Include `pressure: scenario.pressure` in `"GM-ONLY scenarios"` and add concise behavioral rules for actor intentions, time-driven off-screen consequences, and revealing observed consequences upon return.
  - `apps/web/src/lib/components/oracle/adventure/AdventureSituationSettings.svelte`: Display current elapsed fictional time (when `worldTime.elapsedMinutes > 0`) and clarify AI-off deterministic clock advancement vs Oracle-narrated reactions.
  - `packages/adventure-engine/tests/world-time.test.ts`: Add comprehensive unit and multi-scenario tests (3+ independent scenarios, 4-day travel consequence, at-most-once firing, quiet scenario, return observation, retry/reload idempotency).

- **Data Contracts & State Flow**:
  - `ScenarioPressure`:
    ```ts
    export interface ScenarioPressure {
      actor: string;
      goal: string;
      currentStance: string;
      trigger: string;
      progression: string;
      expectedConsequence: string;
      triggerAfterMinutes?: number;
      triggeredAtMinute?: number;
    }
    ```
  - All state transitions remain pure, synchronous, revision-checked functions operating on `AdventureSession` and persisted through the existing OPFS `AdventureSessionRepository`.

- **UI & Design Tokens**:
  - `AdventureSituationSettings.svelte`: Uses Svelte 5 Runes (`$derived`), Tailwind 4 semantic tokens (`text-theme-text`, `border-theme-border`, `bg-theme-surface`), and Iconify classes (`icon-[lucide--clock]`).

### Key Technical Decisions & Tradeoffs

- **Single-Fire Deterministic Marker (`triggeredAtMinute`)**: Storing `triggeredAtMinute` directly on `scenario.pressure` makes idempotency across multiple time advances explicit, inspectable, and schema-validated without scanning event text.
- **Reveal-Driven Consequence Visibility**: Recording off-screen time consequences as `visibility: "gm"` with a secret binding in `secretBindings.eventIds` reuses the existing secret-reveal lifecycle (`revealSecretIds`). Once revealed on return, `playerScenarioProjection` surfaces the event to the player without mutating historical event provenance.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Player travels for 4 days (`5760m`); the miller scenario (`triggerAfterMinutes: 5760`) fires once as a hidden GM consequence; other scenarios without a met trigger stay unchanged; returning to Northbrook and revealing the consequence secret exposes the observed consequence in `playerScenarioProjection`.
- **Negative / Error Path**: Invalid durations, unknown thread/scenario IDs in `timeAdvance.developments`, stale revisions, or premature leakage of `expectedConsequence` into narration are rejected atomically with no state mutation.
- **Cancellation / Edge Case**: Retrying `advanceManualWorldTime` with the same `eventId`, advancing time again after `triggeredAtMinute` is already set, or advancing time on resolved/abandoned scenarios produces zero duplicate events.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Extend `packages/adventure-engine/tests/world-time.test.ts` with failing tests for:
  - 3+ independent scenarios with calendar/canon context (`worldEntry.at`).
  - 4-day travel (`5760m`) triggering the miller scenario's `expectedConsequence` at most once (both via AI-off `advanceManualWorldTime` and turn-based `applyCompletedTurn`), remaining hidden while away, and surfacing in `playerScenarioProjection` when revealed on return.
  - Scenarios without triggers or below threshold remaining unchanged.
  - Negative/failure cases: premature narration leakage of `expectedConsequence`, unknown scenario/thread IDs in `timeAdvance.developments`, and idempotent retry/reload safety.
- [ ] **Task 2: Schema & Types** — Add `ScenarioPressure` to `types.ts`, `scenario-schemas.ts`, and `schemas.ts`.
- [ ] **Task 3: Engine Logic (Time, Pressure & Projection)** — Implement `applyScenarioTimePressures` and scenario-targeted `developments` in `world-time.ts`, wire into `manual-world-time.ts` and `completed-turn.ts`, update `hidden-state.ts` leakage guards, and update `scenario-state.ts` projection for revealed consequence events.
- [ ] **Task 4: Prompt & UI Integration** — Expose `pressure` and off-screen consequence instructions in `prompt.ts`; display elapsed fictional time and clear AI-off vs Oracle guidance in `AdventureSituationSettings.svelte`.
- [ ] **Task 5: Verification Gate** — Run impacted tests, linter, type-check, and Fallow audit.

---

## 4. Verification Gate

```bash
bun scripts/test-changed.mjs --base origin/staging
bun scripts/lint-changed.mjs --base origin/staging
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bunx fallow audit --base origin/staging --format json --quiet --explain --gate-marker agent
```
