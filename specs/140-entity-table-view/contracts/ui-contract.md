# UI Contract: Entity Table / List View

> Retroactive. Routes, component props, and stable test hooks the rest of the app (and the test suites) rely on.

## Route

| Route    | Behavior                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| `/table` | Vault-wide entity table for the active vault. `ssr = false`. Renders loading / no-vault / empty-vault / table states. |

Navigation entry points: ActivityBar, MobileMenu, SearchModal ("table" view target).

## Component Contracts

### `EntityTable.svelte`

```ts
{
  entities: Entity[];                                  // pre-filtered, pre-sorted rows
  vaultId: string;
  sort: SortState;
  connectionCounts?: Record<string, ConnectionSummary>;
  onSort: (key: SortKey) => void;
  selectedIds?: Set<string>;
  allSelected?: boolean;
  someSelected?: boolean;                              // drives indeterminate header checkbox
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  onFilterType?: (type: string) => void;
  onFilterLabel?: (label: string) => void;
}
```

Stateless renderer; all state owned by the route page. Sortable headers expose `aria-sort`.

### `EntityTableRow.svelte`

```ts
{
  entity: Entity;
  vaultId: string;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  connectionSummary: ConnectionSummary;
  onFilterType?: (type: string) => void;
  onFilterLabel?: (label: string) => void;
}
```

Behavioral contract:

- Title `<a href>` → `/vault/:vaultId/entity/:entityId` (host) or guest entity URL (guest).
- Modifier-clicks (ctrl/cmd/shift/middle) on the title are NOT intercepted.
- Row-background click opens the entity; clicks inside `a`, `button`, or `[data-row-select]` do not.
- Guest mode: opening sets `vault.selectedEntityId` and calls `modalUIStore.openZenMode(id)` instead of navigating.

### Pure modules

```ts
// entityTableSort.ts
type SortKey = "title" | "type" | "connections" | "labels" | "created" | "modified";
sortEntities(entities, sort, connectionCounts?) → Entity[]   // new array; missing values last; title tie-break
nextSortState(current, key) → SortState                      // toggle direction on same key, else asc
getEntityCreatedAt(e) → number | undefined
getEntityModifiedAt(e) → number | undefined                  // modifiedAt ?? updatedAt ?? lastUpdated
getEntityLabels(e) → string[]                                // labels, legacy tags fallback

// entityTableSnippet.ts
entitySnippet(e, maxLength = 140) → string                   // markdown-stripped; "" when no body
```

### External dependencies consumed

- `modalUIStore.openBulkLabelDialog(ids: string[])` — bulk label add/remove (rendered by `GlobalModalProvider`)
- `modalUIStore.openZenMode(id)` — guest-mode entity open
- `filterEntities` / `countEntityTypes` from `explorer/entityListFiltering` — shared filter semantics

## Test Hooks (`data-testid`)

| Hook                             | Element                                           |
| -------------------------------- | ------------------------------------------------- |
| `entity-table`                   | The `<table>`                                     |
| `entity-table-loading`           | Vault-loading state                               |
| `entity-table-search`            | Search input                                      |
| `entity-table-type-filter`       | Type filter pill (toolbar)                        |
| `entity-table-label-filter`      | Active label filter chip (toolbar)                |
| `entity-table-count`             | Visible entity count                              |
| `entity-table-sort-{key}`        | Sortable header button                            |
| `entity-table-select-all`        | Header checkbox                                   |
| `entity-table-row`               | Row (`data-selected` attribute mirrors selection) |
| `entity-table-row-select`        | Row checkbox                                      |
| `entity-table-row-link`          | Title link                                        |
| `entity-table-row-type-filter`   | Row type badge (filter shortcut)                  |
| `entity-table-row-label-filter`  | Row label chip (filter shortcut)                  |
| `entity-table-connections-{id}`  | Connections cell                                  |
| `entity-table-selection-toolbar` | Selection toolbar                                 |
| `entity-table-selection-count`   | "N selected"                                      |
| `entity-table-bulk-label`        | Bulk label button                                 |
| `entity-table-selection-clear`   | Clear selection                                   |
