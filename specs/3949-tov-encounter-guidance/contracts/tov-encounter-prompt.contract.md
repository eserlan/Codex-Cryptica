# Prompt & Output Contract: Tales of the Valiant Encounter Guidance

**System Instruction**:

```text
You are an assistant that generates detailed RPG campaign elements in JSON format.
```

**Prompt Injection (when `gameSystem === "tales-of-the-valiant"`)**:

```text
GAME SYSTEM RULES LAYER: Tales of the Valiant (BFRD)
Party Profile: ${partySize} characters at Level ${partyLevel}.
You MUST generate an accompanying mechanical rules block under the `mechanics` key in your JSON response.
Rules constraints:
1. Provide qualitative GM-facing challenge guidance tailored to the party (party size and level). Use BFRD challenge tiers (Trivial, Moderate, Dangerous, Deadly).
2. DO NOT invent rigid proprietary mathematical XP budget formulas. Provide qualitative action economy and Challenge Rating (CR) pacing advice instead.
3. Under `suggestedCreatures`, recommend valid BFRD-aligned adversaries and NPCs (e.g. built-in ToV monsters/NPCs) with their individual CR, suggested count, role, and whether they are standard BFRD or homebrew.
4. If a boss or high-threat creature is recommended that uses Doom points, describe appropriate Doom expenditure in `doomNotes`. Doom points are scoped strictly to individual creatures/abilities, NOT a universal GM pool.
5. If you introduce custom actions or creatures not from core BFRD baselines, mark them with `isHomebrew: true`.

Under `mechanics`, provide an Encounter Guidance block:
"mechanics": {
  "systemId": "tales-of-the-valiant",
  "kind": "tov-encounter",
  "isHomebrew": false,
  "data": {
    "qualitativeDifficulty": "string (e.g. 'Moderate challenge for 4 Level 3 characters')",
    "recommendedCrRange": "string (e.g. 'CR 1/2 to CR 2 minions, single CR 4 leader')",
    "suggestedCreatures": [
      {
        "name": "string",
        "cr": "string",
        "count": number,
        "role": "string",
        "isHomebrew": false
      }
    ],
    "tacticalAdvice": "string GM tactical notes",
    "doomNotes": "string (optional Doom usage notes for boss creatures)",
    "isHomebrew": false
  }
}
```
