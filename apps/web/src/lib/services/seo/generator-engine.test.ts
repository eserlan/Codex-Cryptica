import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";

describe("DefaultGeneratorEngine", () => {
  let mockClientManager: any;
  let engine: DefaultGeneratorEngine;

  beforeEach(() => {
    mockClientManager = {
      getModel: vi.fn(),
    };
    engine = new DefaultGeneratorEngine(mockClientManager);
  });

  describe("generateName", () => {
    it("should generate a valid string name", () => {
      const name = engine.generateName();
      expect(name).toBeDefined();
      expect(name.length).toBeGreaterThan(1);
    });
  });

  describe("generateNPC", () => {
    it("should generate NPC details using local fallback when useAI is false", async () => {
      const res = await engine.generateNPC({
        race: "Elf",
        role: "Mage",
        alignment: "Neutral Good",
        useAI: false,
      });

      expect(res.type).toBe("character");
      expect(res.title).toBeDefined();
      expect(res.content).toContain("Elf");
      expect(res.content).toContain("Mage");
      expect(res.lore).toContain("Neutral Good");
      expect(res.lore).toContain("Species/Ancestry");
      expect(res.lore).toContain("Faction Connection");
      expect(res.lore).toContain("Plot Hook");
      expect(res.labels).toContain("npc-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include optional campaign context in local NPC output", async () => {
      const res = await engine.generateNPC({
        race: "Human",
        role: "Guard",
        alignment: "Lawful Neutral",
        campaignContext: "a haunted border city under siege",
        useAI: false,
      });

      expect(res.content).toContain("Campaign Fit");
      expect(res.content).toContain("a haunted border city under siege");
    });

    it("should call clientManager when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Aelwen The Wise",
                content: "AI Generated Bio",
                lore: "AI Generated Stats",
                labels: ["custom-label"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateNPC({
        race: "Elf",
        role: "Mage",
        alignment: "Neutral Good",
        campaignContext: "a ruined elven academy",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a ruined elven academy"),
      );
      expect(res.title).toBe("Aelwen The Wise");
      expect(res.content).toBe("AI Generated Bio");
      expect(res.lore).toBe("AI Generated Stats");
      expect(res.labels).toContain("custom-label");
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateNPC({
        race: "Dwarf",
        role: "Warrior",
        alignment: "Lawful Good",
        useAI: true,
      });

      expect(res.type).toBe("character");
      expect(res.content).toContain("Dwarf");
      expect(res.content).toContain("Warrior");
      expect(res.lore).toContain("Lawful Good");
    });
  });

  describe("generateFaction", () => {
    it("should generate faction details locally when useAI is false", async () => {
      const res = await engine.generateFaction({
        type: "Merchant Guild",
        scope: "Single city",
        alignment: "Pragmatic and profit-driven",
        campaignContext: "a canal city split by old guild rivalries",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.title).toBeDefined();
      expect(res.summary).toBeDefined();
      expect(res.content).toContain("merchant guild");
      expect(res.content).toContain("What they control");
      expect(res.content).toContain("What they want");
      expect(res.content).toContain(
        "a canal city split by old guild rivalries",
      );
      expect(res.lore).toContain("Internal Conflict");
      expect(res.lore).toContain("At the Table");
      expect(res.labels).toContain("faction-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include faction campaign context in the AI prompt", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Argent Loom",
                content: "AI Generated Faction",
                lore: "AI Generated Agenda",
                labels: ["rpg-faction", "faction-generator"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateFaction({
        type: "Secret Society",
        scope: "Kingdom-wide network",
        alignment: "Idealistic but compromised",
        campaignContext: "a kingdom recovering from a succession war",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a kingdom recovering from a succession war"),
      );
      expect(res.type).toBe("faction");
      expect(res.title).toBe("The Argent Loom");
      expect(res.content).toBe("AI Generated Faction");
      expect(res.lore).toBe("AI Generated Agenda");
      expect(res.labels).toContain("faction-generator");
    });

    it("should include campaign theme in the AI prompt (fallback content is not theme-specific)", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Cyberdine Corp",
                content: "AI Cyberpunk Faction",
                lore: "AI Cyberpunk Agenda",
                labels: ["rpg-faction", "cyberpunk"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateFaction({
        type: "Criminal Syndicate",
        scope: "Single city",
        alignment: "Pragmatic",
        theme: "Cyberpunk / Corporate",
        useAI: true,
      });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("Theme/Genre: Cyberpunk / Corporate"),
      );
      expect(res.title).toBe("Cyberdine Corp");

      // Test local fallback path for theme awareness
      const fallbackRes = await engine.generateFaction({
        type: "Criminal Syndicate",
        scope: "Single city",
        alignment: "Pragmatic",
        theme: "Cyberpunk / Corporate",
        useAI: false,
      });
      expect(fallbackRes.content).toContain("criminal syndicate");
      expect(fallbackRes.content).toContain("What they control");
      expect(fallbackRes.lore).toContain("At the Table");
    });
  });

  describe("generateVampireClan", () => {
    it("should generate vampire clan details locally when useAI is false", async () => {
      const res = await engine.generateVampireClan({
        archetype: "Aristocratic Court",
        bloodline: "Sanguine Nobles (Charismatic Mind-Benders)",
        feedingHabit: "High-Society Salons (Elite & Consent-based)",
        weakness: "Severe Sun Sensitivity (Burns instantly)",
        scope: "Single city underbelly",
        alignment: "Strictly lawful, highly predatory",
        campaignContext: "a gothic noir metropolis under rain",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.title).toBeDefined();
      expect(res.content).toContain("vampire clan");
      expect(res.content).toContain("Campaign Fit");
      expect(res.content).toContain("a gothic noir metropolis under rain");
      expect(res.lore).toContain("Vampire Clan (Aristocratic Court)");
      expect(res.lore).toContain("Sanguine Nobles");
      expect(res.lore).toContain("Feeding Habit");
      expect(res.lore).toContain("Clan Weakness");
      expect(res.lore).toContain("Internal Conflict");
      expect(res.lore).toContain("Adventure Hook");
      expect(res.labels).toContain("vampire-clan");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include vampire clan campaign context in the AI prompt", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "House Karnstein",
                content: "AI Generated Vampire Clan",
                lore: "AI Generated Weaknesses and Secrets",
                labels: ["rpg-faction", "vampire-clan"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateVampireClan({
        archetype: "Occult Coven",
        campaignContext: "an ancient cathedral ruin",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("an ancient cathedral ruin"),
      );
      expect(res.type).toBe("faction");
      expect(res.title).toBe("House Karnstein");
      expect(res.content).toBe("AI Generated Vampire Clan");
      expect(res.lore).toBe("AI Generated Weaknesses and Secrets");
      expect(res.labels).toContain("vampire-clan");
    });
  });

  describe("generateNames", () => {
    it("should generate the correct entity type for each name type", async () => {
      const cases: Array<[string, string]> = [
        ["Person", "character"],
        ["Place", "location"],
        ["Faction", "faction"],
        ["Item", "item"],
      ];
      for (const [nameType, expected] of cases) {
        const res = await engine.generateNames({ nameType, useAI: false });
        expect(res.type).toBe(expected);
      }
    });

    it("should generate the requested count of names in local fallback", async () => {
      const res = await engine.generateNames({ count: "3", useAI: false });
      const bullets = (res.content.match(/^- /gm) || []).length;
      expect(bullets).toBe(3);
      expect(res.title).toBeDefined();
      expect(res.title!.length).toBeGreaterThan(0);
    });

    it("should clamp invalid count to a positive integer", async () => {
      const res = await engine.generateNames({
        count: "not-a-number",
        useAI: false,
      });
      const bullets = (res.content.match(/^- /gm) || []).length;
      expect(bullets).toBeGreaterThan(0);
      expect(res.title).toBeDefined();
    });

    it("should use culture-specific prefix/suffix tables", async () => {
      const res = await engine.generateNames({
        culture: "Dwarven",
        count: "5",
        useAI: false,
      });
      expect(res.content).toContain("Dwarven");
      expect(res.labels).toContain("name-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should call clientManager and return AI output when useAI is true", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Sylvara",
                content: "High Elf names.\n- **Sylvara**: graceful archer",
                lore: "Culture: High Elf",
                labels: ["fantasy-name", "name-generator"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateNames({
        culture: "High Elf",
        nameType: "Person",
        count: "3",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(res.type).toBe("character");
      expect(res.title).toBe("Sylvara");
      expect(res.content).toContain("Sylvara");
    });

    it("should fall back to local tables when AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateNames({
        culture: "Norse / Viking",
        count: "3",
        useAI: true,
      });

      expect(res.type).toBe("character");
      expect(res.title).toBeDefined();
      const bullets = (res.content.match(/^- /gm) || []).length;
      expect(bullets).toBe(3);
    });
  });

  describe("generateSettlement", () => {
    it("should generate settlement details locally when useAI is false", async () => {
      const res = await engine.generateSettlement({
        size: "Town",
        economy: "Mining",
        useAI: false,
      });

      expect(res.type).toBe("location");
      expect(res.title).toBeDefined();
      expect(res.content).toContain("mining");
      expect(res.lore).toContain("Town");
      expect(res.labels).toContain("imported-draft");
    });
  });

  describe("generateMagicItem", () => {
    it("should generate magic item details locally when useAI is false", async () => {
      const res = await engine.generateMagicItem({
        type: "Weapon",
        rarity: "Legendary",
        useAI: false,
      });

      expect(res.type).toBe("item");
      expect(res.title).toBeDefined();
      expect(res.lore).toContain("Weapon");
      expect(res.lore).toContain("Legendary");
      expect(res.labels).toContain("imported-draft");
    });
  });
});
