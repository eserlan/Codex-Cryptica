# Implementation Plan - Flexible Node Categories

## Architectural Changes

### 1. Schema Update (`packages/schema`)
- Update `EntityTypeSchema` from `z.enum` to `z.string()`.
- Define `Category` interface with `icon` support.
- Define `DEFAULT_CATEGORIES` constant including the "Creature" base category and Lucide icons.
- **Migration**: Existing entities use IDs that match current defaults, so no file migration is strictly required if we preserve the default IDs.

### 2. Category Store (`apps/web/src/lib/stores/categories.svelte.ts`)
- Use Svelte 5 `$state` for a reactive `list` of categories.
- Implement `init()`, `save()`, `add()`, `update()`, and `remove()` methods.
- Integration with IndexedDB for local persistence.

### 3. Graph Styling Engine (`apps/web/src/lib/themes/graph-theme.ts`)
- Decouple base node/edge styles from category-specific border styles.
- Provide a `getTypeStyles(categories)` helper that generates Cytoscape-compatible style objects mapping category IDs to `border-color`.

### 4. UI Components
- **CategorySettings.svelte**: The management interface.
- **VaultControls.svelte**: Update creation dropdown to map over `categories.list`.
- **GraphView.svelte**: Implement an `$effect` that calls `cy.style()` whenever categories change.

## Implementation Steps

### Phase 1: Foundation (Current Status: Partial)
- [x] Schema modification.
- [x] Category store implementation.
- [x] Global initialization in `+layout.svelte`.

### Phase 2: UI Integration (Current Status: Partial)
- [x] Dynamic dropdown in `VaultControls`.
- [x] Management UI in `CategorySettings`.
- [x] Integration into the Settings menu.

### Phase 3: Graph Reactivity (Current Status: Partial)
- [x] Refactor `graph-theme.ts` for dynamic generation.
- [x] Implement reactive style updates in `GraphView.svelte`.

### Phase 4: Refinement & Robustness
- [ ] Add "Default Category" setting.
- [ ] Implement "Reset to Defaults" button.
- [ ] Verify detail panel and tooltip label resolution.
