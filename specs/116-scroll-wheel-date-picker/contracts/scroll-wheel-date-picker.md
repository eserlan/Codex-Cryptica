# Contract: Scroll Wheel Date Picker

This contract describes the internal TypeScript boundaries between `chronology-engine`, persisted schema types, calendar settings, and the Svelte date picker UI.

## Chronology Engine Contract

`packages/chronology-engine` owns calendar semantics and must expose pure, testable helpers.

```ts
export type DatePrecision = "year" | "unit" | "day" | "anchor";

export interface DateSelection {
  precision: DatePrecision;
  year: number;
  unitId?: string;
  day?: number;
  anchorId?: string;
  label?: string;
  calendarRevision: number;
}

export interface CalendarSnapshot {
  config: WorldCalendar;
  revision: number;
}

export interface RepairState {
  originalSelection: DateSelection;
  suggestedSelection: DateSelection;
  reason: "missing-unit" | "missing-anchor" | "day-overflow" | "stale-revision";
  requiresConfirmation: true;
}

export interface WheelColumnState {
  id: "year" | "unit" | "day" | "anchor";
  label: string;
  options: WheelOption[];
  selectedId: string;
  canDirectEnter: boolean;
}

export interface WheelOption {
  id: string;
  label: string;
  value: number | string;
  disabled?: boolean;
}
```

Required behavior:

- `isValid(selection, snapshot)` validates explicit precision, stable IDs, intercalary anchors, and day ranges.
- `deriveWheelColumns(selection, snapshot)` returns stable column options for the picker.
- `applyParentChange(selection, patch, snapshot)` evaluates constraints top down and caps child day values when needed.
- `parseDirectDateInput(input, snapshot)` rejects invalid direct entries without mutating the previous valid selection.
- `getRepairState(selection, currentSnapshot)` preserves the original selection and suggests a user-confirmed replacement when needed.
- `format(selection, snapshot)` returns the full untruncated preview text.

## Schema Contract

`packages/schema/src/entity.ts` must accept the new date selection shape while preserving existing vault compatibility.

Rules:

- Existing `{ year, month?, day?, label? }` values remain readable.
- New saves include explicit `precision` and `calendarRevision`.
- Month-like selections should persist stable IDs for named values when available.
- Anchor selections must persist `anchorId` and must not fabricate `month` or `day`.
- Migration/normalization must be lossless for existing partial dates.

## Calendar Store Contract

`apps/web/src/lib/stores/calendar.svelte.ts` owns local persistence of the active vault calendar.

Rules:

- `setConfig` increments or assigns a calendar revision whenever structural date rules change.
- Picker sessions receive a snapshot, not a mutable live object.
- Calendar changes while a picker is open invalidate that picker for save until refresh or repair.
- Settings remain scoped to the active vault and browser-local storage.

## Temporal Picker UI Contract

`apps/web/src/lib/components/timeline/TemporalPicker.svelte` owns presentation and interaction.

Rules:

- Provides an explicit precision control: year, unit, day, anchor where applicable.
- Displays wheel columns whose active values are centered and snapped.
- Provides direct numeric entry or jump controls for large numeric ranges.
- Rejects invalid direct numeric entries with inline feedback and keeps the last valid value.
- Exposes each wheel column as keyboard-operable stepper/listbox behavior with accessible names and current-value announcements.
- Truncates long wheel labels with an ellipsis on small viewports and displays the full date in the preview.
- Shows repair state before saving invalid saved dates and requires user confirmation.

## Help Documentation Contract

`apps/web/src/lib/content/help/chronology.md` must describe:

- Scroll-wheel date picking.
- Explicit precision choices.
- Custom calendar names and intercalary anchors.
- Why a date may need review after calendar edits.
- Direct entry/jump controls for large ranges.
