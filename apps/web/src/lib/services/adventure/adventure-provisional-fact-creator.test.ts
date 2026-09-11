import { describe, expect, it } from "vitest";
import { createAdventureEntityDraft } from "./adventure-provisional-fact-creator";

const playerVisibleFact = {
  id: "barrow",
  kind: "place" as const,
  name: "The Sunken Barrow",
  summary: "An ancient barrow flooded by the rising marsh.",
  introducedOnTurnId: "turn-1",
  visibility: "player-visible" as const,
};

describe("createAdventureEntityDraft", () => {
  it("creates a normal Codex draft from a player-visible adventure fact", () => {
    expect(
      createAdventureEntityDraft(playerVisibleFact, "The Drowned March"),
    ).toEqual({
      type: "location",
      title: "The Sunken Barrow",
      initialData: {
        content:
          "An ancient barrow flooded by the rising marsh.\n\n*Introduced during the adventure “The Drowned March”.*",
      },
    });
  });

  it("never creates a draft from GM-only information", () => {
    expect(
      createAdventureEntityDraft(
        { ...playerVisibleFact, visibility: "gm-only" },
        "The Drowned March",
      ),
    ).toBeNull();
  });
});
