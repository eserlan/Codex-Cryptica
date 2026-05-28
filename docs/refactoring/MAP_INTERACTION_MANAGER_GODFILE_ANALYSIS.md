# MapInteractionManager God-File Analysis

**File:** `apps/web/src/lib/components/map/map-interactions.svelte.ts`  
**Original Size:** 626 lines  
**Post-refactor Size:** 407 lines  
**Status:** In progress; first decomposition pass implemented  
**Parent Issue:** [#943](https://github.com/eserlan/Codex-Cryptica/issues/943)

## 1. Executive Summary

`MapInteractionManager` was created during the first `MapView.svelte` decomposition to move interaction logic out of a 1,500+ line component. That extraction was successful, but the new class has become its own multi-responsibility coordinator. It now owns canvas gestures, VTT token selection, token drag state, pin editing, fog painting, grid fitting, measurement interactions, context menu hit testing, and direct calls into several stores and P2P services.

The next refactor should not move logic back into Svelte components. It should split the interaction state machine into focused handlers with narrow injected dependencies, leaving `MapInteractionManager` as the event router and canvas gesture coordinator.

## 0. Implementation Snapshot

The branch `965-map-interaction-manager-decomposition` implements the first decomposition pass described by this analysis. The extracted handler set is broader than the initial token/pin proposal because several later candidates proved isolated enough to move safely in the same pass.

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

## 2. Current Responsibilities

### A. Canvas Gesture Coordination

The class tracks pointer coordinates, cached container bounds, panning, wheel zoom, keyboard pan/zoom, pointer-over state, and ARIA announcements.

Relevant code:

- `cachedRect`, `lastMousePos`, `mouseDownPos`, `isPanning`, `isPointerOver`
- `onKeyDown`, `onKeyUp`, `onMouseDown`, `onMouseMove`, `onMouseUp`, `onWheel`
- `getKeyboardViewportUpdate`, `getZoomViewportUpdate`, `shouldIgnoreMapKeyboardEvent`

This is the responsibility that should remain in `MapInteractionManager`.

### B. VTT Token Selection

The manager hit-tests tokens and directly mutates selection state:

- click selection
- empty-space deselection
- `Ctrl`/`Meta` add-to-selection
- `Shift` toggle selection
- multi-token box selection
- context-menu token lookup

Relevant code:

- `hitTestToken(mapSession.allTokens, ...)`
- `mapSession.setSelection`
- `mapSession.addToSelection`
- `mapSession.removeFromSelection`
- `mapSession.setMultiSelection`
- `mapSession.clearSelection`

This should be extracted into `TokenSelectionManager`.

### C. VTT Token Dragging

The manager owns drag state and coordinates host-vs-guest movement behavior:

- permission check through `canMoveToken`
- drag offset calculation
- GM immediate token movement
- guest optimistic movement
- guest P2P movement request
- guest move confirmation on mouse-up
- setting and clearing `draggingTokenId`

Relevant code:

- `dragState`
- `mapSession.canMoveToken(hitToken.id, p2pGuestService.peerId, mapStore.isGMMode)`
- `mapSession.moveToken`
- `mapSession.requestTokenMove`
- `p2pGuestService.requestTokenMove`
- `mapSession.confirmTokenMove`
- `mapSession.draggingTokenId`

This should be extracted into `TokenDragHandler`.

### D. Pin Selection And Editing

Pin interactions are unrelated to VTT token movement but share the same mouse handlers:

- pin hit testing
- pin drag state
- click-vs-drag threshold
- restoring original coordinates after click gestures
- in-memory pin coordinate updates
- map persistence through `vault.saveMaps`
- entity focus through `vault.selectedEntityId`

Relevant code:

- `pinDragState`
- `findClickedPin`
- `mapStore.updatePinCoordinatesInMemory`
- `vault.saveMaps`
- `vault.selectedEntityId`

This should be extracted after token handling, likely into `PinInteractionHandler`.

### E. Fog Painting

The class starts, moves, and finishes fog painting, then broadcasts fog sync when needed.

Relevant code:

- `this.painter.begin`
- `this.painter.move`
- `await this.painter.finish()`
- `p2pHost.broadcastActiveMapFogSync`

This can remain in the manager initially because it is canvas gesture behavior, but the P2P sync callback should be injected instead of imported directly.

### F. Grid Tools

The class owns grid move mode and grid fit mode:

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

This can stay in the manager for the first token-focused split, but it is a good later candidate for `GridInteractionHandler`.

### G. Measurement Tool

The manager updates active measurements during mouse move and click:

- live measurement endpoint updates
- first click starts measurement
- second click locks measurement
- third click restarts measurement

Relevant code:

- `mapSession.measurement`
- `mapSession.setMeasurementStart`
- `mapSession.setMeasurementEnd`
- `mapSession.setMeasurementLocked`

This is VTT tool behavior and can move to a later `MeasurementInteractionHandler` after token and pin extraction.

## 3. Coupling Problems

`MapInteractionManager` imports concrete global stores and services directly:

- `mapStore`
- `mapSession`
- `vault`
- `p2pGuestService`
- `p2pHost`
- `notificationStore`
- `sessionModeStore`

That makes unit tests depend on broad module mocks and makes the class hard to reuse for touch input or alternate pointer-event handling. The current tests mock whole stores instead of small behavior-specific interfaces, so a change in one map subsystem can break unrelated interaction tests.

The refactor should introduce constructor-based dependencies and narrow adapters. This aligns with the project constitution and matches the direction already used in VTT managers.

## 4. Proposed Architecture

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

The manager should keep:

- DOM event entry points
- container rect caching
- viewport coordinate calculation
- pan/zoom/keyboard viewport updates
- interaction priority ordering
- overlay state exposure needed by `MapOverlays.svelte`
- delegating token, pin, grid, fog, and measurement work to focused handlers

Target size: 250-350 lines remains the long-term goal. The first pass reduced the file to 407 lines while keeping pan/zoom and event ordering in place.

### `TokenSelectionManager`

Responsibilities:

- hit-test token under viewport coordinates
- select single token on click
- deselect on empty VTT click
- add/remove/toggle selection based on modifier keys
- calculate tokens inside box-select rectangle
- expose no Svelte global stores directly

Proposed dependencies:

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

Proposed dependencies:

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

Proposed dependencies:

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

## 6. Testing Strategy

The current `map-interactions.test.ts` covers panning, wheel zoom, box selection start, Escape multi-selection clearing, and basic pin drag behavior. Token behavior needs more focused coverage before extraction.

### Add tests before extracting token handling

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

### Add tests before extracting pin handling

- pin click selects pin and linked entity without saving maps
- pin drag below threshold restores original coordinates
- pin drag above threshold updates in-memory coordinates and saves maps on mouse-up
- guest mode cannot mutate pin coordinates or save maps
- Alt-click over a pin starts fog painting instead of pin dragging

### Add tests around interaction priority

- token hit wins over pin hit when VTT mode is enabled and token is movable
- box-select shortcut wins over token drag for GM `Ctrl`/`Meta`
- active token drag suppresses panning
- active pin drag suppresses panning
- active grid fit suppresses panning

## 7. Refactor Phases

### Phase 1: Add narrow dependency adapters

Introduce default adapters for map, session, vault, peer, notification, and mode dependencies while preserving the public constructor shape used by `MapView.svelte`.

Deliverables:

- `interaction-adapters.ts`
- updated `MapInteractionManager` constructor dependencies
- tests updated to use small fake adapters instead of broad `vi.mock` store modules

### Phase 2: Extract `TokenSelectionManager`

Move token hit testing and selection rules out of the main manager. Keep stateful overlay geometry in `MapInteractionManager`, but delegate the selected token calculation.

Deliverables:

- `token-selection-manager.ts`
- focused unit tests for selection behavior
- `MapInteractionManager` uses selection manager for click, modifier selection, context menu token lookup, and box selection

### Phase 3: Extract `TokenDragHandler`

Move token drag lifecycle out of the main manager.

Deliverables:

- `token-drag-handler.ts`
- focused unit tests for GM and guest drag paths
- `MapInteractionManager` keeps only event ordering and last pointer state

### Phase 4: Extract `PinInteractionHandler`

Move pin drag/click/persistence handling out of the main manager.

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

## 9. Acceptance Criteria

- `MapInteractionManager` no longer imports `p2pGuestService`, `p2pHost`, or `vault` directly.
- Token selection logic is unit-testable without Svelte store module mocks.
- Token drag logic is unit-testable without a real peer session or full map session store.
- Pin drag/click persistence behavior is unit-testable without the full vault store.
- Existing map interaction tests still pass.
- New tests cover both expected paths and at least one meaningful negative path for each extracted handler.
- User-visible behavior for pan, zoom, grid fit, fog painting, token drag, token selection, pin click, and pin drag remains unchanged.

## 10. Recommended Subtasks

1. Create `TokenSelectionManager` and `TokenDragHandler` behind injected adapters.
2. Move existing token selection and drag tests from broad manager mocks to focused handler tests.
3. Extract `PinInteractionHandler` once token behavior is stable.
4. Revisit `MapInteractionManager` size and decide whether grid and measurement need their own handlers.
5. Update `docs/refactoring/MAP_VIEW_REFACTOR.md` with a short note that the original map refactor is complete and this document tracks the second-stage interaction split.
