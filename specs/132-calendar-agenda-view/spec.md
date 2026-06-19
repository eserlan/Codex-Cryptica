# Feature Specification: Calendar / Agenda View for Events

**Feature Branch**: `132-calendar-agenda-view`
**Created**: 2026-06-17
**Status**: Draft
**Input**: User description: "https://github.com/eserlan/Codex-Cryptica/issues/1408"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse Events by Month (Priority: P1)

A worldbuilder opens the calendar view and sees their world's dated events laid out in a monthly grid, allowing them to quickly understand what happens when in their world's history.

**Why this priority**: This is the core value proposition — a familiar, scannable layout for event chronology. Without it, there's no calendar feature.

**Independent Test**: Can be tested by navigating to the calendar view, verifying events appear on the correct dates in a month grid, and clicking through months.

**Acceptance Scenarios**:

1. **Given** a user has events with dates in their world, **When** they open the calendar view, **Then** events appear as entries on the corresponding dates in a month grid.
2. **Given** a user is viewing a month, **When** they navigate to the previous or next month, **Then** the grid updates to show events in that month.
3. **Given** a month has many events on one date, **When** the user views that date cell, **Then** overflow events are indicated (e.g., "+3 more") and are accessible.

---

### User Story 2 - Open an Event from the Calendar (Priority: P1)

A user clicks an event entry on the calendar and is taken to the existing related entity or event detail view used elsewhere in the app.

**Why this priority**: The calendar is only useful if it connects to the actual content. Navigation to entity details is table stakes.

**Independent Test**: Can be tested by clicking any calendar event entry and verifying it opens the correct entity/event detail view.

**Acceptance Scenarios**:

1. **Given** an event appears on the calendar, **When** the user clicks it, **Then** the related entity or event detail opens.
2. **Given** a user is on a mobile-sized viewport, **When** they tap an event entry, **Then** the detail view opens correctly.

---

### User Story 3 - Filter Calendar by Entity or Type (Priority: P2)

A user filters the calendar to show only events related to a specific world, event type, label, faction, character, or region, so they can focus on a particular thread of history.

**Why this priority**: Without filtering, a world with hundreds of events becomes unreadable. Filtering is essential for large worlds and campaigns.

**Independent Test**: Can be tested by applying a filter (e.g., related entity `faction: Iron Throne` or a specific label) and verifying only matching events remain visible on the calendar.

**Acceptance Scenarios**:

1. **Given** a user has events from multiple factions, **When** they filter by a specific faction, **Then** only events related to that faction appear on the calendar.
2. **Given** a user applies multiple filters, **When** viewing the calendar, **Then** only events matching all selected filters are shown.
3. **Given** a user clears all filters, **When** viewing the calendar, **Then** all events are shown again.

Label filters apply to event metadata labels, while faction, character, and region filters apply through related-entity links.

---

### User Story 4 - Agenda / List View (Priority: P2)

A user switches to an agenda (list) view that shows upcoming or past events in chronological order, suitable for scanning a long timeline without a grid layout.

**Why this priority**: Not all events fit neatly in a month grid (sparse histories, large date ranges). An agenda view covers the gap.

**Independent Test**: Can be tested by switching to agenda mode and verifying events are listed chronologically with their dates.

**Acceptance Scenarios**:

1. **Given** a user is in calendar view, **When** they switch to agenda view, **Then** events are listed in date order with clear date labels.
2. **Given** a user is in agenda view, **When** there are no events in a date range, **Then** the range is skipped or a "no events" message is shown.

---

### User Story 5 - Collapse the Filter Bar on Mobile (Priority: P2)

A user on a phone collapses the filter bar to free up vertical space for the calendar grid or agenda list, then expands it again when they need to change filters.

**Why this priority**: The filter bar takes up significant vertical real estate on small screens. Hiding it by default or on demand lets the grid or agenda fill the screen, which is the primary interaction surface.

**Independent Test**: Can be tested at a mobile viewport width by toggling the filter bar collapse control and verifying the bar disappears and reappears without layout shift in the grid or agenda.

**Acceptance Scenarios**:

1. **Given** a user is on a mobile-sized viewport, **When** they open the calendar or agenda view, **Then** the filter bar is collapsed by default.
2. **Given** the filter bar is collapsed, **When** the user taps the expand control, **Then** the filter bar slides into view and the grid/agenda reflows without horizontal overflow.
3. **Given** the filter bar is expanded, **When** the user taps the collapse control, **Then** the filter bar hides and the grid/agenda expands to fill the reclaimed space.
4. **Given** the filter bar is collapsed and active filters are set, **When** the user views the page, **Then** a visible indicator (e.g., a badge or dot) signals that filters are active even though the bar is hidden.
5. **Given** a user is on a desktop-sized viewport, **When** they view the calendar, **Then** the filter bar is always visible and the collapse control is not shown.

---

### User Story 6 - Drag and Drop Entities to Calendar (Priority: P2)

