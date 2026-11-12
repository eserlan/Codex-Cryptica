# Mini-Spec: Make Hidden World Situations Surface as Early, Actionable Opportunities (#4715)

**Status**: Draft  
**Target Area**: `packages/adventure-engine`, `apps/web/src/lib/services/adventure`  
**Tracking Issue**: [#4715](https://github.com/eserlan/Codex-Cryptica/issues/4715)

---

## 1. Specification (What & Why)

### Problem Statement

In open-ended World Entry play, background situations are seeded from the Rumour Generator as `knowledge: "unheard"`, yet live playtest feedback shows players can spend many turns on routine interactions without encountering a clear, actionable opportunity. Two compounding defects cause this delay:

1. [`worldEntryPacing`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/world-entry-pacing.ts) waits for `3` quiet turns (`WORLD_ENTRY_QUIET_TURN_LIMIT = 3`), and its `hadSeedActivity` / `scenarioEventTurnIds` checks treat private GM-only `hiddenPatch.gmThreads` updates (`status: "hidden"`) and GM-visibility scenario events (`visibility: "gm"`) as seed activity — resetting the quiet counter even when nothing became observable to the player.
2. Eligibility in `worldEntryPacing` checks all `scenarioCollection.items` globally rather than location-scoped candidates (`candidateScenariosForLocation`), and prompt guidance relies on prose exhortation without passing an explicit structured pacing/candidate signal or requiring a concrete person/place/decision follow-up when the player shows interest.

### Scope & Boundaries

- **In Scope**:
  - **Player-Observable Pacing (`packages/adventure-engine/src/world-entry-pacing.ts` & `scenario-collection.ts`)**:
    - Lower `WORLD_ENTRY_QUIET_TURN_LIMIT` from `3` to `1` (or `2` total committed turns including opening, i.e. within the first 1–2 meaningful player turns when an eligible local unheard seed exists).
    - Count only **player-observable scenario progress** as activity that resets `quietTurns`:
      - Player-visible scenario events (`event.visibility === "player"` with `event.turnId`, such as `revealScenarioIds` discovery events, `elaborateScenarios` progression events, and player-visible consequences/status changes).
      - Player-visible provisional facts linked to a scenario (`provisionalFact.visibility === "player-visible"` and `provisionalFact.scenarioId`).
      - Revealed secrets (`turn.revealedSecretIds`) or, for legacy sessions without `scenarioCollection`, a `gmThread` added or updated with `status === "revealed"`.
    - Private GM-only updates (`hiddenPatch.gmThreads` with `status: "hidden"`, unrevealed `hiddenPatch.secrets`, or `ScenarioEvent` entries with `visibility === "gm"`) must **never** reset `quietTurns`.
  - **Location-Scoped Eligibility & Quiet Settlements (`world-entry-pacing.ts`)**:
    - Scope unheard seed eligibility to the current location via `candidateScenariosForLocation(session)` (`item.status === "open" && item.knowledge === "unheard"`).
    - Expose `eligibleScenarioIds: string[]` (open unheard local candidates) and `activeLeadIds: string[]` (open heard local scenarios) on `WorldEntryPacing`.
    - Return `undefined` from `worldEntryPacing(session)` when no eligible local unheard seed (and no legacy hidden thread) exists for the current location, ensuring genuine quiet settlements stay peaceful and never hallucinate a quest to satisfy pacing.
  - **Explicit Pacing Context Signal & Actionable Lead Guidance (`packages/adventure-engine/src/prompt.ts`)**:
    - Include a compact structured `pacing` block inside `state.worldEntry` (`quietTurns`, `signDue`, `eligibleScenarioIds`, `activeLeadIds`) when `worldEntryPacing(session)` is defined, giving the model an explicit machine-readable signal alongside prompt behaviour.
    - Refine `worldEntryBehavior` so that:
      1. When `pacing.signDue` is true, the GM weaves one observable, optional local sign from `eligibleScenarioIds`, atomically includes its ID in `revealScenarioIds`, and provides at least one concrete optional `suggestedAction` naming a specific person, place, or choice to follow up (without exposing `gmOnly` truth or framing it as a mandatory quest).
      2. When the player interacts with a sign, asks an affected NPC, or seeks local news, the GM offers a concrete person, place, or decision (revealing an eligible local seed via `revealScenarioIds` or advancing an active heard lead via `elaborateScenarios`) rather than substituting unrelated mundane chores.
      3. When the player ignores or declines a sign/lead, peaceful exploration continues without cyclic re-revelation or artificial escalation.
  - **Playtest & Diagnostic Metrics (`world-entry-pacing.ts`, `adventure-review-capture.ts`, `emergent-30-turn.test.ts`)**:
    - Add pure helper `worldEntryDiscoveryMetrics(session)` computing `timeToFirstSign` (1-based turn index of first player-observable scenario discovery/sign, or `null`) and `timeToFirstActionableLead` (1-based turn index where a scenario first provides an actionable lead / `actionable-clue`, or `null`).
    - Surface `timeToFirstSign` and `timeToFirstActionableLead` in `adventureDiagnosticJson` summary (`apps/web/src/lib/services/adventure/adventure-review-capture.ts`) and extend the `#4540` evaluation suites (`emergent-30-turn.test.ts` and `world-entry-pacing.test.ts`) with fantasy and non-fantasy (sci-fi) fixtures plus interrupted/AI-off cases.
- **Out of Scope**:
  - Quest tracker UI, mandatory encounters, new generators, artificial countdown clocks, or extra LLM calls.
  - Schema version bumps or OPFS/IndexedDB storage changes (`AdventureSession` schema remains backwards-compatible).

### Acceptance Criteria

- [ ] **AC-1 (Early Observable Sign)**: In a deterministic World Entry session with at least one eligible local unheard seed, ordinary early exploration triggers `signDue: true` within 1–2 meaningful turns (`WORLD_ENTRY_QUIET_TURN_LIMIT`), surfacing an observable optional sign without an indefinite string of errands.
- [ ] **AC-2 (GM Churn Ignored)**: Private GM-only updates (`hiddenPatch.gmThreads` with `status: "hidden"`, unrevealed `hiddenPatch.secrets`, and `visibility: "gm"` scenario events from `timeAdvance`) never reset `quietTurns`.
- [ ] **AC-3 (Atomic Actionable Lead & No Duplication)**: When a sign surfaces or the player asks about it / local news, `revealScenarioIds` atomically marks the scenario `heard` with a specific person/place/decision (`playerVisible.lead` + concrete optional `suggestedActions`), and reload/retry does not duplicate the discovery event.
- [ ] **AC-4 (Voluntary Ignore / Peaceful Play)**: Deliberately ignoring or declining a surfaced sign leaves the scenario `heard` (never re-queued as an `unheard` candidate) and allows peaceful exploration without forced quests or artificial escalation.
- [ ] **AC-5 (Quiet Settlement & Location Scoping)**: A settlement with no matching unheard seed (or where only faraway location-bound seeds exist) returns `worldEntryPacing(session) === undefined` and does not leak faraway seeds; travelling back to a location with an unheard local seed can surface that missed local lead cleanly.
- [ ] **AC-6 (Spoiler Safety)**: Player narration, journal/transcript projections, suggested actions, recaps, and logs pass `detectHiddenLeakage` with zero `gmOnly.truth` or `gmOnly.ifInvestigated` exposure.
- [ ] **AC-7 (Genre Fixtures, Interrupted/AI-Off & #4540 Metrics)**: Automated tests cover both fantasy and non-fantasy (sci-fi) fixtures, interrupted/retry and AI-off/manual-time paths, and assert `timeToFirstSign` and `timeToFirstActionableLead` metrics in the `#4540` regression suite and diagnostic summary.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - [`packages/adventure-engine/src/scenario-collection.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-collection.ts): Add `playerScenarioEventTurnIds(session: AdventureSession): Set<string>` returning `event.turnId` only for events where `event.visibility === "player"`.
  - [`packages/adventure-engine/src/world-entry-pacing.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/world-entry-pacing.ts):
    - Update `WORLD_ENTRY_QUIET_TURN_LIMIT = 1` (so after the opening turn `turns[0]` or any single quiet turn, `quietTurns >= 1` triggers `signDue: true` on the player's first/second meaningful interaction).
    - Rework `hadPlayerSeedActivity(turn, session)` to check only player-observable activity:
      - `playerScenarioEventTurnIds(session).has(turn.id)`
      - player-visible provisional facts introduced on `turn.id` with a `scenarioId`
      - `turn.revealedSecretIds.length > 0`
      - legacy fallback (only when `!session.scenarioCollection`): `turn.hiddenPatch.gmThreads` added or updated with `status === "revealed"`.
    - Filter scenarios through `candidateScenariosForLocation(session)` to populate `eligibleScenarioIds` (`status === "open" && knowledge === "unheard"`) and `activeLeadIds` (`status === "open" && knowledge === "heard"`). If `eligibleScenarioIds.length === 0` and no legacy hidden `gmThreads` exist, return `undefined`.
    - Add `worldEntryDiscoveryMetrics(session: AdventureSession): WorldEntryDiscoveryMetrics` returning `{ timeToFirstSign: number | null; timeToFirstActionableLead: number | null }`.
  - [`packages/adventure-engine/src/prompt.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/prompt.ts):
    - Include `pacing` inside `state.worldEntry` when `worldEntryPacing(input.session)` is defined.
    - Update `worldEntryBehavior` to reference `pacing.eligibleScenarioIds` when `pacing.signDue` is true, require a concrete person/place/choice in `suggestedActions` and `revealScenarioIds`, and reinforce actionable progression (via `revealScenarioIds` or `elaborateScenarios`) when the player engages with a sign or local lead.
  - [`packages/adventure-engine/src/index.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/index.ts): Export `playerScenarioEventTurnIds`, `worldEntryDiscoveryMetrics`, and `WorldEntryDiscoveryMetrics`.
  - [`apps/web/src/lib/services/adventure/adventure-review-capture.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/services/adventure/adventure-review-capture.ts): Include `timeToFirstSign` and `timeToFirstActionableLead` in `diagnosticSummary`.

### Data Contracts & State Flow

```ts
export const WORLD_ENTRY_QUIET_TURN_LIMIT = 1;

export interface WorldEntryPacing {
  /** Trailing committed turns without player-observable scenario progress. */
  quietTurns: number;
  /** The world has been still long enough that the GM should surface one small sign. */
  signDue: boolean;
  /** Open, unheard candidate scenario IDs matching the current location. */
  eligibleScenarioIds: string[];
  /** Open, already-heard scenario IDs relevant to the current location. */
  activeLeadIds: string[];
}

export interface WorldEntryDiscoveryMetrics {
  /** 1-based turn number of the first player-observable scenario sign/discovery, or null. */
  timeToFirstSign: number | null;
  /** 1-based turn number of the first actionable lead (heard scenario with concrete lead or actionable-clue stage), or null. */
  timeToFirstActionableLead: number | null;
}
```

### Key Technical Decisions & Tradeoffs

- **`WORLD_ENTRY_QUIET_TURN_LIMIT = 1` vs `3`**: Setting the threshold to `1` means that if the opening turn (`turns[0]`) is purely atmospheric and does not surface a seed, `quietTurns` is `1` when building the prompt for the player's first meaningful action (`turns[1]`), immediately signalling `signDue: true`. If the opening or turn 1 _does_ reveal a seed (`revealScenarioIds`), `quietTurns` resets to `0` on the next turn so the GM does not machine-gun a second rumour on back-to-back turns.
- **Explicit JSON State Signal + Behavioural Rule**: Supplying `pacing: { quietTurns, signDue, eligibleScenarioIds, activeLeadIds }` inside `state.worldEntry` gives the LLM the exact candidate IDs to pass into `revealScenarioIds` without hunting through the full `GM-ONLY scenarios` array, while keeping zero extra model calls.
- **Legacy Compatibility**: Sessions created before `scenarioCollection` (using `hiddenState.gmThreads`) still work: a `gmThread` only resets `quietTurns` when its `status` transitions to `"revealed"`, never when updated with `status: "hidden"`.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Player enters a settlement with 3 seeded unheard rumours -> Turn 1 opening establishes the scene -> Player's first exploration turn sees `signDue: true` with `eligibleScenarioIds` -> Oracle weaves an observable sign and reveals `rumour-1` via `revealScenarioIds` -> Player asks about the sign on Turn 2 -> Oracle offers a concrete person/place/decision (`elaborateScenarios` to `actionable-clue`).
- **Negative / Quiet Settlement Path**: Player is in a settlement with zero matching unheard rumours (or all local rumours are already `heard`/`resolved`/`abandoned`, or belong to another town) -> `worldEntryPacing` returns `undefined` -> Oracle narrates ordinary peaceful life without inventing a forced plot hook.
- **Cancellation / Retry / AI-Off Edge Cases**:
  - Duplicate turn submission (`duplicate-input`) or interrupted turn retry does not duplicate discovery events or advance `quietTurns`.
  - Manual AI-off world-time advancement (`advanceWorldTime`) records GM-only pressure events (`visibility: "gm"`) which do not reset `quietTurns` for player-observable signs.

---

## 3. Tasks & Execution Sequence (When)

- [x] **T1: Player-Observable Pacing, Location Eligibility & Discovery Metrics (TDD)**
  - **Files**:
    - [`packages/adventure-engine/src/scenario-collection.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/scenario-collection.ts)
    - [`packages/adventure-engine/src/world-entry-pacing.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/world-entry-pacing.ts)
    - [`packages/adventure-engine/src/index.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/index.ts)
    - [`packages/adventure-engine/tests/world-entry-pacing.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/world-entry-pacing.test.ts)
  - **Action**: Write failing unit tests in `world-entry-pacing.test.ts` verifying: (1) `WORLD_ENTRY_QUIET_TURN_LIMIT = 1` triggers `signDue: true` within 1–2 turns when an eligible local unheard seed exists; (2) GM-only `hiddenPatch.gmThreads` (`status: "hidden"`) and `visibility: "gm"` scenario events do not reset `quietTurns`; (3) player-visible scenario events (`revealScenarioIds` / `elaborateScenarios`), scenario-linked player-visible provisional facts, and legacy `status: "revealed"` thread updates reset `quietTurns`; (4) faraway unheard seeds do not trigger `signDue` in a quiet settlement, and returning to the seeded location restores eligibility; (5) `worldEntryDiscoveryMetrics` accurately reports `timeToFirstSign` and `timeToFirstActionableLead`. Implement in `scenario-collection.ts` and `world-entry-pacing.ts`.

- [x] **T2: Explicit Pacing Signal & Actionable Lead Prompt Contract**
  - **Files**:
    - [`packages/adventure-engine/src/prompt.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/src/prompt.ts)
    - [`packages/adventure-engine/tests/world-entry.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/world-entry.test.ts)
  - **Action**: Update `buildAdventurePrompt` in `prompt.ts` to embed `pacing` in `state.worldEntry` and refine `worldEntryBehavior` so `signDue` names `eligibleScenarioIds`, requires atomic `revealScenarioIds` + a concrete person/place/decision option, and ensures engaging with a sign yields a specific actionable lead rather than unrelated chores while ignoring a sign preserves peaceful exploration. Add unit and multi-turn flow tests in `world-entry.test.ts` (including fantasy and sci-fi fixtures, travel/return, and ignore-sign flows).

- [x] **T3: Extend #4540 Evaluation & Diagnostic Summary with Discovery Metrics**
  - **Files**:
    - [`apps/web/src/lib/services/adventure/adventure-review-capture.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/services/adventure/adventure-review-capture.ts)
    - [`apps/web/src/lib/services/adventure/adventure-review-capture.test.ts`](file:///home/espen/Projects/Codex-Cryptica/apps/web/src/lib/services/adventure/adventure-review-capture.test.ts)
    - [`packages/adventure-engine/tests/emergent-30-turn.test.ts`](file:///home/espen/Projects/Codex-Cryptica/packages/adventure-engine/tests/emergent-30-turn.test.ts)
  - **Action**: Wire `timeToFirstSign` and `timeToFirstActionableLead` into `diagnosticSummary` in `adventure-review-capture.ts` (with unit test coverage in `adventure-review-capture.test.ts`), and extend `emergent-30-turn.test.ts` with a deterministic World Entry evaluation covering early sign surfacing (<= 2 turns), actionable lead follow-up, GM-only time/pressure churn immunity, interrupted retry / AI-off manual time advancement, and zero secret leakage.

- [x] **T4: Verification Gate**
  - **Action**: Run changed-file lint, affected workspace type-check, impacted unit tests, and Fallow audit.

---

## 4. Verification Gate

```bash
bun scripts/lint-changed.mjs --base origin/staging
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bun scripts/test-changed.mjs --base origin/staging
bunx fallow audit --changed-since origin/staging
```
