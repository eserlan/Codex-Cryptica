# Tasks: Calendar / Agenda View for Events

**Status**: All tasks complete. Branch merged to `staging` 2026-06-19.

**Input**: Design documents from `/specs/132-calendar-agenda-view/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/calendar-view.md](./contracts/calendar-view.md), [quickstart.md](./quickstart.md)

**Tests**: Required by project constitution and explicit TDD planning. Write failing tests first for each changed behavior, including success paths and at least one meaningful empty, overflow, or uncertain-date path.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature files and review the existing chronology/timeline surfaces that the implementation will extend.

- [x] T001 Review the current timeline route and components in `apps/web/src/routes/(app)/timeline/+page.svelte`, `apps/web/src/lib/components/timeline/VerticalTimeline.svelte`, and `apps/web/src/lib/components/timeline/HorizontalTimeline.svelte`
- [x] T002 [P] Review the current chronology state and date configuration stores in `apps/web/src/lib/stores/timeline.svelte.ts` and `apps/web/src/lib/stores/calendar.svelte.ts`
- [x] T003 [P] Review world/front-page integration points in `apps/web/src/lib/components/world/FrontPage.svelte` and `apps/web/src/lib/stores/world.svelte.ts`
- [x] T004 Create feature scaffolding files `packages/chronology-engine/src/calendar-view.ts`, `packages/chronology-engine/tests/calendar-view.test.ts`, `apps/web/src/lib/components/timeline/CalendarMonthView.svelte`, `apps/web/src/lib/components/timeline/CalendarAgendaView.svelte`, `apps/web/src/lib/components/timeline/CalendarDayOverflow.svelte`, and `apps/web/src/lib/components/timeline/CalendarViews.test.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared chronology contracts and state extensions that every user story depends on.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [x] T005 [P] Add failing package tests for exact-date month bucketing, approximate/missing-date exclusion, AND filter semantics, and crowded-day overflow counts in `packages/chronology-engine/tests/calendar-view.test.ts`
- [x] T006 [P] Add failing store tests for world-scoped calendar entry derivation, active month navigation state, agenda grouping, and stable same-date ordering in `apps/web/src/lib/stores/timeline.test.ts`
- [x] T007 Define and export `CalendarEventEntry`, `CalendarFilterInput`, `CalendarMonthViewModel`, and `AgendaSection` contracts in `packages/chronology-engine/src/types.ts` and `packages/chronology-engine/src/index.ts`
- [x] T008 Implement pure filtering, month-grid shaping, and agenda grouping helpers in `packages/chronology-engine/src/calendar-view.ts`
- [x] T009 Extend `apps/web/src/lib/stores/timeline.svelte.ts` with calendar/agenda mode, active month state, and world-scoped calendar entry derivation using `packages/chronology-engine/src/calendar-view.ts`
- [x] T010 Add timeline store helper coverage for undated/approximate grouping, start-date-only multi-day placement, label-normalized filtering, and exclusion of non-current-world events in `apps/web/src/lib/stores/timeline.test.ts`
- [x] T011 Run foundational verification for `packages/chronology-engine/tests/calendar-view.test.ts` and `apps/web/src/lib/stores/timeline.test.ts`

**Checkpoint**: Reusable chronology helpers and store state are ready; story UI work can proceed independently.

---

## Phase 3: User Story 1 - Browse Events by Month (Priority: P1) 🎯 MVP

**Goal**: Users can open the chronology experience and browse exact-dated world events in a monthly grid with previous/next month navigation and accessible crowded-day overflow.

**Independent Test**: Open the calendar experience, verify events appear on the correct day cells for the active month, navigate between months, and access overflowed events from a crowded day.

### Tests for User Story 1

- [x] T012 [P] [US1] Add failing month-grid component tests for date placement, empty month state, and previous/next month navigation in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`
- [x] T013 [P] [US1] Add failing overflow interaction tests for crowded day cells in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`
- [x] T014 [P] [US1] Add failing route integration tests for rendering the month view from `timelineStore` in `apps/web/src/routes/(app)/timeline/+page.svelte`

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement the month-grid renderer in `apps/web/src/lib/components/timeline/CalendarMonthView.svelte`
- [x] T016 [P] [US1] Implement the interactive crowded-day overflow surface in `apps/web/src/lib/components/timeline/CalendarDayOverflow.svelte`
- [x] T017 [US1] Update `apps/web/src/routes/(app)/timeline/+page.svelte` to render the calendar month view, previous/next month controls, and month-level empty state
- [x] T018 [US1] Update `apps/web/src/lib/components/timeline/TimelineLayoutToggle.svelte` and related timeline view controls to support calendar mode without breaking existing timeline layout switching
- [x] T019 [US1] Run User Story 1 verification from `apps/web/src/lib/components/timeline/CalendarViews.test.ts` and the timeline route tests

