/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DefaultGeneratorEngine } from "./generator-engine";
import { generateHeistLocal } from "generator-engine";
import {
  BANNED_NAMES,
  NAME_BAN_PROMPT,
  generateLanguageLocal,
  tomeConfig,
  type PublicGeneratorOutput,
} from "generator-engine";
import { sessionHubStore } from "#lib/stores/session-hub.svelte.js";
import { generationInputHistoryStore } from "./generation-input-history";

function expectPromptToContain(
  generateContent: { mock: { calls: unknown[][] } },
  expected: string,
) {
  expect(generateContent.mock.calls[0]?.[0]).toContain(expected);
}

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
    it("streams model deltas while returning the parsed final NPC draft", async () => {
      const chunks = [
        '{"title":"Tomasa",',
        '"summary":"A frontier guide","content":"Bio","lore":"Secrets","labels":["npc"]}',
      ];
      mockClientManager.getModel.mockResolvedValue({
        generateContentStream: async function* () {
          for (const text of chunks) yield { type: "delta", text };
          yield { type: "complete", text: chunks.join("") };
        },
      });

      const previews: string[] = [];
      const output = await engine.generateWithPreview(
        () => engine.generateNPC({ useAI: true }),
        (text) => previews.push(text),
      );

      expect(previews).toEqual([chunks[0], chunks.join("")]);
      expect(output).toMatchObject({
        title: "Tomasa",
        content: "Bio",
        lore: "Secrets",
      });
    });

    it("keeps accumulated deltas when the terminal frame is only whitespace", async () => {
      const text = '{"title":"Tomasa","content":"Bio","lore":"Secrets"}';
      mockClientManager.getModel.mockResolvedValue({
        generateContentStream: async function* () {
          yield { type: "delta", text };
          yield { type: "complete", text: " " };
        },
      });

      const output = await engine.generateWithPreview(
        () => engine.generateNPC({ useAI: true }),
        () => {},
      );

      expect(output).toMatchObject({ title: "Tomasa", content: "Bio" });
    });

    it("falls back to a local NPC draft when streaming reports an error", async () => {
      mockClientManager.getModel.mockResolvedValue({
        generateContentStream: async function* () {
          yield { type: "error", error: "network down" };
        },
      });

      const output = await engine.generateWithPreview(
        () =>
          engine.generateNPC({
            race: "Dwarf",
            role: "Guard",
            useAI: true,
          }),
        () => {},
      );

      expect(output).toMatchObject({ aiFallback: true });
    });

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

    it("should generate 6-element table card when mode is table-card", async () => {
      const res = await engine.generateNPC({
        race: "Dwarf",
        role: "Blacksmith",
        alignment: "True Neutral",
        mode: "table-card",
        useAI: false,
      });

      expect(res.content).toContain("### The Six Elements");
      expect(res.content).toContain("- **Immediate Want**:");
      expect(res.content).toContain("- **Physical Mannerism**:");
      expect(res.content).toContain("- **Sharp Contradiction**:");
      expect(res.content).toContain("- **Relationship Hook**:");
      expect(res.content).toContain("- **Sensory Tag**:");
      expect(res.content).toContain("- **Knowledge & Secrets**:");
      expect(res.content).toContain("### Table Delivery");
      expect(res.lore).toContain("- **Immediate Want**:");
      expect(res.lore).toContain("- **Contradiction**:");
      expect(res.lore).toContain("- **Knowledge & Secrets**:");
      expect(res.labels).toContain("table-card");
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
      expectPromptToContain(
        mockModel.generateContent,
        "a ruined elven academy",
      );
      expect(res.title).toBe("Aelwen The Wise");
      expect(res.content).toBe("AI Generated Bio");
      expect(res.lore).toContain("AI Generated Stats");
      expect(res.lore).toContain("**Class / Archetype**: Wizard / Level 5");
      expect(res.lore).toContain("**Table Rating**: CR 3");
      expect(res.labels).toContain("custom-label");
      // A successful AI generation must not be flagged as a fallback (#1494).
      expect(res.aiFallback).toBeUndefined();
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
      // AI was requested but failed, so the result is flagged so the UI can
      // surface the "AI was unavailable" notice (#1494).
      expect(res.aiFallback).toBe(true);
    });

    it("should not flag aiFallback when AI is not requested", async () => {
      const res = await engine.generateNPC({
        race: "Dwarf",
        role: "Warrior",
        alignment: "Lawful Good",
        useAI: false,
      });

      expect(res.aiFallback).toBeUndefined();
      expect(mockClientManager.getModel).not.toHaveBeenCalled();
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
      expect(res.lore).toContain("At a Glance");
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
      expectPromptToContain(
        mockModel.generateContent,
        "a kingdom recovering from a succession war",
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

      expectPromptToContain(
        mockModel.generateContent,
        "Theme/Genre: Cyberpunk / Corporate",
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
      expect(fallbackRes.lore).toContain("At a Glance");
    });
  });

  describe("generateFactionRoster", () => {
    it("should generate roster details locally when useAI is false", async () => {
      const res = await engine.generateFactionRoster({
        size: "4",
        factionContext: "The Compact: a merchant guild fixing prices.",
        useAI: false,
      });

      expect(res.type).toBe("note");
      expect(res.title).toBeDefined();
      const headings = res.content.match(/^### .+$/gm) ?? [];
      expect(headings).toHaveLength(4);
      expect(res.labels).toContain("faction-roster");
      expect(res.labels).toContain("faction-roster-generator");
      expect(res.labels).toContain("imported-draft");
      // The local (no-AI) seed draft that fires on page mount for the
      // Faction -> Roster handoff must reflect the handed-over faction
      // rather than reading as generic filler (#2808 follow-up).
      expect(res.title).toContain("The Compact");
      expect(res.summary).toContain("The Compact");
    });

    it("should include the faction context in the AI prompt", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Compact's Inner Circle",
                summary: "x",
                members: [
                  { name: "Vess Marrow", role: "Quartermaster" },
                  { name: "Sister Aln", role: "True believer" },
                  { name: "Old Fritjof", role: "Recent recruit" },
                ],
                lore: "### At a Glance",
                labels: ["rpg-faction", "faction-roster"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateFactionRoster({
        factionContext: "The Compact fixes prices across three ports.",
        useAI: true,
      });

      expect(mockClientManager.getModel).toHaveBeenCalled();
      expectPromptToContain(
        mockModel.generateContent,
        "The Compact fixes prices across three ports.",
      );
      expect(res.type).toBe("note");
      expect(res.title).toBe("The Compact's Inner Circle");
      expect(res.content).toContain("### Vess Marrow — Quartermaster");
      expect(res.labels).toContain("faction-roster");
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
        "gemini-3.5-flash-lite",
        "You are an assistant that generates detailed RPG campaign elements in JSON format.",
      );
      expectPromptToContain(
        mockModel.generateContent,
        "an ancient cathedral ruin",
      );
      expectPromptToContain(mockModel.generateContent, "- **👤 Sire Name**");
      expectPromptToContain(mockModel.generateContent, "- **👤 Thrall Name**");
      expectPromptToContain(mockModel.generateContent, "- **👥 Rival Name**");
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
      expectPromptToContain(
        mockModel.generateContent,
        "### Points of Interest",
      );
      expectPromptToContain(
        mockModel.generateContent,
        "- **📍 Location Name**",
      );
      expectPromptToContain(
        mockModel.generateContent,
        "### Controlling / Important Factions",
      );
      expectPromptToContain(mockModel.generateContent, "- **👥 Faction Name**");
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

  describe("generateTome", () => {
    it("should generate tome details locally when useAI is false", async () => {
      const res = await engine.generateTome({
        theme: "Cosmic Horror",
        format: "Leather-bound Quarto",
        rarity: "Unique Original Manuscript",
        useAI: false,
      });

      expect(res.type).toBe("item");
      expect(res.title).toBeDefined();
      expect(res.content).toContain("Physical Description & Format");
      expect(res.content).toContain("Provenance & Transmission");
      expect(res.content).toContain("Contents & Revelations");
      expect(res.lore).toContain("At the Table Reference");
      expect(res.labels).toContain("tome");
      expect(res.labels).toContain("item");
    });

    it("avoids recent mystery text and records the delivered result on local and AI fallback", async () => {
      const profiles = tomeConfig.deceptionProfilesByTheme["Classic Fantasy"];
      const allowed = profiles[profiles.length - 1];
      const recentMysteries = profiles
        .slice(0, -1)
        .map((profile) => profile.deception);
      const recent = vi
        .spyOn(generationInputHistoryStore, "recent")
        .mockImplementation((generatorId) =>
          generatorId === "tome-mysteries" ? recentMysteries : [],
        );
      const record = vi.spyOn(generationInputHistoryStore, "record");

      try {
        for (const useAI of [false, true]) {
          if (useAI) {
            mockClientManager.getModel.mockRejectedValueOnce(
              new Error("AI network error"),
            );
          }
          const result = (await engine.generateTome({
            genre: "Classic Fantasy",
            useAI,
          })) as PublicGeneratorOutput;

          expect(result.tomeFacts?.deception).toBe(allowed.deception);
          expect(record).toHaveBeenLastCalledWith(
            "tome-mysteries",
            result.tomeFacts?.deception,
          );
        }
        expect(recent).toHaveBeenCalledWith("tome-mysteries");
      } finally {
        recent.mockRestore();
        record.mockRestore();
      }
    });

    it("should generate tome via AI and fall back gracefully on failure", async () => {
      mockClientManager.getModel.mockRejectedValue(
        new Error("AI network error"),
      );
      const res = await engine.generateTome({
        useAI: true,
      });

      expect(res.type).toBe("item");
      expect(res.title).toBeDefined();
      expect(res.content).toBeDefined();
    });

    it("returns the corrected second-pass tome rather than the first AI draft", async () => {
      const fullContent = [
        "### Physical Description & Format",
        "A parchment manuscript kept in a brass case.",
        "### Provenance & Transmission",
        "The temple collected this account of the rite.",
        "### Contents & Revelations",
        "The vessel rests until its clay dries in the open air.",
        "### Risks & Costs of Study",
        "The false washing rite releases the bound spirit.",
        "### Adventure Hooks",
        "1. Recover the sealed vessel before an acolyte performs the rite.",
      ].join("\n\n");
      const lore = [
        "### At the Table Reference",
        "Inspect the manuscript.",
        "### Ground Truth for the GM",
        "- **What the Book Claims**: Wash the vessel.",
        "- **The Deception / Flaw**: The censor altered the line.",
        "- **The Objective Truth**: Dry the vessel in air.",
        "- **Actionable Clue**: A marginal correction.",
        "### Connected Entities",
        "- **Author / Compiler**: A temple scribe.",
        "### Quick Checks & Mechanics",
        "- **The Failure Condition**: Washing ruptures the vessel.",
      ].join("\n\n");
      const correctedDeception =
        "A censor falsely claimed the clay vessel must be immersed in river water.";
      const response = (content: string, deception?: string) =>
        JSON.stringify({
          title: "The Vessel Manuscript",
          summary: "An altered spirit-binding rite.",
          content,
          lore,
          canonicalFacts: {
            centralRule: "Dry the vessel in open air.",
            productionMethod: "Handwritten vellum.",
            errorSource: "A censor altered the original line.",
            ...(deception ? { deception } : {}),
          },
          labels: ["tome", "item"],
          connections: [],
        });
      const generateContent = vi
        .fn()
        .mockResolvedValueOnce({
          response: {
            text: () =>
              response(
                fullContent.replace("vessel rests", "soul-forged blade rests"),
              ),
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () =>
              response(
                `${fullContent}\n\n${correctedDeception}`,
                correctedDeception,
              ),
          },
        });
      mockClientManager.getModel.mockResolvedValue({ generateContent });
      const record = vi.spyOn(generationInputHistoryStore, "record");

      try {
        const result = (await engine.generateTome({
          theme: "Classic Fantasy",
          useAI: true,
          staged: false,
        })) as PublicGeneratorOutput;

        expect(generateContent).toHaveBeenCalledTimes(2);
        expect(result.aiFallback).not.toBe(true);
        expect(result.content).toContain("The vessel rests");
        expect(result.content).not.toContain("soul-forged blade");
        expect(result.tomeFacts?.deception).toBe(correctedDeception);
        expect(record).toHaveBeenLastCalledWith(
          "tome-mysteries",
          correctedDeception,
        );
      } finally {
        record.mockRestore();
      }
    });

    it("falls back when AI tome output fails the consistency audit", async () => {
      mockClientManager.getModel.mockResolvedValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "Incomplete Tome",
                content: "Only a fragment.",
                lore: "No required table sections.",
              }),
          },
        }),
      });

      const result = await engine.generateTome({ useAI: true });

      expect(result.aiFallback).toBe(true);
      expect(result.content).toContain("### Physical Description & Format");
      expect(result.content).toContain("### Adventure Hooks");
      expect(result.lore).toContain("### Ground Truth for the GM");
    });
  });

  describe("generateHoliday", () => {
    it("generates either one observance or a coherent local calendar", async () => {
      const one = await engine.generateHoliday({
        setSize: "One observance",
        useAI: false,
      });
      const calendar = await engine.generateHoliday({
        setSize: "A calendar of 6 observances",
        useAI: false,
      });
      expect(one.type).toBe("note");
      expect(one.observances).toHaveLength(1);
      expect(calendar.observances).toHaveLength(6);
      expect(calendar.content).toContain("Calendar overview");
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

  describe("generateHeist", () => {
    const deterministicSeed = {
      premise: "A temple reliquary holds a dangerous secret.",
      stake: "The crew must extract the relic before the ward closes.",
      setting: "A mountain temple during the night vigil.",
      distinctiveElement: "The bells ring only when someone lies.",
      titleIdea: "The Bell-Silent Reliquary",
    };

    const auditJson = (verdict: "clean" | "repair" = "repair") =>
      JSON.stringify({
        verdict,
        fullScore: "Escape with the objective.",
        transitions: [
          {
            event: "The objective moves",
            stateBefore: "Objective secured",
            stateAfter: "Objective with crew",
            factsChanged: ["objective.location: secured -> with crew"],
          },
        ],
        issues:
          verdict === "repair"
            ? [
                {
                  id: "state-1",
                  sections: ["The Getaway"],
                  problem: "A later fact is stale.",
                  requiredFact: "The objective is with the crew.",
                },
              ]
            : [],
      });

    it("reviews a structurally valid heist and keeps semantic-only improvements", async () => {
      const clean = generateHeistLocal({ heistType: "Theft" });
      const json = JSON.stringify({
        title: clean.title,
        content: clean.content,
        lore: clean.lore,
        labels: ["heist", "heist-generator"],
      });
      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const generationChat = {
        sendMessageStream: vi.fn().mockResolvedValueOnce(stream(json)),
      };
      const reviewChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(auditJson()))
          .mockResolvedValueOnce(
            stream(
              JSON.stringify({
                ...JSON.parse(json),
                title: "The Reviewed Heist",
              }),
            ),
          ),
      };
      mockClientManager.getModel
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(generationChat),
        })
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(reviewChat),
        });

      const res = await engine.generateHeist({
        heistType: "Theft",
        campaignContext: "The crew owes Magistrate Sorn a favour.",
        useAI: true,
        staged: false,
        seed: deterministicSeed,
      });

      expect(generationChat.sendMessageStream).toHaveBeenCalledTimes(1);
      expect(reviewChat.sendMessageStream).toHaveBeenCalledTimes(2);
      expect(reviewChat.sendMessageStream.mock.calls[0][0]).toContain(
        "The crew owes Magistrate Sorn a favour.",
      );
      expect(res.title).toBe("The Reviewed Heist");
      expect(res.lore).toContain("### Alarm Track");
    });

    it("repairs a heist the deterministic check rejects", async () => {
      const clean = generateHeistLocal({ heistType: "Theft" });
      // The objective section under the wrong heading for the type: a break
      // that code cannot fix on its own, unlike a duplicate.
      const brokenJson = JSON.stringify({
        title: clean.title,
        content: (clean.content ?? "").replace("### The Prize", "### The Loot"),
        lore: clean.lore,
        labels: ["heist"],
      });
      const fixedJson = JSON.stringify({
        title: clean.title,
        content: clean.content,
        lore: clean.lore,
        labels: ["heist"],
      });
      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const generationChat = {
        sendMessageStream: vi.fn().mockResolvedValueOnce(stream(brokenJson)),
      };
      const reviewChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(auditJson("clean")))
          .mockResolvedValueOnce(stream(fixedJson)),
      };
      mockClientManager.getModel
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(generationChat),
        })
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(reviewChat),
        });

      const res = await engine.generateHeist({
        heistType: "Theft",
        useAI: true,
        staged: false,
        seed: deterministicSeed,
      });

      expect(generationChat.sendMessageStream).toHaveBeenCalledTimes(1);
      expect(reviewChat.sendMessageStream).toHaveBeenCalledTimes(2);
      // The audit receives deterministic findings; repair remains surgical.
      expect(reviewChat.sendMessageStream.mock.calls[0][0]).toContain(
        'must be headed "The Prize"',
      );
      expect(reviewChat.sendMessageStream.mock.calls[1][0]).toContain(
        "Do not generate a new scenario",
      );
      expect(res.content).toContain("### The Prize");
    });

    it("accepts a repair that fixes the structural break but is still long", async () => {
      const clean = generateHeistLocal({ heistType: "Theft" });
      const brokenJson = JSON.stringify({
        title: clean.title,
        content: (clean.content ?? "").replace("### The Prize", "### The Loot"),
        lore: clean.lore,
        labels: ["heist"],
      });
      // Structurally correct now, but padded past the advisory word budget —
      // a raw finding-count comparison would tie and discard this.
      const fixedButLongJson = JSON.stringify({
        title: clean.title,
        content: clean.content,
        lore: `${clean.lore}\n\n### Notes\n${"filler ".repeat(1200)}`,
        labels: ["heist"],
      });
      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const generationChat = {
        sendMessageStream: vi.fn().mockResolvedValueOnce(stream(brokenJson)),
      };
      const reviewChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(auditJson("clean")))
          .mockResolvedValueOnce(stream(fixedButLongJson)),
      };
      mockClientManager.getModel
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(generationChat),
        })
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(reviewChat),
        });

      const res = await engine.generateHeist({
        heistType: "Theft",
        useAI: true,
        staged: false,
      });

      expect(res.content).toContain("### The Prize");
      expect(res.content).not.toContain("### The Loot");
    });

    it("keeps the original when the repair turn makes it worse", async () => {
      const clean = generateHeistLocal({ heistType: "Theft" });
      const brokenJson = JSON.stringify({
        title: clean.title,
        content: (clean.content ?? "").replace("### The Prize", "### The Loot"),
        lore: clean.lore,
        labels: ["heist"],
      });
      // A "repair" that strips half the document is worse, not better.
      const worseJson = JSON.stringify({
        title: clean.title,
        content: clean.content,
        lore: "### The Getaway\nGone.",
        labels: ["heist"],
      });
      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const generationChat = {
        sendMessageStream: vi.fn().mockResolvedValueOnce(stream(brokenJson)),
      };
      const reviewChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(auditJson()))
          .mockResolvedValueOnce(stream(worseJson)),
      };
      mockClientManager.getModel
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(generationChat),
        })
        .mockResolvedValueOnce({
          startChat: vi.fn().mockReturnValue(reviewChat),
        });

      const res = await engine.generateHeist({
        heistType: "Theft",
        useAI: true,
        staged: false,
      });

      expect(res.lore).toContain("### Alarm Track");
      expect(res.lore).toContain("### Flashback Opportunities");
    });

    it("builds the heist in stages by default and reports each step", async () => {
      const validStage1 = {
        title: "The Sunstone Chalice Lift",
        summary:
          "Infiltrate the Temple Reliquary and retrieve the Sunstone Chalice before dawn prayer.",
        score:
          "Steal the Sunstone Chalice from beneath the Temple Reliquary before the bells toll dawn.",
        objective:
          "The Sunstone Chalice sits inside a consecrated alcove on the high altar floor.\n- **The catch**: Fragile — three hard impacts will crack the sacred crystal.\n- **Pressure**: Each impact advances a damage clock.",
        casing: [
          {
            label: "Entry vector",
            detail:
              "A service tunnel under the south cloister is unlocked during the midnight candle replacement shift.",
          },
          {
            label: "Known obstacle",
            detail:
              "The inner cloister gates are locked and guarded by two veteran Templars.",
          },
          {
            label: "The objective",
            detail:
              "The Sunstone Chalice rests upon an elevated dais, illuminated by eternal sacred oil lamps.",
          },
        ],
      };
      const validStage2 = {
        hiddenFactor:
          "The midnight candle attendant is actually an undercover inquisitor watching for thieves.",
        rings: {
          perimeter:
            "Templar sentries patrol the cloister courtyard. Pass by timing their lantern sweep, by wearing pilgrim vestments, or by scaling the shadowed buttress wall.",
          access:
            "A locked oak portcullis bars access to the high altar hall. Pass by picking the lever lock, by presenting stolen deacon keys, or by crawling through the service heating ducts.",
          inner:
            "The inner reliquary sanctum guards the Sunstone Chalice behind an altar cage. Pass by using the deacon's prayer phrase, by quietly lifting the brass hinges, or by dispelling the glass seal with alchemical acid.",
        },
      };
      const validStage3 = {
        quickReference:
          "- **Objective**: Steal the Sunstone Chalice.\n- **Primary obstacle**: Patrols and locked gates.\n- **Hidden factor**: Undercover inquisitor.\n- **Point of no return**: Lifting the chalice.\n- **Pressure**: Three strikes crack it.\n- **Default complication**: Early bells.\n- **Escape problem**: Service tunnel seals.",
        alarmTrack: [
          {
            level: 0,
            label: "Quiet",
            detail: "Routine prayers and silent patrols.",
          },
          {
            level: 1,
            label: "Suspicion",
            detail: "A templar notices an unlatched gate and doubles back.",
          },
          {
            level: 2,
            label: "Alert",
            detail: "Bells begin tolling and cloister gates are barred.",
          },
          {
            level: 3,
            label: "Lockdown",
            detail: "Heavy iron grates drop over courtyard arches.",
          },
          {
            level: 4,
            label: "Lethal Response",
            detail:
              "The Grand Inquisitor mobilises the elite templar strike squads to hunt the intruders.",
          },
        ],
        complications: [
          {
            label: "Early Bells (default)",
            detail:
              "The dawn prayer starts fifteen minutes earlier than scheduled.",
          },
          {
            label: "Rival Syndicate",
            detail: "A rival thief team is already working on the south gate.",
          },
          {
            label: "Holy Oil Spill",
            detail: "An overturned lantern sets the vestry curtains ablaze.",
          },
        ],
        moment:
          "Once the chalice is lifted from the altar dais, the ward dispels. A deacon checks the altar twenty minutes later.",
        getaway:
          "The south cloister tunnel remains open until the alarm bells toll. Otherwise, escape via the west bell tower ropes.\n**Pursuit**: Templar horsemen follow along the river road.",
        flashbacks: [
          "A bribed monk who left a side window unfastened.",
          "Forged deacon robes tailored for the heist.",
          "A sleep draught slipped into the kennel master's wine.",
          "A copy of the templar patrol schedule acquired last week.",
        ],
      };

      const runModel = vi
        .spyOn(
          engine as unknown as {
            runModel: (instruction: string, message: string) => Promise<string>;
          },
          "runModel",
        )
        .mockImplementation(async (_instruction, message) => {
          if (message.includes("STAGE 1 OF 3: Target, Objective & Casing")) {
            return JSON.stringify(validStage1);
          }
          if (message.includes("STAGE 2 OF 3: Three Security Rings")) {
            return JSON.stringify(validStage2);
          }
          if (message.includes("STAGE 3 OF 3: Alarm Track")) {
            return JSON.stringify(validStage3);
          }
          if (message.includes("Audit this generated tabletop RPG heist")) {
            return JSON.stringify({ verdict: "clean", issues: [] });
          }
          throw new Error(`Unexpected message: ${message.slice(0, 80)}`);
        });

      const onProgress = vi.fn();

      const res = await engine.generateHeist({
        genre: "Classic Fantasy",
        heistType: "Theft",
        targetType: "Temple Reliquary",
        targetScale: "Major",
        prize: "Sunstone Chalice",
        useAI: true,
        onProgress,
        seed: deterministicSeed,
      });

      expect(runModel).toHaveBeenCalledTimes(4);
      expect(res.title).toBe("The Sunstone Chalice Lift");
      expect(res.content).toContain("### The Prize");
      expect(res.lore).toContain("### Security Rings");
      expect(res.lore).toContain("### Alarm Track");
      expect(
        onProgress.mock.calls
          .at(-1)?.[0]
          .map((s: { status: string }) => s.status),
      ).toEqual(["done", "done", "done", "done"]);
    });
  });

  describe("generateCouncilVote", () => {
    const councilNames = ["A", "B", "C", "D", "E", "F", "G"];
    function testCouncilFoundationLore(suffix = "") {
      return `### Voting Procedure\nSimple majority, 7 seats${suffix}.\n\n### Council Members\n${councilNames
        .map(
          (name, index) =>
            `- **Councillor ${name}** (Member) — Initial stance: ${index < 4 ? "Support" : "Oppose"}. Would genuinely persuade them: a verified lasting settlement.`,
        )
        .join("\n")}`;
    }
    function testCouncilPaths(suffix = "") {
      const baseline = councilNames
        .map(
          (name, index) =>
            `- **Councillor ${name}** — ${index < 4 ? "Support" : "Oppose"} — Reason: ${index < 4 ? "keeps the original position" : "carries over unchanged"}.`,
        )
        .join("\n");
      const best = councilNames
        .map(
          (name) =>
            `- **Councillor ${name}** — Support — Reason: accepts the lasting settlement.`,
        )
        .join("\n");
      return `### Possible Paths\n#### 1. Smallest Viable Coalition\n${baseline}\nTally: Support 4, Oppose 3, Abstain 0, Undecided 0.\n#### 2. Broader Alternative\n${baseline}\nTally: Support 4, Oppose 3, Abstain 0, Undecided 0.\n#### 3. Costly Best Solution\n${best}\nTally: Support 7, Oppose 0, Abstain 0, Undecided 0.${suffix}`;
    }

    it("should generate council vote details locally when useAI is false", async () => {
      const res = await engine.generateCouncilVote({
        councilSize: "3",
        useAI: false,
      });

      expect(res.type).toBe("event");
      expect(res.content).toContain("### The Proposal");
      expect(res.lore).toContain("### Council Members");
      expect(res.labels).toContain("council-vote");
    });

    it("should run four chat turns on the same session (foundation, repair, paths, paths-repair) and merge the repaired outputs", async () => {
      const foundationJson = JSON.stringify({
        title: "The Salt Road Levy",
        content: "### The Proposal\nfoundation content (unrepaired)",
        lore: testCouncilFoundationLore(" (unrepaired)"),
        labels: ["council-vote", "political-intrigue"],
      });
      const repairedJson = JSON.stringify({
        title: "The Salt Road Levy",
        content: "### The Proposal\nfoundation content",
        lore: testCouncilFoundationLore(),
        labels: ["council-vote", "political-intrigue"],
      });
      const pathsJson = JSON.stringify({
        possiblePaths: testCouncilPaths(" (unrepaired)"),
        followUpHooks: "### Follow-Up Hooks\nthey remember (unrepaired)",
      });
      const pathsRepairedJson = JSON.stringify({
        possiblePaths: testCouncilPaths(),
        followUpHooks: "### Follow-Up Hooks\nthey remember",
      });

      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const mockChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(foundationJson))
          .mockResolvedValueOnce(stream(repairedJson))
          .mockResolvedValueOnce(stream(pathsJson))
          .mockResolvedValueOnce(stream(pathsRepairedJson)),
      };
      const mockModel = { startChat: vi.fn().mockReturnValue(mockChat) };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateCouncilVote({
        councilSize: "7",
        useAI: true,
      });

      expect(mockModel.startChat).toHaveBeenCalledTimes(1);
      expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(4);
      // The foundation repair turn must ask for a fix, not a fresh generation.
      expect(mockChat.sendMessageStream.mock.calls[1][0]).toContain(
        "proofread and repair the scenario you just wrote above",
      );
      // The paths turn must not re-embed the roster/procedure — it relies
      // on the chat session's own history for that (#2033).
      expect(mockChat.sendMessageStream.mock.calls[2][0]).toContain(
        "Treat everything already established there",
      );
      // The paths repair turn must ask for a fix, not new paths.
      expect(mockChat.sendMessageStream.mock.calls[3][0]).toContain(
        'proofread and repair the "Possible Paths" and "Follow-Up Hooks" you just wrote above',
      );
      // The merged output uses the REPAIRED foundation and REPAIRED paths.
      expect(res.title).toBe("The Salt Road Levy");
      expect(res.content).toBe("### The Proposal\nfoundation content");
      expect(res.lore).toBe(
        `${testCouncilFoundationLore()}\n\n${testCouncilPaths()}\n\n### Follow-Up Hooks\nthey remember`,
      );
      expect(res.labels).toContain("council-vote");
      expect(res.aiFallback).toBeUndefined();
    });

    it("should fall back to local tables if the chat session fails", async () => {
      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));

      const res = await engine.generateCouncilVote({
        councilSize: "3",
        useAI: true,
      });

      expect(res.aiFallback).toBe(true);
      expect(res.lore).toContain("### Council Members");
    });

    it("should keep the unrepaired foundation and paths when a repair reply is syntactically valid but empty", async () => {
      const foundationJson = JSON.stringify({
        title: "The Salt Road Levy",
        content: "### The Proposal\nfoundation content",
        lore: testCouncilFoundationLore(),
        labels: ["council-vote", "political-intrigue"],
      });
      const pathsJson = JSON.stringify({
        possiblePaths: testCouncilPaths(),
        followUpHooks: "### Follow-Up Hooks\nthey remember",
      });
      // Valid JSON, but empty of content — parseCouncilVoteFoundation and
      // parseCouncilVotePathsResponse don't throw on this; they'd normally
      // default every field to "", silently blanking a good generation if
      // adopted without a content-presence gate.
      const emptyRepair = JSON.stringify({});

      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const mockChat = {
        sendMessageStream: vi
          .fn()
          .mockResolvedValueOnce(stream(foundationJson))
          .mockResolvedValueOnce(stream(emptyRepair))
          .mockResolvedValueOnce(stream(pathsJson))
          .mockResolvedValueOnce(stream(emptyRepair)),
      };
      const mockModel = { startChat: vi.fn().mockReturnValue(mockChat) };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateCouncilVote({
        councilSize: "7",
        useAI: true,
      });

      expect(res.title).toBe("The Salt Road Levy");
      expect(res.content).toBe("### The Proposal\nfoundation content");
      expect(res.lore).toBe(
        `${testCouncilFoundationLore()}\n\n${testCouncilPaths()}\n\n### Follow-Up Hooks\nthey remember`,
      );
    });

    it("falls back to local tables when the initial foundation or paths turn is empty", async () => {
      const stream = (text: string) => ({
        stream: (async function* () {
          yield { text: () => text };
        })(),
      });
      const mockChat = {
        sendMessageStream: vi.fn().mockResolvedValueOnce(stream("{}")),
      };
      const mockModel = { startChat: vi.fn().mockReturnValue(mockChat) };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const res = await engine.generateCouncilVote({
        councilSize: "3",
        useAI: true,
      });

      expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(1);
      expect(res.aiFallback).toBe(true);
      expect(res.lore).toContain("### Council Members");
    });

    it("reports staged progress and propagates AbortError on cancellation", async () => {
      const controller = new AbortController();
      const progressCalls: unknown[] = [];
      const mockChat = {
        sendMessageStream: vi.fn(async () => {
          controller.abort();
          return {
            stream: (async function* () {
              yield { text: () => "{}" };
            })(),
          };
        }),
      };
      mockClientManager.getModel.mockResolvedValue({
        startChat: vi.fn().mockReturnValue(mockChat),
      });

      await expect(
        engine.generateCouncilVote({
          councilSize: "5",
          useAI: true,
          onProgress: (steps) => progressCalls.push(steps),
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(1);
      expect(mockChat.sendMessageStream).toHaveBeenCalledWith(
        expect.any(String),
        { signal: controller.signal },
      );
    });

    it("propagates cancellation when the signal has a non-AbortError reason", async () => {
      const controller = new AbortController();
      const cancellation = new Error("cancelled");
      const mockChat = {
        sendMessageStream: vi.fn(async () => {
          controller.abort(cancellation);
          return {
            stream: (async function* () {
              yield { text: () => "{}" };
            })(),
          };
        }),
      };
      mockClientManager.getModel.mockResolvedValue({
        startChat: vi.fn().mockReturnValue(mockChat),
      });

      await expect(
        engine.generateCouncilVote({
          councilSize: "5",
          useAI: true,
          signal: controller.signal,
        }),
      ).rejects.toBe(cancellation);
      expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateSecretSociety", () => {
    it("generates a faction locally with the requested society inputs", async () => {
      const result = await engine.generateSecretSociety({
        theme: "Cosmic Horror",
        publicFace: "Academic society",
        dangerLevel: "Supernatural threat",
        useAI: false,
      });

      expect(result.type).toBe("faction");
      expect(result.content).toContain("### Secret truth");
      expect(result.lore).toContain("**Sacred Object**");
      expect(result.labels).toContain("secret-society");
    });

    it("uses a valid AI response and falls back when the provider is unavailable", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                title: "The Glass Choir",
                summary: "A choir that hears a signal beneath the city.",
                content: "### What they believe\\nThe signal is mercy.",
                lore: "### At a Glance\\n- **Leader**: Orra Venn.",
                labels: ["cosmic-horror"],
              }),
          },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const aiResult = await engine.generateSecretSociety({ useAI: true });
      expect(aiResult.title).toBe("The Glass Choir");
      expect(aiResult.labels).toEqual(
        expect.arrayContaining(["secret-society", "cosmic-horror"]),
      );
      expect(aiResult.aiFallback).toBeUndefined();

      mockClientManager.getModel.mockRejectedValue(new Error("Network Error"));
      const fallbackResult = await engine.generateSecretSociety({
        useAI: true,
      });
      expect(fallbackResult.aiFallback).toBe(true);
      expect(fallbackResult.lore).toContain("### Follow-Up Suggestions");
    });

    it("falls back to a local draft when the AI response is malformed", async () => {
      mockClientManager.getModel.mockResolvedValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => "not valid JSON" },
        }),
      });

      const result = await engine.generateSecretSociety({ useAI: true });

      expect(result.aiFallback).toBe(true);
      expect(result.labels).toEqual(
        expect.arrayContaining(["secret-society", "imported-draft"]),
      );
      expect(result.content).toContain("### Secret truth");
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
      expectPromptToContain(
        mockModel.generateContent,
        "a corp-controlled district",
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
      expectPromptToContain(mockModel.generateContent, "a port under blockade");
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
      expectPromptToContain(mockModel.generateContent, "a succession crisis");
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
      expectPromptToContain(
        mockModel.generateContent,
        "a corp war over water rights",
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
        label: "faction roster",
        call: (e) => e.generateFactionRoster({ useAI: true }),
      },
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

      expectPromptToContain(mockModel.generateContent, "- **👤 Deity Type**");
      expectPromptToContain(
        mockModel.generateContent,
        "- **✨ Primary Domain**",
      );
      expectPromptToContain(mockModel.generateContent, "- **👥 Worshippers**");
      expectPromptToContain(
        mockModel.generateContent,
        "- **📍 Sacred Symbol**",
      );
      expectPromptToContain(mockModel.generateContent, "- **📅 Secret**");
      expectPromptToContain(
        mockModel.generateContent,
        "- **⚔ Immediate Hook**",
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

  describe("generateLanguage", () => {
    it("keeps parseable AI output when only advisory quality issues remain", async () => {
      const language = generateLanguageLocal(
        {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Compound Words",
        },
        () => 0.42,
      );
      const raw = JSON.stringify({
        version: language.languageProfileVersion,
        title: language.title,
        summary: language.summary,
        labels: language.labels,
        profile: language.languageProfile,
      });
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => raw },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const result = await engine.generateLanguage({
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Compound Words",
        useAI: true,
      });

      expect(mockModel.generateContent).toHaveBeenCalledTimes(2);
      expect(result.title).toBe(language.title);
      expect(result.aiFallback).toBeUndefined();
    });

    it("applies two targeted AI-quality repairs before local fallback", async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => "{}" },
        }),
      };
      mockClientManager.getModel.mockResolvedValue(mockModel);

      const result = await engine.generateLanguage({
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Sacred / Ritual Tongue",
        structure: "Compound Words",
        useAI: true,
      });

      expect(mockModel.generateContent).toHaveBeenCalledTimes(3);
      expect(mockModel.generateContent.mock.calls[0][0]).toMatchObject({
        generationConfig: {
          temperature: 0.35,
          topP: 0.8,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      });
      expect(
        JSON.stringify(mockModel.generateContent.mock.calls[1][0]),
      ).toContain("Repair the following language-generator response");
      expect(
        JSON.stringify(mockModel.generateContent.mock.calls[2][0]),
      ).toContain("Repair the following language-generator response");
      expect(result.content).toContain("## Pronunciation & Phonology");
      expect(result.aiFallback).toBe(true);
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
      sessionHubStore.clear();
      sessionStorage.removeItem("SESSION_DRAFTS");
    });

    it("injects session hub drafts into the NPC prompt", async () => {
      sessionHubStore.entities = [
        {
          id: "test-id",
          type: "faction",
          title: "The Iron Syndicate",
          summary: "",
          content:
            "### Operations\nA merchants' guild controlling trade routes.",
          labels: [],
          status: "draft",
          reuseEnabled: true,
          pinned: false,
          createdOrder: 1,
        },
      ];
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
