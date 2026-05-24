# Tasks: Scroll Wheel Date Picker

**Input**: Design documents from `/specs/116-scroll-wheel-date-picker/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [ui-mockups.md](./ui-mockups.md)

**Tests**: Required by the project constitution. Write failing tests before implementation in each story phase.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on another incomplete task.
- **[Story]**: User story label for story-scoped tasks only.
- Every task includes an exact file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare documentation, package surfaces, and baseline test locations before implementation.

- [x] T001 Review scroll-wheel UI states and acceptance examples in `specs/116-scroll-wheel-date-picker/ui-mockups.md`
- [x] T002 [P] Confirm chronology package exports are the intended public surface in `packages/chronology-engine/src/index.ts`
- [x] T003 [P] Confirm existing entity temporal schema compatibility points in `packages/schema/src/entity.ts`
- [x] T004 [P] Confirm current picker integration points in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared chronology model, schema compatibility, and calendar revision support required by all stories.

**Critical**: No user story implementation should begin until this phase is complete.

- [x] T005 [P] Add failing tests for `DateSelection`, `CalendarSnapshot`, `RepairState`, and `WheelColumnState` validation in `packages/chronology-engine/tests/engine.test.ts`
- [x] T006 [P] Add failing schema tests for legacy temporal metadata and new precision/revision metadata in `packages/schema/src/schema.test.ts`
- [x] T007 [P] Add failing calendar store tests for revision increment and snapshot creation in `apps/web/src/lib/stores/calendar.test.ts`
- [x] T008 Define `DatePrecision`, `DateSelection`, `CalendarSnapshot`, `IntercalaryAnchor`, `RepairState`, `WheelOption`, and `WheelColumnState` in `packages/chronology-engine/src/types.ts`
- [x] T009 Extend `WorldCalendar` and `CalendarMonth` compatibility types with revision and stable label fields in `packages/chronology-engine/src/types.ts`
- [x] T010 Update calendar validation and formatting signatures to accept `DateSelection` and `CalendarSnapshot` in `packages/chronology-engine/src/engine.ts`
- [x] T011 Update temporal metadata schema to accept legacy and new date selection shapes in `packages/schema/src/entity.ts`
- [x] T012 Add calendar revision persistence and snapshot creation behavior in `apps/web/src/lib/stores/calendar.svelte.ts`
- [x] T013 Run foundational package tests for chronology, schema, and calendar store using `packages/chronology-engine/tests/engine.test.ts`, `packages/schema/src/schema.test.ts`, and `apps/web/src/lib/stores/calendar.test.ts`

**Checkpoint**: Shared date model, schema, and calendar snapshots are testable and ready for story work.

---

## Phase 3: User Story 1 - Pick Dates With Scroll Wheels (Priority: P1) MVP

**Goal**: Users can pick a standard date by scrolling centered numeric wheel columns, use direct numeric entry for large ranges, and operate the picker with pointer, touch, mouse wheel, and keyboard controls.

**Independent Test**: Open the picker for an existing standard date, confirm the existing values are centered, change year/month/day through wheels and direct entry, and save the selected centered values.

### Tests for User Story 1

- [x] T014 [P] [US1] Add failing engine tests for deriving numeric year/unit/day wheel columns in `packages/chronology-engine/tests/engine.test.ts`
- [x] T015 [US1] Add failing engine tests for direct numeric entry rejection and last-valid-value behavior in `packages/chronology-engine/tests/engine.test.ts`
- [x] T016 [P] [US1] Add failing Svelte tests for numeric wheel selection, centered values, preview sync, and apply behavior in `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`
- [x] T017 [US1] Add failing Svelte tests for keyboard stepper/listbox operation and current-value announcements in `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Implement `deriveWheelColumns` for numeric year, unit, and day columns in `packages/chronology-engine/src/engine.ts`
- [x] T019 [US1] Implement direct numeric parse/reject behavior without mutating the previous valid selection in `packages/chronology-engine/src/engine.ts`
- [x] T020 [US1] Replace the existing detail grid with reusable wheel column rendering in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T021 [US1] Add centered lens, snap state, and selected-value preview sync in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T022 [US1] Add direct numeric entry or jump controls for large numeric ranges in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T023 [US1] Add keyboard-operable stepper/listbox semantics and accessible announcements in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T024 [US1] Preserve existing `TemporalEditor` value binding and close/apply behavior in `apps/web/src/lib/components/timeline/TemporalEditor.svelte`
- [x] T025 [US1] Run US1 tests for `packages/chronology-engine/tests/engine.test.ts` and `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`

