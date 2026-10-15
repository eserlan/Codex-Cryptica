import { TOV_SYSTEM_ID } from "schema";

export type TovPromptKind =
  "npc-quick" | "npc-leveled" | "creature" | "magic-item";

/**
 * Builds the mandatory Tales of the Valiant (BFRD) rules layer prompt instructions
 * to be appended to generator prompts when gameSystem === "tales-of-the-valiant".
 */
export function buildTovPromptInstructions(kind: TovPromptKind): string {
  const commonHeader = `GAME SYSTEM RULES LAYER: Tales of the Valiant (BFRD)
You MUST generate an accompanying mechanical rules block under the \`mechanics\` key in your JSON response.
Rules constraints:
1. All rules content MUST strictly follow the Black Flag Reference Document (BFRD) / Tales of the Valiant standards under CC BY 4.0.
2. DO NOT use proprietary or trademarked terms from D&D 5e or non-open Kobold Press books. Use BFRD equivalents (e.g. Lineage and Heritage instead of Race, Talents instead of Feats, Luck instead of Inspiration, Doom for creatures).
3. All attack and damage rolls MUST be formatted as valid dice expressions (e.g. "1d20+5", "2d6+3", "1d10+2").
4. If you invent any bespoke ability, action, or trait not found in standard BFRD monster/character baselines, set \`isHomebrew: true\` on that entry.
5. Provide realistic ability scores, proficiency bonus, AC, HP with hit dice, and saves appropriate for the Challenge Rating or Level.`;

  switch (kind) {
    case "npc-quick":
      return `${commonHeader}

Under \`mechanics\`, provide a Quick NPC block:
"mechanics": {
  "systemId": "${TOV_SYSTEM_ID}",
  "kind": "tov-quick-npc",
  "isHomebrew": false,
  "data": {
    "cr": "string (e.g. '1/2', '3')",
    "ac": number,
    "hp": number,
    "hitDice": "string (e.g. '4d8+4')",
    "speed": "string (e.g. '30 ft.')",
    "attackName": "string",
    "attackBonus": number,
    "attackFormula": "string (e.g. '1d20+4')",
    "damageFormula": "string (e.g. '1d6+2')",
    "damageType": "string",
    "luck": number (0-5),
    "abilityScores": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
    "keySaves": ["string (e.g. 'DEX +4')"],
    "keySkills": ["string (e.g. 'Stealth +4')"],
    "notes": "string summary of senses, languages, and quirks",
    "isHomebrew": false
  }
}`;

    case "npc-leveled":
      return `${commonHeader}

Under \`mechanics\`, provide a full Leveled Character block:
"mechanics": {
  "systemId": "${TOV_SYSTEM_ID}",
  "kind": "tov-character",
  "isHomebrew": false,
  "data": {
    "lineage": "string",
    "heritage": "string",
    "background": "string",
    "className": "string",
    "subclass": "string (optional)",
    "level": number (1-20),
    "proficiencyBonus": number,
    "ac": number,
    "hp": number,
    "hitDice": "string",
    "speed": "string",
    "luck": number (0-5),
    "abilityScores": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
    "saveProficiencies": ["str", "dex", "con", "int", "wis", "cha"],
    "skillProficiencies": ["string"],
    "attacks": [
      {
        "name": "string",
        "attackFormula": "1d20+X",
        "damageFormula": "XdY+Z",
        "type": "string",
        "description": "string"
      }
    ],
    "talents": ["string"],
    "features": ["string"],
    "lineageTraits": ["string"],
    "isHomebrew": false
  }
}`;

    case "creature":
      return `${commonHeader}

Under \`mechanics\`, provide a full Creature/Monster block:
"mechanics": {
  "systemId": "${TOV_SYSTEM_ID}",
  "kind": "tov-creature",
  "isHomebrew": false,
  "data": {
    "size": "Tiny | Small | Medium | Large | Huge | Gargantuan",
    "creatureType": "string",
    "subtype": "string (optional)",
    "alignment": "string",
    "cr": "string",
    "proficiencyBonus": number,
    "doom": number (0-10),
    "ac": number,
    "acDetails": "string (e.g. 'natural armor')",
    "hp": number,
    "hitDice": "string (e.g. '8d10+16')",
    "speed": "string",
    "abilityScores": { "str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10 },
    "saveProficiencies": ["str", "dex", "con", "int", "wis", "cha"],
    "skillProficiencies": ["string"],
    "damageVulnerabilities": ["string"],
    "damageResistances": ["string"],
    "damageImmunities": ["string"],
    "conditionImmunities": ["string"],
    "senses": "string",
    "languages": "string",
    "traits": [{ "name": "string", "description": "string", "isHomebrew": false }],
    "actions": [
      {
        "name": "string",
        "attackFormula": "1d20+X",
        "damageFormula": "XdY+Z",
        "description": "string",
        "isHomebrew": false
      }
    ],
    "bonusActions": [{ "name": "string", "description": "string" }],
    "reactions": [{ "name": "string", "description": "string" }],
    "legendaryActions": [{ "name": "string", "cost": 1, "description": "string" }],
    "isHomebrew": false
  }
}`;

    case "magic-item":
      return `${commonHeader}

Under \`mechanics\`, provide a Magic Item block:
"mechanics": {
  "systemId": "${TOV_SYSTEM_ID}",
  "kind": "tov-magic-item",
  "isHomebrew": false,
  "data": {
    "rarity": "Common | Uncommon | Rare | Very Rare | Legendary | Artifact",
    "category": "Weapon | Armor | Shield | Wondrous Item | Potion | Ring | Rod | Scroll | Staff | Wand",
    "attunement": boolean,
    "attunementRequirement": "string (optional)",
    "activationAction": "Action | Bonus Action | Reaction | Minute | Passive",
    "charges": number (optional),
    "rechargeRate": "string (optional, e.g. '1d4+1 daily at dawn')",
    "savingThrowDc": number (optional),
    "rulesText": "string adhering strictly to BFRD terminology",
    "isHomebrew": false
  }
}`;
  }
}
