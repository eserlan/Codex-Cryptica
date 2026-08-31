import { z } from "zod";
import { EntitySchema } from "./entity";
import { MapSchema } from "./map";
import { StatSheetEntityCategorySchema } from "./stat-sheet";

export const PUBLISH_LIMITS = {
  maxBundleBytes: 10 * 1024 * 1024,
  maxAssetBytes: 5 * 1024 * 1024,
  maxAssets: 500,
  maxSnapshotAssetBytes: 100 * 1024 * 1024,
  maxEntities: 5_000,
  maxRelationships: 20_000,
  maxMaps: 100,
  maxCanvases: 100,
  maxTitleLength: 200,
  maxAssetIdLength: 128,
  maxListingTitleLength: 120,
  maxListingDescriptionLength: 280,
  maxListingLabels: 8,
  maxListingLabelLength: 40,
  maxListingOwnerNameLength: 80,
  maxListingCoverAltLength: 120,
  maxDirectorySearchLength: 120,
  defaultDirectoryPageSize: 24,
  maxDirectoryPageSize: 48,
} as const;

export const PublishRegistrySchema = z.object({
  vaultId: z.string().min(1),
  publishId: z.string().min(1),
  writeToken: z.string().min(1),
  publishedAt: z.string(),
  stats: z.object({
    entityCount: z.number().int(),
    relationshipCount: z.number().int(),
    assetCount: z.number().int(),
  }),
});

export type PublishRegistry = z.infer<typeof PublishRegistrySchema>;

export const GuestHistorySchema = z.object({
  publishId: z.string().min(1),
  vaultTitle: z.string().min(1),
  lastAccessed: z.string(),
});

export type GuestHistory = z.infer<typeof GuestHistorySchema>;

export const GuestRelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
});

export type GuestRelationship = z.infer<typeof GuestRelationshipSchema>;

export const GuestBundleSchema = z.object({
  schemaVersion: z.number().int(),
  publishId: z.string().min(1),
  vaultTitle: z.string().min(1).max(PUBLISH_LIMITS.maxTitleLength),
  publishedAt: z.string(),
  publisherVersion: z.string(),
  activeTheme: z.record(z.string(), z.any()).optional(),
  metadata: z
    .object({
      description: z.string().optional(),
      coverImage: z.string().optional(),
    })
    .optional(),
  entities: z.array(EntitySchema).max(PUBLISH_LIMITS.maxEntities),
  relationships: z
    .array(GuestRelationshipSchema)
    .max(PUBLISH_LIMITS.maxRelationships),
  maps: z.array(MapSchema).max(PUBLISH_LIMITS.maxMaps).optional(),
  canvases: z.array(z.any()).max(PUBLISH_LIMITS.maxCanvases).optional(),
  assetManifest: z
    .array(
      z.object({
        assetId: z
          .string()
          .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
          .max(PUBLISH_LIMITS.maxAssetIdLength),
        filename: z.string().max(1_024).optional(),
        mimeType: z.string().max(100),
        hash: z.string().regex(/^[a-f0-9]{64}$/i),
      }),
    )
    .max(PUBLISH_LIMITS.maxAssets)
    .default([]),
});

export type GuestBundle = z.infer<typeof GuestBundleSchema>;

const ListingLabelSchema = z
  .string()
  .trim()
  .min(1)
  .max(PUBLISH_LIMITS.maxListingLabelLength);

const SafeGuestUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => !/(^|\/)(vault|world|editor)\b/i.test(value),
    "Guest URL must not point to an editable route",
  );

