import { z } from "zod";

export const TEMPLATE_FORMAT_VERSION = 1;
export const TEMPLATE_PACKAGE_KIND = "entity-template";

export const TEMPLATE_NAME_MAX = 80;
/** A template is a starting note, not a document: keep it comfortably small. */
export const TEMPLATE_MARKDOWN_MAX = 50_000;

/** The shape stored on disk for one user template. */
export const StoredTemplateSchema = z
  .object({
    version: z.number().int().min(1),
    id: z.string().min(1),
    name: z.string(),
    entityType: z.string().min(1),
    markdown: z.string(),
  })
  // Unknown extra fields (future typed fields) survive a load and save.
  .passthrough();

export type StoredTemplate = z.infer<typeof StoredTemplateSchema>;

export type TemplateSource = "builtin" | "user" | "legacy";

export interface EntityTemplate {
  id: string;
  name: string;
  entityType: string;
  /** The markdown body a new entity starts with. "" means a blank note. */
  markdown: string;
  source: TemplateSource;
  version: number;
}

/** A template being authored: no id or source yet. */
export interface DraftTemplate {
  name: string;
  entityType: string;
  markdown: string;
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
  template: z
    .object({
      name: z.string(),
      entityType: z.string(),
      markdown: z.string(),
    })
    .passthrough(),
});

export type TemplatePackage = z.infer<typeof TemplatePackageSchema>;

export interface ValidationIssue {
  field: "name" | "entityType" | "markdown";
  message: string;
}

export type ImportResult =
  { ok: true; template: DraftTemplate } | { ok: false; error: string };
