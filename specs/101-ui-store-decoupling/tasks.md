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

- [x] T001 Create `apps/web/src/lib/stores/ui/` directory.
- [x] T002 Enumerate every `localStorage` key, `matchMedia` call, and `window.*` reference in `ui.svelte.ts` and record them in `data-model.md` (verifies the locked key list is exhaustive).

## Phase 2: Foundational

Goal: Establish `UIPersistence` as the single point of persistence.

- [x] T003 [P] Implement `UIPersistence` in `apps/web/src/lib/stores/ui/persistence.ts` with `read<T>`, `write<T>`, `remove` operations; SSR safe; injectable storage.
- [x] T004 [P] Write unit tests for `UIPersistence` in `apps/web/src/lib/stores/ui/persistence.test.ts` covering missing key, parse failure, SSR no-op, injected backing store.

## Phase 3: Notification Store [US1] 🎯 MVP

Goal: Extract toasts, global error, and confirm dialog behind the facade.
Independent Test: Existing 64 `uiStore.notify` and 35 `uiStore.confirm` call sites continue to work without modification.

- [x] T005 [US1] Implement `NotificationStore` in `apps/web/src/lib/stores/ui/notification.svelte.ts`.
- [x] T006 [P] [US1] Unit tests for `NotificationStore` in `notification.test.ts` (notify, replace, clear, persistent, global error, confirm/resolve, pending-confirmation cleanup).
- [x] T007 [US1] Wire the `UIStore` facade in `apps/web/src/lib/stores/ui.svelte.ts` to delegate notification-related state and methods to `NotificationStore` while leaving every other field unchanged.
- [x] T008 [US1] Run `pnpm test` — ensure all 1177+ tests still pass; manual smoke test of toast rendering, dismiss timing, and confirm dialog.

## Phase 4: Onboarding + Session Mode [US2]

Goal: Extract two small slices that exercise the persistence helper.
Independent Test: Landing page dismissal persists; guest username round-trips across the 53 call sites.

- [x] T009 [P] [US2] Implement `OnboardingStore` in `apps/web/src/lib/stores/ui/onboarding.svelte.ts`.
- [x] T010 [P] [US2] Unit tests for `OnboardingStore` in `onboarding.test.ts`.
- [x] T011 [P] [US2] Implement `SessionModeStore` in `apps/web/src/lib/stores/ui/session-mode.svelte.ts`.
- [x] T012 [P] [US2] Unit tests for `SessionModeStore` in `session-mode.test.ts`.
- [x] T013 [US2] Wire facade for both stores.
- [x] T014 [US2] Run full test suite + manual smoke test.

## Phase 5: Modal UI Store [US3]

Goal: Extract every modal/dialog into a single focused store.
Independent Test: Each modal opens/closes via the existing public API with no consumer changes.

- [x] T015 [US3] Implement `ModalUIStore` in `apps/web/src/lib/stores/ui/modal-ui.svelte.ts`.
- [x] T016 [P] [US3] Unit tests for `ModalUIStore` in `modal-ui.test.ts` covering settings, lightbox, merge, bulk label, zen-mode, read-mode, dice, canvas selector, confirm-dialog open/close.
- [x] T017 [US3] Wire facade.
- [x] T018 [US3] Run full test suite + manual smoke test of each modal.

## Phase 6: Discovery + Connection + Explorer Stores [US4]

Goal: Extract feature-specific UI slices.
Independent Test: Discovery mode persists; connect-mode start/abort works; explorer label filters round-trip.

