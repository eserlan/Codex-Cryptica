# Progressive Scenario Elaboration & Provisional Fact Materialisation Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In Oracle Adventure Mode, local rumours and emerging situations frequently fail to progress when investigated. When players follow up on local hearsay, the Oracle GM often substitutes endless near-identical mundane errands (such as fetching water, mendings, or closing windows) or leaves rumours lingering indefinitely as quiet gossip, rather than deepening into meaningful, structured situations. Furthermore, meaningful NPCs (witnesses), locations, physical clues, and factions introduced during play are lost in raw narration or require manual recording, rather than being automatically extracted and materialised into persistent, deduplicated `provisionalFacts` with stable identities, scenario provenance, and canonical precedence.

Issue #4533 introduces a progressive elaboration ladder (`hearsay` → `actionable-clue` → `revelation-crisis`) driven by player engagement. Actively investigated rumours escalate into rich, consequential adventures with immediate next-step preparation, whilst peaceful, disengaged, or off-script players remain free of forced escalation, artificial deadlines, or mandatory combat. Concurrently, meaningful entities entering play are automatically extracted and materialised into deduplicated `provisionalFacts`.

### Scope & Boundaries

- **In Scope**:
  - **Progressive Elaboration Ladder**:
    - Define explicit, bounded elaboration stages on `ScenarioItem`: `hearsay` (stage 1: overheard rumour, vague gossip, background signs) → `actionable-clue` (stage 2: concrete witness, traceable clue, specific destination) → `revelation-crisis` (stage 3: underlying truth uncovered, active confrontation, moral dilemma, or urgent crisis).
    - Add additive schema fields: `stage: z.enum(["hearsay", "actionable-clue", "revelation-crisis"])` on `ScenarioItem` (defaulting to `"hearsay"` for existing and newly heard scenarios).
    - Extend `CompletedTurnProposal` with optional `elaborateScenarios?: Array<{ scenarioId: string; stage: ScenarioElaborationStage; discovery?: string }>` to atomically advance a heard scenario's stage alongside an optional discovery event.
    - Enforce turn pacing: a scenario can advance at most one stage per turn.
  - **Dual Play Lanes & Prompt Governance**:
    - _Voluntary Engagement Lane_: Once a character pursues an observable lead, consequential actions change the situation, expose discoverable clues or witnesses, and advance the ladder, actively preventing the "endless errands" loop.
    - _Peaceful / Off-Script Lane_: When a player declines a lead, ignores a rumour, or chooses quiet domestic activity, the world remains peaceful without forced escalation, arbitrary deadlines, surprise villains, or fake danger.
    - _Trivial Resolution_: Minor or mistaken rumours can be resolved within 2–3 turns without expanding into a full adventure.
    - _Truth Immutability_: Elaboration never alters the scenario's immutable baseline truth (`gmOnly.truth`) or contradicts earlier reveals.
  - **Automatic Provisional Entity Extraction & Materialisation**:
    - Extend `ProvisionalFact` and `NewProvisionalFact` with optional `scenarioId?: string` for scenario provenance.
    - Automatic deduplication in `reducer.ts`:
      - Cross-reference proposed entities against canonical `session.sourceRecords` by normalised name; suppress provisional creation to maintain canonical authority.
      - Cross-reference proposed entities against existing `session.provisionalFacts` by normalised name and kind; update existing summaries and scenario provenance instead of generating duplicate IDs.
    - Wire `elaborateScenarios`, `revealScenarioIds`, and `scenarioId` into `packages/ai-engine/src/adventure-turn-generation.service.ts` Gemini JSON schema.
    - Update `buildAdventurePrompt` instructions in `packages/adventure-engine/src/prompt.ts` for extraction of meaningful actors, places, clues, and factions.
  - **UI Presentation**:
    - Surface linked scenario badge/context on provisional entity discoveries in `AdventureProvisionalFacts.svelte`.
