import { describe, expect, it } from "vitest";
import { getRenderWindow, sliceRenderWindow } from "./render-window";

describe("timeline render windows", () => {
  it("keeps ordinary collections fully rendered", () => {
    expect(getRenderWindow(12, 0, 600, 80)).toMatchObject({
      start: 0,
      end: 12,
      isBounded: false,
    });
  });

  it("bounds a large collection with overscan and spacers", () => {
    const window = getRenderWindow(200, 800, 400, 100, 2);

    expect(window.isBounded).toBe(true);
    expect(window.start).toBe(6);
    expect(window.end).toBe(14);
    expect(window.topSpacer).toBe(600);
    expect(window.bottomSpacer).toBe(18600);
  });

  it("clamps invalid offsets, sizes, and bounds", () => {
    const window = getRenderWindow(100, -20, 0, 0, -4);

    expect(window.start).toBe(0);
    expect(window.end).toBeGreaterThan(window.start);
    expect(window.topSpacer).toBe(0);
    expect(window.bottomSpacer).toBeGreaterThanOrEqual(0);
  });

  it("slices by logical position rather than changing item identity", () => {
    const items = ["a", "b", "c", "d"];
    const window = getRenderWindow(100, 0, 100, 25, 1);

    expect(sliceRenderWindow(items, window)).toEqual(items);
  });
});
