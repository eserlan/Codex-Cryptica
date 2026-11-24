# Trace Director Guidance Actually Delivered to the GM (#5195) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

GM-only per-turn `GenerationMetadata` (#5112) currently records transport, thread mode, reset reason, and `scenarioIds`, but does not record whether Director guidance (`"GM-ONLY director brief"`) was actually delivered in the outgoing model request (versus omitted by `directorEnabled: false`, dropped/truncated by budget, or omitted/retained in a `stateDelta` on a continuation request).

### Scope & Boundaries

- **In Scope**:
  - **Bounded `DirectorDeliveryTrace` on `GenerationMetadata`** (`packages/adventure-engine/src/types.ts`, `turn-schemas.ts`):
    - `status`: `"included" | "truncated" | "omitted" | "retained" | "unknown"`
    - `reason`: `"delivered" | "budget" | "disabled" | "not-applicable" | "retained-unchanged" | "unknown"`
    - `deliveredChars`: non-negative integer (actual serialized char count of `"GM-ONLY director brief"` in the outgoing request payload, `0` when not sent)
    - `focusedScenarioId?`: string (from the delivered/constructed brief's `pursuedScenarios[0]?.scenarioId` or `pursuedEmergentThread?.threadId`, bounded)
    - `recoveryReason?`: `"none" | "dialogue" | "investigative" | "both"`
    - `requestedDevelopmentKind?`: string (e.g. `pursuedScenarios[0]?.potential.nextDevelopmentKinds[0]` or `suggestedActionKinds[0]`, bounded)
  - **Capture from actual outgoing request**:
    - `prompt.ts` / `context-budget.ts`: emit non-serialized `directorMeta` on `PromptBudgetResult` (without altering `prompt.serialized` or `prompt.state`) capturing `directorEnabled`, `truncatedByBudget`, `omittedByBudget`, `focusedScenarioId`, `recoveryReason`, and `requestedDevelopmentKind`.
    - `adventure-interaction-input.ts` & `adventure-interaction-generation.ts`: inspect the actual outgoing `payload` (`payload.state["GM-ONLY director brief"]` or `payload.stateDelta["GM-ONLY director brief"]`) on the successful attempt so retained-interaction `stateDelta` (`included`, `retained-unchanged`, or `omitted`) and stateless/fallback requests are accurately classified.
    - `adventure-turn-generation.service.ts` & `apps/web/src/lib/stores/oracle/adventure-runtime.ts`: carry `directorDelivery` through `AdventureGenerationInfo` -> `GenerationMetadata` only for the accepted/committed proposal (rejected/failed attempts are discarded).
  - **GM-only full & delta exports** (`apps/web/src/lib/services/adventure/adventure-review-capture.ts`):
    - Preserve `turn.generation.directorDelivery` on full turns and delta new turns; summarize bounded Director delivery counts in `summary.generation.directorDelivery` (leaving legacy turns without `directorDelivery` as `"unknown"`). Never expose raw brief text, prompts, secrets, or player-facing projections.

- **Out of Scope**:
  - Action outcome classification and proposal/commit correlation (02/03).
  - Cross-feature replay evaluation (03/03).
  - Changing Director pacing policy or adding extra provider calls.

### Acceptance Criteria

- [ ] Deterministic tests cover Director enabled and disabled, included/omitted/truncated by budget, retained (`stateDelta` unchanged vs updated) and stateless/fallback requests, retry attribution (only committed attempt recorded), and legacy parsing.
- [ ] GM-only full and delta diagnostic copies (`adventureDiagnosticJson` / `copyDiagnosticSnapshot`) surface `directorDelivery` on turns and bounded counts in `summary.generation.directorDelivery`, with legacy turns treated as `"unknown"`.
- [ ] Zero raw prompt/brief text, secrets, or player-facing projection leakage.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- `packages/adventure-engine/src/types.ts` & `turn-schemas.ts`:
  - Add `DirectorDeliveryTrace` interface and `directorDeliverySchema` on `GenerationMetadata` / `generationMetadataSchema`.
- `packages/adventure-engine/src/prompt.ts` & `context-budget.ts`:
  - Add optional `directorMeta` to `PromptBudgetResult` (passed through `allocatePromptBudget` without touching `serialized` or `state`).
- `packages/ai-engine/src/adventure-generation.types.ts`, `adventure-interaction-input.ts`, `adventure-interaction-generation.ts`, `adventure-turn-generation.service.ts`:
  - Compute `directorDelivery` from the actual outgoing `payload` in `buildAdventureInteractionInput` (interaction transport) and `buildGenerationInfo` (stateless transport).
- `apps/web/src/lib/stores/oracle/adventure-runtime.ts` & `apps/web/src/lib/services/adventure/adventure-review-capture.ts`:
  - Forward `info.directorDelivery` in `generationDescriptorFor`, and tally `directorDelivery` counts in `adventure-review-capture.ts`.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Schema & Prompt Metadata** — Add `DirectorDeliveryTrace` to `types.ts` / `turn-schemas.ts` and attach `directorMeta` in `prompt.ts` / `context-budget.ts`.
- [ ] **Task 2: Outgoing Transport Capture** — Inspect actual outgoing payload in `ai-engine` (`adventure-interaction-input.ts`, `adventure-interaction-generation.ts`, `adventure-turn-generation.service.ts`).
- [ ] **Task 3: Runtime & Diagnostics + Tests (TDD)** — Wire into `adventure-runtime.ts` and `adventure-review-capture.ts`, and add deterministic tests across `adventure-engine`, `ai-engine`, and `apps/web`.
- [ ] **Task 4: Verification Gate** — Run targeted tests, `fallow audit`, `svelte-check`, commit, push, and open PR targeting `staging`.
