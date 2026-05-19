# Implementation Tasks: UI Store Decoupling

## Dependencies

- **US1** (NotificationStore) → **None** (also defines the facade pattern; all later stories build on it)
- **US2** (Onboarding + SessionMode) → **US1**
- **US3** (ModalUIStore) → **US1**
- **US4** (Discovery + Connection + Explorer) → **US1**
- **US5** (LayoutUIStore) → **US1**
- **US6** (Facade removal + codemod) → **US1, US2, US3, US4, US5**

## Implementation Strategy

Each store extraction follows the same template: (a) implement the new store + tests against an in-memory `UIPersistence`, (b) wire the facade to delegate to it, (c) verify the full Vitest suite still passes. Only after all eight stores have moved does Phase 8 sweep imports and delete the facade.

## Phase 1: Setup

Goal: Initialize new module structure.

- [ ] T001 Create `apps/web/src/lib/stores/ui/` directory.
- [ ] T002 Enumerate every `localStorage` key, `matchMedia` call, and `window.*` reference in `ui.svelte.ts` and record them in `data-model.md` (verifies the locked key list is exhaustive).

## Phase 2: Foundational

Goal: Establish `UIPersistence` as the single point of persistence.

- [ ] T003 [P] Implement `UIPersistence` in `apps/web/src/lib/stores/ui/persistence.ts` with `read<T>`, `write<T>`, `remove` operations; SSR safe; injectable storage.
- [ ] T004 [P] Write unit tests for `UIPersistence` in `apps/web/src/lib/stores/ui/persistence.test.ts` covering missing key, parse failure, SSR no-op, injected backing store.

## Phase 3: Notification Store [US1] 🎯 MVP

Goal: Extract toasts, global error, and confirm dialog behind the facade.
Independent Test: Existing 64 `uiStore.notify` and 35 `uiStore.confirm` call sites continue to work without modification.

- [ ] T005 [US1] Implement `NotificationStore` in `apps/web/src/lib/stores/ui/notification.svelte.ts`.
- [ ] T006 [P] [US1] Unit tests for `NotificationStore` in `notification.test.ts` (notify, replace, clear, persistent, global error, confirm/resolve, pending-confirmation cleanup).
- [ ] T007 [US1] Wire the `UIStore` facade in `apps/web/src/lib/stores/ui.svelte.ts` to delegate notification-related state and methods to `NotificationStore` while leaving every other field unchanged.
- [ ] T008 [US1] Run `pnpm test` — ensure all 1177+ tests still pass; manual smoke test of toast rendering, dismiss timing, and confirm dialog.

## Phase 4: Onboarding + Session Mode [US2]

Goal: Extract two small slices that exercise the persistence helper.
Independent Test: Landing page dismissal persists; guest username round-trips across the 53 call sites.

- [ ] T009 [P] [US2] Implement `OnboardingStore` in `apps/web/src/lib/stores/ui/onboarding.svelte.ts`.
- [ ] T010 [P] [US2] Unit tests for `OnboardingStore` in `onboarding.test.ts`.
- [ ] T011 [P] [US2] Implement `SessionModeStore` in `apps/web/src/lib/stores/ui/session-mode.svelte.ts`.
- [ ] T012 [P] [US2] Unit tests for `SessionModeStore` in `session-mode.test.ts`.
- [ ] T013 [US2] Wire facade for both stores.
- [ ] T014 [US2] Run full test suite + manual smoke test.

## Phase 5: Modal UI Store [US3]

Goal: Extract every modal/dialog into a single focused store.
Independent Test: Each modal opens/closes via the existing public API with no consumer changes.

- [ ] T015 [US3] Implement `ModalUIStore` in `apps/web/src/lib/stores/ui/modal-ui.svelte.ts`.
- [ ] T016 [P] [US3] Unit tests for `ModalUIStore` in `modal-ui.test.ts` covering settings, lightbox, merge, bulk label, zen-mode, read-mode, dice, canvas selector, confirm-dialog open/close.
- [ ] T017 [US3] Wire facade.
- [ ] T018 [US3] Run full test suite + manual smoke test of each modal.

## Phase 6: Discovery + Connection + Explorer Stores [US4]

