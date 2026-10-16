import type { HexCoord } from "map-engine";
import { hexToPoint, type HexGridConfig } from "map-engine";

/** The slice of the map store the hex map port needs. */
export interface HexMapStoreLike {
  activeMapId: string | null;
  addPin(
    entityId: string | undefined,
    coordinates: { x: number; y: number },
  ): unknown;
}

/**
 * Pins an entity at a hex through the active map's own pin path. Only the map
 * on screen can be pinned to, so any other map is refused with a plain message.
 */
export async function pinAtHex(
  store: HexMapStoreLike,
  config: HexGridConfig | null,
  mapId: string,
  entityId: string,
  hex: HexCoord,
): Promise<void> {
  if (store.activeMapId !== mapId || !config) {
    throw new Error("Open this map to pin an entity to a hex.");
  }
  await store.addPin(entityId, hexToPoint(hex, config));
}
