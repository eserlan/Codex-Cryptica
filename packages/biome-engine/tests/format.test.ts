import { describe, expect, it } from "bun:test";
import { formatRange, listBiomeSources } from "../src/format";
import { getBiome } from "../src/catalogue";

describe("formatRange", () => {
  it("writes the low and high values with the unit", () => {
    expect(formatRange({ low: -20, high: 0, unit: "°C" })).toBe("-20 to 0 °C");
    expect(formatRange({ low: 150, high: 400, unit: "mm per year" })).toBe(
      "150 to 400 mm per year",
    );
  });

  it("collapses an equal low and high to one value", () => {
    expect(formatRange({ low: 5, high: 5, unit: "m" })).toBe("5 m");
  });

  it("groups thousands for readability", () => {
    expect(formatRange({ low: 1500, high: 5000, unit: "m" })).toBe(
      "1,500 to 5,000 m",
    );
  });
});

describe("listBiomeSources", () => {
  it("lists the biome's own sources first, then any other cited ones, without duplicates", () => {
    const tundra = getBiome("tundra")!;
    const sources = listBiomeSources(tundra);
    const ids = sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.slice(0, tundra.sourceIds.length)).toEqual(tundra.sourceIds);
  });

  it("skips ids it cannot resolve instead of throwing", () => {
    const base = getBiome("tundra")!;
    const sources = listBiomeSources({
      ...base,
      sourceIds: ["nope", ...base.sourceIds],
    });
    expect(sources.every((s) => s.id !== "nope")).toBe(true);
  });
});
