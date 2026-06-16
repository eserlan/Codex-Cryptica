import { describe, expect, it } from "vitest";
import {
  GeneratorSession,
  buildGeneratorLoreEntries,
  buildGeneratorSessionInput,
} from "./generator-session";
import type { GeneratorVaultContext } from "./campaign-generator-types";

function context(): GeneratorVaultContext {
  return {
    themeId: "fantasy",
    themeName: "Low Myth",
    currentDate: "1492",
    targetEntityType: "faction",
    categoryLabels: [{ id: "faction", label: "Faction" }],
    applyTemplate: true,
    templateOutline: "## Summary\n## Goals",
    sourceEntity: {
      id: "src",
      title: "Ash Market",
      type: "location",
      contentExcerpt: "A burned trading quarter.",
      loreExcerpt: "The guilds still meet here.",
      labels: ["district"],
    },
    neighbors: [
      {
        id: "n1",
        title: "Mira Vale",
        type: "character",
        relationship: "broker",
        contentExcerpt: "A careful negotiator.",
      },
    ],
    worldSample: [
      {
        id: "w1",
        title: "Salt Concord",
        type: "faction",
        contentExcerpt: "A shipping cartel.",
      },
    ],
    existingTitles: ["Salt Concord"],
    bannedNames: ["Vane"],
    labelSuggestions: ["smugglers"],
    includedContext: [
      "theme",
      "categories",
      "source",
      "neighbors",
      "world",
      "titles",
      "labels",
    ],
  };
}

describe("GeneratorSession", () => {
  it("sends full vault context on the first turn and only changed lore afterward", () => {
    const session = new GeneratorSession();
    const loreEntries = buildGeneratorLoreEntries(context());

    const first = session.prepareTurn({
      instruction: "Generate a faction.",
      loreEntries,
    });
    expect(first.input).toContain("[GENERATOR VAULT CONTEXT]");
    expect(first.input).toContain("Low Myth");
    expect(first.input).toContain("Salt Concord");
    expect(first.sentLoreCount).toBe(loreEntries.length);

    session.commitTurn("interaction-1", loreEntries);

    const second = session.prepareTurn({
      instruction: "Generate a rival faction.",
      loreEntries,
    });
    expect(second.input).not.toContain("[GENERATOR VAULT CONTEXT]");
    expect(second.input).toContain("[RELEVANT EARLIER RECORDS]");
    expect(second.input).toContain("Generator world context");
    expect(second.input).toContain(
      "[GENERATOR REQUEST]\nGenerate a rival faction.",
    );
    expect(second.sentLoreCount).toBe(0);
    expect(second.previousInteractionId).toBe("interaction-1");
  });

  it("commits accepted generated entities and never commits drafts implicitly", () => {
    const session = new GeneratorSession();
    const loreEntries = buildGeneratorLoreEntries(context());
    session.commitTurn("interaction-1", loreEntries);

    const beforeAccept = session.prepareTurn({
      instruction: "Generate an NPC.",
      loreEntries,
    });
    expect(beforeAccept.input).not.toContain("Captain Orra");

    session.commitAcceptedEntity({
      id: "accepted-1",
      title: "Captain Orra",
      type: "character",
      content: "Leads the new watch.",
      lore: "Accepted into the campaign.",
      labels: ["watch"],
    });

    const afterAccept = session.prepareTurn({
      instruction: "Generate an item.",
      loreEntries,
    });
    expect(afterAccept.input).toContain("Captain Orra");
    expect(afterAccept.sentLoreCount).toBe(1);
  });

  it("reset clears previous id, accepted entities, and forces full context replay", () => {
    const session = new GeneratorSession();
    const loreEntries = buildGeneratorLoreEntries(context());
    session.commitTurn("interaction-1", loreEntries);
    session.commitAcceptedEntity({
      id: "accepted-1",
      title: "Captain Orra",
      type: "character",
      lore: "Accepted into the campaign.",
    });

    session.reset();
    const turn = session.prepareTurn({
      instruction: "Replay after expiry.",
      loreEntries,
    });

    expect(turn.previousInteractionId).toBeNull();
    expect(turn.input).toContain("[GENERATOR VAULT CONTEXT]");
    expect(turn.input).not.toContain("Captain Orra");
    expect(turn.sentLoreCount).toBe(loreEntries.length);
  });

  it("resetInteractionState keeps accepted entities and re-sends them on replay", () => {
    const session = new GeneratorSession();
    const loreEntries = buildGeneratorLoreEntries(context());
    session.commitTurn("interaction-1", loreEntries);
    session.commitAcceptedEntity({
      id: "accepted-1",
      title: "Captain Orra",
      type: "character",
      lore: "Accepted into the campaign.",
    });

    // Retention replay: drop interaction tracking but keep accepted entities.
    session.resetInteractionState();
    const turn = session.prepareTurn({
      instruction: "Replay after expiry.",
      loreEntries,
    });

    expect(turn.previousInteractionId).toBeNull();
    // Accepted entity survives and is re-sent (tracker was reset → counted new).
    expect(turn.input).toContain("Captain Orra");
    expect(turn.sentLoreCount).toBe(loreEntries.length + 1);
  });
});

describe("buildGeneratorSessionInput", () => {
  it("keeps generator instructions separate from retained context hints", () => {
    const loreEntries = buildGeneratorLoreEntries(context());
    const input = buildGeneratorSessionInput("Make a settlement.", {
      newOrChanged: [],
      unchanged: loreEntries,
    });

    expect(input).toContain("[RELEVANT EARLIER RECORDS]");
    expect(input).toContain("[GENERATOR REQUEST]\nMake a settlement.");
    expect(input).not.toContain("[USER QUERY]");
  });
});
