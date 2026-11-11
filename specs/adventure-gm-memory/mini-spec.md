# Adventure GM Memory and Pacing Mini-Spec

Source: review of a 354-turn World Entry session (diagnostic snapshot, revision 363).

## 1. Specification (What & Why)

### Problem Statement

In a long solo adventure the GM loses track of where things are and what happened.
The prompt carries only the last eight turns of dialogue plus flat lists of facts
and characters, so older events survive only if the model happened to save a fact,
facts from places the player has left stay in the prompt at full weight, and place
names get muddled. The GM also repeats the same scene dressing when a scene stalls,
and a message addressed to the GM ("To dm…") is handled correctly only by luck.

### Scope & Boundaries

- **In Scope** (three PRs, in this order):
  - **PR A — pacing and GM-directed messages**: stalled-scene detection in the engine
    with a one-off `STALLED SCENE:` prompt line; one prompt rule for out-of-character
    messages addressed to the GM.
  - **PR B — places**: a registry of visited places on the session; facts and
    characters tagged with a place; the engine re-tags on a move; the prompt sends
    the current place in full and other places in short form.
  - **PR C — story so far**: a rolling summary of turns that have left the
    eight-turn window, stored on the session and sent with the state.
  - The diagnostic JSON copy includes the new fields.
- **Out of Scope**:
  - Time advancement rules (about five minutes a turn in the reviewed session is fine).
  - Changing the 8-turn transcript window, the 80-turn thread refresh or the state caps.
  - Back-filling place tags onto facts in existing sessions.
  - Any new player-facing screen for places or the summary.
  - Oracle-proxy worker changes (Task C0 confirms none are needed).

### Acceptance Criteria

- [ ] After 4 consecutive committed turns with no state change, no reveal and no
      time advance, the next prompt contains exactly one `STALLED SCENE:` line; it is
      absent on the turn after any state change.
- [ ] The behaviour text contains a rule that a message addressed to the GM is a
      correction to the fiction: apply it to state and continue the scene briefly.
- [ ] A turn that moves the player records the destination in `places` (reusing an
      existing place when the model names its id) and sets it as the current place.
- [ ] Facts and characters added in a turn carry the current place id without the
      model supplying it.
- [ ] On a move, characters added or updated in that turn travel with the player;
      all others keep their old place and stop appearing as present.
- [ ] The prompt state lists current-place and untagged facts in full, and facts
      from other places grouped by place name, at most 5 per place, 120 characters each.
- [ ] A session saved before this change loads, plays and saves with no migration
      step and `schemaVersion` still 3.
- [ ] Once 8 turns beyond the transcript window are unsummarised, one summary call
      runs and `storySoFar` (at most 1,500 characters) is saved and sent in the
      next prompt.
