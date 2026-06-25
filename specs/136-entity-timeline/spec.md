# Feature Specification: Entity Timeline (MVP)

**Feature Branch**: `136-entity-timeline`  
**Created**: 2026-06-24  
**Status**: Draft  
**Source**: GitHub issue #1511 (parent epic #1510)  
**Input**: User description: "Read-only chronological timeline of events linked to an entity, shown as a section/tab on entity detail pages."

## Overview

Give users a focused history view for a single entity. An entity (faction, character, location, item) can participate in many historical or campaign events, but today those events are hard to see from the entity's own page. This feature surfaces the events already linked to the current entity as a read-only, chronologically ordered list attached to the entity detail page.

The intent is a focused history panel attached to the entity — not a new global chronology system, and not an event editor. The feature becomes valuable the moment already-linked events are visible in one place.

## Clarifications

### Session 2026-06-24

- Q: Which events count as "linked" to the entity? → A: Direct links only — events one hop away where the entity is a participant/related entity of the event (no multi-hop graph traversal).
- Q: How is the Timeline presented on the entity detail page? → A: A dedicated Timeline tab alongside the existing entity-detail tabs.
- Q: What chronological direction do dated events use? → A: Earliest → latest, with the Undated group at the end.
- Q: How does the MVP handle an entity with many linked events? → A: Show all linked events in one scrollable list; no cap or pagination in this MVP.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See an entity's history in one place (Priority: P1)

A worldbuilder opens a faction's detail page and wants to understand its history at a glance: when it was founded, when it splintered, which wars it fought, when it declined. They open the entity's Timeline and see the events already linked to that faction, ordered from earliest to latest, each showing enough information to scan quickly.

**Why this priority**: This is the core value of the feature — making linked events visible from the entity itself. Without it, there is no feature. It is independently shippable and demonstrable on its own.

**Independent Test**: Open an entity that has several linked events with dates, open its Timeline, and confirm the events appear in chronological order with readable summaries. Delivers the "focused history" value with nothing else built.

**Acceptance Scenarios**:

1. **Given** an entity with multiple linked events that have dates, **When** the user opens the entity's Timeline, **Then** all linked events are shown ordered chronologically from earliest to latest.
2. **Given** a timeline event, **When** the user views its row, **Then** it shows the event title and its date (or date range) when available.
3. **Given** an event that has a type/category, a short summary, and/or related participants, **When** it is shown in the timeline, **Then** that information is displayed if it is readily available.

---

### User Story 2 - Open an event from the timeline (Priority: P1)

While scanning an entity's history, the user spots an event they want to inspect in full and clicks it to open that event's own detail page.

**Why this priority**: Navigation to the full event closes the loop between "scan history" and "read detail." It is small but essential to making the timeline useful rather than a dead-end list.

**Independent Test**: Click a timeline event and confirm the application navigates to that event's detail page.

**Acceptance Scenarios**:

1. **Given** a timeline showing linked events, **When** the user clicks an event, **Then** the application opens that event's detail page.

---

### User Story 3 - Undated events remain visible (Priority: P2)

Some linked events have no date yet. The user still needs to know they exist and are part of the entity's history, without the system guessing when they happened.

**Why this priority**: Worldbuilding data is frequently incomplete. Hiding undated events would silently lose information and erode trust. It builds on Story 1 but is separable.

**Independent Test**: Link an event with no date to an entity, open the Timeline, and confirm the event appears in a clearly labelled "Undated" group rather than being hidden or assigned a made-up date.

**Acceptance Scenarios**:

1. **Given** an entity with both dated and undated linked events, **When** the user opens the Timeline, **Then** dated events appear in chronological order and undated events appear in a clearly labelled "Undated" group at the end.
2. **Given** an undated event, **When** it is shown, **Then** the system does not display or infer any date for it.

---

### User Story 4 - Helpful empty state (Priority: P2)

The user opens the Timeline for an entity that has no linked events and is told, clearly, that there is no history yet and how to start building one.

**Why this priority**: Most entities will start with zero linked events. A blank or broken-looking panel would confuse users; a clear empty state sets expectations. Separable from the main list.

**Independent Test**: Open the Timeline for an entity with no linked events and confirm a clear empty-state message is shown.

**Acceptance Scenarios**:

1. **Given** an entity with no linked events, **When** the user opens the Timeline, **Then** an empty state is shown explaining the entity has no linked timeline events yet (e.g. "No linked events yet. Add or link events to build this entity's history.").

---

### Edge Cases

