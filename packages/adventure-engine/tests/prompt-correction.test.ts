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
