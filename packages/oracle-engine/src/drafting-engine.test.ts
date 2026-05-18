import { describe, it, expect } from "vitest";
import { DraftingEngine } from "./drafting-engine";

describe("DraftingEngine", () => {
  const engine = new DraftingEngine();

  it("should extract new entities from markers", async () => {
    const text =
      "A reclusive alchemist named **Valerius** as **NPC** who works out of a crystal tower.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Valerius");
    expect(proposals[0].type).toBe("npc");
    expect(proposals[0].entityId).toBeUndefined();
    expect(proposals[0].draft.lore).toContain("Valerius");
  });

  it("should identify existing entities and propose updates", async () => {
    const text = "Actually, **Valerius** has lost his left eye.";
    const context = {
      existingEntities: [{ id: "valerius-id", title: "Valerius", type: "npc" }],
      history: [],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Valerius");
    expect(proposals[0].entityId).toBe("valerius-id");
    expect(proposals[0].type).toBe("npc");
    expect(proposals[0].confidence).toBe(0.95);
  });

  it("should make a best-guess type for new bolded entities without inline type suffixes", async () => {
    const text =
      "**Thay** is ruled by **Szass Tam** and feared by **The Red Wizards**.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(3);
    expect(proposals.map((p) => p.title)).toEqual([
      "Thay",
      "Szass Tam",
      "The Red Wizards",
    ]);
    expect(proposals.map((p) => p.type)).toEqual(["concept", "npc", "faction"]);
  });

  it("should respect custom categories when provided", async () => {
    const text = "A powerful **Fireball** as **Spell** was cast.";
    const context = {
      existingEntities: [],
      history: [],
      categories: [{ id: "spell", label: "Spell" }],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Fireball");
    expect(proposals[0].type).toBe("spell");
  });

  it("should resolve custom categories by label", async () => {
    const text = "A powerful **Fireball** as **Ancient Spell** was cast.";
    const context = {
      existingEntities: [],
      history: [],
      categories: [{ id: "spell", label: "Ancient Spell" }],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].title).toBe("Fireball");
    expect(proposals[0].type).toBe("spell");
  });

  it("should infer type from matching vault entities for bolded mentions", async () => {
    const text =
      "**Thay** is ruled by **Szass Tam** and feared by **The Red Wizards**.";
    const context = {
      existingEntities: [
        { id: "thay-id", title: "Thay", type: "location" },
        { id: "tam-id", title: "Szass Tam", type: "npc" },
        {
          id: "wizards-id",
          title: "The Red Wizards",
          type: "faction",
        },
      ],
      history: [],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(3);
    expect(proposals.map((p) => [p.title, p.type, p.entityId])).toEqual([
      ["Thay", "location", "thay-id"],
      ["Szass Tam", "npc", "tam-id"],
      ["The Red Wizards", "faction", "wizards-id"],
    ]);
  });

  it("should match existing entities despite leading articles and punctuation", async () => {
    const text =
      "Legends warn that **The Zulkirs** still answer to **Aglarond.**";
    const context = {
      existingEntities: [
        { id: "zulkirs-id", title: "Zulkirs", type: "faction" },
        { id: "aglarond-id", title: "Aglarond", type: "location" },
      ],
      history: [],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals.map((p) => [p.title, p.type, p.entityId])).toEqual([
      ["The Zulkirs", "faction", "zulkirs-id"],
      ["Aglarond.", "location", "aglarond-id"],
    ]);
  });

  it("should handle multiple discoveries in one text", async () => {
    const text =
      "**Valerius** as **NPC** and his home **Azure Wastes** as **Location**.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(2);
    expect(proposals[0].title).toBe("Valerius");
    expect(proposals[1].title).toBe("Azure Wastes");
    expect(proposals[1].type).toBe("location");
  });

  it("should normalize entity types", async () => {
    const text = "**Sauron** as **Person**";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals[0].type).toBe("character");
  });

  it("should infer location and item types from nearby lore context", async () => {
    const text =
      "**The Azure Wastes** lie beyond the mountains. **The Ebony Staff** serves as a conduit for terrible magic.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals.map((p) => [p.title, p.type])).toEqual([
      ["The Azure Wastes", "location"],
      ["The Ebony Staff", "item"],
    ]);
  });

  it("should infer event types from named historical conflicts", async () => {
    const text =
      "The rise of Szass Tam followed **War of the Zulkirs**, a cataclysm that broke the old order.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].type).toBe("event");
  });

  it("should suppress structured output field names from discovery proposals", async () => {
    const text = [
      "**Name:** Strongheart Halflings",
      "**Type:** faction",
      "**Chronicle:** A resilient halfling culture.",
      "**Lore:** The Stronghearts guard their homes fiercely.",
      "",
      "**Luiren** is their ancestral homeland.",
    ].join("\n");
    const context = {
      existingEntities: [
        { id: "luiren-id", title: "Luiren", type: "location" },
      ],
      history: [],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals.map((proposal) => proposal.title)).toEqual(["Luiren"]);
  });

  it("should suppress proposal titles longer than four words", async () => {
    const text =
      "**The Old Tower** remains, but **The Forgotten Keep Beneath Greyfall Mountain** is gone.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals.map((proposal) => proposal.title)).toEqual([
      "The Old Tower",
    ]);
  });

  it("should suppress noisy fragment proposal titles", async () => {
    const text = [
      "**Valerius** guards the sealed moon gate.",
      "**and his** blade is missing.",
      "**1.** Return to the tower.",
      "**you use your** key at dawn.",
    ].join(" ");
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals.map((proposal) => proposal.title)).toEqual(["Valerius"]);
  });

  it("should allow long proposal titles when they match existing entities", async () => {
    const text =
      "**The Forgotten Keep Beneath Greyfall Mountain** now holds the missing seal.";
    const context = {
      existingEntities: [
        {
          id: "greyfall-keep",
          title: "The Forgotten Keep Beneath Greyfall Mountain",
          type: "location",
        },
      ],
      history: [],
    };

    const proposals = await engine.propose(text, context);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      entityId: "greyfall-keep",
      title: "The Forgotten Keep Beneath Greyfall Mountain",
      type: "location",
    });
  });

  it("should strip trailing colons from proposal titles", async () => {
    const text = "**Valerius:** guards the sealed moon gate.";
    const context = { existingEntities: [], history: [] };

    const proposals = await engine.propose(text, context);

    expect(proposals[0].title).toBe("Valerius");
  });
});
