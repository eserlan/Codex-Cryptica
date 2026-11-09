# Reviewable Vault Canon Promotion and Consequence History Mini-Spec

## 1. Specification (What & Why)

### Problem Statement

During emergent adventure play, player-visible entities and world consequences (people, locations, factions, items, clues, events) are established across committed turns and recorded as persistent provisional facts. However, players currently must review and save them one by one, without a batch promotion mechanism ("Add all to Codex") or an automated mode ("Auto-promote discoveries to Codex"), making canonical world-building cumbersome during long adventures. Furthermore, the promotion system must guarantee strict provenance tracking, deduplication against existing vault titles, and prevent unrevealed GM secrets from ever leaking into canonical records.

### Scope & Boundaries

- **In Scope**:
  - **Persistent Provisional Fact Consumption**: Consume existing `session.provisionalFacts` generated and stored by `@codex/adventure-engine` across committed turns. Preserves immutable committed adventure history regardless of whether proposals are promoted, rejected, or deferred.
  - **Streamlined & Batch Promotion**: Add an "Add all to Codex" (or "Add all discoveries to Vault") action in `AdventureProvisionalFacts.svelte` that promotes all currently visible, non-duplicate discoveries in batch with progress feedback and a summary notification.
  - **Optional Auto-Promote User Setting**: Introduce a persistent "Auto-promote discoveries to Codex" preference (persisted via `UIPersistence` under `codex_adventure_auto_promote`). When active, newly committed player-visible facts that do not collide with existing vault records are automatically promoted to Codex canon upon turn completion.
  - **Strict Provenance & Typing**: Enforce provenance annotations (`Introduced during the adventure “${adventureTitle}”.`) via `createAdventureEntityDraft`, mapping fact kinds to proper Codex entity types (`character`, `location`, `faction`, `item`, `event`, `note`).
  - **Deduplication against Existing Titles**: Case-insensitive, trimmed comparison against `existingTitles`. Collisions are excluded from suggestions and skipped during batch or auto-promotion without throwing runtime errors.
  - **Strict Secret Protection**: Enforce that facts with `visibility !== "player-visible"` return `null` from draft creation, are never presented in the review UI, and are never auto-promoted without explicit fictional reveal.

- **Out of Scope**:
  - Replacing the generic Vault entity editor or changing OPFS / Markdown frontmatter data schemas.
  - Creating a separate timeline database or external world state database (reuses standard Vault entities and `AdventureSession` state).
  - Retroactively rewriting or truncating adventure transcripts or committed turns when proposals are rejected or deferred.
  - Silent destructive overwrites of existing canonical Vault entities when titles collide (collisions require manual editing in Codex).

### Acceptance Criteria

- [ ] **Batch Promotion Action**: When multiple player-visible discoveries are pending in `AdventureProvisionalFacts.svelte`, an "Add all to Codex" button is displayed; clicking it promotes all visible discoveries, skips existing titles, displays loading progress, and updates the view.
- [ ] **Optional Auto-Promote Setting**: An "Auto-promote discoveries to Codex" toggle is surfaced in the discoveries panel/settings; its state persists across page reloads via `UIPersistence` (`UI_STORAGE_KEYS.ADVENTURE_AUTO_PROMOTE`).
- [ ] **Automated Turn Promotion**: When auto-promote is enabled, committing a turn with new player-visible provisional facts automatically creates corresponding Vault entities without requiring manual review clicks, emitting an informative toast notification.
- [ ] **Strict Secret Isolation**: Facts marked `visibility: "gm-only"` are never surfaced in the review list, never returned as drafts, and never auto-promoted under any circumstance.
- [ ] **Deduplication**: Provisional facts matching an existing Vault entity title (case-insensitive, trimmed) are filtered out of the review list and safely skipped during batch or auto-promotion.
- [ ] **Immutable History on Discard / Deferral**: Discarding a discovery in the review UI dismisses it from the active review list for the session without mutating or deleting the committed turn transcript or underlying `session.provisionalFacts`.
- [ ] **Strict Provenance**: Every promoted entity content body contains the standard provenance note: `*Introduced during the adventure “<title>”.*`.
- [ ] **Verification Quality Gates**: Passes `bun run test:changed`, `bun run lint:changed`, and `svelte-check` with zero errors.

