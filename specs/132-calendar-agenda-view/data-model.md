# Data Model: Calendar / Agenda View for Events

## CalendarEventEntry

Normalized event-like record derived from an existing vault entity for chronology presentation.

| Field              | Type                                    | Description                                                       | Validation                                |
| ------------------ | --------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `entityId`         | `string`                                | Vault entity identifier to open on click                          | Required                                  |
| `title`            | `string`                                | Display title shown in month or agenda views                      | Required, non-empty                       |
| `entityType`       | `string`                                | Existing vault category id, usually `event` but not limited to it | Required                                  |
| `worldId`          | `string \| null`                        | Active world scope used to include/exclude entries                | Must match current world when shown       |
| `dateKind`         | `"exact" \| "approximate" \| "missing"` | Rendering classification for the view layer                       | Derived from entity temporal metadata     |
| `date`             | `TemporalMetadata \| null`              | Original temporal metadata                                        | Required for exact or approximate entries |
| `displayDateLabel` | `string`                                | Human-readable date string for agenda rows                        | Required                                  |
| `sortKey`          | `number`                                | Stable ordering value for exact chronology sorting                | Required for exact dates                  |
| `relatedEntityIds` | `string[]`                              | Optional relationship filter targets                              | Defaults to empty                         |
| `labels`           | `string[]`                              | Existing labels used by filters                                   | Existing "Labels" terminology only        |

## CalendarMonth

Derived model for one visible month in the grid.

| Field   | Type             | Description                      | Validation                          |
| ------- | ---------------- | -------------------------------- | ----------------------------------- |
| `year`  | `number`         | Visible year                     | Required                            |
| `month` | `number`         | Visible month number             | Required, 1-12 in v1 Gregorian mode |
| `title` | `string`         | Header label such as `June 2026` | Required                            |
| `weeks` | `CalendarWeek[]` | Weeks rendered in the grid       | Required, 4-6 rows                  |

## CalendarWeek

Row model for the month grid.

| Field  | Type                | Description             | Validation          |
| ------ | ------------------- | ----------------------- | ------------------- |
| `days` | `CalendarDayCell[]` | Seven visible day cells | Required, exactly 7 |

## CalendarDayCell

Presentation model for one visible day cell.

| Field            | Type                                           | Description                                                                               | Validation |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `date`           | `{ year: number; month: number; day: number }` | Exact day represented by the cell                                                         | Required   |
| `inCurrentMonth` | `boolean`                                      | Whether the day belongs to the visible month                                              | Required   |
| `entries`        | `CalendarEventEntry[]`                         | Exact-date entries shown inline for this day                                              | Required   |
| `overflowCount`  | `number`                                       | Number of hidden entries behind the overflow control                                      | `>= 0`     |
| `isToday`        | `boolean`                                      | Whether this day matches `calendarCurrentDate` (see FR-012); drives the "today" highlight | Derived    |

## AgendaSection

Grouped list structure for agenda mode.

| Field     | Type                   | Description                                                  | Validation |
| --------- | ---------------------- | ------------------------------------------------------------ | ---------- |
| `id`      | `string`               | Stable section id such as `2026-06` or `undated-approximate` | Required   |
| `label`   | `string`               | Visible group heading                                        | Required   |
| `entries` | `CalendarEventEntry[]` | Chronologically ordered records in that section              | Required   |

## CalendarFilterState

Reactive UI state controlling which entries remain visible.

> **Implemented shape** (differs from original spec): `entityType` and `labelIds` were implemented as `Set<string>` to support multi-select from day one, matching the `EntityListFilterBar` pattern.

