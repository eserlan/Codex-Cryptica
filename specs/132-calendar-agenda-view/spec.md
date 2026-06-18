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

A user filters the calendar to show only events related to a specific world, faction, character, or event type, so they can focus on a particular thread of history.

**Why this priority**: Without filtering, a world with hundreds of events becomes unreadable. Filtering is essential for large worlds and campaigns.

**Independent Test**: Can be tested by applying a filter (e.g., "faction: Iron Throne") and verifying only matching events remain visible on the calendar.

**Acceptance Scenarios**:

1. **Given** a user has events from multiple factions, **When** they filter by a specific faction, **Then** only events related to that faction appear on the calendar.
2. **Given** a user applies multiple filters, **When** viewing the calendar, **Then** only events matching all selected filters are shown.
3. **Given** a user clears all filters, **When** viewing the calendar, **Then** all events are shown again.

---

### User Story 4 - Agenda / List View (Priority: P2)

A user switches to an agenda (list) view that shows upcoming or past events in chronological order, suitable for scanning a long timeline without a grid layout.

**Why this priority**: Not all events fit neatly in a month grid (sparse histories, large date ranges). An agenda view covers the gap.

**Independent Test**: Can be tested by switching to agenda mode and verifying events are listed chronologically with their dates.

**Acceptance Scenarios**:

1. **Given** a user is in calendar view, **When** they switch to agenda view, **Then** events are listed in date order with clear date labels.
2. **Given** a user is in agenda view, **When** there are no events in a date range, **Then** the range is skipped or a "no events" message is shown.

---

### Edge Cases

- What happens when an event has no date or an approximate/fuzzy date?
- Events with approximate or missing dates do not appear in exact month-grid day cells; they remain accessible in agenda view under an "Undated/Approximate" grouping.
- How does the calendar handle events spanning multiple days?
- Multi-day events appear on their start date only in v1.
- What happens when a user has no events at all — is there an empty state?
- What happens if there are hundreds of events in a single month?
- Crowded day cells show a fixed number of inline events plus an interactive overflow control (for example, "+3 more") that reveals the full list for that date.
- How are events displayed when two events share the exact same date and time?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display dated events as calendar entries in a monthly grid view.
- **FR-002**: Users MUST be able to navigate between months (previous/next) in the calendar.
- **FR-003**: System MUST allow users to click/tap a calendar entry to open the existing related entity or event detail view used elsewhere in the app.
- **FR-004**: System MUST provide a list/agenda view as an alternative to the grid view.
- **FR-005**: Users MUST be able to filter events by world, event type, entity tag, or related entity (faction, character, region), and when multiple filters are active, an event MUST match all selected filters to remain visible.
- **FR-006**: System MUST handle dates with approximate or missing values gracefully: these events MUST NOT be placed into exact day cells in the month grid, and they MUST remain accessible in agenda view under an "Undated/Approximate" grouping with their uncertainty indicated.
- **FR-007**: System MUST show an empty state when no events match the current view or filters.
- **FR-008**: The calendar view MUST be scoped to the currently-viewed world; events from other worlds do not appear unless the user navigates to that world.
- **FR-009**: System MUST surface the calendar view within the world detail context (e.g., as a tab or section on the world dashboard).
- **FR-010**: Events with dates on the same day MUST all be accessible (overflow pattern for crowded cells).
- **FR-010**: Events with dates on the same day MUST all be accessible through a crowded-cell overflow pattern that shows a fixed number of inline events plus an interactive control that reveals the full list for that date.

### Key Entities

- **Event**: A worldbuilding entry with a date (exact or approximate), a title, a type/tag, and a link to one or more related entities (faction, character, location, etc.).
- **World**: The top-level container; events belong to a world (and optionally a campaign or region within it).
- **Filter State**: The set of active filters (world, entity, event type, tag) that determines which events appear in the current calendar view.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can open the calendar view and see their events within 2 seconds of navigation.
- **SC-002**: Users can navigate from the calendar to an event detail in a single click/tap.
- **SC-003**: Filtering reduces visible events in under 500ms with no full page reload.
- **SC-004**: The calendar correctly places events on the right dates for 100% of events with valid dates.
- **SC-005**: Users with 0 events see a helpful empty state with a prompt to create events.
- **SC-006**: The view is usable on mobile screen sizes (no horizontal scroll, tappable targets).

## Clarifications

### Session 2026-06-17

- Q: Does the calendar show events across all worlds or scoped to the current world? → A: Scoped to the currently-viewed world; user switches worlds to see that world's calendar.
- Q: For FR-006, how should approximate or missing dates appear in the calendar experience? → A: Keep them out of the month grid; show them only in agenda view under "Undated/Approximate".
- Q: For FR-005, what matching rule should apply when the user selects multiple filters? → A: Events must match all selected filters to remain visible.
- Q: How should multi-day events be displayed in this version? → A: Show them on their start date only in v1.
- Q: For FR-003, what should happen when a user clicks a calendar event entry? → A: Open the existing related entity or event detail view used elsewhere in the app.
- Q: For crowded day cells, how should overflow events be accessed? → A: Show a fixed count plus an interactive "+N more" control that reveals the full list for that date.

## Assumptions

- Fantasy calendar systems (custom month/day names) are **out of scope** for this version; the calendar uses the existing date/event data model, which stores Gregorian-compatible dates.
- The existing entity/event data model already has date fields on event entities; this feature reads from that model rather than introducing a new schema.
- Multi-day spanning events are treated as appearing on their start date only in v1; spanning display can be a follow-on.
- The year/era overview mentioned in the issue is deferred; v1 ships month view + agenda view.
- Authentication and permissions follow existing patterns — users see only events in worlds they have access to.