---

## 2. Technical Plan (How & Where)

### Architecture & Touchpoints

- **Affected Packages / Files**:
  - `apps/web/src/lib/stores/ui/persistence.ts`:
    - Register `ADVENTURE_AUTO_PROMOTE: "codex_adventure_auto_promote"` in `UI_STORAGE_KEYS`.
  - `apps/web/src/lib/stores/ui/adventure-promotion-settings.svelte.ts` (new):
    - Reactive `AdventurePromotionSettings` store using Svelte 5 runes (`$state`).
    - Provides `autoPromote: boolean`, `setAutoPromote(value: boolean)`, and `toggleAutoPromote()`.
    - Accepts optional `UIPersistence` dependency injection for deterministic unit testing.
  - `apps/web/src/lib/services/adventure/adventure-provisional-fact-creator.ts`:
    - Maintain and export `createAdventureEntityDraft` ensuring `fact.visibility === "player-visible"` guard.
    - Export helper `batchFilterPromotableFacts(facts: ProvisionalFact[], existingTitles: string[], excludedIds?: string[])` for unified filtering and deduplication logic across UI and auto-promoter.
  - `apps/web/src/lib/components/oracle/adventure/AdventureProvisionalFacts.svelte`:
    - Expose "Add all to Codex" button with icon `icon-[lucide--check-check]`.
    - Integrate auto-promote toggle switch with icon `icon-[lucide--sparkles]`.
    - Support props `onAdd: (fact: ProvisionalFact) => Promise<void>` and optional `onAddAll: (facts: ProvisionalFact[]) => Promise<void>`.
    - Track `addingAll = $state(false)` to disable actions and display progress during batch saves.
  - `apps/web/src/lib/components/oracle/adventure/AdventureFocusPlay.svelte`:
    - Forward `onAddAllProvisionalFacts` to `AdventureProvisionalFacts`.
  - `apps/web/src/lib/components/oracle/adventure/AdventureSurface.svelte`:
    - Implement `addAllProvisionalFacts(facts: ProvisionalFact[]): Promise<void>`: iterates or batches creation via `oracle.vault.createEntity`, checks duplicate titles against current `oracle.vault.allEntities`, and emits a batch success notification (`Added N discoveries to Codex.`).
    - Implement reactive auto-promotion effect: when `adventurePromotionSettings.autoPromote` is enabled and `session.provisionalFacts` updates, automatically identify and promote newly committed player-visible facts that are not yet in the Vault or discarded.

- **Data Contracts & State Flow**:
  - `ProvisionalFact` (`@codex/adventure-engine`):
    ```ts
    export interface ProvisionalFact {
      id: string;
      kind:
        "person" | "place" | "faction" | "item" | "event" | "clue" | "other";
      name: string;
      summary: string;
      introducedOnTurnId: string;
      visibility: "player-visible" | "gm-only";
    }
    ```
  - `AdventureEntityDraft` (`adventure-provisional-fact-creator.ts`):
    ```ts
    export interface AdventureEntityDraft {
      type: EntityType;
      title: string;
      initialData: { content: string };
    }
    ```
  - State management uses Svelte 5 Runes (`$state`, `$derived`, `$effect`).
  - Storage: Browser-local `localStorage` via `UIPersistence` for the user setting; OPFS & IndexedDB via `oracle.vault.createEntity` for canonical entities.

- **UI & Design Tokens**:
  - Tailwind 4 semantic tokens: `text-theme-primary`, `text-theme-secondary`, `bg-theme-surface`, `border-theme-border`, `hover:bg-theme-primary/10`, `text-theme-danger`.
  - Iconify syntax: `class="icon-[lucide--check-check] h-4 w-4"`, `class="icon-[lucide--sparkles] h-4 w-4"`, `class="icon-[lucide--chevron-down] h-4 w-4"`, `class="icon-[lucide--x] h-4 w-4"`. (Never `lucide-svelte`).

### Key Technical Decisions & Tradeoffs

- **Sequential Entity Creation vs. Low-Level Batch Injection**:
  - _Decision_: Orchestrate promotion through `oracle.vault.createEntity` (either sequentially in a loop or with handled promises) rather than direct unindexed file writes.
  - _Rationale_: `createEntity` automatically applies default category stat sheets (`VaultEntityEditing`), schedules OPFS persistence, handles image localization queues, updates entity counts, and dispatches reactive vault events. It guarantees complete data integrity without bypassing vault lifecycle hooks.
