# Quickstart and Verification

## Before implementation

1. Start from branch `2147-timeline-agenda-bounded-rendering`.
2. Run the existing large-vault performance harness against the current app.
3. Add the date-heavy distribution to the deterministic fixture and capture separate baseline samples for Agenda, Vertical Timeline, and Horizontal Timeline.
4. Record only fixture metadata, counts, timings, mounted entry counts, and interaction phases.

## Targeted checks during implementation

```bash
bun test apps/web/src/lib/stores/timeline.test.ts
bun test apps/web/src/lib/components/timeline/CalendarViews.test.ts
bun run lint
```

Run the relevant Playwright performance test using the repository’s production-preview configuration after the fixture is wired. The exact command should follow the existing `apps/web/playwright.performance.config.ts` setup.

## Manual acceptance path

1. Load the deterministic date-heavy vault locally.
2. Open Agenda, Vertical Timeline, and Horizontal Timeline.
3. Confirm initial mounted entry/card count stays within the documented window budget while the logical count remains available.
4. Scroll through boundaries between years and eras; verify order, headers, selection, keyboard movement, and scroll restoration.
5. Apply and clear filters, select related entities, and navigate rapidly between ranges.
6. Verify approximate, invalid, missing, and empty states.
7. Open Calendar month view and confirm it is unchanged unless benchmark evidence explicitly triggered scope expansion.

## Required test matrix

- Date-heavy success path.
- Range/era change and rapid stale-window/cancellation path.
- Invalid and missing dates.
- Empty filtered result.
- Same-day ordering and related-entity selection.
- Keyboard focus and accessible navigation.
- Scroll restoration after window movement.

## Completion checks

Run the targeted tests, then repository lint/type checks and the benchmark. Compare baseline and final aggregate measurements in a documentation note. Do not add user-authored content to benchmark output.
