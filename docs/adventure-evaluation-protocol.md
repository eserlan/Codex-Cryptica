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

- `gm-secrecy-outputs.test.ts` collects every GM-only string from `minimal.v1.json` and from a canary copy of the reference one-shot (built in test code, with one unique `GMCANARY-…` marker per guarded record type), then checks each player-facing output: player transcript and archive view, recap, visible state, provisional facts, pending roll text, error and roll messages, streamed narration previews (including a rejected generation), summary requests and story notes, `JOURNAL:CAPTURE` payloads, promotion notices and entity drafts, the package-unavailable recovery panel, and the guest export. Short secret text, clue reveals, and hidden names/titles are guarded. The harness also guards: `sourceRef.anchor` of GM-only records (unless a player-visible record shares the ID or anchor); GM-only record IDs in readable form (`-` and `_` read as spaces, whole words, at least 2 words and 12 characters); player-visible lines that name a hidden record ID, using the same matcher retrieval uses to move such lines into a GM-only companion excerpt (`createAdventureJsonHiddenIdMatcher`); short GM-only names (under 12 characters) as whole words, except the generic place words in `SHORT_NAME_ALLOWLIST`; and any 8-word run of a guarded string, unless the run also appears in player-visible package text. Pretty-printed JSON strings are checked after canonicalization. The GM review and diagnostic copies are checked for their GM-only warning, not for leaks.
- `gm-secrecy-playthrough.test.ts` plays the canary reference from the entry scene to the cellar and the authored ending, reloads partway through with a new manager, and checks the recap and captured streaming previews after every turn. It also asserts the canary secret really sits in hidden state.
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

### 5. Imported Adventure JSON (`adventure-json/v1`) End-to-End Walkthrough

Use `fixtures/adventures/reference-one-shot/adventure.v1.json` (or a converted package scored via [adventure-conversion-qa.md](./adventure-conversion-qa.md) and `bun scripts/score-adventure-conversion.ts`):

1. On **Play → Oracle AI GM**, open **Import Adventure JSON** (`Choose Adventure JSON`) and select the `.json` file.
   - **Expect:** Local validation succeeds with zero AI calls; the GM review screen shows title, scenes, counts, and `GM-only (locked)` visibility markers, and once approved the package list card never exposes `gm-only` secrets, clues, or hidden notes.
2. Approve the package, then:
   - Re-import the exact same file. **Expect:** Recognised as already imported (deduplicated, no duplicate version written).
   - Import a modified file with the same `id` and a new `version`. **Expect:** Opens a reviewable diff against the predecessor; both versions remain startable and an unused version can be removed, while an in-use version refuses removal with a clear reason.
3. _(Optional)_ Open **Create Creatures** on the approved package version, review the preview, and confirm.
   - **Expect:** Created Creature entries match the preview, never overwrite existing Vault entries, and keep encounter links GM-only.
4. Press **Start** on the approved package, pick a starting scene (if available) and character, and press **Start adventure**.
   - **Expect:** Session starts cleanly (no `invalid-adventure-setup` / `DataCloneError`), pins `sourcePackage` (`packageId`, `version`, `formatVersion`, `hash`), and opens on the chosen starting scene.
5. Play 3+ turns including a scene transition and an action that advances package progress, then reload the page.
   - **Expect:** Scene progress and ledger events survive reload; the spoiler-safe progress view hides `gm-only` secrets/notes unless the GM audit disclosure is explicitly opened; zero `gm-only` text or internal ledger IDs appear in narration, recap, transcript, or guest export.

### 6. Mobile Viewport Smoke Check (`390x844` and `320x844`)

1. Repeat **Import Adventure JSON** (dropzone copy spans readable lines above a full-width upload CTA, no horizontal overflow), start, action submission, roll outcome entry, and discovery drawer inspection on a mobile viewport.
2. **Expect:** Controls remain reachable without horizontal overflow or clipped modals.

### 7. Improvisation, World Coherence, and Repeated-Question Recovery

1. In a disposable **World Entry** settlement, ask an NPC with an administrative role about a plausible local practice (for example, a public debt ledger that lists debtors but not creditors). Ask who the money is owed to, why the system works this way, and challenge an implausible explanation.
2. **Expect:** The Oracle invents a coherent, setting-appropriate explanation for details not fixed by the Vault or scenario. The NPC can acknowledge an earlier misleading explanation, distinguish their personal knowledge from the GM's knowledge, and offer a meaningful way to verify or investigate the answer. The Oracle does not insist an unspecified answer cannot exist.
3. Ask the same underlying question again using different wording for three turns. **Expect:** The dialogue does not cycle through paraphrases of "I don't know" and the same three suggestions. The GM either supplies a substantive clarification, an actionable discovery or a credible reason to seek a different source. The player remains free to abandon the conversation.
4. Follow an investigative scenario whose core truth is authored but a supporting identity or mechanism is unspecified. **Expect:** The GM can decide compatible supporting details and keep consequential choices consistent across subsequent turns and a reload, without changing the authored truth, resolving explicitly ambiguous/unresolved package facts, or exposing an unrevealed secret.
5. Inspect the player-visible state, discoveries, transcript, and GM-only diagnostic copy. **Expect:** Public inventions are recorded as needed, new secret choices are not accidentally exposed, and no arbitrary twist or forced quest has been introduced solely to end the conversation.

