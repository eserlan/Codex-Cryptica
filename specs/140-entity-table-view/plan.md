# Implementation Plan: Entity Table / List View

**Branch**: `140-entity-table-view` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/140-entity-table-view/spec.md`

> **Note**: Originally retroactive, this plan has been expanded to cover the design and integration of the selection model improvements, double-click navigation, and custom right-click context menu actions (as proposed in issue #1627).

## Summary

Expand the Entity Table view at `/table` with refined row interaction and quick-action context menus:

1. **Interactive Selection model**: Left-click selects rows, double-click opens details/Zen Mode. Modifiers Shift-click (range selection) and Ctrl/Cmd-click (toggle selection) are fully supported. Esc clears selection.
2. **Dynamic Context Menu**: Right-click opens a custom positioned context menu at mouse coordinates. The menu options dynamically display action targets (Label management, Change Type, Delete) and selected counts (e.g. "Delete 5 selected"). All dangerous actions prompt for confirmation modals.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (runes: `$state`, `$derived`, `$effect`), SvelteKit
**Primary Dependencies**: SvelteKit routing (`$app/navigation`, `$app/paths`), Tailwind 4 theme tokens, Lucide icon classes, `schema` workspace package (Entity type)
**Storage**: None added — reads the already-loaded vault from `vault` store (OPFS-backed, client-side); selection/filter/sort/context-menu are transient component state
**Testing**: Vitest unit tests (`entityTableSort`, `entityTableSnippet`, `EntityTable` component, `TableContextMenu` component, route test) + Playwright e2e (`table-bulk-labels.spec.ts`, `table-entity-close.spec.ts`)
**Target Platform**: Browser (local-first web app); works in host and guest session modes
**Project Type**: Web application (SvelteKit app in `apps/web` over `packages/` workspace)
**Performance Goals**: Immediate filter/sort/selection feedback on vaults of several hundred entities; context menu positioning within <16ms.
**Constraints**: Client-side only (Principle V); block write operations for guest sessions; adhere strictly to labels terminology (no "tags" exposed).

## Constitution Check

_GATE: evaluated against constitution v1.3.0._

| Principle                     | Status           | Notes                                                                                                                                                                                                          |
| ----------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Library-First              | PASS (justified) | No new `packages/` package: the selection states and context menus are app-specific UI concerns, so they reside inside `apps/web`. Pure logic is still isolated in importable modules.                         |
| II. TDD                       | PASS             | Unit tests for selection handlers, context menu positioning, component logic, and E2E integration specs.                                                                                                       |
| III. Simplicity & YAGNI / DRY | PASS             | Reuses Svelte 5 runes and native event coordinates for context menus instead of heavy third-party positioning libraries. Reuses global modal stores (`modalUIStore`, `notificationStore`) for confirm dialogs. |
| IV. AI-First Extraction       | N/A              | No AI surface.                                                                                                                                                                                                 |
| V. Privacy & Client-Side      | PASS             | Entirely client-side over the in-memory vault; no network calls.                                                                                                                                               |
| VI. Clean Implementation      | PASS             | Svelte 5 runes, Tailwind theme tokens, `data-testid` hooks, aria-sort/aria-labels.                                                                                                                             |
| VII. User Documentation       | PASS             | Help content explains context menus and selection options.                                                                                                                                                     |
| VIII. Dependency Injection    | N/A              | Consumes existing singletons via props/imports.                                                                                                                                                                |
| IX. Natural Language          | PASS             | Plain copy (e.g. "Delete 5 selected").                                                                                                                                                                         |
| X. Coverage                   | PASS             | Unit tests added for the new components and updated callbacks.                                                                                                                                                 |
| XII. Labels Over Tags         | PASS             | Exclusively utilizes "Labels" terminology. No "tags" mentioned in UI.                                                                                                                                          |

No violations requiring Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/140-entity-table-view/
├── spec.md              # Feature spec (expanded for #1627)
├── plan.md              # This file (expanded for #1627)
├── research.md          # Selection details, positioning details, and dialog bindings
├── data-model.md        # View-level data model updates
├── quickstart.md        # How to run/verify the feature
├── contracts/
│   └── ui-contract.md   # Component props and event callbacks
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/(app)/table/
│   ├── +page.svelte             # View container: owns filters, sort, selection state, context menu state, delete/type confirmations
│   ├── +page.ts                 # ssr=false (client-only)
│   └── page.route.test.ts       # Route-level test
├── lib/components/table/
│   ├── EntityTable.svelte       # <table> shell: forwards clicks and right-clicks, select-all control
│   ├── EntityTableRow.svelte    # Row renderer: processes single click (select), double-click (open), contextmenu (trigger menu)
│   ├── TableContextMenu.svelte  # NEW: Floating custom context menu overlay showing single/bulk actions
│   ├── entityTableSort.ts       # Pure: sorting and date/label helper mappings
│   ├── entityTableSnippet.ts    # Pure: markdown-stripped summary snippet
│   └── __tests__/               # Vitest unit tests for the components and helper functions
├── lib/stores/
│   ├── vault.svelte.ts          # allEntities, updateEntity, deleteEntity
│   ├── ui/modal-ui.svelte.ts    # openBulkLabelDialog(ids), openZenMode(id)
│   └── ui/notification.svelte.ts # confirm dialog wrapper
└── tests/                       # Playwright tests for selection models and context menu triggers
```

**Structure Decision**: Place the new `TableContextMenu.svelte` component alongside the existing table components. Maintain the container/presentational split where `+page.svelte` hosts the selection and context menu states, passing callbacks to children.

## Key Design Decisions

1. **Selection modifier logic**: Toggle selections via `Ctrl/Cmd-click`. Shift-click locates the current row indices within the filtered array and selects the entire span. Esc clears all.
2. **Double-click details route**: Double-clicking rows or single-clicking the Title link triggers detail view navigation/Zen Mode. Left-click anywhere else toggles row selection.
3. **Floating coordinate menu**: Right-clicking triggers a custom styled context menu positioned absolutely/fixed relative to `clientX/Y`. Backdrops/clicks outside or Esc close it.
4. **Contextual count strings**: Action labels inside `TableContextMenu` dynamically compute labels (e.g. "Delete 3 selected") based on target selections.
5. **Modals & confirmation guards**: Delete triggers `notificationStore.confirm`. Type change triggers warning alerts highlighting data/metadata loss.
6. **Guest safety**: Read-only sessions hide or disable write actions from the context menu overlay.

## Complexity Tracking

No constitution violations to justify.