- **Out of Scope**:
  - Mandatory Adventure Canvas graph construction or automatic One-Shot Builder generation.
  - Automatic promotion of provisional entities into canonical Vault notes (reserved for explicit user review under #4535).
  - Cross-scenario faction conflict simulation or full multi-level dungeon floorplan generation.
  - Full redesign of desktop or mobile Adventure Mode workspace shells.

### Acceptance Criteria

- [x] **AC-1 (Elaboration Progression)**: When a player character actively investigates a heard rumour, consequential actions escalate the scenario along the ladder (`hearsay` → `actionable-clue` → `revelation-crisis`), advancing at most one stage per turn.
- [x] **AC-2 (Anti-Errand Guarantee)**: Investigating a rumour introduces concrete witnesses, actionable clues, or observable consequences; it never generates repeated near-identical low-stakes chores (e.g. fetching water, repairing shutters).
- [x] **AC-3 (Peaceful & Off-Script Lane)**: Deliberate disengagement, declining a lead, or pursuing ordinary daily life causes no forced narrative escalation, artificial timed crisis, or mandatory combat.
- [x] **AC-4 (Trivial Resolution)**: Minor, mistaken, or mundane rumours may resolve quietly within 2–3 turns without elaborating into an adventure.
- [x] **AC-5 (Truth & Canon Precedence)**: Elaboration never contradicts or rewrites the scenario's immutable baseline truth (`gmOnly.truth`), prior committed revelations, or canonical Vault facts.
- [x] **AC-6 (Automatic Provisional Materialisation)**: Meaningful NPCs (witnesses), locations (clue sites), factions, clues, or items introduced during elaboration are automatically committed as `provisionalFacts` with stable IDs and optional scenario provenance.
- [x] **AC-7 (Deduplication & Canonical Authority)**: Proposing an entity that matches an existing canonical source record creates no provisional record; proposing an entity matching an existing provisional fact updates it in place. Retries and reloads create zero duplicates or orphaned records.
- [x] **AC-8 (Secrecy & Spoiler Safety)**: GM-only entities, unrevealed secrets, and unvisited scenes remain completely absent from player projections, narration previews, and client-safe recaps.
- [x] **AC-9 (State Budget Compliance)**: Elaboration generates only the immediate next depth, keeping total session state within the compact serialised budget (<100,000 characters).

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages & Files**:
  - `packages/adventure-engine/src/types.ts`:
    - Add `ScenarioElaborationStage = "hearsay" | "actionable-clue" | "revelation-crisis"`.
    - Add `stage: ScenarioElaborationStage` to `ScenarioItem` and `ScenarioState`.
    - Add `scenarioId?: string` to `ProvisionalFact` and `NewProvisionalFact`.
    - Add `elaborateScenarios?: Array<{ scenarioId: string; stage: ScenarioElaborationStage; discovery?: string }>` to `CompletedTurnProposal`.
  - `packages/adventure-engine/src/scenario-schemas.ts`:
    - Add `stage: z.enum(["hearsay", "actionable-clue", "revelation-crisis"]).default("hearsay")` to `scenarioItemSchema`.
  - `packages/adventure-engine/src/schemas.ts`:
    - Add `scenarioId: id.optional()` to `provisionalFactSchema` and `newProvisionalFactSchema`.
    - Add `elaborateScenarios: z.array(z.object({ scenarioId: id, stage: z.enum(["hearsay", "actionable-clue", "revelation-crisis"]), discovery: text.optional() })).max(4).optional()` to `completeProposalSchema`.
  - `packages/adventure-engine/src/reducer.ts`:
    - In `materializeTurnState`:
      - Cross-reference `proposal.provisionalFacts` against `session.sourceRecords` (normalised name comparison); drop exact canonical matches.
      - Cross-reference against `session.provisionalFacts` (normalised name and kind comparison); if matched, update summary and `scenarioId` in place without allocating a redundant ID.
      - Allocate stable unique IDs for genuine new provisional facts with `introducedOnTurnId`.
    - In `applyCompletedTurn`:
      - Validate `elaborateScenarios` transitions: target scenario must exist, must be `heard`, must be `open`, and can advance at most one step along the ladder (`hearsay` → `actionable-clue` → `revelation-crisis`). Reject regressions and multi-stage skips.
      - Update `scenario.stage`.
      - If `discovery` is provided, append a player-visible `discovery` event to `scenario.events` with `turnId: meta.turnId` and `at: now`.
  - `packages/adventure-engine/src/prompt.ts`:
    - Update `buildAdventurePrompt`:
      - Exhort the model on the two distinct lanes (Voluntary Engagement vs Peaceful / Off-Script).
      - Explicitly instruct against the "endless errands" loop: active pursuit of rumours demands concrete clues, accessible witnesses, or culminating revelations.
      - Direct the model to propose `elaborateScenarios` when a lead deepens.
      - Guide extraction of meaningful actors, locations, clues, and factions into `provisionalFacts` with `scenarioId` linkage, omitting incidental details and canonical matches.
  - `packages/ai-engine/src/adventure-turn-generation.service.ts`:
    - Add `elaborateScenarios`, `revealScenarioIds`, and `scenarioId` on `newProvisionalFactSchema` to the structured output JSON schema sent to Gemini.
  - `apps/web/src/lib/components/oracle/adventure/AdventureProvisionalFacts.svelte`:
    - Render scenario provenance tag/badge when `fact.scenarioId` is present.

### Key Technical Decisions & Tradeoffs

- **Decision 1: Explicit 3-Stage Ladder vs Freeform Numbered Depths**:
  - _Tradeoff_: A typed 3-stage ladder (`hearsay` → `actionable-clue` → `revelation-crisis`) provides clear, unambiguous semantic milestones for the GM prompt and automated tests. It prevents model hallucinations of arbitrary stage numbers whilst enforcing the at-most-one-stage-per-turn pacing rule.
- **Decision 2: Reducer-Level Deduplication vs Prompt-Only Exhortation**:
  - _Tradeoff_: LLMs often repeat names of characters or places mentioned in prior turns. Prompting alone fails to guarantee deduplication. The reducer acts as an immutable invariant gate, matching normalised names against canonical Vault records and existing provisional facts, ensuring idempotency and preventing duplicate clutter in the player's entity list.
- **Decision 3: Single-Writer Commit Lifecycle as Sole Authority**:
  - _Tradeoff_: No independent entity store is introduced. All provisional facts and scenario stage transitions are committed atomically as part of `applyCompletedTurn`, guaranteeing that roll cancellations, retries, and network errors leave zero orphaned records.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**:
  - Player asks about local rumours → rumour surfaces at `stage: "hearsay"`.
  - Player follows up and investigates the lead → Oracle elaborates to `stage: "actionable-clue"`, names a witness NPC, and materialises that NPC into `provisionalFacts`.
  - Player confronts the witness or explores the clue site → Oracle escalates to `stage: "revelation-crisis"`, revealing the core situation truth and presenting an urgent dilemma.
- **Negative / Error Path**:
  - Model proposes skipping from `hearsay` directly to `revelation-crisis`: Reducer rejects transition with `invalid-transition`, protecting narrative pacing.
  - Model attempts to alter `gmOnly.truth`: Reducer rejects with `conflicting-patch`.
  - Model invents an NPC matching an existing canonical character: Reducer preserves canonical authority by skipping redundant provisional creation.
- **Cancellation & Edge Cases**:
  - _Player disengages or declines_: Scenario remains at its current stage; narration focuses purely on mundane or peaceful local colour without forced escalation.
  - _2–3 turn resolution_: A trivial misunderstanding resolves peacefully (`status: "resolved"`), adding a concluding event without advancing further along the adventure ladder.
  - _Turn retry or session reload_: Deterministic ID allocation and revision hashing guarantee zero duplicate provisional facts or phantom events.

---

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Tests (TDD First)**
  - Create `packages/adventure-engine/tests/elaboration-ladder.test.ts`:
    - Test valid ladder transitions (`hearsay` → `actionable-clue` → `revelation-crisis`).
    - Test rejection of invalid transitions (skipping stages, regressions, or unknown scenario IDs).
    - Test that at most one stage advance is permitted per turn.
    - Test deduplication of proposed `provisionalFacts` against canonical `sourceRecords` (canonical takes precedence).
    - Test deduplication and in-place updating of `provisionalFacts` against existing provisional entries.
    - Test peaceful/off-script turns: disengagement leaves scenario stage untouched without error.
    - Test trivial resolution: resolving a rumour in 2 turns without elaboration.
    - Test secrecy: unrevealed secrets and GM truths remain masked throughout elaboration.
- [x] **Task 2: Core Engine Types & Schemas**
  - Update `packages/adventure-engine/src/types.ts`:
    - Define `ScenarioElaborationStage` type.
    - Add `stage: ScenarioElaborationStage` to `ScenarioItem` and `ScenarioState`.
    - Add `scenarioId?: string` to `ProvisionalFact` and `NewProvisionalFact`.
    - Add `elaborateScenarios` to `CompletedTurnProposal`.
  - Update `packages/adventure-engine/src/scenario-schemas.ts` and `packages/adventure-engine/src/schemas.ts`:
    - Add `stage` schema to `scenarioItemSchema`.
    - Add `scenarioId` to `newProvisionalFactSchema` and `provisionalFactSchema`.
    - Add `elaborateScenarios` to `completeProposalSchema`.
- [x] **Task 3: Reducer Implementation & Deduplication**
  - Implement provisional fact deduplication against canonical records and existing provisional facts in `packages/adventure-engine/src/reducer.ts`.
  - Implement `elaborateScenarios` validation and state mutation in `packages/adventure-engine/src/reducer.ts`.
- [x] **Task 4: Prompt Engineering & AI Service Schema**
  - Enhance `buildAdventurePrompt` in `packages/adventure-engine/src/prompt.ts`:
    - Dual-lane rules: voluntary engagement vs peaceful/off-script.
    - Anti-errand guidelines: no repetitive chores during active investigation.
    - Instructions for proposing `elaborateScenarios` and extracting `provisionalFacts`.
  - Update `packages/ai-engine/src/adventure-turn-generation.service.ts`:
    - Include `elaborateScenarios`, `revealScenarioIds`, and `scenarioId` in the Gemini JSON schema.
- [x] **Task 5: UI & Presentation Polish**
  - Update `apps/web/src/lib/components/oracle/adventure/AdventureProvisionalFacts.svelte` to show scenario provenance when available.
  - Verify seamless reactivity with Svelte 5 runes (`$state`, `$derived`).
- [x] **Task 6: Verification Gate**
  - Run test suite and linters to confirm zero regressions and complete compliance.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```
