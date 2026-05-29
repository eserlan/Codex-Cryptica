# MapView Refactor Proposal

## Overview

At **1,536 lines**, `apps/web/src/lib/components/map/MapView.svelte` is currently the largest file in the Codex-Cryptica repository. It is a critical component that bridges the core `map-engine`, the Svelte application state, and complex user interactions (VTT tools, GM tools, panning/zooming, and selections).

The size of this file makes it difficult to maintain, test, and safely extend without causing regressions in unrelated map behaviors.

This proposal outlines a strategy to decompose `MapView.svelte` into smaller, focused modules, adhering to the principle of separation of concerns.

## Identified Hotspots (The "Why")

Analyzing the current `MapView.svelte` reveals several distinct responsibilities tangled together:

1. **Context Menu UI (~350 lines)**: The `contextMenu` template code is massive. It contains nested logic for checking GM/Guest roles, token visibility, grid alignment calculations, and iterating over status effects.
2. **Interaction State Machine (~330 lines)**: The `onMouseDown`, `onMouseMove`, `onMouseUp`, `onWheel`, and `onKeyDown` handlers form an enormous implicit state machine. They manage panning, token dragging, box selection, grid fitting, brush painting, and measurement—all using a dozen disconnected `$state` variables (e.g., `dragState`, `gridFitStart`, `boxSelectStart`, `isPanning`).
3. **Canvas Render Loop (~190 lines)**: The `draw()` function in `requestAnimationFrame` calls `renderMap()` but also imperatively draws P2P pings, drag previews, remote measurements, and visual brush indicators directly onto the 2D context.
4. **VTT State Derivations (~70 lines)**: Converting raw store arrays into mapped, filtered objects for rendering (e.g., `vttTokens`, `vttMeasurement`, `remoteMeasurement`).

## Proposed Architecture

To solve this, we should split `MapView.svelte` into a coordinator component and several specialized sub-components/classes.

### 1. `MapContextMenu.svelte`

Extract the context menu UI into its own component.

- **Props**: `contextMenu` state (x, y, token info), active token data, callbacks for actions (ping, delete, resize, status effects).
- **Benefit**: Removes 350+ lines of dense template logic.

### 2. `MapInteractions.svelte.ts` (State Class)

Extract the event handlers into a dedicated Svelte 5 class.

- **Responsibility**: Encapsulate the complex state machine (panning, drawing, token dragging, box selection).
- **Implementation**: A class that takes the container/canvas elements and binds to their events. It internally manages `$state` for `boxSelectStart`, `gridFitStart`, etc., exposing only what the UI needs to render overlays.
- **Benefit**: Makes interaction logic fully testable without mounting the entire MapView component.

### 3. `MapCanvas.svelte`

Extract the raw `<canvas>` element and the `requestAnimationFrame` render loop.

- **Props**: `activeMap`, derived `vttTokens`, `vttMeasurement`, `pings`, etc.
- **Responsibility**: Handle `ResizeObserver`, device pixel ratio scaling, and executing the `renderMap` call from `map-engine`. Custom imperative drawing (like P2P pings or the visual brush) should be moved here or to a `map-engine` plugin layer.
- **Benefit**: Isolates performance-critical rendering code from UI layout logic.

### 4. `MapOverlays.svelte`

Extract DOM-based overlays (DOM elements that float over the canvas).

- **Responsibility**: Render `PinLinker`, `MapPinPopover`, and the dashed borders for box selection and grid fitting.
- **Benefit**: Cleans up the main template, making it easier to read.

### 5. `MapView.svelte` (The Coordinator)

After extraction, `MapView.svelte` becomes a structural shell.

- **Responsibility**: Bind the pieces together. It initializes the `MapFogPainter`, `MapViewAssetLoader`, and `MapInteractions`, passing state down to `MapCanvas` and `MapOverlays`.
- **Target Size**: ~150 - 250 lines.

## Execution Plan

To minimize risk and avoid breaking VTT interactions, this refactor should be executed in phases:

### Phase 1: Context Menu Extraction (Low Risk, High Impact) - **COMPLETED**

- [x] Create `MapContextMenu.svelte`.
- [x] Move the entire `#if contextMenu` block into the new component.
- [x] Pass required store data or callbacks.
- _Actual LOC reduction: ~320 lines._

### Phase 2: Overlay Extraction (Low Risk) - **COMPLETED**

- [x] Create `MapOverlays.svelte` to handle the grid fit rect, box select rect, `PinLinker`, and `MapPinPopover`.
- _Actual LOC reduction: ~70 lines._

### Phase 3: Canvas Rendering Isolation (Medium Risk) - **COMPLETED**

- [x] Create `MapCanvas.svelte`.
- [x] Move the `canvas` DOM element, `handleResize`, the `ResizeObserver`, and the `draw()` loop.
- _Actual LOC reduction: ~280 lines._

### Phase 4: Interaction State Machine (High Risk / High Reward) - **COMPLETED**

- [x] Create `map-interactions.svelte.ts`.
- [x] Migrate all `onMouse*`, `onKey*`, and `onWheel` handlers into this class.
- [x] Update `MapView.svelte` to instantiate this class and attach its listeners to the container.
- _Actual LOC reduction: ~480 lines._

## Summary

By executing this refactor, we successfully eliminated the largest god file in the project. `MapView.svelte` has been reduced from 1,536 lines to 328 lines, resulting in a cleaner UI hierarchy, easier testing for complex map gestures, and a more maintainable VTT environment.

## Follow-up

The extracted `MapInteractionManager` now carries the interaction-state complexity that previously lived inside `MapView.svelte`. Track the second-stage decomposition in [MAP_INTERACTION_MANAGER_GODFILE_ANALYSIS.md](./MAP_INTERACTION_MANAGER_GODFILE_ANALYSIS.md).
