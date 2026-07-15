import { z } from "zod";
import { EntitySchema } from "./entity";
import { MapSchema } from "./map";

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
