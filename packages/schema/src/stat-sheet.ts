import { z } from "zod";

export const StatSheetFieldTypeSchema = z.enum([
  "counter",
  "number",
  "text",
  "longtext",
  "heading",
  "dice",
]);

export type StatSheetFieldType = z.infer<typeof StatSheetFieldTypeSchema>;

export const StatSheetFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: StatSheetFieldTypeSchema,
  value: z.union([z.number(), z.string(), z.boolean()]).optional(),
  formula: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  collapsed: z.boolean().optional(),
  favorite: z.boolean().optional(),
  barField: z.boolean().optional(),
});

export type StatSheetField = z.infer<typeof StatSheetFieldSchema>;

export const StatSheetSchema = z.object({
  templateId: z.string().nullable().optional(),
  fields: z.array(StatSheetFieldSchema).default([]),
  // Per-entity override of the schema's default presentation template
  // (152-stat-sheet-templates). `null`/absent means "inherit the schema's
  // StatSheetTemplate.defaultPresentationTemplateId".
  presentationTemplateId: z.string().nullable().optional(),
});

export type StatSheet = z.infer<typeof StatSheetSchema>;

export const StatSheetTemplateFieldSchema = StatSheetFieldSchema.omit({
  value: true,
  collapsed: true,
  favorite: true,
  barField: true,
});

export type StatSheetTemplateField = z.infer<
  typeof StatSheetTemplateFieldSchema
>;

export const StatSheetTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  isBuiltIn: z.boolean().optional(),
  fields: z.array(StatSheetTemplateFieldSchema).default([]),
});

export type StatSheetTemplate = z.infer<typeof StatSheetTemplateSchema>;

/** Categories offered by the public template directory. */
export const StatSheetEntityCategorySchema = z.enum([
  "character",
  "npc",
  "location",
  "settlement",
  "faction",
  "item",
  "event",
  "note",
  "ship",
  "threat",
  "organization",
  "other",
]);

export type StatSheetEntityCategory = z.infer<
  typeof StatSheetEntityCategorySchema
>;

export const PUBLIC_STAT_SHEET_PACKAGE_VERSION = 1 as const;

/**
 * 152-stat-sheet-templates: Markdown-based presentation templates.
 *
 * `formatVersion` is the extended-Markdown directive syntax version
 * (contracts/directive-syntax.md), independent of
 * PUBLIC_STAT_SHEET_PACKAGE_VERSION above (which versions the *schema*
 * template package format, not the presentation directive grammar).
 */
export const PRESENTATION_TEMPLATE_FORMAT_VERSION = 1 as const;

export const PresentationTemplateSchema = z.object({
  id: z.string().min(1),
  // `null` for built-ins; owning vault id for vault-owned templates.
  vaultId: z.string().nullable(),
  // The StatSheetTemplate.id this presentation targets (V1: exactly one).
  schemaTemplateId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  // Raw extended-Markdown source — the authoritative, durable representation.
  source: z.string(),
  formatVersion: z.number().int().positive(),
  isBuiltIn: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PresentationTemplate = z.infer<typeof PresentationTemplateSchema>;

/** Value-free export/import envelope (FR-015/FR-016). */
export const PresentationTemplatePackageSchema = z.object({
  formatVersion: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  schemaTemplateId: z.string().min(1),
  source: z.string(),
});

export type PresentationTemplatePackage = z.infer<
  typeof PresentationTemplatePackageSchema
>;