- **Unified Filtering Utility**:
  - _Decision_: Centralise fact filtering in `batchFilterPromotableFacts` shared by `AdventureProvisionalFacts.svelte` and the auto-promote runner.
  - _Rationale_: Prevents drift between UI presentation and automated promotion logic regarding casing, whitespace trimming, GM secrets, and duplicate title matching.
- **Decoupled User Preference Store**:
  - _Decision_: Create `adventurePromotionSettings` following the pattern of `guided-mode.svelte.ts` with injectable `UIPersistence`.
  - _Rationale_: Enables fast, isolated unit tests without mocking DOM globals or SvelteKit route context.

### Failure, Edge & Cancellation Paths

- **Positive / Expected Path**:
  - Player discovers new NPCs or locations during play. In manual mode, clicking "Add all to Codex" creates canonical entities with provenance notes and removes them from the review list. In auto-promote mode, newly introduced player-visible facts are converted and saved immediately with a success notification.
- **Negative / Error Path**:
  - If a write fails during batch promotion (e.g. disk quota or OPFS error), the failing item reports an error message, successfully created items remain saved and marked as added, and uncreated items remain available in the review list for retry.
- **Cancellation / Edge Case**:
  - _Pre-existing Title Collision_: A provisional fact has the same title (e.g. "The Black Hound") as an existing Vault entity. It is excluded from the review list and skipped during batch/auto promotion, preventing duplicate entities.
  - _GM Secrets_: Secrets remain strictly hidden (`visibility === "gm-only"`). They are never eligible for promotion until an in-game reveal changes their visibility in a subsequent committed turn.
  - _Discarded Items_: Player clicks discard ("X") on a discovery. The item is added to `discardedIds` and omitted from review and auto-promotion, but remains intact in the adventure's persistent session history.

---

## 3. Tasks & Execution Sequence (When)

- [ ] **Task 1: Tests (TDD)** — Add failing unit tests covering:
  - `adventure-promotion-settings.test.ts`: test default state, persistence reading, toggling, and saving via `UIPersistence`.
  - `adventure-provisional-fact-creator.test.ts`: test `batchFilterPromotableFacts` for deduplication, whitespace trimming, case-insensitivity, and secret rejection.
  - `AdventureProvisionalFacts.test.ts`: test "Add all to Codex" button rendering, batch add click handler invocation, auto-promote toggle interaction, and loading state.
- [ ] **Task 2: Settings & Filter Logic** — Implement:
  - `apps/web/src/lib/stores/ui/persistence.ts`: add `ADVENTURE_AUTO_PROMOTE` storage key.
  - `apps/web/src/lib/stores/ui/adventure-promotion-settings.svelte.ts`: create reactive store with Svelte 5 runes.
  - `apps/web/src/lib/services/adventure/adventure-provisional-fact-creator.ts`: export `batchFilterPromotableFacts`.
- [ ] **Task 3: UI Integration in AdventureProvisionalFacts** — Implement:
  - Add "Add all to Codex" button in `AdventureProvisionalFacts.svelte` with `addingAll` state and loading indicator.
  - Add "Auto-promote discoveries to Codex" toggle switch.
  - Support `onAddAll` prop, falling back to looping `onAdd`.
- [ ] **Task 4: Surface Wiring & Auto-Promote Loop** — Implement:
  - Update `AdventureFocusPlay.svelte` to accept and pass `onAddAll`.
  - In `AdventureSurface.svelte`, implement `addAllProvisionalFacts` with notification feedback.
  - Connect auto-promote effect to monitor newly introduced player-visible provisional facts and promote them automatically.
- [ ] **Task 5: Verification Gate** — Execute repository quality checks:
  - Run `bun run test:changed` and ensure all tests pass.
  - Run `bun run lint:changed` and ensure zero lint warnings or errors.
  - Run `bunx svelte-check --tsconfig apps/web/tsconfig.json --threshold error`.

---

## 4. Verification Gate

```bash
bun run test:changed
bun run lint:changed
bunx svelte-check --tsconfig apps/web/tsconfig.json --threshold error
```