Goal: Extract feature-specific UI slices.
Independent Test: Discovery mode persists; connect-mode start/abort works; explorer label filters round-trip.

- [ ] T019 [P] [US4] Implement `DiscoveryPolicyStore` in `apps/web/src/lib/stores/ui/discovery-policy.svelte.ts`.
- [ ] T020 [P] [US4] Unit tests for `DiscoveryPolicyStore`.
- [ ] T021 [P] [US4] Implement `ConnectionModeStore` in `apps/web/src/lib/stores/ui/connection-mode.svelte.ts`.
- [ ] T022 [P] [US4] Unit tests for `ConnectionModeStore` (including `AbortController` lifecycle).
- [ ] T023 [P] [US4] Implement `ExplorerUIStore` in `apps/web/src/lib/stores/ui/explorer-ui.svelte.ts`.
- [ ] T024 [P] [US4] Unit tests for `ExplorerUIStore`.
- [ ] T025 [US4] Wire facade for all three stores.
- [ ] T026 [US4] Run full test suite.

## Phase 7: Layout UI Store [US5]

Goal: Extract the largest single piece — sidebars, widths, mobile detection, focus.
Independent Test: Sidebar resize persists; mobile detection fires on viewport change; focus flow opens the right sidebar and (on mobile) closes the left.

- [ ] T027 [US5] Implement `LayoutUIStore` in `apps/web/src/lib/stores/ui/layout-ui.svelte.ts`.
- [ ] T028 [P] [US5] Unit tests for `LayoutUIStore`.
- [ ] T029 [P] [US5] Implement `focusEntity` helper in `apps/web/src/lib/stores/ui/navigation.ts` (composes layout primitives without cross-store imports).
- [ ] T030 [P] [US5] Unit tests for `focusEntity` helper.
- [ ] T031 [US5] Wire facade — `uiStore.focusEntity` delegates to the new helper; sidebar/width/mobile state delegates to `LayoutUIStore`.
- [ ] T032 [US5] Run full test suite + manual smoke test of sidebar resize, tool toggle, mobile transition, focus flow.

## Phase 8: Facade Removal & Codemod Sweep [US6]

Goal: Rewrite all 147 consumer imports and delete the facade.
Independent Test: Project type-checks, lints, and all tests pass with zero `uiStore.*` references remaining.

- [ ] T033 [US6] Write codemod script (`scripts/codemod-ui-store-split.ts`) using ts-morph that maps every `uiStore.<field>` access to the correct per-feature store import and call.
- [ ] T034 [US6] Run codemod against `apps/web/src` and `packages/*/src`; commit the mechanical rename in a single commit.
- [ ] T035 [US6] Manual fix-up pass for any consumers the codemod couldn't safely transform (likely 0–5 files); commit separately.
- [ ] T036 [US6] Delete `apps/web/src/lib/stores/ui.svelte.ts`; add `window.codexUI = {...}` registration to a new bootstrap file (or to `app-init.ts`).
- [ ] T037 [US6] Update any test files that previously did `vi.mock("../ui.svelte")` to mock the appropriate per-feature store(s) instead.
- [ ] T038 [US6] Run full test suite; resolve any lingering import errors.
- [ ] T039 [US6] Verify zero `uiStore` references remain via `grep -r "uiStore" apps/web/src packages/*/src` (excluding the codemod script itself).

## Phase 9: Polish

Goal: Documentation, line-count validation, and final regression sweep.

- [ ] T040 Validate every new store file is ≤ 200 lines.
- [ ] T041 Update `docs/GOD_FILES_ANALYSIS.md` to mark `ui.svelte.ts` as RESOLVED in Historical Successes.
- [ ] T042 Add an entry to `apps/web/CLAUDE.md` (if present) documenting the per-feature store pattern and the location of `UIPersistence`.
- [ ] T043 Run the P2P + map + entity E2E smoke tests (Playwright if available) to catch any UI regressions the unit tests missed.
- [ ] T044 Verify the persistence migration test asserts every `localStorage` key is read/written identically to baseline (e.g., snapshot test capturing `Object.keys(localStorage)` after a representative session).
