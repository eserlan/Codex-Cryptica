# Spoiler-Safe Progressive Oracle Narration Streaming (#5090) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

Following PR #5085, Solo Adventure Mode withholds all live narration previews until the full model JSON response finishes and passes leakage checks. Because `narration` can currently appear before `hiddenPatch` and reveal metadata in the streamed JSON, incremental previews were disabled to prevent same-turn spoilers from appearing on screen before validation. We want to restore progressive, word-by-word narration streaming in the Oracle UI without weakening the secrecy boundary or adding extra model calls.

### Scope & Boundaries

- **In Scope**:
  - Enforce deterministic JSON field ordering (`propertyOrdering` in `adventureTurnResponseSchema`) so `kind`, `hiddenPatch`, `revealSecretIds`, `revealScenarioIds`, `packageEvents`, and `elaborateScenarios` are emitted before `narration` / `setupNarration`.
  - Add a pure streaming prefix parser that holds back all preview output until those leading metadata fields are completely parsed, and only then extracts incremental `narration` / `setupNarration` deltas.
  - Screen every incremental preview against **both** persisted session/package secrecy guards and the turn's newly parsed `hiddenPatch` and reveal lists (suppressing and clearing with `onNarration("")` on any match).
  - Enable progressive `onNarration` publishing in both `AdventureContentGeneration.stream` (stateless) and `AdventureInteractionTransport.stream` (retained Interactions).
  - Preserve cancellation (`AbortError`), malformed JSON repair, rejected-turn rollback, and safe fallback to full-response buffering when a provider does not follow the metadata-first order.
  - Unit and integration tests covering stateless and Interactions streaming, same-turn `hiddenPatch` secret suppression, authorised reveals, cancellation, repair, and rejected turns.
- **Out of Scope**:
  - Reintroducing a prefix-only heuristic before `hiddenPatch` and reveal metadata are known.
  - Splitting turn generation into two separate LLM calls.
  - Changing the committed-turn persistence contract or `AdventureSession` schema.

### Acceptance Criteria