**Checkpoint**: User Story 1 is independently functional as the MVP calendar browser.

---

## Phase 4: User Story 2 - Open an Event from the Calendar (Priority: P1)

**Goal**: Users can click or tap a calendar/agenda entry and open the existing related entity or event detail view.

**Independent Test**: Click or tap an event from the month grid and verify the existing detail view opens for the correct entity on desktop and mobile-sized viewports.

### Tests for User Story 2

- [x] T020 [P] [US2] Add failing interaction tests for month-grid entry click and mobile tap behavior in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`
- [x] T021 [P] [US2] Add failing integration tests for existing detail-view navigation from the timeline route in `apps/web/src/routes/(app)/timeline/+page.svelte`

### Implementation for User Story 2

- [x] T022 [US2] Wire calendar and agenda entries to the existing detail navigation flow in `apps/web/src/lib/components/timeline/CalendarMonthView.svelte`, `apps/web/src/lib/components/timeline/CalendarAgendaView.svelte`, and `apps/web/src/routes/(app)/timeline/+page.svelte`
- [x] T023 [US2] Keep navigation orchestration in the app layer by extending `apps/web/src/lib/stores/timeline.svelte.ts` or existing UI navigation utilities in `apps/web/src/lib/stores/ui/navigation.ts`
- [x] T024 [US2] Run User Story 2 verification for entry activation and existing detail-view opening

**Checkpoint**: Month-grid browsing now connects directly to the app’s existing content detail workflow.

---

## Phase 5: User Story 3 - Filter Calendar by Entity or Type (Priority: P2)

**Goal**: Users can narrow visible chronology entries with AND-based filters for entity type, labels, and related entities.

**Independent Test**: Apply one or more filters and verify only entries matching all selected criteria remain visible; clear filters and confirm all matching world events return.

### Tests for User Story 3

- [x] T025 [P] [US3] Add failing store tests for AND-based filter combinations and filter reset behavior in `apps/web/src/lib/stores/timeline.test.ts`
- [x] T026 [P] [US3] Add failing filter-bar component tests for label/type/entity filter interaction in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`

### Implementation for User Story 3

- [x] T027 [US3] Extend `apps/web/src/lib/stores/timeline.svelte.ts` with filter state for entity type, labels, and related entities using existing "Labels" terminology
- [x] T028 [US3] Update `apps/web/src/lib/components/timeline/TimelineFilterBar.svelte` to drive the calendar/agenda filters and expose clear-all behavior
- [x] T029 [US3] Normalize any remaining user-facing "tag" language to "label" in `apps/web/src/lib/components/timeline/TimelineFilterBar.svelte` and `apps/web/src/lib/content/help/chronology.md`
- [x] T030 [US3] Run User Story 3 verification for combined filters and filter reset behavior

**Checkpoint**: Large worlds remain scannable through independently testable filter behavior.

---

## Phase 6: User Story 4 - Agenda / List View (Priority: P2)

**Goal**: Users can switch from the month grid to an agenda/list presentation that preserves chronology order and includes `Undated/Approximate` entries.

**Independent Test**: Switch to agenda mode, confirm entries are grouped in chronological order, verify `Undated/Approximate` entries appear only there, and confirm no-events messaging works.

### Tests for User Story 4

