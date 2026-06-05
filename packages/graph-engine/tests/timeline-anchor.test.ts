import { describe, expect, it } from "vitest";
import {
  getAnchorTimelineLayout,
  getSequentialYearPositions,
  getYearForPosition,
} from "../src/layouts/timeline";

describe("timeline anchor layout", () => {
  it("resolves exact year positions and interpolates between compressed gaps", () => {
    const yearPositions = getSequentialYearPositions([500, 510, 620], 100);

    expect(getYearForPosition(yearPositions[510], { yearPositions })).toBe(510);
    expect(getYearForPosition(-999, { yearPositions })).toBe(500);
    expect(getYearForPosition(9999, { yearPositions })).toBe(620);
    expect(
      getYearForPosition({ x: 50, y: 0 }, { yearPositions, axis: "x" }),
    ).toBe(505);
  });

  it("keys projected anchors by entity and anchor id", () => {
    const layout = getAnchorTimelineLayout(
      [
        { entityId: "char-1", anchorId: "born", year: 580 },
        { entityId: "char-1", anchorId: "appearance", year: 621 },
      ],
      { axis: "x", scale: 100, jitter: 24 },
    );

    expect(Object.keys(layout)).toEqual(["char-1::born", "char-1::appearance"]);
    expect(layout["char-1::born"].x).not.toBe(layout["char-1::appearance"].x);
  });
});
