# Feature Specification: UI Store Decoupling

**Feature Branch**: `101-ui-store-decoupling`
**Created**: 2026-05-19
**Status**: Implemented
**Input**: Analysis of `apps/web/src/lib/stores/ui.svelte.ts` (872 lines) per `docs/UI_STORE_ANALYSIS.md`. Applies the same facade-then-extract pattern used in Specs 098 (host service), 099 (map session), and 100 (guest service).

## Clarifications

### Session 2026-05-19

Working assumptions (subject to clarification):

- All existing `localStorage` keys (`codex-cryptica-active-theme`, `codex_vtt_sidebar_collapsed`, `codex_entity_discovery_mode`, etc.) **MUST** be preserved verbatim; renaming any key would orphan user state on update.
- The `notify`/`confirm` surfaces remain accessible via `uiStore.notify(...)` / `uiStore.confirm(...)` throughout the migration; a separate helper module (e.g., `useNotify`) is **out of scope** for this spec and may be considered as a follow-up.
- Svelte 5 `$state`-based reactivity continues to be the implementation choice; no migration to writable stores or external state libraries.
- The eventual codemod sweep of the 147 importers may be applied automatically (ts-morph / jscodeshift), but each consumer file MUST compile and pass lint after the sweep.

Confirmed:

- Q: One spec or many? → A: Single spec covering all eight extractions + facade drop (one user story per store).
- Q: Should the facade be removed at the end? → A: Yes. The facade is a migration aid; the spec is not complete until `ui.svelte.ts` is gone and `uiStore.*` references are migrated.
- Q: Cross-store dependencies allowed? → A: No. Each new store MUST be importable in isolation. Cross-cutting flows compose stores at the consumer level.
- Q: Persistence helper required? → A: Yes. A typed `UIPersistence` module MUST own every `localStorage` read/write; new stores MUST NOT touch `localStorage` or `window` directly.

## User Scenarios & Testing

### User Story 1 - Notification Store Extraction (Priority: P1) 🎯 MVP

As a developer, I want toast notifications, global error state, and the global `confirm()` shim to live in a dedicated `NotificationStore` so that the ~100 call sites of `uiStore.notify` / `uiStore.confirm` no longer pull in the entire UI grab-bag.

**Why this priority**: highest-traffic surface (64 + 35 = 99 daily call sites). Proving the facade pattern here de-risks every subsequent extraction.

**Independent Test**: Replace `uiStore.notify(...)` internals with a delegating call to `notificationStore.notify(...)`; verify all 64 existing call sites continue to display toasts with unchanged timing/dismiss behavior, and that `confirm()` still returns a resolved boolean.

**Acceptance Scenarios**:

1. **Given** a component calls `uiStore.notify("hello")`, **When** the facade is in place, **Then** the toast renders identically to today and dismisses on the same timeout.
2. **Given** a component calls `uiStore.confirm({ title, message })`, **When** the user accepts, **Then** the promise resolves `true` with the same shape as the legacy implementation.
3. **Given** `uiStore.setGlobalError("boom")` is called, **When** read back via `uiStore.globalError`, **Then** the value is identical to today.
4. **Given** an active notification timeout, **When** `uiStore.clearNotification()` is called, **Then** the timeout is cancelled (no leak).

---

### User Story 2 - Small Self-Contained Stores (Priority: P2)

As a developer, I want `OnboardingStore` and `SessionModeStore` extracted next so that the smallest, lowest-coupling slices land before tackling larger ones.

**Why this priority**: ~5 importers each, near-zero cross-coupling; provides early wins and exercises the facade pattern on smaller surfaces before the harder pieces.

**Independent Test**: After each extraction, the landing page, world page, welcome screen, guest mode flag, and demo mode flag continue to behave identically with no consumer changes.

**Acceptance Scenarios**:

