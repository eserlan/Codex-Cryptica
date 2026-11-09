import { describe, expect, it } from "vitest";
import {
  batchFilterPromotableFacts,
  createAdventureEntityDraft,
} from "./adventure-provisional-fact-creator";

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

describe("batchFilterPromotableFacts", () => {
  it("filters out GM-only facts", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "secret",
        name: "Secret Cult",
        visibility: "gm-only" as const,
      },
    ];

    const result = batchFilterPromotableFacts(facts, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });

  it("filters out facts whose titles match existing vault entities case-insensitively and trimmed", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "inn",
        name: "  The Rusty Anchor  ",
      },
    ];

    const result = batchFilterPromotableFacts(facts, ["the rusty anchor"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });

  it("filters out excluded / already processed IDs", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "tower",
        name: "The Spire",
      },
    ];

    const result = batchFilterPromotableFacts(facts, [], ["barrow"]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tower");
  });

  it("deduplicates identical fact names within the same batch", () => {
    const facts = [
      playerVisibleFact,
      {
        ...playerVisibleFact,
        id: "barrow-dup",
        name: "the sunken barrow",
      },
    ];

    const result = batchFilterPromotableFacts(facts, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("barrow");
  });
});
