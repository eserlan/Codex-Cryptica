import { describe, expect, it, vi } from "vitest";
import {
  adoptGridGeometry,
  geometryEquals,
  resolveGridGeometry,
  shouldAdoptDeviceGeometry,
  writeGridGeometry,
  type DeviceGridSettings,
} from "./map-grid-geometry";
import type { Map as MapRecord } from "schema";

const baseMap = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Overland",
  assetPath: "maps/overland.webp",
  dimensions: { width: 800, height: 600 },
  pins: [],
} as MapRecord;

const device: DeviceGridSettings = {
  gridType: "hex-pointy",
  gridSize: 64,
  gridOffsetX: 4,
  gridOffsetY: -2,
  hexLabelConfig: { style: "alphanumeric" },
};

const storedGrid = {
  type: "hex-flat" as const,
  size: 30,
  offsetX: 1,
  offsetY: 2,
  labels: { style: "numeric" as const },
};

describe("resolveGridGeometry (T007, FR-037/038)", () => {
  it("prefers the geometry stored on the map", () => {
    expect(
      resolveGridGeometry({ ...baseMap, grid: storedGrid }, device),
    ).toEqual(storedGrid);
  });

  it("falls back to this device's settings when the map has none", () => {
    expect(resolveGridGeometry(baseMap, device)).toEqual({
      type: "hex-pointy",
      size: 64,
      offsetX: 4,
      offsetY: -2,
      labels: { style: "alphanumeric" },
    });
  });

  it("uses the defaults when neither the map nor this device has geometry", () => {
    expect(resolveGridGeometry(baseMap, null)).toEqual({
      type: "square",
      size: 50,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("ignores a corrupt stored grid and falls back to the device settings (negative case)", () => {
    const corrupt = {
      ...baseMap,
      grid: { type: "triangle", size: -1 },
    } as unknown as MapRecord;
    expect(resolveGridGeometry(corrupt, device).type).toBe("hex-pointy");
  });
});

describe("shouldAdoptDeviceGeometry (T007, FR-038)", () => {
  it("is true only when the map has no grid and this device has settings", () => {
    expect(shouldAdoptDeviceGeometry(baseMap, device)).toBe(true);
    expect(shouldAdoptDeviceGeometry(baseMap, null)).toBe(false);
    expect(
      shouldAdoptDeviceGeometry({ ...baseMap, grid: storedGrid }, device),
    ).toBe(false);
  });
});

describe("geometryEquals (T007)", () => {
  it("treats identical geometry as equal", () => {
    expect(geometryEquals(storedGrid, { ...storedGrid })).toBe(true);
  });

  it("detects a changed label style", () => {
    expect(
      geometryEquals(storedGrid, {
        ...storedGrid,
        labels: { style: "axial" },
      }),
    ).toBe(false);
  });

  it("treats missing labels and no labels as different", () => {
    expect(
      geometryEquals(storedGrid, { ...storedGrid, labels: undefined }),
    ).toBe(false);
  });
});

describe("adoptGridGeometry (FR-038)", () => {
  it("writes device geometry into a map that has none, exactly once", () => {
    const maps = { [baseMap.id]: { ...baseMap } as MapRecord };
    const saveMaps = vi.fn(async () => true);

    expect(adoptGridGeometry(maps, baseMap.id, device)).toBe(true);
    expect(maps[baseMap.id].grid?.type).toBe("hex-pointy");
    expect(adoptGridGeometry(maps, baseMap.id, device)).toBe(false);
    expect(saveMaps).not.toHaveBeenCalled();
  });

  it("does nothing when there are no device settings", () => {
    const maps = { [baseMap.id]: { ...baseMap } as MapRecord };
    expect(adoptGridGeometry(maps, baseMap.id, null)).toBe(false);
    expect(maps[baseMap.id].grid).toBeUndefined();
  });
});

describe("writeGridGeometry (T007, FR-037)", () => {
  it("updates vault.maps[id].grid and queues exactly one save", async () => {
    const maps = {
      [baseMap.id]: { ...baseMap, grid: storedGrid } as MapRecord,
    };
    const saveMaps = vi.fn(async () => true);

    const changed = await writeGridGeometry({ maps, saveMaps }, baseMap.id, {
      ...storedGrid,
      size: 40,
    });

    expect(changed).toBe(true);
    expect(maps[baseMap.id].grid?.size).toBe(40);
    expect(saveMaps).toHaveBeenCalledTimes(1);
  });

  it("queues nothing when the geometry is unchanged (negative case)", async () => {
    const maps = {
      [baseMap.id]: { ...baseMap, grid: storedGrid } as MapRecord,
    };
    const saveMaps = vi.fn(async () => true);

    expect(
      await writeGridGeometry({ maps, saveMaps }, baseMap.id, storedGrid),
    ).toBe(false);
    expect(saveMaps).not.toHaveBeenCalled();
  });

  it("does nothing for an unknown map id", async () => {
    const saveMaps = vi.fn(async () => true);
    expect(
      await writeGridGeometry({ maps: {}, saveMaps }, "missing", storedGrid),
    ).toBe(false);
    expect(saveMaps).not.toHaveBeenCalled();
  });
});
