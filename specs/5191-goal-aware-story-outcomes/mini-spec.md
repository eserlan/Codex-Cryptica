# Goal-Aware Story Arc Outcomes from GM Evidence (#5191) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In multi-turn emergent adventures, a player-pursued goal can reach a concrete, committed resolution (such as a council vote, ratified compact, and public proclamation), yet the corresponding `EmergentThread` or `ScenarioItem` remains `open` because the GM has no machine-readable goal/outcome reconciliation in the normal turn proposal. Without explicit outcome records backed by committed evidence, the Director brief and player recap cannot reliably distinguish a resolved story arc from an active one, nor separate an achieved goal from remaining unresolved side questions.

### Scope & Boundaries

- **In Scope**:
  - Extend `EmergentThread` (and `ScenarioItem`) with optional, player-safe `goal` and durable provenance-bearing `outcome` (`result`, `reason`, `sourceTurnId`, `supportingFactIds`, `supportingCommitmentIds`, `recordedAt`, `sequence`, optional `unresolvedConsequences`), preserving legacy session readability.
  - Add optional `threadOutcomes` to `CompletedTurnProposal` (`types.ts`, `turn-schemas.ts`, `prompt.ts`, and `packages/ai-engine/src/adventure-response-schema.ts`) in the normal turn call.
  - Implement deterministic `reconcileThreadOutcomes()` in `packages/adventure-engine/src/thread-outcomes.ts` and invoke it in `completed-turn.ts` after turn materialisation, provisional facts, causal commitments, scenario updates, and emergent thread updates.
  - Keep goal achievement distinct from unresolved side questions / investigation exhaustion (`unresolvedConsequences` and `openQuestions` remain intact without reopening a resolved thread).
  - Expose resolved vs active story state in the Director brief (`gm-director-brief.ts`), player recap (`session-tools.ts`), and review capture (`adventure-review-capture.ts`), tracking scenario-sourced and emergent outcomes separately.
  - Provide bounded, reviewable legacy reconciliation (`inspectLegacyThreadOutcomeCandidates`, `applyReviewedThreadOutcomes`) and safe duplicate emergent-thread identity reconciliation (`reconcileDuplicateEmergentThreads`) without automatic blanket closures or transcript rewriting.
- **Out of Scope**:
  - Reward/XP rules, forced dramatic endings, a new quest engine, or automatic Vault canon promotion.
  - Extra provider/model calls for outcome detection or keyword-only inference from narration prose.
  - UI modal/dialog work (deferred to downstream UI slices).

### Acceptance Criteria