- [x] T031 [P] [US4] Add failing agenda view tests for chronological section ordering, `Undated/Approximate` grouping, and no-events messaging in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`
- [x] T032 [P] [US4] Add failing route integration tests for switching between month and agenda modes in `apps/web/src/routes/(app)/timeline/+page.svelte`

### Implementation for User Story 4

- [x] T033 [P] [US4] Implement the agenda/list renderer in `apps/web/src/lib/components/timeline/CalendarAgendaView.svelte`
- [x] T034 [US4] Update `apps/web/src/routes/(app)/timeline/+page.svelte` and `apps/web/src/lib/components/timeline/TimelineLayoutToggle.svelte` to switch cleanly between month and agenda presentations
- [x] T035 [US4] Ensure approximate/missing dates are rendered only in agenda mode via `apps/web/src/lib/stores/timeline.svelte.ts` and `packages/chronology-engine/src/calendar-view.ts`
- [x] T036 [US4] Run User Story 4 verification for agenda ordering, undated grouping, and empty range handling

**Checkpoint**: Users can choose the chronology presentation that best fits dense or sparse event histories.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: World-context integration, help updates, performance checks, and final validation across all stories.

- [x] T037 [P] Surface the calendar experience in the required world front-page/dashboard section by updating `apps/web/src/lib/components/world/FrontPage.svelte` and any supporting world front-page controller files under `apps/web/src/lib/components/world/front-page/`
- [x] T038 [P] Update chronology help content and empty-state guidance in `apps/web/src/lib/content/help/chronology.md` and related help registration files if needed
- [x] T039 Validate month-grid mobile usability, tappable targets, and no-horizontal-scroll behavior across `apps/web/src/lib/components/timeline/CalendarMonthView.svelte`, `apps/web/src/lib/components/timeline/CalendarAgendaView.svelte`, and `apps/web/src/routes/(app)/timeline/+page.svelte`
- [x] T040 [P] Add any missing regression coverage for front-page/world entry points in `apps/web/src/lib/components/world/FrontPage.test.ts`
- [x] T041 Run full validation from `specs/132-calendar-agenda-view/quickstart.md`
- [x] T042 Document manual smoke results for month navigation, agenda mode, filters, overflow access, existing detail navigation, and world-front-page entry points in `specs/132-calendar-agenda-view/quickstart.md`
- [x] T043 Measure and document SC-001 and SC-003 timing checks in `specs/132-calendar-agenda-view/quickstart.md`

---

## Phase 8: Current Date Derivation (FR-012)

**Purpose**: Implement the three-level priority chain that determines the month the calendar opens to.

**⚠️ NEW REQUIREMENT** — Added 2026-06-18. All T04x tasks below are pending.

- [x] T044 [P] Add failing tests for `resolveCalendarCurrentDate` priority chain in `packages/chronology-engine/tests/calendar-view.test.ts`
- [x] T045 [P] Add failing store tests for `calendarCurrentDate` reactive derivation and `activeMonth` initialization from it in `apps/web/src/lib/stores/calendar.svelte.ts`
- [x] T046 Implement `resolveCalendarCurrentDate(entities, settings): CalendarCurrentDateSource` pure helper in `packages/chronology-engine/src/calendar-view.ts` and export from `packages/chronology-engine/src/index.ts`
- [x] T047 Extend `apps/web/src/lib/stores/calendar.svelte.ts` to expose reactive `calendarCurrentDate` using `resolveCalendarCurrentDate`, consuming active world entities and `VaultCalendarSettings.currentYear`
- [x] T048 Wire `calendarCurrentDate` into `apps/web/src/lib/stores/timeline.svelte.ts` so `activeMonth` initializes from the resolved value on mount
- [x] T049 Update `CalendarDayCell` rendering in `apps/web/src/lib/components/timeline/CalendarMonthView.svelte` to set `isToday` when the cell date matches a full `calendarCurrentDate` triple
- [x] T050 Run FR-012 verification: `bun run --filter chronology-engine test`, `bun run --filter web test -- src/lib/stores/calendar`, `bun run --filter '*' lint:types`

---

## Phase 9: User Story 5 - Collapsible Filter Bar on Mobile (FR-013)

**Purpose**: Let mobile users hide the filter bar to reclaim vertical space for the calendar grid or agenda list.

**⚠️ NEW REQUIREMENT** — Added 2026-06-18. All T05x tasks below are pending.

### Tests for User Story 5

- [x] T051 [P] [US5] Add failing component tests for filter bar collapsed-by-default on mobile viewport, expand/collapse toggle interaction, and active-filter indicator visibility when collapsed in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`
- [x] T052 [P] [US5] Add failing tests confirming the collapse control is not rendered at desktop viewport widths in `apps/web/src/lib/components/timeline/CalendarViews.test.ts`

### Implementation for User Story 5

- [x] T053 [US5] Add `filterBarCollapsed: boolean` to the timeline/calendar filter state in `apps/web/src/lib/stores/timeline.svelte.ts`, defaulting to `true` when a mobile-width media query matches on mount
- [x] T054 [US5] Update `apps/web/src/lib/components/timeline/TimelineFilterBar.svelte` to:
  - render a toggle button (mobile only, hidden via Tailwind responsive prefix) that flips `filterBarCollapsed`
  - apply `hidden` / `block` classes to the filter bar body based on `filterBarCollapsed`
  - show an active-filter badge or icon change on the toggle button when any filter is active and the bar is collapsed
- [x] T055 [US5] Ensure that resizing from mobile to desktop clears `filterBarCollapsed` (snap-to-expanded at the desktop breakpoint)
- [x] T056 [US5] Run User Story 5 verification: `bun run --filter web test -- src/lib/components/timeline`, `bun run --filter '*' lint:types`

