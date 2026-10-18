import { describe, expect, it } from "bun:test";
import { buildHexJourneyRoute, estimateHexJourney } from "../src/journey";

describe("buildHexJourneyRoute", () => {
  it("includes origin and destination and returns every adjacent hex", () => {
    const route = buildHexJourneyRoute(
      { q: -2, r: 1 },
      { q: 3, r: -1 },
      6,
      "mi",
    );
    expect(route.ok).toBe(true);
    if (!route.ok) return;
    expect(route.hexes[0]).toEqual({ q: -2, r: 1 });
    expect(route.hexes.at(-1)).toEqual({ q: 3, r: -1 });
    expect(route.steps).toBe(5);
    expect(Object.isFrozen(route)).toBe(true);
    expect(Object.isFrozen(route.hexes)).toBe(true);
    expect(Object.isFrozen(route.hexes[0])).toBe(true);
    for (let i = 1; i < route.hexes.length; i++) {
      const previous = route.hexes[i - 1];
      const current = route.hexes[i];
      expect(
        Math.max(
          Math.abs(previous.q - current.q),
          Math.abs(previous.r - current.r),
          Math.abs(previous.q + previous.r - current.q - current.r),
        ),
      ).toBe(1);
    }
  });

  it("supports pointy and flat grids and a zero-step route", () => {
    expect(
      buildHexJourneyRoute({ q: 0, r: 0 }, { q: 0, r: 0 }, 5, "mi"),
    ).toMatchObject({ ok: true, steps: 0, hexes: [{ q: 0, r: 0 }] });
    const route = buildHexJourneyRoute(
      { q: -3, r: -2 },
      { q: 2, r: 4 },
      5,
      "km",
    );
    expect(route.ok && route.hexes[0]).toEqual({ q: -3, r: -2 });
    expect(route.ok && route.hexes.at(-1)).toEqual({ q: 2, r: 4 });
  });

  it("rejects invalid coordinates and grid scales", () => {
    for (const origin of [
      { q: 1.5, r: 0 },
      { q: Number.NaN, r: 0 },
      { q: Number.MAX_SAFE_INTEGER + 1, r: 0 },
    ]) {
      expect(buildHexJourneyRoute(origin, { q: 1, r: 1 }, 5, "mi").ok).toBe(
        false,
      );
    }
    for (const scale of [0, -1, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(
        buildHexJourneyRoute({ q: 0, r: 0 }, { q: 1, r: 1 }, scale, "mi").ok,
      ).toBe(false);
    }
  });

  it("checks route length before creating a line", () => {
    expect(
      buildHexJourneyRoute({ q: 0, r: 0 }, { q: 1000, r: 0 }, 5, "mi"),
    ).toMatchObject({ ok: true, steps: 1000 });
    expect(
      buildHexJourneyRoute({ q: 0, r: 0 }, { q: 1001, r: 0 }, 5, "mi"),
    ).toMatchObject({ ok: false, reason: "route-too-long" });
  });
});

describe("estimateHexJourney", () => {
  it("calculates total and remaining distance and optional decimal time", () => {
    expect(
      estimateHexJourney({
        totalSteps: 8,
        completedSteps: 3,
        gridDistance: 6,
        gridUnit: "mi",
        hoursPerHex: 0.5,
      }),
    ).toEqual({
      ok: true,
      totalSteps: 8,
      completedSteps: 3,
      remainingSteps: 5,
      totalDistance: 48,
      completedDistance: 18,
      remainingDistance: 30,
      gridUnit: "mi",
      totalHours: 4,
      completedHours: 1.5,
      remainingHours: 2.5,
    });
  });

  it("omits time for a blank pace and rejects invalid progress or overflowing estimates", () => {
    expect(
      estimateHexJourney({
        totalSteps: 3,
        completedSteps: 1,
        gridDistance: 2,
        gridUnit: "km",
        hoursPerHex: null,
      }),
    ).toMatchObject({
      ok: true,
      totalDistance: 6,
      remainingDistance: 4,
      totalHours: null,
      remainingHours: null,
    });
    expect(
      estimateHexJourney({
        totalSteps: 3,
        completedSteps: 4,
        gridDistance: 2,
        gridUnit: "km",
      }).ok,
    ).toBe(false);
    expect(
      estimateHexJourney({
        totalSteps: 3,
        completedSteps: 1,
        gridDistance: 2,
        gridUnit: "km",
        hoursPerHex: 0,
      }).ok,
    ).toBe(false);
    expect(
      estimateHexJourney({
        totalSteps: Number.MAX_SAFE_INTEGER,
        completedSteps: 0,
        gridDistance: Number.MAX_VALUE,
        gridUnit: "km",
      }).ok,
    ).toBe(false);
  });
});
