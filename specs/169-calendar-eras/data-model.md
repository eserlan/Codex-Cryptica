# Data Model: Calendar Eras

**Feature Branch**: `169-calendar-eras`  
**Date**: 2026-10-03  
**Status**: Completed

## 1. Entities & Interfaces

### `CalendarEra`

Represents an epoch, regnal era, or historical age in a calendar.

| Field         | Type                      | Description                                                | Required | Default        |
| :------------ | :------------------------ | :--------------------------------------------------------- | :------- | :------------- |
| `id`          | `string`                  | Unique identifier within the calendar (UUID or nanoid)     | Yes      | Auto-generated |
| `name`        | `string`                  | Human-readable name (e.g. "After the Fall", "Second Age")  | Yes      |                |
| `label`       | `string`                  | Abbreviated label or suffix (e.g. "AF", "SA", "BF")        | No       | undefined      |
| `startYear`   | `number`                  | Internal chronology year at which the era begins           | Yes      |                |
| `endYear`     | `number`                  | Internal chronology year at which the era ends (inclusive) | No       | undefined      |
| `yearAtStart` | `number`                  | Number displayed in the first year of the era              | No       | 1              |
| `direction`   | `"forward" \| "backward"` | Counting direction relative to internal chronology         | No       | `"forward"`    |

### `WorldCalendar` (Additive Extension)

Existing interface in `packages/chronology-engine/src/types.ts`.

```ts
export interface WorldCalendar {
  useGregorian: boolean;
  months: CalendarMonth[];
  daysPerWeek: number;
  epochLabel?: string;
  presentYear?: number;
  revision?: number;
  anchors?: IntercalaryAnchor[];
  epochWeekday?: number;
  /**
   * Optional ordered list of calendar eras for epoch-based year numbering.
   */
  eras?: CalendarEra[];
}
```

### `ResolvedEra`

Runtime result of mapping an internal chronology year into its era representation.

```ts
export interface ResolvedEra {
  era: CalendarEra;
  eraYear: number;
  formattedYear: string; // e.g. "312 BF" or "1 Second Age"
}
```

## 2. Invariants & Validation Rules

1. **Deterministic Conversion**:
   - For any valid `internalYear` within an era's bounds:
     `resolveYearFromEra(era, eraYear) === internalYear`
   - For any positive `eraYear` within an era's span:
     `resolveEraForYear(resolveYearFromEra(era, eraYear)).eraYear === eraYear`
2. **Backward-Compatibility**:
   - When `eras` is undefined or empty (`eras: []`), `CalendarEngine` functions execute legacy logic with zero behavioral difference.
3. **Internal Chronology Priority**:
   - `TemporalMetadata.year` and `DateSelection.year` ALWAYS store the continuous internal chronology year.
   - Eras are purely a presentation and authoring projection layer over the timeline integer.
