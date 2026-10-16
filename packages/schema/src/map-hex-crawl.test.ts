import { describe, expect, it } from "bun:test";
import { MapSchema } from "./map";

const legacyMap = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Overland",
  assetPath: "maps/overland.webp",
  dimensions: { width: 800, height: 600 },
  pins: [],
};

describe("MapSchema hex crawl fields (T004)", () => {
  it("accepts a legacy map with no grid or hexCrawl (unchanged behaviour)", () => {
    const parsed = MapSchema.parse(legacyMap);
    expect(parsed.grid).toBeUndefined();
    expect(parsed.hexCrawl).toBeUndefined();
  });

  it("accepts a valid grid geometry", () => {
    const parsed = MapSchema.parse({
      ...legacyMap,
      grid: {
        type: "hex-pointy",
        size: 48,
        offsetX: 3.5,
        offsetY: -2,
        labels: { style: "alphanumeric", startCol: "A", startRow: 1 },
      },
    });
    expect(parsed.grid?.type).toBe("hex-pointy");
    expect(parsed.grid?.size).toBe(48);
  });

  it("rejects a non-positive grid size", () => {
    for (const size of [0, -1]) {
      expect(() =>
        MapSchema.parse({
          ...legacyMap,
          grid: { type: "hex-flat", size, offsetX: 0, offsetY: 0 },
        }),
      ).toThrow();
    }
  });

  it("rejects a non-finite offset", () => {
    expect(() =>
      MapSchema.parse({
        ...legacyMap,
        grid: { type: "square", size: 50, offsetX: Number.NaN, offsetY: 0 },
      }),
    ).toThrow();
  });

  it("rejects an unknown grid type", () => {
    expect(() =>
      MapSchema.parse({
        ...legacyMap,
        grid: { type: "triangle", size: 50, offsetX: 0, offsetY: 0 },
      }),
    ).toThrow();
  });

  it("accepts a hexCrawl object without validating record internals", () => {
    const parsed = MapSchema.parse({
      ...legacyMap,
      hexCrawl: { enabled: true, hexes: { "1,2": { anything: true } } },
    });
    expect(parsed.hexCrawl?.enabled).toBe(true);
  });
});
