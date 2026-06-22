# Data Model: Entity Navigation History

## Entities

### NavigationHistoryStore

A reactive Svelte 5 Rune store.

**Fields**:

- `past`: `string[]` (Array of entity IDs)
- `future`: `string[]` (Array of entity IDs)
- `maxSize`: `number` (Default: 50)

**Methods**:

- `push(entityId: string)`: Adds an entity to `past`, clears `future`. Prevents consecutive duplicates. Enforces `maxSize` by shifting oldest items.
- `back()`: Pops from `past`, pushes current to `future`, returns the new active entity ID (or null if empty).
- `forward()`: Pops from `future`, pushes current to `past`, returns the new active entity ID (or null if empty).
- `clear()`: Empties both stacks.
