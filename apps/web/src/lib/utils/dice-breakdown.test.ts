import { describe, expect, it } from "vitest";
import {
  formatModifier,
  hasBreakdownDetail,
  parseBreakdownParts,
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

describe("formatModifier", () => {
  it("formats positive and negative modifiers with their signs", () => {
    expect(formatModifier(3)).toBe("+3");
    expect(formatModifier(-2)).toBe("-2");
  });
});

describe("parseBreakdownParts", () => {
  it("reads back a saved trace, keeping dropped dice", () => {
    expect(
      parseBreakdownParts(
        [
          { type: "dice", sides: 6, rolls: [6, 5, 3], dropped: [1], value: 14 },
          { type: "modifier", value: 2 },
        ],
        16,
      ),
    ).toEqual([
      { type: "dice", sides: 6, rolls: [6, 5, 3], dropped: [1], value: 14 },
      { type: "modifier", value: 2 },
    ]);
  });

  it("rejects anything malformed instead of guessing (negative)", () => {
    expect(parseBreakdownParts(undefined, 0)).toBeUndefined();
    expect(parseBreakdownParts([], 0)).toBeUndefined();
    expect(parseBreakdownParts("nope", 0)).toBeUndefined();
    expect(
      parseBreakdownParts([{ type: "dice", rolls: ["x"], value: 1 }], 1),
    ).toBeUndefined();
    expect(
      parseBreakdownParts(
        [{ type: "dice", rolls: [1], dropped: "1", value: 1 }],
        1,
      ),
    ).toBeUndefined();
    expect(parseBreakdownParts([{ type: "modifier" }], 0)).toBeUndefined();
    expect(
      parseBreakdownParts([{ type: "dice", rolls: [4, 3], value: 7 }], 8),
    ).toBeUndefined();
    expect(
      parseBreakdownParts([{ type: "dice", rolls: [4, 3], value: 8 }], 8),
    ).toBeUndefined();
    expect(
      parseBreakdownParts([{ type: "dice", rolls: [4, 3], value: 7 }], 7),
    ).toEqual([{ type: "dice", rolls: [4, 3], value: 7 }]);
    expect(
      parseBreakdownParts(
        [{ type: "dice", rolls: [4, 3], value: 7 }],
        undefined,
      ),
    ).toBeUndefined();
  });
});