- **Mixed dated and undated events**: dated events sort chronologically; undated events group together at the end under a clear label.
- **Date ranges**: an event with a start and end date displays as a range and sorts by its start.
- **Equal/identical dates**: events sharing the same date appear together; ordering between them is stable and predictable (no flicker on reload).
- **Partial dates** (year only, or year+month): supported using whatever precision exists, without fabricating the missing parts.
- **Long lists**: an entity with many linked events remains readable and scrollable without the page becoming unusable.
- **Missing optional fields**: events lacking a summary, type, or participants still render cleanly using whatever fields are present.
- **Entity types without events**: an entity type that cannot link to events does not show a broken or misleading Timeline.
- **Self-reference**: the current entity is not redundantly listed as a "participant" of its own events in a way that adds noise.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Timeline MUST be presented as a dedicated tab in both the entity detail panel (sidebar/full-page) and Zen Mode — the primary mobile entry point. The tab is shown for all entity types (every entity may hold links to events); at minimum it MUST work for factions, characters, locations, and items. When the entity is itself an event, the tab simply shows the events linked to that event.
- **FR-002**: The Timeline MUST show the events directly linked to the current entity — events one hop away where the entity is a participant/related entity — and only those events. The Timeline MUST NOT traverse multi-hop relationships to surface indirectly connected events.
- **FR-003**: The Timeline MUST order dated events chronologically from earliest to latest.
- **FR-004**: Each timeline entry MUST display the event title.
- **FR-005**: Each timeline entry MUST display the event's date or date range when a date is available.
- **FR-006**: Each timeline entry MUST display the event's category, a short summary/snippet, and related participants when those are available and inexpensive to show. The event "category" is derived from the event's Labels (never the entity-type value `"event"`, which is identical for every row), and MUST be presented as a Label — not a "Tag".
- **FR-007**: Users MUST be able to click a timeline entry to open that event in the same view they are currently in — Zen Mode opens the event in Zen Mode; the entity detail panel opens it in the sidebar panel.
- **FR-008**: The Timeline MUST place events that have no date in a clearly labelled "Undated" group, ordered after all dated events.
- **FR-009**: The system MUST NOT invent, infer, or auto-assign dates for undated events.
- **FR-010**: The Timeline MUST be read-only: it MUST NOT create, edit, delete, reorder, or otherwise mutate events, the entity, or any lore as a side effect of viewing it.
- **FR-011**: When the current entity has no linked events, the Timeline MUST show a clear, useful empty state that explains the absence and suggests adding or linking events.
- **FR-012**: The Timeline MUST display all linked events in a single scrollable list and remain readable and scannable when an entity has many linked events; the MVP applies no cap or pagination.
- **FR-013**: The Timeline MUST reflect the events currently linked to the entity (i.e. it shows existing links, and does not require a separate manual refresh to show already-linked events on open).

### Key Entities _(include if feature involves data)_

- **Entity**: The subject whose page is being viewed (e.g. faction, character, location, item). Owns or participates in a set of linked events. Has a type that determines whether a Timeline is applicable.
- **Event**: A historical or campaign occurrence linked to one or more entities. May have a title, an optional date or date range (at varying precision), an optional type/category, an optional summary, and optional related participants. Events are the items shown in the Timeline and are the navigation targets.
- **Entity–Event link**: The existing relationship that associates an event with an entity. This feature reads these links; it does not create them.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From an entity detail page, a user can locate and open the Timeline in a single interaction (one click/tap).
- **SC-002**: For an entity with linked dated events, 100% of those events appear and are correctly ordered earliest-to-latest, verifiable against their dates.
- **SC-003**: For an entity with undated linked events, 100% of those events remain visible and are shown under a clearly labelled "Undated" group, with no fabricated dates.
- **SC-004**: A user can go from scanning the Timeline to viewing any event's full detail in one click/tap.
- **SC-005**: Opening the Timeline never changes the entity's or events' data — repeated opens leave underlying lore byte-for-byte unchanged.
- **SC-006**: For an entity with no linked events, a user sees a clear explanation rather than a blank or error state, on 100% of such entities.
- **SC-007**: The Timeline works for at least factions, characters, locations, and items that can link to events.

## Assumptions

- "Linked events" means events directly (one hop) associated with the entity through the existing entity/event linking model — the entity appears as a participant/related entity of the event. This feature surfaces those direct links and does not define new linking mechanics or traverse multi-hop relationships.
- Events are represented as entities of the "event" type and may carry exact dates, date ranges, or partial-precision dates already supported by the world calendar; no new date model is introduced.
- The Timeline tab is surfaced in both `EntityDetailPanel` (sidebar/full-page views) and `ZenView` (zen mode / modal), which is the primary entry point on mobile.
- Chronological ordering uses each event's existing date information; events with only partial precision are ordered using the precision available.
- "Inexpensive to show" participant/summary data means data already available alongside the linked events without additional heavy lookups; if such data is not cheaply available for a given event, that field may be omitted for that row.

## Non-Goals

- No inline event creation from the timeline.
- No AI extraction, event suggestion, or automatic linking.
- No timeline editing, reordering, or drag-and-drop temporal placement.
- No side-by-side or multi-entity timeline comparison.
- No global timeline / chronology redesign.
- No automatic rewriting or inference of entity text or lore.
