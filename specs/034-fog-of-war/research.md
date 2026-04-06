# Research: Fog of War Implementation

## Decision: State Management

- **`sharedMode`**: Will be stored in `uiStore.svelte.ts` as a session-wide boolean. It represents whether the UI is currently in "Shared" (Player) preview mode.
- **`defaultVisibility`**: Will be stored in `vaultStore.svelte.ts`. It is a vault-level setting.
- **Persistence**: `defaultVisibility` will be persisted in IndexedDB (via `getDB()`) for the current vault handle. `sharedMode` will reset to `false` on refresh (session-only).

## Decision: Graph Filtering

- **Location**: `apps/web/src/lib/stores/graph.svelte.ts`
- **Method**: The `elements` derived store will be updated to filter the `vault.allEntities` array before passing it to `GraphTransformer.entitiesToElements`.
- **Logic**:
  ```typescript
  if (ui.sharedMode) {
    entities = entities.filter((entity) => {
      const isHidden = entity.tags.includes("hidden");
      const isRevealed = entity.tags.includes("revealed");
      if (vault.defaultVisibility === "hidden") {
        return isRevealed && !isHidden;
      }
      return !isHidden;
    });
  }
  ```
- **Performance**: Filtering 1000 nodes in JS is O(N) and extremely fast (< 1ms). The re-render of Cytoscape is handled by existing reactive effects in `GraphView.svelte`.

## Decision: Search Filtering

- **Location**: `apps/web/src/lib/stores/search.ts`
- **Method**: The `setQuery` method will filter the `results` array received from `searchService.search()`.
- **Logic**: Similar to graph filtering, matching IDs against the filtered entity list.

## Decision: UI Placement

- **Shared Mode Toggle**: A new button in `VaultControls.svelte` (near the Share/Refresh icons) and potentially in the Settings panel under a new "Fog of War" section.
- **Default Visibility Setting**: Added to `SettingsModal.svelte` under the "Vault" tab.

## Alternatives Considered

- **Cytoscape Stylesheet (`display: none`)**: Rejected for security/leakage. If the data is in the graph elements, a user could inspect the `cy` object in the console to see hidden nodes. By filtering at the store level, the data never reaches the graph engine.
- **Search Worker Filtering**: Rejected for complexity. Filtering in the UI layer is sufficient and easier to keep in sync with reactive stores.
