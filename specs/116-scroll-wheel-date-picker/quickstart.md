# Quickstart: Scroll Wheel Date Picker

## Goal

Implement the clarified scroll-wheel campaign date picker while preserving local-first chronology data and existing partial dates.

## Prerequisites

- Use the existing Bun workspace install.
- Work on branch `116-scroll-wheel-date-picker`.
- Keep implementation scoped to chronology/date picker files unless tests reveal a necessary schema integration.

## Implementation Order

1. Add failing `chronology-engine` tests for:
   - explicit precision validation,
   - stable named option IDs,
   - intercalary anchor selection,
   - day capping after parent changes,
   - repair state after stale calendar revisions,
   - direct numeric input rejection.
2. Extend `packages/chronology-engine/src/types.ts` and `engine.ts` to satisfy those tests.
3. Update `packages/schema/src/entity.ts` so persisted temporal metadata accepts the new date selection shape without breaking existing dates.
4. Add or update calendar store tests for revision increments and snapshot creation.
5. Replace the detail area in `TemporalPicker.svelte` with the scroll-wheel interaction while keeping the existing popover shell.
6. Add Svelte tests for precision control, invalid direct entry, keyboard/listbox operation, long-label truncation, and repair confirmation.
7. Update `apps/web/src/lib/content/help/chronology.md` with the new picker behavior.

## Local Verification

Run the narrow checks first:

```sh
bun run --filter chronology-engine test
bun run --filter schema test
bun run --filter web test -- TemporalPicker
```

Then run the broader checks required before merge:

```sh
bun run lint
bun run test
```

If the local Husky/Bun launcher still fails with `CouldntReadCurrentDirectory`, record that environment issue and run the package-level checks directly.

## Manual Acceptance

- Open an entity date field and verify the existing date is centered in the wheel picker.
- Switch precision between year, unit, day, and anchor without adding unwanted date parts.
- Configure a custom calendar with long labels and confirm the wheel truncates while the preview shows the full text.
- Change from a long month to a shorter month and confirm the day caps to the new maximum with visible feedback.
- Type an invalid numeric date and confirm the previous valid value remains selected.
- Edit a saved date whose calendar revision is stale and confirm repair state preserves the original until confirmation.
- Use keyboard-only navigation to change every visible wheel column and apply the date.
