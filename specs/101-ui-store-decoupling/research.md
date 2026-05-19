# Research: UI Store Decoupling

## Decision: Facade-Then-Extract Migration

**Rationale**: The same pattern has now worked three times in a row (Specs 098, 099, 100). Consumers keep importing `uiStore` until every field has moved out; the facade is a delegating shim that's deleted at the end. This makes every intermediate state ship-able and keeps the 147-file import sweep as the last, mechanical step.

**Alternatives considered**:

- **Big-bang migration**: rewrite every import in one PR. Rejected — too large to review, blocks all other work for the duration, can't be partially rolled back.
- **Adapter classes** that wrap the new stores inside `UIStore` indefinitely: rejected because we explicitly want the facade _gone_ at the end — keeping it permanently re-introduces the grab-bag.

## Decision: Centralized `UIPersistence` Helper

**Rationale**: Today, 57 `localStorage` / `matchMedia` / `window.*` calls are scattered throughout `UIStore`, with bespoke parse logic per key. Centralizing these in one helper:

1. Removes the need for tests to stub `window.localStorage` globally (each store can inject an in-memory persistence in its constructor).
2. Provides one place to enforce SSR safety (`typeof window === "undefined"` checks).
3. Locks in all key names, preventing a future migration from accidentally renaming a key and orphaning user state.
4. Gives a single audit point for "what does this app persist to localStorage."

**Implementation Details**:

- `UIPersistence.read<T>(key: string, parse: (raw: string | null) => T, fallback: T): T` — returns `fallback` on missing or parse failure; logs warning on parse failure.
- `UIPersistence.write<T>(key: string, value: T, serialize?: (v: T) => string): void` — uses `JSON.stringify` by default.
- `UIPersistence.remove(key: string): void` — for "reset onboarding" type flows.
- Constructor accepts `{ storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> }` for test injection.

## Decision: No Cross-Store Imports

**Rationale**: If any new store imports another, we've just rebuilt the grab-bag with more files. Cross-cutting flows (e.g., the current `focusEntity` method that opens the sidebar + sets focus + closes the mobile sidebar) must be composed at the consumer or in a small dedicated helper module — not inside any single store.

**Enforcement**: an ESLint rule restricting `stores/ui/*` from importing `stores/ui/*`. If we don't add a lint rule, the code reviewer enforces it via CODEOWNERS or PR checklist.

**Consequence**: `focusEntity` becomes a function that lives outside the layout store (or accepts the layout store explicitly) — TBD in `data-model.md`.

## Decision: `notify` / `confirm` Stay on a Store (Not a Helper Module)

**Rationale**: Several architectural patterns suggest extracting these as free-function helpers (`notify(...)`, `confirm({...})`) backed by a hidden singleton. That's appealing but out of scope for this spec:

- Today they live on `UIStore` and consumers expect a stateful object they can read (`uiStore.notification`, `uiStore.confirmationDialog`).
- Moving them to free functions is a separate API change that should be its own spec if pursued.
- This spec's contract is "split, don't redesign."

**Future option**: after this spec ships, a follow-up could expose `useNotify()` / `useConfirm()` helpers that call into the store but hide the import.

## Decision: Phase Ordering Starts with Notification

**Rationale**: `notify` (64 sites) + `confirm` (35 sites) is the highest-traffic surface in the file. Proving the facade pattern works there means every subsequent phase is lower-risk by definition. Conversely, starting with `LayoutUIStore` (largest piece) would be high-risk before we've practiced the pattern on this codebase.

## Decision: Persist Phase Ordering Even If Stores Are Independent

Phases 4 and 6 each bundle multiple independent stores (e.g., `OnboardingStore` + `SessionModeStore` in Phase 4). Bundling minimizes facade churn — each store added means one round of facade edits + one round of test updates. Two small stores in one phase = one round of facade edits instead of two.

**Constraint**: bundled stores in a phase MUST be independently mergeable as separate commits within the same PR (or as separate PRs in the same phase). If a reviewer wants them split, they can be.

## Decision: Reactive Implementation Stays on `$state`

**Rationale**: The codebase has converged on Svelte 5 Runes. Migrating to writable stores or external libraries (Nanostores, Pinia, etc.) during this refactor would conflate two concerns. Keep `$state` everywhere; the _split_ is the refactor.

## Decision: Codemod is Phase 8, not Continuous

**Rationale**: Each phase ships behind the facade, so consumer imports never need to change mid-flight. Sweeping imports is reserved for the final phase, when every slice has already moved and the rename is purely mechanical (`uiStore.notify` → `notificationStore.notify` per a static map). Running the codemod earlier risks rewriting against an unstable target.

**Tooling**: `ts-morph` is preferred over `jscodeshift` because the project is already TS-native and ts-morph preserves comments and formatting better. The codemod script lives in `scripts/` (not shipped to consumers) and is invoked once.

## Open Questions (To Resolve in `/speckit.clarify`)

1. Is there appetite to also extract `useNotify()` / `useConfirm()` as a follow-up spec, or is that out of scope permanently?
2. Should the `window.uiStore` debug registration be replaced with `window.codexUI = { … }` (a frozen object exposing every per-feature store), or removed entirely?
3. Should `focusEntity` become a free function (`navigation.ts`) or land on a new `NavigationStore`? Current preference: free function, but flag for review.
