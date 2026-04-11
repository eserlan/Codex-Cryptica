# Refactoring Proposal: FrontPage Component Deconstruction

The `FrontPage.svelte` component has grown into a multi-purpose component that mixes rendering, async orchestration, persistence, and AI-specific logic. This proposal keeps the original direction, but sharpens the architecture so the refactor improves testability and maintainability instead of just moving code into smaller files.

## 1. Current State & Problems

### 1.1 Responsibilities

- **Layout orchestration:** Grid structure, shell, hero layers, and section composition.
- **Async orchestration:** Loading world data, resolving cover image URLs, and guarding stale async updates.
- **AI prompt engineering:** Constructing prompts for Cover Image and World Briefing generation.
- **Context retrieval:** Gathering retrieved world context and frontpage-tagged entity excerpts for AI calls.
- **Data partitioning:** Sorting and pinning `frontpage`-tagged entities ahead of other recent entities.
- **Interactive editors:** Full implementation of both the Cover Image editor and the World Briefing editor.
- **Persistent storage:** Direct `localStorage` access for front-page-specific settings such as the Recent Limit.

### 1.2 Identified Problems

1. **Mixing of concerns:** UI rendering, pure data transformation, async service coordination, and storage concerns are tightly coupled.
2. **Reduced readability:** The file obscures layout intent because the component script contains orchestration and prompt logic that is unrelated to markup structure.
3. **Untestable logic:** Prompt construction, entity pinning, truncation, and persistence rules are harder to test because they live inside a Svelte component.
4. **Effect-heavy state management:** Several state transitions are coordinated through `$effect`, which increases coupling and makes behavior harder to reason about.
5. **Bloated template:** The template contains multiple large conditional branches for editors, loading states, and preview modes.
6. **Duplicated `isFrontpageEntity` logic:** The same pinning check appears twice — once inline inside `displayedRecentActivity` (lines ~70–89) and again as a standalone function (line ~213). Changes to pinning rules must be applied in two places.
7. **Inconsistent prompt construction:** `createWorldCoverPrompt` is a named helper function, but `handleGenerateBriefing` builds its prompt inline as a template literal. Both should follow the same pattern for testability and maintainability.
8. **Swallowed errors in AI operations:** `handleGenerateCover` uses a bare `catch {}` that discards errors silently. Users get no feedback if cover generation fails.
9. **Fragile hover-to-expand UX:** The briefing preview uses an 800ms timer to trigger expansion on hover, which does not work on touch devices and introduces timer state complexity (`briefingHoverTimer`, `clearBriefingHoverTimer`, `beginBriefingPreviewHover`, `endBriefingPreviewHover`).
10. **Compound `$effect` at lines 170–179:** A single effect body handles three unrelated concerns — syncing `draftDescription` from its source, resetting `isDraftDirty`, and deciding the initial `showCoverEditor` state from `coverImage`. Any engineer reading it must untangle all three interactions to reason about any one. These should be separate effects or derived values.
11. **Silent error swallowing in `buildRetrievedWorldContext`:** The bare `catch { return ""; }` at line 308 silently degrades context quality with no user or dev signal. This is arguably more harmful than the cover-generation catch because bad context produces subtly wrong AI output rather than a visible failure.
12. **Broken deduplication in `buildRetrievedWorldContext`:** The `new Set([...retrievedParts, frontpageContext])` on line 304 uses reference equality on strings. The two retrieval queries can return overlapping text, and Set membership will not collapse them. A concrete deduplication strategy — by source ID, by content hash, or by normalized prefix — needs to be decided before this code is moved into a module.
13. **Untested `briefingSource` fallback chain:** The `$derived` at lines 53–58 encodes business logic — `metadata.description → frontPageEntity.chronicle → frontPageEntity.content` — that determines which source of truth wins for the briefing. This is untestable in its current form and belongs in `front-page-entities.ts` alongside the other entity/content helpers.
14. **God-test in `FrontPage.test.ts`:** The `renders world metadata, content, and cards` test is ~140 lines long and exercises cover generation, lightbox, briefing edit/cancel, and card rendering in a single sequence. A failure anywhere requires reading the entire chain to diagnose. This should be split into focused `it`-blocks before the refactor begins.
15. **Tests assert CSS class names:** The hover-expansion tests check for `max-h-[14rem]` and `max-h-[48rem]` class presence. These will fail for the wrong reason when the explicit toggle replaces the hover timer. They should instead assert on behavioral state (is content visually truncated / is an expand affordance present).

