# Research: Entity Alias Support

## Context

GitHub Issue #676 requires the ability for entities to have aliases (alternative names) that are visible at a glance and searchable.

## Research Findings & Decisions

### Update Core Schema in `packages/schema`

- **Decision**: Add `aliases: z.array(z.string()).optional().default([])` to `EntitySchema`.
- **Rationale**: Keeps aliases as a first-class citizen alongside `tags` and `labels`. Making the field optional with a default value ensures full backward compatibility with existing vault data and the project's extensive test suite without requiring thousands of manual updates to mock data.
- **Alternatives Considered**:
  - **Required array**: Rejected (would break hundreds of existing unit tests and existing user data).
  - **Single string with delimiters**: Rejected (harder to parse/validate).

### Search Indexing in `packages/search-engine`

- **Decision**: Index aliases in the `title` or a new `aliases` field with a weighting higher than content but lower than the primary title.
- **Rationale**: Ensures high-quality discovery. FlexSearch supports multiple fields; by indexing aliases separately or including them in a weighted "identifiers" field, we meet FR-005.
- **Implementation Strategy**:
  - Update `SearchEngine.initIndex` configuration to include a weighted field for aliases.
  - Update `SearchStore.indexEntity` in `apps/web` to pass the `aliases` array.

### UI Display in Entity Explorer

- **Decision**: Render aliases subtly beneath the entity title in `EntityList.svelte`.
- **Rationale**: Satisfies the "at-a-glance" visibility requirement while maintaining clear hierarchy with the primary title.
- **Format**: `aka: Alias 1, Alias 2 {+N more}`.

### Alias Management UI

- **Decision**: Create a new `AliasInput.svelte` component.
- **Rationale**: Promotes reusability and follows the pattern established by `LabelInput.svelte`. It will handle comma/enter separators and tag-like pill rendering.

## Best Practices

- **FlexSearch Weighting**: Use field-level boosting if supported by the current `FlexSearch.Document` configuration, or prioritize by result merging order.
- **Svelte 5 Runes**: Use `$state` and `$derived` for reactive alias management in the new component.
- **Frontmatter Serialization**: The `js-yaml` library naturally handles string arrays, so no special serialization logic is needed beyond updating the schema.