1. **Given** a user dismisses the landing page, **When** the page reloads, **Then** the dismissal persists via the same `localStorage` key as today.
2. **Given** a user joins as a guest, **When** `uiStore.guestUsername` is read by 53 existing call sites, **Then** they observe the same value the new `sessionModeStore.guestUsername` produces.
3. **Given** the changelog version is marked seen, **When** `uiStore.lastSeenVersion` is queried, **Then** the persisted value matches the new store.

---

### User Story 3 - Modal & Dialog Store (Priority: P2)

As a developer, I want all modal/dialog state (settings, dice, canvas selector, merge dialog, bulk label, lightbox, read-mode, zen-mode) extracted into a focused `ModalUIStore` so that modal open/close semantics live in one place.

**Why this priority**: bounded surface; opening/closing modals does not intersect other concerns. Touches ~20 importers.

**Independent Test**: Each modal can still be opened/closed via the existing `uiStore.openSettings(...)` / `closeSettings()` API, and lightbox/zen-mode payloads round-trip correctly.

**Acceptance Scenarios**:

1. **Given** a call to `uiStore.openSettings("appearance")`, **When** the modal opens, **Then** `uiStore.activeSettingsTab === "appearance"` and `uiStore.showSettings === true`.
2. **Given** a confirmation dialog is open, **When** `uiStore.resolveConfirmation(true)` is called, **Then** the original promise resolves and the dialog closes.
3. **Given** an image is shown via `uiStore.openLightbox(url, title)`, **When** the lightbox is closed, **Then** the lightbox state resets to its initial shape.

---

### User Story 4 - Discovery, Connection, and Explorer Stores (Priority: P3)

As a developer, I want `DiscoveryPolicyStore`, `ConnectionModeStore`, and `ExplorerUIStore` extracted so that feature-specific UI state stops piggybacking on the global grab-bag.

**Why this priority**: each is self-contained but cuts across several files; bundling reduces facade churn.

**Independent Test**: Per-feature surfaces continue working — discovery mode toggles persist, the connect-mode flow can be started/aborted, and explorer label filters round-trip across reloads.

**Acceptance Scenarios**:

1. **Given** the user changes entity discovery mode to `"auto"`, **When** the app restarts, **Then** the new store reads back `"auto"` from the same `localStorage` key.
2. **Given** `uiStore.toggleConnectMode()` is called and then `uiStore.abortActiveOperations()`, **Then** the `AbortController` signal is aborted and no listeners remain.
3. **Given** the user toggles a label filter in the explorer, **When** the page reloads, **Then** the collapsed-label-group scope persists with the same key.

---

### User Story 5 - Layout / Sidebar Store (Priority: P3)

As a developer, I want all layout and sidebar state (open/closed, widths, active tool, mobile detection, VTT sidebar collapses) extracted into a dedicated `LayoutUIStore` so that the largest single slice of `ui.svelte.ts` lives in its own focused module.

**Why this priority**: largest piece; done last in the migration sequence to maximize practice with the pattern.

**Independent Test**: Resizing sidebars, toggling tools, and switching between mobile and desktop layouts all behave identically with no consumer changes.

**Acceptance Scenarios**:

1. **Given** `uiStore.setLeftSidebarWidth(320)`, **When** the page reloads, **Then** the persisted width is restored from the same `localStorage` key.
2. **Given** the viewport is resized to a mobile width, **When** `matchMedia` fires, **Then** `uiStore.isMobile` flips to `true` exactly as today.
3. **Given** the user toggles the VTT sidebar collapsed state, **When** read back, **Then** the value persists across reloads.
4. **Given** `uiStore.focusEntity("e1")` is called, **When** dispatched, **Then** the right sidebar opens, `focusedEntityId` is set, and (on mobile) the left sidebar closes — composed at the call site from `LayoutUIStore` primitives.

---

### User Story 6 - Facade Removal & Import Codemod (Priority: P4)

As a developer, I want the temporary `uiStore` facade removed and all 147 consumer imports rewritten to point at the per-feature stores so that consumers depend only on the slices they actually use.

