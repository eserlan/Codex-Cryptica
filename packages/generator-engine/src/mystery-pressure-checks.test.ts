import { describe, expect, it } from "vitest";
import { checkPressure, checkAudit } from "./mystery-pressure-checks";
import { validStages } from "./mystery-staged.fixtures";

describe("pressure checks", () => {
  it("accepts a clock, reactions, outcomes and open approaches", () => {
    const [foundation, cast, clues, pressure] = validStages();
    expect(checkPressure(pressure, cast, foundation, clues)).toEqual({
      hard: [],
      soft: [],
    });
  });
  it("reports incomplete clocks, reactions, outcomes and duplicate approaches", () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.pressureClock = [{ trigger: "", consequence: "" }];
    pressure.npcResponses = [
      { personId: "person-99", trigger: "", response: "" },
    ];
    pressure.outcomes.unsolved = {
      condition: "",
      consequence: "",
      continuation: "",
    };
    pressure.approaches = ["Search", " search ", "SEARCH"];
    const hard = checkPressure(pressure, cast, foundation, clues).hard;
    expect(hard).toContain("pressureClock needs at least three steps");
    expect(hard).toContain("pressure step 1 has no trigger");
    expect(hard).toContain("NPC response 1 references an unknown personId");
    expect(hard).toContain("NPC response 1 needs a trigger and response");
    expect(hard).toContain("NPC response 1 needs an observableEffect");
    expect(hard).toContain(
      "outcome unsolved needs a condition and consequence",
    );
    expect(hard).toContain("unsolved outcome needs a continuation hook");
    expect(hard.some((issue) => issue.includes('"approaches" needs'))).toBe(
      true,
    );
  });
  it("requires at least two named reactions and checks prose for unknown IDs", () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses = [pressure.npcResponses[0]];
    pressure.approaches[0] = "Ask person-99";
    const hard = checkPressure(pressure, cast, foundation, clues).hard;
    expect(
      hard.some((issue) => issue.includes("npcResponses must describe")),
    ).toBe(true);
    expect(hard.some((issue) => issue.includes("person-99"))).toBe(true);
  });
  it("rejects duplicate actors and more than four distinct actors", () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses[1].personId = pressure.npcResponses[0].personId;
    expect(checkPressure(pressure, cast, foundation, clues).hard).toContain(
      "npcResponses must include each suspect at most once",
    );

    const [largeFoundation, largeCast, largeClues, manyActors] = validStages();
    largeCast.suspects.push({ ...largeCast.suspects[0], id: "person-5" });
    manyActors.npcResponses = [
      "person-1",
      "person-2",
      "person-3",
      "person-4",
      "person-5",
    ].map((personId) => ({
      ...manyActors.npcResponses[0],
      personId,
    }));
    expect(
      checkPressure(manyActors, largeCast, largeFoundation, largeClues).hard,
    ).toContain(
      "npcResponses must describe between 2 and 4 distinct known suspects",
    );
  });
  it.each([
    {
      complexity: "Lean (3 suspects)",
      people: ["person-2", "person-3"],
      valid: true,
    },
    {
      complexity: "Lean (3 suspects)",
      people: ["person-1", "person-2", "person-3"],
      valid: false,
    },
    {
      complexity: "Standard (4 suspects)",
      people: ["person-1", "person-2", "person-3"],
      valid: true,
    },
    {
      complexity: "Standard (4 suspects)",
      people: ["person-1", "person-2", "person-3", "person-4"],
      valid: false,
    },
    {
      complexity: "Dense (5 suspects)",
      people: ["person-1", "person-2"],
      valid: false,
    },
    {
      complexity: "Dense (5 suspects)",
      people: ["person-1", "person-2", "person-3", "person-4"],
      valid: true,
    },
  ])(
    "applies $complexity response actor bounds",
    ({ complexity, people, valid }) => {
      const [foundation, cast, clues, pressure] = validStages();
      pressure.npcResponses = people.map((personId, index) => ({
        ...pressure.npcResponses[index % 2],
        personId,
      }));

      const hard = checkPressure(
        pressure,
        cast,
        foundation,
        clues,
        complexity,
      ).hard;
      expect(
        hard.some((issue) => issue.startsWith("npcResponses must describe")),
      ).toBe(!valid);
    },
  );
  it("rejects responses missing observableEffect and flags broken IDs in enriched fields", () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses[0].observableEffect = "";
    pressure.npcResponses[1].testableLead = "Check clue-99";
    const hard = checkPressure(pressure, cast, foundation, clues).hard;
    expect(hard).toContain("NPC response 1 needs an observableEffect");
    expect(hard.some((issue) => issue.includes("clue-99"))).toBe(true);
  });
  it.each(["", "   "])(
    "rejects a missing or blank testableLead (%j)",
    (lead) => {
      const [foundation, cast, clues, pressure] = validStages();
      pressure.npcResponses[0].testableLead = lead;
      expect(checkPressure(pressure, cast, foundation, clues).hard).toContain(
        'NPC response 1 needs a testableLead or "None"',
      );
    },
  );
  it('allows the explicit "None" testableLead value', () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses[0].testableLead = "None";
    expect(checkPressure(pressure, cast, foundation, clues).hard).not.toContain(
      'NPC response 1 needs a testableLead or "None"',
    );
  });
});

describe("audit checks", () => {
  it.each([
    { status: "consistent", issues: [] },
    { status: "needs-repair", issues: ["Fix a fact"] },
  ])("accepts $status with matching issues", (data) => {
    expect(checkAudit(data)).toEqual({ hard: [], soft: [] });
  });
  it.each([
    {},
    { status: "other" },
    { status: "consistent", issues: ["A defect"] },
    { status: "needs-repair", issues: [" "] },
  ])("rejects malformed audits: %j", (data) => {
    expect(checkAudit(data).hard.length).toBeGreaterThan(0);
  });
});
