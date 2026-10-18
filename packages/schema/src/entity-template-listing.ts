import { z } from "zod";

/**
 * Transport schemas for community *entity* template listings. Kept apart from
 * the stat sheet listing schemas in `publishing.ts`, which stay strict and
 * unchanged: an entity listing never parses as a stat sheet listing and the
 * reverse (see the discriminator below).
 */

export const ENTITY_TEMPLATE_LISTING_LIMITS = {
  titleMax: 80,
  entityTypeMax: 60,
  descriptionMax: 500,
  labelsMax: 8,
  labelMax: 30,
  displayNameMax: 80,
  reportDetailsMax: 2_000,
  pageMax: 50,
  pageDefault: 24,
} as const;

const L = ENTITY_TEMPLATE_LISTING_LIMITS;

const LabelSchema = z.string().trim().min(1).max(L.labelMax);

export const EntityTemplateListingSchema = z
  .object({
    schemaVersion: z.literal(1),
    templateKind: z.literal("entity"),
    listingId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(L.titleMax),
    description: z.string().trim().min(1).max(L.descriptionMax),
    entityType: z.string().trim().min(1).max(L.entityTypeMax),
    labels: z.array(LabelSchema).min(1).max(L.labelsMax),
    ownerDisplayName: z.string().trim().min(1).max(L.displayNameMax).optional(),
    packageVersion: z.number().int().positive(),
    status: z.enum(["active", "unpublished"]),
    listingCreatedAt: z.string().datetime(),
    listingUpdatedAt: z.string().datetime(),
  })
  .strict();

export type EntityTemplateListing = z.infer<typeof EntityTemplateListingSchema>;

export const EntityTemplateDirectoryQuerySchema = z
  .object({
    kind: z.literal("entity"),
    q: z.string().trim().max(120).optional(),
    entityType: z.string().trim().min(1).max(L.entityTypeMax).optional(),
    labels: z.array(LabelSchema).max(L.labelsMax).optional(),
    cursor: z.string().trim().min(1).optional(),
    limit: z.number().int().min(1).max(L.pageMax).default(L.pageDefault),
  })
  .strict();

export type EntityTemplateDirectoryQuery = z.infer<
  typeof EntityTemplateDirectoryQuerySchema
>;

/** Card data only: never the template text, the token or its hash. */
export const EntityTemplateDirectoryResultSchema = EntityTemplateListingSchema;

export const EntityTemplateFacetsSchema = z
  .object({
    entityTypes: z.array(
      z
        .object({ value: z.string().min(1), count: z.number().int().min(1) })
        .strict(),
    ),
  })
  .strict();

export const EntityTemplateDirectoryPageSchema = z
  .object({
    results: z.array(EntityTemplateDirectoryResultSchema),
    nextCursor: z.string().trim().min(1).optional(),
    facets: EntityTemplateFacetsSchema,
  })
  .strict();

export type EntityTemplateDirectoryPage = z.infer<
  typeof EntityTemplateDirectoryPageSchema
>;

/** The detail view adds the note the template produces, for active listings. */
export const EntityTemplateDetailSchema = EntityTemplateListingSchema.extend({
  previewMarkdown: z.string(),
}).strict();

export type EntityTemplateDetail = z.infer<typeof EntityTemplateDetailSchema>;

export const ENTITY_TEMPLATE_REPORT_REASONS = [
  "inappropriate",
  "copied-without-permission",
  "spam",
  "other",
] as const;

export const EntityTemplateReportInputSchema = z
  .object({
    reason: z.enum(ENTITY_TEMPLATE_REPORT_REASONS),
    details: z.string().trim().max(L.reportDetailsMax).optional(),
  })
  .strict();

export type EntityTemplateReportInput = z.infer<
  typeof EntityTemplateReportInputSchema
>;

export const EntityTemplateReportRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    reportId: z.string().min(1),
    listingId: z.string().min(1),
    reason: z.enum(ENTITY_TEMPLATE_REPORT_REASONS),
    details: z.string().max(L.reportDetailsMax).optional(),
    receivedAt: z.string().datetime(),
  })
  .strict();

export type EntityTemplateReportRecord = z.infer<
  typeof EntityTemplateReportRecordSchema
>;

/** Summary index served by browse: active listings only, no template text. */
export const EntityTemplateIndexSchema = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: z.string().datetime(),
    entries: z.array(
      EntityTemplateListingSchema.extend({
        status: z.literal("active"),
      }).strict(),
    ),
  })
  .strict();

export type EntityTemplateIndex = z.infer<typeof EntityTemplateIndexSchema>;
