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
        { x: -10, y: 500 },
        { width: 200, height: 100 },
        { width: 40, height: 40 },
      ),
    ).toEqual({
      x: 0,
      y: 60,
    });
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
