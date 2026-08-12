import { describe, expect, it } from "vitest";
import { buildPlotTwistPremise } from "./generator-handoffs";

describe("buildPlotTwistPremise", () => {
  it("keeps the quest hook's useful public draft fields in order", () => {
    expect(
      buildPlotTwistPremise({
        title: "The Sunken Relic",
        summary: "The party must reach the reef first.",
        content: "### Hook\nA rival gang is searching too.",
        lore: "### Complication\nThe relic is fused to the altar.",
      }),
    ).toBe(
      "The Sunken Relic\n\nThe party must reach the reef first.\n\n### Hook\nA rival gang is searching too.\n\n### Complication\nThe relic is fused to the altar.",
    );
  });

  it("bounds long handoff context to the Plot Twist form limit", () => {
    expect(
      buildPlotTwistPremise({
        title: "Hook",
        summary: "",
        content: "x".repeat(5000),
        lore: "",
      }),
    ).toHaveLength(4000);
  });
});
