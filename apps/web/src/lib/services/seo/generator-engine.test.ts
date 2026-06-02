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
      expect(res.labels).toContain("imported-draft");
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
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalled();
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