**Checkpoint**: Mobile users can browse and filter the calendar without the filter bar consuming vertical space by default.

---

## Phase 10: Beyond-Spec Additions (shipped in branch)

These were not in the original spec but were added during implementation and are live in staging.

- [x] T057 Add `epochWeekday?: number` to `WorldCalendar` in `packages/chronology-engine/src/types.ts`; set `epochWeekday: 1` in `DEFAULT_CALENDAR`; use it in `buildCalendarMonth` to correctly anchor world-calendar weekday columns. Add 4 `calendar-view` tests covering this.
- [x] T058 Resolve entity thumbnail in `TimelineEntryItem.svelte` via `vault.resolveImageUrl()` with stale-flag `$effect` (same pattern as `EntityCard`); replace icon placeholder with `background-image` div.
- [x] T059 Open zen mode on mobile entity tap (`window.innerWidth < 768`) in `TimelineEntryItem.svelte`, `CalendarMonthView.svelte`, `CalendarAgendaView.svelte`, and `apps/web/src/routes/(app)/timeline/+page.svelte`.
- [x] T060 Fix FR-012 race condition: `await calendarStore.init()` before `timelineStore.init()` in `+page.svelte`, `FrontPage.svelte`, and the `vault-switched` handler in `app-init.ts`.
- [x] T061 Wire `vault-switched` event in `app-init.ts` to reset and re-initialize `timelineStore` (`resetVaultGuard()` + `init()`) after `calendarStore.init()` resolves.
- [x] T062 Compact mobile calendar grid: `gap-0`, `rounded-none`, `min-h-16` cells; suppress event-type label and "N events" count on mobile; desktop layout unchanged.
- [x] T063 Hide horizontal timeline toggle on mobile (`hidden md:flex`); fall back to `VerticalTimeline` when `viewMode === "horizontal"` on small screens.
- [x] T064 Replace filter dropdowns with explorer-style icon-toggle UI in `TimelineFilterBar.svelte`: icon buttons per category with count badges, label pills, undated toggle — same visual pattern as `EntityListFilterBar`. Update `TimelineStore` to `typeFilters: Set<string>` and `labelFilters: Set<string>` (multi-select).
- [x] T065 Remove embedded `World Calendar` section from `FrontPage.svelte` (added during T037, removed post-review as it added noise without value on mobile).

---

## Phase 11: Calendar UX Enhancements (FR-016–019)

