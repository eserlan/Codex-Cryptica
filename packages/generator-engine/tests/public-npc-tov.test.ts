import { describe, it, expect } from "vitest";
import { getGenerator } from "../src/campaign-generator-registry";
import type {
  GeneratorRunRequest,
  GeneratorOutput,
} from "../src/campaign-generator-types";

describe("Tales of the Valiant NPC Generation (US1)", () => {
  const npcGen = getGenerator("npc")!;

  it("registers gameSystem and dependent npcDetail options on the npc generator", () => {
    expect(npcGen).toBeDefined();
    const gameSystemOpt = npcGen.options.find((o) => o.id === "gameSystem");
    expect(gameSystemOpt).toBeDefined();
    expect(gameSystemOpt?.control).toBe("select");
    expect(gameSystemOpt?.choices).toEqual(
      expect.arrayContaining([
        { value: "system-neutral", label: "System Neutral" },
        { value: "tales-of-the-valiant", label: "Tales of the Valiant" },
      ]),
    );

    const npcDetailOpt = npcGen.options.find((o) => o.id === "npcDetail");
    expect(npcDetailOpt).toBeDefined();
    expect(npcDetailOpt?.control).toBe("select");
    expect(npcDetailOpt?.visibleWhen).toEqual({
      optionId: "gameSystem",
      values: ["tales-of-the-valiant"],
    });
    expect(npcDetailOpt?.choices).toEqual(
      expect.arrayContaining([
        { value: "quick", label: "Quick NPC (CR-based)" },
        { value: "leveled", label: "Leveled Character (Hero / Companion)" },
      ]),
    );
  });

  it("generates system-neutral prompt by default without ToV mechanics block", () => {
    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: { race: "Human", role: "Merchant" },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = npcGen.buildPrompt(request);
    expect(prompt).not.toContain(
      "GAME SYSTEM RULES LAYER: Tales of the Valiant",
    );
    expect(prompt).not.toContain("tov-quick-npc");
  });

  it("injects Quick NPC ToV rules when gameSystem is tales-of-the-valiant (default detail)", () => {
    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: {
        race: "Human",
        role: "Guard",
        gameSystem: "tales-of-the-valiant",
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = npcGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("tov-quick-npc");
    expect(prompt).toContain("Black Flag Reference Document");
  });

  it("injects Leveled Character ToV rules when npcDetail is leveled", () => {
    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: {
        race: "Elf",
        role: "Ranger",
        gameSystem: "tales-of-the-valiant",
        npcDetail: "leveled",
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = npcGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("tov-character");
    expect(prompt).toContain("Lineage");
    expect(prompt).toContain("Heritage");
  });

  it("maps output with Quick NPC mechanics to draft with builtin-tov-npc stat sheet", () => {
    const output: GeneratorOutput = {
      title: "Watch Captain Arin",
      summary: "A stalwart veteran watch captain.",
      lore: "Arin has guarded the north gate for twenty winters.",
      labels: ["Human", "Guard", "tales-of-the-valiant"],
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-quick-npc",
        isHomebrew: false,
        data: {
          cr: "1/2",
          ac: 14,
          hp: 22,
          hitDice: "3d8+6",
          speed: "30 ft.",
          attackName: "Longsword",
          attackBonus: 4,
          attackFormula: "1d20+4",
          damageFormula: "1d8+2",
          damageType: "slashing",
          luck: 1,
          abilityScores: {
            str: 14,
            dex: 12,
            con: 14,
            int: 10,
            wis: 12,
            cha: 10,
          },
          keySaves: ["STR +4", "CON +4"],
          keySkills: ["Athletics +4", "Perception +3"],
          notes: "Armed with a longsword and shield.",
          isHomebrew: false,
        },
      },
    };

    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: { gameSystem: "tales-of-the-valiant" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = npcGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBe("tales-of-the-valiant");
    expect(draft.mechanics).toBeDefined();
    expect(draft.statSheet).toBeDefined();
    expect(draft.statSheet?.templateId).toBe("builtin-tov-npc");

    const fields = Object.fromEntries(
      draft.statSheet!.fields.map((f) => [f.id, f]),
    );
    expect(fields.hp?.value).toBe(22);
    expect(fields.ac?.value).toBe(14);
    expect(fields.atk?.formula).toBe("1d20+4");
  });

  it("maps output with Leveled Character mechanics to draft with builtin-tov-character stat sheet", () => {
    const output: GeneratorOutput = {
      title: "Theron Nightbreeze",
      summary: "An elven spellblade wandering the hinterlands.",
      lore: "Theron was cast out of the High Court for delving into forgotten ruins.",
      labels: ["Elf", "Mage", "tales-of-the-valiant"],
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-character",
        isHomebrew: false,
        data: {
          lineage: "Elf",
          heritage: "High Elf",
          background: "Courtier",
          className: "Wizard",
          subclass: "War Mage",
          level: 4,
          proficiencyBonus: 2,
          ac: 13,
          hp: 26,
          hitDice: "4d6+8",
          speed: "30 ft.",
          luck: 2,
          abilityScores: {
            str: 8,
            dex: 14,
            con: 14,
            int: 16,
            wis: 12,
            cha: 10,
          },
          saveProficiencies: ["int", "wis"],
          skillProficiencies: ["Arcana", "History"],
          attacks: [
            {
              name: "Quarterstaff",
              attackFormula: "1d20+1",
              damageFormula: "1d6-1",
              type: "bludgeoning",
            },
          ],
          talents: ["School Specialisation"],
          features: ["Arcane Recovery"],
          lineageTraits: ["Trance", "Keen Senses"],
          isHomebrew: false,
        },
      },
    };

    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: { gameSystem: "tales-of-the-valiant", npcDetail: "leveled" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = npcGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBe("tales-of-the-valiant");
    expect(draft.mechanics).toBeDefined();
    expect(draft.statSheet).toBeDefined();
    expect(draft.statSheet?.templateId).toBe("builtin-tov-character");

    const fields = Object.fromEntries(
      draft.statSheet!.fields.map((f) => [f.id, f]),
    );
    expect(fields.lineage?.value).toBe("Elf");
    expect(fields.class?.value).toBe("Wizard (War Mage)");
    expect(fields.level?.value).toBe(4);
    expect(fields.int_score?.value).toBe(16);
    expect(fields.int_save?.formula).toBe("1d20+5"); // 3 + 2 (PB)
  });

  it("leaves statSheet undefined when system neutral", () => {
    const output: GeneratorOutput = {
      title: "Bob the Baker",
      summary: "A cheerful village baker.",
      lore: "Bakes bread every dawn.",
      labels: ["Human", "Commoner"],
    };

    const request: GeneratorRunRequest = {
      generatorId: "npc",
      options: { race: "Human", role: "Commoner" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = npcGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBeUndefined();
    expect(draft.mechanics).toBeUndefined();
    expect(draft.statSheet).toBeUndefined();
  });
});