export const ListingDraftSchema = z
  .object({
    publishId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(PUBLISH_LIMITS.maxListingTitleLength),
    description: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingDescriptionLength),
    labels: z
      .array(ListingLabelSchema)
      .min(1)
      .max(PUBLISH_LIMITS.maxListingLabels),
    coverImageAssetId: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxAssetIdLength)
      .optional(),
    coverImageAlt: z
      .string()
      .trim()
      .max(PUBLISH_LIMITS.maxListingCoverAltLength)
      .optional(),
    ownerDisplayName: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingOwnerNameLength)
      .optional(),
    rightsAcknowledged: z.literal(true),
    fanContent: z.boolean().optional().default(false),
    fanContentDisclaimer: z.string().trim().max(500).optional(),
  })
  .strict();

export type ListingDraft = z.infer<typeof ListingDraftSchema>;

export const PublicListingSchema = z
  .object({
    schemaVersion: z.literal(1),
    publishId: z.string().trim().min(1),
    guestUrl: SafeGuestUrlSchema,
    title: z.string().trim().min(1).max(PUBLISH_LIMITS.maxListingTitleLength),
    description: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingDescriptionLength),
    labels: z
      .array(ListingLabelSchema)
      .min(1)
      .max(PUBLISH_LIMITS.maxListingLabels),
    coverImageAssetId: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxAssetIdLength)
      .optional(),
    coverImageAlt: z
      .string()
      .trim()
      .max(PUBLISH_LIMITS.maxListingCoverAltLength)
      .optional(),
    ownerDisplayName: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingOwnerNameLength)
      .optional(),
    visibleEntityCount: z.number().int().min(0),
    snapshotPublishedAt: z.string().datetime(),
    listingCreatedAt: z.string().datetime(),
    listingUpdatedAt: z.string().datetime(),
    rightsAcknowledgedAt: z.string().datetime().optional(),
    fanContent: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) => !value.labels.some((label) => /^tags?$/i.test(label.trim())),
    "Labels must use labels terminology",
  );

export type PublicListing = z.infer<typeof PublicListingSchema>;

export const DirectoryQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(PUBLISH_LIMITS.maxDirectorySearchLength)
      .optional(),
    labels: z
      .array(ListingLabelSchema)
      .max(PUBLISH_LIMITS.maxListingLabels)
      .optional(),
    cursor: z.string().trim().min(1).optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(PUBLISH_LIMITS.maxDirectoryPageSize)
      .default(PUBLISH_LIMITS.defaultDirectoryPageSize),
  })
  .strict();

export type DirectoryQuery = z.infer<typeof DirectoryQuerySchema>;

export const DirectoryResultSchema = z
  .object({
    publishId: z.string().trim().min(1),
    guestUrl: SafeGuestUrlSchema,
    title: z.string().trim().min(1).max(PUBLISH_LIMITS.maxListingTitleLength),
    description: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingDescriptionLength),
    labels: z
      .array(ListingLabelSchema)
      .min(1)
      .max(PUBLISH_LIMITS.maxListingLabels),
    coverImageUrl: z.string().trim().min(1).optional(),
    coverImageAlt: z
      .string()
      .trim()
      .max(PUBLISH_LIMITS.maxListingCoverAltLength)
      .optional(),
    ownerDisplayName: z
      .string()
      .trim()
      .min(1)
      .max(PUBLISH_LIMITS.maxListingOwnerNameLength)
      .optional(),
    visibleEntityCount: z.number().int().min(0),
    listingUpdatedAt: z.string().datetime(),
  })
  .strict();

export type DirectoryResult = z.infer<typeof DirectoryResultSchema>;

export const DirectoryPageSchema = z
  .object({
    results: z.array(DirectoryResultSchema),
    nextCursor: z.string().trim().min(1).optional(),
  })
  .strict();

export type DirectoryPage = z.infer<typeof DirectoryPageSchema>;

export const PublishedNoticeSchema = z
  .object({
    schemaVersion: z.literal(1),
    publishId: z.string().trim().min(1),
    fanContent: z.boolean().default(false),
    fanContentDisclaimer: z.string().trim().max(500).optional(),
    rightsAcknowledgedAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime(),
    suspended: z.boolean().optional(),
  })
  .strict();

