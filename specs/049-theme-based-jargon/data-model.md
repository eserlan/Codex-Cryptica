# Data Model: Theme-Based UI Jargon

## Entities

### JargonMap

Represented as a record of terminology tokens to their atmospheric display strings.

**Fields**:

- `vault`: Display name for the primary collection (e.g. "Archive", "Data Bank").
- `entity`: Display name for a single record (e.g. "Chronicle", "Data Node").
- `entity_plural`: Pluralized name for records (e.g. "Chronicles", "Data Nodes").
- `save`: Action verb for persisting changes (e.g. "Inscribe", "Upload").
- `delete`: Action verb for removal (e.g. "Exterminate", "Banish").
- `search`: Search action or placeholder text.
- `new`: Label for creation (e.g. "Forge", "Initialize").
- `syncing`: Status for background operations.

### StylingTemplate (Updated)

Existing entity in `packages/schema`.

**Updated Fields**:

- `jargon?`: An optional `JargonMap` specific to this theme.

## Validation Rules

1. **Mandatory Defaults**: The `DEFAULT_THEME` MUST contain a complete `JargonMap` covering all defined tokens.
2. **Key Consistency**: Custom theme jargon maps MUST only use keys defined in the core `JargonMap` type.
3. **Pluralization**: If an `entity` key is provided, an `entity_plural` SHOULD also be provided to ensure grammatical consistency in the UI.

## Relationships

- A `StylingTemplate` contains exactly one (optional) `JargonMap`.
- The `ThemeStore` resolves the active terminology by merging the `DEFAULT_THEME` jargon with the `activeTheme` jargon.
