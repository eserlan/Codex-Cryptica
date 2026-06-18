# Quickstart: Calendar / Agenda View for Events

## 1. Read the feature context

- Review [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), and [data-model.md](./data-model.md).
- Confirm the active branch is `132-calendar-agenda-view`.

## 2. Implement in this order

1. Add failing pure tests for month-grid shaping, agenda grouping, uncertain-date handling, and AND filter behavior in `packages/chronology-engine/tests/calendar-view.test.ts`.
2. Implement reusable chronology helpers in `packages/chronology-engine/src/calendar-view.ts` and export them from `packages/chronology-engine/src/index.ts`.
3. Add failing store/component tests for:
   - month navigation
   - switching between calendar and agenda modes
   - empty state rendering
   - crowded-cell overflow access
   - entry click opening the existing detail view
4. Extend `apps/web/src/lib/stores/timeline.svelte.ts` to derive world-scoped calendar entries and consume the chronology helpers.
5. Add Svelte UI components for month view, agenda view, and overflow interaction under `apps/web/src/lib/components/timeline/`.
6. Integrate the feature into the existing timeline route, the world detail/front-page entry point, and the sidebar activity bar (`apps/web/src/lib/components/layout/ActivityBar.svelte`) — which already includes a Timeline nav item using `icon-[lucide--calendar-days]` that links to the `/timeline` route.
7. Update help content in `apps/web/src/lib/content/help/chronology.md`.

## 3. Validation commands

Run these after implementation:

```bash
bun run --filter chronology-engine test
bun run --filter web test -- src/lib/components/timeline
bun run --filter web test -- src/lib/stores/timeline.test.ts
bun run --filter '*' lint:types
bun run --filter '*' lint
bun run --filter '*' test -- --changed
```

## 4. Manual smoke checks

1. Open the timeline/calendar experience with a vault containing exact-dated events and confirm the month grid places them on the expected days.
2. Navigate to previous and next months and confirm the grid refreshes without a page reload.
3. Switch to agenda mode and confirm exact, approximate, and missing dates appear in the expected groups.
4. Apply multiple filters and confirm only entries matching all active filters remain visible.
5. Trigger a crowded day and confirm the `+N more` control reveals the full list accessibly on desktop and mobile.
6. Click or tap an entry and confirm the existing detail view opens.

## 5. Manual verification log

### Initial smoke (June 18, 2026)

Manual smoke verification was completed on June 18, 2026 against the local dev server at `http://localhost:5175` using Playwright CLI with seeded demo events.

Timeline route: `http://localhost:5175/timeline?demo=fantasy`

- June 18, 2026 rendered four seeded events in the month grid, with three visible cards and a `+1 more` overflow control.
- Month navigation refreshed in place without a reload. Measured DOM update time was ~101 ms moving to July 2026 and ~100 ms moving back to June 2026.
- Agenda mode showed exact-dated groups plus an `Undated/Approximate` section containing the approximate `Rumored Eclipse` entry.
- With icon-toggle filters `type=event`, `label=royal`, and `related=The Gilded Hand` active simultaneously, only `Banner Procession`, `Royal Coronation`, and `Harvest Accord` remained visible, confirming AND semantics across `typeFilters` and `labelFilters` Sets.
- After clearing filters and enabling the undated toggle, the undated `Lost Ledger` entry appeared without errors.
- Selecting `Royal Coronation` from agenda mode at desktop width set `window.vault.selectedEntityId` to `calendar-crowd-1`.
- At `< 768px` viewport width, tapping `Royal Coronation` opened zen mode (`modalUIStore.openZenMode`) instead.
- Entity thumbnails resolved and displayed in `TimelineEntryItem` entries.
- Filter bar collapsed by default on mobile; active-filter dot badge appeared when filters were set with the bar collapsed.
- FR-012 priority chain verified: setting vault `presentYear` caused the calendar to open to that year; unsetting it fell back to the real-world date.

Front page route: `http://localhost:5175/vault/default?demo=fantasy`

- The embedded `World Calendar` section was present after initial implementation but was subsequently removed (see spec deviation note). Front page no longer includes the calendar widget.

Known runtime noise during manual testing:

- Browser console showed existing third-party/demo asset issues unrelated to this feature: Cloudflare RUM CORS failures and demo image fetch errors.

### Post-merge additions verified (June 18–19, 2026)

- `epochWeekday: 1` on `DEFAULT_CALENDAR` confirmed June 2026 grid starts on Monday column. All 4 new `chronology-engine` week-layout tests pass.
- Vault-switch flow: switching vaults re-resolves FR-012 against the new vault's entities and `presentYear` setting.
- Horizontal timeline Bands button hidden on mobile; vertical timeline renders as fallback when mode is `horizontal` on small screens.
- Compact mobile calendar grid: no gaps between cells, sharp corners, reduced cell height (`min-h-16`). Desktop layout unchanged.