**Purpose**: Power-user interactions — year wheel, hover tooltip, sidebar date jump, and double-click zen mode — shipped on branch `feat/year-wheel-picker-clean` (PR #1422, targeting `staging`).

**⚠️ SHIPPED** — Added 2026-06-19. All tasks completed.

- [x] T068 [FR-016] Implement `YearWheelPicker.svelte` — iOS drum-scroll year selector opened from the active-month title button; confirm via Go button, highlighted-year click, or Enter; cancel via Cancel or Escape; close on backdrop click; `apps/web/src/lib/components/timeline/YearWheelPicker.svelte`
- [x] T069 [FR-016] `years` array derived reactively from bound `year` prop; `$effect` syncs `selectedYear` and scroll position when `year` changes externally; dialog element focused on open for keyboard support; `onDestroy` clears scroll-end timer
- [x] T070 [FR-016] Write `YearWheelPicker.test.ts` — 5 tests covering render, Cancel, Go, Escape, Enter, and highlighted-year-click confirm paths; `apps/web/src/lib/components/timeline/YearWheelPicker.test.ts`
- [x] T071 [FR-014] Wire drag-and-drop onto `CalendarMonthView` day cells: `ondragover`, `ondragenter`, `ondragleave`, `ondrop` handlers in `CalendarMonthView.svelte`; drop priority logic in `+page.svelte` `handleDropEntity`
- [x] T072 [FR-017] Add hover tooltip to `CalendarMonthView.svelte` and `CalendarDayOverflow.svelte` via `GraphTooltip` component; `onEntryHover`/`onEntryLeave` callbacks thread through overflow popup
- [x] T073 [FR-018] Extend `DetailTabs.svelte` with `onDateClick?: (year, month) => void` prop and `getNavigableDate()` helper resolving both `TemporalMetadata` (`.month`) and `DateSelection` (`.unitId` via `calendarEngine.getMonths()`); render clickable calendar-search icon next to date text when prop is provided
- [x] T074 [FR-018] Thread `onDateClick` through `EntityDetailPanel.svelte` and wire it in `+page.svelte` to set `timelineStore.activeYear` / `timelineStore.activeMonth`
- [x] T075 [FR-018] Write `DetailTabs.navigate.test.ts` — 7 tests covering no-button-without-dates, no-button-without-callback, legacy date, DateSelection unitId, unknown unitId fallback, and start_date priority; `apps/web/src/lib/components/entity-detail/DetailTabs.navigate.test.ts`
- [x] T076 [FR-019] Add 220 ms click/dblclick debounce; extract shared factory `createEntryClickHandlers(onSingleClick, onDoubleClick)` with `dispose()` teardown into `apps/web/src/lib/components/timeline/entry-click.ts`; apply in `CalendarMonthView.svelte`, `CalendarAgendaView.svelte`, `CalendarDayOverflow.svelte`; call `dispose()` in `onDestroy` in each component
- [x] T077 Apply theme texture overlay (`--bg-texture-overlay`) to calendar page root div; replace hardcoded colours with semantic Tailwind tokens throughout calendar components
- [x] T078 Update `help-content.ts` hint for `world-chronology` to document year wheel picker, drag-to-set-date, click-date-to-navigate, double-click-for-zen-mode, and include-undated toggle

---

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can begin immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers the MVP month-grid calendar.
- **User Story 2 (Phase 4)**: Depends on Foundational and the month-grid UI from US1.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1 rendering/state work.
- **User Story 4 (Phase 6)**: Depends on Foundational and shares UI/store work from US1 and filter behavior from US3.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.
- **FR-012 / Phase 8**: Depends on Foundational; can run in parallel with US1–US4 stories. Requires `calendar.svelte.ts` and `chronology-engine` changes from Phase 2.
- **FR-013 / Phase 9 (US5)**: Depends on Phase 5 (US3) for the filter bar component; can run after US3 is complete.

### User Story Dependencies

- **User Story 1 (P1)**: First deliverable; no dependency on other user stories after Foundational.
- **User Story 2 (P1)**: Depends on visible calendar entries from US1.
- **User Story 3 (P2)**: Depends on shared timeline store/state from Foundational but is otherwise independently testable.
- **User Story 4 (P2)**: Depends on the shared chronology helpers and view-mode controls; should still be testable independently once implemented.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement package/store logic before Svelte UI wiring when a story depends on derived chronology data.
- Keep existing detail navigation in the app layer rather than moving it into package helpers.
- Finish story-specific verification before proceeding to the next story.

### Parallel Opportunities

- T002 and T003 can run in parallel during setup.
- T005 and T006 can run in parallel because they target package and store tests in different files.
- T012, T013, and T014 can run in parallel as US1 test setup work.
- T020 and T021 can run in parallel for US2.
- T025 and T026 can run in parallel for US3.
- T031 and T032 can run in parallel for US4.
- T037, T038, and T040 can run in parallel during polish.

---

## Parallel Example: User Story 1

```text
Task: "T012 [P] [US1] Add failing month-grid component tests for date placement, empty month state, and previous/next month navigation in apps/web/src/lib/components/timeline/CalendarViews.test.ts"
Task: "T013 [P] [US1] Add failing overflow interaction tests for crowded day cells in apps/web/src/lib/components/timeline/CalendarViews.test.ts"
Task: "T014 [P] [US1] Add failing route integration tests for rendering the month view from timelineStore in apps/web/src/routes/(app)/timeline/+page.svelte"
```

---

## Parallel Example: User Story 3

```text
Task: "T025 [P] [US3] Add failing store tests for AND-based filter combinations and filter reset behavior in apps/web/src/lib/stores/timeline.test.ts"
Task: "T026 [P] [US3] Add failing filter-bar component tests for label/type/entity filter interaction in apps/web/src/lib/components/timeline/CalendarViews.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational chronology helpers and store state.
3. Complete Phase 3: User Story 1 month-grid browsing.
4. Stop and validate the calendar month view independently before expanding scope.

### Incremental Delivery

1. Deliver shared helpers and state.
2. Add month-grid browsing (US1) and validate it as the MVP.
3. Add detail navigation (US2).
4. Add AND-based filtering (US3).
5. Add agenda mode and uncertain-date grouping (US4).
6. Finish with world-context/help polish and full validation.

### Parallel Team Strategy

1. One developer handles chronology-engine helpers and tests while another prepares timeline store/component tests in Phase 2.
2. After Foundational completes:
   - Developer A: month-grid UI and overflow (US1)
   - Developer B: detail navigation wiring (US2)
   - Developer C: filters and agenda mode (US3/US4)
3. Merge back into world-context and help polish once the chronology surfaces are stable.
