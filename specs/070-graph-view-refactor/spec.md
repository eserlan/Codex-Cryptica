# Feature Specification: GraphView Component Refactor

**Feature Branch**: `070-graph-view-refactor`  
**Created**: 2026-03-12  
**Status**: Draft  
**Input**: User description: "refactor @apps/web/src/lib/components/GraphView.svelte look at docs/refactoring/GRAPH_VIEW_REFACTOR.md"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Maintain Core Graph Interaction (Priority: P1)

As a user, I want the graph to continue functioning exactly as before (loading, navigating, filtering) after the refactor, so that my experience remains seamless and reliable.

**Why this priority**: Essential to avoid functional regressions while improving internal structure. This is the baseline requirement for a successful refactor.

**Independent Test**: Can be fully tested by verifying that all existing graph features (zoom, pan, node selection, edge editing, filtering) work correctly without any changes to external behavior.

**Acceptance Scenarios**:

1. **Given** a vault with multiple entities, **When** I navigate to the graph view, **Then** I should see all entities and connections correctly placed, and the view should automatically fit to show the entire graph.
2. **Given** the graph view, **When** I toggle category or label filters in the HUD, **Then** the graph should update immediately, hiding or showing nodes without any visual glitches or layout jumps.

---

### User Story 2 - Modular UI Management (Priority: P2)

As a developer, I want UI overlays like the HUD and toolbar to be separate components, so that they are easier to maintain, test, and extend independently of the complex Cytoscape logic.

**Why this priority**: Improves code readability, reduces cognitive load when modifying UI elements, and follows modern component-based architecture patterns.

**Independent Test**: Can be tested by verifying that the `GraphHUD`, `GraphToolbar`, and `GraphTooltip` components render correctly and trigger the expected state changes or callbacks in the main graph container.

**Acceptance Scenarios**:

1. **Given** the graph is active, **When** I click the "Fit to Screen" button in the new modular toolbar, **Then** the graph camera should animate to encompass all visible elements.
2. **Given** I hover over a node, **When** the new `GraphTooltip` component is triggered, **Then** it should display the entity's content and tags at the correct cursor position.

---

### User Story 3 - Robust Layout Transitions (Priority: P2)

As a user, I want transitions between different layout modes (Force-Directed, Timeline, Orbit) to be smooth and predictable, so that I can explore my vault's data from different perspectives without losing context.

**Why this priority**: Enhances the core spatial navigation experience. Moving this logic to a dedicated manager ensures consistency across all modes.

**Independent Test**: Can be tested by switching between all three layout modes and ensuring the view correctly fits and animates to the new positions.

**Acceptance Scenarios**:

1. **Given** the standard force-directed layout is active, **When** I toggle "Chronological Synchrony", **Then** the graph should transition to the timeline layout, and the view should reset to show the full span of time.

---

### Edge Cases

- **Rapid Layout Switching**: What happens when a user rapidly toggles between layout modes before the previous animation completes? (The `LayoutManager` must correctly cancel/stop previous layouts).
- **Empty Vaults**: How does the refactored view handle a vault with zero entities or no connections? (HUD and toolbar should still render correctly, but graph specific actions should handle the empty state gracefully).
- **External State Changes**: How does the decoupled sync logic handle entities being added or removed from the store while a layout is currently running?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST extract HUD logic (breadcrumbs, category filters, label filters) into a standalone `GraphHUD` component.
- **FR-002**: System MUST extract toolbar logic (zoom, fit, minimap toggle, setting toggles) into a standalone `GraphToolbar` component.
- **FR-003**: System MUST extract hover tooltip logic into a standalone `GraphTooltip` component with markdown rendering support.
- **FR-004**: System MUST extract connection editing logic into a standalone `EdgeEditorModal` component.
- **FR-005**: System MUST isolate layout management logic (FCOSE, Timeline, Orbit) into a dedicated `LayoutManager` class or engine.
- **FR-006**: System MUST decouple Cytoscape event listeners (taps, drags, hovers) into a dedicated handler or hook.
- **FR-007**: The main `GraphView.svelte` file MUST be reduced to under 250 lines of code (excluding imports) while maintaining current functionality.
- **FR-008**: System MUST ensure that incremental image resolution continues to work seamlessly within the refactored structure.

### Key Entities

- **GraphView**: The primary container component responsible for orchestrating the lifecycle of the Cytoscape instance and mounting sub-components.
- **LayoutManager**: A domain-specific engine responsible for configuring, running, and animating graph layouts.
- **GraphOverlay**: A category of UI components (HUD, Toolbar, Tooltip) that provide interaction layers on top of the graph canvas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `GraphView.svelte` file size is reduced by at least 75% (Target: < 250 lines).
- **SC-002**: Zero functional regressions in vault loading, navigation, filtering, or connection editing (verified by existing test suite).
- **SC-003**: Layout switching (e.g., Force to Timeline) completes with correct viewport fitting in 100% of cases.
- **SC-004**: All UI overlays are fully modular and receive necessary data/callbacks via clean prop interfaces.
