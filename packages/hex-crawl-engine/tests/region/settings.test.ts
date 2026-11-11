import { describe, expect, it } from "bun:test";
import {
  availableTerrains,
  normalizeRegionSettings,
} from "../../src/region/settings";
import { PRESET_TERRAIN_IDS } from "../../src/terrain";

describe("normalizeRegionSettings", () => {
  it("falls back to Temperate with no levels for junk", () => {
    for (const raw of [undefined, null, 3, "x", [], { preset: "nope" }]) {
      expect(normalizeRegionSettings(raw)).toEqual({
        preset: "temperate",
        levels: {},
      });
    }
  });
  it("keeps valid values and drops unknown terrains and levels", () => {
    const result = normalizeRegionSettings({
      preset: "arid",
      levels: {
        water: "none",
        forest: "more",
        lava: "more",
        hills: "extreme",
        plains: 2,
      },
    });
    expect(result).toEqual({
      preset: "arid",
      levels: { water: "none", forest: "more" },
    });
  });
});

describe("availableTerrains", () => {
  it("lists every terrain by default and leaves out those set to none", () => {
    expect(availableTerrains({ preset: "temperate", levels: {} })).toEqual([
      ...PRESET_TERRAIN_IDS,
    ]);
    const list = availableTerrains({
      preset: "temperate",
      levels: { water: "none", coast: "none" },
    });
    expect(list).not.toContain("water");
    expect(list).not.toContain("coast");
    expect(list).toContain("forest");
  });
  it("is empty when everything is none", () => {
    const levels = Object.fromEntries(
      PRESET_TERRAIN_IDS.map((id) => [id, "none" as const]),
    );
    expect(availableTerrains({ preset: "temperate", levels })).toEqual([]);
  });
});
