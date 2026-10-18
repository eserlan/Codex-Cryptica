# Contract: AI read response

The JSON object the model must return. It is validated by a Zod schema in `stat-block-reader/read-result-schema.ts` with **no `.default()` anywhere**. Unknown keys are dropped and listed as leftovers when they hold text.

```jsonc
{
  "outcome": "ok", // "ok" | "no-stat-block" | "several" | "character"
  "candidates": [], // names when outcome = "several"
  "looksLike": "tov", // "tov" | "5e" | "unknown"
  "kind": "creature", // "creature" | "npc"
  "name": "Cave Goblin",
  "values": {
    // CreatureValues or NpcValues; omit or null anything not in the source
    "ac": 13,
    "acDetails": "leather armor",
    "hp": 9,
    "hitDice": "2d6+2",
    "abilityScores": { "str": 8, "dex": 14, "con": 12, "int": 10, "wis": 8 },
    "actions": [
      {
        "name": "Scimitar",
        "attackFormula": "1d20+4",
        "damageFormula": "1d6+2",
        "description": "Melee 5 ft., one target. Slashing.",
      },
    ],
  },
  "notes": [
    {
      "path": "abilityScores.cha",
      "state": "check",
      "reason": "uncertain",
      "source": "CHA 8 (−l)",
    },
  ],
  "leftovers": [{ "label": "Lair Actions", "text": "…" }],
}
```

## Prompt rules (system instruction, copy mode)

1. Transcribe only. Do not add, estimate or "fix" any value. If a value is not in the text, omit it.
2. If a value is present but unreadable or ambiguous, include your best reading **and** a `check` note with the source snippet.
3. Write every attack and damage roll as a dice expression (`1d20+4`, `2d6+2`). If the source states only a bonus (`+4 to hit`), convert it to `1d20+4` and do not add a note.
4. Keep homebrew traits and names exactly as written.
5. Put content with no matching key in `leftovers`, not in a nearby field.
6. Set `looksLike` from the text's terms (Legendary Resistance / no Doom → likely 5e).
7. One creature per response. If there are several, return `outcome: "several"` with their names and no values.

## Prompt rules (convert-5e mode)

As above, plus: convert 5e terms and mechanics to their ToV equivalents per the open BFRD rules (CC BY 4.0). For **every** value you add or change, add a `converted` note with `original` (the 5e value, or `null` if added). Unchanged values get no note.

## Grounding

The system instruction carries only open BFRD rules text already in the repo (`rules-sources/tov-differences.ts`, `tov-doom.ts`, `tov-luck.ts`). The user's pasted text appears only in the user prompt of that one request (FR-021).
