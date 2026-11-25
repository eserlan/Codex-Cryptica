# Mini-Spec: Trace Action Fulfilment From Proposal Through Committed Outcome (#5196)

## Goal

Expose whether the GM answered the submitted player action, and distinguish what the model proposed from what the reducer accepted, corrected, or rejected—strictly as GM-only observability alongside `#5195` (`directorDelivery`), never as an additional authority layer.

## Design

### 1. Bounded Types & Schema (`packages/adventure-engine`)

Add `ActionResolutionTrace` to `GenerationMetadata` (`types.ts`) and `generationMetadataSchema` (`turn-schemas.ts`):

- `outcome`: `"resolved" | "roll-required" | "credible-blocked" | "clarification" | "unresolved" | "unknown"`
- `validation`: `"accepted" | "corrected" | "rejected" | "unknown"`
- `evidenceCategory`: `"roll-resolved" | "roll-pending" | "movement" | "discovery" | "state-patch" | "witness-limit" | "observation" | "credible-block" | "clarification" | "non-answer" | "quiet-play" | "dropped-patch" | "rejected-turn" | "none"`
- `droppedCount?: number` (present when `dropped.length > 0`)
- `droppedKinds?: string[]` (bounded unique category tags derived from `dropped` prefixes: `"time-advance"`, `"package-scene"`, `"package-event"`, `"actor-event"`, `"scenario-reveal"`, `"scenario-elaboration"`, `"state-patch"`; never raw text or secret IDs)
- `resolvedRoll?: boolean` (present when `turn.resolvedRoll` is set)

All fields are optional on `GenerationMetadata` so legacy turns parse cleanly and uninstrumented turns remain `"unknown"`.

### 2. Deterministic Classifier (`packages/adventure-engine/src/action-resolution.ts`)

Compute `actionResolution` at the end of `applyCompletedTurn` (`completed-turn.ts`) _after_ `turn.dropped` and scenario/thread updates settle, when `turn.generation` is present:

- **Validation**: `"corrected"` when `turn.dropped?.length > 0`, otherwise `"accepted"`.
- **Outcome & Evidence** (reusing `#5110` / `#5175` `classifyTurnProgress`, `isTurnNonAnswer`, `isUnansweredInquiryTurn`, `isInvestigativeInquiry` without duplicating non-answer heuristics):
  1. `progress.nonAnswer || progress.kind === "repeated-non-answer"` -> `outcome: "unresolved"`, `evidenceCategory: "non-answer"`
  2. `turn.resolvedRoll != null` -> `outcome: "resolved"`, `evidenceCategory: "roll-resolved"`, `resolvedRoll: true`
  3. Dropped patch (`turn.dropped?.length > 0`) with no visible/location/fact/secret/scenario change -> `outcome: "unresolved"`, `evidenceCategory: "dropped-patch"` (no false success when proposed patches are dropped)
  4. Witness response with epistemic limits (`isInvestigativeInquiry` + `isTurnNonAnswer` + `!isUnansweredInquiryTurn`) -> `outcome: "resolved"`, `evidenceCategory: "witness-limit"`
  5. Movement (`visiblePatch.location !== undefined` or `visiblePatch.packageSceneId !== undefined`) -> `outcome: "resolved"`, `evidenceCategory: "movement"`
  6. Discovery / scenario / secret / useful negative finding -> `outcome: "resolved"`, `evidenceCategory: "discovery"`
  7. Credible block / obstacle (`progress.kind === "obstacle-introduced-or-shifted"`, or guided movement/action credibly refused/blocked without location change) -> `outcome: "credible-blocked"`, `evidenceCategory: "credible-block"`
  8. Material clarification (no state change, non-empty clarifying question to resolve ambiguity, not a non-answer deflection) -> `outcome: "clarification"`, `evidenceCategory: "clarification"`
  9. State patch / consequential choice / time advance -> `outcome: "resolved"`, `evidenceCategory: "state-patch"`
  10. Inspection/observation action without state patch -> `outcome: "resolved"`, `evidenceCategory: "observation"`
  11. Quiet play (`progress.kind === "no-observable-change"`) -> `outcome: "resolved"`, `evidenceCategory: "quiet-play"`
  12. Fallback when semantic resolution cannot be reliably established -> `outcome: "unknown"`, `evidenceCategory: "none"`

### 3. Pending Rolls & Rejections (No Fabricated Turns)

- **Pending roll**: When `session.pendingRoll` is present, diagnostic exports expose `outcome: "roll-required"`, `validation: "accepted"`, `evidenceCategory: "roll-pending"` on the pending roll channel without fabricating a committed turn.
- **Rejected turn**: `toTurnRejection` in `adventure-runtime.ts` attaches `actionResolution: { outcome: "unresolved", validation: "rejected", evidenceCategory: "rejected-turn" }` to `TurnRejectionDiagnostic` (`lastTurnRejection`) without fabricating a committed turn.

### 4. GM-Only Diagnostic Exports (`adventure-review-capture.ts`)

- Add `actionOutcome` and `actionValidation` counts to `generationSummary` (counting legacy turns without `generation.actionResolution` as `"unknown"`).
- Keep `actionResolution` side-by-side with `#5195` `directorDelivery` on each instrumented turn's `generation` metadata.
- Update `DIAGNOSTIC_README` concisely; preserve player-safe projections and secret boundaries.
