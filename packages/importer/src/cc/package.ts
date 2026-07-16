import { z } from "zod";

export const SUPPORTED_VERSIONS = ["1.0"] as const;

export const ImportWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
  ref: z.string().optional(),
});
export type ImportWarning = z.infer<typeof ImportWarningSchema>;

const EntityDraftDateSchema = z.object({
  year: z.number().int(),
  month: z.number().int().optional(),
  day: z.number().int().optional(),
});
export type EntityDraftDate = z.infer<typeof EntityDraftDateSchema>;

export const EntityDraftSchema = z
  .object({
    sourceId: z.string().optional(),
    sourcePath: z.string().optional(),
    sourceType: z.string().optional(),
    title: z.string().min(1),
    content: z.string().default(""),
    lore: z.string().optional(),
    tags: z.array(z.string()).default([]),
    labels: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
    image: z.string().optional(),
    thumbnail: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    parentRef: z.string().optional(),
    startDate: EntityDraftDateSchema.optional(),
    endDate: EntityDraftDateSchema.optional(),
  })
  .refine((d) => d.sourceId !== undefined || d.sourcePath !== undefined, {
    message: "EntityDraft must have either sourceId or sourcePath",
  });
export type EntityDraft = z.infer<typeof EntityDraftSchema>;

export const RelationshipDraftSchema = z.object({
  fromRef: z.string(),
  toRef: z.string(),
  type: z.string().default("related_to"),
  label: z.string().optional(),
});
export type RelationshipDraft = z.infer<typeof RelationshipDraftSchema>;

export const AssetDraftSchema = z.object({
  id: z.string(),
  bytes: z.instanceof(Blob).or(z.instanceof(Uint8Array)).optional(),
  originalName: z.string(),
  mimeType: z.string(),
  placementRef: z.string(),
});
export type AssetDraft = z.infer<typeof AssetDraftSchema>;

export const CCImportPackageSchema = z.object({
  version: z.string(),
  sourceSystem: z.string().min(1),
  sourceLabel: z.string().min(1),
  entityDrafts: z.array(EntityDraftSchema).default([]),
  relationshipDrafts: z.array(RelationshipDraftSchema).default([]),
  assetDrafts: z.array(AssetDraftSchema).default([]),
  warnings: z.array(ImportWarningSchema).default([]),
});
export type CCImportPackage = z.infer<typeof CCImportPackageSchema>;
