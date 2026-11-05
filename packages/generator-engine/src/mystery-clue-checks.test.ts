import { describe, expect, it } from "vitest";
import { checkClues } from "./mystery-clue-checks";
import { validStages } from "./mystery-staged.fixtures";

describe("clue network checks", () => {
  it("accepts independent routes from distinct sources", () => {
    const [foundation, cast, clues] = validStages();
    expect(checkClues(clues, foundation, cast)).toEqual({ hard: [], soft: [] });
  });
  it.each([
    "unknown",
    "duplicate",
    "unsupported",
    "disconnected",
    "same source",
  ])("rejects %s routes", (failure) => {
    const [foundation, cast, clues] = validStages();
    if (failure === "unknown") clues.independentPaths[0].clueIds = ["clue-99"];
    if (failure === "duplicate")
      clues.independentPaths[0].clueIds = ["clue-1", "clue-1"];
    if (failure === "unsupported")
      clues.independentPaths[0].clueIds = ["clue-2"];
    if (failure === "disconnected")
      clues.independentPaths[0].clueIds = ["clue-1", "clue-2"];
    if (failure === "same source")
      clues.clues[3].sourceId = clues.clues[0].sourceId;
    expect(checkClues(clues, foundation, cast).hard).toContain(
      "record needs two independent evidence paths from distinct sources that share no clue",
    );
  });
  it("rejects absent fields, broken references, self links and unexplained routes", () => {
    const [foundation, cast, clues] = validStages();
    clues.clues[0].observation = "";
    clues.clues[1].sourceId = "place-99";
    clues.clues[2].supports = ["missing"];
    clues.clues[3].leadsTo = ["clue-4"];
    clues.clues[4].observation = "Ask person-99";
    clues.independentPaths[0].reasoning = "";
    const hard = checkClues(clues, foundation, cast).hard;
    expect(hard).toContain(
      "clue 1 must state an observation and what it does not prove",
    );
    expect(hard).toContain("clue 2 has an unknown sourceId");
    expect(hard).toContain("clue 3 must support a known revelation");
    expect(hard).toContain(
      "clue 4 must point to a different, known person, place or clue",
    );
    expect(hard.some((issue) => issue.includes("person-99"))).toBe(true);
    expect(hard).toContain(
      "every route needs reasoning explaining how its clues establish the conclusion",
    );
  });
  it("rejects missing clues and a network with no lead to the focal location", () => {
    const [foundation, cast, clues] = validStages();
    expect(checkClues({}, foundation, cast).hard).toContain(
      "at least six clues are required; received 0",
    );
    clues.clues.forEach((clue) => {
      clue.leadsTo = ["place-2"];
    });
    expect(
      checkClues(clues, foundation, cast).hard.some((issue) =>
        issue.includes("at least one clue must lead"),
      ),
    ).toBe(true);
  });
});
