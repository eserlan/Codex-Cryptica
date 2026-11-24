import { describe, expect, it } from "vitest";
import { buildAdventurePrompt } from "../src";
import { scenario, session } from "./reducer-fixtures";

const makePrompt = (directorEnabled?: boolean) =>
  buildAdventurePrompt({
    session: {
      ...session(),
      scenarioCollection: {
        version: 1,
        focusedScenarioId: "scenario-1",
        items: [{ ...scenario(), knowledge: "heard" }],
      },
    },
    phase: "action",
    playerAction: "Ask the witness what they saw.",
    anchors: [],
    relevant: [],
    ...(directorEnabled === undefined ? {} : { directorEnabled }),
  });

describe("QA Director prompt treatment", () => {
  it("keeps Director guidance enabled by default", () => {
    const prompt = makePrompt();
    expect(prompt.behavior).toContain("The GM-ONLY director brief is advisory");
    expect(prompt.behavior).toContain("Progressive elaboration ladder:");
    expect(prompt.behavior).toContain("Voluntary engagement:");
    expect(prompt.behavior).toContain(
      "never re-reveal an already-heard scenario",
    );
    expect(prompt.behavior).toContain("causalCommitments");
    expect(prompt.behavior).toContain(
      "kind (motive|mechanism|identity|action|link)",
    );
    expect(prompt.behavior).toContain(
      "commitmentClass (supporting-explanation|belief-testimony|speculative-plan)",
    );
    expect(prompt.behavior).toContain("Keep causalCommitments private");
    expect(prompt.behavior).toContain("name the claimant, mark it unverified");
  });

  it("omits only Director-specific guidance in the off treatment", () => {
    const prompt = makePrompt(false);
    expect(prompt.behavior).not.toContain("GM-ONLY director brief");
    expect(prompt.behavior).not.toContain(
      "Record consequential invented motives, mechanisms",
    );
    expect(prompt.behavior).not.toContain("Progressive elaboration ladder:");
    expect(prompt.behavior).not.toContain("Voluntary engagement:");
    expect(prompt.behavior).toContain(
      "never re-reveal an already-heard scenario",
    );
    expect(prompt.behavior).toContain(
      "Never choose the player character's voluntary actions",
    );
    expect(prompt.behavior).toContain("Peaceful/off-script:");
    expect(prompt.behavior).toContain(
      "Use provisionalFacts only for genuinely new player-visible entities or events.",
    );
    expect(prompt.behavior).toContain(
      "Return only the requested structured schema",
    );
  });
});
