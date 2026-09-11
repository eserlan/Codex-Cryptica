import type { MapLayer } from "map-engine";

/**
 * Which layer new placements land on. Session-local and non-networked — same
 * tier as `VTTGridManager`'s `gridFitMode`/`gridMoveMode`, not persisted or
 * broadcast to guests.
 */
export class VTTLayerManager {
  activeLayer = $state<MapLayer>("terrain");

  setActiveLayer(layer: MapLayer) {
    this.activeLayer = layer;
  }
}
