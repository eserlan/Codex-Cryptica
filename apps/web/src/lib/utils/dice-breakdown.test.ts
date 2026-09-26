import { describe, expect, it } from "vitest";
import {
  describeBreakdown,
  formatModifier,
  hasBreakdownDetail,
} from "./dice-breakdown";

describe("hasBreakdownDetail", () => {
  it("is false for a lone die, so a plain d20 gets no chevron", () => {
    expect(
      hasBreakdownDetail([{ type: "dice", sides: 20, rolls: [14], value: 14 }]),
    ).toBe(false);
  });

  it("is false for a legacy result with no recorded parts", () => {
    expect(hasBreakdownDetail([])).toBe(false);
    expect(hasBreakdownDetail(undefined)).toBe(false);
  });

  it("is true for several dice, a modifier or a dropped die", () => {
    expect(
      hasBreakdownDetail([{ type: "dice", sides: 6, rolls: [4, 2], value: 6 }]),
    ).toBe(true);
    expect(
      hasBreakdownDetail([
        { type: "dice", sides: 20, rolls: [9], value: 9 },
        { type: "modifier", value: 3 },
      ]),
    ).toBe(true);
    expect(
      hasBreakdownDetail([
        { type: "dice", sides: 6, rolls: [5], dropped: [2], value: 5 },
      ]),
    ).toBe(true);
  });
});

describe("describeBreakdown", () => {
  it("names kept and dropped dice so they differ without colour", () => {
    expect(
      describeBreakdown(
        [{ type: "dice", sides: 6, rolls: [6, 5, 3], dropped: [1], value: 14 }],
        14,
      ),
    ).toBe("Kept 6, 5, 3; dropped 1. Total 14");
  });

  it("includes modifiers and the total", () => {
    expect(
      describeBreakdown(
        [
          { type: "dice", sides: 6, rolls: [4, 2], value: 6 },
          { type: "modifier", value: 3 },
        ],
        9,
      ),
    ).toBe("Dice 4, 2. Modifier +3. Total 9");
    expect(formatModifier(-2)).toBe("-2");
  });
});
