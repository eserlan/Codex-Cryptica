import { describe, expect, it } from "vitest";
import { buildAdventurePrompt } from "../src";
import { session } from "./reducer-fixtures";

const behavior = (correction?: string) =>
  buildAdventurePrompt({
    session: session(),
    phase: "action",
    playerAction: "Look around",
    anchors: [],
    relevant: [],
    ...(correction === undefined ? {} : { correction }),
  }).behavior;

describe("retry correction in the GM prompt", () => {
  it("instructs the GM to resolve paraphrased questions and follow a new target", () => {
    const prompt = buildAdventurePrompt({
      session: session(),
      phase: "action",
      playerAction:
        "Question the wounded driver about the attack and the missing mules.",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).toContain("even when the player paraphrases");
    expect(prompt.behavior).toContain(
      "Follow the current action's intended target",
    );
    expect(prompt.behavior).toContain("do not invent an unfinished question");
    expect(prompt.serialized).toContain("Question the wounded driver");
    expect(prompt.behavior).toContain(
      "Do not give a witness knowledge they could not have",
    );
  });
  it("tells the GM why the previous reply could not be used", () => {
    expect(behavior("it named a GM-only secret")).toContain(
      "CORRECTION: your previous reply to this same turn could not be used (it named a GM-only secret)",
    );
  });

  it("adds nothing on a normal turn or an empty correction", () => {
    expect(behavior()).not.toContain("CORRECTION");
    expect(behavior("")).not.toContain("CORRECTION");
  });

  it("caps a long reason so it cannot flood the prompt", () => {
    const added = behavior("x".repeat(5000)).length - behavior().length;
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThan(600);
  });
});
