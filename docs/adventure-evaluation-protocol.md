# Solo Adventure Mode: Multi-Scenario Evaluation & Staging Protocol

Use this protocol to evaluate Solo Adventure Mode across multi-scenario play, existing-world grounding, entity continuity, and strict secrecy before release. Run the automated gates first, then follow the desktop and mobile staging smoke walkthroughs in `AdventureSurface`.

## Record the run

| Item                                  | Value |
| ------------------------------------- | ----- |
| Tester and date                       |       |
| App URL and commit/build              |       |
| Browser, version and operating system |       |
| Viewport / device (Desktop & Mobile)  |       |
| Provider / model                      |       |
| Result                                |       |
| Failures and issue links              |       |

For each case below, record **Pass**, **Fail**, or **Blocked**. A blocked or skipped case is not a pass.

## Automated Release Gates

Run both suites locally before any staging walkthrough:

```bash
(cd packages/adventure-engine && bun test tests/evaluations.test.ts tests/living-settlement-long-run.test.ts tests/emergent-30-turn.test.ts tests/cross-scenario-causality.test.ts)
(cd apps/web && bunx vitest run src/lib/services/adventure/adventure-evaluation-runner.test.ts src/lib/services/adventure/adventure-multi-scenario-gates.test.ts src/lib/services/adventure/adventure-grounding-continuity.test.ts)
(cd apps/web && bunx vitest run src/lib/stores/oracle/tests/gm-leak-harness.test.ts src/lib/stores/oracle/tests/gm-secrecy-outputs.test.ts src/lib/stores/oracle/tests/gm-secrecy-playthrough.test.ts)
```

The GM-only secrecy tests use a stubbed model, no network and no OPFS:

