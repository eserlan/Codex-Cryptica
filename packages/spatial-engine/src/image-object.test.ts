import { describe, expect, it } from "vitest";
import {
  canPlaceSpatialImage,
  nextSpatialImageZIndex,
  normalizeSpatialImageTransform,
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
});
