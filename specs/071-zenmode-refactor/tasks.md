# Tasks: ZenModeModal Refactor

**Input**: Design documents from `/specs/071-zenmode-refactor/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Service Extraction 🎯 MVP

**Goal**: Extract non-UI logic and isolated overlays with DI and TDD.

- [x] T001 [P] [US2] Create `apps/web/src/lib/services/ClipboardService.ts` migrating `handleCopy` logic (including canvas/image/PNG support). Use constructor DI for any dependencies.
- [x] T002 [P] [US3] Create `apps/web/src/lib/components/zen/ZenImageLightbox.svelte` migrating lightbox template and focus logic.
- [x] T003 Create unit tests for `ClipboardService.ts` in `apps/web/src/lib/services/`.
- [x] T004 Integrate `ClipboardService` and `ZenImageLightbox` into `ZenModeModal.svelte` and verify functionality.

---

## Phase 2: State & Action Decoupling

**Goal**: Move complex editing state and CRUD logic into specialized hooks with unit tests.

- [x] T005 [P] [US1] Create `apps/web/src/lib/hooks/useEditState.svelte.ts` to manage entity metadata buffering using Svelte 5 Runes.
- [x] T006 [P] [US1] Create `apps/web/src/lib/hooks/useZenModeActions.svelte.ts` for delete, save, and close operations with DI for store access.
- [x] T007 [P] Create unit tests for `useEditState` and `useZenModeActions` in `apps/web/src/lib/hooks/`.
- [x] T008 [US1] Integrate both hooks into `ZenModeModal.svelte` and remove redundant `$state` variables and functions.

---

## Phase 3: Layout Decomposition

**Goal**: Break the massive component template into modular sub-components.

- [x] T009 [P] [US1] Create `apps/web/src/lib/components/zen/ZenHeader.svelte` (Category icon, Title, Action Buttons).
- [x] T010 [P] [US1] Create `apps/web/src/lib/components/zen/ZenSidebar.svelte` (Labels, Image, Connections).
- [x] T011 [P] [US1] Create `apps/web/src/lib/components/zen/ZenContent.svelte` (Temporal, Chronicle, Lore).
- [x] T012 Integrate all sub-components into `ZenModeModal.svelte` and ensure prop/event wiring is correct.

---

## Phase 4: Polish & Validation

- [x] T013 [P] Run `npm run check` and fix any type mismatches.
- [x] T014 [P] Run `npm run lint` to ensure adherence to style guides.
- [x] T015 Run existing Playwright E2E tests (`tests/node-read-mode.spec.ts`, `tests/rich-text.spec.ts`) to verify zero functional regressions.
- [x] T016 Final audit of `ZenModeModal.svelte` to ensure it meets the < 250 LOC goal (Physical LOC).

---

## Dependencies & Execution Order

1.  **Phase 1** can be done immediately.
2.  **Phase 2** must be done before **Phase 3** to provide the necessary state and actions to the new components.
3.  **Phase 4** is the final quality gate.
