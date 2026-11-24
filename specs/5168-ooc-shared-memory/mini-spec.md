# Carry Ask GM Context into Play & Reconcile OOC-Only Revisions (#5168) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Ask GM persists out-of-character (OOC) exchanges in `session.oocExchanges` and includes the last six answered exchanges in subsequent OOC prompts (`packages/adventure-engine/src/ooc.ts`), but the Play GM prompt (`packages/adventure-engine/src/prompt.ts`) omits them completely. In addition, saving a pending, answered, or failed OOC exchange increments `session.revision` via `upsertAdventureOocExchange` without advancing the separate Play provider interaction revision, causing the next Play turn to trigger a `revision-mismatch` reset and lose uncommitted provider context.

### Scope & Boundaries

- **In Scope**:
  - Supply bounded, chronological, session-scoped, spoiler-safe OOC context to both `buildAdventurePrompt` (Play) and `buildAdventureOocPrompt` (Ask GM), including exchange IDs, source provenance, status (`answered` only), and ordering relative to play turns (`afterTurnCount`).
  - Explicitly distinguish non-binding OOC discussion from observed character knowledge and established adventure decisions in the prompt projection, leaving an additive integration point for committed decisions in `#5169` (02/03).
  - Reconcile known local `+1` OOC-only revision increments on the retained Play provider interaction (`confirmAdventureInteraction(sessionId, savedRevision)`), while preserving legitimate `revision-mismatch` and `source-change` resets for unrelated Play-side or external edits.
  - Ensure newly answered OOC exchanges are delivered on the next Play turn via `stateDelta()` (when continuing a stateful interaction) and via `buildBasePromptState()` (for stateless transport, reloads, resets, or model switches), while preserving the latest Play action and total prompt budgets.
  - Keep Ask GM strictly non-mutating with respect to Play turns, dice rolls, fictional time, scene transitions, and character state, and exclude OOC context from player-facing in-fiction recaps (`storySoFar`) and GM-only secrets.

- **Out of Scope**:
  - Full memory extraction or automatic promotion of OOC answers into canonical Vault/session truth (`02/03`, `#5169`).
  - Identity merge UX (`03/03`).
  - Introducing a second conversational model or altering the separate OOC provider interaction contract.

### Acceptance Criteria

