import {
  MapGridGeometrySchema,
  type Map as MapRecord,
  type MapGridGeometry,
} from "schema";

/**
 * Hex grid geometry travels with the map, so hex records stay on the right hexes
 * on every device and after a restore (FR-037). This module resolves and writes
 * it. Display preferences stay device-local (FR-040).
 */

/** The grid fields this device remembers, from the existing per-map settings. */
export interface DeviceGridSettings {
  gridType: MapGridGeometry["type"];
  gridSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
  hexLabelConfig?: MapGridGeometry["labels"];
}

const DEFAULT_GEOMETRY: MapGridGeometry = {
  type: "square",
  size: 50,
  offsetX: 0,
  offsetY: 0,
};

/** Labels only mean something on hex grids, so square geometry never carries them. */
function fromDevice(device: DeviceGridSettings): MapGridGeometry {
  const isHex = device.gridType !== "square";
  return {
    type: device.gridType,
    size: device.gridSize,
    offsetX: device.gridOffsetX,
    offsetY: device.gridOffsetY,
    ...(isHex && device.hexLabelConfig
      ? { labels: device.hexLabelConfig }
      : {}),
  };
}

/** This device's remembered grid, read from the persisted per-map settings. */
export function deviceGridFrom(persisted: {
  gridType: MapGridGeometry["type"];
  gridSize: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  hexLabelConfig?: MapGridGeometry["labels"];
}): DeviceGridSettings {
  return {
    gridType: persisted.gridType,
    gridSize: persisted.gridSize,
    gridOffsetX: persisted.gridOffsetX ?? 0,
    gridOffsetY: persisted.gridOffsetY ?? 0,
    hexLabelConfig: persisted.hexLabelConfig,
  };
}

/** Geometry as this device currently shows it, ready to store on the map. */
export function geometryFromDevice(
  device: DeviceGridSettings,
): MapGridGeometry {
  return fromDevice(device);
}

/** Map geometry first (only if it is valid), then this device's settings, then defaults. */
export function resolveGridGeometry(
  map: MapRecord,
  device: DeviceGridSettings | null,
): MapGridGeometry {
  if (map.grid) {
    const valid = MapGridGeometrySchema.safeParse(map.grid);
    if (valid.success) return valid.data;
  }
  return device ? fromDevice(device) : { ...DEFAULT_GEOMETRY };
}

/** Adoption happens once: only when the map has no geometry and this device does. */
export function shouldAdoptDeviceGeometry(
  map: MapRecord,
  device: DeviceGridSettings | null,
): boolean {
  return map.grid === undefined && device !== null;
}

export function geometryEquals(
  a: MapGridGeometry,
  b: MapGridGeometry,
): boolean {
  return (
    a.type === b.type &&
    a.size === b.size &&
    a.offsetX === b.offsetX &&
    a.offsetY === b.offsetY &&
    JSON.stringify(a.labels ?? null) === JSON.stringify(b.labels ?? null)
  );
}

/**
 * Copy this device's geometry into a map that has none yet. Returns true if a
 * change was made. The caller saves the maps (FR-038).
 */
export function adoptGridGeometry(
  maps: Record<string, MapRecord>,
  mapId: string,
  device: DeviceGridSettings | null,
): boolean {
  const map = maps[mapId];
  if (!map || !shouldAdoptDeviceGeometry(map, device) || !device) return false;
  map.grid = fromDevice(device);
  return true;
}

/**
 * Set a map's geometry and queue one save. Writing equal geometry changes
 * nothing and queues nothing. Returns true if the map changed.
 */
export async function writeGridGeometry(
  deps: {
    maps: Record<string, MapRecord>;
    saveMaps: () => Promise<boolean>;
  },
  mapId: string,
  geometry: MapGridGeometry,
): Promise<boolean> {
  const map = deps.maps[mapId];
  if (!map) return false;
  if (map.grid && geometryEquals(map.grid, geometry)) return false;
  map.grid = geometry;
  await deps.saveMaps();
  return true;
}
