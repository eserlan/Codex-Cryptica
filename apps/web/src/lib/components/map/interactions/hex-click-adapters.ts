import { pointToHex } from "map-engine";
import type { HexCrawlStore } from "#lib/stores/hex-crawl/hex-crawl.svelte.js";
import { mapSession } from "#lib/stores/map-session.svelte.js";
import { mapStore } from "#lib/stores/map.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import {
  canSeeHexCrawl,
  hexGridConfigFor,
  isHexGridType,
} from "../hex-crawl/hex-crawl-view";
import type {
  HexClickDependencies,
  HexClickState,
} from "./hex-click-interaction-handler";

/** A grid operation, placement or measurement owns the press, so a hex must not open. */
function isPressOwnedElsewhere(): boolean {
  return Boolean(
    mapSession.gridMoveMode ||
    mapSession.gridFitMode ||
    mapSession.notePlacementArmed ||
    mapSession.tileDeckManager.pendingPlacement ||
    mapSession.measurement?.active,
  );
}

function readHexClickState(store: HexCrawlStore | null): HexClickState {
  const mapId = mapStore.activeMapId ?? null;
  return {
    canSeeHexCrawl: canSeeHexCrawl({
      isGM: mapStore.isGMMode,
      isGuest: sessionModeStore.isGuestMode,
    }),
    enabled: Boolean(store && mapId && store.isEnabled(mapId)),
    isHexGrid: isHexGridType(mapStore.gridType),
    mapId,
    blocked: isPressOwnedElsewhere(),
  };
}

/**
 * Wires the hex click handler to the live map. Without a store (for example
 * before the lead mounts Hex Crawl) the handler never opens anything.
 */
export function createHexClickDependencies(
  store: HexCrawlStore | null,
  getOpener: () => HTMLElement | null,
): HexClickDependencies {
  return {
    readState: () => readHexClickState(store),
    hexAt: (point) =>
      pointToHex(mapStore.unproject(point), hexGridConfigFor(mapStore)),
    openHex: (mapId, hex) => {
      store?.openHex(mapId, hex, getOpener() ?? undefined);
    },
  };
}
