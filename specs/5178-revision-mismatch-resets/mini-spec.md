# Explain & Eliminate Unexpected Provider `revision-mismatch` Resets After Local Saves (#5178) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In a multi-turn retained-interaction adventure, background or local UI persistence operations (`AdventureArtworkSession` saves, `AdventureTools` dice-preset / resource-counter mutations, and `AdventureScenarios` mutations) call `repository.save(...)` and increment `session.revision` without calling `confirmGenerationInteraction(session.id, saved.session.revision)`. On the next Play turn, `AdventureInteractionContext.prepareWithMetadata` sees `interaction.revision !== session.revision` and forces a `threadMode: "reset"` with `resetReason: "revision-mismatch"`, even though no external write or canonical source change occurred. In addition, `GenerationMetadata` and GM-only diagnostics record `resetReason: "revision-mismatch"` without indicating which local save operation caused the revision jump.

### Scope & Boundaries

- **In Scope**:
  - **Audit & classify local `repository.save` paths**:
    - _Reconcilable local saves_ (do not invalidate retained provider history): `turn-commit`, `ooc-exchange`, `artwork-save`, `dice-preset`, `resource-counter`, `scenario-update`. Reconcile `confirmGenerationInteraction(saved.session.id, saved.session.revision)` after a successful save.
    - _Intentional reset / external saves_: `state-correction` (explicit `visibleState` rewrite), `session-resume`, `external-or-concurrent` (e.g. another tab/writer bumped `session.revision`), and `unknown` (uninstrumented/legacy). Keep `revision-mismatch` reset intact for these.
  - **Bounded GM-only diagnostic cause** (`packages/adventure-engine/src/types.ts`, `turn-schemas.ts`, `adventure-grounding-service.ts`, `adventure-review-capture.ts`):
    - Add `LocalSaveOperation` enum and optional `revisionMismatchCause?: LocalSaveOperation` on `GenerationMetadata` (populated only when `resetReason === "revision-mismatch"`, defaulting to `"unknown"` when uninstrumented).
    - Expose `lastRevisionMismatchCause` in `adventure-review-capture.ts` `summary.generation` (strictly GM-only, non-sensitive, no raw text/IDs).
  - **Synthetic regression tests**:
    - Play -> OOC (pending/answer + automatic decision) -> Play -> continued turns -> background artwork save / dice preset / resource counter / scenario focus -> Play (must stay `continued`, no `revision-mismatch`).
    - Explicit `submitCorrection` / concurrent external revision jump -> Play (must still reset with `resetReason: "revision-mismatch"` and accurate `revisionMismatchCause`).

- **Out of Scope**:
  - Blanket-ignoring `revision-mismatch` in `AdventureInteractionContext`.
  - Wholesale provider transcript reconstruction or persisting provider transcripts locally.

### Acceptance Criteria

- [ ] Background `artwork-save`, `dice-preset`, `resource-counter`, and `scenario-update` saves reconcile `confirmGenerationInteraction` and no longer trigger unnecessary `revision-mismatch` resets.
- [ ] External/concurrent revision jumps and explicit `state-correction` saves still trigger `revision-mismatch` resets safely.
- [ ] `GenerationMetadata.revisionMismatchCause` and `summary.generation.lastRevisionMismatchCause` classify unexpected revision mismatches with a bounded `LocalSaveOperation` enum (or `"unknown"` when uninstrumented), with zero player leakage.
- [ ] No lost Ask GM decisions, pending-turn context, duplicate commits, stale source material, or hidden-leak regressions.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/types.ts` & `turn-schemas.ts`:
  - Add `LocalSaveOperation` (`"turn-commit" | "ooc-exchange" | "artwork-save" | "dice-preset" | "resource-counter" | "state-correction" | "scenario-update" | "place-link" | "story-summary" | "session-resume" | "external-or-concurrent" | "unknown"`).
  - Add optional `revisionMismatchCause?: LocalSaveOperation` on `GenerationMetadata` and `generationMetadataSchema`.
- `apps/web/src/lib/stores/oracle/adventure-runtime.ts`, `adventure-tools.ts`, `adventure-scenarios.ts`:
  - Track `lastLocalSaveOp` / `lastConfirmedRevision` on `AdventureRuntime` (via a small `recordLocalSave(op, session, reconcile)` helper).
  - Reconcile `confirmGenerationInteraction` for `artwork-save`, `dice-preset`, `resource-counter`, and `scenario-update` (swallowing non-fatal confirmation errors cleanly, just like `saveTurn`).
  - Record `state-correction` without reconciling so `prepareWithMetadata` resets safely and `adventure-grounding-service.ts` / `adventure-actions.ts` can stamp `revisionMismatchCause`.
- `apps/web/src/lib/services/adventure/adventure-grounding-service.ts` & `adventure-review-capture.ts`:
  - Attach `revisionMismatchCause` when `generation.resetReason === "revision-mismatch"` (using `runtime`'s tracked `lastLocalSaveOp` when `session.revision` matches the tracked revision, `"external-or-concurrent"` when `session.revision` jumped beyond it, or `"unknown"` when uninstrumented).
  - Include `lastRevisionMismatchCause` in `generationSummary(session)` in `adventure-review-capture.ts`.

### Failure, Edge & Cancellation Paths

- **Concurrent external write**: `session.revision` advances without `lastLocalSaveOp` -> `resetReason: "revision-mismatch"`, `revisionMismatchCause: "external-or-concurrent"`.
- **Confirmation failure on background save**: `confirmGenerationInteraction` rejects -> `clearGenerationInteraction` is called safely so the next turn reconstructs cleanly without losing the local save.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Schema & Types** — Add `LocalSaveOperation` and `revisionMismatchCause` to `types.ts` and `turn-schemas.ts`.
- [ ] **Task 2: Runtime Reconciliation & Cause Tracking** — Wire `recordLocalSave` / `confirmGenerationInteraction` into `adventure-runtime.ts`, `adventure-tools.ts`, `adventure-scenarios.ts`, and `adventure-grounding-service.ts`, plus `lastRevisionMismatchCause` in `adventure-review-capture.ts`.
- [ ] **Task 3: Regression & Diagnostic Tests (TDD)** — Add synthetic multi-turn + background-save + concurrent-write tests in `apps/web/src/lib/stores/oracle/tests/adventure-ooc.test.ts` (or `adventure-runtime.test.ts`) and `adventure-review-capture.test.ts`.
- [ ] **Task 4: Verification Gate** — Run targeted tests, `fallow audit`, and `svelte-check`, then commit, push, and open PR targeting `staging`.