---

## 2. Refactoring Goals

- Make prompt construction and entity/context logic unit-testable with Vitest.
- Reduce `FrontPage.svelte` to a thin orchestrator that composes focused UI sections.
- Isolate async coordination from rendering so the component is easier to reason about.
- Centralize front-page persistence rules in a small dedicated module.
- Deduplicate `isFrontpageEntity` into a single pure function shared across all pinning logic.
- Standardize all prompt construction through named, testable helper functions.
- Improve alignment with the constitution's emphasis on testability, DI, and clean separation of concerns.
- **Enable Dependency Injection:** Design the orchestration layer to accept explicit dependencies for easier unit testing of generation flows.
- **Conditional Granular Loading States:** Separate "Briefing" and "Entities" readiness only if the existing store layer can expose those states cleanly without introducing artificial complexity.
- **Enhanced Accessibility (A11y):** Ensure all new interactive components (modals, expansion toggles, lightboxes) use proper `aria-*` attributes.

---

## 3. Proposed Architecture

### 3.1 Pure Helper Modules

Create a small `front-page/` module area for pure logic:

- **`front-page-prompts.ts`**
  - `createWorldCoverPrompt` (existing — move from component)
  - `createWorldBriefingPrompt` (new — extract inline prompt from `handleGenerateBriefing`)
  - Both functions should accept the same shape of input and produce deterministic strings
- **`front-page-entities.ts`**
  - `isFrontpageEntity(entity)` — single source of truth, deduplicates the two current implementations
  - `partitionAndSortRecentActivity(activities, limit)` — pinning, sorting, and slicing logic
  - `buildFrontpageEntityContext(entities)` — truncation and context assembly helpers
  - `resolveBriefingSource(metadata, frontPageEntity)` — the fallback chain `metadata.description → frontPageEntity.chronicle → frontPageEntity.content` is business logic that currently lives as an anonymous `$derived` in the component; extracting it makes the priority rule explicit and testable
  - `FRONTPAGE_CONTEXT_MAX_CHARS` and `FRONTPAGE_ENTITY_SNIPPET_MAX_CHARS` constants (or import from `front-page-constants.ts`)
- **`front-page-prefs.ts`**
  - `getRecentLimitStorageKey(vaultId)` — single storage key source
  - `clampRecentLimit(value)` — clamping to [1, 24]
  - `readRecentLimit(vaultId)` and `persistRecentLimit(vaultId, limit)` — browser-guarded read/write
- **`front-page-constants.ts`**
  - context and truncation limits
  - default recent limit value

**Why:** These functions are deterministic and should be tested as plain TypeScript logic without mounting Svelte.

### 3.2 Async Orchestration Layer

Create a non-Svelte orchestration module:

- **`front-page-context.ts`**
  - build retrieved world context
  - gather `frontpage` entity content
  - dedupe retrieved sections by source ID — the current `new Set()` approach uses reference equality on strings and will not collapse overlapping content returned by the two retrieval queries; the deduplication strategy must be explicit (source ID set or content fingerprint)
- **`front-page-controller.ts`**
  - coordinate AI generation flows (briefing and cover)
  - resolve cover image URLs
  - encapsulate async guard/stale-request handling

