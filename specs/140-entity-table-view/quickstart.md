# Quickstart: Entity Table / List View

## Run it

```bash
bun install
bun run dev            # from repo root (or apps/web)
```

Open the app, open (or create) a vault with a few entities, then navigate to **Entity Table** (ActivityBar / mobile menu), or go to `/table` directly.

## Try the feature

1. **Overview**: every entity appears as a row — name, type badge, connections (`total` + `in/out`), summary snippet, label chips, created, modified. Missing values show "—".
2. **Filter**: type in the search box (`name`, content text, or `#label`); toggle type pills; click a row's type badge or label chip to filter by it; "Clear" resets everything.
3. **Sort**: click any header except Summary; click again to reverse. Sort by Modified descending and note entities without timestamps stay at the bottom.
4. **Select + bulk labels**: check a few rows (or the header checkbox for all filtered rows) → toolbar shows the count → "Add / remove labels" opens the shared bulk dialog. Changing a filter clears the selection; changing sort does not.
5. **Open**: click a row to open the entity; ctrl/cmd-click the title to open in a new tab. In a guest share link, opening uses the in-place Zen view.
6. **Selection Interaction Refinement (#1627)**:
   - Left-clicking a row background toggles selection state instead of navigating immediately.
   - Double-clicking anywhere on a row background navigates to details / Zen Mode.
   - Ctrl/Cmd-click on a row background toggles individual selection state.
   - Shift-click on a row background selects a range of rows between the clicked row and the last clicked row anchor.
   - Pressing `Esc` clears the entire active row selection.
7. **Context Menu (#1627)**:
   - Right-click an unselected row: it clears previous selection, selects the targeted row, and opens the custom positioned context menu at the mouse pointer location.
   - Right-click a selected row: it preserves the current multi-selection and opens the bulk context menu.
   - The context menu options include dynamic counts (e.g. "Delete 3 selected") and support: "Add label", "Remove label", "Change type", and "Delete".
   - Confirmations are requested for all deletion operations and type change operations.
   - Clicks outside or pressing `Esc` dismisses the context menu.

## Verify

```bash
# Unit tests (sort, snippet, table components, route, and context menu)
bun run test --filter web -- table

# Lint + types
bun run lint

# E2E (Playwright)
bunx playwright test table-bulk-labels table-entity-close
```

Key test files:

- `apps/web/src/lib/components/table/__tests__/entityTableSort.test.ts`
- `apps/web/src/lib/components/table/__tests__/entityTableSnippet.test.ts`
- `apps/web/src/lib/components/table/__tests__/EntityTable.test.ts`
- `apps/web/src/lib/components/table/__tests__/TableContextMenu.test.ts` (NEW)
- `apps/web/src/routes/(app)/table/page.route.test.ts`
- `apps/web/tests/table-bulk-labels.spec.ts`
- `apps/web/tests/table-entity-close.spec.ts`
