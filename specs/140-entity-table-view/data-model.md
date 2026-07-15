# Data Model: Entity Table / List View

> Retroactive. The feature adds no persisted data; everything below is either read from existing stores or transient view state.

## Read Model (existing data, consumed)

### Entity (`schema` package)

| Field                                      | Used for                                   | Notes                                                                   |
| ------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| `id`                                       | Row key, selection set, connection lookup  |                                                                         |
| `title`                                    | Name column, all sort tie-breaks           |                                                                         |
| `type`                                     | Type column badge, type filters, type sort | Resolved via Category; raw string shown if unregistered                 |
| `content` / `lore`                         | Summary snippet                            | `content` preferred, `lore` fallback; markdown stripped, 140-char clamp |
| `labels` / `tags`                          | Labels column, label filters, labels sort  | `labels` preferred; legacy `tags` fallback (never surfaced as "tags")   |
| `connections[]`                            | Outbound connection count                  | Only entries with a resolved `target` count                             |
| `createdAt`                                | Created column + sort                      | Optional; missing → "—", sorts last                                     |
| `modifiedAt` / `updatedAt` / `lastUpdated` | Modified column + sort                     | First defined wins; missing → "—", sorts last                           |

### Category (`categories` store)

`type → { label, icon, color }` — presentation metadata for type badges and filter pills.

### Vault store inputs

- `vault.activeVaultId` — gates the view (empty state when unset)
- `vault.allEntities` — the row source
- `vault.inboundConnections` — `entityId → referencing connections[]`, inbound counts
- `vault.isInitialized` — loading state gate
- `vault.selectedEntityId` — written in guest mode to sync deep links

## Derived Model (computed per render/vault change)

### ConnectionSummary

```
{ inbound: number; outbound: number; total: number }
```

Built once per vault change as `Record<entityId, ConnectionSummary>`; feeds the Connections column and `connections` sort.

### Row set pipeline

```
vault.allEntities
  → filterEntities(searchQuery, typeFilters, labelFilters)   // shared Explorer logic
  → sortEntities(sort, connectionCounts)                     // pure, new array
  → rows (rendered)
```

## View State (transient, component-local, never persisted)

| State            | Type                                           | Transitions                                                                                                                     |
| ---------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `searchQuery`    | `string`                                       | User input; any change clears selection                                                                                         |
| `typeFilters`    | `Set<string>`                                  | Toggled via pills or row type badges; change clears selection                                                                   |
| `labelFilters`   | `Set<string>`                                  | Toggled via chips (active ones shown as removable pills); change clears selection                                               |
| `sort`           | `{ key: SortKey; direction: "asc" \| "desc" }` | Header click: same key toggles direction, new key resets to asc. Default `title/asc`. Preserves selection                       |
| `selectedIds`    | `Set<string>`                                  | Row checkbox toggles one; header checkbox selects all filtered rows or clears; "Clear selection"; auto-cleared on filter change |
| `lastSelectedId` | `string \| null`                               | Stores the ID of the last row clicked without range modifiers, used as the anchor for Shift+Click range selections              |
| `contextMenu`    | `ContextMenuState \| null`                     | Position and targets of active custom floating menu (null when closed)                                                          |

### ContextMenuState

```typescript
interface ContextMenuState {
  x: number; // Viewport screen coordinate x
  y: number; // Viewport screen coordinate y
  targetIds: string[]; // Entity IDs targeting the right-click action (single or multi selection)
}
```

### SortKey

`"title" | "type" | "connections" | "labels" | "created" | "modified"` — Summary column is intentionally unsortable.

### Selection invariants

1. `selectedIds ⊆ visible rows` at action time (enforced by filter-change reset + `selectedVisible` derivation).
2. Header checkbox: checked ⇔ all filtered rows selected; indeterminate ⇔ some but not all.
3. Bulk actions receive `selectedVisible` ids only.

## Validation Rules

- Missing display values render an explicit "—" with an aria-label (never blank).
- Labels column shows at most 3 chips + `+N` overflow.
- Snippet is plain text (markdown stripped), ≤140 chars with ellipsis.
