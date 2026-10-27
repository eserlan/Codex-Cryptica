import { describe, expect, it, vi } from "vitest";
import type { Map } from "schema";
import { hexToPoint, pointToHex } from "map-engine";
vi.mock("./vault.svelte", () => ({ vault: {} }));
vi.mock("./categories.svelte", () => ({
  categories: { getColor: () => "red" },
}));
import { MapPins } from "./map-pins";

function setup() {
  const map: Map = {
    id: "map",
    name: "Map",
    assetPath: "",
    dimensions: { width: 100, height: 100 },
    pins: [],
  };
  const vault = {
    maps: { map } as Record<string, Map>,
    entities: {},
    saveMaps: vi.fn().mockResolvedValue(undefined),
  };
  const state = {
    activeMapId: "map" as string | null,
    pins: map.pins,
    viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
    showGrid: true,
    gridType: "hex-flat" as const,
    gridSize: 50,
    gridOffsetX: 10,
    gridOffsetY: -5,
  };
  return {
    map,
    vault,
    state,
    pins: new MapPins(state, { uuid: () => "pin" }, vault),
  };
}

describe("MapPins", () => {
  it("snaps new pins, keeps drag coordinates, then snaps on release", async () => {
    const { pins, map } = setup();
    const config = {
      orientation: "flat" as const,
      size: 50,
      offsetX: 10,
      offsetY: -5,
    };
    const point = { x: 85, y: 67 };
    await pins.addPin(undefined, point);
    const hex = pointToHex(point, config);
    expect(map.pins[0]).toMatchObject({
      coordinates: hexToPoint(hex, config),
      hexCoordinates: hex,
    });
    const dragged = { x: 130, y: 90 };
    pins.updatePinCoordinatesInMemory("pin", dragged);
    expect(map.pins[0].coordinates).toEqual(dragged);
    pins.snapPinCoordinatesInMemory("pin");
    expect(map.pins[0].coordinates).toEqual(
      hexToPoint(pointToHex(dragged, config), config),
    );
  });

  it("ignores edits without an active map or matching pin", async () => {
    const { pins, state, vault, map } = setup();
    pins.snapPinCoordinatesInMemory("missing");
    state.activeMapId = null;
    await pins.addPin(undefined, { x: 1, y: 2 });
    await pins.removePin("missing");
    pins.updatePinCoordinatesInMemory("missing", { x: 1, y: 2 });
    expect(map.pins).toEqual([]);
    expect(vault.saveMaps).not.toHaveBeenCalled();
  });

  it("removes entity pins across maps and only saves changes", async () => {
    const { pins, vault, map } = setup();
    await pins.addPin("entity", { x: 0, y: 0 });
    vault.maps.other = { ...map, id: "other", pins: [...map.pins] };
    vault.saveMaps.mockClear();
    await pins.removePinsForEntity("entity");
    expect(map.pins).toEqual([]);
    expect(vault.maps.other.pins).toEqual([]);
    expect(vault.saveMaps).toHaveBeenCalledOnce();
    await pins.removePinsForEntity("missing");
    expect(vault.saveMaps).toHaveBeenCalledOnce();
  });

  it("centres a pin without reducing an existing inspection zoom", async () => {
    const { pins, map, state } = setup();
    state.showGrid = false;
    await pins.addPin(undefined, { x: 20, y: 30 });
    state.pins = map.pins;
    pins.jumpToPin("pin");
    expect(state.viewport).toEqual({ pan: { x: -24, y: -36 }, zoom: 1.2 });
    state.viewport.zoom = 2;
    pins.jumpToPin("pin");
    expect(state.viewport.zoom).toBe(2);
    await pins.removePin("pin");
    expect(map.pins).toEqual([]);
  });
});
