import { describe, expect, it } from "vitest";
import {
  clampPointToBounds,
  getTokenCenter,
  hitTestToken,
  measureDistance,
  snapToGrid,
  toViewportPoint,
} from "./vtt-helpers";
import type { Token } from "../../types/vtt";

describe("vtt-helpers", () => {
  it("snaps and clamps points", () => {
    expect(snapToGrid({ x: 73, y: 126 }, 50)).toEqual({ x: 50, y: 150 });
    expect(
      clampPointToBounds(
        { x: -160, y: 500 },
        { width: 200, height: 100 },
        { width: 40, height: 40 },
      ),
    ).toEqual({
      x: -100,
      y: 10,
    });
  });

  it("clamps centered image coordinates without blocking the negative half", () => {
    expect(
      clampPointToBounds(
        { x: -25, y: -40 },
        { width: 400, height: 300 },
        { width: 50, height: 75 },
      ),
    ).toEqual({ x: -25, y: -40 });
  });

  it("measures distances and token centers", () => {
    expect(measureDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(
      getTokenCenter({
        id: "token",
        entityId: null,
        name: "Token",
        x: 20,
        y: 30,
        width: 40,
        height: 50,
        rotation: 0,
        zIndex: 0,
        ownerPeerId: null,
        ownerGuestName: null,
        visibleTo: "all",
        color: "#fff",
        imageUrl: null,
        statusEffects: [],
      }),
    ).toEqual({ x: 40, y: 55 });
  });

  it("hit-tests tokens by z-index", () => {
    const token: Token = {
      id: "top",
      entityId: null,
      name: "Top",
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      rotation: 0,
      zIndex: 2,
      ownerPeerId: null,
      ownerGuestName: null,
      visibleTo: "all",
      color: "#fff",
      imageUrl: null,
      statusEffects: [],
    };
    const other: Token = {
      ...token,
      id: "bottom",
      zIndex: 1,
      x: 90,
      y: 90,
    };

    const found = hitTestToken([other, token], (point) => point, 110, 110);

    expect(found?.id).toBe("top");
  });

  it("hit-tests hex tiles by their hexagonal geometry, ignoring bounding box corners", () => {
    // Flat-topped hex centered at (100, 100), radius R = 50.
    // Width = 2 * R = 100 (x: 50 to 150).
    // Height = sqrt(3) * R ≈ 86.6 (y: 56.7 to 143.3).
    const sqrt3 = Math.sqrt(3);
    const hexTile: Token = {
      id: "hex-tile-a",
      entityId: null,
      name: "Hex A",
      x: 50,
      y: 100 - (50 * sqrt3) / 2,
      width: 100,
      height: 50 * sqrt3,
      rotation: 0,
      baseShape: "hex-flat",
      zIndex: 1,
      ownerPeerId: null,
      ownerGuestName: null,
      visibleTo: "all",
      color: "#fff",
      imageUrl: null,
      statusEffects: [],
      kind: "tile",
    };

    // Center click hits
    expect(hitTestToken([hexTile], (p) => p, 100, 100)?.id).toBe("hex-tile-a");

    // Click near the top-right corner of the bounding box (x=145, y=60)
    // is outside the flat-topped hex polygon
    expect(hitTestToken([hexTile], (p) => p, 145, 60)).toBeNull();

    // With gridType: "hex-flat", token with kind: "tile" also uses hex testing
    const plainTile: Token = { ...hexTile, baseShape: "square" };
    expect(hitTestToken([plainTile], (p) => p, 145, 60, "hex-flat")).toBeNull();
    expect(hitTestToken([plainTile], (p) => p, 100, 100, "hex-flat")?.id).toBe(
      "hex-tile-a",
    );

    // On square grid, rectangular bounding box is used as before
    expect(hitTestToken([plainTile], (p) => p, 145, 60, "square")?.id).toBe(
      "hex-tile-a",
    );
  });

  it("projects points into the viewport", () => {
    expect(
      toViewportPoint(
        { x: 10, y: 20 },
        { pan: { x: 5, y: -5 }, zoom: 2 },
        { width: 200, height: 100 },
      ),
    ).toEqual({ x: 125, y: 85 });
  });
});
