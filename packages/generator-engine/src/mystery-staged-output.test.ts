import { describe, expect, it } from "vitest";
import { assembleOutput } from "./mystery-staged-output";
import { validStages } from "./mystery-staged.fixtures";

describe("staged mystery output", () => {
  it("renders all case sections and keeps the fixed truth in GM lore", () => {
    const stages = validStages();
    const output = assembleOutput(...stages);
    expect(output.title).toBe(stages[0].title);
    expect(output.labels).toEqual([
      "mystery",
      "investigation",
      "mystery-generator",
    ]);
    expect(output.status).toBe("draft");
    for (const heading of [
      "Opening Hook",
      "Central Question",
      "People to Question",
      "Locations",
      "Evidence and Leads",
      "Pressure",
      "Actual Timeline",
      "Suspect Knowledge and Alibis",
      "Revelations",
      "Clue Index",
      "Routes to Each Conclusion",
      "Pressure Clock",
      "NPC Responses",
      "Objective and Approaches",
      "Possible Outcomes",
    ]) {
      expect(output.content).toContain(`## ${heading}\n`);
    }
    expect(output.content).not.toContain("Responsible party");
    expect(output.lore).toContain("**Responsible party:** Mara Quill");
    expect(output.mysteryGraph?.nodes.length).toBeGreaterThan(0);
  });
  it("removes images, replaces known and unknown IDs and tidies model punctuation", () => {
    const [foundation, cast, clues, pressure] = validStages();
    foundation.openingHook =
      "Ask person-2 about clue-1 at place-99 ![x](https://tracker.example/pixel)";
    foundation.truth.motive =
      "Hide rev-1 from person-99 <img src='https://tracker.example/pixel'>";
    pressure.npcResponses[0].trigger = "If The party asks..";
    pressure.npcResponses[0].response = "Then They explain.,";
    const output = assembleOutput(foundation, cast, clues, pressure);
    expect(output.content).toContain(
      "Ask Oren Pike about Lead 1 at an unlisted place",
    );
    expect(output.lore).toContain(
      "Hide an unlisted conclusion from an unlisted person",
    );
    expect(output.content).toContain("If the party asks, then They explain.");
    expect(output.content + output.lore).not.toMatch(
      /tracker\.example|<img|\b(?:person|place|clue|rev)-\d+\b/,
    );
  });
  it("handles missing optional descriptions and unnamed references", () => {
    const [foundation, cast, clues, pressure] = validStages();
    cast.suspects[0].publicFace = "";
    cast.suspects[0].startLocationId = "place-99";
    foundation.revelations[0].kind = "";
    foundation.truth.victimStatus = "";
    foundation.truth.atStart = "";
    pressure.approaches = ["", "search"];
    clues.clues[0].leadsTo = ["person-99", "clue-99", "rev-99", "external"];
    const output = assembleOutput(foundation, cast, clues, pressure);
    expect(output.content).toContain(
      "Their account can be checked against the evidence.",
    );
    expect(output.content).toContain("starts at an unknown place");
    expect(output.content).toContain("**Conclusion 1:**");
    expect(output.content).toContain(
      "an unlisted person, an unlisted lead, an unlisted conclusion, external",
    );
    expect(output.lore).not.toContain("Captive or victim");
    expect(output.lore).not.toContain("When play starts");
  });
});