export type PublishedNotice = z.infer<typeof PublishedNoticeSchema>;

export const CopyrightReportSchema = z
  .object({
    schemaVersion: z.literal(1),
    reportId: z.string().min(1),
    vaultUrl: z.string().trim().min(1).max(500),
    publishId: z.string().trim().min(1).optional(),
    rightsHolder: z.string().trim().max(300).optional(),
    material: z.string().trim().max(2000).optional(),
    reporterContact: z.string().trim().min(3).max(300),
    details: z.string().trim().max(5000).optional(),
    receivedAt: z.string().datetime(),
    vaultState: z.enum(["listed", "published-unlisted", "not-found"]),
  })
  .strict();

export type CopyrightReport = z.infer<typeof CopyrightReportSchema>;

export const SuspensionMarkerSchema = z
  .object({
    schemaVersion: z.literal(1),
    publishId: z.string().trim().min(1),
    mode: z.enum(["delist", "disable"]),
    reason: z.string().optional(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type SuspensionMarker = z.infer<typeof SuspensionMarkerSchema>;

const TemplateLabelSchema = z.string().trim().min(1).max(40);
const TemplateColumnSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(200),
    type: z.enum(["text", "number", "dice", "counter", "checkbox"]),
  })
  .strict();
const TemplateFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    label: z.string().trim().min(1).max(200),
    type: z.enum([
      "counter",
      "number",
      "text",
      "longtext",
      "heading",
      "dice",
      "item-table",
    ]),
    formula: z.string().trim().max(120).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    step: z.number().finite().positive().optional(),
    columns: z.array(TemplateColumnSchema).max(30).optional(),
    linkVaultItems: z.boolean().optional(),
    modifierSource: z.string().trim().max(120).optional(),
  })
  .strict();

export const PublicTemplatePackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    template: z
      .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(500),
        system: z.string().trim().max(120).optional(),
        category: StatSheetEntityCategorySchema.optional(),
        labels: z.array(TemplateLabelSchema).max(8).default([]),
        fields: z.array(TemplateFieldSchema).min(1).max(200),
      })
      .strict()
      .superRefine((template, ctx) => {
        if (!template.system && !template.category) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A system or entity category is required",
            path: ["system"],
          });
        }
        for (let i = 0; i < template.fields.length; i++) {
          const field = template.fields[i];
          if (
            field.min !== undefined &&
            field.max !== undefined &&
            field.min > field.max
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Field minimum cannot exceed maximum",
              path: ["fields", i],
            });
          }
        }
      }),
    publishedAt: z.string().datetime().optional(),
  })
  .strict();

export type PublicTemplatePackage = z.infer<typeof PublicTemplatePackageSchema>;

export const CommunityTemplateListingSchema = z
  .object({
    schemaVersion: z.literal(1),
    listingId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    system: z.string().trim().max(120).optional(),
    category: StatSheetEntityCategorySchema.optional(),
    labels: z.array(TemplateLabelSchema).max(8).default([]),
    ownerDisplayName: z.string().trim().min(1).max(80).optional(),
    packageVersion: z.number().int().positive(),
    listingCreatedAt: z.string().datetime(),
    listingUpdatedAt: z.string().datetime(),
    importCount: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((listing, ctx) => {
    if (!listing.system && !listing.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A system or entity category is required",
        path: ["system"],
      });
    }
  });

export type CommunityTemplateListing = z.infer<
  typeof CommunityTemplateListingSchema
>;

export const TemplateDirectoryQuerySchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    system: z.string().trim().max(120).optional(),
    category: StatSheetEntityCategorySchema.optional(),
    labels: z.array(TemplateLabelSchema).max(8).optional(),
    cursor: z.string().trim().min(1).optional(),
    limit: z.number().int().min(1).max(48).default(24),
  })
  .strict();

export type TemplateDirectoryQuery = z.infer<
  typeof TemplateDirectoryQuerySchema
>;