This layer should accept dependencies through a defined interface rather than directly importing global stores. The implementation can be a plain factory function or a rune-based class (using `$state` fields) — either integrates naturally with Svelte 5 reactivity. A plain ES class without runes does not compose cleanly with the reactive graph and should be avoided. Dependency injection matters here; the specific wrapper shape does not.

```typescript
interface FrontPageControllerDeps {
  worldStore: typeof worldStore;
  vault: typeof vault;
  themeStore: typeof themeStore;
  uiStore: typeof uiStore;
  contextRetrievalService: typeof contextRetrievalService;
}

class FrontPageController {
  constructor(private deps: FrontPageControllerDeps) {}
  async generateBriefing(): Promise<void> { ... }
  async generateCover(): Promise<void> { ... }
  async loadWorld(vaultId: string, recentLimit: number): Promise<void> { ... }
}
```

**Why:** The main complexity in the current component is not only pure helpers. It is also the orchestration around loading, retrieval, generation, and persistence. That logic should be separated from markup. Explicit dependency interfaces also enable testing with mocked stores.

### 3.3 Focused UI Components

Extract larger coherent UI sections instead of tiny fragments. All children communicate with the parent through **callback props** (Svelte 5 convention: `onSave: () => void`) rather than `createEventDispatcher`.

- **`FrontPageBriefing.svelte`**
  - renders briefing preview and edit mode
  - owns save/cancel/generate actions
  - manages expansion behavior (replace hover-timer with explicit toggle)
  - receives `draftDescription`, `isEditingBriefing`, `isDraftDirty` as props
  - callback props: `onSave`, `onCancel`, `onGenerate`, `onEdit`
  - **A11y:** Includes `aria-expanded` on the expansion toggle. Focus the textarea after expanding into edit mode.
  - **Focus management:** Auto-focus the briefing textarea when entering edit mode; restore focus to the toggle button on cancel.
- **`FrontPageEntities.svelte`**
  - renders relevant entities section
  - owns recent-limit UI (inline editing, clamping, persistence)
  - renders loading, empty, and card-grid states
  - receives `displayedRecentActivity`, `recentLimit`, `isLoading` as props
  - callback props: `onRecentLimitChange`
  - **Granularity:** Can manage its own loading state independently from the briefing if the underlying store/orchestration layer exposes separate readiness cleanly.
  - **Performance boundary:** `displayedRecentActivity` stays computed in the parent (`FrontPage.svelte`) and is passed down. The child does not recompute pinning/sorting on its own.
- **`FrontPageHero.svelte`**
  - renders hero image/background
  - hosts top-level image/lightbox controls
  - wraps the existing `CoverImage.svelte` component (does not replace it) — `CoverImage.svelte` provides the drop/generate editor surface; `FrontPageHero` handles the background display, lightbox, and action button layout
  - receives `coverImageUrl`, `coverImage`, `showCoverEditor` as props
  - callback props: `onGenerateCover`, `onUploadCover`, `onOpenCoverEditor`, `onOpenLightbox`
  - **Styling:** Uses utility classes and theme CSS variables directly. No `@apply` — follows the constitution's Tailwind 4 guidance (prefer utility classes over `@apply`).

**Why:** These sections map to real feature boundaries and reduce the size of the parent component more effectively than extracting a very small header-only component. Each component owns its local state and communicates with the parent through explicit props and callback props.

### 3.4 `FrontPage.svelte` as Orchestrator

After extraction, `FrontPage.svelte` should primarily:

- derive top-level inputs from stores
- connect controller actions to child components
- compose `FrontPageHero`, `FrontPageEntities`, and `FrontPageBriefing`
- render shell-level loading and error states

The end state should be a much smaller component whose structure reflects the visual layout.

### 3.5 State Ownership

To avoid simply redistributing the current complexity, state ownership should stay explicit:

- **Keep in `FrontPage.svelte`:**
  - top-level shell readiness and error presentation
  - shared orchestration dependencies and actions
  - cross-section state that affects more than one child
