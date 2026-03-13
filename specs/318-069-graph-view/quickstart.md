# Quickstart: Implementing the GraphView Refactor

## Steps

### 1. Extract `OracleLayoutManager`

- **Location**: `apps/web/src/lib/services/graph/layout-manager.ts`
- **Task**: Move all `layoutOptions` and `runLayout` logic.
- **Verification**: Verify that switching layout modes still works.

### 2. Extract `useGraphEvents`

- **Location**: `apps/web/src/lib/components/graph/useGraphEvents.ts`
- **Task**: Wrap all `.on()` listeners into a Svelte action.
- **Verification**: Verify that clicking and hovering nodes still works.

### 3. Componentize Minimap

- **Location**: `apps/web/src/lib/components/graph/Minimap.svelte`
- **Task**: Move the secondary Cytoscape logic and styles.
- **Verification**: Minimap should correctly reflect the main graph.

### 4. Componentize Graph Controls

- **Location**: `apps/web/src/lib/components/graph/GraphControls.svelte`
- **Task**: Move the floating layout/zoom buttons.
- **Verification**: Buttons should still trigger graph actions.

### 5. Componentize Tooltip

- **Location**: `apps/web/src/lib/components/graph/GraphTooltip.svelte`
- **Task**: Move the hover popup logic and styles.
- **Verification**: Tooltips should show on node hover.

### 6. Refactor `GraphView.svelte`

- **Location**: `apps/web/src/lib/components/GraphView.svelte`
- **Task**: Use the new components and actions.
- **Verification**: Final line count < 400.
