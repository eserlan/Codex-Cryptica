# Research: Move Oracle to Left Sidebar

## Sidebar Integration Patterns

### Decision: Flex-based Layout Refactor in `+layout.svelte`

**Rationale**: The existing layout uses a `flex-col` for the whole page. To add a left sidebar, the `main` container should be changed to `flex-row`. The sidebar will be a direct child of this new flex container, ensuring it stays on the left across all views.
**Alternatives considered**:

- Absolute positioning: Brittle, harder to manage main content resizing.
- Grid: Also valid, but flex is more consistent with existing component styling in the project.

## Oracle Window Component Refactor

### Decision: Separate `OracleSidebarPanel.svelte`

**Rationale**: `OracleWindow.svelte` currently has logic for "floating" and "modal" modes (absolute positioning, draggability, etc.). Repurposing it for a fixed sidebar panel would lead to messy conditional logic. Creating a dedicated panel component that reuses `OracleChat.svelte` is cleaner.
**Alternatives considered**:

- Modifying `OracleWindow.svelte`: Rejected due to complexity of handling conflicting layout modes.

## Responsive Transition Logic

### Decision: Svelte 5 Media Query Derived State

**Rationale**: Use a reactive `isMobile` state in `uiStore` (using `window.matchMedia`). The sidebar will render as a vertical bar on `!isMobile` and either hide or become a bottom bar on `isMobile`.
**Alternatives considered**:

- Pure CSS: Harder to manage component mounting/unmounting or complex layout shifts.
- Svelte 4 `onMount` listeners: Runes (`$effect`, `$derived`) are more idiomatic for Svelte 5.

## State Management

### Decision: Expand `UIStore`

**Rationale**: Add `leftSidebarOpen` and `activeSidebarTool` (e.g., 'oracle', 'none') to `UIStore`. This allows any part of the app to toggle the sidebar.
**Alternatives considered**:

- Local component state: Rejected because navigation between views (Graph -> Map) needs to preserve the sidebar state.
