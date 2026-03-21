# Tasks: Staging Indicator

**Input**: Design documents from `/specs/074-staging-indicator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Status**: COMPLETED

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 [P] Create feature directory and documentation structure
- [x] T002 [P] Configure environment detection constants in `apps/web/src/lib/config/index.ts` (Hostname + Pathname support)

---

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T003 Update `UIStore` to include `isStaging` state in `apps/web/src/lib/stores/ui.svelte.ts`
- [x] T004 Implement environment detection logic in `apps/web/src/lib/app/init/app-init.ts`
- [x] T005 [P] Create unit test for environment detection in `apps/web/src/lib/app/init/app-init.test.ts`

**Checkpoint**: Foundation ready - `uiStore.isStaging` correctly reflects URL/Env state.

---

## Phase 3: Implementation - Header Integration (P1/P2)

- [x] T006 [P] [US1] Create unit test for `IS_STAGING` config logic in `apps/web/src/lib/config/index.test.ts`
- [x] T007 [P] [US1] Create E2E test for staging indicator visibility in `apps/web/tests/staging-indicator.spec.ts`
- [x] T008 [US1] Apply conditional staging styling to brand title in `apps/web/src/lib/components/layout/AppHeader.svelte`
- [x] T009 [US2] Ensure staging styling applies to mobile "CC" logo in `apps/web/src/lib/components/layout/AppHeader.svelte`
- [x] T010 [US1] Verify high-contrast red styling and glow effect in browser

**Checkpoint**: Design pivot complete - Staging is visible via header brand.

---

## Phase 4: Polish & Validation

- [x] T011 [P] Run all project tests to ensure no regressions: `npm test`
- [x] T012 [P] Verify E2E tests pass for desktop and mobile viewports
- [x] T013 Verify SC-004: 0ms CLS impact using browser devtools performance tab

**Final Status**: All requirements met.
