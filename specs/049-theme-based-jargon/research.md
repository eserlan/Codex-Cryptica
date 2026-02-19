# Research: Theme-Based UI Jargon

## Decision: Centralized Jargon Dictionary in Schema

**Rationale**:
To maintain the "Library-First" principle from the constitution, the jargon definitions should live in the shared `schema` package. This allows the core terminology to be used across packages (e.g., for logging or server-side generation) while remaining the "source of truth." Svelte components will consume this through a simple reactive helper.

**Alternatives Considered**:

- **Inline in Svelte components**: Rejected as it scatters terminology and makes theme switching complex.
- **Dedicated i18n library (e.g., svelte-i18n)**: Rejected as over-engineering for a "jargon" feature that isn't full internationalization. We need atmospheric terminology, not multi-language support.

## Decision: Schema Extension

**Rationale**:
Extend the `StylingTemplateSchema` in `packages/schema/src/theme.ts` to include an optional `jargon` field.

```typescript
const JargonSchema = z.record(z.string()); // key -> display string
```

## Decision: Pluralization Logic

**Rationale**:
Implement a lightweight pluralization helper that uses a standard `_plural` suffix convention in the jargon map (e.g., `archive` and `archive_plural`). This keeps the map flat and easy to manage without complex nested objects.

## Technical Context Resolution

- **Jargon Keys Identified**:
  - `vault` (The main collection)
  - `entity` (Individual record)
  - `save` (Action)
  - `delete` (Action)
  - `search` (Action/Placeholder)
  - `new` (Action)
  - `syncing` (Status)
- **Centralized Lookup**: A new `$derived` state in `themeStore` will provide the active jargon map by merging the theme's specific map with the default set.