export const TemplateDirectoryResultSchema =
  CommunityTemplateListingSchema.extend({
    fieldPreview: z.array(TemplateFieldSchema).max(200),
  }).strict();

export type TemplateDirectoryResult = z.infer<
  typeof TemplateDirectoryResultSchema
>;

export const TemplateDirectoryPageSchema = z
  .object({
    results: z.array(TemplateDirectoryResultSchema),
    nextCursor: z.string().trim().min(1).optional(),
  })
  .strict();

export type TemplateDirectoryPage = z.infer<typeof TemplateDirectoryPageSchema>;

/* -------------------------------------------------------------------------- */
/* CC Cloud Backup (spec 162, issue #2593)                                     */
/* -------------------------------------------------------------------------- */

export const CLOUD_BACKUP_LIMITS = {
  /**
   * Whole-vault ceiling: bundle plus every asset. Enforced per upload against
   * the running total already stored, so the limit is reached and reported
   * rather than discovered after the fact.
   */
  maxVaultBytes: 50 * 1024 * 1024,
  /**
   * One asset per request, so no single upload can approach the Worker's
   * memory ceiling. Matches the publish path's per-asset cap.
   */
  maxAssetBytes: 5 * 1024 * 1024,
  /**
   * Ceiling on a JSON body (enable and commit). The bundle is text only —
   * entities, maps and canvases — so this is generous for it while keeping any
   * single request far below what the Worker can hold in memory.
   */
  maxJsonBodyBytes: 8 * 1024 * 1024,
  maxTitleLength: 200,
  /**
   * Manifest keys read in one admin-lookup scan. The lookup never paginates
   * past this — an unbounded walk is bulk enumeration by another name (FR-016).
   */
  maxLookupScanKeys: 1_000,
} as const;

/**
 * Server-side record of one vault's backup, stored at
 * `cloud-backup/{backupId}/manifest.json`. The ownership code itself is never
 * stored — only its SHA-256 hash, in the R2 object's `customMetadata`.
 */
export const CloudBackupManifestSchema = z.object({
  schemaVersion: z.number().int(),
  backupId: z.string().min(1),
  /** Plaintext, because it is the only field the support lookup can match on. */
  vaultTitle: z.string().min(1).max(CLOUD_BACKUP_LIMITS.maxTitleLength),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string(),
  lastPushedAt: z.string(),
  entityCount: z.number().int().nonnegative().optional(),
});

export type CloudBackupManifest = z.infer<typeof CloudBackupManifestSchema>;

/**
 * Client-side, per-vault record in IndexedDB. Survives reloads so the user is
 * never re-prompted for consent (FR-020).
 *
 * `ownerCode` is the raw credential and the only copy outside the user's own
 * notes — losing this record without having copied the code elsewhere makes the
 * backup unreachable except through support lookup.
 */
export const LocalCloudBackupRecordSchema = z.object({
  vaultId: z.string().min(1),
  backupId: z.string().min(1),
  ownerCode: z.string().min(1),
  /** False after disable; the record is kept so re-enabling resumes. */
  enabled: z.boolean(),
  status: z.enum(["idle", "syncing", "error"]),
  lastPushedAt: z.string().nullable(),
  /** When the consent screen was confirmed (FR-002/FR-003). */
  consentedAt: z.string(),
});

export type LocalCloudBackupRecord = z.infer<
  typeof LocalCloudBackupRecordSchema
>;

/**
 * Support lookup response. `matched: false` covers both "no match" and
 * "several matched" deliberately, so an admin never learns how many vaults
 * share a title (FR-015, FR-016).
 */
export const SupportLookupResultSchema = z.object({
  matched: z.boolean(),
  backupId: z.string().optional(),
  vaultTitle: z.string().optional(),
  sizeBytes: z.number().int().optional(),
  lastPushedAt: z.string().optional(),
});

export type SupportLookupResult = z.infer<typeof SupportLookupResultSchema>;
