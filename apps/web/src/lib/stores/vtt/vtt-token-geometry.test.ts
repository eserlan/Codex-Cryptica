import { describe, expect, it } from "vitest";
import { hexToPoint, pointToHex } from "map-engine";
import {
  VTTTokenGeometry,
  isHexShaped,
  roundTokenCoordinate,
} from "./vtt-token-geometry";

function geometry(overrides = {}) {
  return new VTTTokenGeometry(() => ({
    activeMap: { dimensions: { width: 1000, height: 1000 } },
    showGrid: true,
    gridType: "square",
    gridSize: 50,
    gridOffsetX: 0,
    gridOffsetY: 0,
    ...overrides,
  }));
}

describe("token geometry", () => {
  it("aligns square cells, retaining supported fractional sizes", () => {
    expect(
      geometry().clampAndSnapPosition(
        { x: 37, y: 61 },
        { width: 25, height: 12.5 },
      ),
    ).toEqual({ x: 50, y: 50, width: 25, height: 12.5 });
  });

  it("clamps unsnapped annotations to the map", () => {
    expect(
      geometry().clampAndSnapPosition(
        { x: 999, y: -999 },
        { width: 20, height: 20 },
        { snapToTheGrid: false },
      ),
    ).toEqual({ x: 480, y: -500, width: 20, height: 20 });
  });

  it.each(["hex-flat", "hex-pointy"])("fits tiles to a %s cell", (gridType) => {
    const subject = geometry({ gridType });
    const result = subject.snapTileToHexCell(
      { x: 0, y: 0 },
      { width: 50, height: 50 },
      true,
    )!;
    const config = {
      orientation:
        gridType === "hex-flat" ? ("flat" as const) : ("pointy" as const),
      size: 50,
      offsetX: 0,
      offsetY: 0,
    };
    const center = {
      x: result.x + result.width / 2,
      y: result.y + result.height / 2,
    };
    const cell = pointToHex(center, config);
    const expected = hexToPoint(cell, config);
    expect(center.x).toBeCloseTo(expected.x, 2);
    expect(center.y).toBeCloseTo(expected.y, 2);
    expect(subject.hexCellKey(result)).toBe(`${cell.q},${cell.r}`);
  });

  it("declines hex snapping on a hidden grid", () => {
    const subject = geometry({ gridType: "hex-flat", showGrid: false });
    expect(
      subject.snapTileToHexCell({ x: 0, y: 0 }, { width: 50, height: 50 }),
    ).toBeNull();
    expect(
      subject.hexCellKey({ x: 0, y: 0, width: 50, height: 50 }),
    ).toBeNull();
  });

  it("leaves placements unchanged without a map", () => {
    expect(
      geometry({ activeMap: null }).clampAndSnapPosition(
        { x: 37, y: 61 },
        { width: 20, height: 20 },
      ),
    ).toEqual({ x: 37, y: 61, width: 20, height: 20 });
  });

  it("rounds viewport coordinates and falls back before measurement", () => {
    expect(geometry().viewportCenterPoint()).toEqual({ x: 0, y: 0 });
    const subject = geometry({
      canvasSize: { width: 800, height: 600 },
      unproject: () => ({ x: 1.234, y: -5.678 }),
    });
    expect(subject.viewportCenterPoint()).toEqual({ x: 1.23, y: -5.68 });
    expect(roundTokenCoordinate(1.234)).toBe(1.23);
    expect(isHexShaped("hex")).toBe(true);
    expect(isHexShaped("circle")).toBe(false);
  });
});
