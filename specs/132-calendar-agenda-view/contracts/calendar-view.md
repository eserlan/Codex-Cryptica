# Contract: Calendar / Agenda View

This contract defines the internal boundaries between reusable chronology helpers and the Svelte UI that renders month and agenda views.

## 1. Chronology helper contract

Package: `packages/chronology-engine`

Expected pure helper surface:

```ts
export interface CalendarEventEntry {
  entityId: string;
  title: string;
  entityType: string;
  dateKind: "exact" | "approximate" | "missing";
  date: TemporalMetadata | null;
  displayDateLabel: string;
  sortKey?: number;
  relatedEntityIds: string[];
  labels: string[];
}

export interface CalendarFilterInput {
  entityType?: string | null;
  labelIds?: string[];
  relatedEntityIds?: string[];
}

export interface CalendarDayCell {
  date: { year: number; month: number; day: number };
  inCurrentMonth: boolean;
  entries: CalendarEventEntry[];
  overflowCount: number;
}

export interface CalendarMonthViewModel {
  year: number;
  month: number;
  title: string;
  weeks: Array<{ days: CalendarDayCell[] }>;
}

export interface AgendaSection {
  id: string;
  label: string;
  entries: CalendarEventEntry[];
}

export declare function filterCalendarEntries(
  entries: CalendarEventEntry[],
  filters: CalendarFilterInput,
): CalendarEventEntry[];

export declare function buildCalendarMonth(
  entries: CalendarEventEntry[],
  year: number,
  month: number,
  maxVisiblePerDay: number,
): CalendarMonthViewModel;

export declare function buildAgendaSections(
  entries: CalendarEventEntry[],
): AgendaSection[];
```

Rules:

- Helper functions MUST be pure and store-agnostic.
- Approximate or missing dates MUST NOT be placed into exact day cells.
- Filtering MUST use AND semantics across active criteria.
- Same-day ordering MUST remain stable and deterministic.

## 2. UI/store integration contract

App layer: `apps/web/src/lib/stores/timeline.svelte.ts` and timeline/world components

Responsibilities:

- Read vault/world context and derive `CalendarEventEntry` inputs from existing entities.
- Keep world scoping outside the package helpers.
- Track active month/year, agenda/calendar mode, and filter selections.
- Open the existing entity detail view when an event entry is activated.

Expected UI behavior:

- Month view shows a 7-column grid with previous/next month navigation.
- Day cells show a fixed number of inline events and an interactive overflow control when needed.
- Agenda view shows chronologically ordered sections and includes an `Undated/Approximate` section.
- Empty states are shown when no entries match the active filters or month/range.

## 3. Test contract

Required package tests:

- exact-date entries bucket into the correct day cell
- approximate/missing dates are excluded from month cells
- filter combinations use AND semantics
- agenda sections preserve chronological order
- overflow count is computed correctly for crowded days

Required web tests:

- users can navigate months
- users can switch between calendar and agenda modes
- clicking/tapping an entry opens the existing detail view
- empty states render when no matching events exist
- overflow controls reveal hidden events accessibly
