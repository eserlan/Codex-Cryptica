import { describe, expect, it } from "vitest";
import {
  buildPlotTwistPremise,
  isQuestHookDraft,
  resolvePlotTwistPremiseForGeneration,
} from "./generator-handoffs";

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

  it("recognizes only quest-generator labels", () => {
    expect(isQuestHookDraft(["rpg-quest", "Retrieval"])).toBe(true);
    expect(isQuestHookDraft(["event", "political"])).toBe(false);
    expect(isQuestHookDraft(undefined)).toBe(false);
  });
});

describe("resolvePlotTwistPremiseForGeneration", () => {
  it("uses the transferred Quest Hook while client navigation state catches up", () => {
    expect(
      resolvePlotTwistPremiseForGeneration(
        "",
        "The drowned bell calls villagers into the marsh.",
      ),
    ).toBe("The drowned bell calls villagers into the marsh.");
  });

  it("uses the user's edited premise after the handoff populates the form", () => {
    expect(
      resolvePlotTwistPremiseForGeneration(
        "The bell now calls only the reeve's family.",
        "The drowned bell calls villagers into the marsh.",
      ),
    ).toBe("The bell now calls only the reeve's family.");
  });
});
