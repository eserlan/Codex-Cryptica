# GM Director 03 — Durable Causal Commitments Mini-Spec

> Issue: [#5111 — Persist emergent causal commitments and reuse NPC motivations](https://github.com/eserlan/Codex-Cryptica/issues/5111)
> Parent epic: [#5108 — AI GM Director](https://github.com/eserlan/Codex-Cryptica/issues/5108) (03/06, P1)
> Depends on: Director brief 01 ([#5109](https://github.com/eserlan/Codex-Cryptica/issues/5109), merged in [#5119](https://github.com/eserlan/Codex-Cryptica/pull/5119)) and meaningful-progress 02 ([#5110](https://github.com/eserlan/Codex-Cryptica/issues/5110), merged in [#5133](https://github.com/eserlan/Codex-Cryptica/pull/5133))

## 1. Specification (What & Why)

### Problem Statement

The GM may invent a compatible supporting motive, mechanism, or identity, but today it lives only in narration. On reload, provider-thread reset, scene revisit, or retry, that explanation can be forgotten or contradicted because nothing committed it to the session.

### Scope & Boundaries

- **In Scope**:
  - Audit-first: reuse `scenarioCollection`, `ScenarioEvent`, `hiddenState.gmThreads`, `provisionalFacts`, `worldTime`/`ScenarioPressure`, and `PackageProgress`; add the smallest optional typed extension only where they cannot represent a committed supporting explanation.
  - Distinguish five classes: immutable source/seed truth, established in-play fact, GM-only committed supporting explanation, NPC belief/testimony, and speculative future plan. "Unknown" never licenses revising source facts.
  - On a valid model proposal, atomically persist meaningful new causal links/motivations/actions with stable IDs, scenario attribution, and source turn/revision; rehydrate them into the `GMDirectorBrief` on later turns.
  - Idempotent commit: no duplication on rejected turns, retries, or cancelled generations; precedence Vault canon > immutable source/seed > committed play; contradictions go through the existing human approval/escalation policy — no silent retcon.
  - `ScenarioPressure` actors react only when an action or fictional-time trigger permits; no off-screen event merely because the user sent another message.
- **Out of Scope**:
  - No universal hidden backstory for every minor NPC; no all-knowing Director; no second model call; no UI surface; no source-package mutation or cross-campaign sharing.

### Acceptance Criteria

- [ ] An emergent investigation commits a compatible new supporting identity/motive/mechanism once, then reuses it consistently after reload or remote-context reset.
- [ ] A revisited NPC reflects established events and motives after a justified off-screen development; untriggered actors remain inactive.
- [ ] Imported adventures retain immutable authored truth while playthroughs evolve independently — no source mutation or cross-campaign leakage.
- [ ] A deliberately unresolved fact stays unresolved until play justifies a commitment.
- [ ] Property/reducer and end-to-end tests cover provenance, idempotency, no hidden leaks, conflicting facts, multiple scenarios, no-scenario peaceful play, and no extra mandatory AI calls.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files** (all in `packages/adventure-engine/src`, no new dependency):
  - `types.ts`: optional commitment record — ID, kind (`motive | mechanism | identity | action | link`), certainty/provenance class, scenario/actor refs, source turn/revision. Optional and additive so old sessions load unchanged.
  - `provisional-facts.ts` / reducer commit path: materialise commitments atomically with the turn; dedupe on retry by stable identity, never by narration text alone.
  - `gm-director-brief.ts`: surface committed explanations under `established`, kept separate from `potential`; GM-only, within the existing 2,400-char brief budget.
  - Schema/session files only if the audit proves a persisted field is required; otherwise no migration.
- **Data Contracts & State Flow**: session remains the durable source of truth (never the provider thread); commitments flow proposal → validated reducer commit → session → Director brief → prompt. Player projections and transcripts never receive GM-only commitments (guarded by the existing hidden-leakage checks in `hidden-state.ts`).

### Key Technical Decisions & Tradeoffs

- Prefer extending the existing proposal/reducer pipeline over a new store or engine — the issue explicitly forbids a second adventure engine.
- Typed extension over free-text `gmThreads`: free text cannot carry provenance, certainty, or idempotency, which are the acceptance criteria.
- Commit only _meaningful_ causal links, not every invented detail — bounded growth, no backstory for minor NPCs.

### Failure, Edge & Cancellation Paths

- **Positive**: valid proposal commits once and is reused verbatim on revisit.
- **Negative**: a commitment contradicting Vault/source truth is rejected or escalated, never silently overwritten; conflicting facts surface for human decision.
- **Cancellation / Edge**: rejected, retried, or cancelled generations leave no partial or duplicate commitment; empty scenario collection and peaceful no-scenario play behave exactly as today.

---

### Audit Findings (Task 1 — done, read-only subagent audits, 2026-11-23)

- **Commit path**: `applyCompletedTurn` (`completed-turn.ts:249-360`, facade `reducer.ts:2`) gates input/duplicate, schema-parses the proposal, checks leakage/immutable-rewrite, materialises state, mutates only a `structuredClone` candidate, then bumps revision and validates budget. Any error discards the candidate — the atomicity hook commitments need already exists.
- **Idempotency today**: same `inputId` is rejected pre-parse (`completed-turn.ts:60-62`); `provisionalFacts` dedupe by kind + trimmed/lowercased name and merge in place. **Weakness**: a retry with a _new_ `inputId` and a renamed fact duplicates — dedupe key is name only. Commitments must dedupe on a stable structured key, never narration text.
- **Why a typed extension**: `ProvisionalFact` (`types.ts:111-119`) has `scenarioId`/`introducedOnTurnId` but no revision, actor ref, causal kind, or provenance class; `gmThreads` is free text. Neither can carry certainty/provenance/idempotency.
- **Smallest insertion point**: mirror `ProvisionalFact` — new `CausalCommitment` type + optional `causalCommitments?` on `AdventureSession`, `materializeCausalCommitments` cloned from `provisional-facts.ts:58-106` called from `materializeTurnState`, merged on the candidate before `updatedSession`/budget, IDs added to `existingIds` and recorded on the committed turn.
- **Rehydration**: the brief is rebuilt per turn (`prompt.ts:146-153,227`), so reload/reset reuse is automatic once persisted. Surface commitments as a distinct `established.committedExplanations` in `buildPursuedScenario` (scenario/actor-filtered, clipped, capped 2–3), _not_ inside player-visible `knownPlayerFacts`. Scenario-less play needs a new top-level brief field — pursued scenarios require open+heard.
- **Secrecy gap to close**: leakage guards (`hidden-state.ts:601-620`) cover secrets/`gmThreads`/scenario/historical only — a new top-level GM-only field must be explicitly excluded from player-facing strings and projections, or it will leak.
- **Precedence is prose-only**: canonical > provisional is prompt wording (`prompt.ts:175-198`), with no resolver, flag, or escalation on conflict; provisional merge silently overwrites summary. Contradiction semantics (reject vs. escalate) must be pinned before implementation.
- **Unresolved**: (a) does the `apps/web` caller reuse `inputId`/`turnId` on retry or mint new ones? (b) actor-ref ID space — `PackageActorState.actorId` vs. scenario actors vs. `sourceRecords.recordId`; (c) commitment cap/budget; (d) reveal-flip mechanism; (e) brief shed priority vs. `gmTruthRef`.
- **Missing negative tests**: retry with new `inputId` asserting no duplicate; GM-only commitment reappears in brief after reload/reset and stays out of player projections; source-contradiction escalation; budget-shed preserving the commitment; unresolved fact absent in peaceful play.

## Decisions (Final — accepted by owner, 2026-11-23)

- **Settled by code (not a judgement call)**: the `apps/web` caller mints a fresh `turnId`/`inputId` on every apply attempt (`adventure-actions.ts:95` → `newTurnMetadata`, `adventure-runtime.ts:168-176`), including the automatic retry inside `generateAcceptedTurn`. So the engine's same-`inputId` duplicate guard cannot protect commitments across retries. **Therefore commitments must dedupe on a stable structured key (kind + scenario/actor refs + normalised subject) at materialise time, independent of turn/input IDs.**
- **Q1 — contradiction semantics: SETTLED (3a + Vault lore review surface)**. A conflicting commitment is committed with status `contested`, quarantined from the Director brief (never steers play), and — when its subject maps to a Vault entity — appended once under a `## AI GM Contested` header in that entity's GM-only `lore` (`packages/schema/src/entity.ts:225`). Manual review = the user editing that lore as they see fit. Guardrails: (i) idempotent append, no duplicate on retry; (ii) session stays the source of truth for contested status. **Owner decision: contested lore text is treated as canon once written** — no exclusion from GM canonical context, no promotion step; the user's later edits to that lore are the correction mechanism.
- **Q2 — actor-ref ID space: SETTLED (tiered ref)**. `actorRef` prefers Vault/source `recordId`, falls back to provisional-fact ID, then normalised actor name. Dedupe and the contested-lore Vault lookup use the best available tier; emergent NPCs with no Vault entity are fully supported.
- **Q3 — cap/budget: SETTLED (no new storage cap)**. Rely on the existing session state budget; the Director brief caps display at 2–3 commitments per pursued scenario. No commitment is ever silently dropped for cap reasons.
- **Q4 — reveal: SETTLED (never flips in v1)**. Commitments stay GM-only records; player discovery lands via ordinary player-visible facts and narration. No reveal plumbing, no new leak surface in this slice.
- **Q5 — brief shed priority: SETTLED (established tier)**. Speculative/potential content sheds first; commitments shed after potential and before the immutable `gmTruthRef`. Authored truth outranks emergent invention; committed motives outrank speculation.

## 3. Tasks & Execution Sequence (When)

- [x] **Task 1: Audit note** — Record, per existing store, what it can/cannot represent; justify the typed extension in one short section. _(See Audit Findings above.)_
- [x] **Task 2: Tests (TDD)** — Reducer/brief tests: commit-once with provenance, new-`inputId` retry dedupe, conflicting summary → contested (original kept), explicit contested, ID-allocation atomicity, verbatim-narration leak rejection, contested absent from brief, belief only under potential, scenario-less top-level surface, brief ≤2,400 chars, peaceful no-commitment turn unchanged.
- [x] **Task 3: Engine** — `CausalCommitment` optional type + schemas, `materializeCausalCommitments` (stable structured dedupe key), atomic commit in `applyCompletedTurn`, leakage guard covers commitments, prompt instruction + AI response schema (`causalCommitments`, max 4/turn).
- [x] **Task 4: Director Rehydration** — Brief surfaces committed supporting explanations under `established.committedExplanations` (max 3, clipped), belief/speculative under `potential.speculativeCommitments`, contested nowhere, top-level surface for scenario-less play; shed order per Q5.
- [x] **Task 5: Verification Gate** — Impacted-only checks below. (Contested-lore Vault append: `contested-lore.ts` + `AdventureSurfacePromotion.syncContested`, wired in `AdventureSurface.svelte`.)

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx fallow audit --format json --quiet --explain --gate-marker agent
```
