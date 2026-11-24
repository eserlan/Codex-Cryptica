# Track Player-Led Improvised Investigations as Durable GM Threads (#5177) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

When a player and AI GM build an improvised investigation during play or Ask GM (OOC)—accumulating `provisionalFacts`, `people`, `places`, and `causalCommitments`—the engine only tracks seeded `scenarioCollection.items` in `gm-director-brief`, `investigative-pacing`, and diagnostic summaries. As a result, an actively pursued improvised case is invisible to the Director (which continues ranking unrelated dormant rumours), and sessions report no active investigative thread even across 15+ turns of focused inquiry.

### Scope & Boundaries

- **In Scope**:
  - **Durable emergent thread model** (`packages/adventure-engine/src/types.ts`, `session-schema.ts`, `emergent-threads.ts`): add optional `emergentThreads` and `focusedEmergentThreadId` on `AdventureSession` (bounded, local-first, backwards-compatible). Each thread stores `id`, `title`, `status` (`"open" | "resolved" | "abandoned" | "cold"`), `provenance` (`"play" | "ooc" | "mixed"`), `linkedPersonIds`, `linkedPlaceIds`, `linkedFactIds`, `linkedCommitmentIds`, `openQuestions`, `knownConsequences`, optional `gmOnlyDevelopments`, and optional `linkedScenarioId` (compatible link to an authored rumour without converting it).
  - **Substantive emergence & isolation**: promote/update an emergent thread only from substantive committed investigative activity (repeated focused inquiry, consequential related discoveries, OOC-committed investigative leads, or causal commitments)—never from casual small talk (e.g. a shop price) or shared location alone. Keep two unrelated investigations at the same location separate.
  - **Director & pacing integration** (`gm-director-brief.ts`, `gm-director-brief-contract.ts`, `investigative-pacing.ts`): surface the actively pursued emergent thread in `GMDirectorBrief` (respecting `gmOnlyDevelopments` vs player-known evidence), while allowing the player to ignore the case for free play without the Director hijacking or forcing escalation.
  - **Voluntary player controls** (`session-tools.ts`, optional UI in `AdventureSituationsDialog.svelte` / `AdventureScenarioControls.svelte` if supported): allow inspecting, following, unfollowing, or closing/abandoning an emergent lead without mandatory new UI or forced quest acceptance.
  - **Continuity across OOC, travel, and resets**: keep facts, commitments, and entities attached across multiple places, NPCs, OOC decisions, and provider resets; support useful negative evidence, dead ends (`cold`), resolution, and abandonment without obligatory climaxes.
  - **Separate GM-only diagnostics** (`apps/web/src/lib/services/adventure/adventure-review-capture.ts`): keep `timeToFirstSign` and `timeToFirstActionableLead` strictly seed-scenario-only; add bounded `summary.emergentThreads` to GM-only diagnostic JSON without leaking into player transcripts or recaps.

- **Out of Scope**:
  - Fabricating a `scenarioId` for improvised material or mutating/overwriting seeded `scenarioCollection.items`.
  - Redefining historical `timeToFirstSign` / `timeToFirstActionableLead` metrics.
  - Adding an extra mandatory AI model call.

### Acceptance Criteria (Mapped to #5177 Acceptance Tests)