Treat repeated dialogue without new substance, or a world inconsistency repeatedly defended instead of repaired, as a **Fail** even if the turn JSON validates and the ordinary quiet-turn counter resets.

For **#5083 live-model verification**, run the repeated ledger questioning twice on staging, once with four variations of the same question and once followed by a deliberate change of topic. Record the provider/model, four narrations, and the GM-only diagnostic `dialogueLoopTurns` / `dialogueRecoveryDue` values in the test record. The fourth same-topic turn should receive a useful clarification, correction, or credible alternative; the unrelated action must remain unrelated. Repeat with a knowledgeable NPC who legitimately lacks a secret: recovery must never make them omniscient or reveal the secret. Automated prompt assertions alone are not proof of behavioural success.

## Live-Model Baseline Recording Template

### GM Director Treatment Comparison (#5113)

Use the synthetic bell-ringer action script in `packages/adventure-engine/tests/fixtures/gm-director-evaluation.ts`. Start every arm from the same cloned session and action sequence. Compare `luna-fast` with `low` and `medium` reasoning, Director guidance on and off, and retained versus reconstructed context (eight conditions). The off treatment is QA-only and must not change production defaults. Keep shared schemas, reducers, secrecy rules, and canon checks identical.

Run deterministic stubbed coverage in CI. Live provider runs are manual and explicitly opt-in; never add paid calls to CI. Record each condition's sample count, model key, requested effort, actual transport/reset classification, substantive-answer/progression outcome, causal consistency, NPC knowledge integrity, agency, secrecy/canon stop-ship results, latency, and provider-reported token usage. Calculate estimated price only when provider usage and the model registry price are both available; otherwise write `unavailable`. Do not infer token counts from prompt characters or assert interaction reuse where transport metadata says `unknown`.

For an explicit local-proxy run, use:

```bash
bun scripts/adventure-director-eval.ts --live \
  --efforts low,medium --directors off,on \
  --contexts retained,reconstructed --samples 1 \
  --proxy http://127.0.0.1:8787 \
  --output /tmp/gm-director-matrix
```

Without `--live`, the script prints the selected matrix and makes no provider calls. A live run writes a Markdown summary and JSON with aggregate scores, bounded per-turn failure/reset codes, and available usage; it does not write prompts or generated narration. `--samples` accepts 1–3 and the default matrix has eight conditions.

One stochastic run per condition is descriptive and does not support a causal claim. Before changing a global model or effort default, require at least three paired replays per condition on two synthetic fixtures, a consistent improvement against a predeclared progression score, no secrecy/canon/agency stop-ship failure, and a documented latency/cost trade-off. Peaceful outcomes and genuinely exhausted trails can pass; invented clues, forced escalation, and repeated non-answers fail.

| Fixture               | Director | Effort     | Context                | Samples | Progression | Stop-ship failures | Latency | Tokens / cost | Notes |
| --------------------- | -------- | ---------- | ---------------------- | ------- | ----------- | ------------------ | ------- | ------------- | ----- |
| Bell-ringer synthetic | on/off   | low/medium | retained/reconstructed |         |             |                    |         |               |       |

### Recorded Live Baseline (2026-11-23)

Ran `bun scripts/adventure-effort-eval.ts --efforts low,medium --repeats 1` through the local proxy (`127.0.0.1:8787`) against the existing **The Last Grind** fixture. This is an existing baseline comparison of reasoning effort only; it does **not** isolate Director treatment or retained versus reconstructed context. One sample per effort is descriptive, not causal.

| Effort | Calls | Committed turns | Latency (sum of model calls) | Tokens (input / output) | Estimated cost | Result                                                            |
| ------ | ----- | --------------- | ---------------------------- | ----------------------- | -------------- | ----------------------------------------------------------------- |
| low    | 3     | 1/2             | 26.0 s                       | 27,468 / 1,817          | $0.0037        | Fail: one `invalid-adventure-response`; continuity rubric 0.5.    |
| medium | 12    | 8/8             | 276.1 s                      | 137,394 / 26,842        | $0.0272        | Fail: secrecy rubric 0.875; remaining reported dimensions passed. |

Both runs used `luna-fast`. Costs are estimates from registry rates ($0.10/M input and $0.50/M output tokens); reasoning tokens are included in output tokens. Total: 15 calls, 164,862 input tokens, 28,659 output tokens, approximately $0.0308. The harness report is in `/tmp/adventure-5113-live/` and contains generated narration; only the aggregate findings above are retained here. Expected-beat checks remain pending human review. Do not infer an effort winner from this single pair.

### Director-on Follow-up (2026-11-24)