- [x] T019 [P] [US4] Implement `DiscoveryPolicyStore` in `apps/web/src/lib/stores/ui/discovery-policy.svelte.ts`.
- [x] T020 [P] [US4] Unit tests for `DiscoveryPolicyStore`.
- [x] T021 [P] [US4] Implement `ConnectionModeStore` in `apps/web/src/lib/stores/ui/connection-mode.svelte.ts`.
- [x] T022 [P] [US4] Unit tests for `ConnectionModeStore` (including `AbortController` lifecycle).
- [x] T023 [P] [US4] Implement `ExplorerUIStore` in `apps/web/src/lib/stores/ui/explorer-ui.svelte.ts`.
- [x] T024 [P] [US4] Unit tests for `ExplorerUIStore`.
- [x] T025 [US4] Wire facade for all three stores.
- [x] T026 [US4] Run full test suite.

## Phase 7: Layout UI Store [US5]

Goal: Extract the largest single piece — sidebars, widths, mobile detection, focus.
Independent Test: Sidebar resize persists; mobile detection fires on viewport change; focus flow opens the right sidebar and (on mobile) closes the left.

- [x] T027 [US5] Implement `LayoutUIStore` in `apps/web/src/lib/stores/ui/layout-ui.svelte.ts`.
- [x] T028 [P] [US5] Unit tests for `LayoutUIStore`.
- [x] T029 [P] [US5] Implement `focusEntity` helper in `apps/web/src/lib/stores/ui/navigation.ts` (composes layout primitives without cross-store imports).
- [x] T030 [P] [US5] Unit tests for `focusEntity` helper.
- [x] T031 [US5] Wire facade — `uiStore.focusEntity` delegates to the new helper; sidebar/width/mobile state delegates to `LayoutUIStore`.
- [x] T032 [US5] Run full test suite + manual smoke test of sidebar resize, tool toggle, mobile transition, focus flow.

## Phase 8: Facade Removal & Codemod Sweep [US6]

Goal: Rewrite all 147 consumer imports and delete the facade.
Independent Test: Project type-checks, lints, and all tests pass with zero `uiStore.*` references remaining.

- [x] T033 [US6] Write codemod script (`scripts/codemod-ui-store-split.ts`) using ts-morph that maps every `uiStore.<field>` access to the correct per-feature store import and call.
- [ ] T034 [US6] Run codemod against `apps/web/src` and `packages/*/src`; commit the mechanical rename in a single commit.
- [x] T035 [US6] Manual fix-up pass for any consumers the codemod couldn't safely transform (likely 0–5 files); commit separately.
- [x] T036 [US6] Delete `apps/web/src/lib/stores/ui.svelte.ts`; add `window.codexUI = {...}` registration to a new bootstrap file (or to `app-init.ts`).
- [x] T037 [US6] Update any test files that previously did `vi.mock("../ui.svelte")` to mock the appropriate per-feature store(s) instead.
- [x] T038 [US6] Run full test suite; resolve any lingering import errors.
- [x] T039 [US6] Verify zero deleted-facade imports remain via `grep -R "['\"]\([^'\"]*/\)\?ui\.svelte['\"]" apps/web/src packages`. Remaining `uiStore` identifiers are the Oracle execution-context snapshot contract and related tests, not web UI facade dependencies.

## Phase 9: Polish

Goal: Documentation, line-count validation, and final regression sweep.

- [x] T040 Validate every new store file is ≤ 200 lines.
- [x] T041 Update `docs/GOD_FILES_ANALYSIS.md` to mark `ui.svelte.ts` as RESOLVED in Historical Successes.
- [x] T042 Add an entry to `apps/web/CLAUDE.md` (if present) documenting the per-feature store pattern and the location of `UIPersistence`. No `apps/web/CLAUDE.md` is present, so no file update was required.
- [ ] T043 Run the P2P + map + entity E2E smoke tests (Playwright if available) to catch any UI regressions the unit tests missed. Attempted `pnpm --filter=web exec playwright test tests/p2p-image-sync.spec.ts tests/map.spec.ts tests/graph-focus.spec.ts --reporter=list`; blocked in Termux by Playwright `Unsupported platform: android`.
- [x] T044 Verify the persistence migration test asserts every `localStorage` key is read/written identically to baseline (e.g., snapshot test capturing `Object.keys(localStorage)` after a representative session).
