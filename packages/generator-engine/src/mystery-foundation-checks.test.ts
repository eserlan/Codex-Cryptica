import { describe, expect, it } from "vitest";
import { checkFoundation, checkCast } from "./mystery-foundation-checks";
import { validStages } from "./mystery-staged.fixtures";
import { resolveMystery } from "./public-mystery";

describe("foundation and cast checks", () => {
  it("accepts the locked truth and matching cast", () => {
    const [foundation, cast] = validStages();
    expect(checkFoundation(foundation, resolveMystery())).toEqual({
      hard: [],
      soft: [],
    });
    expect(checkCast(cast, foundation, resolveMystery())).toEqual({
      hard: [],
      soft: [],
    });
  });
  it("rejects absent truth, invalid culprit, timeline and revelations", () => {
    const result = checkFoundation(
      {
        perpetratorId: "person-2",
        timeline: ["", "x", "y"],
        revelations: [{ id: "same", kind: "culprit" }, { id: "same" }, {}],
      },
      resolveMystery(),
    );
    expect(result.hard).toContain(
      '"perpetratorId" must be the locked id "person-1"',
    );
    expect(result.hard).toContain(
      '"timeline" needs at least three ordered events',
    );
    expect(result.hard).toContain("revelation ids must be present and unique");
    expect(result.hard).toContain(
      'a revelation with kind "motive" is required',
    );
    expect(
      result.hard.some(
        (issue) =>
          issue.includes("a revelation with kind") && !issue.includes("motive"),
      ),
    ).toBe(true);
    expect(result.hard).toContain('"atStart" is missing');
  });
  it("enforces mystery-specific conclusions and the banned name policy", () => {
    const [foundation] = validStages();
    foundation.revelations[2].kind = "victim";
    expect(
      checkFoundation(
        foundation,
        resolveMystery({ mysteryType: "Murder", avoidNames: ["Mara Quill"] }),
      ).hard.some((issue) => issue.includes('kind "method"')),
    ).toBe(true);
    expect(
      checkFoundation(
        foundation,
        resolveMystery({ avoidNames: ["Mara Quill"] }),
      ).hard.length,
    ).toBeGreaterThan(0);
  });
  it("rejects broken cast identity, placement, fields and duplicate names", () => {
    const [foundation, cast] = validStages();
    cast.suspects[0].name = "Wrong";
    cast.suspects[1].name = "Wrong";
    cast.suspects[2].id = "missing";
    cast.suspects[3].approach = "";
    cast.locations[0].id = "record";
    cast.locations[1].name = "";
    const hard = checkCast(cast, foundation, resolveMystery()).hard;
    expect(hard).toContain(
      "person-1 must match the perpetrator name locked in the foundation",
    );
    expect(hard).toContain(
      "suspect ids must follow the locked person-1...person-N plan",
    );
    expect(hard).toContain("suspect 4 has no approach");
    expect(hard).toContain("location 2 has no name");
    expect(hard).toContain("suspects need distinct names");
    expect(hard).toContain(
      "person, place and revelation ids must be unique across groups",
    );
  });
  it("reports missing people and places", () => {
    const [foundation] = validStages();
    const hard = checkCast({}, foundation, resolveMystery()).hard;
    expect(hard).toContain("at least three locations are required");
    expect(hard.some((issue) => issue.includes("expected exactly"))).toBe(true);
  });
});
