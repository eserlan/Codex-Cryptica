import { z } from "zod";
import type { StatSheetField, StatSheetTemplate } from "schema";

export const StatBlockSystemSchema = z.enum([
  "dnd5e",
  "pf2e",
  "tales-of-the-valiant",
  "mythras",
  "vtm",
  "gurps",
  "generic",
]);

export type StatBlockSystem = z.infer<typeof StatBlockSystemSchema>;

export const StatBlockIRSchema = z.object({
  system: StatBlockSystemSchema,
  identity: z.object({
    name: z.string().min(1),
    category: z.enum(["character", "npc", "creature"]).default("npc"),
    ancestryOrType: z.string().optional(),
    classOrRole: z.string().optional(),
    levelOrCr: z.string().optional(),
    size: z.string().optional(),
    alignment: z.string().optional(),
  }),
  vitals: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        current: z.number().optional(),
        max: z.number().optional(),
        min: z.number().optional().default(0),
        sublabel: z.string().optional(),
      }),
    )
    .default([]),
  attributes: z
    .record(
      z.string(),
      z.object({
        label: z.string(),
        value: z.union([z.number(), z.string()]),
        modifier: z.number().optional(),
      }),
    )
    .default({}),
  defences: z
    .object({
      armorRating: z.union([z.number(), z.string()]).optional(),
      armorDetails: z.string().optional(),
      speed: z.string().optional(),
      secondaryDefences: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional(),
      immunities: z.array(z.string()).optional(),
      resistances: z.array(z.string()).optional(),
      vulnerabilities: z.array(z.string()).optional(),
      conditionImmunities: z.array(z.string()).optional(),
      senses: z.string().optional(),
      languages: z.string().optional(),
    })
    .default({}),
  actionsAndAttacks: z
    .array(
      z.object({
        name: z.string(),
        actionType: z
          .enum(["action", "bonus", "reaction", "legendary", "passive"])
          .default("action"),
        attackDice: z.string().optional(),
        damageDice: z.string().optional(),
        reachOrRange: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  skillsAndProficiencies: z
    .array(
      z.object({
        name: z.string(),
        value: z.union([z.string(), z.number()]),
        formula: z.string().optional(),
      }),
    )
    .optional(),
  traitsAndFeatures: z
    .array(
      z.object({
        name: z.string(),
        text: z.string(),
        category: z
          .enum([
            "trait",
            "feat",
            "discipline",
            "advantage",
            "spell",
            "special",
          ])
          .default("trait"),
      }),
    )
    .default([]),
  rawSource: z.string().optional(),
});

export type StatBlockIR = z.infer<typeof StatBlockIRSchema>;

export interface StatBlockImportOptions {
  systemHint?: StatBlockSystem;
  targetTemplateId?: string;
  category?: "character" | "npc" | "creature";
}

export interface StatBlockImportResult {
  ir: StatBlockIR;
  fields: StatSheetField[];
  targetTemplateId: string;
  synthesizedTemplate?: StatSheetTemplate;
}