- [ ] A failed, offline or cancelled summary call never blocks or fails a player turn.
- [ ] The summary is built only from player-visible text (player action and narration).

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/scene-pacing.ts` (new): `sceneStallPacing(session)`,
    modelled on `world-entry-pacing.ts`.
  - `packages/adventure-engine/src/prompt.ts`: stall line, GM-message rule, projected
    place-aware state, `GM-ONLY story so far`. Move the new projection into
    `prompt-state.ts` (new) to keep `prompt.ts` small.
  - `packages/adventure-engine/src/schemas.ts`, `types.ts`: optional `placeId` on
    state facts; optional `places` and `storySoFar` on the session; optional `moveTo`
    on the complete-turn proposal.
  - `packages/adventure-engine/src/places.ts` (new): resolve or create a place, tag
    new facts, re-tag on a move, evict when the character cap is reached.
  - `packages/adventure-engine/src/turn-state.ts` / `completed-turn.ts`: call the
    place step during commit.
  - `packages/adventure-engine/src/story-summary.ts` (new): `pendingSummaryTurns`,
    `buildStorySummaryPrompt`, `applyStorySummary` reducer.
  - `packages/ai-engine/src/adventure-turn-generation.service.ts`: `moveTo` in
    `adventureTurnResponseSchema`. New small `adventure-summary.service.ts` for the
    summary call, so the turn service does not grow.
  - `apps/web/src/lib/stores/oracle/adventure-generation.svelte.ts`,
    `adventure-runtime.ts`, `adventure-actions.ts`: trigger the summary after a
    commit and apply it when idle.
  - The compact diagnostic export (added in #4718): include `places`, `storySoFar`,
    stall count.
  - The player-facing state panel: show only characters at the current place.
- **Data Contracts & State Flow** (all additive and optional; `schemaVersion` stays 3):
  - `Place = { id, name, sourceRecordId?, relation? }`; `session.places?: Place[]` (max 30).
  - `stateFact.placeId?: id`. Untagged means "applies everywhere".
  - `visibleState.location.placeId?: id` is the current place.
  - Proposal `moveTo?: { placeId?: id; name?: text; relation?: text; sourceRecordId?: id }`.
    The model sets it only when the player changes place.
  - `session.storySoFar?: { text (max 1,500), throughSequence: number, updatedAt }`.
  - Persistence: the existing `.codex/adventures/<session-id>.json` document. No new store.

### Key Technical Decisions & Tradeoffs

- **The engine tags and re-tags; the model only declares the move.** The model
  already forgets to remove stale facts, so asking it to maintain place tags would
  fail the same way. Cost: a companion must be mentioned in the move turn's patch
  to travel with the player.
- **Nothing is deleted on a move.** Characters and facts elsewhere stay stored and
  are shown in short form. When `activeCharacters` reaches its cap of 30, the engine
  drops the oldest character at another place rather than failing the commit.
- **Stall line fires on every 4th quiet turn**, not on every turn past the
  threshold, so it stays a nudge. A turn is quiet when its visible and hidden
  patches are empty, nothing was revealed, no provisional fact was added and time
  did not advance.
- **Summary from player-visible text only.** It can never leak a secret, and the
  GM-only state already carries the hidden side. It is still labelled GM-only and
  not shown in the UI.
- **Summary runs in the background and is applied only when the runtime is idle.**
  It bumps the revision as a local save, which `confirmInteraction` already
  tolerates, so the provider thread is not reset. Alternative rejected: summarising
  inside the turn call, which adds output and latency to every turn.
- **Catch-up in chunks of at most 16 turns per call**, oldest first, so an existing
  long session (346 unsummarised turns in the reviewed one) catches up over
  successive turns instead of one oversized call.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: player moves; the place is recorded; the next
  prompt shows the new place in full, the old one in short form, the story so far,
  and no stall line.
- **Negative / Error Path**:
  - `moveTo.placeId` unknown: reject the proposal as `conflicting-patch` (existing
    repair path).
  - `moveTo` with neither `placeId` nor `name`: schema-invalid.
  - `places` at 30: reuse the closest name match if any, otherwise keep the location
    text and leave it untagged; never fail the turn.
  - Summary call fails, returns empty or over-length text, or the device is offline:
    discard, keep the previous summary, retry at the next trigger.
- **Cancellation / Edge Case**:
  - Player submits a turn while a summary is in flight: the summary result waits and
    is applied after that turn commits; if `throughSequence` no longer matches, it
    is discarded.
  - Session ended or switched while a summary is in flight: abort and discard.
  - Legacy session with no `places`: every fact is untagged and sent in full, as today.
  - Fewer than 4 turns, or a pending roll: no stall line.

---

## 3. Tasks & Execution Sequence (When)

### Preliminary

- [x] **Task 0: Baseline from the snapshot** — Done. Findings:
  - Only the last 20 turns keep their patches; the 334 condensed turns cannot be
    scored for quiet runs. The diagnostic JSON now reports `quietTurns` (PR A) and
    a follow-up could add a per-turn quiet flag to condensed turns.
  - In the 20 full turns, quiet runs were 4 and 7 turns long, so a threshold of 4
    would have fired twice. Threshold stays at 4.
  - 35 of 353 consecutive turn pairs (10%) share two or more ambient words
    (hearth, cup, counter, wind...). "hearth" appears in 94 of 354 turns (27%) and
    "alehouse" in 47.
  - 80 of 354 turns carry a time advance (1,740 minutes). My earlier remark that
    most turns have none was an overstatement; time stays out of scope.
  - Place confusion: "Tiny village" is the Vault's name for the high settlement but
    the GM also uses "lower village" and "village below"; only 4 and 4 mentions, so
    it is a few-turn confusion, not widespread.
  - `knownFacts` is at 33 of 60, so the cap is not the cause of stale facts. The
    cap-overflow behaviour is still to be pinned by a test in PR B.

### PR A — pacing and GM-directed messages

- [x] **Task A1: Tests** — `tests/scene-pacing.test.ts`: 4 quiet turns give a due
      stall; a state change, reveal or time advance resets it; fewer than 4 turns and
      a pending roll give none; quiet turn 5 gives none and turn 8 gives one.
      Prompt test: stall line present once when due and absent otherwise; GM-message
      rule present.
- [x] **Task A2: Engine** — Add `scene-pacing.ts` and export it.
- [x] **Task A3: Prompt** — Add the stall line and the GM-message rule to `behavior`.
      Check the behaviour text stays under its 16,000-character budget.
- [x] **Task A4: Diagnostics** — Add the stall count to the compact JSON summary.
- [ ] **Task A5: Verification gate and PR.**

### PR B — places

- [ ] **Task B1: Tests** — schema: legacy session parses unchanged; `moveTo`
      validation. `tests/places.test.ts`: new place created; existing place reused
      by id; unknown id rejected; new facts tagged; companions travel, others stay;
      eviction at the character cap; registry full. Prompt-state test: full versus
      short form, 5 per place, 120 characters.
- [ ] **Task B2: Schema and types** — Optional `placeId`, `places`, `moveTo`.
- [ ] **Task B3: Engine** — `places.ts`, wired into the commit in `turn-state.ts`.
      Seed the first place from `worldEntry.location` in `initialSession`.
- [ ] **Task B4: Prompt** — `prompt-state.ts` projection; behaviour rule telling the
      model when to set `moveTo` and that place names are fixed once recorded.
- [ ] **Task B5: Response schema** — `moveTo` in `adventureTurnResponseSchema`.
- [ ] **Task B6: UI and diagnostics** — State panel lists only characters at the
      current place; diagnostic JSON includes `places`.
- [ ] **Task B7: Verification gate and PR.**

### PR C — story so far

- [x] **Task C0: Proxy check** — Confirm the system proxy and the custom-key path
      both accept a plain-text summary call with the existing client. Stop and
      report if a worker change is needed.
- [x] **Task C1: Tests** — `tests/story-summary.test.ts`: trigger at 8 pending turns;
      chunk capped at 16; reducer rejects over-length text and a stale
      `throughSequence`; prompt includes the summary. Service test: failure and
      abort leave the session untouched. Store test: a result arriving mid-turn is
      applied after the commit; the provider thread is not reset.
- [x] **Task C2: Engine** — `story-summary.ts` and the schema field.
- [x] **Task C3: AI service** — `adventure-summary.service.ts` with constructor-injected
      client and abort support.
- [x] **Task C4: Store wiring** — Trigger after commit, apply when idle, call
      `confirmInteraction` with the saved revision.
- [x] **Task C5: Prompt and diagnostics** — `GM-ONLY story so far` in state; field in
      the diagnostic JSON.
- [ ] **Task C6: Replay check** — Load the reviewed session, play 10 turns, and
      confirm catch-up, prompt size under budget and no thread reset.
- [x] **Task C7: Verification gate and PR.** (#4725)

---

### Built differently from the draft

- The summary is not saved on its own. It waits in memory and is attached to the
  session the next turn is generated from, so that turn's own save persists it: no
  extra revision, no race with the player's next action, no provider-thread reset.
  `attachStorySummary` replaces the planned `applyStorySummary` and does not bump
  the revision.
- Not attached on roll-resolution turns; the next ordinary action attaches it.
- Task C6 (replay of the reviewed session) was not run; it needs a live model.

### Follow-up: diagnostic export

- Every turn in the diagnostic JSON, condensed or full, now carries `signals`
  (`quiet`, `locationChanged`, `stateChanges`, defaults omitted), and the summary has
  `longestQuietRun` and `stalledScenes`.
- Still missing, because it is not recorded on the turn: the place a turn took place
  in, and per-turn model, stateful or stateless path, thread resets and prompt size.
  Adding them means persisting generation metadata at commit time.

## 4. Verification Gate

Run for each PR, from a new branch off `staging`:

```bash
bun scripts/lint-changed.mjs --base origin/staging
bun scripts/test-changed.mjs --base origin/staging
(cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error)
bunx fallow audit --format json --quiet --explain --gate-marker agent
```

Then the `codex-review` review before opening the PR. No changelog entry for PR A;
PRs B and C get one user-facing line each ("The GM remembers where people are" /
"The GM remembers earlier events in long adventures").

### Follow-up: places linked to Vault records

Places were only linked to a record when they were the world-entry start. Now:

- **Link by exact title.** Before each turn the app compares place names (and aliases)
  with the Vault's location records, by exact title ignoring case, punctuation and a
  leading "the", and links a place only when exactly one record matches. A link whose
  record has been deleted is dropped silently. The links are attached to the
  in-memory session the turn is generated from and saved by that turn's own save, like
  the story notes. A missing Vault or failed lookup never fails the turn.
- **The current place's record is an anchor**, sent in full like the start location.
  Other places' records are not, to keep the prompt budget.
- **Aliases.** A place keeps up to five other names. A move by name matches a name or
  alias ignoring case, punctuation and "the", or a name that continues a known
  name of two or more words at a word boundary ("Tiny village in the high slopes" for
  "Tiny village"). When it continues several places the longest known name wins and a
  tie matches nothing. A one-word name ("Nombe") is never continued, so "Nombe slopes"
  stays a separate place. The model sees each place's aliases and a `canonical` flag.
- Not done: fuzzy matching, linking by records' own aliases (entities have none), or
  letting the model supply record ids.