A user drags an entity from the Entity Explorer and drops it onto a specific date in the calendar month grid to quickly assign or update the date for that entity.

**Why this priority**: Drag and drop provides a highly intuitive and frictionless way to build a timeline, rather than manually typing dates into forms.

**Independent Test**: Can be tested by opening the Entity Explorer alongside the calendar, dragging an entity, and dropping it on a date cell to verify the entity's date is updated.

**Acceptance Scenarios**:

1. **Given** a user is viewing the calendar month grid and has the Entity Explorer open, **When** they drag an entity over a valid date cell, **Then** the date cell visually indicates it is a valid drop target.
2. **Given** a user has dragged an entity over a date cell, **When** they drop the entity, **Then** the entity's date is updated to match the target cell and it immediately appears on the calendar.

---

### User Story 7 - Swipe to Navigate Months on Mobile (Priority: P2)

A user views the calendar on a touch device and swipes left or right to move to the next or previous month.

**Why this priority**: Swipe gestures are native and highly expected interactions on mobile devices.

**Independent Test**: Can be tested on a mobile viewport with touch simulation by swiping horizontally on the calendar grid and verifying the month changes.

**Acceptance Scenarios**:

1. **Given** a user is viewing the calendar on a touch-enabled device, **When** they swipe left across the calendar grid, **Then** the calendar navigates to the next month.
2. **Given** a user is viewing the calendar on a touch-enabled device, **When** they swipe right across the calendar grid, **Then** the calendar navigates to the previous month.

---

### Edge Cases

- What happens when the vault has no "current date" entity and no vault year setting?
- The calendar falls back to the real-world date via `new Date()` as the final step in the FR-012 priority chain.
- What is the matching rule for entity title lookup?
- Title matching is case-insensitive and strips leading/trailing whitespace. It matches the whole title against the set `["current date", "today", "present day", "current day", "now"]`. The first matched entity (sorted by creation date, oldest first) wins. If multiple entities match, the oldest is preferred for stability.
- What happens if the user resizes from mobile to desktop while the filter bar is collapsed?
- The filter bar snaps to expanded state automatically at the desktop breakpoint; the collapsed state is only relevant at mobile widths.
- What happens when an event has no date or an approximate/fuzzy date?
- Events with approximate or missing dates do not appear in exact month-grid day cells; they remain accessible in agenda view under an "Undated/Approximate" grouping.
- How does the calendar handle events spanning multiple days?
- Multi-day events appear on their start date only in v1.
- What happens when a user has no events at all — is there an empty state?
- What happens if there are hundreds of events in a single month?
- Crowded day cells show a fixed number of inline events plus an interactive overflow control (for example, "+3 more") that reveals the full list for that date.
- Events that share the same exact date and time are shown in a stable deterministic order, using title-based ordering when no more specific chronology field distinguishes them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display dated events as calendar entries in a monthly grid view.
- **FR-002**: Users MUST be able to navigate between months (previous/next) in the calendar.
- **FR-003**: System MUST allow users to click/tap a calendar entry to open the existing related entity or event detail view used elsewhere in the app.
- **FR-004**: System MUST provide a list/agenda view as an alternative to the grid view.
- **FR-005**: Users MUST be able to filter events by world, event type, entity label, or related entity (faction, character, region), and when multiple filters are active, an event MUST match all selected filters to remain visible.
- **FR-006**: System MUST handle dates with approximate or missing values gracefully: these events MUST NOT be placed into exact day cells in the month grid, and they MUST remain accessible in agenda view under an "Undated/Approximate" grouping with their uncertainty indicated.
- **FR-007**: System MUST show an empty state when no events match the current view or filters.
- **FR-008**: The calendar view MUST be scoped to the currently-viewed world; events from other worlds do not appear unless the user navigates to that world.
- **FR-009**: System MUST surface the calendar view in three places: the existing chronology route, a dedicated calendar section on the world front page/dashboard for the currently-viewed world, and a **Timeline icon** (`lucide--calendar-days`) in the sidebar activity bar that links directly to the chronology route.
- **FR-010**: Events with dates on the same day MUST all be accessible through a crowded-cell overflow pattern that shows a fixed number of inline events plus an interactive control that reveals the full list for that date.
- **FR-011**: When two or more events share the same exact date and time, the system MUST present them in a stable deterministic order, using title-based ordering when no more specific chronology field distinguishes them.
- **FR-012**: The calendar MUST derive its initial "current date" (the month and day it opens to) using the following priority chain:
  1. **Entity title match** — search the active world's vault entities for one whose title matches `"current date"`, `"today"`, `"present day"`, or similar (case-insensitive, fuzzy). If found and the entity has an exact date, that date is used.
  2. **Vault current-year setting** — if no matching entity is found, read the vault-level `currentYear` setting (or equivalent) stored in the calendar settings store. If set, the calendar opens to January of that year.
  3. **Real-world calendar** — if neither source is available, fall back to the real-world current date (`new Date()`).
     The resolution result MUST be surfaced as a reactive `calendarCurrentDate` value in `apps/web/src/lib/stores/calendar.svelte.ts` so other surfaces (world front page, activity bar entry) inherit the same starting point.
