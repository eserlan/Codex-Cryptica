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

| Field            | Type                                           | Description                                            | Validation |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------- |
| `date`           | `{ year: number; month: number; day: number }` | Exact day represented by the cell                      | Required   |
| `inCurrentMonth` | `boolean`                                      | Whether the day belongs to the visible month           | Required   |
| `entries`        | `CalendarEventEntry[]`                         | Exact-date entries shown inline for this day           | Required   |
| `overflowCount`  | `number`                                       | Number of hidden entries behind the overflow control   | `>= 0`     |
| `isToday`        | `boolean`                                      | Optional current-date highlight for future enhancement | Derived    |

## AgendaSection

Grouped list structure for agenda mode.

| Field     | Type                   | Description                                                  | Validation |
| --------- | ---------------------- | ------------------------------------------------------------ | ---------- |
| `id`      | `string`               | Stable section id such as `2026-06` or `undated-approximate` | Required   |
| `label`   | `string`               | Visible group heading                                        | Required   |
| `entries` | `CalendarEventEntry[]` | Chronologically ordered records in that section              | Required   |

## CalendarFilterState

Reactive UI state controlling which entries remain visible.

| Field                       | Type                     | Description                              | Validation                         |
| --------------------------- | ------------------------ | ---------------------------------------- | ---------------------------------- |
| `worldId`                   | `string \| null`         | Current world scope                      | Must match current world context   |
| `entityType`                | `string \| null`         | Optional category filter                 | Existing category ids only         |
| `labelIds`                  | `string[]`               | Optional label-based filters             | Uses existing label values         |
| `relatedEntityIds`          | `string[]`               | Optional related-entity filters          | Existing entity ids only           |
| `mode`                      | `"calendar" \| "agenda"` | Active chronology presentation           | Required                           |
| `includeUndatedApproximate` | `boolean`                | Agenda-only visibility toggle if exposed | Defaults to `true` for agenda mode |

## Relationships

- `CalendarEventEntry` records are derived from existing vault entities and never persisted separately.
- `CalendarMonth` contains `CalendarWeek`, which contains `CalendarDayCell`.
- `CalendarDayCell.entries` is a filtered subset of exact-date `CalendarEventEntry` items.
- `AgendaSection.entries` can contain exact, approximate, or missing-date entries depending on section type.
- `CalendarFilterState` is consumed by both month-grid and agenda derivation helpers.

## State Transitions

1. Vault/world context loads existing entities.
2. App layer derives `CalendarEventEntry` items from eligible entities.
3. Filter state narrows the visible entry set using AND semantics across active filters.
4. Exact-date entries are shaped into a `CalendarMonth` grid for the selected month.
5. Agenda mode groups entries into ordered `AgendaSection` lists plus an `Undated/Approximate` section.
6. Selecting an entry routes the user into the existing entity detail experience.
