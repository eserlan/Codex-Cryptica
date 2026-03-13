# Research & Technical Decisions: GraphView Refactor

## Analyzed "God File": `apps/web/src/lib/components/GraphView.svelte` (1,371 lines)

### 1. Layout Complexity

- **Current State**: Large `switch` statements and parameter objects for `fcose`, `timeline`, and `orbit` layouts live directly in `$effect` blocks.
- **Decision**: Create `OracleLayoutManager`. It will encapsulate the `getLayoutOptions(mode)` logic and handles the `run()` lifecycle of Cytoscape layouts.
- **Rationale**: Layout configuration is pure data/logic that doesn't need to be in the Svelte component.

### 2. Event Handling Overload

- **Current State**: `onMount` contains ~300 lines of `.on('tap')`, `.on('mouseover')`, etc.
- **Decision**: Use a Svelte Action `useGraphEvents(node, { cy, vault, onHover, onSelect })`.
- **Rationale**: Actions are the idiomatic Svelte way to attach lifecycle-bound listeners to DOM/Library objects.

### 3. Component Hierarchy

- **Current State**: Minimap, controls, and tooltips are all inline HTML/CSS.
- **Decision**:
  - `Minimap.svelte`: Encapsulates the secondary Cytoscape instance used for overview.
  - `GraphControls.svelte`: Standardizes the floating action buttons.
  - `GraphTooltip.svelte`: Handles positioning and content for node hovers.
- **Rationale**: Improved readability and easier styling isolation.

## Technical Decisions

### 1. Svelte 5 Runes for Communication

- **Decision**: Use `$state` and `$derived` from the `vault` and `graph` stores to drive component updates.
- **Rationale**: Leverage the project's existing reactivity model.

### 2. Isolation level

- **Decision**: Keep the `cy` instance initialization in `GraphView.svelte` but delegate all configuration to the `LayoutManager`.
- **Rationale**: Ensures the orchestrator still owns the lifecycle of the core object while delegating the "how" to services.
