# Graph Surface Analysis: `GraphView.svelte` and `ContextMenu.svelte`

_(Status: COMPLETED - May 20, 2026)_

This document analyzed the two largest active graph UI hotspots in Codex-Cryptica and proposed a practical refactor path which has now been implemented.

- `apps/web/src/lib/components/GraphView.svelte` (`705` lines)
- `apps/web/src/lib/components/graph/ContextMenu.svelte` (`679` lines)

These files should be treated as a single decomposition problem rather than two unrelated cleanups.

## Executive Summary

The graph page no longer suffers from a single obvious monolith like the pre-Spec-103 map route, but it still has a broad orchestration layer in `GraphView.svelte` and an overgrown action surface in `ContextMenu.svelte`.

The main issue is not just line count. It is **mixed ownership**:

- `GraphView.svelte` owns Cytoscape lifecycle, layout orchestration, selection focus, keyboard shortcuts, viewport animation, hover tooltip state, search-focus synchronization, image syncing, and route-level composition.
- `ContextMenu.svelte` owns node-selection interpretation, menu state, picker state, canvas actions, category changes, AI actions, delete flows, and guest/host policy branching.

That means both files are simultaneously:

- UI renderers
- state coordinators
- event routers
- policy gates
- side-effect initiators

This is the same pattern that existed in the old map route before decomposition, just spread across two related graph files.

## Current Responsibility Breakdown

### `GraphView.svelte`

`GraphView.svelte` currently owns:

- Cytoscape instance boot and teardown
- layout manager and image manager lifecycle
- resize/orientation handling
- search-focus event buffering and animation
- selection highlighting / neighborhood dimming
- node hover and tooltip state
- keyboard shortcut routing
- graph-store synchronization
- layout-trigger policy
- load-finalization logic
- graph composition (`GraphHUD`, `GraphToolbar`, `ContextMenu`, `SelectionConnector`, `FeatureHint`, `EdgeEditorModal`)

### `ContextMenu.svelte`

`ContextMenu.svelte` currently owns:

- Cytoscape right-click event registration
- selected-node derivation logic
- context menu positioning
- keyboard navigation for menus
- three independent flyout systems:
  - canvas picker
  - category picker
  - image picker
- category updates
- AI image generation
- content regeneration
- image viewing
- canvas creation / add-to-canvas flows
- destructive delete confirmation
- guest/host and AI policy branching

## The Real Problem

The core issue is that both files are broad **interaction coordinators** masquerading as components.

### `GraphView.svelte` is acting like a graph-page controller

The file already has multiple internal controller-style regions:

- `applyCurrentLayout`
- `applyFocus`
- search focus event plumbing
- resize/orientation coordination
- Cytoscape event setup
- graph sync / image sync side effects

That logic is mostly testable logic, but it is trapped inside the component.

### `ContextMenu.svelte` is acting like an action dispatcher

The file is doing too much domain and policy work directly:

- deciding what actions are allowed
- deciding how selected nodes should be interpreted
- triggering cross-store side effects
- managing transient flyout timing state

The component should mainly render menus and bind actions. It should not be the place where graph policy and workflow branching are defined.

## Proposed Way Forward

## Phase 1: Extract `GraphView` Controller Logic First

Do **not** start by splitting markup. Start by moving orchestration logic out of `GraphView.svelte`.

Create a controller module, likely something like:

- `apps/web/src/lib/components/graph/graph-view-controller.svelte.ts`

This controller should own:

- Cytoscape lifecycle state
- layout manager / image manager lifecycle
- resize and orientation tracking
- selected-node focus behavior
- search-focus queue/consumption
- hover state / tooltip position
- graph sync triggers
- image sync triggers
- edge editor open state

`GraphView.svelte` should become mostly:

- controller instantiation
- composition of `GraphHUD`, `GraphToolbar`, `ContextMenu`, `SelectionConnector`, `GraphTooltip`, `EdgeEditorModal`
- a bound graph container element

### Why this first

If you split `ContextMenu` first, `GraphView` will still own too much interaction policy and you will end up with shallow presentational splits. Extracting the controller first creates clean boundaries for everything that sits around the Cytoscape instance.

## Phase 2: Split `ContextMenu` into Controller + Renderers

After `GraphView` orchestration is extracted, decompose `ContextMenu.svelte` into:

1. A controller:
   - `graph-context-menu-controller.svelte.ts`
2. A base menu renderer:
   - `GraphNodeContextMenu.svelte`
3. Small flyout/picker renderers:
   - `GraphCategoryPicker.svelte`
   - `GraphImageActionsMenu.svelte`
   - `GraphCanvasActionsMenu.svelte`

The controller should own:

- menu open/close state
- selected-node interpretation
- guest/host/AI policy checks
- action handlers
- flyout open state and anchor positions

The Svelte components should mostly render:

- visible actions
- labels
- button wiring

## Phase 3: Extract Action Services / Strategies

Even after a controller split, `ContextMenu` will still be too broad if all action logic stays together.

Create action-oriented helpers such as:

- `graph-context-menu-actions.ts`
- `graph-category-actions.ts`
- `graph-canvas-actions.ts`
- `graph-ai-actions.ts`

These should encapsulate:

- notification patterns
- error handling
- cross-store mutation flows
- guest/host restrictions where appropriate

This will shrink the number of branches inside the controller and make the action layer easier to test directly.

## Recommended Extraction Order

1. Extract `GraphView` orchestration into `graph-view-controller.svelte.ts`
2. Move Cytoscape event wiring out of `GraphView.svelte`
3. Move search-focus and hover/focus behavior into the controller
4. Introduce `graph-context-menu-controller.svelte.ts`
5. Split flyout renderers out of `ContextMenu.svelte`
6. Extract graph context action helpers/services
7. Revisit whether `GraphToolbar` or `GraphHUD` now deserve slimmer props/contracts

## Target End State

### `GraphView.svelte`

Target: `<= 220` lines

Should contain:

- imports
- controller setup
- graph canvas binding
- high-level composition

Should not directly contain:

- resize timing logic
- search-focus buffering
- Cytoscape event callbacks
- image sync policy
- layout orchestration logic

### `ContextMenu.svelte`

Target: `<= 220` lines

Should contain:

- menu rendering
- component-level keyboard/focus wiring
- props from a controller

Should not directly contain:

- canvas creation workflows
- category mutation logic
- AI regeneration logic
- delete orchestration
- guest/host policy branching beyond simple visibility checks

## Suggested Spec Direction

If this becomes a formal refactor spec, the scope should be framed as:

**Feature:** Graph Surface Decomposition

Stories:

1. As a developer, I want graph orchestration moved into a controller so `GraphView.svelte` is a thin composition layer.
2. As a developer, I want node context actions separated from rendering so graph actions are easier to test and evolve.
3. As a user, I want graph selection, context actions, and search focus behavior to remain unchanged during the refactor.

Success criteria:

- `GraphView.svelte` under `220` lines
- `ContextMenu.svelte` under `220` lines
- behavior parity for:
  - node selection
  - connect mode
  - right-click menu flows
  - add-to-canvas flows
  - category changes
  - AI image/content actions
  - delete confirmations
  - search-focus jump behavior

## Recommendation

The next refactor should start with `GraphView.svelte`, but it should be planned as a **paired `GraphView` + `ContextMenu` decomposition**.

If you only optimize one file, the other will continue to absorb branching and coordination logic. The right unit of work is the **graph interaction surface** as a whole.
