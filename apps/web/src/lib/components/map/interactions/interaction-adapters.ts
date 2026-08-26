import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import type { GridInteractionDependencies } from "./grid-interaction-handler.svelte";
import type { MeasurementInteractionDependencies } from "./measurement-interaction-handler";
import type { PinInteractionDependencies } from "./pin-interaction-handler";
import type { TokenDragDependencies } from "./token-drag-handler";
import type { TokenRotationDependencies } from "./token-rotation-handler";
import type { TokenSelectionDependencies } from "./token-selection-manager";

/**
 * `mapSession.allTokens` is the raw, unfiltered token record — using it
 * directly for hit-testing would let a guest select/drag a token they can't
 * even see (`canViewToken` gate), or a token on a layer the GM has hidden or
 * locked from editing. `MapView.svelte`'s render list already applies both
 * checks; this is the same filter for interaction (click/drag) purposes.
 *
 * For the host only, hit-testing is additionally exclusive to the active
 * layer — like a paint program's layer panel, only the layer you're
 * currently working on is reachable by click/drag, so e.g. selecting the
 * Furniture layer means terrain tiles and combatant tokens underneath it
 * simply can't be clicked or nudged by accident. This does NOT apply to
 * guests: `activeLayer` is a GM-local editing-mode concept (never synced),
 * and a player must always be able to select/move their own token
 * regardless of whatever the GM's map-building focus happens to be.
 *
 * Notes are exempt from that active-layer exclusivity. A note is an
 * annotation dropped on top of whatever the GM is building, not a piece of
 * the map being built, and it always rides the token layer so it stays
 * readable above the terrain it annotates. Without the exemption a note
 * pinned while editing Terrain (the layer the session opens on) could never
 * be selected or moved again.
 */
function hitTestableTokens() {
  const peerId = mapSession.myPeerId;
  const isHost = mapStore.isGMMode;
  return mapSession.allTokens.filter((token) => {
    const layer = token.layer ?? "token";
    return (
      mapSession.canViewToken(token.id, peerId, isHost) &&
      mapStore.layerVisibility[layer] !== false &&
      (!isHost || layer === mapSession.activeLayer || token.kind === "note")
    );
  });
}

export function createTokenSelectionDependencies(): TokenSelectionDependencies {
  return {
    getTokens: hitTestableTokens,
    project: (point) => mapStore.project(point),
    getSelectedTokens: () => mapSession.selectedTokens,
    setSelection: (tokenId) => mapSession.setSelection(tokenId),
    addToSelection: (tokenId) => mapSession.addToSelection(tokenId),
    removeFromSelection: (tokenId) => mapSession.removeFromSelection(tokenId),
    setMultiSelection: (tokenIds) => mapSession.setMultiSelection(tokenIds),
  };
}

export function createTokenDragDependencies(): TokenDragDependencies {
  return {
    getTokens: hitTestableTokens,
    project: (point) => mapStore.project(point),
    unproject: (point) => mapStore.unproject(point),
    isHostMode: () => mapStore.isGMMode,
    getPeerId: () => p2pGuestService.peerId,
    canMoveToken: (tokenId, peerId, isHost) =>
      mapSession.canMoveToken(tokenId, peerId, isHost),
    moveToken: (tokenId, x, y) => mapSession.moveToken(tokenId, x, y),
    requestTokenMove: (tokenId, x, y, persistent) =>
      mapSession.requestTokenMove(tokenId, x, y, persistent),
    sendTokenMoveRequest: (tokenId, x, y) =>
      p2pGuestService.requestTokenMove(tokenId, x, y),
    confirmTokenMove: (tokenId) => mapSession.confirmTokenMove(tokenId),
    setDraggingTokenId: (tokenId) => {
      mapSession.draggingTokenId = tokenId;
    },
  };
}

export function createTokenRotationDependencies(): TokenRotationDependencies {
  return {
    getSelectedToken: () => mapSession.selectedToken,
    project: (point) => mapStore.project(point),
    unproject: (point) => mapStore.unproject(point),
    isHostMode: () => mapStore.isGMMode,
    getPeerId: () => p2pGuestService.peerId,
    canMoveToken: (tokenId, peerId, isHost) =>
      mapSession.canMoveToken(tokenId, peerId, isHost),
    rotateToken: (tokenId, rotation) =>
      mapSession.rotateToken(tokenId, rotation),
    requestTokenRotation: (tokenId, rotation, persistent) =>
      mapSession.requestTokenRotation(tokenId, rotation, persistent),
    sendTokenRotation: (tokenId, rotation) =>
      p2pGuestService.requestTokenRotation(tokenId, rotation),
    confirmTokenRotation: (tokenId) => mapSession.confirmTokenRotation(tokenId),
  };
}

export function createPinInteractionDependencies(): PinInteractionDependencies {
  return {
    getPins: () => mapStore.pins,
    project: (point) => mapStore.project(point),
    unproject: (point) => mapStore.unproject(point),
    canEditPins: () => mapStore.isGMMode && !sessionModeStore.isGuestMode,
    updatePinCoordinates: (pinId, point) =>
      mapStore.updatePinCoordinatesInMemory(pinId, point),
    saveMaps: () => vault.saveMaps(),
    selectEntity: (entityId, selectionPoint) => {
      layoutUIStore.setLastSelectedNodePosition(selectionPoint);
      vault.selectedEntityId = entityId;
    },
  };
}

export function createGridInteractionDependencies(): GridInteractionDependencies {
  return {
    isGridMoveMode: () => mapSession.gridMoveMode,
    setGridMoveMode: (active) => {
      mapSession.gridMoveMode = active;
    },
    isGridFitMode: () => mapSession.gridFitMode,
    setGridFitMode: (active) => {
      mapSession.gridFitMode = active;
    },
    isHostMode: () => mapStore.isGMMode,
    getViewport: () => mapStore.viewport,
    getCanvasSize: () => mapStore.canvasSize,
    getGridSize: () => mapStore.gridSize,
    setGridSize: (gridSize) => {
      mapStore.gridSize = gridSize;
    },
    setGridOffset: (offset) => {
      mapStore.gridOffsetX = offset.x;
      mapStore.gridOffsetY = offset.y;
    },
    setShowGridSettings: (show) => {
      mapSession.showGridSettings = show;
    },
    unproject: (point) => mapStore.unproject(point),
    clearNotification: () => notificationStore.clearNotification(),
  };
}

export function createMeasurementInteractionDependencies(): MeasurementInteractionDependencies {
  return {
    getMeasurement: () => mapSession.measurement,
    unproject: (point) => mapStore.unproject(point),
    setMeasurementStart: (start) => mapSession.setMeasurementStart(start),
    setMeasurementEnd: (end, silent) =>
      mapSession.setMeasurementEnd(end, silent),
    setMeasurementLocked: (locked) => mapSession.setMeasurementLocked(locked),
  };
}

export function broadcastActiveMapFogSync() {
  return p2pHost.broadcastActiveMapFogSync();
}