- **Keep in `FrontPageBriefing.svelte`:**
  - edit-mode UI state
  - local expansion state
  - textarea sizing behavior
- **Keep in `FrontPageEntities.svelte`:**
  - recent-limit input/editing state
  - entity-section display state
- **Keep in `FrontPageHero.svelte`:**
  - lightbox/editor visibility state only if it is no longer needed by siblings

The main rule: shared business logic stays in helpers/orchestration, local interaction state stays with the component that renders it.

### 3.6 Non-Goals

This refactor should stay focused. It should not:

- redesign `EntityCard`
- move world-store business rules into front-page components
- introduce a generic controller framework for unrelated features
- move front-page logic into a workspace package as part of the initial extraction
- force granular loading states if the store layer does not support them naturally

---

## 4. Testing Strategy

This refactor should start by preserving behavior with tests before moving code.

### 4.1 Add or Expand Component Tests

Lock down current behavior in `FrontPage.test.ts`:

- `frontpage` tags and labels both pin entities
- pinned entities render ahead of unpinned entities
- recent limit is read and written per vault
- existing briefing regeneration requests confirmation
- cover image lightbox and editor flows remain intact

**Before adding tests, split the existing god-test.** The `renders world metadata, content, and cards` test (~140 lines) exercises cover generation, lightbox, briefing edit/cancel, and card rendering in a single sequence. A single assertion failure requires reading the entire chain to diagnose. Break it into focused `it`-blocks as part of this phase.

**Also replace CSS class assertions** in the hover-expansion test. The existing assertions check for `max-h-[14rem]` and `max-h-[48rem]` class presence. These will fail for the wrong reason when the explicit expand toggle replaces the hover timer. Replace with behavioral assertions (e.g. presence of an expand button, `aria-expanded` state, or whether overflow content is reachable).

### 4.2 Add New Unit Tests For Extracted Helpers

Add focused Vitest coverage for:

- `isFrontpageEntity` deduplication — single function handles both tags and labels
- `resolveBriefingSource` priority — `metadata.description` wins over `frontPageEntity.chronicle` wins over `frontPageEntity.content`; each fallback is exercised
- recent-limit clamping and storage-key generation
- recent entity pinning/sorting behavior (pinned first, then by lastModified)
- prompt fallback behavior for missing world name, briefing, or retrieved context
- `createWorldBriefingPrompt` output matches current inline template behavior
- frontpage entity context truncation and omission suffixes
- deduplication of retrieved context segments — tests must pin the chosen deduplication strategy (source ID vs content fingerprint) so there is no ambiguity about what "deduplicated" means

### 4.3 Add Controller Tests

Test the orchestration layer with mocked stores:

- `generateBriefing` asks for confirmation when a briefing already exists
- `generateBriefing` calls `worldStore.generateBriefing` with the correct prompt
- `generateCover` calls `worldStore.generateCoverImage` with the correct prompt
- `loadWorld` guards against stale concurrent calls
- error propagation when AI generation fails (no silent swallowing)
- failed briefing generation preserves the current draft/editing state correctly
- failed cover generation surfaces user-visible feedback

This is the highest-value part of the refactor because it turns hidden component logic into directly verifiable behavior.

---

## 5. Benefits of This Version of the Refactor

- **Maintainability:** Prompt and entity logic live in dedicated modules with clear ownership.
- **Testability:** Pure logic and orchestration paths can be verified without mounting the full component.
- **Svelte clarity:** `FrontPage.svelte` becomes a composition layer instead of a mixed UI-and-business-logic file.
- **Safer iteration:** Future prompt tuning or entity-ranking changes can happen with focused tests.
- **Better state boundaries:** Smaller components provide clearer reactivity boundaries and reduce effect sprawl.

---

## 6. Recommended File Layout

