# Deep Analysis: GraphView.svelte Refactoring Strategy

## Current Responsibilities (The "God File" Symptoms)

`GraphView.svelte` currently acts as the orchestrator for the entire graph experience. Its responsibilities include:

1.  **Cytoscape Lifecycle**: Initializing, configuring, and destroying the `cy` instance.
2.  **State Synchronization**: Syncing store elements (`graph.elements`) with Cytoscape's internal collection.
3.  **Layout Management**: Executing and animating complex layouts (FCOSE, Timeline, Orbit).
4.  **Image Resolution**: Handling async blob URL resolution and incremental application.
5.  **Event Handling**: Managing taps, hovers, context menus, and keyboard shortcuts.
6.  **Filtering Logic**: Applying reactive filters for labels and categories.
7.  **UI Components**: Rendering the HUD, toolbar, tooltip, and edge editor modal.

---

## 1. Extraction Candidate: Componentization (UI)

The template is cluttered with overlays that share little state but add significant line count.

### A. `GraphHUD.svelte` (Top-Left)

- **Extract**: The breadcrumb navigation, category filters, and label filters.
- **Props**: None (uses stores directly).
- **Impact**: -100 lines.

### B. `GraphToolbar.svelte` (Bottom-Left)

- **Extract**: The minimap toggle, zoom controls, fit button, stable layout toggle, and image/label toggles.
- **Props**: `cy` (for direct camera control) and `onApplyLayout` callback.
- **Impact**: -150 lines.

### C. `GraphTooltip.svelte`

- **Extract**: The fixed-position hover tooltip with markdown rendering and tags.
- **Props**: `hoveredEntityId`, `hoverPosition`.
- **Impact**: -50 lines.

### D. `EdgeEditorModal.svelte`

- **Extract**: The "Update Connection" modal logic and form.
- **Props**: `editingEdge`, `onClose`, `onSave`.
- **Impact**: -100 lines.

---

## 2. Extraction Candidate: Logic (Engines & Hooks)

### A. `LayoutManager.ts` (Package: `graph-engine`)

Move the heavy lifting of layout configuration and animation sequences out of the component.

- **Extract**: `applyCurrentLayout` logic, including the landscape/portrait logic and coordinate recording.
- **Interface**: `class LayoutManager { constructor(cy: Core) { ... } apply(type: 'force' | 'timeline' | 'orbit', options: ...) }`
- **Impact**: -250 lines.

### B. `useGraphEvents.ts` (Svelte Hook/Action)

Move the massive `onMount` listener block into a dedicated handler.

- **Extract**: `mouseover`, `mouseout`, `tap`, `pan`, and `zoom` listeners.
- **Interface**: `function setupGraphEvents(cy: Core, handlers: { onSelect: (id) => void, ... })`
- **Impact**: -150 lines.

### C. `GraphStyles.ts` (Package: `graph-engine`)

The `graphStyle` derivation is quite large.

- **Extract**: Move the static style definitions and the filtering selectors (`.filtered-out`, etc.) into a central style generator.
- **Impact**: -50 lines.

---

## 3. The "Pure Component" Goal

After refactoring, `GraphView.svelte` should look like this:

```svelte
<script>
  // Initializers
  const { cy, container } = useGraphLifecycle();

  // Logic Handlers
  const layout = new LayoutManager(cy);
  const events = useGraphEvents(cy);
  const sync = useGraphSync(cy); // Handles element and image sync
</script>

<div bind:this={container}>
  <GraphHUD />
  <GraphToolbar {cy} onApplyLayout={layout.apply} />
  <GraphTooltip {hoveredId} {pos} />
  <EdgeEditor />

  {#if cy}
    <ContextMenu {cy} />
    <SelectionConnector {cy} />
  {/if}
</div>
```

---

## 4. Proposed Phased Plan

### Phase 1: Modular Overlays (The "Low Hanging Fruit")

- Extract `GraphTooltip.svelte` and `EdgeEditorModal.svelte`.
- _Outcome_: Immediate reduction in template complexity without touching Cytoscape logic.

### Phase 2: Controls & HUD

- Extract `GraphHUD.svelte` and `GraphToolbar.svelte`.
- _Outcome_: Template becomes almost exclusively a container for the graph canvas.

### Phase 3: Engine Extraction

- Move `applyCurrentLayout` to `graph-engine`.
- Move style generators to `graph-engine`.
- _Outcome_: Business logic is separated from the UI framework.

### Phase 4: Lifecycle & Event Decoupling

- Extract event listeners and element sync logic.
- _Outcome_: `GraphView.svelte` reaches the target < 200 line count.
