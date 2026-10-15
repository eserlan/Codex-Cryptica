import { describe, it, expect } from "vitest";
import {
  mapTovMechanicsToStatSheet,
  type TovGeneratorBundle,
} from "../src/rules-sources/tov-generator-mapping";
import {
  TOV_NPC_TEMPLATE_ID,
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
} from "../src/rules-sources/tov-templates";

describe("mapTovMechanicsToStatSheet", () => {
  it("maps TovQuickNpcMechanics to builtin-tov-npc stat sheet", () => {
    const bundle: TovGeneratorBundle = {
      kind: "tov-quick-npc",
      data: {
        cr: "2",
        ac: 15,
        hp: 35,
        hitDice: "5d8+10",
        speed: "30 ft.",
        attackName: "Shortsword",
        attackBonus: 4,
        attackFormula: "1d20+4",
        damageFormula: "1d6+2",
        damageType: "piercing",
        luck: 2,
        abilityScores: {
          str: 12,
          dex: 14,
          con: 14,
          int: 10,
          wis: 11,
          cha: 9,
        },
        keySaves: ["DEX +4"],
        keySkills: ["Stealth +4", "Perception +2"],
        notes: "Keen senses, speaks Common and Elvish.",
      },
    };

    const sheet = mapTovMechanicsToStatSheet(bundle);
    expect(sheet).not.toBeNull();
    expect(sheet?.templateId).toBe(TOV_NPC_TEMPLATE_ID);

    const fieldsById = Object.fromEntries(sheet!.fields.map((f) => [f.id, f]));

    expect(fieldsById.hp?.value).toBe(35);
    expect(fieldsById.hp?.max).toBe(100);
    expect(fieldsById.ac?.value).toBe(15);
    expect(fieldsById.luck?.value).toBe(2);
    expect(fieldsById.atk?.formula).toBe("1d20+4");
    expect(fieldsById.damage?.formula).toBe("1d6+2");
    expect(typeof fieldsById.notes?.value).toBe("string");
    expect(fieldsById.notes?.value).toContain("CR 2");
    expect(fieldsById.notes?.value).toContain("Shortsword");
  });

  it("maps TovCharacterMechanics to builtin-tov-character stat sheet", () => {
    const bundle: TovGeneratorBundle = {
      kind: "tov-character",
      data: {
        lineage: "Elf",
        heritage: "Sylvan",
        background: "Wanderer",
        className: "Rogue",
        subclass: "Thief",
        level: 3,
        proficiencyBonus: 2,
        ac: 14,
        hp: 24,
        hitDice: "3d8+6",
        speed: "35 ft.",
        luck: 3,
        abilityScores: {
          str: 10,
          dex: 16,
          con: 14,
          int: 12,
          wis: 12,
          cha: 8,
        },
        saveProficiencies: ["dex", "int"],
        skillProficiencies: ["Stealth", "Acrobatics"],
        attacks: [
          {
            name: "Rapier",
            attackFormula: "1d20+5",
            damageFormula: "1d8+3",
            type: "piercing",
            description: "Finesse",
          },
        ],
        talents: ["Combat Casting", "Fleet of Foot"],
        features: ["Sneak Attack (2d6)", "Cunning Action"],
        lineageTraits: ["Darkvision 60 ft.", "Fey Ancestry"],
      },
    };

    const sheet = mapTovMechanicsToStatSheet(bundle);
    expect(sheet).not.toBeNull();
    expect(sheet?.templateId).toBe(TOV_CHARACTER_TEMPLATE_ID);

    const fieldsById = Object.fromEntries(sheet!.fields.map((f) => [f.id, f]));

    expect(fieldsById.lineage?.value).toBe("Elf");
    expect(fieldsById.heritage?.value).toBe("Sylvan");
    expect(fieldsById.background?.value).toBe("Wanderer");
    expect(fieldsById.class?.value).toBe("Rogue (Thief)");
    expect(fieldsById.level?.value).toBe(3);
    expect(fieldsById.proficiency_bonus?.value).toBe(2);

    expect(fieldsById.hp?.value).toBe(24);
    expect(fieldsById.ac?.value).toBe(14);
    expect(fieldsById.luck?.value).toBe(3);

    expect(fieldsById.dex_score?.value).toBe(16);
    expect(fieldsById.dex?.formula).toBe("1d20+3");
    expect(fieldsById.dex_save?.formula).toBe("1d20+5"); // 3 (dex) + 2 (PB)
    expect(fieldsById.str_save?.formula).toBe("1d20+0"); // 0 (str), not proficient
    expect(fieldsById.cha_save?.formula).toBe("1d20-1"); // -1 (cha), not proficient

    expect(fieldsById.attacks?.rows?.length).toBe(1);
    expect(fieldsById.attacks?.rows?.[0]?.name).toBe("Rapier");
    expect(fieldsById.attacks?.rows?.[0]?.attack).toBe("1d20+5");
    expect(fieldsById.attacks?.rows?.[0]?.damage).toBe("1d8+3");

    expect(fieldsById.talents?.value).toContain("Combat Casting");
    expect(fieldsById.features?.value).toContain("Sneak Attack");
    expect(fieldsById.lineage_traits?.value).toContain("Fey Ancestry");
  });

  it("maps TovCreatureMechanics to builtin-tov-monster stat sheet", () => {
    const bundle: TovGeneratorBundle = {
      kind: "tov-creature",
      data: {
        size: "Large",
        creatureType: "Monstrosity",
        subtype: "Titan",
        alignment: "neutral evil",
        cr: "5",
        proficiencyBonus: 3,
        doom: 1,
        ac: 15,
        acDetails: "natural armor",
        hp: 85,
        hitDice: "10d10+30",
        speed: "40 ft.",
        abilityScores: {
          str: 18,
          dex: 12,
          con: 16,
          int: 6,
          wis: 13,
          cha: 7,
        },
        saveProficiencies: ["str", "con"],
        skillProficiencies: ["Athletics", "Perception"],
        damageResistances: ["cold", "fire"],
        damageImmunities: ["poison"],
        conditionImmunities: ["poisoned"],
        senses: "darkvision 60 ft., passive Perception 14",
        languages: "Giant",
        traits: [
          {
            name: "Blood Frenzy",
            description:
              "Advantage on melee attacks against creatures that don't have full HP.",
          },
        ],
        actions: [
          {
            name: "Slam",
            attackFormula: "1d20+7",
            damageFormula: "2d8+4",
            description:
              "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 13 (2d8+4) bludgeoning.",
          },
        ],
        bonusActions: [
          {
            name: "Aggressive Rush",
            description: "Move up to speed toward a hostile creature.",
          },
        ],
        reactions: [
          {
            name: "Parry",
            description: "Adds +3 to AC against one melee attack.",
          },
        ],
        legendaryActions: [
          {
            name: "Swipe",
            cost: 1,
            description: "Makes one slam attack.",
          },
        ],
      },
    };

    const sheet = mapTovMechanicsToStatSheet(bundle);
    expect(sheet).not.toBeNull();
    expect(sheet?.templateId).toBe(TOV_MONSTER_TEMPLATE_ID);

    const fieldsById = Object.fromEntries(sheet!.fields.map((f) => [f.id, f]));

    expect(fieldsById.size?.value).toBe("Large");
    expect(fieldsById.creature_type?.value).toBe("Monstrosity");
    expect(fieldsById.subtype?.value).toBe("Titan");
    expect(fieldsById.cr?.value).toBe("5");
    expect(fieldsById.proficiency_bonus?.value).toBe(3);
    expect(fieldsById.doom?.value).toBe(1);

    expect(fieldsById.ac?.value).toBe(15);
    expect(fieldsById.ac_details?.value).toBe("natural armor");
    expect(fieldsById.hp?.value).toBe(85);
    expect(fieldsById.hp?.max).toBe(200);

    // Ability scores & saves
    expect(fieldsById.str_score?.value).toBe(18);
    expect(fieldsById.str_save?.formula).toBe("1d20+7"); // 4 (str) + 3 (PB)
    expect(fieldsById.dex_save?.formula).toBe("1d20+1"); // 1 (dex), not proficient

    // Defences
    expect(fieldsById.damage_resistances?.value).toBe("cold, fire");
    expect(fieldsById.damage_immunities?.value).toBe("poison");
    expect(fieldsById.condition_immunities?.value).toBe("poisoned");
    expect(fieldsById.senses?.value).toBe(
      "darkvision 60 ft., passive Perception 14",
    );
    expect(fieldsById.languages?.value).toBe("Giant");

    // Traits & Actions
    expect(fieldsById.traits?.value).toContain("Blood Frenzy");
    expect(fieldsById.actions?.rows?.length).toBe(1);
    expect(fieldsById.actions?.rows?.[0]?.name).toBe("Slam");
    expect(fieldsById.actions?.rows?.[0]?.attack).toBe("1d20+7");
    expect(fieldsById.actions?.rows?.[0]?.damage).toBe("2d8+4");

    expect(fieldsById.bonus_actions?.rows?.length).toBe(1);
    expect(fieldsById.reactions?.rows?.length).toBe(1);
    expect(fieldsById.legendary_actions?.rows?.length).toBe(1);
  });

  it("returns null for unsupported bundle kinds", () => {
    const magicItemBundle: TovGeneratorBundle = {
      kind: "tov-magic-item",
    };
    expect(mapTovMechanicsToStatSheet(magicItemBundle)).toBeNull();

    const unknownBundle = {
      kind: "unknown-system",
    } as unknown as TovGeneratorBundle;
    expect(mapTovMechanicsToStatSheet(unknownBundle)).toBeNull();
  });
});
