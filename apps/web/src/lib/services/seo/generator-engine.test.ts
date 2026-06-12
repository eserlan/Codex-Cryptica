/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";
import { BANNED_NAMES, NAME_BAN_PROMPT } from "./generators/banned-names";

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
      expect(res.summary).toBeTruthy();
      expect(res.content).toContain("Who they are");
      expect(res.content).toContain("What they want");
      expect(res.content).toContain("Elf");
      expect(res.content).toContain("Mage");
      expect(res.lore).toContain("Neutral Good");
      expect(res.lore).toContain("At a Glance");
      expect(res.lore).toContain("Faction Connection");
      expect(res.labels).toContain("npc-generator");
      expect(res.labels).toContain("imported-draft");
      expect(res.lore).not.toContain("Class / Archetype");
      expect(res.lore).not.toContain("Table Rating");
    });

    it("should include D&D quick stats when requested", async () => {
      const res = await engine.generateNPC({
        race: "Human",
        role: "Priest",
        alignment: "Lawful Good",
        includeDndQuickStats: true,
        useAI: false,
      });

      expect(res.lore).toContain("### At a Glance");
      expect(res.lore).toContain("**Class / Archetype**: Cleric / Level 5");
      expect(res.lore).toContain("**Table Rating**: CR 3");
      expect(res.lore.indexOf("Class / Archetype")).toBeLessThan(
        res.lore.indexOf("Ancestry"),
      );
    });

    it("should include optional campaign context in local NPC output", async () => {
      const res = await engine.generateNPC({
        race: "Human",
        role: "Guard",
        alignment: "Lawful Neutral",
        campaignContext: "a haunted border city under siege",
        useAI: false,
      });

      expect(res.content).toContain("a haunted border city under siege");
      expect(res.content).toContain("### Who they are");
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
        includeDndQuickStats: true,
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a ruined elven academy"),
      );
      expect(res.title).toBe("Aelwen The Wise");
      expect(res.content).toBe("AI Generated Bio");
      expect(res.lore).toContain("AI Generated Stats");
      expect(res.lore).toContain("**Class / Archetype**: Wizard / Level 5");
      expect(res.lore).toContain("**Table Rating**: CR 3");
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
      expect(res.lore).toContain("- **📍 Base**");
      expect(res.lore).toContain("- **👤");
      expect(res.lore).toContain("- **👥");
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
      expect(res.lore).toContain("- **👤 Sire");
      expect(res.lore).toContain("- **👤 Thrall");
      expect(res.lore).toContain("- **👥");
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
      expect(mockClientManager.getModel).toHaveBeenCalledWith(
        "",
        "gemini-3.1-flash-lite",
        "You are an assistant that generates detailed RPG campaign elements in JSON format.",
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("an ancient cathedral ruin"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👤 Sire Name**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👤 Thrall Name**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👥 Rival Name**"),
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
      expect(res.title).toBe("High Elf Names — Person");
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
      expect(res.lore).toContain("- **📍");
      expect(res.lore).toContain("- **👥");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include settlement icon sections in the AI prompt", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Stonebridge",
                content: "AI settlement description",
                lore: "AI settlement lore",
                labels: ["rpg-location", "imported-draft"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateSettlement({
        size: "Village",
        economy: "Trade Hub",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("### Points of Interest"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **📍 Location Name**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("### Controlling Factions"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👥 Faction Name**"),
      );
      expect(res.title).toBe("Stonebridge");
      expect(res.lore).toBe("AI settlement lore");
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

  describe("generateQuestHook", () => {
    it("should generate quest hook details locally when useAI is false", async () => {
      const res = await engine.generateQuestHook({
        genre: "Classic Fantasy",
        tone: "Heroic",
        scope: "Local / Village",
        locationType: "Dungeon",
        threat: "Goblins",
        twist: "The goblins were protecting a sacred egg",
        reward: "A pouch of silver coins",
        useAI: false,
      });

      expect(res.type).toBe("event");
      expect(res.title).toBeDefined();
      expect(res.content).toContain("### The Hook");
      expect(res.lore).toContain("### Core Fields");
      expect(res.lore).toContain("- **📍 Setting**");
      expect(res.lore).toContain("- **📅 Threat**");
      expect(res.lore).toContain("- **👤");
      expect(res.labels).toContain("imported-draft");
    });
  });

  describe("generateSocialHub", () => {
    it("should generate a venue using local fallback when useAI is false", async () => {
      const res = await engine.generateSocialHub({
        genre: "Cyberpunk",
        venueType: "Noodle Bar",
        atmosphere: "Tense and suspicious",
        wealthLevel: "Poor (cheap but honest)",
        clientele: "Hackers and netrunners",
        useAI: false,
      });

      expect(res.type).toBe("location");
      expect(res.title).toBeDefined();
      expect(res.title).not.toMatch(/The .* The /);
      expect(res.summary).toContain("noodle bar");
      expect(res.content).toContain("### The Place");
      expect(res.content).toContain("### The Trouble");
      expect(res.lore).toContain("### At a Glance");
      expect(res.lore).toContain("### Notable Regulars");
      expect(res.lore).toContain("### Rumours");
      expect(res.lore).toContain("### Entity Seeds");
      expect(res.lore).toContain("- **📍");
      expect(res.lore).toContain("- **👤");
      expect(res.lore).toContain("- **👥");
      expect(res.lore).not.toContain("- **Character**:");
      expect(res.lore).not.toContain("- **Location**:");
      expect(res.lore).not.toContain("- **Faction**:");
      expect(res.labels).toContain("social-hub-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include campaign context in local fallback output", async () => {
      const res = await engine.generateSocialHub({
        genre: "Western",
        venueType: "Saloon",
        campaignContext: "a lawless frontier town",
        useAI: false,
      });

      expect(res.content).toContain("a lawless frontier town");
    });

    it("should use genre-appropriate venue types in local fallback", async () => {
      const res = await engine.generateSocialHub({
        genre: "Sci-Fi",
        venueType: "Spaceport Cantina",
        useAI: false,
      });

      expect(res.summary).toContain("spaceport cantina");
    });

    it("should call clientManager when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Reyes' Noodle Hole",
                summary: "A cramped cyberpunk noodle bar.",
                content: "### The Place\nAI content.",
                lore: "### At a Glance\nAI lore.",
                labels: [
                  "rpg-location",
                  "social-hub-generator",
                  "imported-draft",
                ],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateSocialHub({
        genre: "Cyberpunk",
        venueType: "Noodle Bar",
        campaignContext: "a corp-controlled district",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a corp-controlled district"),
      );
      expect(res.title).toBe("Reyes' Noodle Hole");
      expect(res.labels).toContain("social-hub-generator");
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateSocialHub({
        genre: "Fantasy",
        venueType: "Tavern / Inn",
        useAI: true,
      });

      expect(res.type).toBe("location");
      expect(res.labels).toContain("social-hub-generator");
    });
  });

  describe("generateTavern", () => {
    it("should generate tavern details using local fallback when useAI is false", async () => {
      const res = await engine.generateTavern({
        type: "Dockside Tavern",
        atmosphere: "Tense and suspicious",
        settlementType: "Coastal port",
        wealthLevel: "Poor (cheap but honest)",
        clientele: "Dockworkers and sailors",
        useAI: false,
      });

      expect(res.type).toBe("location");
      expect(res.title).toBeDefined();
      expect(res.title).toMatch(/^The /);
      expect(res.title).not.toMatch(/The .* The /);
      expect(res.summary).toContain("dockside tavern");
      expect(res.content).toContain("### The Place");
      expect(res.content).toContain("### The Trouble");
      expect(res.lore).toContain("### At a Glance");
      expect(res.lore).toContain("### Notable Patrons");
      expect(res.lore).toContain("### Rumours");
      expect(res.lore).toContain("### Entity Seeds");
      expect(res.lore).toContain("- **📍");
      expect(res.lore).toContain("- **👤");
      expect(res.lore).toContain("- **👥");
      expect(res.lore).not.toContain("- **Character**:");
      expect(res.lore).not.toContain("- **Location**:");
      expect(res.lore).not.toContain("- **Faction**:");
      expect(res.labels).toContain("tavern-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include campaign context in local fallback output", async () => {
      const res = await engine.generateTavern({
        type: "Roadside Inn",
        campaignContext: "a cursed forest road",
        useAI: false,
      });

      expect(res.content).toContain("a cursed forest road");
    });

    it("should call clientManager when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Sullen Lantern",
                summary: "A grim dockside alehouse.",
                content: "### The Place\nAI content.",
                lore: "### At a Glance\nAI lore.",
                labels: ["rpg-location", "tavern-generator", "imported-draft"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateTavern({
        type: "Dockside Tavern",
        campaignContext: "a port under blockade",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a port under blockade"),
      );
      expect(res.title).toBe("The Sullen Lantern");
      expect(res.summary).toBe("A grim dockside alehouse.");
      expect(res.labels).toContain("tavern-generator");
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateTavern({
        type: "Roadside Inn",
        useAI: true,
      });

      expect(res.type).toBe("location");
      expect(res.title).toMatch(/^The /);
      expect(res.labels).toContain("tavern-generator");
    });
  });

  describe("generateKingdom", () => {
    it("should generate a kingdom using local fallback when useAI is false", async () => {
      const res = await engine.generateKingdom({
        polityType: "Kingdom",
        governmentStyle: "Hereditary dynasty",
        geography: "Temperate highlands",
        scale: "Mid-sized nation",
        conflictLevel: "Simmering tensions",
        magicLevel: "Common but regulated",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.title).toBeDefined();
      expect(res.title).not.toMatch(/The .* The /);
      expect(res.summary).toContain("kingdom");
      expect(res.content).toContain("### The Realm");
      expect(res.content).toContain("### Government & Power");
      expect(res.lore).toContain("### At a Glance");
      expect(res.lore).toContain("### Major Factions");
      expect(res.lore).toContain("### Rumours & Hooks");
      expect(res.lore).toContain("### Entity Seeds");
      expect(res.lore).toContain("- **👤");
      expect(res.lore).toContain("- **👥");
      expect(res.lore).toContain("- **📍");
      expect(res.lore).toContain("- **📅");
      expect(res.lore).not.toContain("- **Character**:");
      expect(res.lore).not.toContain("- **Location**:");
      expect(res.lore).not.toContain("- **Faction**:");
      expect(res.lore).not.toContain("- **Event**:");
      expect(res.labels).toContain("kingdom-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include campaign context in local fallback output", async () => {
      const res = await engine.generateKingdom({
        polityType: "Empire",
        campaignContext: "a crumbling empire on the edge of civil war",
        useAI: false,
      });

      expect(res.content).toContain(
        "a crumbling empire on the edge of civil war",
      );
    });

    it("should call clientManager when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Kingdom of Vaelthorn",
                summary: "A mid-sized kingdom held together by old oaths.",
                content: "### The Realm\nAI content.",
                lore: "### At a Glance\nAI lore.",
                labels: ["rpg-kingdom", "kingdom-generator", "imported-draft"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateKingdom({
        polityType: "Kingdom",
        campaignContext: "a succession crisis",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a succession crisis"),
      );
      expect(res.title).toBe("The Kingdom of Vaelthorn");
      expect(res.labels).toContain("kingdom-generator");
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateKingdom({
        polityType: "Duchy",
        useAI: true,
      });

      expect(res.type).toBe("faction");
      expect(res.labels).toContain("kingdom-generator");
    });
  });

  describe("generateNation", () => {
    it("should generate a nation using local fallback when useAI is false", async () => {
      const res = await engine.generateNation({
        genre: "Cyberpunk",
        polityType: "Megacorp-State",
        governmentStyle: "Corporate board",
        scale: "Mid-sized nation",
        conflictLevel: "Simmering tensions",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.title).toBeDefined();
      expect(res.summary).toContain("megacorp-state");
      expect(res.content).toContain("### The State");
      expect(res.content).toContain("### Power Structure");
      expect(res.lore).toContain("### At a Glance");
      expect(res.lore).toContain("### Power Blocs");
      expect(res.lore).toContain("### Rumours & Hooks");
      expect(res.lore).toContain("### Entity Seeds");
      expect(res.lore).toContain("- **👤");
      expect(res.lore).toContain("- **👥");
      expect(res.lore).toContain("- **📍");
      expect(res.lore).toContain("- **📅");
      expect(res.lore).not.toContain("- **Character**:");
      expect(res.lore).not.toContain("- **Location**:");
      expect(res.lore).not.toContain("- **Faction**:");
      expect(res.lore).not.toContain("- **Event**:");
      expect(res.labels).toContain("nation-generator");
      expect(res.labels).toContain("imported-draft");
    });

    it("should include campaign context in local fallback output", async () => {
      const res = await engine.generateNation({
        genre: "Sci-Fi",
        polityType: "Interstellar Federation",
        campaignContext: "a collapsing interstellar federation",
        useAI: false,
      });

      expect(res.content).toContain("a collapsing interstellar federation");
    });

    it("should use genre-appropriate polity types", async () => {
      const res = await engine.generateNation({
        genre: "Western",
        polityType: "Outlaw Republic",
        useAI: false,
      });

      expect(res.summary).toContain("outlaw republic");
    });

    it("should call clientManager when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Axiom Industrial Authority",
                summary:
                  "A cyberpunk megacorp-state controlling three districts.",
                content: "### The State\nAI content.",
                lore: "### At a Glance\nAI lore.",
                labels: ["rpg-nation", "nation-generator", "imported-draft"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateNation({
        genre: "Cyberpunk",
        polityType: "Megacorp-State",
        campaignContext: "a corp war over water rights",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("a corp war over water rights"),
      );
      expect(res.title).toBe("Axiom Industrial Authority");
      expect(res.labels).toContain("nation-generator");
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateNation({
        genre: "Fantasy",
        useAI: true,
      });

      expect(res.type).toBe("faction");
      expect(res.labels).toContain("nation-generator");
    });
  });

  describe("banned names", () => {
    it("NAME_BAN_PROMPT contains every name in BANNED_NAMES", () => {
      for (const name of BANNED_NAMES) {
        expect(NAME_BAN_PROMPT).toContain(name);
      }
    });

    const generators: Array<{
      label: string;
      call: (engine: DefaultGeneratorEngine) => Promise<unknown>;
    }> = [
      { label: "NPC", call: (e) => e.generateNPC({ useAI: true }) },
      { label: "faction", call: (e) => e.generateFaction({ useAI: true }) },
      {
        label: "vampire clan",
        call: (e) => e.generateVampireClan({ useAI: true }),
      },
      {
        label: "settlement",
        call: (e) => e.generateSettlement({ useAI: true }),
      },
      {
        label: "magic item",
        call: (e) => e.generateMagicItem({ useAI: true }),
      },
      { label: "quest", call: (e) => e.generateQuestHook({ useAI: true }) },
      { label: "names", call: (e) => e.generateNames({ useAI: true }) },
      {
        label: "social hub",
        call: (e) => e.generateSocialHub({ useAI: true }),
      },
      { label: "kingdom", call: (e) => e.generateKingdom({ useAI: true }) },
      { label: "nation", call: (e) => e.generateNation({ useAI: true }) },
    ];

    for (const { label, call } of generators) {
      it(`${label} generator injects NAME_BAN_PROMPT into AI prompt`, async () => {
        let capturedSystemInstruction = "";
        let capturedUserMessage = "";
        const mockModel = {
          generateContent: vi.fn().mockImplementation((prompt: string) => {
            capturedUserMessage =
              typeof prompt === "string" ? prompt : JSON.stringify(prompt);
            return Promise.resolve({
              response: {
                text: () =>
                  JSON.stringify({
                    title: "Test",
                    content: "",
                    lore: "",
                    labels: [],
                  }),
              },
            });
          }),
        };
        const localClientManager = {
          getModel: vi
            .fn()
            .mockImplementation(
              (_a: unknown, _b: unknown, systemInstruction: unknown) => {
                capturedSystemInstruction =
                  typeof systemInstruction === "string"
                    ? systemInstruction
                    : JSON.stringify(systemInstruction ?? "");
                return Promise.resolve(mockModel);
              },
            ),
        };
        const localEngine = new DefaultGeneratorEngine(
          localClientManager as any,
        );

        await call(localEngine);

        const fullPrompt =
          capturedSystemInstruction + "\n" + capturedUserMessage;
        expect(fullPrompt.trim()).toBeTruthy();
        for (const name of BANNED_NAMES) {
          expect(
            fullPrompt,
            `${label} prompt missing banned name "${name}"`,
          ).toContain(name);
        }
      });
    }
  });

  describe("generatePantheon", () => {
    it("should generate single deity details locally when useAI is false", async () => {
      const res = await engine.generatePantheon({
        mode: "single",
        genre: "Classic Fantasy",
        divineType: "God",
        domain: "Death",
        useAI: false,
      });

      expect(res.type).toBe("character");
      expect(res.title).toContain("Death");
      expect(res.summary?.toLowerCase()).toContain("god");
      expect(res.content).toContain("Deity Description");
      expect(res.content.toLowerCase()).toContain("death");
      expect(res.lore).toContain("At a Glance");
      expect(res.lore).toContain("- **👤 Deity Type**");
      expect(res.lore).toContain("- **✨ Primary Domain**");
      expect(res.lore).toContain("- **👥 Worshippers**");
      expect(res.lore).toContain("- **📍 Sacred Symbol**");
      expect(res.lore).toContain("- **📅 Secret**");
      expect(res.lore).toContain("- **⚔ Immediate Hook**");
      expect(res.labels).toContain("rpg-deity");
      expect(res.labels).toContain("imported-draft");
    });

    it("should generate pantheon details locally when useAI is false", async () => {
      const res = await engine.generatePantheon({
        mode: "pantheon",
        genre: "Classic Fantasy",
        conflictTheme: "Cosmic Balance",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.title).toContain("Pantheon");
      expect(res.summary?.toLowerCase()).toContain("cosmic balance");
      expect(res.content).toContain("Origin & Dogma");
      expect(res.lore).toContain("At a Glance");
      expect(res.labels).toContain("rpg-pantheon");
      expect(res.labels).toContain("imported-draft");
    });

    it("should generate focused pantheon details locally when useAI is false and width is focused", async () => {
      const res = await engine.generatePantheon({
        mode: "pantheon",
        genre: "Classic Fantasy",
        domain: "War",
        width: "focused",
        useAI: false,
      });

      expect(res.type).toBe("faction");
      expect(res.summary?.toLowerCase()).toContain(
        "focused on the domain of war",
      );
      expect(res.content).toContain(
        "Controls a specific aspect of the war domain",
      );
      expect(res.lore).toContain("The deity representing a key facet of war");
    });

    it("should call clientManager for single deity when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Hel, Lady of Hela",
                content: "AI Bio",
                lore: "AI Lore",
                labels: ["deity-custom"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generatePantheon({
        mode: "single",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(res.type).toBe("character");
      expect(res.title).toBe("Hel, Lady of Hela");
      expect(res.content).toBe("AI Bio");
      expect(res.lore).toBe("AI Lore");
      expect(res.labels).toContain("deity-custom");
    });

    it("should include deity icon sections in the AI prompt", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Hel, Lady of Hela",
                content: "AI Bio",
                lore: "AI Lore",
                labels: ["deity-custom"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      await engine.generatePantheon({
        mode: "single",
        genre: "Classic Fantasy",
        divineType: "God",
        domain: "Death",
        worshippers: "State Religion",
        useAI: true,
      });

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👤 Deity Type**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **✨ Primary Domain**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **👥 Worshippers**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **📍 Sacred Symbol**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **📅 Secret**"),
      );
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("- **⚔ Immediate Hook**"),
      );
    });

    it("should call clientManager for pantheon when useAI is true and succeed", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Silent Maw",
                content: "AI Bio",
                lore: "AI Lore",
                labels: ["pantheon-custom"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generatePantheon({
        mode: "pantheon",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expect(res.type).toBe("faction");
      expect(res.title).toBe("The Silent Maw");
      expect(res.content).toBe("AI Bio");
      expect(res.lore).toBe("AI Lore");
      expect(res.labels).toContain("pantheon-custom");
    });

    it("should construct lore from structured JSON without inserting empty deity entries in entity seeds", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Silent Maw",
                summary: "Core belief system",
                meta: {
                  conflict_theme: "Cosmic Balance",
                  worshippers: "Scholars",
                  public_dogma: "Mortals believe",
                  hidden_problem: "Schism",
                  immediate_hook: "Hook",
                },
                history: {
                  origin_and_dogma: "Origin",
                  structure_and_laws: "Structure",
                },
                deities: [
                  {
                    name: "Oryx-Malaphon",
                    description: "God of Craft",
                    portfolio: "Craft",
                  },
                ],
                relationships: [
                  {
                    deity_a: "Oryx-Malaphon",
                    deity_b: "Oryx-Malaphon",
                    relationship_type: "Alliance",
                    campaign_pressure: "Pressure",
                  },
                ],
                campaign_seeds: {
                  characters: [
                    {
                      name: "Elias the Unraveler",
                      role: "Heretic",
                      hook: "Forbidden text",
                    },
                  ],
                },
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generatePantheon({
        mode: "pantheon",
        useAI: true,
      });

      expect(res.lore).toContain("### Entity Seeds");
      expect(res.lore).toContain(
        "- **👤 Elias the Unraveler (Heretic)**: Forbidden text",
      );
      expect(res.lore).not.toContain("- **Character**: Oryx-Malaphon");
    });

    it("should include correct domain scope in prompt based on width selection", async () => {
      let capturedPromptFocused = "";
      let capturedPromptBalanced = "";
      let capturedPromptWide = "";

      const mockModelFocused = {
        generateContent: vi.fn().mockImplementation((prompt: string) => {
          capturedPromptFocused = prompt;
          return Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  title: "Focused Pantheon",
                  content: "",
                  lore: "",
                  labels: [],
                }),
            },
          });
        }),
      };

      const mockModelBalanced = {
        generateContent: vi.fn().mockImplementation((prompt: string) => {
          capturedPromptBalanced = prompt;
          return Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  title: "Balanced Pantheon",
                  content: "",
                  lore: "",
                  labels: [],
                }),
            },
          });
        }),
      };

      const mockModelWide = {
        generateContent: vi.fn().mockImplementation((prompt: string) => {
          capturedPromptWide = prompt;
          return Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  title: "Wide Pantheon",
                  content: "",
                  lore: "",
                  labels: [],
                }),
            },
          });
        }),
      };

      mockClientManager.getModel
        .mockResolvedValueOnce(mockModelFocused)
        .mockResolvedValueOnce(mockModelBalanced)
        .mockResolvedValueOnce(mockModelWide);

      await engine.generatePantheon({
        mode: "pantheon",
        width: "focused",
        domain: "Nature",
        useAI: true,
      });

      await engine.generatePantheon({
        mode: "pantheon",
        width: "balanced",
        domain: "Nature",
        useAI: true,
      });

      await engine.generatePantheon({
        mode: "pantheon",
        width: "wide",
        domain: "Nature",
        useAI: true,
      });

      expect(capturedPromptFocused).toContain(
        "Domain Scope: Focused Pantheon: every deity must represent a distinct aspect, sub-domain, philosophy, contradiction, or extreme interpretation of the primary domain: Nature.",
      );
      expect(capturedPromptBalanced).toContain(
        "Domain Scope: Central Theme Pantheon: create a diverse pantheon, but make Nature the central force, sacred obsession, source of crisis, or highest divine authority.",
      );
      expect(capturedPromptWide).toContain(
        "Domain Scope: Wide Mythic Pantheon: create a broad pantheon with many different divine domains, e.g. rulership, war, death, nature, craft, love, fate, trickery, knowledge, sea, sky, underworld, hearth, travel, harvest, magic, dreams, law, wilderness, art, prophecy, and other major mortal concerns. The primary domain Nature should appear as one important divine concern, but it must not dominate.",
      );
    });

    it("should fall back to local tables if AI call fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generatePantheon({
        mode: "single",
        useAI: true,
      });

      expect(res.type).toBe("character");
      expect(res.content).toContain("Deity Description");
    });
  });

  describe("session hub context", () => {
    const captureEngine = () => {
      const captured = { system: "", user: "" };
      const mockModel = {
        generateContent: vi.fn().mockImplementation((prompt: string) => {
          captured.user =
            typeof prompt === "string" ? prompt : JSON.stringify(prompt);
          return Promise.resolve({
            response: {
              text: () =>
                JSON.stringify({
                  title: "Test",
                  content: "",
                  lore: "",
                  labels: [],
                }),
            },
          });
        }),
      };
      const manager = {
        getModel: vi
          .fn()
          .mockImplementation((_a: unknown, _b: unknown, sys: unknown) => {
            captured.system =
              typeof sys === "string" ? sys : JSON.stringify(sys ?? "");
            return Promise.resolve(mockModel);
          }),
      };
      return { engine: new DefaultGeneratorEngine(manager as any), captured };
    };

    afterEach(() => {
      sessionStorage.removeItem("__codex_session_drafts");
    });

    it("injects session hub drafts into the NPC prompt", async () => {
      sessionStorage.setItem(
        "__codex_session_drafts",
        JSON.stringify([
          {
            type: "faction",
            title: "The Iron Syndicate",
            content:
              "### Operations\nA merchants' guild controlling trade routes.",
            labels: [],
            status: "draft",
          },
        ]),
      );
      const { engine, captured } = captureEngine();
      await engine.generateNPC({ useAI: true });
      expect(captured.system + captured.user).toContain("The Iron Syndicate");
    });

    it("omits session context when the hub is empty", async () => {
      const { engine, captured } = captureEngine();
      await engine.generateNPC({ useAI: true });
      expect(captured.system + captured.user).not.toContain(
        "Existing campaign elements created this session",
      );
    });
  });
});
