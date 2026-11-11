import { describe, expect, it } from "vitest";
import {
  canSeeHexCrawl,
  hexGridConfigFor,
  hexLabelFor,
  hexOnMap,
  isHexGridType,
} from "./hex-crawl-view";

describe("canSeeHexCrawl (FR-041)", () => {
  it("is visible to the GM who is not a guest", () => {
    expect(canSeeHexCrawl({ isGM: true, isGuest: false })).toBe(true);
  });

  it("is hidden from guests, even when they are GM-flagged", () => {
    expect(canSeeHexCrawl({ isGM: true, isGuest: true })).toBe(false);
  });

  it("is hidden from connected players and Player View previews", () => {
    expect(canSeeHexCrawl({ isGM: false, isGuest: false })).toBe(false);
  });
});

describe("isHexGridType", () => {
  it("accepts pointy and flat hex grids only", () => {
    expect(isHexGridType("hex-pointy")).toBe(true);
    expect(isHexGridType("hex-flat")).toBe(true);
    expect(isHexGridType("square")).toBe(false);
    expect(isHexGridType("triangle")).toBe(false);
  });
});

describe("hexGridConfigFor", () => {
  it("maps the map grid fields onto a flat orientation", () => {
    expect(
      hexGridConfigFor({
        gridType: "hex-flat",
        gridSize: 40,
        gridOffsetX: 3,
        gridOffsetY: -2,
      }),
    ).toEqual({ orientation: "flat", size: 40, offsetX: 3, offsetY: -2 });
  });

  it("defaults to pointy orientation for any non-flat type", () => {
    expect(
      hexGridConfigFor({
        gridType: "hex-pointy",
        gridSize: 50,
        gridOffsetX: 0,
        gridOffsetY: 0,
      }).orientation,
    ).toBe("pointy");
  });
});

describe("hexLabelFor", () => {
  it("uses the map's alphanumeric label style", () => {
    expect(
      hexLabelFor(
        { q: 2, r: 3 },
        { style: "alphanumeric", startCol: "A", startRow: 1, rowPadding: 2 },
        "pointy",
      ),
    ).toBe("D04");
  });

  it("falls back to the numeric format when labels are hidden", () => {
    expect(hexLabelFor({ q: 1, r: 4 }, { style: "none" }, "pointy")).toBe(
      "01.04",
    );
  });

  it("falls back to the numeric format when no label config is set", () => {
    expect(hexLabelFor({ q: -1, r: 0 }, undefined, "pointy")).toBe("-01.00");
  });
});

describe("hexOnMap (region generation bounds)", () => {
  const config = {
    orientation: "pointy" as const,
    size: 40,
    offsetX: 0,
    offsetY: 0,
  };
  const dimensions = { width: 800, height: 600 };

  it("is true for hexes whose centre is inside the map", () => {
    const onMap = hexOnMap(dimensions, config);
    expect(onMap({ q: 3, r: 3 })).toBe(true);
  });

  it("is false beyond each of the four edges", () => {
    const onMap = hexOnMap(dimensions, config);
    expect(onMap({ q: -5, r: 3 })).toBe(false); // left
    expect(onMap({ q: 3, r: -5 })).toBe(false); // top
    expect(onMap({ q: 40, r: 3 })).toBe(false); // right
    expect(onMap({ q: 3, r: 40 })).toBe(false); // bottom
  });

  it("is false for every hex when the map has no hex grid", () => {
    expect(hexOnMap(dimensions, null)({ q: 3, r: 3 })).toBe(false);
  });
});
