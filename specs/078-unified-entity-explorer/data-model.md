# Data Model: Entity Explorer & Embedded View

## UI State (uiStore)

### `activeSidebarTool` (Extended)

- **Type**: `'oracle' | 'explorer' | 'none'`
- **Default**: `'none'`
- **Transition**:
  - `toggleSidebarTool('explorer')`: Toggles the Entity Explorer visibility.
  - `toggleSidebarTool('oracle')`: Toggles the Lore Oracle visibility.

### `mainViewMode` (New)

- **Type**: `'visualization' | 'focus'`
- **Default**: `'visualization'`
- **Description**: Determines whether the central area shows the current route (Graph/Map/Canvas) or the focused entity content.

### `focusedEntityId` (New)

- **Type**: `string | null`
- **Default**: `null`
- **Description**: The entity currently being inspected in the Embedded View.

## State Transitions

### 1. Focus Entity

- **Trigger**: Click entity in Explorer or Graph.
- **Action**:
  - `uiStore.focusedEntityId = entityId`
  - `uiStore.mainViewMode = 'focus'`
- **UI Update**: Center area swaps visualization for `EmbeddedEntityView`.

### 2. Return to Visualization

- **Trigger**: Click "Close" in Embedded View HUD or press Escape.
- **Action**:
  - `uiStore.mainViewMode = 'visualization'`
- **UI Update**: Center area restores the route's children (e.g., Graph).

## Entities

### `ExplorerTool`

- **Icon**: `lucide:database` or `lucide:layout-list`.
- **Position**: Below/Next to Oracle in Activity Bar.
