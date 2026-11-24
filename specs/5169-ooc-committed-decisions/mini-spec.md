# Persist Ask GM Decisions Automatically & Grant Grounded Improvisation (#5169) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Ask GM is currently constrained by a read-only prompt (`packages/adventure-engine/src/ooc.ts`) and returns plain text only (`AdventureOocService`), so any new compatible fictional detail the GM clarifies or invents in Ask GM is never committed to session state. Meanwhile Play grants the GM improvisational authority and commits `provisionalFacts`, leading to Ask GM either refusing unspecified details or having them reinvented inconsistently in Play.

### Scope & Boundaries

- **In Scope**:
  - Grant the GM grounded improvisational agency in `buildAdventureOocPrompt` to establish compatible minor NPCs, names, roles, locations, institutions, customs, rewards, and supporting details when unspecified, without simulating events, rolling dice, advancing fictional time, or playing the player's character.
  - Extend the Ask GM response contract (`AdventureOocResponse`) to emit a bounded typed payload (`answer`, `classification`, `decisions`) in a single model call, with graceful plain-text fallback for legacy mocks/providers.
  - Classify Ask GM replies (`established`, `hypothetical`, `meta-rules`, `canon-conflict`, `secret-refusal`) and only commit decisions when `classification === "established"` and all secrecy/canon checks pass.
  - Atomically persist accepted decisions into `session.provisionalFacts` (with `sourceOocExchangeId` and `provenance: "ooc"`, without a fictitious `introducedOnTurnId`) alongside the answered `AdventureOocExchange` (`classification`, `committedFactIds`, optional `conflictNotice`), keeping retries/replays idempotent.
  - Update `projectOocPromptExchanges` so exchanges with committed decisions carry `binding: "committed-decision"` in Play/OOC prompts.
  - Preserve all secrecy, cancellation, and failure guards so unsafe or invalid replies never partially commit.

- **Out of Scope**:
  - Automatic promotion of OOC decisions into shared Vault canon or other campaigns.
  - Identity merge UX (`03/03`).
  - A second mandatory provider call or conversational model.

### Acceptance Criteria

- [ ] Asking GM an open worldbuilding/clarification question (e.g. _"Who is the quest giver?"_) allows the GM to invent a compatible NPC/detail, return it as `established` with `decisions`, and atomically persist it in `session.provisionalFacts` with `sourceOocExchangeId` and `provenance: "ooc"`.
- [ ] Hypotheticals (_"What if the quest giver were a smuggler?"_), rules/meta questions (_"How does a Body Save work?"_), and secret refusals (_"Who is secretly behind this?"_) do not commit any `provisionalFacts`.
- [ ] Conflicts with canonical Vault `sourceRecords`, immutable Adventure JSON, or plot-critical unresolved material are classified as `canon-conflict` and escalated in the reply without silently overriding canon or committing conflicting facts.
- [ ] Retrying or replaying the same OOC exchange ID is idempotent (no duplicate `provisionalFacts`).
- [ ] Any hidden-secret or GM-only package leak in either `answer` or `decisions` triggers `OOC_SAFE_SECRET_REPLY` and drops all proposed decisions with zero partial commits.
- [ ] Play turn count, `worldTime`, `visibleState`, `hiddenState`, `pendingRoll`, and `sourcePackage` remain untouched by Ask GM.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts`, `state-schemas.ts`, `session-schema.ts`:
    - Add `OocReplyClassification` (`"established" | "hypothetical" | "meta-rules" | "canon-conflict" | "secret-refusal"`) and `NewOocDecision`.
    - Make `ProvisionalFact.introducedOnTurnId` optional when `sourceOocExchangeId` is present; add optional `sourceOocExchangeId` and `provenance?: "play" | "ooc"`.
    - Add optional `classification`, `committedFactIds`, and `conflictNotice` on `AdventureOocExchange`.
    - Extend `AdventureOocResponse` with optional `classification` and `decisions`.
  - `packages/adventure-engine/src/ooc.ts`:
    - Update `buildAdventureOocPrompt()` with grounded improvisational agency rules, canon/unresolved-secret escalation rules, and the compact JSON response contract (`{ answer, classification, decisions }`).
    - Add `parseAdventureOocModelReply(raw)` (JSON + plain-text fallback) and `guardAdventureOocReply(response, session, packageMeta)` checking both `answer` and proposed `decisions` for secret leaks, canon duplicates, and non-`established` classifications.
    - Add `commitAdventureOocExchange(session, exchange, decisions, now, createId)` to atomically upsert the answered exchange and materialize idempotent `ProvisionalFact` entries.
    - Update `projectOocPromptExchanges()` to emit `binding: "committed-decision"` when `committedFactIds?.length` is non-empty.
  - `packages/ai-engine/src/adventure-ooc.service.ts`:
    - Request `application/json` (via `buildOocGeneratePayload`) and parse structured `{ answer, classification, decisions }` with `parseAdventureOocModelReply`, falling back cleanly to plain-text `{ kind: "ooc", answer }` when non-JSON text is returned.
  - `apps/web/src/lib/stores/oracle/adventure-actions.ts`:
    - Update `executeOocExchange()` / `resolveOocAnswer()` to guard the full `AdventureOocResponse` and commit the answered exchange + accepted `decisions` atomically in a single `saveOocExchange()` call.
  - `apps/web/src/lib/services/adventure/adventure-review-capture.ts`:
    - Guard `factsIntroducedOnMissingTurn` in `integrityChecks()` so OOC-sourced `provisionalFacts` (without `introducedOnTurnId`) are not flagged as missing turns.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Ask GM returns `{ answer, classification: "established", decisions: [...] }` -> `guardAdventureOocReply` verifies no leaks -> `commitAdventureOocExchange` atomically saves the answered exchange + `provisionalFacts` in one revision increment -> `saveOocExchange` confirms the Play interaction revision.
- **Negative / Error Path**: Leak in `answer` or any `decision` -> replaced with `OOC_SAFE_SECRET_REPLY`, `classification: "secret-refusal"`, `decisions: []` -> zero facts committed. Malformed/invalid JSON from model -> falls back to plain-text answer if non-empty, or rejects cleanly without partial commits.
- **Cancellation / Edge Case**: Aborted/failed request saves `status: "failed"` with zero committed facts; retrying the same exchange ID updates/reuses existing `sourceOocExchangeId` facts idempotently.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Schemas & Types** — Update `types.ts`, `state-schemas.ts`, and `session-schema.ts` for OOC classifications, decisions, and `sourceOocExchangeId` on `ProvisionalFact`.
- [ ] **Task 2: Engine Prompt, Guard & Atomic Commit (TDD)** — Add failing tests in `packages/adventure-engine/tests/ooc.test.ts` covering all 7 synthetic golden scenarios, then implement in `ooc.ts`.
- [ ] **Task 3: AI Service & Runtime Wiring (TDD)** — Update `AdventureOocService` + tests in `packages/ai-engine`, and `adventure-actions.ts` + `adventure-review-capture.ts` + tests in `apps/web`.
- [ ] **Task 4: Verification Gate** — Run targeted tests, `svelte-check`, `lint:changed`, and `fallow:audit`.

---

## 4. Verification Gate

```bash
bun test packages/adventure-engine/tests/ooc.test.ts packages/adventure-engine/tests/prompt-golden.test.ts
bunx vitest run src/adventure-ooc.service.test.ts # inside packages/ai-engine
bunx vitest run src/lib/stores/oracle/tests/adventure-ooc.test.ts src/lib/services/adventure/adventure-review-capture.test.ts # inside apps/web
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # inside apps/web
bun run lint:changed
bun run fallow:audit
```
