import { describe, expect, it } from "vitest";
import { buildQuestPrompt } from "./public-quest";
import { buildRumourPrompt } from "./public-rumour";
import { buildEncounterPrompt } from "./public-encounter";
import { buildComicBookEventPrompt } from "./public-comic-book-event";
import { buildNewsSheetPrompt } from "./public-news-sheet";
import { buildPuzzlePrompt } from "./public-puzzle";
import { buildPlotTwistPrompt } from "./public-plot-twist";
import { formatPublicScenarioConcept } from "./public-scenario-diversity";
import { buildCouncilVoteFoundationPrompt } from "./public-council-vote";
import { buildOneShotPrompt } from "./public-one-shot";
import { buildMysteryPrompt } from "./public-mystery";

describe("public scenario diversity", () => {
  it("adds the same choice-aware concept guidance to each initial scenario prompt", () => {
    const prompts = [
      buildQuestPrompt(),
      buildRumourPrompt(),
      buildEncounterPrompt(),
      buildComicBookEventPrompt(),
      buildNewsSheetPrompt(),
      buildCouncilVoteFoundationPrompt({}, "", () => 0),
      buildOneShotPrompt({}, "", () => 0),
      buildMysteryPrompt({}, "", () => 0),
    ];
    for (const { userMessage } of prompts) {
      expect(userMessage).toContain("Concept constraints for this case");
      expect(userMessage).toContain(
        "Explicit user selections, instructions and established facts take precedence",
      );
    }
  });

  it("keeps anchored prompts subordinate to the user premise", () => {
    const puzzle = buildPuzzlePrompt(
      { genre: "Classic Fantasy" },
      "",
      () => 0,
    ).userMessage;
    const twist = buildPlotTwistPrompt(
      { premise: "The bridge was destroyed" },
      () => 0,
    ).userMessage;
    expect(puzzle).toContain(
      "Optional variation cue: Use a mechanism involving movement",
    );
    expect(twist).toContain("The bridge was destroyed");
    expect(twist).toContain(
      "only if compatible with the user's choices, premise and established facts",
    );
    expect(twist).not.toContain("Concept constraints for this case");
  });

  it("spreads suggestions across multi-item output and varies with the random source", () => {
    const first = formatPublicScenarioConcept(
      "Classic Fantasy",
      "Heroic",
      () => 0,
      true,
    );
    const last = formatPublicScenarioConcept(
      "Classic Fantasy",
      "Heroic",
      () => 0.99,
    );
    expect(first).toContain("Spread these choices across the items");
    expect(last).not.toContain("Spread these choices across the items");
    expect(first).not.toEqual(last);
  });
});