- `gm-secrecy-outputs.test.ts` collects every GM-only string from `minimal.v1.json` and from a canary copy of the reference one-shot (built in test code, with one unique `GMCANARY-…` marker per guarded record type), then checks each player-facing output: player transcript and archive view, visible state, provisional facts, pending roll text, error and roll messages, summary requests and story notes, `JOURNAL:CAPTURE` payloads, promotion notices and entity drafts, the package-unavailable recovery panel, and the guest export. The GM review and diagnostic copies are checked for their GM-only warning, not for leaks.
- `gm-secrecy-playthrough.test.ts` plays the canary reference from the entry scene to the cellar and the authored ending, reloads partway through with a new manager, and runs the same checks after every turn. It also asserts the canary secret really sits in hidden state.
- The start-screen package card (#4943) must be added to this harness when it lands.

## Six-Dimension Evaluation Rubric & Stop-Ship Gates

Every evaluated turn and run is scored `0` (fail) or `1` (pass) across six dimensions in `packages/adventure-engine/src/evaluations.ts` and `AdventureEvaluationRunner`:

| Dimension                | Pass Criteria (`1`)                                                                                                                                                                                                                                                  | Fail Criteria / Stop-Ship Gate (`0`)                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agency`                 | Narration and roll setup leave decisions, speech, thoughts, and feelings to the player.                                                                                                                                                                              | Narrating `<PC> decides/chooses/says/thinks/feels/does` or forcing player actions (`you must`, `you are forced to`).                                                                          |
| `secrecy`                | Zero canary tokens, unrevealed `hiddenState.secrets`, unheard `scenarioCollection` truths/leads, GM-only events, `timeAdvance.developments`, or GM-only lore in player-facing surfaces.                                                                              | Any secret string appears in narration, `setupNarration`, `visiblePatch`, `suggestedActions`, `buildAdventureRecap`, `createPlayerTranscript`, `buildStorySummaryRequest`, or error messages. |
| `continuity`             | `currentPlaceId`, `activeCharacters`, `knownFacts`, `people`, `scenarioCollection` (knowledge/status/stage), `pendingRoll`, and monotonic `worldTime.elapsedMinutes` remain consistent across turns, summaries, and reloads.                                         | Clock regression, missing place/person IDs, scenario knowledge/status/stage regression, or dropped `pendingRoll` outcome.                                                                     |
| `canonSafety`            | Canonical `sourceRecords` are preserved unmodified, canonical titles are not duplicated into `provisionalFacts`, and `source: "canonical"` precedence is respected.                                                                                                  | Overwriting canonical records/facts or proposing a provisional fact with a canonical title.                                                                                                   |
| `consequenceCredibility` | `timeAdvance.developments` target valid `gmThreads` or open scenarios; `elaborateScenarios` advances at most 1 stage and never on the turn of first reveal; `propagateKnownConsequence` cites a single-hop player-visible `causedBy` link over a shared `anchorRef`. | Unknown thread IDs, multi-stage jumps, same-turn reveal + elaboration, or 2-hop/unanchored propagation.                                                                                       |
| `unnecessaryEscalation`  | Declining a lead or choosing ordinary daily activity resolves calmly without forced quests, sudden combat, or unprompted stage escalation.                                                                                                                           | Adding `objectives`, forcing combat/crisis narration, or escalating scenario stages when the player declines or acts ordinarily.                                                              |

**Stop-Ship Gate**: Any `0` on `secrecy`, `canonSafety`, or `consequenceCredibility`, or a run score `< 1.0` on `agency` / `continuity` / `unnecessaryEscalation`, blocks release until resolved.

## Prepare a Staging Test Campaign

1. Open a disposable Vault on staging and create:
   - A player character (`character`), e.g. **Mara**.
   - A settlement location (`location`), e.g. **Brackwater Quay**, with both public description and GM-only `lore`.
   - A shared canonical actor (`character`), e.g. **Harbourmaster Venn**, linked to Brackwater Quay.
   - An unrelated canonical location (`location`), e.g. **Old Bell Tower**, with GM-only `lore`.
   - One future-dated entity (`startDate` in a future year) and one historical entity (`endDate` in the past).
2. Verify both **Desktop** (`>= 1280px`) and **Mobile** (`390x844`) viewports are available for the walkthrough.

## Staging Smoke Walkthrough (`AdventureSurface`)

### 1. Ready-Made Start & Existing-World Grounding

1. Open `AdventureSurface` and start a **Ready-made** adventure anchored to **Mara** and **Brackwater Quay**.
2. **Expect:** Opening narration reflects Brackwater Quay's public details without leaking GM-only `lore` or future-dated facts.
3. Submit 3 ordinary actions (e.g., asking locals about boats, buying bread).
4. **Expect:** No forced quest objectives or combat; `worldTime` advances monotonically.

### 2. World Entry Start & Living Settlement Multi-Scenario Play

1. Start a **World Entry (`explore`)** adventure at **Brackwater Quay**.
2. Trigger background rumour seeding and inspect the **Leads / Situations** panel.
3. **Expect:** Heard leads appear; unheard rumours, GM-only truths, and `timeAdvance.developments` remain hidden from player projections and recap.
4. Follow one lead, ignore a second lead while advancing time, travel to **Old Bell Tower**, and return to **Brackwater Quay**.
5. **Expect:** `places` and `people` preserve stable identities across travel, reload, and archive/resume.

### 3. Automatic Entity Continuity & Selective Promotion

1. Play until at least one new provisional `person`, `place`, `faction`, `item`, or `event` is introduced.
2. Open the **Discoveries / Provisional Facts** review drawer.
3. Promote one discovery to the Vault and dismiss another.
4. **Expect:** Promoted fact links to a single Vault record without duplicating canonical titles; dismissed fact remains in session continuity without creating a Vault entity; GM-only facts never appear in promotion drafts.

### 4. Player-Projection, Roll, & Error Secrecy Checks

1. Trigger a **Roll Required** turn, record an outcome, and reload the page before resolving.
2. **Expect:** `pendingRoll` and its recorded outcome survive reload without rerolling dice.
3. Inspect the **Recap**, **Transcript**, and any **Error** banners (e.g. offline toggle).
4. **Expect:** Zero GM secrets, canary strings, or raw storage error details appear in any player-visible UI or copy.

### 5. Mobile Viewport Smoke Check (`390x844`)

1. Repeat start, action submission, roll outcome entry, and discovery drawer inspection on a mobile viewport.
2. **Expect:** Controls remain reachable without horizontal overflow or clipped modals.

## Live-Model Baseline Recording Template

Record one row per evaluated provider/model during manual or live-API benchmark runs:

| Date | Provider / Model | Scenario / Lane                    | Turns | Model Calls | Peak Context (chars) | Avg Turn Latency (ms) | Expansion Count | Rubric Scores (`A/S/C/CS/CC/UE`) | Qualitative Issues |
| ---- | ---------------- | ---------------------------------- | ----- | ----------- | -------------------- | --------------------- | --------------- | -------------------------------- | ------------------ |
|      |                  | Ready-made (50+ turns)             |       |             |                      |                       |                 |                                  |                    |
|      |                  | World Entry (`explore`, 50+ turns) |       |             |                      |                       |                 |                                  |                    |
