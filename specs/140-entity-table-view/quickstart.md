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

## Verify

```bash
# Unit tests (sort, snippet, table component, route)
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
- `apps/web/src/routes/(app)/table/page.route.test.ts`
- `apps/web/tests/table-bulk-labels.spec.ts`
- `apps/web/tests/table-entity-close.spec.ts`
