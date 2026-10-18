# Data Model & Schema Mappings: ToV Encounter Guidance & Doom Tracking

**Feature**: ToV-Aware Encounter Assistance and Verified Doom Mechanics  
**Issue**: [#3949](https://github.com/eserlan/Codex-Cryptica-2/issues/3949)  
**Date**: 2026-10-15

---

## 1. Zod Schemas (`packages/generator-engine/src/tov-mechanics-schema.ts`)

```typescript
export const TovEncounterCreatureSuggestionSchema = z.object({
  name: z.string().min(1),
  cr: z.string().min(1),
  count: z.coerce.number().int().min(1).default(1),
  role: z.string().min(1).default("Adversary"),
  templateId: z.string().optional(),
  isHomebrew: z.boolean().default(false),
});

export const TovEncounterMechanicsSchema = z.object({
  qualitativeDifficulty: z.string().min(1),
  recommendedCrRange: z.string().min(1),
  suggestedCreatures: z.array(TovEncounterCreatureSuggestionSchema).default([]),
  tacticalAdvice: z.string().min(1).default(""),
  doomNotes: z.string().optional(),
  isHomebrew: z.boolean().default(false),
});

export type TovEncounterCreatureSuggestion = z.infer<
  typeof TovEncounterCreatureSuggestionSchema
>;
export type TovEncounterMechanics = z.infer<typeof TovEncounterMechanicsSchema>;
```

### GeneratorMechanicsBundle Discrimination

```typescript
z.object({
  systemId: z.literal(TOV_SYSTEM_ID),
  kind: z.literal("tov-encounter"),
  isHomebrew: z.boolean().default(false),
  homebrewNotice: z.string().optional(),
  data: TovEncounterMechanicsSchema,
});
```

---

## 2. Generator Options (`EncounterGeneratorOptions`)

```typescript
export interface EncounterGeneratorOptions {
  genre?: string;
  encounterType?: string;
  environment?: string;
  threat?: string;
  tone?: string;
  context?: string;
  campaignContext?: string;
  gameSystem?: string; // "system-neutral" | "tales-of-the-valiant"
  partySize?: number; // 1 - 8, default 4
  partyLevel?: number; // 1 - 20, default 3
}
```

---

## 3. Doom Model (`packages/stat-sheet-engine/src/rules-sources/tov-doom.ts`)

```typescript
export const TOV_DOOM_FIELD_ID = "doom" as const;

export const TOV_DOOM_REFERENCE = {
  summary:
    "Doom Points are held by select boss monsters and adversaries to fuel villain actions, legendary responses, or lair effects.",
  min: 0,
  defaultMax: 10,
  source: "Black Flag Reference Document (BFRD) / Tales of the Valiant",
} as const;

export function isTovDoomField(
  templateId: string | null | undefined,
  field: Pick<StatSheetField, "id" | "type">,
): boolean {
  return (
    !!templateId &&
    templateId === TOV_MONSTER_TEMPLATE_ID &&
    field.id === TOV_DOOM_FIELD_ID &&
    field.type === "counter"
  );
}

export function adjustTovDoom(
  current: number,
  delta: 1 | -1,
  max: number = 10,
): { value: number; clamped: boolean; reason?: string } {
  const next = current + delta;
  if (next < 0)
    return { value: 0, clamped: true, reason: "Doom cannot be less than 0." };
  if (next > max)
    return { value: max, clamped: true, reason: `Doom cannot exceed ${max}.` };
  return { value: next, clamped: false };
}
```

---

## 4. Markdown Persistence Format

Under the generated Note's `lore` section when saving with ToV mechanics:

```markdown
### Game Mechanics & Challenge Guidance (Tales of the Valiant)

- **Challenge Assessment:** Moderate (tailored for 4 characters at Level 3).
- **Recommended CR Distribution:** CR 1–2 vanguard with a CR 4 commander.
- **Suggested Participants:**
  - 3x Shadow Hound (CR 1, Skirmisher)
  - 1x Gloom Caller (CR 4, Controller / Boss)
- **Tactical Advice:** Use the terrain to bottle-neck players; the Gloom Caller stays behind the hounds and uses darkness to obscure approach.
- **Doom Guidance:** The Gloom Caller has 3 Doom Points. Spend 1 Doom to snuff a light source within 60 ft as a reaction, or 2 Doom to summon a Shadow Minion at initiative count 20.
```