- [ ] Asking GM a fictional clarification (e.g. _"Envoy Ilona Marshall is the quest giver"_) causes the next Play model request to include that answered exchange with its ID, provenance, turn ordering, and non-binding OOC status, even when the player's next Play action only briefly references it (e.g. _"seek out Ilona"_).
- [ ] Alternating `Ask GM -> Play -> Ask GM -> Play` preserves chronological ordering across reloads, stateless transport, provider expiry/reset, and model switches.
- [ ] Multiple consecutive OOC follow-ups (e.g. three OOC exchanges) between Play turns do not trigger a `revision-mismatch` reset on the next Play turn, and `stateDelta()` carries the new OOC exchanges into the continued Play request.
- [ ] An unrelated Play-side or external revision change still triggers the expected `revision-mismatch` reset rather than treating stale history as current.
- [ ] Pending, failed, and cancelled OOC exchanges are excluded from model memory; OOC context is bounded (`MAX_OOC_PROMPT_EXCHANGES = 6`), respects total prompt budgets without truncating the current Play action, and is excluded from `storySoFar` player-facing recaps.
- [ ] Imported Adventure JSON `gmOnly` secrets and private Vault lore remain excluded from player-facing Ask GM context and are never leaked into user-visible outputs.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/ooc.ts`:
    - Extract/extend a shared bounded projection helper (e.g. `projectOocPromptExchanges(session)`) used by both `projectPlayerSafeOocState` (Ask GM) and `buildBasePromptState` (Play).
    - Include `id`, `afterTurnCount`, `provenance: "ooc"`, `status: "answered"`, `binding: "non-binding-ooc"` (plus an optional additive field hook for committed decisions in `02/03`), `question`, and `answer` for the last `MAX_OOC_PROMPT_EXCHANGES` (`6`) answered exchanges in chronological order.
    - Enforce per-exchange and total OOC character bounds so OOC context cannot crowd out the current Play action or breach prompt budgets.
  - `packages/adventure-engine/src/prompt.ts`:
    - Include `oocExchanges` (when non-empty) in `buildBasePromptState()` inside `buildAdventurePrompt()`.
    - Add concise behaviour guidance instructing the Play GM to treat `oocExchanges` as non-binding out-of-character GM-player clarifications ordered by `afterTurnCount`—distinct from observed in-character knowledge and canonical records.
  - `packages/ai-engine/src/adventure-interaction-context.ts` & `packages/ai-engine/src/adventure-interaction-input.ts`:
    - Verify `AdventureInteractionContext.confirm(sessionId, savedRevision)` advances `interaction.revision` when `interaction.revision === savedRevision - 1` across consecutive OOC saves (`pending` -> `answered`/`failed`), and rejects/resets when `savedRevision` jumps unexpectedly or `sourceHash` changes.
    - Verify `stateDelta()` diffs `oocExchanges` cleanly so newly answered OOC exchanges are sent on the next stateful Play turn.
  - `apps/web/src/lib/stores/oracle/adventure-runtime.ts`:
    - In `saveOocExchange(previous, next)`, after `this.deps.repository.save(previous.revision, next)` succeeds and `this.state.session` is updated, invoke the generation interaction confirmation (`confirmDefaultGenerationInteraction(saved.session.id, saved.session.revision)` or an injected `confirmInteraction` dependency) so OOC-only saves reconcile the Play interaction revision.
  - **Tests**:
    - `packages/adventure-engine/tests/ooc.test.ts` (or existing prompt/ooc test files): test `buildAdventurePrompt` OOC inclusion, ordering (`afterTurnCount`), bounding, exclusion of `pending`/`failed` exchanges, exclusion from `storySoFar`, and GM-only secret non-leakage.
    - `packages/ai-engine/tests/adventure-interaction-context.test.ts` (or equivalent): test consecutive OOC `confirm()` calls avoiding `revision-mismatch`, `stateDelta()` carrying new OOC exchanges, and external revision mismatch still resetting.
    - `apps/web/src/lib/stores/oracle/tests/adventure-ooc.test.ts` (or `adventure-generation.test.ts`): test `saveOocExchange` reconciling interaction revision on `pending`/`answered`/`failed` saves.

- **Data Contracts & State Flow**:
  - `AdventureSession.oocExchanges` (`packages/adventure-engine/src/session-schema.ts`) remains unchanged (additive-safe); `AdventureOocExchange` already carries `id`, `kind: "ooc"`, `question`, `answer`, `status`, `afterTurnCount`, `createdAt`, `updatedAt`.
  - No IndexedDB schema migration or OPFS layout change is required.
  - `storySoFar` (`packages/adventure-engine/src/story-summary.ts`) continues to summarise only committed Play turns and never ingests `oocExchanges`.

### Key Technical Decisions & Tradeoffs

- **Shared projection helper in `ooc.ts` instead of duplicating filtering in `prompt.ts`**: Keeps Ask GM and Play aligned on the same `MAX_OOC_PROMPT_EXCHANGES` bound, `status === "answered"` filter, and non-binding metadata shape, while leaving an explicit additive hook for `02/03` committed decisions.
- **Reconcile Play interaction revision inside `saveOocExchange()` via `confirm(sessionId, savedRevision)` rather than ignoring `revision-mismatch` globally**: Preserves strict protection against stale state from concurrent tabs, external edits, or failed/partial Play writes, because only deterministic `+1` local OOC saves advance `interaction.revision`.
- **No separate OOC-to-canon auto-promotion**: Explicitly honours the `01/03` boundary; OOC answers inform Play continuity as non-binding GM context without mutating canonical facts or character knowledge.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Player asks an OOC question -> `pending` save (`+1` rev, `confirm` advances interaction rev) -> Ask GM answers -> `answered` save (`+1` rev, `confirm` advances interaction rev) -> next Play turn continues the stateful interaction without `revision-mismatch`, receives the new OOC exchange in `stateDelta()`, and keeps the current Play action intact.
- **Negative / Error Path**:
  - Ask GM request fails or is aborted -> exchange is saved with `status: "failed"` -> `confirm` advances interaction revision for the `+1` save, and `projectOocPromptExchanges` excludes the `failed` (and any `pending`) exchange from both Ask GM and Play prompts.
  - External or Play-side save bumps `session.revision` outside the retained interaction -> `interaction.revision !== savedRevision - 1`, so the next Play turn detects `revision-mismatch` and resets cleanly, rebuilding full context (including answered `oocExchanges`) via `buildBasePromptState()`.
- **Cancellation / Edge Case**:
  - Cancelled Ask GM request never enters `status: "answered"` and is omitted from prompt memory.
  - Imported Adventure JSON `gmOnly` secrets and private Vault lore remain filtered out of `projectPlayerSafeOocState` and are never injected into player-visible recap or OOC outputs.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests in `packages/adventure-engine`, `packages/ai-engine`, and `apps/web/src/lib/stores/oracle/tests/` covering:
  - `buildAdventurePrompt` receiving bounded, chronological answered `oocExchanges` with provenance/turn-order metadata.
  - Exclusion of `pending`/`failed`/cancelled exchanges, `storySoFar` isolation, prompt budget preservation of the current Play action, and GM-only secret non-leakage.
  - Three consecutive OOC saves reconciling Play interaction revision without `revision-mismatch`, `stateDelta()` carrying new OOC context, and external Play-side edits still triggering `revision-mismatch`.
- [ ] **Task 2: Adventure Engine Prompt & OOC Projection** — Update `packages/adventure-engine/src/ooc.ts` and `packages/adventure-engine/src/prompt.ts` to project bounded chronological OOC context into `buildBasePromptState()` with non-binding OOC framing and an additive `02/03` hook.
- [ ] **Task 3: Runtime Revision Reconciliation** — Update `apps/web/src/lib/stores/oracle/adventure-runtime.ts` (`saveOocExchange`) to confirm the local `+1` revision on `AdventureInteractionContext`, and verify `packages/ai-engine` `stateDelta()` / `confirm()` behaviour.
- [ ] **Task 4: Verification Gate** — Run impacted-only tests, lint, workspace type-checks, and Fallow audit on branch `feat/5168-ooc-shared-memory`.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # inside apps/web (if web affected)
bun run fallow:audit
```