**Why this priority**: this is the payoff phase; the facade is migration scaffolding, not a long-term API.

**Independent Test**: After the codemod runs, the project type-checks, the test suite passes, and no file outside the deleted `ui.svelte.ts` references `uiStore` anymore.

**Acceptance Scenarios**:

1. **Given** the codemod is run, **When** the project is type-checked, **Then** zero errors are reported and zero `uiStore` references remain.
2. **Given** the codemod is run, **When** the full Vitest suite executes, **Then** every previously-passing test still passes.
3. **Given** the facade file is deleted, **When** the project is built, **Then** the build succeeds with no broken imports.

---

### User Story 7 - Agent Operational Protocol (Priority: P4)

As a quality assurance engineer, I want the refactor to follow strict surgical guidelines so that no unrelated logic is touched and every phase is verified independently.

**Why this priority**: mandated by Constitution Rule XI; matches the protocol used in Specs 097–100.

**Acceptance Scenarios**:

1. **Given** a code change in any phase, **When** applied, **Then** it MUST be surgical, leave unrelated behavior untouched, and be verified with `pnpm test` before the next phase begins.

---

### Edge Cases

- **`localStorage` parse failure**: today the constructor silently catches per-key parse errors; the new `UIPersistence` helper MUST preserve this behavior — a corrupt key MUST NOT abort initialization of unrelated state.
- **Cross-store composition**: `focusEntity` today opens the sidebar, sets the focused entity, and on mobile closes the left sidebar. After the split, this composition lives at the consumer (or in a small navigation helper) — not in any individual store.
- **`vault` reverse dependency**: `openZenMode` currently reads `vault.isGuest` and the target entity to gate access. After the split, the vault MUST be the decision-maker (it either opens zen mode or returns a rejection); the UI store MUST NOT reach back into vault.
- **Confirmation promise leak**: if a confirmation dialog is cleared without `resolveConfirmation`, today's behavior leaves the promise pending forever. The new store MUST resolve any pending confirmation to `false` on `disconnect`/reset.
- **Notification timeout double-fire**: today, calling `notify` while a previous notification is still showing replaces it and cancels the old timeout. The new store MUST preserve this exact ordering.
- **Sidebar width persistence with invalid values**: a user manually editing `localStorage` to a negative width MUST be clamped to `MIN_LEFT_SIDEBAR_WIDTH` (already 240 today) — `UIPersistence` returns the parsed value, the store enforces the clamp.
- **`abortActiveOperations` mid-flight**: if no `AbortController` is active, the call MUST be a safe no-op (current behavior).

## Requirements

### Functional Requirements

- **FR-001**: System MUST partition `ui.svelte.ts` into the following focused stores, each owning a coherent UI slice:
  - **`LayoutUIStore`**: sidebar open/closed, widths, active tool, mobile detection, VTT sidebar collapses. (Note: navigation composition like `focusEntity` moves to a cross-store helper).
  - **`ModalUIStore`**: settings, dice, canvas selector, merge dialog, bulk label, lightbox, read-mode, zen-mode, confirmation dialog.
  - **`NotificationStore`**: `notify` / `clearNotification`, `globalError` / `setGlobalError` / `clearGlobalError`, `confirm` / `resolveConfirmation`.
  - **`ExplorerUIStore`**: explorer view mode, collapsed label groups (per vault), label filters.
  - **`DiscoveryPolicyStore`**: entity / connection discovery modes, AI-disabled flag, auto-archive, oracle automation policy, archive activity log.
  - **`ConnectionModeStore`**: modifier-pressed state, connecting state, connecting node id, abort controller lifecycle, label history, selection connector flag.
  - **`SessionModeStore`**: guest mode, guest username, shared mode, demo mode, active demo theme, conversion flags.
  - **`OnboardingStore`**: landing page dismissal, world page dismissal, welcome screen, last-seen version, changelog visibility.
