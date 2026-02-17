# Tasks: Campaign Date Picker

## Phase 1: Setup

- [x] T001 Initialize `packages/chronology-engine` package with `npm init`
- [x] T002 Configure `tsconfig.json` for `packages/chronology-engine` ensuring Svelte 5 compatibility
- [x] T003 Add `packages/chronology-engine` to the root `package.json` workspaces
- [x] T004 Install `floating-ui` in `apps/web` for popover positioning

## Phase 2: Foundational (Chronology Engine)

- [x] T005 [P] Define `TemporalMetadata`, `CampaignCalendar`, and `CalendarMonth` types in `packages/chronology-engine/src/types.ts`
- [x] T006 Implement `CalendarEngine` class with `isValid` and `format` methods in `packages/chronology-engine/src/engine.ts`
- [x] T007 Implement Gregorian template constants and toggle logic in `CalendarEngine`
- [x] T008 Implement `getTimelineValue` in `packages/chronology-engine/src/engine.ts` for linear timeline mapping
- [x] T009 [P] Add unit tests for `CalendarEngine` logic in `packages/chronology-engine/tests/engine.test.ts`
- [x] T010 Export engine and types from `packages/chronology-engine/src/index.ts`

## Phase 3: User Story 1 - Narrative Year Navigation

**Goal**: Allow users to quickly assign a year to entities using defined world eras.
**Independent Test**: Opening the date picker, selecting an era, and picking a year within that era's range.

- [x] T011 [US1] Create `apps/web/src/lib/stores/calendar.svelte.ts` to manage campaign calendar state
- [x] T012 [P] [US1] Implement basic `TemporalPicker.svelte` popover structure in `apps/web/src/lib/components/timeline/`
- [x] T013 [US1] Implement Era selection list in `TemporalPicker.svelte` using `graph.eras` store
- [x] T014 [US1] Implement Year selection logic in `TemporalPicker.svelte` constrained by selected Era
- [x] T015 [US1] Integrate `TemporalPicker` into `apps/web/src/lib/components/timeline/TemporalEditor.svelte`
- [x] T016 [US1] Verify year navigation works correctly via manual UI test in Zen Mode

## Phase 4: User Story 2 - Campaign-Specific Calendar

**Goal**: Support custom month names and year structures defined in campaign settings.
**Independent Test**: Defining custom months in settings and verifying they appear in the date picker dropdown.

- [x] T017 [US2] Create "Chronology" section in `apps/web/src/lib/components/settings/VaultSettings.svelte`
- [x] T018 [US2] Implement Month configuration UI (add/remove/rename) in `VaultSettings.svelte`
- [x] T019 [US2] Implement Days-per-month configuration in the settings UI
- [x] T020 [US2] Update `CalendarEngine` to use custom config for `getMonths` and validation
- [x] T021 [US2] Update `TemporalPicker.svelte` to render custom month names from the store
- [x] T022 [US2] Implement `saveCalendarConfig` logic in `apps/web/src/lib/stores/vault/io.ts` to persist settings to OPFS
- [x] T023 [US2] Add E2E test in `apps/web/tests/calendar-picker.spec.ts` for custom calendar configuration

## Phase 5: User Story 3 - Granular Detail Level

**Goal**: Allow saving partial dates (Year only, or Year/Month only).
**Independent Test**: Toggling between "Year Only" and "Full Date" modes in the picker and saving results.

- [x] T024 [US3] Add "Precision" toggle (Year/Month/Day) to `TemporalPicker.svelte`
- [x] T025 [US3] Update `update` logic in `TemporalEditor.svelte` to handle undefined month/day correctly
- [x] T026 [US3] Ensure `CalendarEngine.format` handles partial dates gracefully
- [x] T027 [US3] Verify partial date persistence in OPFS via manual test

## Phase 6: Polish & Cross-Cutting

- [x] T028 Implement keyboard navigation (Arrow keys, Enter, Escape) for `TemporalPicker.svelte`
- [x] T029 Apply theme-aware styling to `TemporalPicker` using Tailwind 4 vars
- [x] T030 Update `apps/web/src/lib/content/help/chronology.md` with custom calendar documentation
- [x] T031 Add a `FeatureHint` for the new date picker in `apps/web/src/lib/components/help/FeatureHint.svelte`
- [x] T032 Final pass on accessibility (ARIA labels, focus trap for popover)

## Dependencies

- Phase 1 & 2 must be completed before any User Story tasks.
- US1 (P1) is the MVP and should be completed before US2 and US3.
- US2 and US3 can be implemented in parallel after US1 foundational UI is in place.

## Parallel Execution Examples

- **US1**: T012 (UI structure) and T013 (Era list logic) can start simultaneously.
- **Foundational**: T005 (Types) and T009 (Test setup) can start simultaneously.

## Implementation Strategy

- **MVP**: Focus on Phase 1, 2, and 3 to deliver Era-centric year navigation first.
- **Incremental**: Add custom calendar support (Phase 4) followed by partial date granularity (Phase 5).
