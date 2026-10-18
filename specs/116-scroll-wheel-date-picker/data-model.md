# Data Model: Scroll Wheel Date Picker

## Entities

### WorldCalendar

Campaign-level calendar configuration.

| Field                | Type                   | Description                                                       | Validation                                |
| -------------------- | ---------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `useGregorian`       | `boolean`              | Whether standard Gregorian month rules are active                 | Required                                  |
| `revision`           | `number`               | Monotonic version incremented whenever calendar structure changes | Required, >= 1                            |
| `months`             | `CalendarUnitOption[]` | Ordered month options for non-Gregorian calendars                 | At least one when `useGregorian` is false |
| `intercalaryAnchors` | `IntercalaryAnchor[]`  | Named date anchors outside normal month/day hierarchy             | Optional                                  |
| `daysPerWeek`        | `number`               | Number of days in a campaign week                                 | Integer > 0                               |
| `epochLabel`         | `string`               | Optional suffix for displayed years                               | Optional                                  |
| `presentYear`        | `number`               | Narrative present-year marker                                     | Optional                                  |

### CalendarUnitOption

A selectable named value in a calendar unit, such as a month, season, phase, or future named unit.

| Field   | Type     | Description                                                             | Validation                                |
| ------- | -------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| `id`    | `string` | Stable identity used by saved dates                                     | Required, unique within the calendar unit |
| `label` | `string` | User-facing display text                                                | Required, non-empty                       |
| `order` | `number` | Sort/display order in the unit                                          | Required                                  |
| `days`  | `number` | Number of child day positions when the option acts as a month-like unit | Optional; integer > 0 when present        |

### IntercalaryAnchor

A named saved date position outside the standard month/day hierarchy.

| Field         | Type     | Description                                         | Validation          |
| ------------- | -------- | --------------------------------------------------- | ------------------- |
| `id`          | `string` | Stable anchor identity                              | Required, unique    |
| `label`       | `string` | User-facing anchor label                            | Required, non-empty |
| `afterUnitId` | `string` | Optional unit option after which the anchor appears | Optional            |
| `order`       | `number` | Position among anchors and unit options             | Required            |

### DateSelection

Persisted temporal metadata for entity date fields.

| Field | Type | Description | Validation |
| ------------------ | -------- | ---------------------------------------------- | ------------------------------------------------- | --------- | ------------------------------------------ | -------- |
| `precision` | `"year"  | "unit"                                         | "day"                                             | "anchor"` | Explicit date precision chosen by the user | Required |
| `year` | `number` | Campaign year | Required for all precision levels |
| `unitId` | `string` | Stable ID for the selected month/unit option | Required for `unit` and `day` precision |
| `day` | `number` | Day number within the selected unit | Required for `day` precision; within active range |
| `anchorId` | `string` | Stable intercalary anchor ID | Required for `anchor` precision |
| `label` | `string` | Optional legacy/display label | Optional |
| `calendarRevision` | `number` | Calendar revision used when the date was saved | Required for new saves |

### CalendarSnapshot

The calendar rules captured when a picker session opens.

| Field      | Type            | Description                             | Validation                  |
| ---------- | --------------- | --------------------------------------- | --------------------------- |
| `calendar` | `WorldCalendar` | Calendar config used by the open picker | Required                    |
| `revision` | `number`        | Snapshot revision                       | Matches `calendar.revision` |

### RepairState

Temporary picker state for a saved date that no longer validates under the active calendar.

| Field | Type | Description | Validation |
| ---------------------- | --------------- | ----------------------------------------- | ---------------------------- | ----------------- | -------------------- | -------- |
| `originalSelection` | `DateSelection` | The saved date before repair | Required |
| `suggestedSelection` | `DateSelection` | Nearest valid replacement | Required before confirm |
| `reason` | `"missing-unit" | "missing-anchor"                          | "day-overflow"               | "stale-revision"` | Why repair is needed | Required |
| `requiresConfirmation` | `boolean` | Whether user confirmation is still needed | Must be true until confirmed |

### WheelColumnState

Derived UI state for one visible wheel column.

| Field            | Type            | Description                                                 | Validation |
| ---------------- | --------------- | ----------------------------------------------------------- | ---------- |
| `id`             | `string`        | Column identity, such as `year`, `unit`, `day`, or `anchor` | Required   |
| `label`          | `string`        | Accessible column name                                      | Required   |
| `options`        | `WheelOption[]` | Ordered selectable values                                   | Required   |
| `selectedId`     | `string`        | Active option identity                                      | Required   |
| `canDirectEnter` | `boolean`       | Whether numeric direct entry/jump controls are available    | Required   |

## Relationships

- **WorldCalendar** `1 -- N` **CalendarUnitOption**
- **WorldCalendar** `1 -- N` **IntercalaryAnchor**
- **DateSelection** `N -- 1` **WorldCalendar** via `calendarRevision`
- **DateSelection** `N -- 0..1` **CalendarUnitOption** via `unitId`
- **DateSelection** `N -- 0..1` **IntercalaryAnchor** via `anchorId`
- **CalendarSnapshot** `1 -- 1` **WorldCalendar**
- **RepairState** `1 -- 1` original **DateSelection**
- **RepairState** `1 -- 1` suggested **DateSelection**

## State Transitions

### Picker Session

1. Opens with `DateSelection` and `CalendarSnapshot`.
2. Derives wheel columns from selected precision and snapshot rules.
3. User changes precision or wheel values.
4. Selection validates against snapshot.
5. If active calendar revision changed before save, user must refresh or repair.
6. Save writes a valid `DateSelection` with current calendar revision.

### Repair State

1. Saved date fails validation under active calendar.
2. Picker preserves `originalSelection`.
3. Engine derives `suggestedSelection` and `reason`.
4. User confirms replacement or cancels.
5. Confirmed replacement saves with the active calendar revision.

## Validation Rules

- Direct numeric input outside the active range is rejected with inline feedback and does not replace the last valid value.
- Parent-unit changes evaluate top down; if a child day exceeds the new range, it caps to the maximum allowed value.
- Intercalary anchors use `precision: "anchor"` and must not be forced into `unitId`/`day`.
- Named options and anchors are referenced by stable IDs, not labels or array positions.
- Long labels may be truncated in wheel columns, but the preview must show the full formatted date.
