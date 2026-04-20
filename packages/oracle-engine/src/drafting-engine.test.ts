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
    expect(proposals[0].confidence).toBe(0.95);
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
});