```text
apps/web/src/lib/components/world/
  FrontPage.svelte
  FrontPageBriefing.svelte
  FrontPageEntities.svelte
  FrontPageHero.svelte
  front-page/
    front-page-constants.ts
    front-page-prompts.ts
    front-page-entities.ts
    front-page-prefs.ts
    front-page-context.ts
    front-page-controller.ts
```

---

## 7. Implementation Steps

1. **Lock behavior with tests.** Expand `FrontPage.test.ts` to preserve current UI and interaction behavior before moving code.
2. **Extract pure helpers.** Move prompt construction, entity pinning/sorting, truncation rules, and persistence helpers into the `front-page/` modules and add unit tests.
   - **Deduplicate `isFrontpageEntity`** — replace both implementations with a single call to `front-page-entities.ts`.
   - **Extract `createWorldBriefingPrompt`** — bring briefing prompt construction to parity with cover prompt (named, testable function).
3. **Verify checkpoint.** Run all existing `FrontPage.test.ts` tests to confirm behavior is preserved after helper extraction. If any test fails, fix before proceeding.
4. **Refactor `FrontPage.svelte` to consume helpers.** Keep the UI intact initially while removing embedded logic from the component. Replace inline prompt construction with helper calls.
5. **Add proper error handling for AI operations.** Replace the bare `catch {}` in `handleGenerateCover` with user-visible error feedback (e.g., set `worldStore.error` or surface through `uiStore`).
6. **Extract `FrontPageBriefing.svelte`.** Move briefing preview, editing, and generation UI into a dedicated section component. Replace hover-timer expansion with an explicit expand/collapse button.
   - **Verify:** Run component tests. Confirm briefing edit/save/cancel/generate flows still pass.
7. **Extract `FrontPageEntities.svelte`.** Move recent-entity rendering and recent-limit controls into a dedicated section component.
   - **Verify:** Run component tests. Confirm pinning, recent-limit editing, and card rendering still pass.
8. **Extract `FrontPageHero.svelte`.** Move cover-image display, lightbox, and hero actions into a dedicated section component.
   - **Verify:** Run component tests. Confirm cover generation, upload, and lightbox flows still pass.
9. **Introduce orchestration modules where needed.** Move retrieved-context and generation coordination into injected orchestration modules once the helper layer is stable.
10. **Decide on loading granularity deliberately.** Only split readiness between sections if the store/orchestration layer supports it cleanly; otherwise keep the current shared gate for this refactor.
11. **Run final verification.** Re-run component tests, helper tests, controller tests, and Svelte checks/autofixer.

---

## 8. Additional Improvement Opportunities

### 8.1 High Priority (include in this refactor)

- **Replace hover-only briefing expansion** with a clearer explicit expand/collapse affordance that works better on touch devices and removes timer state complexity.
- **Reduce state mutation inside `$effect`** where a pure derived value or an event-driven transition is sufficient. In particular:
  - The compound `$effect` at lines 170–179 handles three unrelated concerns in one body (draft sync, dirty-flag reset, cover-editor initial state). Split into separate effects or `$derived` values before extracting child components, or the coupling travels with the code.
  - Replace the textarea auto-resize `$effect` with a callback triggered after entering edit mode or a Svelte action.
- **Isolate `localStorage` access** to the `front-page-prefs.ts` module so browser-only guards do not spread through the component.
- **Add user-visible error feedback** for AI operations instead of silently swallowing errors in bare `catch {}` blocks. This applies to both `handleGenerateCover` (line 404) and `buildRetrievedWorldContext` (line 308) — the context-retrieval catch is arguably more harmful because degraded context produces subtly wrong AI output rather than a visible failure.

### 8.2 Medium Priority (consider during this refactor)

- **Standardize the stale-request guard pattern only if duplication remains after extraction.** Do not invent a reusable abstraction prematurely; first extract the existing logic and see whether a helper is still justified.
- **Consider vault preferences system.** If a centralized vault preferences system exists, use it instead of raw `localStorage` for the recent limit setting.

### 8.3 Low Priority (follow-up)

