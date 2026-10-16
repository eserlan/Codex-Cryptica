import { describe, expect, it } from "bun:test";
import {
  PRESET_TERRAIN_IDS,
  TERRAIN_CATALOGUE,
  parseTerrainInput,
  terrainIcon,
  terrainLabel,
} from "../src/terrain";

describe("terrain catalogue (T006)", () => {
  it("has a label and an icon for all nine presets", () => {
    expect(PRESET_TERRAIN_IDS).toEqual([
      "plains",
      "forest",
      "hills",
      "mountains",
      "swamp",
      "desert",
      "water",
      "coast",
      "tundra",
    ]);
    for (const id of PRESET_TERRAIN_IDS) {
      expect(TERRAIN_CATALOGUE[id].label.length).toBeGreaterThan(0);
      expect(TERRAIN_CATALOGUE[id].icon).toMatch(/^icon-\[lucide--[a-z-]+\]$/);
    }
  });

  it("gives custom terrain the generic map pin icon", () => {
    expect(terrainIcon({ kind: "custom", label: "Glass dunes" })).toBe(
      "icon-[lucide--map-pin]",
    );
  });

  it("labels presets and custom terrain", () => {
    expect(terrainLabel({ kind: "preset", id: "forest" })).toBe(
      TERRAIN_CATALOGUE.forest.label,
    );
    expect(terrainLabel({ kind: "custom", label: "Glass dunes" })).toBe(
      "Glass dunes",
    );
  });
});

describe("parseTerrainInput (T006)", () => {
  it("matches presets case-insensitively", () => {
    expect(parseTerrainInput("  FOREST ")).toEqual({
      kind: "preset",
      id: "forest",
    });
    expect(parseTerrainInput("tundra")).toEqual({
      kind: "preset",
      id: "tundra",
    });
  });

  it("returns custom terrain for other text, trimmed", () => {
    expect(parseTerrainInput("  Glass dunes  ")).toEqual({
      kind: "custom",
      label: "Glass dunes",
    });
  });

  it("returns null for empty or blank input", () => {
    expect(parseTerrainInput("")).toBeNull();
    expect(parseTerrainInput("   ")).toBeNull();
  });

  it("returns null for custom text over 40 characters", () => {
    expect(parseTerrainInput("x".repeat(41))).toBeNull();
    expect(parseTerrainInput("x".repeat(40))).toEqual({
      kind: "custom",
      label: "x".repeat(40),
    });
  });
});