- [ ] Synthetic water-compact sequence (witness hearing -> council order -> sealed compact -> public proclamation) commits one `achieved` outcome with retained supporting evidence IDs, while remaining mysteries stay distinct in `unresolvedConsequences` / `openQuestions` without reopening the thread.
- [ ] Non-committal actions (`Let's request a hearing`, council promises to decide, witness speculation, or GM-suggested actions without committed outcome evidence) do **not** resolve the goal (`threadOutcomes` dropped when evidence is absent).
- [ ] Alternate outcomes (`achieved` via peaceful compromise, `failed`, `abandoned`, `cold`, and no-goal open exploration) work cleanly without closing the `AdventureSession`.
- [ ] Idempotent retry of the same turn, duplicate AI reply, concurrent save, and reload/rehydration do not double-close or overwrite an existing outcome.
- [ ] GM hidden secrets and unrevealed imported Adventure JSON truths never leak through outcome `goal`, `reason`, `unresolvedConsequences`, `supportingFactIds`, or recap/Director projections.
- [ ] Legacy `AdventureSession` records parse unchanged; prompt footprint stays within existing budgets with zero additional mandatory model calls.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts`: Add `ThreadOutcomeResult`, `ThreadOutcome`, `ThreadOutcomeProposal`, optional `goal`/`outcome` on `EmergentThread` and `ScenarioItem`, optional `threadOutcomes` on `CompletedTurnProposal`, and outcome fields on `AdventureRecap`.
  - `packages/adventure-engine/src/session-schema.ts` & `scenario-schemas.ts`: Add Zod schemas for `threadOutcomeSchema` (all new fields `.optional()` for legacy compatibility).
  - `packages/adventure-engine/src/turn-schemas.ts`: Add `threadOutcomeProposalSchema` and optional `threadOutcomes` array (max 4) on `completeProposalSchema`.
  - `packages/ai-engine/src/adventure-response-schema.ts`: Mirror optional `threadOutcomes` in `adventureTurnResponseSchema` for Gemini structured output.
  - `packages/adventure-engine/src/thread-outcomes.ts` (new): Pure `reconcileThreadOutcomes()`, `reconcileDuplicateEmergentThreads()`, `inspectLegacyThreadOutcomeCandidates()`, and `applyReviewedThreadOutcomes()`.
  - `packages/adventure-engine/src/completed-turn.ts`: Call `reconcileThreadOutcomes()` after `updateEmergentThreadsOnTurn()` and before `validateDurableStateBudget()`.
  - `packages/adventure-engine/src/emergent-threads.ts`: Ensure `projectPlayerEmergentThreads()` preserves `goal`/`outcome` safely while stripping `gmOnlyDevelopments`.
  - `packages/adventure-engine/src/gm-director-brief-contract.ts`, `gm-director-brief.ts`, `gm-director-brief-budget.ts`: Surface recent resolved outcomes (separating scenario-sourced vs emergent) in `GMDirectorBrief` with budget-shedding support.
  - `packages/adventure-engine/src/session-tools.ts`: Surface resolved/active outcome status and `goal`/`outcome` in `buildAdventureRecap()` without exposing GM-only data.
  - `packages/adventure-engine/src/prompt.ts`: Add concise prompt instructions for `threadOutcomes` in `buildPromptBehavior()`.
  - `packages/adventure-engine/src/index.ts`: Export `thread-outcomes.ts`.
  - `apps/web/src/lib/services/adventure/adventure-review-capture.ts`: Include outcome counts/summaries in `emergentThreadSummary` and scenario summary.
- **Data Contracts & State Flow**:
  - `CompletedTurnProposal.threadOutcomes` -> validated by `completedTurnProposalError` (including `hidden-leakage` via `playerFacingStrings`) -> reconciled deterministically in `reconcileThreadOutcomes()` against committed facts/commitments/scenarios -> persisted on `EmergentThread.outcome` or `ScenarioItem.outcome`.
- **UI & Design Tokens**: N/A (engine & prompt/schema slice).

### Key Technical Decisions & Tradeoffs

- **Dedicated `thread-outcomes.ts` module**: Keeps `completed-turn.ts` and `emergent-threads.ts` bounded under Constitution XIV rather than bloating existing files.
- **Same-turn evidence resolution**: Because the GM omits IDs on newly created facts/commitments in the same turn, `reconcileThreadOutcomes()` accepts both explicit prior/existing player-visible fact IDs (`visibleState.knownFacts`, player-visible `provisionalFacts`) and same-turn committed player-visible facts (`turn.visiblePatch.knownFacts.add`, player-visible `turn.provisionalFactIds`, `turn.causalCommitmentIds`).
- **Strict evidence gate for `achieved` / `failed`**: Proposals for `achieved` or `failed` without any valid supporting committed fact or commitment are dropped (recorded in `turn.dropped`) rather than fabricating proof. `abandoned` and `cold` may proceed without external fact proof when targeting an open thread/scenario.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Valid `threadOutcomes` proposal targeting an open thread/scenario with committed evidence transitions status (`resolved` for `achieved`/`failed`, `abandoned`, or `cold`), records `ThreadOutcome`, clears `focusedEmergentThreadId` if it was focused, and preserves `unresolvedConsequences`/`openQuestions`.
- **Negative / Error Path**: Unknown target ID, unheard scenario, `achieved`/`failed` with zero valid committed evidence, or conflicting overwrite of an already-resolved thread is dropped cleanly with a diagnostic entry in `turn.dropped`. Hidden secret or package truth in `reason`/`goal`/`unresolvedConsequences` triggers `hidden-leakage` rejection.
- **Cancellation / Edge Case**: Retried turn with same `inputId` is rejected by idempotency check before reconciliation; retried proposal with same `sourceTurnId` or identical `result` is a no-op; legacy sessions without `goal`/`outcome` parse and run unchanged.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Create `packages/adventure-engine/tests/thread-outcomes.test.ts` covering all 6 acceptance test scenarios (water-compact, premature promise/speculation rejection, alternate outcomes, idempotency/rehydration, secrecy/no-leakage, legacy compatibility & reviewable reconciliation).
- [ ] **Task 2: Schemas & Types** — Update `types.ts`, `session-schema.ts`, `scenario-schemas.ts`, `turn-schemas.ts`, and `packages/ai-engine/src/adventure-response-schema.ts`.
- [ ] **Task 3: Core Reconciliation & Engine Integration** — Implement `thread-outcomes.ts`, wire into `completed-turn.ts`, `emergent-threads.ts`, `gm-director-brief*.ts`, `session-tools.ts`, `prompt.ts`, `index.ts`, and `adventure-review-capture.ts`.
- [ ] **Task 4: Verification Gate** — Run impacted tests, lint, type-check, and fallow audit.

---

## 4. Verification Gate

```bash
bun run test:changed -- --base origin/staging
bun run lint:changed -- --base origin/staging
bunx svelte-check --tsconfig ./tsconfig.json --threshold error
bun run fallow:audit
```
