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
    expect(hard).toContain(
      "outcome unsolved needs a condition and consequence",
    );
    expect(hard).toContain("unsolved outcome needs a continuation hook");
    expect(hard.some((issue) => issue.includes('"approaches" needs'))).toBe(
      true,
    );
  });
  it("requires named reactions and checks prose for unknown IDs", () => {
    const [foundation, cast, clues, pressure] = validStages();
    pressure.npcResponses = [];
    pressure.approaches[0] = "Ask person-99";
    const hard = checkPressure(pressure, cast, foundation, clues).hard;
    expect(
      hard.some((issue) => issue.includes("npcResponses must describe")),
    ).toBe(true);
    expect(hard.some((issue) => issue.includes("person-99"))).toBe(true);
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
