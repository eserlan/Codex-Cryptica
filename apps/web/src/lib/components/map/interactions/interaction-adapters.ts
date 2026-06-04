import { p2pGuestService } from "$lib/cloud-bridge/p2p/guest-service";
import { p2pHost } from "$lib/cloud-bridge/p2p/host-service.svelte";
import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import type { GridInteractionDependencies } from "./grid-interaction-handler.svelte";
import type { MeasurementInteractionDependencies } from "./measurement-interaction-handler";
import type { PinInteractionDependencies } from "./pin-interaction-handler";
import type { TokenDragDependencies } from "./token-drag-handler";
import type { TokenSelectionDependencies } from "./token-selection-manager";

export function createTokenSelectionDependencies(): TokenSelectionDependencies {
  return {
    getTokens: () => mapSession.allTokens,
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
    getTokens: () => mapSession.allTokens,
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

export function createPinInteractionDependencies(): PinInteractionDependencies {
  return {
    getPins: () => mapStore.pins,
    project: (point) => mapStore.project(point),
    unproject: (point) => mapStore.unproject(point),
    canEditPins: () => mapStore.isGMMode && !sessionModeStore.isGuestMode,
    updatePinCoordinates: (pinId, point) =>
      mapStore.updatePinCoordinatesInMemory(pinId, point),
    saveMaps: () => vault.saveMaps(),
    selectEntity: (entityId) => {
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
