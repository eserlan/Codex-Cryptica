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
    "The optional BFRD Doom rule gives the GM a CR-based resource at the start of an encounter. The GM can spend it to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge, or gain one additional use of a limited-use feature.",
  min: 0,
  defaultMax: 10,
  note: "The published rule is encounter-level and can affect creatures in that encounter. Codex Cryptica currently exposes a counter on an individual ToV monster stat sheet as a tracking choice.",
  allocationGuidance:
    "Use the per-creature Doom counter on a ToV monster sheet or VTT token to track points allocated to that creature from the encounter's Doom pool; this storage model does not change the encounter-level BFRD rule.",
  source: `${BFRD_MANIFEST.shortName} ${BFRD_MANIFEST.version} (${BFRD_MANIFEST.license})`,
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
  delta: number,
  max: number = TOV_DOOM_REFERENCE.defaultMax,
): { value: number; clamped: boolean; reason?: string } {
  if (!Number.isFinite(current)) {
    return {
      value: 0,
      clamped: true,
      reason: "Current Doom value is not a valid number; reset to 0.",
    };
  }
  const next = current + delta;
  if (next < 0)
    return {
      value: 0,
      clamped: true,
      reason: "Doom Points cannot fall below 0.",
    };
  if (next > max)
    return {
      value: max,
      clamped: true,
      reason: `Doom Points cannot exceed ${max}.`,
    };
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
- **Tactical Guidance:** Use the terrain to bottle-neck players; the Gloom Caller stays behind the hounds and uses darkness to obscure approach.
- **Doom Guidance:** Start the encounter with a CR-based GM Doom pool of 3 points. Spend Doom to give the Gloom Caller or a Shadow Hound advantage on an attack, give a PC disadvantage on a save, or once per encounter recharge or gain one additional use of a limited-use feature.
```
