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
