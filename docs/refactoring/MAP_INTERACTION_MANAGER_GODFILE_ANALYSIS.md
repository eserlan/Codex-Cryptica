# MapInteractionManager God-File Analysis

**File:** `apps/web/src/lib/components/map/map-interactions.svelte.ts`  
**Original Size:** 626 lines  
**Post-refactor Size:** 407 lines  
**Status:** First decomposition pass merged in [PR #967](https://github.com/eserlan/Codex-Cryptica/pull/967)
**Parent Issue:** [#943](https://github.com/eserlan/Codex-Cryptica/issues/943)

## 1. Executive Summary

`MapInteractionManager` was created during the first `MapView.svelte` decomposition to move interaction logic out of a 1,500+ line component. That extraction was successful, but the new class became its own multi-responsibility coordinator. It owned canvas gestures, VTT token selection, token drag state, pin editing, fog painting, grid fitting, measurement interactions, context menu hit testing, and direct calls into several stores and P2P services.

PR #967 completed the first decomposition pass. The refactor did not move logic back into Svelte components; it split the interaction state machine into focused handlers with narrow injected dependencies, leaving `MapInteractionManager` as the event router and canvas gesture coordinator.

## 0. Implementation Snapshot

PR #967 implemented the first decomposition pass described by this analysis. The extracted handler set is broader than the initial token/pin proposal because several later candidates proved isolated enough to move safely in the same pass.

Current structure:

```text
apps/web/src/lib/components/map/
├── map-interactions.svelte.ts
├── interactions/
│   ├── box-selection-handler.svelte.ts
│   ├── context-menu-interaction-handler.svelte.ts
│   ├── creation-interaction-handler.ts
│   ├── fog-interaction-handler.ts
│   ├── grid-interaction-handler.svelte.ts
│   ├── interaction-adapters.ts
│   ├── map-interaction-handler-factory.ts
│   ├── measurement-interaction-handler.ts
│   ├── pin-interaction-handler.ts
│   ├── token-drag-handler.ts
│   ├── token-resize-handler.ts
│   └── token-selection-manager.ts
```

Implemented extractions:

- `TokenSelectionManager`: token hit testing, click selection, modifier selection, empty-selection clearing, and box selection commit.
- `TokenDragHandler`: movable-token hit testing, drag offset, host movement, guest optimistic movement, P2P move request, and guest move confirmation.
- `PinInteractionHandler`: pin hit testing, drag state, click-vs-drag handling, pin coordinate updates, map saves, and linked entity selection.
- `GridInteractionHandler`: grid move commit/cancel, grid fit start/update/commit/cancel, grid size/offset writes, and grid settings reveal.
- `MeasurementInteractionHandler`: live measurement endpoint updates and click-to-start/lock/restart measurement.
- `ContextMenuInteractionHandler`: context-menu state, token hit lookup, and image coordinate calculation.
- `TokenResizeHandler`: shift-wheel token resize hit testing and grid-step size updates.
- `FogInteractionHandler`: fog paint begin/move/finish and conditional fog-sync broadcast.
- `CreationInteractionHandler`: double-click token or pin creation coordinate routing.
- `map-interaction-handler-factory.ts`: default handler composition and global-store adapters kept outside the manager constructor.

Remaining `MapInteractionManager` responsibilities after this pass:

- DOM event entry points.
- container rect caching and viewport coordinate extraction.
- interaction priority ordering across handlers.
- panning, wheel zoom, keyboard viewport movement, and map announcements.
- small compatibility getters consumed by `MapOverlays.svelte` and `MapView.svelte`.

Verification for this pass:

- `bun run --filter web test -- src/lib/components/map` passed with 21 files and 83 tests.
- Targeted ESLint passed for `map-interactions.svelte.ts` and `apps/web/src/lib/components/map/interactions`.
- Svelte autofixer passed for `map-interactions.svelte.ts`.

## 2. Current Responsibilities After PR #967

### A. Canvas Gesture Coordination

The class still tracks pointer coordinates, cached container bounds, panning, wheel zoom, keyboard pan/zoom, pointer-over state, and ARIA announcements.

Relevant code:

- `cachedRect`, `lastMousePos`, `mouseDownPos`, `isPanning`, `isPointerOver`
- `onKeyDown`, `onKeyUp`, `onMouseDown`, `onMouseMove`, `onMouseUp`, `onWheel`
- `getKeyboardViewportUpdate`, `getZoomViewportUpdate`, `shouldIgnoreMapKeyboardEvent`

This remains the core responsibility of `MapInteractionManager`.

### B. VTT Token Selection

Token selection is now delegated to `TokenSelectionManager`:

- click selection
- empty-space deselection
- `Ctrl`/`Meta` add-to-selection
- `Shift` toggle selection
- multi-token box selection
- context-menu token lookup

Extracted from:

- `hitTestToken(mapSession.allTokens, ...)`
- `mapSession.setSelection`
- `mapSession.addToSelection`
- `mapSession.removeFromSelection`
- `mapSession.setMultiSelection`
- `mapSession.clearSelection`

Implemented in `apps/web/src/lib/components/map/interactions/token-selection-manager.ts`.

### C. VTT Token Dragging

Token dragging is now delegated to `TokenDragHandler`:

- permission check through `canMoveToken`
- drag offset calculation
- GM immediate token movement
- guest optimistic movement
- guest P2P movement request
- guest move confirmation on mouse-up
- setting and clearing `draggingTokenId`

Extracted from:

- `dragState`
- `mapSession.canMoveToken(hitToken.id, p2pGuestService.peerId, mapStore.isGMMode)`
- `mapSession.moveToken`
- `mapSession.requestTokenMove`
- `p2pGuestService.requestTokenMove`
- `mapSession.confirmTokenMove`
- `mapSession.draggingTokenId`

Implemented in `apps/web/src/lib/components/map/interactions/token-drag-handler.ts`.

### D. Pin Selection And Editing

Pin interactions are now delegated to `PinInteractionHandler`:

- pin hit testing
- pin drag state
- click-vs-drag threshold
- restoring original coordinates after click gestures
- in-memory pin coordinate updates
- map persistence through `vault.saveMaps`
- entity focus through `vault.selectedEntityId`

Extracted from:

- `pinDragState`
- `findClickedPin`
- `mapStore.updatePinCoordinatesInMemory`
- `vault.saveMaps`
- `vault.selectedEntityId`

Implemented in `apps/web/src/lib/components/map/interactions/pin-interaction-handler.ts`.

### E. Fog Painting

Fog painting is now delegated to `FogInteractionHandler`. The handler starts, moves, and finishes fog painting, then broadcasts fog sync when needed.

Relevant code:

- `this.painter.begin`
- `this.painter.move`
- `await this.painter.finish()`
- `p2pHost.broadcastActiveMapFogSync`

Implemented in `apps/web/src/lib/components/map/interactions/fog-interaction-handler.ts`.

### F. Grid Tools

Grid move and grid fit are now delegated to `GridInteractionHandler`:

- Enter commits grid move
- Escape cancels grid modes
- mouse drag tracks grid fit bounds
- mouse-up calculates grid size and offsets
- grid settings panel is opened after fit

Relevant code:

- `gridFitStart`, `gridFitEnd`
- `mapSession.gridMoveMode`
- `mapSession.gridFitMode`
- `mapSession.showGridSettings`
- `mapStore.gridSize`, `gridOffsetX`, `gridOffsetY`
- `notificationStore.clearNotification`

Implemented in `apps/web/src/lib/components/map/interactions/grid-interaction-handler.svelte.ts`.

### G. Measurement Tool

Measurement behavior is now delegated to `MeasurementInteractionHandler`:

- live measurement endpoint updates
- first click starts measurement
- second click locks measurement
- third click restarts measurement

Extracted from:

- `mapSession.measurement`
- `mapSession.setMeasurementStart`
- `mapSession.setMeasurementEnd`
- `mapSession.setMeasurementLocked`

Implemented in `apps/web/src/lib/components/map/interactions/measurement-interaction-handler.ts`.

## 3. Coupling Problems Addressed

Before PR #967, `MapInteractionManager` imported concrete global stores and services directly:

- `mapStore`
- `mapSession`
- `vault`
- `p2pGuestService`
- `p2pHost`
- `notificationStore`
- `sessionModeStore`

That made unit tests depend on broad module mocks and made the class hard to reuse for touch input or alternate pointer-event handling.

PR #967 introduced constructor-based handlers, narrow dependency interfaces, and default adapters in `interaction-adapters.ts` plus `map-interaction-handler-factory.ts`. `MapInteractionManager` still imports `mapStore`, `mapSession`, and `sessionModeStore` for remaining pan/zoom, keyboard, and resize permission routing, but it no longer imports `vault`, `p2pGuestService`, `p2pHost`, `notificationStore`, or token hit-testing helpers directly.

## 4. Implemented Architecture

```text
apps/web/src/lib/components/map/
├── map-interactions.svelte.ts          # Thin event router and canvas gestures
├── interactions/
│   ├── box-selection-handler.svelte.ts # Reactive box-selection overlay state
│   ├── context-menu-interaction-handler.svelte.ts
│   ├── creation-interaction-handler.ts
│   ├── fog-interaction-handler.ts
│   ├── token-selection-manager.ts      # Token hit testing and selection rules
│   ├── token-drag-handler.ts           # Token drag lifecycle and move requests
│   ├── token-resize-handler.ts         # Shift-wheel token size changes
│   ├── pin-interaction-handler.ts      # Pin click, drag, restore, save
│   ├── grid-interaction-handler.svelte.ts
│   ├── measurement-interaction-handler.ts
│   ├── map-interaction-handler-factory.ts
│   └── interaction-adapters.ts         # Narrow interfaces and default adapters
```

### `MapInteractionManager` Target Role

The manager now keeps:

- DOM event entry points
- container rect caching
- viewport coordinate calculation
- pan/zoom/keyboard viewport updates
- interaction priority ordering
- overlay state exposure needed by `MapOverlays.svelte`
- delegating token, pin, grid, fog, measurement, context menu, resize, box selection, and double-click creation work to focused handlers

Target size: 250-350 lines remains the long-term goal. The first pass reduced the file to 407 lines while keeping pan/zoom and event ordering in place.

### `TokenSelectionManager`

Responsibilities:

- hit-test token under viewport coordinates
- select single token on click
- deselect on empty VTT click
- add/remove/toggle selection based on modifier keys
- calculate tokens inside box-select rectangle
- expose no Svelte global stores directly

Implemented dependency shape:

```ts
export interface TokenSelectionDependencies {
  getTokens(): Token[];
  project(point: Point): Point;
  selectedTokens(): ReadonlySet<string>;
  setSelection(tokenId: string | null): void;
  addToSelection(tokenId: string): void;
  removeFromSelection(tokenId: string): void;
  setMultiSelection(tokenIds: string[]): void;
}
```

### `TokenDragHandler`

Responsibilities:

- begin drag if token hit and caller can move it
- calculate image-space offset
- move host token directly
- apply guest optimistic move and send P2P request
- confirm guest movement on drag end
- clear local drag state

Implemented dependency shape:

```ts
export interface TokenDragDependencies {
  getTokens(): Token[];
  project(point: Point): Point;
  unproject(point: Point): Point;
  isHostMode(): boolean;
  getPeerId(): string | null;
  canMoveToken(
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ): boolean;
  moveToken(tokenId: string, x: number, y: number): void;
  requestTokenMove(
    tokenId: string,
    x: number,
    y: number,
    persistent: boolean,
  ): void;
  sendTokenMoveRequest(tokenId: string, x: number, y: number): void;
  confirmTokenMove(tokenId: string): void;
  setDraggingTokenId(tokenId: string | null): void;
}
```

### `PinInteractionHandler`

Responsibilities:

- hit-test pin under viewport coordinates
- begin pin drag
- detect click-vs-drag threshold
- update in-memory pin coordinates only for non-guest GMs
- restore original coordinates on click gesture
- persist maps only after a meaningful drag
- focus linked entity on pin click

Implemented dependency shape:

```ts
export interface PinInteractionDependencies {
  getPins(): MapPin[];
  project(point: Point): Point;
  unproject(point: Point): Point;
  canEditPins(): boolean;
  updatePinCoordinates(pinId: string, point: Point): void;
  saveMaps(): Promise<void>;
  selectEntity(entityId: string): void;
}
```

## 5. Interaction Priority To Preserve

The refactor must preserve the existing ordering in `onMouseDown`, `onMouseMove`, and `onMouseUp`. This ordering is user-visible.

### Mouse Down Priority

1. Clear context menu and cache container rect.
2. Start box selection for GM + VTT + `Ctrl`/`Meta`.
3. Start token drag when VTT is enabled and a movable token is hit.
4. Start pin drag on left-click over pin when not holding Alt.
5. Start grid move mode.
6. Start grid fit mode.
7. Start fog painting for GM + Alt.
8. Fall back to panning for left-click.

### Mouse Move Priority

1. Update box selection bounds.
2. Move dragged token.
3. Move dragged pin.
4. Update grid fit bounds.
5. Move fog brush.
6. Update active measurement endpoint.
7. Pan viewport.

### Mouse Up Priority

1. Finish fog painting and broadcast sync.
2. Commit box selection.
3. End token drag and confirm guest move.
4. End pin click/drag and save when needed.
5. Commit grid fit.
6. Treat a pan click as a map click.
7. Clear panning.

## 6. Testing Coverage

PR #967 preserved the existing `map-interactions.test.ts` coverage for panning, wheel zoom, box selection start, Escape multi-selection clearing, and basic pin drag behavior. It also added focused tests for each extracted handler.

### Token handling tests

- movable token mousedown starts drag, sets `draggingTokenId`, and applies normal selection
- `Ctrl`/`Meta` on token mousedown adds to selection without replacing existing selection
- `Shift` on selected token removes it from multi-selection
- `Shift` on unselected token adds it to multi-selection
- non-movable token does not start drag and falls through to map click/pan behavior
- GM token drag calls `moveToken` with unprojected coordinates minus drag offset
- guest token drag calls optimistic `requestTokenMove(..., true)` and outbound `requestTokenMove`
- guest token mouse-up calls `confirmTokenMove`
- box selection commits only when rectangle area exceeds the threshold
- box selection ignores tiny click rectangles
- clicking empty VTT space clears token selection

### Pin handling tests

- pin click selects pin and linked entity without saving maps
- pin drag below threshold restores original coordinates
- pin drag above threshold updates in-memory coordinates and saves maps on mouse-up
- guest mode cannot mutate pin coordinates or save maps
- Alt-click over a pin starts fog painting instead of pin dragging

### Additional handler tests

- grid move commit/cancel
- grid fit start/update/commit/cancel
- live measurement end updates
- measurement start/lock/restart clicks
- context menu open/clear and token hit lookup
- shift-wheel token resize
- fog paint begin/move/finish and fog-sync broadcast
- double-click token/pin creation routing

### Interaction priority coverage

- token hit wins over pin hit when VTT mode is enabled and token is movable
- box-select shortcut wins over token drag for GM `Ctrl`/`Meta`
- active token drag suppresses panning
- active pin drag suppresses panning
- active grid fit suppresses panning

## 7. Completed Refactor Phases

### Phase 1: Add narrow dependency adapters

Implemented default adapters for map, session, vault, peer, notification, and mode dependencies while preserving the public constructor shape used by `MapView.svelte`.

Deliverables:

- `interaction-adapters.ts`
- updated `MapInteractionManager` constructor dependencies
- tests updated to use small fake adapters instead of broad `vi.mock` store modules

### Phase 2: Extract `TokenSelectionManager`

Moved token hit testing and selection rules out of the main manager.

Deliverables:

- `token-selection-manager.ts`
- focused unit tests for selection behavior
- `MapInteractionManager` uses selection manager for click, modifier selection, context menu token lookup, and box selection

### Phase 3: Extract `TokenDragHandler`

Moved token drag lifecycle out of the main manager.

Deliverables:

- `token-drag-handler.ts`
- focused unit tests for GM and guest drag paths
- `MapInteractionManager` keeps only event ordering and last pointer state

### Phase 4: Extract `PinInteractionHandler`

Moved pin drag/click/persistence handling out of the main manager.

Deliverables:

- `pin-interaction-handler.ts`
- focused tests for click, drag, restore, save, and guest restrictions
- `selectedPinId` remains exposed by `MapInteractionManager` or moves behind a small pin state object consumed by `MapOverlays.svelte`

### Phase 5: Extract grid and measurement handlers

Implemented in the first pass because the behavior was isolated and had clear test seams.

Deliverables:

- `grid-interaction-handler.svelte.ts`
- `measurement-interaction-handler.ts`
- focused tests for grid move/fit and measurement live/click flows

### Phase 6: Extract remaining isolated interaction helpers

Implemented in the first pass after token, pin, grid, and measurement were stable.

Deliverables:

- `box-selection-handler.svelte.ts`
- `context-menu-interaction-handler.svelte.ts`
- `token-resize-handler.ts`
- `fog-interaction-handler.ts`
- `creation-interaction-handler.ts`
- `map-interaction-handler-factory.ts`
- focused tests for each handler

## 8. Non-Goals

- Do not change token persistence or VTT protocol semantics.
- Do not change rendered map visuals.
- Do not move interaction state back into `MapView.svelte`.
- Do not replace mouse events with pointer events in the same PR. Pointer/touch support should come after the handlers are isolated.
- Do not refactor `VTTTokenManager` at the same time; this analysis is scoped to `MapInteractionManager`.

## 9. Acceptance Criteria Status

- [x] `MapInteractionManager` no longer imports `p2pGuestService`, `p2pHost`, or `vault` directly.
- [x] Token selection logic is unit-testable without Svelte store module mocks.
- [x] Token drag logic is unit-testable without a real peer session or full map session store.
- [x] Pin drag/click persistence behavior is unit-testable without the full vault store.
- [x] Existing map interaction tests still pass.
- [x] New tests cover expected and negative paths for extracted handlers.
- [x] User-visible behavior for pan, zoom, grid fit, fog painting, token drag, token selection, pin click, and pin drag remains unchanged.

## 10. Remaining Follow-ups

1. Consider extracting pan/zoom and keyboard viewport movement if the manager grows again.
2. Consider replacing mouse-only events with pointer events in a separate touch/mobile drag feature.
3. Keep new map interaction features in `apps/web/src/lib/components/map/interactions/` unless they are genuinely pan/zoom event routing.
4. Avoid adding direct `vault`, P2P service, or notification imports back into `MapInteractionManager`; use handler dependencies and adapters instead.