| Field                     | Type                                                   | Description                                             | Validation                                                 |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------- |
| `worldId`                 | `string \| null`                                       | Current world scope                                     | Must match current world context                           |
| `typeFilters`             | `Set<string>`                                          | Active category filters; empty set means "all types"    | Existing category ids only                                 |
| `labelFilters`            | `Set<string>`                                          | Active label filters; all must match (AND semantics)    | Uses existing label values                                 |
| `selectedRelatedEntityId` | `string \| null`                                       | Optional single related-entity filter                   | Existing entity ids only                                   |
| `viewMode`                | `"calendar" \| "agenda" \| "vertical" \| "horizontal"` | Active chronology presentation                          | Required                                                   |
| `includeUndated`          | `boolean`                                              | Include undated entries in `calendarEntries` derivation | Defaults to `false`                                        |
| `activeMonth`             | `{ year: number; month: number }`                      | Month currently displayed in the grid                   | Initialized from `calendarCurrentDate`                     |
| `filterBarCollapsed`      | `boolean`                                              | Whether the filter bar is hidden on mobile              | Defaults to `true` on mobile viewports; ignored on desktop |

## CalendarCurrentDateSource

Resolved output of the FR-012 priority chain. Consumed by `calendar.svelte.ts` and exposed as `calendarCurrentDate`.

| Field      | Type                                            | Description                                                           | Validation       |
| ---------- | ----------------------------------------------- | --------------------------------------------------------------------- | ---------------- |
| `source`   | `"entity" \| "vaultSetting" \| "realWorld"`     | Which tier of the priority chain resolved the date                    | Required         |
| `date`     | `{ year: number; month: number; day?: number }` | Resolved date triple; `day` is absent when source is `"vaultSetting"` | Required         |
| `entityId` | `string \| null`                                | Entity that provided the date when `source === "entity"`              | `null` otherwise |

**Priority chain** (FR-012):

1. Scan active world entities for a title matching `["current date", "today", "present day", "current day", "now"]` (case-insensitive) that has an exact date → `source: "entity"`.
2. Read `currentYear` from `VaultCalendarSettings`; if set → `source: "vaultSetting"`, open to January of that year, `day` omitted.
3. Fall back to `new Date()` → `source: "realWorld"`.

## VaultCalendarSettings

Persisted per-vault calendar preferences stored in `apps/web/src/lib/stores/calendar.svelte.ts` via IndexedDB.

| Field         | Type             | Description                                                     | Validation         |
| ------------- | ---------------- | --------------------------------------------------------------- | ------------------ |
| `currentYear` | `number \| null` | Vault-defined "current year" used as the FR-012 tier-2 fallback | `null` means unset |

## WorldCalendar (beyond-spec addition)

The `epochWeekday` field was added to `WorldCalendar` in `packages/chronology-engine/src/types.ts` to support correct weekday column alignment for custom fantasy calendars.

| Field          | Type                     | Description                                                                                                                                                 |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `epochWeekday` | `number` (0–6, optional) | Weekday column that epoch day 0 maps to (0 = Sun … 6 = Sat). Used by `buildCalendarMonth` to anchor the grid. `DEFAULT_CALENDAR` sets this to `1` (Monday). |

## Relationships

- `CalendarEventEntry` records are derived from existing vault entities and never persisted separately.
- `CalendarMonth` contains `CalendarWeek`, which contains `CalendarDayCell`.
- `CalendarDayCell.entries` is a filtered subset of exact-date `CalendarEventEntry` items.
- `AgendaSection.entries` can contain exact, approximate, or missing-date entries depending on section type.
- `CalendarFilterState` is consumed by both month-grid and agenda derivation helpers.

## State Transitions

1. Vault/world context loads existing entities.
2. `calendar.svelte.ts` runs the FR-012 priority chain to resolve `calendarCurrentDate` (`"entity"` → `"vaultSetting"` → `"realWorld"`).
3. App layer derives `CalendarEventEntry` items from eligible entities.
4. Filter state narrows the visible entry set using AND semantics across active filters.
5. `activeMonth` in `CalendarFilterState` is initialized from `calendarCurrentDate`; month navigation updates it independently.
6. Exact-date entries are shaped into a `CalendarMonth` grid for the selected month.
7. Agenda mode groups entries into ordered `AgendaSection` lists plus an `Undated/Approximate` section.
8. `CalendarDayCell.isToday` is set when the cell date matches `calendarCurrentDate` (all three fields present).
9. Selecting an entry routes the user into the existing entity detail experience.
