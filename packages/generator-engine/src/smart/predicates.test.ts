import { describe, expect, it } from "vitest";
import { evaluate, referencedAxes } from "./predicates";
import type { ResolveContext } from "./types";

const ctx: ResolveContext = {
  genre: "Fantasy",
  values: { environment: "Coastal harbour", size: "Town" },
  traits: ["coastal", "wealthy"],
};

describe("evaluate", () => {
  it("matches a resolved axis value", () => {
    expect(evaluate({ axis: "size", anyOf: ["Town", "City"] }, ctx)).toBe(true);
    expect(evaluate({ axis: "size", anyOf: ["Village"] }, ctx)).toBe(false);
  });

  it("returns false for an axis that has not resolved yet", () => {
    expect(evaluate({ axis: "tone", anyOf: ["Bleak"] }, ctx)).toBe(false);
  });

  it("matches a trait carried by an already-resolved option", () => {
    expect(evaluate({ trait: "coastal" }, ctx)).toBe(true);
    expect(evaluate({ trait: "inland" }, ctx)).toBe(false);
  });

  it("negates", () => {
    expect(evaluate({ not: { trait: "inland" } }, ctx)).toBe(true);
  });

  it("combines with all and any", () => {
    expect(
      evaluate({ all: [{ trait: "coastal" }, { trait: "wealthy" }] }, ctx),
    ).toBe(true);
    expect(
      evaluate({ all: [{ trait: "coastal" }, { trait: "inland" }] }, ctx),
    ).toBe(false);
    expect(
      evaluate({ any: [{ trait: "inland" }, { trait: "wealthy" }] }, ctx),
    ).toBe(true);
    expect(evaluate({ any: [] }, ctx)).toBe(false);
  });

  it("nests", () => {
    expect(
      evaluate(
        {
          all: [
            { axis: "environment", anyOf: ["Coastal harbour"] },
            { not: { any: [{ trait: "cursed" }, { trait: "ruined" }] } },
          ],
        },
        ctx,
      ),
    ).toBe(true);
  });
});

describe("referencedAxes", () => {
  it("collects axis ids from nested predicates", () => {
    expect(
      referencedAxes({
        all: [
          { axis: "size", anyOf: ["City"] },
          { not: { axis: "tone", anyOf: ["Bleak"] } },
          { trait: "coastal" },
        ],
      }),
    ).toEqual(["size", "tone"]);
  });

  it("returns nothing for a trait-only predicate", () => {
    expect(referencedAxes({ trait: "coastal" })).toEqual([]);
  });
});
