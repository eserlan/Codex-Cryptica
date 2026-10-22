import { describe, expect, it } from "vitest";
import {
  findBrokenReferences,
  findCircularItemRoutes,
  findPlacementIssues,
} from "./mystery-consistency";

describe("findBrokenReferences", () => {
  const known = ["person-1", "person-2", "place-1", "clue-1", "rev-1"];

  it("accepts prose that only names ids the case defines", () => {
    expect(
      findBrokenReferences(["Compare clue-1 with Person-2 at place-1."], known),
    ).toEqual([]);
  });

  it("reports an id that points at nothing, once", () => {
    expect(
      findBrokenReferences(["See clue-7, then clue-7 again."], known),
    ).toEqual(['text refers to "clue-7", which does not exist']);
  });

  it("ignores words that merely look like ids and unnumbered ids", () => {
    expect(findBrokenReferences(["At step-3 the bell rings."], known)).toEqual(
      [],
    );
    expect(findBrokenReferences(["See clue-7."], ["alpha", "beta"])).toEqual(
      [],
    );
  });
});

describe("findPlacementIssues", () => {
  const locations = [{ id: "place-1" }, { id: "place-2" }];

  it("accepts people placed at a known location", () => {
    expect(
      findPlacementIssues({
        locations,
        suspects: [
          { startLocationId: "place-1" },
          { startLocationId: "place-2" },
        ],
      }),
    ).toEqual([]);
  });

  it("flags a person with no location or an unknown one", () => {
    const issues = findPlacementIssues({
      locations,
      suspects: [
        { startLocationId: "place-1" },
        {},
        { startLocationId: "place-9" },
      ],
    });
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain("suspect 2");
    expect(issues[1]).toContain("suspect 3");
  });
});

describe("findCircularItemRoutes", () => {
  it("passes when any route starts away from the item's location", () => {
    expect(findCircularItemRoutes(["place-1", "place-3"], "place-1")).toEqual(
      [],
    );
  });

  it("flags routes that all start where the item already is", () => {
    expect(
      findCircularItemRoutes(["place-1", "place-1"], "place-1"),
    ).toHaveLength(1);
  });
});