- **Move non-UI logic to a workspace package** if front-page logic continues to grow. This is a follow-up step rather than part of the initial refactor.
- **Audit `$effect` usage** across extracted components to ensure each component has clear, minimal reactivity boundaries.

---

## 9. Ordered Task Checklist

This is the granular execution checklist. Each task maps onto the phases in Section 7. Use this as a working checklist during implementation.

**Phase: Lock behavior (Step 1)**

- [ ] 1a. Split the god-test (`renders world metadata, content, and cards`) into focused `it`-blocks before adding new coverage
- [ ] 1b. Replace CSS class assertions in the hover-expansion test with behavioral assertions (`aria-expanded`, expand button presence)
- [ ] 1c. Add tests for `frontpage` tag-based and label-based pinning
- [ ] 1d. Add tests for recent-limit read/write per vault
- [ ] 1e. Add tests for briefing regeneration confirmation
- [ ] 1f. Add tests for cover generation failure feedback (missing error handling)

**Phase: Extract helpers (Steps 2–4)**

- [ ] 2a. Create `front-page-constants.ts` with truncation limits and default recent limit
- [ ] 2b. Create `front-page-prefs.ts` with tests for clamping, storage keys, and browser guards
- [ ] 2c. Create `front-page-entities.ts` with single `isFrontpageEntity` and `resolveBriefingSource`; tests for pinning, sorting, slicing, truncation, omission, and briefing-source priority
- [ ] 2d. Create `front-page-prompts.ts` with `createWorldCoverPrompt` and `createWorldBriefingPrompt`, plus string assertions for fallback behavior
- [ ] 3. Refactor `FrontPage.svelte` to consume helpers; run tests (checkpoint)
- [ ] 4. Remove duplicated pinning logic; verify tests pass

**Phase: Error handling (Step 5)**

- [ ] 5a. Replace bare `catch {}` in `handleGenerateCover` with explicit user-visible error handling; add regression test
- [ ] 5b. Replace bare `catch { return ""; }` in `buildRetrievedWorldContext` with explicit error surfacing (log + empty fallback with a dev warning at minimum); add test that a retrieval failure does not silently corrupt context

**Phase: Extract context/orchestration (Steps 8–9)**

- [ ] 6a. Decide deduplication strategy for retrieved context (source ID set vs content fingerprint); document the decision in `front-page-context.ts` and encode it in tests before extracting the logic
- [ ] 6b. Extract retrieved-context logic into `front-page-context.ts`; test deduplication and truncation using the strategy decided in 6a
- [ ] 6c. Introduce injected orchestration layer (factory function or rune-based class — not a plain ES class) for briefing generation, cover generation, cover URL resolution, and guarded loading; test with mocked dependencies
- [ ] 6d. Split the compound `$effect` at lines 170–179 into separate effects/derivations for draft sync, dirty-flag reset, and cover-editor initial state; confirm tests still pass

**Phase: Extract UI components (Steps 6–8)**

- [ ] 7a. Extract `FrontPageBriefing.svelte`; keep briefing-local UI state in the child; replace hover-timer with explicit toggle; add focus management
- [ ] 7b. Run component tests after Briefing extraction (verify checkpoint)
- [ ] 8a. Extract `FrontPageEntities.svelte`; keep recent-limit editing state local; leave `displayedRecentActivity` computation in parent
- [ ] 8b. Run component tests after Entities extraction (verify checkpoint)
- [ ] 9a. Extract `FrontPageHero.svelte`; wrap existing `CoverImage.svelte` (do not replace); use utility classes, no `@apply`
- [ ] 9b. Run component tests after Hero extraction (verify checkpoint)

**Phase: Finalize (Steps 10–11)**

- [ ] 10. Reassess loading granularity. If separate readiness states can be exposed cleanly, split them; otherwise document why the shared loading gate remains.
- [ ] 11. Run full verification pass: helper tests, controller tests, component tests, Svelte autofixer/checks
