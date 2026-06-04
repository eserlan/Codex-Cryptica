# Research: Scroll Wheel Date Picker

## Decision: Keep Calendar Semantics In `chronology-engine`

- **Decision**: Extend `packages/chronology-engine` with revisioned calendar config, named unit option identities, intercalary anchors, date precision, repair-state helpers, and wheel column derivation.
- **Rationale**: The constitution requires library-first implementation. Date validity, timeline values, and repair behavior are domain logic that must be testable outside Svelte components and reusable by graph/timeline consumers.
- **Alternatives considered**: Keep all behavior inside `TemporalPicker.svelte` (rejected because it duplicates validation and weakens tests); create a new package (rejected because `chronology-engine` already owns this domain).

## Decision: Use Native Scroll/Listbox Wheel UI First

- **Decision**: Build the visual wheel with Svelte, CSS scroll snapping/transform styling, and keyboard-operable stepper/listbox semantics before considering a third-party wheel library.
- **Rationale**: The project already has Svelte 5, Tailwind tokens, and Floating UI. A native implementation reduces dependency risk, keeps accessibility under direct control, and satisfies the wheel interaction without adding bundle weight.
- **Alternatives considered**: Keen-Slider or another tumbler library (defer unless native implementation fails smoothness/accessibility targets); standard select inputs only (rejected because the feature asks for scroll wheels).

## Decision: Date Selections Store Precision And Calendar Revision

- **Decision**: Persist an explicit precision level and the calendar revision used when saving each date selection.
- **Rationale**: Partial dates and intercalary anchors cannot be inferred safely from missing fields alone once calendars evolve. Revision tracking lets the picker explain and repair stale dates without silent mutation.
- **Alternatives considered**: Infer precision from missing `month`/`day` only (rejected because anchors and repair states need explicit shape); store only global calendar revision (rejected because individual saved dates need provenance).

## Decision: Stable Named Option Identities

- **Decision**: Named calendar values use stable IDs separate from label text and display order.
- **Rationale**: This preserves saved dates across month/season/festival renames and reordering. Existing `CalendarMonth.id` already supports this pattern and should be generalized for named units and anchors.
- **Alternatives considered**: Save by label text (breaks on rename); save by array index only (breaks on reorder).

## Decision: Repair State Is User-Confirmed

- **Decision**: Invalid saved dates open in repair state, preserve the original value, and require user confirmation before replacement.
- **Rationale**: Campaign chronology is authored content. Silent date repair can alter lore and timeline ordering without consent.
- **Alternatives considered**: Auto-cap invalid saved dates on open (rejected as silent data loss); block opening until calendar fixed (too disruptive).

## Decision: Snapshot Open Picker Sessions

- **Decision**: An open picker evaluates against the calendar snapshot it opened with; if the calendar changes before save, the picker must refresh or enter repair before confirming.
- **Rationale**: This prevents saving dates computed from mixed calendar rules during cross-tab or settings edits.
- **Alternatives considered**: Live-update the picker immediately (risk of surprising in-progress edits); ignore changes until close (risk of saving stale rules without warning).

## Best Practices

- Keep wheel row heights and column widths stable; truncate long wheel labels with an ellipsis and show the complete date in the preview.
- Use direct numeric entry or jump controls for large numeric ranges; do not require long drag gestures.
- Expose each wheel column as a keyboard-operable stepper or listbox with current-value announcements.
- Test both semantic logic and Svelte behavior: valid selection, invalid direct entry, capping, repair state, stale snapshot, anchor precision, and mobile label overflow.
