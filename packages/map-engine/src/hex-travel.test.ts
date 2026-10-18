import { describe, expect, it } from "vitest";
import {
  hexTravel,
  newlyRevealedHexes,
  visionRangeInHexes,
} from "./hex-travel";

const pointy = {
  orientation: "pointy" as const,
  size: 20,
  offsetX: 0,
  offsetY: 0,
};
const flat = { ...pointy, orientation: "flat" as const };

describe("hex travel helpers", () => {
  it.each([pointy, flat])(
    "measures rounded point movement on either orientation",
    (config) => {
      expect(hexTravel({ x: 0, y: 0 }, { x: 0, y: 0 }, config).hexes).toBe(0);
      const to =
        config.orientation === "pointy"
          ? { x: 20 * Math.sqrt(3), y: 0 }
          : { x: 30, y: 0 };
      expect(hexTravel({ x: 0, y: 0 }, to, config).hexes).toBe(1);
    },
  );

  it("rounds vision to whole nonnegative hexes and handles invalid grid scale", () => {
    expect(visionRangeInHexes(14, 10)).toBe(1);
    expect(visionRangeInHexes(0, 10)).toBe(0);
    expect(visionRangeInHexes(10, 0)).toBe(0);
    expect(visionRangeInHexes(-20, 10)).toBe(0);
  });

  it("returns only fogged cells in the requested radius", () => {
    const revealed = new Set(["0,0", "1,0"]);
    const cells = newlyRevealedHexes({ q: 0, r: 0 }, 1, (hex) =>
      revealed.has(`${hex.q},${hex.r}`),
    );
    expect(cells).toHaveLength(5);
    expect(cells.every((hex) => !revealed.has(`${hex.q},${hex.r}`))).toBe(true);
    expect(newlyRevealedHexes({ q: 0, r: 0 }, 1, () => true)).toEqual([]);
  });
});
