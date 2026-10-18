# Tasks: Support Multiple Calendar Eras / Epoch-Based Year Numbering

**Input**: Design documents from `/specs/169-calendar-eras/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/calendar-eras.md](./contracts/calendar-eras.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent files)
- **[Story]**: Associated user story (US1, US2, US3, US4)
- Exact file paths included in every task

---

## Phase 1: Setup & Data Models

**Purpose**: Type definitions and foundational models across the workspace.

- [x] T001 [P] Define `CalendarEra` interface and extend `WorldCalendar` with optional `eras?: CalendarEra[]` in `packages/chronology-engine/src/types.ts`.
- [x] T002 [P] Export new era types (`CalendarEra`, `ResolvedEra`) from `packages/chronology-engine/src/index.ts`.
- [x] T003 [P] Verify `TemporalMetadataSchema` in `packages/schema/src/entity.ts` retains integer validation and document that no entity schema migration is required.

---

## Phase 2: Foundational Era Logic (chronology-engine)

**Purpose**: Centralized bidirectional era calculation, resolution, and formatting in a dedicated module (Principle XIV).

- [x] T004 [P] Create unit test suite in `packages/chronology-engine/tests/eras.test.ts` testing `resolveEraForYear`, `resolveYearFromEra`, boundary resolution, and fallback to `epochLabel`.
- [x] T005 Implement `resolveEraForYear` and `resolveYearFromEra` in `packages/chronology-engine/src/eras.ts` supporting forward/backward formulas and configurable start years.
- [x] T006 Implement `formatEraDate` and `formatEraYear` in `packages/chronology-engine/src/eras.ts` with prefix/suffix formatting.
- [x] T007 Implement era-aware string parsing helper in `packages/chronology-engine/src/eras.ts` to recognize era labels/names in raw date inputs (e.g. `312 BF`, `Second Age 45`).

---

## Phase 3: User Story 1 - Multi-Era Configuration & Consistent Date Formatting (Priority: P1) 🎯 MVP

**Goal**: Seamless, consistent date rendering across all existing views (entity dates, timeline bands, agenda, month grid) via `CalendarEngine.format()`, while preserving legacy formatting for existing vaults.

- [x] T008 [US1] Delegate era-aware formatting from `CalendarEngine.format()` in `packages/chronology-engine/src/engine.ts` to `packages/chronology-engine/src/eras.ts`, falling back to `config.epochLabel` when no eras exist.
- [x] T009 [US1] Integrate era parsing into `parseDirectDateInput()` in `packages/chronology-engine/src/engine.ts`.
- [x] T010 [US1] Add integration unit tests in `packages/chronology-engine/tests/engine.test.ts` verifying legacy calendars without eras format identically, while calendars with eras render era-relative numbers and labels.
- [x] T011 [US1] Verify timeline sorting across era boundaries in `packages/chronology-engine/tests/engine.test.ts` and `packages/chronology-engine/tests/calendar-view.test.ts`.

**Checkpoint**: User Story 1 delivers the complete mathematical core and consistent visual formatting across all views.

---

## Phase 4: User Story 2 - Calendar Settings Era Management (Priority: P2)

**Goal**: Worldbuilders can add, edit, reorder, and remove eras in Vault Settings with live feedback.

- [x] T012 [P] [US2] Create Svelte 5 component `apps/web/src/lib/components/settings/CalendarEraSettings.svelte` with inputs for Era Name, Label, Start Year, Displayed Year at Start, and Direction ("forward" | "backward").
- [x] T013 [US2] Mount `<CalendarEraSettings />` inside `apps/web/src/lib/components/settings/VaultSettings.svelte` under the Chronology & Calendar section.
- [x] T014 [US2] Add reactive preview in `CalendarEraSettings.svelte` demonstrating live conversions (e.g., "Internal -311 = 312 BF").
- [x] T015 [US2] Write unit tests in `apps/web/src/lib/components/settings/CalendarEraSettings.test.ts` verifying adding, editing, and deleting eras updates `calendarStore.config.eras` and triggers revision bump.

**Checkpoint**: User Story 2 enables full user configuration and persistence in the web app.

---

## Phase 5: User Story 3 - Era Selection and Input in Date Picker (Priority: P3)

**Goal**: Date Picker exposes era awareness, allows selecting active eras, and accepts era-qualified direct date input.

- [x] T016 [US3] Update `apps/web/src/lib/components/timeline/utils/temporal-picker-selection.ts` to handle era string parsing with `calendarEngine.parseDirectDateInput()`.
- [x] T017 [US3] Create `apps/web/src/lib/components/timeline/TemporalPickerEraSelector.svelte` exposing an era selector alongside the year wheel when `calendarStore.config.eras` is populated.
- [x] T018 [US3] Update `TemporalPicker.svelte` and `deriveWheelColumns` to render era-relative year labels on the year wheel and handle era switching.
- [x] T019 [US3] Write unit tests for date picker era selection in `apps/web/src/lib/components/timeline/TemporalPickerEraSelector.test.ts` and `TemporalPicker.test.ts`.

**Checkpoint**: User Story 3 delivers intuitive authoring and selection in the date picker.

---

## Phase 6: User Story 4 - Backward-Counting Eras & Epoch Transitions (Priority: P4)

**Goal**: High-fidelity support for BCE/Before the Fall epochs with exact year-number continuity and zero gap/overlap.

- [x] T020 [US4] Add comprehensive boundary tests for backward eras (`startYear: -1`, `yearAtStart: 1`) transitioning to forward eras (`startYear: 0`, `yearAtStart: 1`) in `packages/chronology-engine/tests/eras.test.ts`.
- [x] T021 [US4] Verify negative internal years are never required to be displayed when backward eras cover the timeline range.
- [x] T022 [US4] Ensure calendar repair routines in `CalendarEngine.getRepairState()` handle dates when eras are modified or deleted.

---

## Phase 7: Verification, Documentation & Quality Gate

**Purpose**: End-to-end verification and documentation compliance.

- [x] T023 [P] Update user documentation in `apps/web/src/lib/config/help-content.ts` explaining calendar eras, internal chronology, and epoch numbering.
- [x] T024 Run impacted unit tests via `bun run test:changed`.
- [x] T025 Run changed-file linter via `bun run lint:changed`.
- [x] T026 Run workspace type-check: `bunx svelte-check --tsconfig ./tsconfig.json --threshold error` inside `apps/web` and `bun test packages/chronology-engine`.
