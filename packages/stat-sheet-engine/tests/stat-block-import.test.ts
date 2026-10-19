// fallow-ignore-file complexity
import { describe, expect, it } from "vitest";
import {
  detectStatBlockSystem,
  importStatBlock,
  parseDnd5eJson,
  parsePf2eJson,
  parseMythrasJson,
  parseVtmJson,
  parseTextStatBlock,
  parseTovJson,
} from "../src/stat-block";
import {
  TOV_HERO_LEVEL_1_FIXTURE,
  TOV_CAVE_GOBLIN_FIXTURE,
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
} from "../src";

describe("Stat Block Import Pipeline", () => {
  describe("detectStatBlockSystem", () => {
    it("detects Pathbuilder 2e export JSON", () => {
      expect(
        detectStatBlockSystem({ build: { character: { name: "Valeros" } } }),
      ).toBe("pf2e");
    });

    it("detects Foundry VTT actor JSON for D&D 5e and PF2e", () => {
      expect(
        detectStatBlockSystem({
          system: { attributes: { hp: { value: 20 }, ac: { value: 15 } } },
        }),
      ).toBe("dnd5e");

      expect(
        detectStatBlockSystem({
          system: {
            attributes: {
              hp: { value: 20 },
              ac: { value: 15 },
              perception: { value: 5 },
            },
          },
        }),
      ).toBe("pf2e");
    });

    it("detects 5e.tools / MonsterLabs JSON format", () => {
      expect(
        detectStatBlockSystem({
          name: "Young Red Dragon",
          str: 23,
          dex: 10,
          con: 21,
          hp: 178,
        }),
      ).toBe("dnd5e");
    });

    it("detects Tales of the Valiant when luck points or doom are present", () => {
      expect(
        detectStatBlockSystem({
          name: "Valiant Hero",
          str: 16,
          dex: 14,
          con: 14,
          hp: 32,
          luck: 3,
        }),
      ).toBe("tales-of-the-valiant");
    });

    it("detects Foundry VTT Black Flag actor exports by flags and attributes while keeping 5e intact (#3945)", () => {
      // 1. By flags
      expect(
        detectStatBlockSystem({
          flags: { "black-flag": {} },
          system: { attributes: { hp: { value: 12 }, ac: { value: 16 } } },
        }),
      ).toBe("tales-of-the-valiant");

      // 2. By Luck in attributes
      expect(
        detectStatBlockSystem({
          system: {
            attributes: {
              hp: { value: 12 },
              ac: { value: 16 },
              luck: { value: 3 },
            },
          },
        }),
      ).toBe("tales-of-the-valiant");

      // 3. By Lineage/Heritage in details
      expect(
        detectStatBlockSystem({
          system: {
            attributes: { hp: { value: 12 }, ac: { value: 16 } },
            details: { lineage: "Human", heritage: "Cloudborn" },
          },
        }),
      ).toBe("tales-of-the-valiant");

      // 4. Ordinary 5e actor without Black Flag signatures remains dnd5e
      expect(
        detectStatBlockSystem({
          system: {
            attributes: { hp: { value: 12 }, ac: { value: 16 } },
            details: { race: "Human", alignment: "Neutral" },
          },
        }),
      ).toBe("dnd5e");
    });

    it("detects GURPS structures and attributes", () => {
      expect(
        detectStatBlockSystem({
          attributes: [{ attr_id: "ST", calc: { value: 14 } }],
        }),
      ).toBe("gurps");
    });

    it("imports GCS JSON attributes and calculated resources instead of D&D defaults", () => {
      const result = importStatBlock({
        name: "GCS Adventurer",
        attributes: [
          { attr_id: "ST", calc: { value: 14 } },
          { attr_id: "DX", calc: { value: 12 } },
          { attr_id: "IQ", calc: { value: 11 } },
          { attr_id: "HT", calc: { value: 13 } },
        ],
        calc: {
          hp: { value: 15 },
          fp: { value: 12 },
          basic_speed: { value: 6.25 },
          move: { value: 5 },
        },
      });

      expect(result.ir.system).toBe("gurps");
      expect(result.ir.attributes.st.value).toBe(14);
      expect(result.ir.attributes.dx.value).toBe(12);
      expect(result.ir.vitals.find((v) => v.id === "hp")?.current).toBe(15);
      expect(result.ir.vitals.find((v) => v.id === "fp")?.current).toBe(12);
      expect(result.fields.find((field) => field.id === "st")?.value).toBe(14);
      expect(
        result.fields.find((field) => field.id === "basic_speed")?.value,
      ).toBe(6.25);
      expect(result.fields.find((field) => field.id === "move")?.value).toBe(5);
      expect(
        result.fields.find((field) => field.id === "str_score"),
      ).toBeUndefined();
    });

    it("detects Mythras and BRP hit locations", () => {
      expect(
        detectStatBlockSystem({
          hit_locations: [{ location: "Head", ap: 4, hp: 5 }],
          pow: 12,
          siz: 15,
        }),
      ).toBe("mythras");
    });

    it("detects Vampire: The Masquerade / WoD characters", () => {
      expect(
        detectStatBlockSystem({
          name: "Julian",
          hunger: 2,
          blood_potency: 1,
          disciplines: [{ name: "Celerity", dots: 3 }],
        }),
      ).toBe("vtm");
    });

    it("detects system from raw text snippets", () => {
      expect(
        detectStatBlockSystem(
          "Ogre\nLarge giant, chaotic evil\nArmor Class 11 (hide armor)\nHit Points 59 (7d10 + 21)\nSpeed 40 ft.\nSTR 19 (+4) DEX 8 (-1) CON 16 (+3)\nChallenge 2",
        ),
      ).toBe("dnd5e");

      expect(
        detectStatBlockSystem(
          "Goblin Warrior\nPerception +5; darkvision\nFortitude +7, Reflex +8, Will +3\nStride 25 feet; Strike +8 melee (dogslicer)",
        ),
      ).toBe("pf2e");

      expect(
        detectStatBlockSystem(
          "Desert Raider\nAction Points: 3, Luck Points: 2\nHit Locations: Head (1-3) 4 AP / 5 HP\n1d100 Combat Style 65%",
        ),
      ).toBe("mythras");

      expect(
        detectStatBlockSystem(
          "Vampire Ancilla\nClan: Ventrue, Humanity: 6\nHunger: 2, Blood Potency: 2\nDisciplines: Dominate 3, Fortitude 2",
        ),
      ).toBe("vtm");

      expect(
        detectStatBlockSystem(
          "Veteran Trooper\nST [13] DX [12] IQ [10] HT [11]\nBasic Speed 5.75, Fatigue 11, Thrust 1d, Swing 2d-1",
        ),
      ).toBe("gurps");

      expect(
        detectStatBlockSystem("Just some plain notes with no stats."),
      ).toBe("generic");
    });
  });

  describe("parseDnd5eJson", () => {
    it("parses 5e / MonsterLabs monster JSON into StatBlockIR", () => {
      const input = {
        name: "Cave Bear",
        size: "Large",
        type: "beast",
        alignment: "unaligned",
        cr: "2",
        ac: { value: 12, details: "natural armor" },
        hp: { average: 42, formula: "4d10+20" },
        speed: { walk: 40, climb: 30 },
        str: 20,
        dex: 10,
        con: 16,
        int: 2,
        wis: 13,
        cha: 7,
        actions: [
          {
            name: "Multiattack",
            desc: "The bear makes two attacks: one with its bite and one with its claws.",
          },
          {
            name: "Bite",
            desc: "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (1d8 + 5) piercing damage.",
            attack_bonus: 7,
            damage_dice: "1d8+5",
          },
        ],
      };

      const ir = parseDnd5eJson(input);

      expect(ir.identity.name).toBe("Cave Bear");
      expect(ir.identity.size).toBe("Large");
      expect(ir.identity.ancestryOrType).toBe("beast");
      expect(ir.identity.levelOrCr).toBe("2");
      expect(ir.vitals[0].current).toBe(42);
      expect(ir.vitals[0].sublabel).toBe("4d10+20");
      expect(ir.defences.armorRating).toBe(12);
      expect(ir.defences.armorDetails).toBe("natural armor");
      expect(ir.defences.speed).toContain("40 ft.");
      expect(ir.attributes.str.value).toBe(20);
      expect(ir.attributes.str.modifier).toBe(5);
      expect(ir.attributes.dex.modifier).toBe(0);
      expect(ir.actionsAndAttacks).toHaveLength(2);
      expect(ir.actionsAndAttacks[1].name).toBe("Bite");
      expect(ir.actionsAndAttacks[1].attackDice).toBe("1d20+7");
      expect(ir.actionsAndAttacks[1].damageDice).toBe("1d8+5");
    });
  });

  describe("parsePf2eJson", () => {
    it("parses Pathbuilder 2e build export JSON", () => {
      const input = {
        build: {
          character: {
            name: "Valeros",
            ancestry: "Human",
            class: "Fighter",
            level: 1,
          },
          abilities: {
            str: 18,
            dex: 14,
            con: 14,
            int: 10,
            wis: 12,
            cha: 10,
          },
          attributes: {
            hp: 20,
          },
          ac: { value: 18 },
          saves: {
            fortitude: 7,
            reflex: 7,
            will: 4,
          },
          perception: 6,
          weapons: [
            {
              name: "Longsword",
              bonus: 9,
              damage: "1d8+4",
            },
          ],
        },
      };

      const ir = parsePf2eJson(input);
      expect(ir.system).toBe("pf2e");
      expect(ir.identity.name).toBe("Valeros");
      expect(ir.identity.classOrRole).toBe("Fighter");
      expect(ir.vitals[0].current).toBe(20);
      expect(ir.defences.armorRating).toBe(18);
      expect(ir.attributes.str.value).toBe(18);
      expect(ir.attributes.str.modifier).toBe(4);
      expect(ir.defences.secondaryDefences?.fortitude).toBe(7);
      expect(ir.defences.secondaryDefences?.reflex).toBe(7);
      expect(ir.defences.secondaryDefences?.will).toBe(4);
      expect(ir.actionsAndAttacks[0].name).toBe("Longsword");
      expect(ir.actionsAndAttacks[0].attackDice).toBe("1d20+9");
    });

    it("parses Foundry VTT PF2e actor structure", () => {
      const input = {
        name: "Kyra",
        system: {
          details: {
            level: { value: 2 },
            ancestry: { name: "Human" },
            class: { name: "Cleric" },
          },
          abilities: {
            str: { value: 14, mod: 2 },
            dex: { value: 12, mod: 1 },
            con: { value: 14, mod: 2 },
            int: { value: 10, mod: 0 },
            wis: { value: 18, mod: 4 },
            cha: { value: 14, mod: 2 },
          },
          attributes: {
            hp: { value: 28, max: 28 },
            ac: { value: 17 },
            perception: { value: 8 },
          },
          saves: {
            fortitude: { value: 8 },
            reflex: { value: 5 },
            will: { value: 10 },
          },
        },
      };

      const ir = parsePf2eJson(input);
      expect(ir.identity.name).toBe("Kyra");
      expect(ir.attributes.wis.value).toBe(18);
      expect(ir.attributes.wis.modifier).toBe(4);
      expect(ir.defences.armorRating).toBe(17);
      expect(ir.defences.secondaryDefences?.will).toBe(10);
    });
  });

  describe("parseMythrasJson", () => {
    it("parses Mythras character/creature JSON including hit locations", () => {
      const input = {
        name: "Spartan Hoplite",
        category: "character",
        str: 15,
        con: 14,
        siz: 15,
        dex: 13,
        int: 12,
        pow: 11,
        cha: 10,
        ap: 3,
        hp: 15,
        mp: 11,
        lp: 2,
        hit_locations: [
          { location: "Head (1-3)", ap: 6, hp: 5 },
          { location: "Chest (4-6)", ap: 6, hp: 7 },
          { location: "Abdomen (7-9)", ap: 6, hp: 6 },
          { location: "Right Arm (10-12)", ap: 4, hp: 4 },
          { location: "Left Arm (13-15)", ap: 4, hp: 4 },
          { location: "Right Leg (16-18)", ap: 5, hp: 5 },
          { location: "Left Leg (19-20)", ap: 5, hp: 5 },
        ],
        damage_mod: "+1d2",
        move: 6,
      };

      const ir = parseMythrasJson(input);
      expect(ir.system).toBe("mythras");
      expect(ir.identity.name).toBe("Spartan Hoplite");
      expect(ir.attributes.siz.value).toBe(15);
      expect(ir.vitals.find((v) => v.id === "ap")?.current).toBe(3);
      expect(ir.vitals.find((v) => v.id === "lp")?.current).toBe(2);
      expect(ir.defences.secondaryDefences?.loc_head_ap).toBe(6);
      expect(ir.defences.secondaryDefences?.loc_chest_hp).toBe(7);
      expect(ir.defences.secondaryDefences?.loc_rarm_ap).toBe(4);
      expect(ir.defences.secondaryDefences?.damage_mod).toBe("+1d2");
    });
  });

  describe("parseVtmJson", () => {
    it("parses Vampire: The Masquerade JSON into StatBlockIR", () => {
      const input = {
        name: "Marcus Cole",
        clan: "Brujah",
        hunger: 2,
        humanity: 7,
        willpower: 6,
        blood_potency: 1,
        strength: 4,
        dexterity: 3,
        stamina: 3,
        charisma: 2,
        manipulation: 2,
        composure: 3,
        intelligence: 2,
        wits: 3,
        resolve: 3,
        disciplines: [
          { name: "Potence", dots: 2 },
          { name: "Celerity", dots: 1 },
        ],
      };

      const ir = parseVtmJson(input);
      expect(ir.system).toBe("vtm");
      expect(ir.identity.name).toBe("Marcus Cole");
      expect(ir.identity.ancestryOrType).toBe("Brujah");
      expect(ir.vitals.find((v) => v.id === "blood")?.current).toBe(2);
      expect(ir.vitals.find((v) => v.id === "willpower")?.current).toBe(6);
      expect(ir.attributes.strength.value).toBe(4);
      expect(ir.traitsAndFeatures).toHaveLength(2);
      expect(ir.traitsAndFeatures[0].name).toBe("Potence 2");
    });
  });

  describe("parseTextStatBlock", () => {
    it("parses unstructured text block from PDF or wiki copy-paste", () => {
      const text = `
Goblin Boss
Small humanoid (goblinoid), neutral evil
Armor Class 17 (chain shirt, shield)
Hit Points 21 (6d6)
Speed 30 ft.
STR 10 (+0) DEX 14 (+2) CON 10 (+0) INT 10 (+0) WIS 8 (-1) CHA 10 (+0)
Skills Stealth +6
Senses darkvision 60 ft., passive Perception 9
Languages Common, Goblin
Challenge 1 (200 XP)

Actions
Multiattack. The goblin makes two attacks with its scimitar.
Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.
Javelin. Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.
      `;

      const ir = parseTextStatBlock(text);

      expect(ir.identity.name).toBe("Goblin Boss");
      expect(ir.identity.size).toBe("Small");
      expect(ir.identity.ancestryOrType).toBe("humanoid (goblinoid)");
      expect(ir.identity.levelOrCr).toBe("1");
      expect(ir.defences.armorRating).toBe(17);
      expect(ir.defences.armorDetails).toBe("chain shirt, shield");
      expect(ir.vitals[0].current).toBe(21);
      expect(ir.vitals[0].sublabel).toBe("6d6");
      expect(ir.attributes.dex.value).toBe(14);
      expect(ir.attributes.dex.modifier).toBe(2);
      expect(ir.actionsAndAttacks.length).toBeGreaterThanOrEqual(2);

      const scimitar = ir.actionsAndAttacks.find((a) => a.name === "Scimitar");
      expect(scimitar).toBeDefined();
      expect(scimitar?.attackDice).toBe("1d20+4");
      expect(scimitar?.damageDice).toBe("1d6+2");
      expect(scimitar?.reachOrRange).toBe("reach 5 ft.");
    });

    it("parses Pathfinder 2e text block with perception and saves", () => {
      const text = `
Orc Warrior
Perception +5; darkvision
Fortitude +7, Reflex +5, Will +3
HP 23; AC 16
Speed 25 feet
Str +4, Dex +1, Con +3, Int -1, Wis +1, Cha -1
Melee Strike +7, Damage 1d12+4 slashing
      `;

      const ir = parseTextStatBlock(text);
      expect(ir.system).toBe("pf2e");
      expect(ir.identity.name).toBe("Orc Warrior");
      expect(ir.defences.armorRating).toBe(16);
      expect(ir.vitals[0].current).toBe(23);
      expect(ir.attributes.str.modifier).toBe(4);
      expect(ir.defences.secondaryDefences?.fortitude).toBe(7);
      expect(ir.defences.secondaryDefences?.reflex).toBe(5);
      expect(ir.defences.secondaryDefences?.will).toBe(3);
      expect(ir.actionsAndAttacks[0].attackDice).toBe("1d20+7");
    });

    it("parses Mythras text block with characteristics and hit locations", () => {
      const text = `
Nomad Warrior
Action Points: 3, Luck Points: 2, Magic Points: 10
Hit Points: 14, Movement 6, Damage Modifier +1d2
STR 13, CON 12, SIZ 14, DEX 11, INT 10, POW 10, CHA 9
Hit Locations:
Head 4 AP / 5 HP
Chest 5 AP / 7 HP
Abdomen 5 AP / 6 HP
Right Arm 3 AP / 4 HP
Left Arm 3 AP / 4 HP
Right Leg 4 AP / 5 HP
Left Leg 4 AP / 5 HP
1d100 Combat Style 60%
      `;

      const ir = parseTextStatBlock(text);
      expect(ir.system).toBe("mythras");
      expect(ir.identity.name).toBe("Nomad Warrior");
      expect(ir.attributes.str.value).toBe(13);
      expect(ir.vitals.find((v) => v.id === "ap")?.current).toBe(3);
      expect(ir.vitals.find((v) => v.id === "lp")?.current).toBe(2);
      expect(ir.defences.secondaryDefences?.loc_head_ap).toBe(4);
      expect(ir.defences.secondaryDefences?.loc_chest_hp).toBe(7);
    });

    it("parses Vampire: The Masquerade text block", () => {
      const text = `
Victoria Ash
Clan: Toreador, Humanity: 7
Hunger: 1, Blood Potency: 2, Willpower: 8
Strength 2, Dexterity 4, Stamina 2
Charisma 5, Manipulation 4, Composure 4
Intelligence 3, Wits 4, Resolve 3
Disciplines: Presence 4, Celerity 3, Auspex 2
      `;

      const ir = parseTextStatBlock(text);
      expect(ir.system).toBe("vtm");
      expect(ir.identity.name).toBe("Victoria Ash");
      expect(ir.identity.ancestryOrType).toBe("Toreador");
      expect(ir.vitals.find((v) => v.id === "blood")?.current).toBe(1);
      expect(ir.vitals.find((v) => v.id === "willpower")?.current).toBe(8);
      expect(ir.attributes.charisma.value).toBe(5);
      expect(ir.traitsAndFeatures).toHaveLength(3);
      expect(ir.traitsAndFeatures[0].name).toContain("Presence");
    });
  });

  describe("mapIrToStatSheet", () => {
    it("maps 5e monster IR to builtin-dnd5e-monster with stable field IDs (#2873)", () => {
      const input = {
        name: "Minotaur",
        size: "Large",
        type: "monstrosity",
        alignment: "chaotic evil",
        cr: "3",
        ac: 14,
        hp: 76,
        str: 18,
        dex: 11,
        con: 16,
        int: 6,
        wis: 16,
        cha: 9,
        actions: [
          {
            name: "Greataxe",
            desc: "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.",
            attack_bonus: 6,
            damage_dice: "2d12+4",
          },
        ],
      };

      const result = importStatBlock(input);

      expect(result.targetTemplateId).toBe("builtin-dnd5e-monster");
      expect(result.fields).toBeDefined();

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("size")?.value).toBe("Large");
      expect(fieldMap.get("creature_type")?.value).toBe("monstrosity");
      expect(fieldMap.get("cr")?.value).toBe("3");
      expect(fieldMap.get("ac")?.value).toBe(14);
      expect(fieldMap.get("hp")?.value).toBe(76);
      expect(fieldMap.get("str_score")?.value).toBe(18);

      const actionsField = fieldMap.get("actions");
      expect(actionsField?.type).toBe("item-table");
      expect(actionsField?.rows).toHaveLength(1);
      expect(actionsField?.rows?.[0].name).toBe("Greataxe");
      expect(actionsField?.rows?.[0].attack).toBe("1d20+6");
      expect(actionsField?.rows?.[0].damage).toBe("2d12+4");
    });

    it("maps each D&D action category into its matching template field", () => {
      const result = importStatBlock({
        name: "Test Monster",
        str: 10,
        dex: 10,
        con: 10,
        hp: 10,
        actions: [{ name: "Claw", attack_bonus: 3 }],
        bonus_actions: [{ name: "Pounce", attack_bonus: 4 }],
        reactions: [{ name: "Parry", attack_bonus: 5 }],
        legendary_actions: [{ name: "Tail Swipe", attack_bonus: 6 }],
      });

      const fieldMap = new Map(result.fields.map((field) => [field.id, field]));
      expect(fieldMap.get("actions")?.rows?.[0].name).toBe("Claw");
      expect(fieldMap.get("bonus_actions")?.rows?.[0].name).toBe("Pounce");
      expect(fieldMap.get("reactions")?.rows?.[0].name).toBe("Parry");
      expect(fieldMap.get("legendary_actions")?.rows?.[0].name).toBe(
        "Tail Swipe",
      );
    });

    it("maps character category input to builtin-dnd-character with ability checks", () => {
      const input = {
        name: "Elven Ranger",
        category: "character",
        str: 12,
        dex: 18,
        con: 14,
        int: 10,
        wis: 16,
        cha: 8,
        hp: 35,
        ac: 16,
        actions: [
          {
            name: "Longbow",
            attack_bonus: 8,
            damage_dice: "1d8+4",
          },
        ],
      };

      const result = importStatBlock(input, { category: "character" });

      expect(result.targetTemplateId).toBe("builtin-dnd-character");
      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("hp")?.value).toBe(35);
      expect(fieldMap.get("ac")?.value).toBe(16);
      expect(fieldMap.get("dex_score")?.value).toBe(18);

      // DEX check derives from dex_score
      const dexCheck = fieldMap.get("dex");
      expect(dexCheck?.type).toBe("dice");
      expect(dexCheck?.formula).toBe("1d20+4");
      expect(dexCheck?.modifierSource).toBe("dex_score");
    });

    it("maps Pathfinder 2e IR to builtin-pathfinder-character", () => {
      const input = {
        build: {
          character: { name: "Amiri", class: "Barbarian" },
          abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
          attributes: { hp: 24 },
          ac: 17,
          saves: { fortitude: 8, reflex: 5, will: 4 },
          perception: 6,
          weapons: [{ name: "Bastard Sword", bonus: 9, damage: "1d12+4" }],
        },
      };

      const result = importStatBlock(input);
      expect(result.targetTemplateId).toBe("builtin-pathfinder-character");

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("hp")).toMatchObject({ value: 24 });
      expect(fieldMap.get("ac")).toMatchObject({ value: 17 });
      expect(fieldMap.get("str_score")).toMatchObject({ value: 18 });
      // Fortitude +8 with CON 16: the +3 tracks the score, the +5 stays.
      expect(fieldMap.get("fort")).toMatchObject({
        type: "dice",
        formula: "1d20+5+3",
        modifierSource: "con_score",
      });
      expect(fieldMap.get("reflex")).toMatchObject({
        formula: "1d20+3+2",
        modifierSource: "dex_score",
      });
      expect(fieldMap.get("will")).toMatchObject({
        formula: "1d20+3+1",
        modifierSource: "wis_score",
      });
      expect(fieldMap.get("atk")).toMatchObject({ formula: "1d20+9" });
      expect(fieldMap.get("perception")).toMatchObject({
        formula: "1d20+5+1",
        modifierSource: "wis_score",
      });
    });

    it("maps Mythras character IR to builtin-mythras-character", () => {
      const input = {
        name: "Gladiator",
        category: "character",
        str: 16,
        con: 14,
        siz: 16,
        dex: 12,
        int: 10,
        pow: 10,
        cha: 11,
        ap: 3,
        lp: 2,
        hp: 15,
        hit_locations: [
          { location: "Head", ap: 4, hp: 5 },
          { location: "Chest", ap: 5, hp: 7 },
        ],
        damage_mod: "+1d4",
      };

      const result = importStatBlock(input, { category: "character" });
      expect(result.targetTemplateId).toBe("builtin-mythras-character");

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("str")?.value).toBe(16);
      expect(fieldMap.get("ap")?.value).toBe(3);
      expect(fieldMap.get("lp")?.value).toBe(2);
      expect(fieldMap.get("loc_head_ap")?.value).toBe(4);
      expect(fieldMap.get("loc_chest_hp")?.value).toBe(7);
      expect(fieldMap.get("damage_mod")).toMatchObject({
        type: "text",
        value: "+1d4",
      });
      expect(fieldMap.get("d100_check")?.formula).toBe("1d100");
    });

    it("maps Mythras creature IR to builtin-mythras-npc", () => {
      const input = {
        name: "Manticore",
        category: "creature",
        str: 24,
        con: 16,
        siz: 22,
        dex: 14,
        int: 8,
        pow: 12,
        cha: 6,
        ap: 3,
        hp: 19,
        hit_locations: [{ location: "Head", ap: 3, hp: 6 }],
        attacks: [{ name: "Tail Spike", damage: "1d8" }],
      };

      const result = importStatBlock(input, { category: "creature" });
      expect(result.targetTemplateId).toBe("builtin-mythras-npc");

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("str")?.value).toBe(24);
      expect(fieldMap.get("loc_head_ap")?.value).toBe(3);
      expect(fieldMap.get("attacks")?.value).toContain("Tail Spike");
    });

    it("maps Vampire: The Masquerade IR to builtin-vampire-character", () => {
      const input = {
        name: "Helena",
        clan: "Toreador",
        hunger: 3,
        humanity: 6,
        willpower: 7,
        strength: 2,
        dexterity: 4,
        stamina: 3,
        charisma: 5,
        manipulation: 4,
        composure: 3,
        intelligence: 3,
        wits: 4,
        resolve: 3,
        disciplines: [{ name: "Presence", dots: 4 }],
      };

      const result = importStatBlock(input);
      expect(result.targetTemplateId).toBe("builtin-vampire-character");

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("willpower")?.value).toBe(7);
      expect(fieldMap.get("blood")?.value).toBe(3);
      expect(fieldMap.get("humanity")?.value).toBe(6);
      expect(fieldMap.get("charisma")?.value).toBe(5);
      expect(fieldMap.get("disciplines")?.value).toContain("Presence 4");
    });

    it("synthesizes dynamic template for unsupported systems like GURPS", () => {
      const text = `
Dungeon Delver
ST [14] DX [13] IQ [11] HT [12]
Basic Speed 6.25, Fatigue 12, Hit Points 15
Broadsword. 3d6<=14. 2d+1 cut damage.
      `;

      const result = importStatBlock(text, { systemHint: "gurps" });

      expect(result.targetTemplateId).toContain("synthesized-gurps");
      expect(result.synthesizedTemplate).toBeDefined();
      expect(result.synthesizedTemplate?.name).toBe("GURPS Import Template");
      expect(
        result.synthesizedTemplate?.fields.some((f) => f.id === "st"),
      ).toBe(true);

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("st")?.value).toBe(14);
      expect(fieldMap.get("dx")?.value).toBe(13);
      expect(fieldMap.get("hp")?.value).toBe(15);
    });

    it("uses a stable synthesized template ID for repeat imports of the same system/category", () => {
      const input =
        "Veteran Trooper\nST [13] DX [12] IQ [10] HT [11]\nBasic Speed 5.75, Fatigue 11";
      const first = importStatBlock(input, { systemHint: "gurps" });
      const second = importStatBlock(input, { systemHint: "gurps" });

      expect(second.targetTemplateId).toBe(first.targetTemplateId);
      expect(second.synthesizedTemplate?.id).toBe(
        first.synthesizedTemplate?.id,
      );
    });
  });

  describe("Tales of the Valiant / Black Flag Import Pipeline (#3944, #3945)", () => {
    it("imports TOV_HERO_LEVEL_1_FIXTURE to builtin-tov-character with Luck, Lineage, and rollable attacks", () => {
      const result = importStatBlock(TOV_HERO_LEVEL_1_FIXTURE);

      expect(result.ir.system).toBe("tales-of-the-valiant");
      expect(result.targetTemplateId).toBe(TOV_CHARACTER_TEMPLATE_ID);

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));

      // Identity & Lineage
      expect(fieldMap.get("lineage")?.value).toBe("Human");
      expect(fieldMap.get("heritage")?.value).toBe("Cloudborn");
      expect(fieldMap.get("background")?.value).toBe("Soldier");
      expect(fieldMap.get("class")?.value).toBe("Fighter");
      expect(fieldMap.get("level")?.value).toBe(1);

      // Vitals & Luck
      expect(fieldMap.get("hp")?.value).toBe(12);
      expect(fieldMap.get("ac")?.value).toBe(16);
      expect(fieldMap.get("speed")?.value).toBe("30 ft");
      expect(fieldMap.get("luck")?.value).toBe(3);

      // Ability scores
      expect(fieldMap.get("str_score")?.value).toBe(16);
      expect(fieldMap.get("dex_score")?.value).toBe(14);
      expect(fieldMap.get("con_score")?.value).toBe(14);
      expect(fieldMap.get("int_score")?.value).toBe(10);
      expect(fieldMap.get("wis_score")?.value).toBe(12);
      expect(fieldMap.get("cha_score")?.value).toBe(8);

      // Saves with modifierSource. A proficient save keeps its bonus as its
      // own term, so the sheet's derived STR modifier cannot overwrite it.
      expect(fieldMap.get("str_save")?.formula).toBe("1d20+2+3");
      expect(fieldMap.get("str_save")?.modifierSource).toBe("str_score");
      // A proficient skill keeps its bonus the same way; a plain check is
      // just the derived modifier.
      expect(fieldMap.get("athletics")?.formula).toBe("1d20+2+3");
      expect(fieldMap.get("str")?.formula).toBe("1d20+3");
      expect(fieldMap.get("dex_save")?.formula).toBe("1d20+2");

      // Attacks item table
      const attacksField = fieldMap.get("attacks");
      expect(attacksField?.type).toBe("item-table");
      expect(attacksField?.rows).toHaveLength(2);
      expect(attacksField?.rows?.[0]?.name).toBe("Longsword");
      expect(attacksField?.rows?.[0]?.attack).toBe("1d20+5");
      expect(attacksField?.rows?.[0]?.damage).toBe("1d8+3");
      expect(attacksField?.rows?.[1]?.name).toBe("Heavy Crossbow");
      expect(attacksField?.rows?.[1]?.attack).toBe("1d20+4");
      expect(attacksField?.rows?.[1]?.damage).toBe("1d10+2");

      // Features
      expect(fieldMap.get("features")?.value).toContain(
        "Fighting Style: Defense",
      );
      expect(fieldMap.get("features")?.value).toContain("Second Wind");
    });

    it("imports TOV_CAVE_GOBLIN_FIXTURE to builtin-tov-monster with CR, defences, and actions", () => {
      const result = importStatBlock(TOV_CAVE_GOBLIN_FIXTURE);

      expect(result.ir.system).toBe("tales-of-the-valiant");
      expect(result.targetTemplateId).toBe(TOV_MONSTER_TEMPLATE_ID);

      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));

      // Identity & CR
      expect(fieldMap.get("size")?.value).toBe("Small");
      expect(fieldMap.get("creature_type")?.value).toBe("Humanoid (Goblinoid)");
      expect(fieldMap.get("cr")?.value).toBe("1/4");

      // Defences
      expect(fieldMap.get("ac")?.value).toBe(13);
      expect(fieldMap.get("hp")?.value).toBe(7);

      // Actions item table
      const actionsField = fieldMap.get("actions");
      expect(actionsField?.type).toBe("item-table");
      expect(actionsField?.rows).toHaveLength(2);
      expect(actionsField?.rows?.[0]?.name).toBe("Scimitar");
      expect(actionsField?.rows?.[0]?.attack).toBe("1d20+4");
      expect(actionsField?.rows?.[0]?.damage).toBe("1d6+2");

      // Bonus actions
      const bonusField = fieldMap.get("bonus_actions");
      expect(bonusField?.type).toBe("item-table");
      expect(bonusField?.rows).toHaveLength(1);
      expect(bonusField?.rows?.[0]?.name).toBe("Nimble Escape");
    });

    it("maps parsed damage and condition defences to the monster template", () => {
      const result = importStatBlock(
        {
          name: "Ash Warden",
          category: "creature",
          hp: 30,
          ac: 15,
          vulnerabilities: ["cold"],
          damageResistances: ["fire", "lightning"],
          immunities: ["poison"],
          conditionImmunities: ["poisoned", "frightened"],
        },
        { systemHint: "tales-of-the-valiant", category: "creature" },
      );

      const fieldMap = new Map(result.fields.map((field) => [field.id, field]));
      expect(fieldMap.get("damage_vulnerabilities")?.value).toBe("cold");
      expect(fieldMap.get("damage_resistances")?.value).toBe("fire, lightning");
      expect(fieldMap.get("damage_immunities")?.value).toBe("poison");
      expect(fieldMap.get("condition_immunities")?.value).toBe(
        "poisoned, frightened",
      );
    });

    it("uses Foundry weapon formulas and actor modifiers without inventing missing rolls", () => {
      const result = importStatBlock(
        {
          name: "Foundry Warden",
          flags: { "black-flag": {} },
          system: {
            attributes: { hp: { value: 20 }, ac: { value: 14 }, prof: 2 },
            abilities: { str: { value: 16, mod: 3 } },
          },
          items: [
            {
              name: "Warhammer",
              type: "weapon",
              system: {
                proficient: true,
                attack: { ability: "str", bonus: 1 },
                damage: { parts: [["1d8 + @mod", "bludgeoning"]] },
              },
            },
            { name: "Unspecified Knife", type: "weapon", system: {} },
            {
              name: "Unresolved Knife",
              type: "weapon",
              system: { attack: { ability: "str", bonus: 1 } },
            },
          ],
        },
        { systemHint: "tales-of-the-valiant" },
      );

      expect(result.ir.actionsAndAttacks[0]).toMatchObject({
        name: "Warhammer",
        attackDice: "1d20+6",
        damageDice: "1d8 + 3",
      });
      expect(result.ir.actionsAndAttacks[1]).toMatchObject({
        name: "Unspecified Knife",
      });
      expect(result.ir.actionsAndAttacks[1]?.attackDice).toBeUndefined();
      expect(result.ir.actionsAndAttacks[1]?.damageDice).toBeUndefined();
      expect(result.ir.actionsAndAttacks[2]?.attackDice).toBeUndefined();
    });

    it("does not map roll fields when a Foundry NPC weapon has unresolved formulas", () => {
      const result = importStatBlock(
        {
          name: "Sparse Foundry NPC",
          flags: { "black-flag": {} },
          system: { attributes: { hp: { value: 10 }, ac: { value: 12 } } },
          items: [{ name: "Unspecified Knife", type: "weapon", system: {} }],
        },
        { systemHint: "tales-of-the-valiant", category: "npc" },
      );

      const fieldIds = result.fields.map((field) => field.id);
      expect(fieldIds).not.toContain("atk");
      expect(fieldIds).not.toContain("damage");
    });

    it("does not combine partial roll formulas from separate NPC actions", () => {
      const result = importStatBlock(
        {
          name: "Split Roll NPC",
          category: "npc",
          hp: 10,
          ac: 12,
          attacks: [
            { name: "Claw", attackFormula: "1d20+4" },
            { name: "Bite", damageFormula: "1d6+2" },
          ],
        },
        { systemHint: "tales-of-the-valiant", category: "npc" },
      );

      const fieldMap = new Map(result.fields.map((field) => [field.id, field]));
      expect(fieldMap.get("atk")?.formula).toBe("1d20+4");
      expect(fieldMap.has("damage")).toBe(false);
    });

    it("imports lightweight ToV NPC input to builtin-tov-npc", () => {
      const npcInput = {
        name: "Village Informant",
        category: "npc",
        hp: 15,
        ac: 12,
        luck: 2,
        attacks: [
          { name: "Dagger", attackFormula: "1d20+4", damageFormula: "1d4+2" },
        ],
        traits: [
          { name: "Streetwise", description: "Knows the local alleys." },
        ],
      };

      const result = importStatBlock(npcInput, {
        systemHint: "tales-of-the-valiant",
        category: "npc",
      });

      expect(result.targetTemplateId).toBe(TOV_NPC_TEMPLATE_ID);
      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("hp")?.value).toBe(15);
      expect(fieldMap.get("ac")?.value).toBe(12);
      expect(fieldMap.get("luck")?.value).toBe(2);
      expect(fieldMap.get("atk")?.formula).toBe("1d20+4");
      expect(fieldMap.get("damage")?.formula).toBe("1d4+2");
      expect(fieldMap.get("notes")?.value).toContain("Streetwise");
    });

    it("keeps an imported Luck cap instead of a guessed constant", () => {
      const result = importStatBlock(
        {
          name: "Lucky Rogue",
          category: "npc",
          hp: 9,
          luck: { value: 2, max: 7 },
        },
        { systemHint: "tales-of-the-valiant", category: "npc" },
      );
      const luck = result.fields.find((f) => f.id === "luck");
      expect(luck?.value).toBe(2);
      expect(luck?.max).toBe(7);
    });

    it("allows manual target template override when user specifies a different template", () => {
      const result = importStatBlock(TOV_HERO_LEVEL_1_FIXTURE, {
        targetTemplateId: "builtin-dnd-character",
      });

      expect(result.targetTemplateId).toBe("builtin-dnd-character");
      const fieldMap = new Map(result.fields.map((f) => [f.id, f]));
      expect(fieldMap.get("hp")?.value).toBe(12);
      expect(fieldMap.get("ac")?.value).toBe(16);
    });

    it("parses ToV raw text block with Lineage, Heritage, and Luck Points", () => {
      const text = `
Aric of the Cloudborn
Medium Human (Cloudborn), Soldier, Fighter 1
Armor Class 16
Hit Points 12 (1d10)
Speed 30 ft
Luck Points: 3
STR 16 (+3) DEX 14 (+2) CON 14 (+2) INT 10 (+0) WIS 12 (+1) CHA 8 (-1)
Longsword. Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d8+3 slashing.
`;
      const detected = detectStatBlockSystem(text);
      expect(detected).toBe("tales-of-the-valiant");

      const result = importStatBlock(text, {
        systemHint: "tales-of-the-valiant",
        category: "character",
      });
      expect(result.targetTemplateId).toBe(TOV_CHARACTER_TEMPLATE_ID);
    });
  });

  describe("Negative and failure paths", () => {
    it("throws descriptive error when input is neither string nor object", () => {
      expect(() => importStatBlock(null)).toThrow(/Invalid stat block input/);
      expect(() => importStatBlock(12345)).toThrow(/Invalid stat block input/);
    });

    it("gracefully falls back when text is minimal or missing headers", () => {
      const ir = parseTextStatBlock("Nameless Entity");
      expect(ir.identity.name).toBe("Nameless Entity");
      expect(ir.vitals[0].current).toBe(10);
      expect(ir.defences.armorRating).toBe(10);
      expect(ir.attributes.str.value).toBe(10);
    });

    it("handles empty or sparse JSON inputs gracefully across all systems", () => {
      const pfIr = parsePf2eJson({});
      expect(pfIr.identity.name).toBe("Unnamed Pathfinder Hero");
      expect(pfIr.vitals[0].current).toBe(10);

      const mythIr = parseMythrasJson({});
      expect(mythIr.identity.name).toBe("Unnamed Mythras Being");
      expect(mythIr.attributes.str.value).toBe(10);

      const vtmIr = parseVtmJson({});
      expect(vtmIr.identity.name).toBe("Unnamed Kindred");
      expect(vtmIr.vitals.find((v) => v.id === "blood")?.current).toBe(1);

      const tovIr = parseTovJson({});
      expect(tovIr.identity.name).toBe("Unnamed ToV Entity");
      expect(tovIr.vitals[0].current).toBe(10);
    });
  });
});