- [ ] **1. Emergent case creation & rehydration**: In a settlement with unrelated dormant rumours, pursuing an improvised case (e.g. unequal water distribution) through witnesses, records, and an official produces a single linked emergent thread that the Director rehydrates.
- [ ] **2. Cross-place / cross-NPC / reset continuity**: Facts added across four places and two NPCs remain attached to the emergent thread after reload and provider/interaction reset.
- [ ] **3. Voluntary sandbox (no hijacking)**: When the player ignores the case to explore a market, the Director does not force the case back or hijack free play.
- [ ] **4. Noise & collision resistance**: Random conversation (e.g. shop price) does not spawn a thread; two unrelated investigations sharing a location do not merge.
- [ ] **5. Compatible rumour intersection**: An authored rumour can link to an emergent thread via `linkedScenarioId` without converting it into the authored scenario or leaking hidden truths.
- [ ] **6. Non-combative outcomes**: Useful negative evidence, alternate explanations, credible dead ends (`cold`), resolution, and abandonment all work cleanly without obligatory combat or climaxes.
- [ ] **7. Separate diagnostics**: GM-only diagnostics report `summary.emergentThreads` separately while keeping `timeToFirstSign` / `timeToFirstActionableLead` seed-scenario-only.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/types.ts` & `session-schema.ts`:
  - Define `EmergentThread` (with bounded arrays: `linkedPersonIds`, `linkedPlaceIds`, `linkedFactIds`, `linkedCommitmentIds`, `openQuestions`, `knownConsequences`, `gmOnlyDevelopments`, optional `linkedScenarioId`) and add `emergentThreads?: EmergentThread[]` (max 16) + `focusedEmergentThreadId?: string | null` on `AdventureSession`.
- `packages/adventure-engine/src/emergent-threads.ts` (new focused module):
  - `updateEmergentThreadsOnTurn(session, turn, createId)`: evaluates whether the committed turn's inquiry, `provisionalFacts`, `causalCommitments`, or `knownFacts` represent substantive investigative progression; matches against an existing open thread by topic + entity overlap (never location-only), or spawns a new thread once threshold evidence accumulates (e.g. >=2 related investigative signals or an OOC-committed lead + follow-up).
  - `linkEmergentThreadToScenario(session, threadId, scenarioId)`: explicit compatible link without mutating `scenarioCollection`.
  - `setFocusedEmergentThread` / `updateEmergentThreadStatus`: player-voluntary follow/unfollow/resolve/abandon transitions.
  - `projectPlayerEmergentThreads(session)`: player-safe projection stripping `gmOnlyDevelopments`.
- `packages/adventure-engine/src/completed-turn.ts` & `ooc.ts`:
  - Call `updateEmergentThreadsOnTurn` on turn commit and link OOC-committed `established` decisions when relevant.
- `packages/adventure-engine/src/gm-director-brief.ts`, `gm-director-brief-contract.ts`, `investigative-pacing.ts`:
  - Rank/select `pursuedEmergentThread` when the player's action or `focusedEmergentThreadId` targets an open emergent thread (and no seeded scenario outranks it), keeping `mode: "open-world"` when the player pivots to unrelated free play.
- `packages/adventure-engine/src/session-tools.ts` & `apps/web/src/lib/services/adventure/adventure-review-capture.ts`:
  - Add player-safe inspection/control helpers and separate `summary.emergentThreads` in GM-only diagnostics.

### Failure, Edge & Cancellation Paths

- **Incidental chatter**: Single shop-price inquiry -> below emergence threshold -> `emergentThreads` remains empty.
- **Unrelated investigations at same place**: Different topic/entity sets -> kept as distinct threads.
- **Player pivots away**: Action shares no topic/entity with open emergent thread and `focusedEmergentThreadId` is not forced -> Director does not inject emergent thread recovery.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Schema & Emergent Thread Engine** — Add `EmergentThread` types/schemas and implement `packages/adventure-engine/src/emergent-threads.ts` + wiring in `completed-turn.ts` / `ooc.ts`.
- [ ] **Task 2: Director, Pacing & Player Controls** — Integrate into `gm-director-brief.ts`, `investigative-pacing.ts`, `prompt-state.ts`, and `session-tools.ts` (plus minimal optional UI hook if appropriate).
- [ ] **Task 3: Diagnostics & Acceptance Tests (TDD)** — Add separate `summary.emergentThreads` in `adventure-review-capture.ts` and implement all 6 acceptance tests + diagnostic tests.
- [ ] **Task 4: Verification Gate** — Run targeted tests, `svelte-check`, `fallow audit`, commit, push, and open PR targeting `staging`.
