import { mapSession } from "$lib/stores/map-session.svelte";
import { mapStore } from "$lib/stores/map.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import type { MapFogPainter } from "../map-fog-painter";
import { BoxSelectionHandler } from "./box-selection-handler.svelte";
import { ContextMenuInteractionHandler } from "./context-menu-interaction-handler.svelte";
import { CreationInteractionHandler } from "./creation-interaction-handler";
import { FogInteractionHandler } from "./fog-interaction-handler";
import { HexClickInteractionHandler } from "./hex-click-interaction-handler";
import { createHexClickDependencies } from "./hex-click-adapters";
import type { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
import { GridInteractionHandler } from "./grid-interaction-handler.svelte";
import {
  broadcastActiveMapFogSync,
  createGridInteractionDependencies,
  createMeasurementInteractionDependencies,
  createPinInteractionDependencies,
  createTokenDragDependencies,
  createTokenRotationDependencies,
  createTokenSelectionDependencies,
} from "./interaction-adapters";
import { MeasurementInteractionHandler } from "./measurement-interaction-handler";
import { PinInteractionHandler } from "./pin-interaction-handler";
import { TokenDragHandler } from "./token-drag-handler";
import { TokenResizeHandler } from "./token-resize-handler";
import { TokenRotationHandler } from "./token-rotation-handler";
import { TokenSelectionManager } from "./token-selection-manager";

export interface MapInteractionHandlers {
  tokenSelection: TokenSelectionManager;
  tokenDrag: TokenDragHandler;
  tokenRotation: TokenRotationHandler;
  pinInteractions: PinInteractionHandler;
  gridInteractions: GridInteractionHandler;
  measurementInteractions: MeasurementInteractionHandler;
  contextMenuInteractions: ContextMenuInteractionHandler;
  tokenResize: TokenResizeHandler;
  boxSelection: BoxSelectionHandler;
  fogInteractions: FogInteractionHandler;
  creationInteractions: CreationInteractionHandler;
  hexClickInteractions: HexClickInteractionHandler;
}

export type MapInteractionHandlerOverrides = Partial<MapInteractionHandlers> & {
  broadcastFogSync?: () => unknown;
  onMoveSettled?: (tokenIds: string[]) => void;
  /** Hex Crawl store for empty-map clicks. Omitted, clicks never open a hex. */
  hexCrawlStore?: HexCrawlStore | null;
  /** The map surface, used to return focus to the canvas when a hex panel closes. */
  getMapContainer?: () => HTMLElement | null;
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

  const fogInteractions =
    overrides.fogInteractions ??
    new FogInteractionHandler({
      painter,
      canPaint: () => mapStore.isGMMode,
      shouldBroadcastFogSync: () =>
        mapStore.isGMMode &&
        !sessionModeStore.isGuestMode &&
        mapSession.vttEnabled,
      broadcastFogSync,
    });

  return {
    tokenSelection,
    tokenDrag:
      overrides.tokenDrag ??
      new TokenDragHandler({
        ...createTokenDragDependencies(),
        onMoveSettled: overrides.onMoveSettled,
      }),
    tokenRotation:
      overrides.tokenRotation ??
      new TokenRotationHandler(createTokenRotationDependencies()),
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
        getFogHexTarget: (imgPoint) =>
          mapStore.showFog && !sessionModeStore.isGuestMode
            ? fogInteractions.hexTargetAt(imgPoint)
            : null,
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
    fogInteractions,
    hexClickInteractions:
      overrides.hexClickInteractions ??
      new HexClickInteractionHandler(
        createHexClickDependencies(
          overrides.hexCrawlStore ?? null,
          overrides.getMapContainer ?? (() => null),
        ),
      ),
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
