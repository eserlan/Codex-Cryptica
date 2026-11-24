# Adventure State Budget Diagnostics & Storage Decoupling (#5203) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

In `packages/adventure-engine`, `MAX_SERIALIZED_STATE_CHARS` (`48_000`) currently serves as both the durable session persistence limit (`session-reader.ts`, `completed-turn.ts`, `session-tools.ts`, `scenario-collection.ts`) and the model-facing prompt state cap (`prompt.ts`, `context-budget.ts`). Because durable session state grows over long investigations, valid saved sessions can be rejected on load or turn commit even when a bounded prompt projection fits comfortably within the model's `96_000`-character generation envelope, and there is no per-section breakdown to show which fields consume the budget.

### Scope & Boundaries

- **In Scope**:
  - Add a pure `measureStateBudget(session)` diagnostic helper in `packages/adventure-engine/src/session-budget.ts` reporting per-section character counts, total characters, utilisation ratio, and a proactive warning flag (`>= 80%` of the hot prompt state budget).
  - Decouple durable session persistence/mutation validation from the `48_000`-character hot prompt-state projection cap by introducing a separate durable safety ceiling (protecting against runaway corruption without blocking normal 40–100+ turn growth) while keeping `prompt.ts` and `context-budget.ts` strictly bounded within `MAX_SERIALIZED_STATE_CHARS` (`48_000`) and `MAX_GENERATION_INPUT_CHARS` (`96_000`).
  - Surface the per-section budget breakdown in GM-only diagnostics (never in player-facing outputs or guest exports).
  - Preserve backwards compatibility for all existing 32k and 48k saved sessions and atomic turn rejection behaviour.
- **Out of Scope**:
  - Lossless or provenance-preserving compaction of `scenarioCollection`, `knownFacts`, `provisionalFacts`, `storySoFar`, or `places` (tracked in Slice 2 / `#5204`).
  - Raising `MAX_GENERATION_INPUT_CHARS` (`96_000`) or relaxing `context-budget.ts` prompt allocation guards.
  - Deleting or truncating persisted user session data on load.

### Acceptance Criteria

