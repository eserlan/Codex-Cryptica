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
