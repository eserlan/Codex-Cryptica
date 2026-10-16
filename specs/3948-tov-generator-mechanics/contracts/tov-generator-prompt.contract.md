# Prompt Contract: Tales of the Valiant Generator Instruction

**Feature**: [spec.md](../spec.md)  
**Date**: 2026-10-15  
**Status**: Completed

---

## 1. System Prompt Instruction Segment

When `gameSystem === "tales-of-the-valiant"`, the generator prompt builder appends the following mandatory instruction segment to the LLM generation prompt:

```text
GAME SYSTEM RULES LAYER: Tales of the Valiant (BFRD)
You MUST generate an accompanying mechanical rules block under the `mechanics` key in your JSON response.
Rules constraints:
1. All rules content MUST strictly follow the Black Flag Reference Document (BFRD) / Tales of the Valiant standards under CC BY 4.0.
2. DO NOT use proprietary or trademarked terms from D&D 5e or non-open Kobold Press books. Use BFRD equivalents (e.g. Lineage and Heritage instead of Race, Talents instead of Feats, Luck instead of Inspiration).
3. All attack and damage rolls MUST be formatted as valid dice expressions (e.g. "1d20+5", "2d6+3", "1d10+2").
4. If you invent any bespoke ability, action, or trait not found in standard BFRD monster/character baselines, set `isHomebrew: true` on that entry so the Game Master knows it requires review.
5. Provide realistic ability scores, proficiency bonus, AC, HP with hit dice, and saves appropriate for the Challenge Rating or Level.
```

---

## 2. JSON Completion Schema

The LLM is prompted to output a JSON object adhering to:

```json
{
  "title": "Gloomfang Panther",
  "summary": "A shadow-stalking apex predator that hunts the twilight borders of the whispering marshes.",
  "lore": "### Ecology & Habitat\n...",
  "labels": ["creature", "beast", "predator", "tales-of-the-valiant"],
  "content": "...",
  "mechanics": {
    "systemId": "tales-of-the-valiant",
    "kind": "tov-creature",
    "isHomebrew": false,
    "data": {
      "size": "Large",
      "creatureType": "Beast",
      "alignment": "unaligned",
      "cr": "3",
      "proficiencyBonus": 2,
      "doom": 0,
      "ac": 14,
      "acDetails": "natural armor",
      "hp": 52,
      "hitDice": "7d10 + 14",
      "speed": "40 ft., climb 30 ft.",
      "abilityScores": {
        "str": 17,
        "dex": 16,
        "con": 14,
        "int": 3,
        "wis": 14,
        "cha": 8
      },
      "saveProficiencies": ["dex", "wis"],
      "skillProficiencies": ["Perception", "Stealth"],
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "—",
      "traits": [
        {
          "name": "Keen Smell",
          "description": "The panther has advantage on Wisdom (Perception) checks that rely on smell."
        },
        {
          "name": "Pounce",
          "description": "If the panther moves at least 20 feet straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 13 Strength saving throw or be knocked prone."
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "attackFormula": "1d20+5",
          "damageFormula": "1d10+3",
          "description": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage."
        },
        {
          "name": "Claw",
          "attackFormula": "1d20+5",
          "damageFormula": "1d6+3",
          "description": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage."
        }
      ]
    }
  }
}
```
