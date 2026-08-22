import { z } from "zod";

export const StatSheetFieldTypeSchema = z.enum([
  "counter",
  "number",
  "text",
  "longtext",
  "heading",
  "dice",
  "item-table",
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
  // For "item-table" type fields: column definitions and row items array.
  columns: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "number", "dice", "counter", "checkbox"]),
        // "dice" columns: the roll formula applied to every row (e.g.
        // "1d6+2"). Rows may still override it per-row (see `rows` below).
        formula: z.string().optional(),
        // "counter" columns: bounds/step shared by every row's counter.
        // `max` also seeds new rows' starting value/max (see
        // ItemTableNode.svelte's handleAddRow).
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
      }),
    )
    .optional(),
  rows: z
    .array(
      z.record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.object({ value: z.number(), max: z.number().optional() }),
        ]),
      ),
    )
    .optional(),
  // For "item-table" type fields: whether rows can be populated by linking
  // to an existing vault item/weapon entity, in addition to typed manually.
  // Undefined defaults to enabled (back-compat with existing weapon/item
  // tables, which never set this); template authors can opt custom
  // non-item tables (e.g. a Mythras skills table) out explicitly.
  linkVaultItems: z.boolean().optional(),
  // Id of another field on the same sheet (typically a "number" ability
  // score) whose value drives this field's dice modifier — e.g. a "STR
  // Check" dice field derives its flat bonus from a "STR" score field via
  // the standard ability-modifier formula. Recomputed by
  // applyDerivedModifiers (apps/web/.../stat-sheet-field-actions.ts)
  // whenever the sheet's fields are persisted.
  modifierSource: z.string().optional(),
});

export type StatSheetField = z.infer<typeof StatSheetFieldSchema>;

/**
 * Fallback columns for "item-table" fields that predate the configurable
 * column editor, and the seed used when a template author switches a field
 * to "item-table" for the first time. Single source of truth — the
 * built-in Mythras template, the template editor's seeding logic, and the
 * renderer's legacy fallback all import this instead of redeclaring the
 * weapon column list.
 */
export const DEFAULT_ITEM_TABLE_COLUMNS: NonNullable<
  StatSheetField["columns"]
> = [
  { id: "name", label: "Weapon Type", type: "text" },
  { id: "size", label: "Size", type: "text" },
  { id: "reach", label: "Reach (Force)", type: "text" },
  { id: "damage", label: "Damage", type: "dice" },
  { id: "ap_hp", label: "AP/HP", type: "text" },
  { id: "effects", label: "Special Effects", type: "text" },
  { id: "range_load", label: "Range & Load", type: "text" },
];

export const StatSheetSchema = z.object({
  templateId: z.string().nullable().optional(),
  fields: z.array(StatSheetFieldSchema).default([]),
  // Per-entity override of the schema's default presentation template
  // (152-stat-sheet-templates). `null`/absent means "inherit the schema's
  // default", read via `StatSheetTemplateStore.getDefaultPresentationTemplateId()`
  // (apps/web/src/lib/stores/stat-sheet-templates.svelte.ts) — a vault-scoped
  // settings map, not a field on StatSheetTemplateSchema (built-in schema
  // templates are hardcoded objects with no persisted record to attach one to).
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
