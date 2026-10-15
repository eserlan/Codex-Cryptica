import { describe, it, expect } from "vitest";
import { getGenerator } from "../src/campaign-generator-registry";
import type {
  GeneratorRunRequest,
  GeneratorOutput,
} from "../src/campaign-generator-types";

describe("Tales of the Valiant Creature Generation (US2)", () => {
  const creatureGen = getGenerator("creature")!;

  it("registers gameSystem option on the creature generator", () => {
    expect(creatureGen).toBeDefined();
    const gameSystemOpt = creatureGen.options.find(
      (o) => o.id === "gameSystem",
    );
    expect(gameSystemOpt).toBeDefined();
    expect(gameSystemOpt!.control).toBe("select");
    expect(gameSystemOpt!.choices).toEqual(
      expect.arrayContaining([
        { value: "system-neutral", label: "System Neutral" },
        { value: "tales-of-the-valiant", label: "Tales of the Valiant" },
      ]),
    );
  });

  it("generates system-neutral prompt by default without ToV mechanics instructions", () => {
    const request: GeneratorRunRequest = {
      generatorId: "creature",
      options: { category: "Beast", threatLevel: "Dangerous" },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = creatureGen.buildPrompt(request);
    expect(prompt).not.toContain(
      "GAME SYSTEM RULES LAYER: Tales of the Valiant",
    );
    expect(prompt).not.toContain("tov-creature");
  });

  it("injects BFRD creature rules when gameSystem is tales-of-the-valiant", () => {
    const request: GeneratorRunRequest = {
      generatorId: "creature",
      options: {
        category: "Monstrosity",
        threatLevel: "Deadly",
        gameSystem: "tales-of-the-valiant",
      },
      useAI: true,
      themeId: "fantasy",
    };

    const prompt = creatureGen.buildPrompt(request);
    expect(prompt).toContain("GAME SYSTEM RULES LAYER: Tales of the Valiant");
    expect(prompt).toContain("tov-creature");
    expect(prompt).toContain("Black Flag Reference Document");
    expect(prompt).toContain("Doom");
  });

  it("maps output with creature mechanics to draft with builtin-tov-monster stat sheet", () => {
    const output: GeneratorOutput = {
      title: "Cinder Drake",
      summary: "A serpentine predator breathing volcanic ash.",
      lore: "Native to the magma rifts of Mount Balor.",
      labels: ["creature", "dragon", "tales-of-the-valiant"],
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-creature",
        isHomebrew: false,
        data: {
          size: "Large",
          creatureType: "Dragon",
          alignment: "chaotic neutral",
          cr: "4",
          proficiencyBonus: 2,
          doom: 2,
          ac: 15,
          acDetails: "natural armor",
          hp: 68,
          hitDice: "8d10+24",
          speed: "30 ft., fly 60 ft.",
          abilityScores: {
            str: 17,
            dex: 14,
            con: 16,
            int: 8,
            wis: 12,
            cha: 10,
          },
          saveProficiencies: ["dex", "con"],
          skillProficiencies: ["Perception", "Stealth"],
          damageImmunities: ["fire"],
          senses: "darkvision 60 ft., passive Perception 13",
          languages: "Draconic",
          traits: [
            {
              name: "Heated Body",
              description:
                "A creature that touches the drake takes 1d6 fire damage.",
            },
          ],
          actions: [
            {
              name: "Bite",
              attackFormula: "1d20+5",
              damageFormula: "1d10+3",
              description:
                "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.",
            },
            {
              name: "Cinder Breath (Recharge 5-6)",
              description:
                "Exhales superheated ash in a 15-foot cone. DC 13 DEX save, 4d6 fire damage.",
            },
          ],
          reactions: [
            {
              name: "Tail Swipe",
              description: "Swipes at a creature that moves behind it.",
            },
          ],
          isHomebrew: false,
        },
      },
    };

    const request: GeneratorRunRequest = {
      generatorId: "creature",
      options: { gameSystem: "tales-of-the-valiant" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = creatureGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBe("tales-of-the-valiant");
    expect(draft.mechanics).toBeDefined();
    expect(draft.statSheet).toBeDefined();
    expect(draft.statSheet!.templateId).toBe("builtin-tov-monster");

    const fields = Object.fromEntries(
      draft.statSheet!.fields.map((f) => [f.id, f]),
    );
    expect(getField(fields, "size").value).toBe("Large");
    expect(getField(fields, "creature_type").value).toBe("Dragon");
    expect(getField(fields, "cr").value).toBe("4");
    expect(getField(fields, "proficiency_bonus").value).toBe(2);
    expect(getField(fields, "doom").value).toBe(2);
    expect(getField(fields, "ac").value).toBe(15);
    expect(getField(fields, "hp").value).toBe(68);

    // Math check: STR 17 (+3), DEX 14 (+2), CON 16 (+3)
    expect(getField(fields, "str_score").value).toBe(17);
    expect(getField(fields, "dex_save").formula).toBe("1d20+4"); // DEX 2 + PB 2
    expect(getField(fields, "con_save").formula).toBe("1d20+5"); // CON 3 + PB 2
    expect(getField(fields, "str_save").formula).toBe("1d20+3"); // STR 3, non-proficient

    // Actions & Reactions
    expect(getField(fields, "actions").rows!.length).toBe(2);
    expect(getField(fields, "actions").rows![0].name).toBe("Bite");
    expect(getField(fields, "actions").rows![0].attack).toBe("1d20+5");
    expect(getField(fields, "actions").rows![0].damage).toBe("1d10+3");
    expect(getField(fields, "reactions").rows!.length).toBe(1);
  });

  it("leaves statSheet undefined when creature is system neutral", () => {
    const output: GeneratorOutput = {
      title: "Marsh Stalker",
      summary: "A camouflaged swamp crawler.",
      lore: "Hides beneath murky water.",
      labels: ["creature", "beast"],
    };

    const request: GeneratorRunRequest = {
      generatorId: "creature",
      options: { category: "Beast" },
      useAI: true,
      themeId: "fantasy",
    };

    const draft = creatureGen.mapOutputToDraft(output, request);
    expect(draft.systemId).toBeUndefined();
    expect(draft.mechanics).toBeUndefined();
    expect(draft.statSheet).toBeUndefined();
  });
});

function getField<T>(fields: Record<string, T>, id: string): T {
  if (!(id in fields)) throw new Error(`Expected mapped field ${id}`);
  return fields[id]!;
}
