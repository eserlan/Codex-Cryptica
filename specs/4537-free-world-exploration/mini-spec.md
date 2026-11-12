# Enter Your World & Free Exploration (#4537) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

The initial "Enter Your World" workstreams (#4570–#4572, #4623) enabled players to choose an existing character and location and launch an unscripted, grounded scene without hand-crafting a quest. However, completing the full open-ended exploration lifecycle requires closing several behavioural gaps:

1. **Unheard Background Seeds**: In `buildAdventurePrompt`, `"GM-ONLY scenarios"` omits `id`, `status`, `anchorRefs`, and `playerVisible` lead copy. As a result, the Oracle GM cannot inspect unheard location seeds or supply their `id` in `revealScenarioIds` when a local sign or rumour surfaces naturally in conversation.
2. **Post-Scenario Continuation**: When an active scenario is concluded (`resolved` or `abandoned`), the prompt lacks explicit instructions to continue the same Adventure session naturally through everyday world activities, leaving the GM prone to stalling or fabricating artificial urgent quests.
3. **Location Revisit Continuity**: When the character travels to another area and returns to a previously visited settlement, prompt instructions do not explicitly mandate honouring previously committed consequences, known facts, and provisional discoveries.
4. **Causal Event Provenance**: `playerScenarioProjection` currently strips the optional `causedBy` field from player-visible scenario events, hiding explicit cross-scenario consequence provenance.
5. **Minimal Vault Guidance**: When a Vault contains no saved characters or locations, `WorldEntrySetup.svelte` omits the pickers without explanatory guidance, causing confusion for new users.

Closing these items fulfils the core promise of Milestone M4: unscripted, grounded exploration where the world responds to player agency, rumours develop only when pursued, everyday life continues seamlessly across resolved situations, and visited places remember past consequences.

### Scope & Boundaries

- **In Scope**:
  - **Prompt & GM Guidance (`packages/adventure-engine/src/prompt.ts`)**:
    - Include `id`, `status`, `anchorRefs`, and (for `unheard` items) `unheardLead: scenario.playerVisible` in `"GM-ONLY scenarios"`.
    - Add explicit GM behavior instructions for `resolved` and `abandoned` scenarios: do not force re-escalation, and seamlessly continue everyday world play, social interactions, or travel within the same session.
    - Add location-revisit guidance to `worldEntryBehavior`: returning to a known location reflects committed `knownFacts`, `provisionalFacts`, and recorded scenario consequences rather than resetting the location.
  - **Causal Provenance Projection (`packages/adventure-engine/src/scenario-state.ts`)**:
    - Preserve optional `causedBy` on player-visible scenario events in `playerScenarioProjection`.
  - **Minimal-Vault Guidance (`apps/web/src/lib/components/oracle/adventure/WorldEntrySetup.svelte`)**:
    - Add clear, plain British English helper text when `characters.length === 0` ("No saved characters in this Vault yet. Name a provisional character below to start playing.") and when `locations.length === 0` ("No saved locations in this Vault yet. Name a starting place below to begin exploring.").
  - **Comprehensive Multi-Turn Free Exploration Test Suite (`packages/adventure-engine/tests/world-entry.test.ts`)**:
    - Multi-turn scripted scenario demonstrating:
      1. Starting as a named character in a known location with open exploration intent (`intent: "explore"`).
      2. Ordinary NPC conversation and mundane activities without forced quest creation.
      3. Contextual rumour discovery surfacing an unheard location seed via `revealScenarioIds`.
      4. Concluding the scenario (`resolved`) and continuing the same session with everyday activities.
      5. Travelling to a second location and returning to find committed facts and consequences intact.
      6. Verifying zero GM truth or secret leakage throughout the entire run.
  - **UI / Setup Smoke & Accessibility Tests (`apps/web/src/lib/components/oracle/adventure/AdventureSurface.world.test.ts`)**:
    - Test minimal-Vault empty state messaging and ensure alternative starting approaches (manual premise, rumour generator) remain intact.
- **Out of Scope**:
  - Historical prequel anchors or temporal policy authoring (#4556 / #4558).
  - Standalone game-first mobile/desktop UI redesign.
  - Faction turn engine simulation (#4539) or hex/point crawl integration (#4538).
  - Automatic promotion of provisional facts to Vault canon (governed by #4535).

### Acceptance Criteria

- [ ] **AC-1 (Unscripted Start & Mundane Conversation)**: Player can start in a known location as a chosen character without typing an adventure premise. Ordinary NPC conversation and local tasks commit successfully without prematurely triggering or forcing a scenario.
- [ ] **AC-2 (Contextual Seed Surfacing)**: When the GM surfaces a local rumour from an unheard background seed, it passes the seed's `id` in `revealScenarioIds`. The seed transitions to `heard` atomically with a discovery event while keeping its GM truth confidential.
- [ ] **AC-3 (Post-Scenario Everyday Continuation)**: When an active scenario is marked `resolved` or `abandoned`, the session remains active and transitions back to open exploration and routine local activities without ending the adventure or forcing a new quest.
- [ ] **AC-4 (Location Revisit Memory)**: Returning to a previously visited settlement reflects previously committed consequences, known facts, and provisional discoveries.
- [ ] **AC-5 (Event Causality Projection)**: `playerScenarioProjection` preserves `causedBy` on player-visible consequence events for complete transparency of cross-scenario causal linkages.
- [ ] **AC-6 (Minimal-Vault Graceful Guidance)**: In a minimal or empty Vault, `WorldEntrySetup` displays clear guidance for creating provisional characters and locations without breaking the 4-step setup flow.
- [ ] **AC-7 (Existing Entry Coexistence)**: "Discover an Adventure" (rumour workflow) and "Create Your Own Premise" remain fully accessible and functional alongside "Enter Your World".
- [ ] **AC-8 (Secrecy & State Safety)**: GM secrets, unvisited locations, and unrevealed truths are never present in player projections, narration previews, transcripts, or client-safe recaps.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **`packages/adventure-engine/src/prompt.ts`**:
  - In `buildAdventurePrompt`, map `"GM-ONLY scenarios"` to include:
    ```typescript
    id: scenario.id,
    status: scenario.status,
    anchorRefs: scenario.anchorRefs,
    ...(scenario.knowledge === "unheard" ? { unheardLead: scenario.playerVisible } : {}),
    ```
  - In `behavior`, add instructions for post-resolution play when all scenarios are closed or none are focused:
    `"When all scenarios are resolved or abandoned, or when the player pursues everyday life, portray ongoing unscripted world activity, routine tasks, peaceful interactions or travel without manufacturing artificial crises or forcing a new quest."`
  - In `worldEntryBehavior`, add location-revisit guidance:
    `"When the player returns to a previously visited location, reflect established facts, prior conversations, and committed scenario consequences. Do not reset or contradict what has already transpired."`
- **`packages/adventure-engine/src/scenario-state.ts`**:
  - In `playerScenarioProjection`, include:
    ```typescript
    ...(event.causedBy ? { causedBy: structuredClone(event.causedBy) } : {})
    ```
- **`apps/web/src/lib/components/oracle/adventure/WorldEntrySetup.svelte`**:
  - Add inline empty-Vault fallback copy when `characters.length === 0`:
    ```svelte
    <p class="text-xs text-theme-text/80 mt-1">
      No saved characters in this Vault yet. Name a provisional character below
      to start playing.
    </p>
    ```
  - Add inline empty-Vault fallback copy when `locations.length === 0`:
    ```svelte
    <p class="text-xs text-theme-text/80 mt-1">
      No saved locations in this Vault yet. Name a starting place below to begin
      exploring.
    </p>
    ```
- **`packages/adventure-engine/tests/world-entry.test.ts`**:
  - Implement a scripted end-to-end multi-turn regression test covering unscripted dialogue, contextual rumour reveal, elaboration, resolution, post-resolution everyday activity, and location revisit.
- **`apps/web/src/lib/components/oracle/adventure/AdventureSurface.world.test.ts`**:
  - Add tests validating that `WorldEntrySetup` displays empty-Vault helper copy when options are empty and permits starting as a provisional character/place.

### Key Technical Decisions & Tradeoffs

- **Exposing Unheard Leads in GM-Only State**: Exposing `unheardLead: scenario.playerVisible` in `"GM-ONLY scenarios"` enables the LLM to weave realistic overheard rumours and supply the exact `id` in `revealScenarioIds` without requiring an extra out-of-band retrieval pass.
- **Player Projection of `causedBy`**: Preserving `causedBy` in `playerScenarioProjection` allows UI components and transcripts to display explicit provenance (e.g. "Caused by flood at Old Mill") without leaking GM secrets.
- **Preserving One Active Session per Vault**: All location transitions and scenario resolutions update `visibleState.location` and `scenarioCollection` within the single active session, preserving revision leases and optimistic concurrency.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Player selects character and location, has a quiet chat with a local shopkeeper (no scenario created), asks for news (unheard rumour revealed), investigates, resolves the situation, and resumes peaceful travel to a neighboring village.
- **Negative / Error Path**: A turn attempts to reveal a scenario whose location tags do not match the current location (`validateRevealedScenarioLocation` rejects the turn with `invalid-transition`).
- **Cancellation / Edge Case**: In an empty Vault with 0 entities, provisional inputs work seamlessly without throwing validation errors. Cancelling setup preserves the draft in local state.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD) for Prompt & Provenance (`packages/adventure-engine`)**
  - Add test in `packages/adventure-engine/tests/scenario-projection.test.ts` verifying `playerScenarioProjection` preserves `causedBy`.
  - Add test in `packages/adventure-engine/tests/scenario-prompt.test.ts` verifying `"GM-ONLY scenarios"` includes `id`, `status`, `anchorRefs`, and `unheardLead` for unheard items, and includes post-resolution and location-revisit guidance.
- [ ] **Task 2: Engine Implementation (`packages/adventure-engine`)**
  - Update `packages/adventure-engine/src/scenario-state.ts` to preserve `causedBy` on player-visible events.
  - Update `packages/adventure-engine/src/prompt.ts` with enriched `"GM-ONLY scenarios"` and post-resolution / revisit instructions.
- [ ] **Task 3: Multi-Turn Free Exploration Regression Suite (`packages/adventure-engine`)**
  - In `packages/adventure-engine/tests/world-entry.test.ts`, write a full multi-turn test simulating:
    1. Unscripted entry in Northbrook.
    2. Mundane NPC chat without scenario creation.
    3. Contextual rumour discovery from background seed.
    4. Scenario resolution and return to everyday world activity.
    5. Travel to new place, consequence propagation, and revisit to Northbrook.
- [ ] **Task 4: UI Minimal-Vault Guidance & Component Tests (`apps/web`)**
  - Update `apps/web/src/lib/components/oracle/adventure/WorldEntrySetup.svelte` with empty-Vault guidance copy.
  - Add tests in `apps/web/src/lib/components/oracle/adventure/AdventureSurface.world.test.ts` or `world-entry-setup.test.ts` verifying empty-Vault rendering and provisional-only setup.
- [ ] **Task 5: Verification Gate**
  - Run impacted test and lint suites:
    ```bash
    bun scripts/test-changed.mjs --base origin/staging
    bun scripts/lint-changed.mjs --base origin/staging
    bunx svelte-check --tsconfig ./tsconfig.json --threshold error
    ```
  - Verify all checks pass with 0 errors.

---

## 4. Verification Gate

```bash
bun scripts/test-changed.mjs --base origin/staging
bun scripts/lint-changed.mjs --base origin/staging
cd apps/web && bunx svelte-check --tsconfig ./tsconfig.json --threshold error
```
