import { describe, expect, it } from "vitest";
import {
  canPlaceSpatialImage,
  nextSpatialImageZIndex,
  normalizeSpatialImageTransform,
  snapToNeighborTiles,
  spatialImagesOverlap,
} from "./image-object";

describe("spatial image objects", () => {
  it("normalizes invalid transform values without changing valid image transforms", () => {
    expect(
      normalizeSpatialImageTransform({
        x: 2,
        y: 3,
        width: 40,
        height: 50,
        rotation: 90,
        zIndex: 4,
      }),
    ).toEqual({ x: 2, y: 3, width: 40, height: 50, rotation: 90, zIndex: 4 });
    expect(
      normalizeSpatialImageTransform({
        x: Number.NaN,
        width: -1,
        rotation: Number.NaN,
      }),
    ).toEqual({ x: 0, y: 0, width: 0, height: 0, rotation: 0, zIndex: 0 });
  });

  it("detects overlap and allocates the next stacking layer", () => {
    const placed = { x: 0, y: 0, width: 100, height: 100 };
    expect(
      spatialImagesOverlap(placed, { x: 99, y: 0, width: 10, height: 10 }),
    ).toBe(true);
    expect(
      canPlaceSpatialImage({ x: 100, y: 0, width: 10, height: 10 }, [placed]),
    ).toBe(true);
    expect(nextSpatialImageZIndex([{ zIndex: 2 }, { zIndex: 8 }])).toBe(9);
  });

  describe("snapToNeighborTiles", () => {
    const neighbor = { x: 0, y: 0, width: 100, height: 100 };

    it("snaps a candidate placed just right of a tile to touch its right edge", () => {
      const candidate = { x: 106, y: 4, width: 100, height: 100 };
      expect(snapToNeighborTiles(candidate, [neighbor], 15)).toEqual({
        x: 100,
        y: 0,
      });
    });

    it("snaps a candidate placed just below a tile to touch its bottom edge", () => {
      const candidate = { x: 3, y: 108, width: 100, height: 100 };
      expect(snapToNeighborTiles(candidate, [neighbor], 15)).toEqual({
        x: 0,
        y: 100,
      });
    });

    it("does not snap when far outside the threshold", () => {
      const candidate = { x: 500, y: 500, width: 100, height: 100 };
      expect(snapToNeighborTiles(candidate, [neighbor], 15)).toEqual({
        x: 500,
        y: 500,
      });
    });

    it("does not snap X to a tile with no vertical overlap or proximity", () => {
      // Same horizontal alignment as a right-edge snap, but far below —
      // no plausible "same row" relationship, so X should not snap.
      const candidate = { x: 106, y: 500, width: 100, height: 100 };
      expect(snapToNeighborTiles(candidate, [neighbor], 15)).toEqual({
        x: 106,
        y: 500,
      });
    });

    it("picks the closest snap candidate among several tiles", () => {
      const far = { x: 300, y: 0, width: 100, height: 100 };
      const near = { x: 0, y: 0, width: 100, height: 100 };
      const candidate = { x: 108, y: 2, width: 100, height: 100 };
      expect(snapToNeighborTiles(candidate, [far, near], 15)).toEqual({
        x: 100,
        y: 0,
      });
    });
  });
});