- **FR-002**: System MUST provide a `UIPersistence` helper module that owns every `localStorage` read/write currently inline in `UIStore`. Helpers MUST be typed (e.g., `read<T>(key: string, parse: (raw: string) => T)`) and gracefully no-op when `typeof window === "undefined"`.
- **FR-003**: Every existing `localStorage` key MUST be preserved verbatim. Renaming or restructuring any key is out of scope.
- **FR-004**: During the migration, the existing `uiStore` export MUST remain a working facade that delegates every property and method to the new stores. No consumer file may break partway through the migration.
- **FR-005**: Each new store MUST be standalone — it MUST NOT import any other `stores/ui/*` module. Cross-store flows (e.g., `focusEntity` composing layout + navigation) MUST be implemented in a dedicated `navigation.ts` helper that imports the required stores.
- **FR-006**: Each new store MUST be unit-testable without stubbing `window` directly. The `UIPersistence` helper MUST be injectable so tests can pass an in-memory backing store.
- **FR-007**: After Phase 8 (facade removal), `ui.svelte.ts` MUST be deleted and every project file MUST import from a per-feature store. Zero `uiStore.*` references MUST remain.
- **FR-008**: The codemod MUST be applied automatically (or via documented manual steps) and the project MUST pass type-check, lint, and the full Vitest suite after the sweep.
- **FR-009**: System MUST follow the project DI mandate (Rule VIII): each new store's constructor MUST accept a `UIPersistence` implementation (defaulting to the real one).
- **FR-010**: The `notify` / `confirm` / `setGlobalError` APIs MUST remain wire-compatible — same method signatures, same return shapes, and identical timing behavior (matching the existing 5s/8s constants) — so that the ~100 call sites need no code change beyond their import path.
- **FR-011**: Each new store file MUST stay under **200 lines** (including types and JSDoc).
- **FR-012**: System MUST preserve the `window.uiStore` debug registration (if present today) until Phase 8; in Phase 8 it MUST be replaced with `window.codexUI = { layout: layoutUIStore, modal: modalUIStore, … }` or equivalent so debugging from DevTools remains possible.

### Key Entities

- **`UIPersistence`**: typed `localStorage` wrapper; owns key names; gracefully handles SSR (no `window`); injectable in tests.
- **`NotificationStore`**: toast queue + timeout, global error banner, confirmation-dialog promise resolver.
- **`OnboardingStore`**: persistent first-run flags + changelog gating.
- **`ModalUIStore`**: open/closed flags + payloads for every dialog and modal in the app.
- **`ExplorerUIStore`**: view mode + per-vault collapsed-group sets + active label filters.
- **`DiscoveryPolicyStore`**: AI behavior toggles and discovery mode selections.
- **`ConnectionModeStore`**: short-lived UI state for the in-progress connect/merge flows + abort controller.
- **`SessionModeStore`**: which session mode the app is in (guest / demo / shared / standard) and associated identity.
- **`LayoutUIStore`**: layout shell — sidebars, widths, tool selection, viewport detection, focus.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `ui.svelte.ts` line count reduced from 872 to **0** (file deleted) by end of Phase 8.
- **SC-002**: Each new store file ≤ **200 lines** including JSDoc.
- **SC-003**: Each new store has a dedicated unit test file with **≥ 90 % statement coverage** of its public API, using an in-memory `UIPersistence`.
- **SC-004**: After codemod sweep, **zero** `uiStore.*` references remain in any file other than the (deleted) facade.
- **SC-005**: After codemod sweep, the full Vitest suite (currently 1177 passing) passes with **zero regressions**.
- **SC-006**: Adding a new piece of UI state requires changes to **exactly one** store file and (if persisted) **one** entry in `UIPersistence` — no cross-store edits.
- **SC-007**: All 8 existing `localStorage` keys remain identical; verified by a migration test that asserts each key is read/written byte-for-byte the same.
- **SC-008**: Type-check completes with **0 errors** at every phase boundary (currently 0).
