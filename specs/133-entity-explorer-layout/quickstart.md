# Quickstart: Entity Explorer Desktop Two-Column Layout

## 1. Read The Feature Context

- Review [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
  [data-model.md](./data-model.md), and
  [the UI contract](./contracts/entity-explorer-workspace.md).
- Confirm the active branch is `133-entity-explorer-layout`.

## 2. Implement In This Order

1. Add failing `LayoutUIStore` tests for the 1280px media-query state and derived
   Explorer workspace eligibility.
2. Add failing Entity Explorer tests proving eligible desktop selection uses the
   existing focus flow and ineligible selection opens the Zen modal.
3. Add failing workspace component tests for the empty state, embedded reader, and
   close action leaving the Explorer workspace available.
4. Implement the constructor-injected wide viewport state and derived eligibility in
   `layout-ui.svelte.ts`.
5. Update Explorer selection wiring and add the app-shell workspace overlay with the
   existing `EmbeddedEntityView`.
6. Add bounded overflow and shrink behavior at the main-pane/workspace boundary.
7. Update the Entity Explorer help article.

## 3. Validation Commands

```bash
bun run --filter web test -- src/lib/stores/ui/layout-ui.test.ts
bun run --filter web test -- src/lib/components/explorer/EntityExplorer.test.ts
bun run --filter web test -- src/lib/components/layout/EntityExplorerWorkspace.test.ts
bun run --filter web lint:types
bun run --filter web lint
bun run --filter web test
```

## 4. Manual Smoke Checks

1. At 1280px or wider, open Entity Explorer and confirm a two-column workspace with
   a stable "Select an entity" state appears in the main pane.
2. Select several entities and confirm the right column matches current Zen Mode,
   including reading, editing, tabs, and internal entity navigation.
3. Use the right-column close action and confirm only the focused reader clears;
   Entity Explorer stays open.
4. At 1279px and below, select an entity and confirm the existing full-screen Zen
   Mode modal opens instead of the workspace overlay.
5. Resize across 1280px with Explorer open; confirm the layout changes once per
   threshold crossing, route content remains available, and no content overlaps or
   page-level horizontal scrolling appears.
6. Open Oracle or close Entity Explorer at 1280px or wider; confirm the workspace
   overlay disappears and the normal single-column route is visible.
7. Reload with Explorer previously open; confirm existing persisted sidebar state
   restores and activates the workspace only at 1280px or wider.