- **FR-013**: On mobile-sized viewports, the filter bar MUST be collapsible. Collapsed is the default state on mobile. The collapsed/expanded state MUST be toggled by a visible control. When active filters are set and the bar is collapsed, the toggle control MUST show a visible indicator (e.g., a badge or icon change) so users know filters are active. On desktop-sized viewports the filter bar is always visible and the collapse control is not rendered.
- **FR-014**: System MUST allow users to drag an entity from the Entity Explorer and drop it onto a date in the calendar month grid to assign or update its date.
- **FR-015**: System MUST support horizontal touch swipe gestures on mobile devices to navigate between previous and next months in the calendar view.

### Key Entities

- **Event**: A worldbuilding entry with a date (exact or approximate), a title, a type or labels, and a link to one or more related entities (faction, character, location, etc.).
- **World**: The top-level container; events belong to a world (and optionally a campaign or region within it).
- **Filter State**: The set of active filters (world, entity, event type, label) that determines which events appear in the current calendar view.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can open the calendar view and see their events within 2 seconds of navigation, measured with a manual smoke check against a representative populated world.
- **SC-002**: Users can navigate from the calendar to an event detail in a single click/tap.
- **SC-003**: Filtering reduces visible events in under 500ms with no full page reload, measured with a manual smoke check against a representative populated world.
- **SC-004**: The calendar correctly places events on the right dates for 100% of events with valid dates.
- **SC-005**: Users with 0 events see a helpful empty state with a prompt to create events.
- **SC-006**: The view is usable on mobile screen sizes (no horizontal scroll, tappable targets).
- **SC-007**: On mobile, the filter bar is collapsed by default; toggling it expands or collapses without horizontal overflow and the active-filter indicator is visible when filters are set.
- **SC-008**: Users can drag an entity and drop it onto a date cell in the calendar to assign that date to the entity.
- **SC-009**: Users on touch devices can swipe left to go to the next month and swipe right to go to the previous month.

## Clarifications

### Session 2026-06-17

- Q: Does the calendar show events across all worlds or scoped to the current world? → A: Scoped to the currently-viewed world; user switches worlds to see that world's calendar.
- Q: For FR-006, how should approximate or missing dates appear in the calendar experience? → A: Keep them out of the month grid; show them only in agenda view under "Undated/Approximate".
- Q: For FR-005, what matching rule should apply when the user selects multiple filters? → A: Events must match all selected filters to remain visible.
- Q: How should multi-day events be displayed in this version? → A: Show them on their start date only in v1.
- Q: For FR-003, what should happen when a user clicks a calendar event entry? → A: Open the existing related entity or event detail view used elsewhere in the app.
- Q: For crowded day cells, how should overflow events be accessed? → A: Show a fixed count plus an interactive "+N more" control that reveals the full list for that date.
- Q: For FR-009, where should the calendar be surfaced in the app? → A: In three places: the existing chronology route, as a dedicated calendar section on the world front page/dashboard, and via a Timeline icon (`lucide--calendar-days`) in the sidebar activity bar linking to the chronology route. The activity bar entry is implemented in `apps/web/src/lib/components/layout/ActivityBar.svelte`.
- Q: How should events with the same exact date and time be ordered? → A: Keep a stable deterministic order using title-based ordering when nothing else distinguishes them.
- Q: How should the calendar determine which month and day it opens to? → A: Use the three-level priority defined in FR-012: (1) a vault entity whose title matches "current date" / "today" / "present day" / etc. and has an exact date; (2) the vault's `currentYear` setting; (3) real-world `new Date()`. The resolved value is stored as `calendarCurrentDate` in `calendar.svelte.ts`.
- Q: Should the collapsible filter bar apply to desktop as well as mobile? → A: Mobile only. On desktop the filter bar is always visible; the collapse control is not rendered at desktop widths.
- Q: What should the active-filter indicator look like when the filter bar is collapsed on mobile? → A: A badge or icon change on the toggle control is sufficient; the exact visual is left to the implementation but MUST be tappable and perceivable without the filter bar open.

## Assumptions

- Fantasy calendar systems (custom month/day names) are **out of scope** for this version; the calendar uses the existing date/event data model, which stores Gregorian-compatible dates.
- The entity-title lookup for FR-012 is a read-only scan; no new entity type or schema field is introduced.
- If the vault `currentYear` setting resolves, the calendar opens to January of that year with no specific day highlighted; the "today" highlight in `CalendarDayCell.isToday` is only set when the final resolution produces a full year-month-day triple.
- The existing entity/event data model already has date fields on event entities; this feature reads from that model rather than introducing a new schema.
- Multi-day spanning events are treated as appearing on their start date only in v1; spanning display can be a follow-on.
- The year/era overview mentioned in the issue is deferred; v1 ships month view + agenda view.
- Authentication and permissions follow existing patterns — users see only events in worlds they have access to.