- [ ] Progressive `narration` / `setupNarration` previews stream incrementally to `onNarration` during both stateless and Interactions generation when leading metadata is complete and clean.
- [ ] A non-package turn inventing an unrevealed secret or thread in `hiddenPatch` never surfaces that secret in a streamed preview, even if the final turn fails validation or is rejected.
- [ ] A turn that explicitly authorises a reveal (`revealSecretIds` / `revealScenarioIds` / `packageEvents`) allows the corresponding narration to stream without false suppression.
- [ ] Cancellation mid-stream or malformed-JSON repair immediately clears any unverified preview (`onNarration("")`) and leaves no spoiler or uncommitted text in the transcript.
- [ ] Responses where `narration` arrives before leading metadata (e.g. legacy or non-compliant provider output) safely fall back to full-response buffering.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/ai-engine/src/adventure-response-schema.ts`: Add `propertyOrdering` to `adventureTurnResponseSchema` variants so metadata (`kind`, `hiddenPatch`, `revealSecretIds`, `revealScenarioIds`, `packageEvents`, `elaborateScenarios`) precedes `narration` / `setupNarration`.
  - `packages/ai-engine/src/adventure-narration-stream.ts`: Implement a pure incremental metadata-then-narration parser (`extractSafeNarrationState(buffer)`) returning `{ ready: boolean; narration: string; hiddenPatch?: ...; revealSecretIds?: string[]; revealScenarioIds?: string[]; packageEvents?: ... }`.
  - `packages/ai-engine/src/adventure-content-generation.ts`: Replace the no-op `() => {}` in `AdventureContentGeneration.stream` with gated preview publishing using `extractSafeNarrationState` + same-turn leakage screening.
  - `packages/ai-engine/src/adventure-interaction-transport.ts`: Publish gated progressive previews in `AdventureInteractionTransport.stream` using the same shared helper.
  - `apps/web/src/lib/stores/oracle/adventure-runtime.ts`: Ensure `narrationPreview` and final commit/rejection paths remain aligned with same-turn suppression and `onNarration("")` clearing.
  - `packages/ai-engine/src/adventure-turn-generation.service.test.ts`, `packages/ai-engine/src/adventure-interaction-generation.test.ts`, `apps/web/src/lib/stores/oracle/tests/adventure-package-leakage.test.ts`, `apps/web/src/lib/stores/oracle/tests/gm-secrecy-outputs.test.ts`: Add TDD coverage for all positive and negative streaming paths.

- **Data Contracts & State Flow**:
  - Streaming transport emits raw JSON text chunks -> pure parser checks whether leading metadata fields are complete -> same-turn + session/package guard checks incremental `narration` -> only if clean, invokes `request.onNarration(preview)` -> `AdventureRuntime.narrationPreview` updates `state.streamedNarration` (Svelte 5 `$state`).
  - No new IndexedDB or OPFS persistence; `streamedNarration` remains transient UI state cleared on commit, rejection, repair, or abort.

- **UI & Design Tokens**:
  - Existing Oracle chat streaming UI consumes `streamedNarration` as today; no new components or visual tokens required.

### Key Technical Decisions & Tradeoffs

- **Metadata-first `propertyOrdering` + gated streaming parser vs. two-pass LLM call**: Using `propertyOrdering` in Gemini's structured output schema keeps single-call latency and cost while making progressive narration safe by construction. If a provider ignores `propertyOrdering` and emits `narration` first, the parser sees `ready: false` until metadata arrives, naturally degrading to full-response buffering with zero leak risk.
- **Shared preview-gating helper**: Both `AdventureContentGeneration.stream` and `AdventureInteractionTransport.stream` share the exact same parser and same-turn leakage check to avoid divergent security logic.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Metadata fields parse cleanly -> incremental `narration` deltas pass session, package, and same-turn `hiddenPatch` checks -> `onNarration` updates `streamedNarration` progressively -> full proposal commits.
- **Negative / Error Path (Leakage or Invalid JSON)**:
  - If `narration` matches any existing secret, package GM note, or newly added `hiddenPatch` secret/thread (not in the turn's authorised reveal set), preview publishing latches `suppressed = true` and calls `onNarration("")` immediately.
  - If final `parseAdventureResponse` fails and triggers repair, `onNarration("")` withdraws the unverified preview before retrying buffered/repaired generation.
- **Cancellation / Edge Case**:
  - `AbortSignal` aborts mid-stream -> `streamAborted(signal)` throws `AbortError`, `adventure-runtime` clears `streamedNarration`, and no partial turn is persisted.
  - `roll-required` turns have no `hiddenPatch`; once `kind: "roll-required"` and leading fields are parsed, `setupNarration` streams safely.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests for `extractSafeNarrationState` (metadata-first streaming, `narration`-first fallback buffering, `hiddenPatch` secret suppression, authorised reveal allowance) and for both stateless & Interactions streaming paths (happy path, abort, repair withdrawal, rejected turn).
- [ ] **Task 2: Schema Ordering** — Add `propertyOrdering` to `adventureTurnResponseSchema` in `packages/ai-engine/src/adventure-response-schema.ts` so `hiddenPatch` and reveal/package metadata precede `narration` / `setupNarration`.
- [ ] **Task 3: Pure Stream Parser & Guard** — Implement `extractSafeNarrationState` and shared gated-preview publisher in `packages/ai-engine/src/adventure-narration-stream.ts` (reusing existing leakage checks without duplicating logic).
- [ ] **Task 4: Wire Both Transports** — Integrate the gated preview publisher into `AdventureContentGeneration.stream` and `AdventureInteractionTransport.stream`, and verify `AdventureRuntime.narrationPreview` handles suppression/withdrawal cleanly.
- [ ] **Task 5: Secrecy & Replay Verification** — Run `gm-secrecy-outputs.test.ts`, `gm-secrecy-playthrough.test.ts`, `adventure-package-leakage.test.ts`, and the impacted verification gate; perform manual staging check for live streaming UX.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # inside apps/web
bun run fallow:audit
```
