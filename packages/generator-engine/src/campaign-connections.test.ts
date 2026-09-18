import { describe, expect, it } from "vitest";
import { parseConnections } from "./campaign-connections";

describe("parseConnections", () => {
  it("normalises valid connections and defaults the relationship", () => {
    expect(
      parseConnections([
        { targetTitle: "  The Rust Dock  ", relationship: "ally" },
        { targetTitle: "Lowmere" },
      ]),
    ).toEqual([
      { targetTitle: "The Rust Dock", relationship: "ally" },
      { targetTitle: "Lowmere", relationship: "related" },
    ]);
  });

  it("drops entries without a usable title", () => {
    expect(
      parseConnections([
        { targetTitle: "   " },
        null,
        "not-an-object",
        { targetTitle: "Kept" },
      ]),
    ).toEqual([{ targetTitle: "Kept", relationship: "related" }]);
  });

  it("returns undefined for non-arrays and empty results", () => {
    expect(parseConnections(undefined)).toBeUndefined();
    expect(parseConnections("nope")).toBeUndefined();
    expect(parseConnections([])).toBeUndefined();
    expect(parseConnections([{ targetTitle: " " }])).toBeUndefined();
  });
});