**Checkpoint**: User Story 1 is independently functional as the MVP.

---

## Phase 4: User Story 2 - Use Named Calendar Units (Priority: P2)

**Goal**: Users can select named calendar values, long labels remain readable on mobile through truncation plus full preview, and intercalary anchors can replace normal month/day precision.

**Independent Test**: Configure a calendar with named values and an anchor, open the picker, select named values and an anchor, rename/reorder calendar labels, and confirm saved selections retain stable identities.

### Tests for User Story 2

- [x] T026 [P] [US2] Add failing engine tests for stable named option identities across rename and reorder in `packages/chronology-engine/tests/engine.test.ts`
- [x] T027 [US2] Add failing engine tests for intercalary anchor precision and formatting in `packages/chronology-engine/tests/engine.test.ts`
- [x] T028 [P] [US2] Add failing picker tests for named wheel columns, anchor precision, long-label truncation, and full preview text in `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`
- [x] T029 [P] [US2] Add failing settings tests for preserving stable calendar option IDs while editing labels in `apps/web/src/lib/stores/calendar.test.ts`

### Implementation for User Story 2

- [x] T030 [US2] Implement stable named option lookup and formatting in `packages/chronology-engine/src/engine.ts`
- [x] T031 [US2] Implement intercalary anchor validation, wheel derivation, and formatting in `packages/chronology-engine/src/engine.ts`
- [x] T032 [US2] Update custom calendar settings to preserve stable option IDs during label edits in `apps/web/src/lib/components/settings/VaultSettings.svelte`
- [x] T033 [US2] Update calendar store persistence to retain named option identities and anchor definitions in `apps/web/src/lib/stores/calendar.svelte.ts`
- [x] T034 [US2] Add named unit and anchor precision UI states in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T035 [US2] Add mobile long-label truncation and full preview behavior in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T036 [US2] Run US2 tests for `packages/chronology-engine/tests/engine.test.ts`, `apps/web/src/lib/stores/calendar.test.ts`, and `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`

**Checkpoint**: User Story 2 works independently with named units and anchors.

---

## Phase 5: User Story 3 - Keep Dates Valid When Context Changes (Priority: P3)

**Goal**: Users cannot save impossible dates after parent changes or calendar edits, and stale saved dates open in repair state without silent mutation.

**Independent Test**: Select day 34 in a 35-day unit, switch to a 30-day unit, confirm day caps to 30 with feedback; open a stale saved date after a calendar edit and confirm repair state preserves the original until user confirmation.

### Tests for User Story 3

- [x] T037 [P] [US3] Add failing engine tests for top-down constraint evaluation and day capping in `packages/chronology-engine/tests/engine.test.ts`
- [x] T038 [US3] Add failing engine tests for repair state reasons and suggested replacements in `packages/chronology-engine/tests/engine.test.ts`
- [x] T039 [P] [US3] Add failing picker tests for overflow feedback, repair state confirmation, and stale snapshot blocking in `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`
- [x] T040 [P] [US3] Add failing calendar store tests for open-picker snapshot invalidation after calendar revision changes in `apps/web/src/lib/stores/calendar.test.ts`

### Implementation for User Story 3

- [x] T041 [US3] Implement top-down parent-change evaluation and maximum-day capping in `packages/chronology-engine/src/engine.ts`
- [x] T042 [US3] Implement `getRepairState` for missing unit, missing anchor, day overflow, and stale revision in `packages/chronology-engine/src/engine.ts`
- [x] T043 [US3] Add repair-state UI with original/suggested values and confirmation actions in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T044 [US3] Add overflow cap feedback before save in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T045 [US3] Block save or require refresh/repair when an open picker's calendar snapshot is stale in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T046 [US3] Ensure save writes the current calendar revision and preserves invalid originals until confirmation in `apps/web/src/lib/components/timeline/TemporalPicker.svelte`
- [x] T047 [US3] Run US3 tests for `packages/chronology-engine/tests/engine.test.ts`, `apps/web/src/lib/stores/calendar.test.ts`, and `apps/web/src/lib/components/timeline/TemporalPicker.test.ts`

**Checkpoint**: User Story 3 works independently without silent date repair.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, visual validation, compatibility checks, and full verification.