After correcting the Director prompt and harness issues described in the [turn-by-turn report](experiments/adventure-effort-live-report-2026-11-23.html), reran The Last Grind at low effort with Director enabled through the local app and proxy. The selected sample completed 8/8 turns in 9 calls with no retries or hard failures; all six automated rubric dimensions scored 1.0. Usage was 100,770 input and 7,994 output tokens over 85.6 seconds of summed model-call time, approximately $0.0141 at the registry rates above. Maren’s debt urgency, the shrine reward and cellar hint, the five-turn timer, Aldous’s self-hiding, and Tobiah’s motive appeared in the output.

Manual golden review recorded 16 beats met, one partial (the ledger clue omits the week-before timing), and two conditional/source-dependent. Wick remains at the lever because the player showed the lock entry but not proof of filing or Tobiah’s debt. The spare receipt was not found; the authored `secret-aldous-cellar` describes it as a fallback when the party did not read the ledger, while this scripted route reads it first, so the golden expectation needs human reconciliation with that condition. A single sample shows a good Director-on output but does not estimate a pass rate or establish a causal improvement.

### Synthetic Bell-Ringer Pair (2026-11-24)

Ran the corrected local-proxy harness at low effort with Director off/on and retained context, using one cloned Northbrook fixture per arm. The sanitized [comparison report](experiments/gm-director-low-retained-2026-11-24.md) includes per-turn transport and rubric diagnostics; its adjacent JSON records exact usage. These two samples are descriptive only. They do not establish a Director effect or justify changing model defaults.

| Director | Result | Turns | Rubrics (`A/S/C/CS/CC/UE`) | Expected signals | Calls | Latency | Input / output tokens | Estimated cost |
| -------- | ------ | ----- | -------------------------- | ---------------- | ----- | ------- | --------------------- | -------------- |
| off      | Pass   | 8/8   | 1/1/1/1/1/1                | 12/12            | 8     | 52.0 s  | 78,462 / 5,367        | $0.010530      |
| on       | Pass   | 8/8   | 1/1/1/1/1/1                | 12/12            | 8     | 53.9 s  | 90,695 / 5,090        | $0.011614      |

Both arms had zero rubric failures, NPC-knowledge violations, repeated non-answers, or causal-consistency failures; each produced one useful negative finding and one quiet outcome. Meaningful scenario advances were 1 off and 2 on. The Director-on sample used 12,233 more input tokens and cost $0.001084 more, with 1.95 seconds more summed request latency. The eighth turn was classified as the scripted provider-history reset in both arms. One sample per arm is not a pass-rate estimate or causal result.

### Synthetic Adventure Corpus (#5160)

Keep The Last Grind as a targeted regression. The separate synthetic corpus in `scripts/adventure-evaluation-corpus-fixtures.ts` adds two independent adventures, each with an investigation path and a quiet/off-script path. The paths cover witness knowledge limits, repeated questions, physical clues, uncertain testimony, earned reveals, partial actions, player corrections, context reset recovery, peaceful detours, and return visits.

Run the deterministic fixture, beat-scoring, capture, and report tests in CI. A live comparison is explicitly opt-in and pairs the same fixture path, initial session, and actions across Director-on/off:

```bash
bun scripts/adventure-corpus-eval.ts --live --samples 3 \
  --efforts low --contexts retained --directors off,on \
  --proxy http://127.0.0.1:8787 \
  --output /tmp/gm-director-corpus-live
```

Without `--live`, the command only prints the selected run count and makes no provider calls. Live reports contain per-turn player-facing output, expected-beat coverage (`present`, `partial`, or `absent`), hard-gate results, progression signals, context/reset metadata, and available usage metrics. The authored-beat matcher is a transparent phrase-coverage signal, not a semantic judge. Prompts and GM-only text are never written; output is redacted when the secrecy hard gate fails. Missing provider usage or registry pricing remains `unavailable`.

The default one-sample report is descriptive. The report marks a treatment comparison eligible for review only when every path has at least three paired samples under both treatments on at least two fixtures. This threshold is necessary for a treatment claim, not proof of causation by itself. Do not infer a default change without consistent predeclared progression gains, clean secrecy/canon/agency gates, and the measured latency/cost trade-off.

### Existing Live-Model Baseline Recording Template

Record one row per evaluated provider/model during manual or live-API benchmark runs:

| Date | Provider / Model | Scenario / Lane                    | Turns | Model Calls | Peak Context (chars) | Avg Turn Latency (ms) | Expansion Count | Rubric Scores (`A/S/C/CS/CC/UE`) | Qualitative Issues |
| ---- | ---------------- | ---------------------------------- | ----- | ----------- | -------------------- | --------------------- | --------------- | -------------------------------- | ------------------ |
|      |                  | Ready-made (50+ turns)             |       |             |                      |                       |                 |                                  |                    |
|      |                  | World Entry (`explore`, 50+ turns) |       |             |                      |                       |                 |                                  |                    |
|      |                  | Imported Adventure JSON (`v1`)     |       |             |                      |                       |                 |                                  |                    |
