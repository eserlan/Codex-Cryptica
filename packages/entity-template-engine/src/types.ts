import { z } from "zod";

export const TEMPLATE_FORMAT_VERSION = 1;
export const TEMPLATE_PACKAGE_KIND = "entity-template";

export const TEMPLATE_NAME_MAX = 80;
export const SECTION_TITLE_MAX = 120;
export const MAX_SECTIONS = 100;

/**
 * Sections use passthrough so unknown extra fields (future typed fields) survive
 * a load, edit and save without being stripped.
 */
export const TemplateSectionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    hint: z.string().optional(),
  })
  .passthrough();

export type TemplateSection = z.infer<typeof TemplateSectionSchema>;

/** The shape stored on disk for one user template. */
export const StoredTemplateSchema = z.object({
  version: z.number().int().min(1),
  id: z.string().min(1),
  name: z.string(),
  entityType: z.string().min(1),
  intro: z.string().optional(),
  sections: z.array(TemplateSectionSchema),
});

export type StoredTemplate = z.infer<typeof StoredTemplateSchema>;

export type TemplateSource = "builtin" | "user" | "legacy";

export interface EntityTemplate {
  id: string;
  name: string;
  entityType: string;
  intro?: string;
  sections: TemplateSection[];
  source: TemplateSource;
  /** Exact original text for built-in and legacy templates. */
  markdown?: string;
  version: number;
}

/** A template being authored: no id or source yet. */
export interface DraftTemplate {
  name: string;
  entityType: string;
  intro?: string;
  sections: TemplateSection[];
}

export const TemplateDefaultsSchema = z.object({
  version: z.number().int().min(1),
  defaults: z.record(z.string(), z.string()),
});

export type TemplateDefaults = z.infer<typeof TemplateDefaultsSchema>;

export const EMPTY_DEFAULTS: TemplateDefaults = {
  version: TEMPLATE_FORMAT_VERSION,
  defaults: {},
};

export const TemplatePackageSchema = z.object({
  kind: z.literal(TEMPLATE_PACKAGE_KIND),
  formatVersion: z.number().int(),
  template: z.object({
    name: z.string(),
    entityType: z.string(),
    intro: z.string().optional(),
    sections: z.array(
      z
        .object({
          title: z.string(),
          hint: z.string().optional(),
        })
        .passthrough(),
    ),
  }),
});

export type TemplatePackage = z.infer<typeof TemplatePackageSchema>;

export interface ValidationIssue {
  field: "name" | "entityType" | "sections" | "section";
  sectionId?: string;
  message: string;
}

export type ImportResult =
  { ok: true; template: DraftTemplate } | { ok: false; error: string };
