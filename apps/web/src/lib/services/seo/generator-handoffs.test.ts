import { describe, expect, it } from "vitest";
import {
  buildPlotTwistPremise,
  isQuestHookDraft,
  resolvePlotTwistPremiseForGeneration,
  isDelveDraft,
  buildDelveBossContext,
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

  it("recognizes delve and dungeon labels", () => {
    expect(isDelveDraft(["dungeon", "location"])).toBe(true);
    expect(isDelveDraft(["delve", "fantasy"])).toBe(true);
    expect(isDelveDraft(["dungeon-generator"])).toBe(true);
    expect(isDelveDraft(["character", "npc"])).toBe(false);
    expect(isDelveDraft(undefined)).toBe(false);
  });

  it("builds a bounded delve context for boss generation", () => {
    const context = buildDelveBossContext({
      title: "The Iron Sanctum",
      summary: "A fortified underground dwarven bastion.",
      lore: "### Inhabitants\nDuergar raiders led by a warlord.\n### Central Secret\nAn ancient fire elemental is bound below.",
    });

    expect(context).toContain("[Delve Context]");
    expect(context).toContain("Dungeon Location: The Iron Sanctum");
    expect(context).toContain("A fortified underground dwarven bastion.");
    expect(context).toContain("Duergar raiders led by a warlord.");
    expect(context).toContain("An ancient fire elemental is bound below.");
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
