# One-Time, Optional Adventure Complete Epilogue (#5192) Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

When a player-pursued goal reaches a committed resolution (`achieved` or `failed`), the engine now records the outcome (#5191), but `AdventureFocusPlay.svelte` offers no in-fiction closing moment. Players need a compact, dismissible "Adventure Complete" panel that celebrates or closes the arc using actual committed world impacts while keeping the continuing world session open and never repeating on reload or retry.

### Scope & Boundaries

- **In Scope**:
  - Persist `acknowledgedOutcomeIds` on `AdventureSession` (`types.ts`, `session-schema.ts`) via the existing single-writer lease/revision `AdventureScenarios.mutate()` path.
  - Add pure engine helpers in `packages/adventure-engine/src/thread-outcomes.ts`: `completionEventId()`, `selectPendingAdventureCompletion()`, and `acknowledgeAdventureCompletion()`.
  - Create `AdventureCompletionPanel.svelte` using Svelte 5 Runes, Tailwind 4 semantic tokens, and Iconify utilities, with accessible non-locking dialog semantics, `prefers-reduced-motion` support, and responsive phone layout.
  - Wire `AdventureCompletionPanel.svelte` into `AdventureFocusPlay.svelte` after streaming narration and pending rolls finish, offering **Continue exploring**, **Find another adventure**, and **Finish for now** (explicit archive only).
- **Out of Scope**:
  - Extra model/provider calls for epilogue generation.
  - Forced session closure, reward/XP systems, or celebratory media/artwork prerequisites.

### Acceptance Criteria

- [ ] After a newly committed significant goal resolution (`achieved` or `failed` with committed supporting evidence on the latest turn), `AdventureCompletionPanel` renders once after streaming/rolls complete, showing the goal heading, grounded epilogue, and up to 3 committed world impacts.
- [ ] Minor clue chains, conversational answers, OOC hypotheticals, and older/replayed completions do not trigger the panel.
- [ ] Dismissing (**Continue exploring** or close button) persists `acknowledgedOutcomeIds` through the single-writer repository save so reload, retry, or mode switching never repeats the panel, and preserves composer drafts and Ask GM state.
- [ ] **Find another adventure** returns to the entry/archive view without archiving; **Finish for now** explicitly archives the session via `manager.end()`.
- [ ] Accessible keyboard navigation, `Escape` dismissal, reduced motion support, and no full-screen scroll lock on phone or desktop viewports.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `packages/adventure-engine/src/types.ts` & `session-schema.ts`: Add optional `acknowledgedOutcomeIds?: string[]` (max 32).
  - `packages/adventure-engine/src/thread-outcomes.ts`: Add `AdventureCompletionSummary`, `completionEventId()`, `selectPendingAdventureCompletion()`, and `acknowledgeAdventureCompletion()`.
  - `apps/web/src/lib/stores/oracle/adventure-scenarios.ts` & `adventure-manager.svelte.ts`: Add `acknowledgeCompletion(eventId)` using `AdventureScenarios.mutate()`.
  - `apps/web/src/lib/components/oracle/adventure/AdventureCompletionPanel.svelte` (new): Compact completion panel with goal heading, epilogue, up to 3 committed world impacts, unresolved side notes, and next-step actions.
  - `apps/web/src/lib/components/oracle/adventure/AdventureFocusPlay.svelte`: Render `AdventureCompletionPanel` when `pendingCompletion` is active and not generating/streaming/pending roll.
  - Tests: `packages/adventure-engine/tests/thread-outcomes.test.ts` and `apps/web/src/lib/components/oracle/adventure/AdventureCompletionPanel.test.ts`.
- **Data Contracts & State Flow**:
  - `selectPendingAdventureCompletion(session)` inspects `session.turns.at(-1)` and returns a player-safe `AdventureCompletionSummary` only for a newly committed `achieved`/`failed` outcome not yet in `acknowledgedOutcomeIds`.
  - Dismissal calls `manager.acknowledgeCompletion(eventId)` -> `AdventureScenarios.mutate()` -> `repository.save(revision, updatedSession)` -> reactive `manager.session` update.
- **UI & Design Tokens**:
  - Tailwind 4 semantic tokens: `bg-theme-surface`, `text-theme-text`, `border-theme-border`, `bg-theme-primary`, `text-theme-on-primary`.
  - Iconify classes: `icon-[lucide--sparkles]`, `icon-[lucide--check-circle-2]`, `icon-[lucide--x]`, etc.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**: Panel appears once after valid goal completion, displays up to 3 player-visible committed impacts, and persists acknowledgement on dismissal.
- **Negative / Error Path**: Save failure or read-only session still hides the panel locally without crashing and surfaces a non-blocking notification if needed; stale revision is handled by the existing lease/repository boundary.
- **Cancellation / Edge Case**: `Escape` key or close button dismisses non-destructively; pending roll or active streaming delays display until settled; old/replayed sessions never trigger the panel.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Engine & Schema** — Add `acknowledgedOutcomeIds` and `selectPendingAdventureCompletion` / `acknowledgeAdventureCompletion` with unit tests in `packages/adventure-engine`.
- [ ] **Task 2: Store & UI** — Add `acknowledgeCompletion` to `AdventureScenarios` / `AdventureManager`, build `AdventureCompletionPanel.svelte`, and wire into `AdventureFocusPlay.svelte`.
- [ ] **Task 3: UI & Integration Tests** — Add component and store tests in `apps/web` covering happy path, non-triggering cases, persistence/idempotency, and accessibility/keyboard dismissal.
- [ ] **Task 4: Verification Gate** — Run `lint:changed`, `test:changed`, `typecheck-changed`, and `fallow:audit`.

---

## 4. Verification Gate

```bash
bun run lint:changed -- --base origin/staging
bun run test:changed -- --base origin/staging
bun scripts/typecheck-changed.mjs --base origin/staging
bun run fallow:audit
```
