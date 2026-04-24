# Data Model: Entity Alias Support

## Entities

### Entity (Extended)

Represents a core world record (Character, Location, etc.) with support for multiple identities.

- **aliases**: `string[]` (defaults to `[]`)
  - **Validation**: Each alias must be a non-empty string. Whitespace is trimmed.
  - **Persistence**: Saved in Markdown frontmatter as an ordered YAML list.

### Search Entry (Extended)

The record passed to the FlexSearch index.

- **aliases**: `string[]` or `string` (joined keywords)
  - **Weighting**: Field-level weight set between `title` (1.0) and `content` (0.5), likely around 0.8.

## State Transitions

### Management Flow (Zen Edit Mode)

1.  **Initialize**: `AliasInput` component loads the current `entity.aliases` into local state.
2.  **Add**: User types and presses `Enter`/`,` -> State is updated; `updatedAt` is refreshed.
3.  **Remove**: User clicks 'X' on a pill -> State is updated.
4.  **Reorder**: User reorders pills (if implemented in UI) -> State is updated.
5.  **Save**: `EntityStore.updateEntity` is called with the new ordered alias array; changes are serialized to OPFS.
