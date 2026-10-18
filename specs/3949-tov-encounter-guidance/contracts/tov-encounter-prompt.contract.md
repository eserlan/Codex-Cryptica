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
3. Under `suggestedCreatures`, recommend valid BFRD-aligned adversaries and NPCs (e.g. built-in ToV monsters/NPCs) with their individual CR, suggested count, tactical role, and whether they are standard BFRD or homebrew.
4. If you include optional BFRD Doom guidance in `doomNotes`, describe an encounter-level GM Doom pool based on encounter CR that can affect creatures in that encounter. Published BFRD Doom spends are ONLY: give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge, or gain one additional use of a limited-use feature. Do NOT claim Doom is a creature-only pool.
5. If you introduce custom actions, creatures, creature-specific Doom abilities, or an alternate Doom economy not from core BFRD baselines, explicitly label them as `[Homebrew]` and mark `isHomebrew: true`.

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
    "doomNotes": "string (optional encounter-level BFRD Doom pool and published spend guidance; label any custom creature-specific Doom ability or alternate Doom economy as [Homebrew])",
    "isHomebrew": false
  }
}
```
