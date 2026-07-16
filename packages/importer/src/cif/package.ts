import { z } from "zod";

export const SUPPORTED_CIF_VERSIONS = ["1.0"] as const;
export const CIF_FORMAT = "codex-world-interchange" as const;

const nonEmptyString = z.string().min(1);
const stringList = z.array(nonEmptyString);

export const CifRecordSourceSchema = z.object({
  system: nonEmptyString.optional(),
  worldKey: nonEmptyString.optional(),
  exportedAt: z.string().optional(),
  name: nonEmptyString.optional(),
  version: nonEmptyString.optional(),
  id: nonEmptyString.optional(),
  url: z.string().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CifRecordSource = z.infer<typeof CifRecordSourceSchema>;

export const CifSourceSchema = CifRecordSourceSchema.extend({
  system: nonEmptyString,
});
export type CifSource = z.infer<typeof CifSourceSchema>;

export const CifWorldSchema = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  labels: stringList.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CifWorld = z.infer<typeof CifWorldSchema>;

export const CifMarkdownContentSchema = z.object({
  format: z.literal("markdown"),
  body: z.string(),
});

export const CifDateSchema = z.object({
  value: nonEmptyString,
  precision: z.enum(["year", "month", "day"]),
});
export type CifDate = z.infer<typeof CifDateSchema>;

export const CifDatesSchema = z.object({
  start: CifDateSchema.optional(),
  end: CifDateSchema.optional(),
});
export type CifDates = z.infer<typeof CifDatesSchema>;

export const CifMediaRefSchema = z.object({
  assetKey: nonEmptyString,
  role: nonEmptyString.optional(),
});
export type CifMediaRef = z.infer<typeof CifMediaRefSchema>;

export const CifEntitySchema = z.object({
  key: nonEmptyString,
  kind: nonEmptyString,
  title: nonEmptyString,
  summary: z.string().optional(),
  content: CifMarkdownContentSchema,
  labels: stringList.optional(),
  aliases: stringList.optional(),
  parent: nonEmptyString.optional(),
  dates: CifDatesSchema.optional(),
  media: z.array(CifMediaRefSchema).optional(),
  source: CifRecordSourceSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CifEntity = z.infer<typeof CifEntitySchema>;

export const CifRelationshipSchema = z.object({
  key: nonEmptyString.optional(),
  from: nonEmptyString,
  to: nonEmptyString,
  kind: nonEmptyString,
  label: z.string().optional(),
  directed: z.boolean().default(true),
  source: CifRecordSourceSchema.optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CifRelationship = z.infer<typeof CifRelationshipSchema>;

export const CifAssetSchema = z
  .object({
    key: nonEmptyString,
    path: nonEmptyString.optional(),
    url: z.string().optional(),
    mediaType: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    sha256: z
      .string()
      .regex(/^[A-Fa-f0-9]{64}$/)
      .optional(),
    title: nonEmptyString.optional(),
    source: CifRecordSourceSchema.optional(),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (a) =>
      (a.path !== undefined && a.sha256 !== undefined) || a.url !== undefined,
    {
      message: "Asset must have either (path and sha256) or url",
    },
  );
export type CifAsset = z.infer<typeof CifAssetSchema>;

export const CifManifestSchema = z.object({
  format: z.literal(CIF_FORMAT),
  version: z.string(),
  source: CifSourceSchema,
  world: CifWorldSchema,
  entities: z.array(CifEntitySchema),
  relationships: z.array(CifRelationshipSchema),
  assets: z.array(CifAssetSchema),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type CifManifest = z.infer<typeof CifManifestSchema>;

/** Package-blocking validation/parse error (FR-003): always names the rule and, where identifiable, the record. */
export interface CifValidationError {
  code: string;
  message: string;
  recordKey?: string;
}
