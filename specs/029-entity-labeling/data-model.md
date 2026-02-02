# Data Model: Entity Labeling System

**Feature**: 029-entity-labeling | **Date**: 2026-02-01

## Entity Schema Updates

### `Entity` (Extended)
The existing `Entity` schema in `packages/schema/src/index.ts` will be updated to include an optional `labels` array.

| Property | Type | Description |
| :--- | :--- | :--- |
| `labels` | `string[]` | (Optional) List of case-insensitive tags assigned to the entity. |

### `VaultConfig` (Extended)
Store global label definitions (if needed for custom colors in future, but currently just for indexing).

| Property | Type | Description |
| :--- | :--- | :--- |
| `labelIndex` | `Set<string>` | Derived project-wide set of unique labels for autocomplete. |

## Relationships

- **Entity <-> Label**: Many-to-Many.
- An entity can have multiple labels.
- A label can be associated with multiple entities across different categories (NPCs, Locations, etc.).