- [ ] `measureStateBudget(session)` returns accurate per-section character counts for every budgeted field (`visibleState`, `hiddenState`, `provisionalFacts`, `dismissedProvisionalFactIds`, `scenarioCollection`, `worldEntry`, `historicalAnchor`, `worldTime`, `places`, `storySoFar`), total length, and `warning` (`true` at `>= 80%` of `MAX_SERIALIZED_STATE_CHARS`).
- [ ] Existing 32k/48k sessions and sessions whose total durable state exceeds `48_000` characters (while remaining within the durable safety ceiling and yielding a bounded prompt state `<= 48_000`) load via `parseAdventureSession` / `parseAdventureSessionForRecovery` and commit turns cleanly.
- [ ] `prompt.ts` and `context-budget.ts` continue to enforce `MAX_SERIALIZED_STATE_CHARS` (`48_000`) on the serialised model state and `MAX_GENERATION_INPUT_CHARS` (`96_000`) on total generation input, throwing/returning `state-budget-exceeded` atomically with no partial commit if the hot projection itself exceeds the limit.
- [ ] GM-only secrecy checks confirm per-section budget diagnostics (especially `hiddenState`) are never exposed to player-facing surfaces or guest exports.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/session-budget.ts`: Add `MAX_DURABLE_STATE_CHARS`, `STATE_BUDGET_WARNING_RATIO` (`0.8`), `StateBudgetBreakdown` type, `measureStateBudget(session)`, and `validateDurableStateBudget(session)` while retaining `MAX_SERIALIZED_STATE_CHARS` (`48_000`) and `validateStateBudget(session)` for hot prompt-state checks.
  - `packages/adventure-engine/src/session-reader.ts`: Switch durable load-time validation (`assertStateBudget`) to `validateDurableStateBudget`, keeping `parseAdventureSessionForRecovery` intact for legacy v1/v2 sessions.
  - `packages/adventure-engine/src/completed-turn.ts`, `packages/adventure-engine/src/session-tools.ts`, `packages/adventure-engine/src/scenario-collection.ts`: Validate durable mutations against `validateDurableStateBudget` so valid long sessions are not blocked by the hot prompt-state cap.
  - `packages/adventure-engine/src/prompt.ts` & `packages/adventure-engine/src/context-budget.ts`: Keep `MAX_SERIALIZED_STATE_CHARS` (`48_000`) enforced on the projected `state` sent to the model; if `baseState` approaches `48_000`, `buildBasePromptState` / `allocatePromptBudget` remains bounded and rejects atomically rather than exceeding `48_000`.
  - `packages/adventure-engine/src/schemas.ts`: Re-export `measureStateBudget` and `MAX_DURABLE_STATE_CHARS` alongside existing budget exports.
  - `packages/adventure-engine/tests/session-budget.test.ts` & `packages/adventure-engine/tests/session-reader.test.ts`: Unit tests for per-section breakdown, warning threshold, durable vs. hot budget separation, and failure paths.
- **Data Contracts & State Flow**:
  - Pure TypeScript types in `@codex/adventure-engine`; no IndexedDB, OPFS layout, or `CURRENT_ADVENTURE_SCHEMA_VERSION` migration required.
  - Diagnostics are computed on demand from `AdventureSession` (read-only) and never persisted into player-visible state.

### Key Technical Decisions & Tradeoffs

- **Separate `MAX_DURABLE_STATE_CHARS` from `MAX_SERIALIZED_STATE_CHARS`**: Using one constant for both durable persistence and prompt projection caused the 39-turn cliff (#5183). Decoupling them unblocks durable growth immediately without expanding the LLM prompt window or weakening `context-budget.ts`.
- **Keep `measureStateBudget` pure and deterministic**: Measuring sections via `JSON.stringify` on the exact budgeted keys avoids drift between diagnostics and `validateStateBudget`, and keeps GM-only telemetry trivial to inspect in tests without UI coupling.
- **Defer compaction to Slice 2 (#5204)**: Keeping Slice 1 strictly to measurement and storage/prompt decoupling keeps the PR small, low-risk, and easy to verify before designing compaction rules against real section measurements.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: A 40+ turn session with >48k durable state loads cleanly, `measureStateBudget` reports per-section sizes and `warning: true` when `>= 80%`, and turns commit as long as the projected prompt state fits within `48_000` chars.
- **Negative / Error Path**: A genuinely corrupt or runaway session exceeding `MAX_DURABLE_STATE_CHARS` (or a prompt projection exceeding `MAX_SERIALIZED_STATE_CHARS` in `allocatePromptBudget`) fails atomically with `state-budget-exceeded` and zero partial state mutation.
- **Cancellation / Edge Case**: Legacy v1/v2 sessions exceeding `MAX_DURABLE_STATE_CHARS` only due to v3 migration metadata still enter `legacy-read-only-recovery` via `parseAdventureSessionForRecovery` without data loss.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing tests in `session-budget.test.ts` and `session-reader.test.ts` for `measureStateBudget` (all 10 sections + `>= 80%` warning), durable >48k load/commit success, and `MAX_DURABLE_STATE_CHARS` / `context-budget.ts` `state-budget-exceeded` failure paths.
- [ ] **Task 2: Budget Diagnostics & Constants** — Implement `MAX_DURABLE_STATE_CHARS`, `STATE_BUDGET_WARNING_RATIO`, `measureStateBudget`, and `validateDurableStateBudget` in `session-budget.ts` and export from `schemas.ts`.
- [ ] **Task 3: Decouple Durable Validation** — Update `session-reader.ts`, `completed-turn.ts`, `session-tools.ts`, and `scenario-collection.ts` to validate durable mutations with `validateDurableStateBudget`, keeping `prompt.ts` and `context-budget.ts` strictly on `MAX_SERIALIZED_STATE_CHARS`.
- [ ] **Task 4: GM-Only Diagnostics & Secrecy Check** — Wire `measureStateBudget` into GM-only diagnostic output and verify GM-secrecy tests pass with zero hidden-state leakage.
- [ ] **Task 5: Verification Gate** — Run impacted checks and confirm zero errors.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig ./tsconfig.json --threshold error # Only if apps/web is modified
```
