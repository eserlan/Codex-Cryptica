import { describe, expect, it } from "vitest";
import {
  MAP_LAYER_ORDER,
  mapLayerRank,
  nextZIndexInLayer,
  normalizeMapLayer,
} from "./layers";

describe("mapLayerRank", () => {
  it("orders terrain below object below token", () => {
    expect(mapLayerRank("terrain")).toBeLessThan(mapLayerRank("object"));
    expect(mapLayerRank("object")).toBeLessThan(mapLayerRank("token"));
  });

  it("matches the declared order array", () => {
    expect(MAP_LAYER_ORDER.map(mapLayerRank)).toEqual([0, 1, 2]);
  });
});

describe("normalizeMapLayer", () => {
  it("passes through a valid value", () => {
    expect(normalizeMapLayer("object")).toBe("object");
  });

  it("defaults legacy tile-deck art to terrain", () => {
    expect(normalizeMapLayer(undefined, "tile")).toBe("terrain");
  });

  it("defaults legacy regular tokens to the token layer", () => {
    expect(normalizeMapLayer(undefined, "token")).toBe("token");
    expect(normalizeMapLayer(undefined)).toBe("token");
  });

  it("rejects an unknown value the same way as undefined", () => {
    expect(normalizeMapLayer("ceiling", "tile")).toBe("terrain");
  });
});

describe("nextZIndexInLayer", () => {
  it("returns 0 for an empty layer", () => {
    expect(nextZIndexInLayer([])).toBe(0);
  });

  it("returns one past the highest zIndex in the given set", () => {
    expect(
      nextZIndexInLayer([{ zIndex: 2 }, { zIndex: 5 }, { zIndex: 1 }]),
    ).toBe(6);
  });

  it("ignores non-finite zIndex values", () => {
    expect(nextZIndexInLayer([{ zIndex: NaN }, { zIndex: 3 }])).toBe(4);
  });
});
