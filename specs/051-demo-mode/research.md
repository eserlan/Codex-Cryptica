# Research: Interactive Demo Mode

## Decision: Transient VaultStore Factory

**Rationale**:
To support Demo Mode without overwriting user data, we need a way to instantiate a `VaultStore` that operates on an in-memory or temporary object instead of the primary IndexedDB.
We will modify `VaultStore` to accept an optional `initialData` object. If present, it will skip initial DB loading and work with the provided state. For "Save as Campaign", we will then trigger a standard `saveAll` to a new persistent vault ID.

**Alternatives considered**:

- **Separate DemoStore**: Rejected. Maintaining parity between `VaultStore` and `DemoStore` would be a maintenance nightmare.
- **Temporary IndexedDB Database**: Rejected. Creating/deleting databases is heavy. In-memory state is faster and safer for a "try before you buy" experience.

## Decision: Deep-Linking via URLSearchParams

**Rationale**:
We will use SvelteKit's `page` store to detect `?demo=[theme]` in the root `+layout.svelte`. If detected, we will:

1. Set `uiStore.isDemoMode = true`.
2. Set `themeStore.activeTheme = [theme]`.
3. Initialize the vault with theme-specific sample data from `static/vault-samples/[theme].json`.

**Alternatives considered**:

- **Route-based (/demo/vampire)**: Rejected. We want to demonstrate the _actual_ workspace at the root URL to make the "Save as Campaign" transition seamless (no URL change needed).

## Decision: Theme-Aware Jargon in Demo

**Rationale**:
Demo Mode will leverage the existing `themeStore.resolveJargon` system. When a theme-specific demo is loaded, the `themeStore` will be forced to that theme, and all UI labels will automatically update. Sample lore for each theme will be curated to use the correct jargon in the text itself.

## Decision: "Save as Campaign" Flow

**Rationale**:
When the user clicks "Save as Campaign", the system will:

1. Generate a new unique Vault ID.
2. Copy the current transient state of the `DemoVault`.
3. Call `vault.persistToIndexedDB(newId)`.
4. Set `uiStore.isDemoMode = false` and update the URL (removing the `demo` param).
5. Show a success notification: "Campaign saved successfully!"

## Research Tasks (Resolved)

- **Data Injection**: Sample data will be stored as JSON in `static/vault-samples/`.
- **Oracle Persona**: We will add a `systemPromptSuffix` to the `OracleStore` that is appended only when `isDemoMode` is true, instructing the AI to be a "Guided Assistant".
