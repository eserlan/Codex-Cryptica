# Data Model: Fog of War

## New Settings

### Vault Settings (IndexedDB)
- **`defaultVisibility`**: `Enum("visible" | "hidden")`
  - `visible`: Standard behavior. Only nodes tagged `hidden` are obscured.
  - `hidden`: Discovery behavior. All nodes are obscured UNLESS tagged `revealed`.

### UI State (Memory)
- **`sharedMode`**: `Boolean`
  - `true`: Apply Fog of War filtering to Graph and Search.
  - `false`: Show all content (Admin view).

## Entity Tags (Frontmatter)
- **`hidden`**: Force-hides an entity in Shared Mode, regardless of `defaultVisibility`.
- **`revealed`**: Force-shows an entity in Shared Mode if `defaultVisibility` is `hidden`.

## Precedence Rules
1. If `tags` contains `hidden` -> **Always Hidden**.
2. Else if `tags` contains `revealed` -> **Always Visible**.
3. Else -> Use `defaultVisibility`.

## Relationships
- **Edges**: An edge is only visible if BOTH its source and target nodes are visible.
- **Search**: Search results are filtered by the same logic as graph nodes.
