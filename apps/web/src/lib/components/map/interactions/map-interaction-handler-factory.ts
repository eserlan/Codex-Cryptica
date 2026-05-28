import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import type { MapFogPainter } from "../map-fog-painter";
import { BoxSelectionHandler } from "./box-selection-handler.svelte";
import { ContextMenuInteractionHandler } from "./context-menu-interaction-handler.svelte";
import { CreationInteractionHandler } from "./creation-interaction-handler";
import { FogInteractionHandler } from "./fog-interaction-handler";
import { GridInteractionHandler } from "./grid-interaction-handler.svelte";
import {
  broadcastActiveMapFogSync,
  createGridInteractionDependencies,
  createMeasurementInteractionDependencies,
  createPinInteractionDependencies,
  createTokenDragDependencies,
  createTokenSelectionDependencies,
} from "./interaction-adapters";
import { MeasurementInteractionHandler } from "./measurement-interaction-handler";
import { PinInteractionHandler } from "./pin-interaction-handler";
import { TokenDragHandler } from "./token-drag-handler";
import { TokenResizeHandler } from "./token-resize-handler";
import { TokenSelectionManager } from "./token-selection-manager";

export interface MapInteractionHandlers {
  tokenSelection: TokenSelectionManager;
  tokenDrag: TokenDragHandler;
  pinInteractions: PinInteractionHandler;
  gridInteractions: GridInteractionHandler;
  measurementInteractions: MeasurementInteractionHandler;
  contextMenuInteractions: ContextMenuInteractionHandler;
  tokenResize: TokenResizeHandler;
  boxSelection: BoxSelectionHandler;
  fogInteractions: FogInteractionHandler;
  creationInteractions: CreationInteractionHandler;
}

export type MapInteractionHandlerOverrides = Partial<MapInteractionHandlers> & {
  broadcastFogSync?: () => unknown;
};

export function createMapInteractionHandlers(
  painter: MapFogPainter,
  overrides: MapInteractionHandlerOverrides = {},
): MapInteractionHandlers {
  const tokenSelection =
    overrides.tokenSelection ??
    new TokenSelectionManager(createTokenSelectionDependencies());
  const broadcastFogSync =
    overrides.broadcastFogSync ?? broadcastActiveMapFogSync;

  return {
    tokenSelection,
    tokenDrag:
      overrides.tokenDrag ??
      new TokenDragHandler(createTokenDragDependencies()),
    pinInteractions:
      overrides.pinInteractions ??
      new PinInteractionHandler(createPinInteractionDependencies()),
    gridInteractions:
      overrides.gridInteractions ??
      new GridInteractionHandler(createGridInteractionDependencies()),
    measurementInteractions:
      overrides.measurementInteractions ??
      new MeasurementInteractionHandler(
        createMeasurementInteractionDependencies(),
      ),
    contextMenuInteractions:
      overrides.contextMenuInteractions ??
      new ContextMenuInteractionHandler({
        isVttEnabled: () => mapSession.vttEnabled,
        unproject: (point) => mapStore.unproject(point),
        tokenSelection,
      }),
    tokenResize:
      overrides.tokenResize ??
      new TokenResizeHandler({
        tokenSelection,
        getGridSize: () => mapStore.gridSize,
        updateToken: (tokenId, updates) =>
          mapSession.updateToken(tokenId, updates),
      }),
    boxSelection:
      overrides.boxSelection ??
      new BoxSelectionHandler({
        isHostMode: () => mapStore.isGMMode,
        isVttEnabled: () => mapSession.vttEnabled,
        tokenSelection,
      }),
    fogInteractions:
      overrides.fogInteractions ??
      new FogInteractionHandler({
        painter,
        canPaint: () => mapStore.isGMMode,
        shouldBroadcastFogSync: () =>
          mapStore.isGMMode &&
          !sessionModeStore.isGuestMode &&
          mapSession.vttEnabled,
        broadcastFogSync,
      }),
    creationInteractions:
      overrides.creationInteractions ??
      new CreationInteractionHandler({
        unproject: (point) => mapStore.unproject(point),
        isVttEnabled: () => mapSession.vttEnabled,
        canCreateTokens: () =>
          mapStore.isGMMode && !sessionModeStore.isGuestMode,
        setPendingTokenCoords: (point) => {
          mapSession.pendingTokenCoords = point;
        },
        setPendingPinCoords: (point) => {
          mapStore.pendingPinCoords = point;
        },
      }),
  };
}