- [x] T048 [P] Update Custom Chronology help content for scroll wheels, precision, anchors, direct entry, and repair states in `apps/web/src/lib/content/help/chronology.md`
- [x] T049 [P] Add or update first-time feature hint copy for the date picker in `apps/web/src/lib/config/help-content.ts`
- [x] T050 [P] Validate mobile and desktop layouts against `specs/116-scroll-wheel-date-picker/ui-mockups.md`
- [x] T051 Verify legacy entities with `{ year, month, day, label }` still render in `apps/web/src/lib/components/entity-detail/DetailStatusTab.svelte`
- [x] T052 Verify timeline sorting remains stable for legacy and new selections in `apps/web/src/lib/stores/timeline.svelte.ts`
- [x] T053 Run package-level checks from `specs/116-scroll-wheel-date-picker/quickstart.md`
- [x] T054 Run full workspace validation with `bun run lint` and `bun run test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can proceed after shared model is stable, but UI integration is easier after US1 wheel rendering exists.
- **User Story 3 (Phase 5)**: Depends on Foundational; can proceed after repair contracts exist, but UI integration is easier after US1 wheel rendering exists.
- **Polish (Phase 6)**: Depends on selected user stories being complete.

### User Story Dependencies

- **US1**: No dependency on US2 or US3 after Foundational.
- **US2**: Depends on shared model and benefits from US1 wheel UI, but named-unit engine work can start in parallel after Foundational.
- **US3**: Depends on shared model and benefits from US1 wheel UI, but repair/capping engine work can start in parallel after Foundational.

### Within Each User Story

- Tests must be written first and fail before implementation.
- Engine/schema/store tasks precede Svelte integration when they provide required data.
- Svelte implementation precedes manual visual validation.
- Story checkpoint validation must pass before moving to lower-priority work.

## Parallel Opportunities

- T002, T003, and T004 can run in parallel.
- T005, T006, and T007 can run in parallel.
- US1 test tasks T014 through T017 can run in parallel.
- US2 test tasks T026 through T029 can run in parallel.
- US3 test tasks T037 through T040 can run in parallel.
- Documentation tasks T048 and T049 can run in parallel with layout validation T050 after story implementation.

## Parallel Examples

### User Story 1

```text
Task: "T014 [P] [US1] Add failing engine tests for deriving numeric year/unit/day wheel columns in packages/chronology-engine/tests/engine.test.ts"
Task: "T016 [P] [US1] Add failing Svelte tests for numeric wheel selection, centered values, preview sync, and apply behavior in apps/web/src/lib/components/timeline/TemporalPicker.test.ts"
Task: "T017 [P] [US1] Add failing Svelte tests for keyboard stepper/listbox operation and current-value announcements in apps/web/src/lib/components/timeline/TemporalPicker.test.ts"
```

### User Story 2

```text
Task: "T026 [P] [US2] Add failing engine tests for stable named option identities across rename and reorder in packages/chronology-engine/tests/engine.test.ts"
Task: "T028 [P] [US2] Add failing picker tests for named wheel columns, anchor precision, long-label truncation, and full preview text in apps/web/src/lib/components/timeline/TemporalPicker.test.ts"
Task: "T029 [P] [US2] Add failing settings tests for preserving stable calendar option IDs while editing labels in apps/web/src/lib/stores/calendar.test.ts"
```

### User Story 3

```text
Task: "T037 [P] [US3] Add failing engine tests for top-down constraint evaluation and day capping in packages/chronology-engine/tests/engine.test.ts"
Task: "T039 [P] [US3] Add failing picker tests for overflow feedback, repair state confirmation, and stale snapshot blocking in apps/web/src/lib/components/timeline/TemporalPicker.test.ts"
Task: "T040 [P] [US3] Add failing calendar store tests for open-picker snapshot invalidation after calendar revision changes in apps/web/src/lib/stores/calendar.test.ts"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for User Story 1.
3. Validate numeric wheel selection, direct entry, keyboard operation, and existing date centering.
4. Stop for review before adding named units or repair states.

### Incremental Delivery

1. Deliver US1 as the usable scroll-wheel MVP.
2. Add US2 for custom named units, long labels, and intercalary anchors.
3. Add US3 for capping, stale revision repair, and snapshot safety.
4. Complete documentation and full validation.

### Quality Gates

- Each story must include failing tests before implementation.
- Each story checkpoint must run its listed targeted tests.
- Final validation must run `bun run lint` and `bun run test`, or record the local Bun/Husky environment blocker and run package-level checks directly.

## Notes

- Keep implementation scoped to the files listed in [plan.md](./plan.md) unless tests reveal a necessary compatibility path.
- Preserve legacy temporal metadata and existing partial dates.
- Do not introduce a third-party wheel dependency unless native wheel/listbox behavior fails the performance or accessibility targets.
