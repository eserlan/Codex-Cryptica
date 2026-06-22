import { z } from "zod";
import { EntitySchema } from "./entity";
import { MapSchema } from "./map";

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
  vaultTitle: z.string().min(1),
  publishedAt: z.string(),
  publisherVersion: z.string(),
  activeTheme: z.record(z.any()).optional(),
  entities: z.array(EntitySchema),
  relationships: z.array(GuestRelationshipSchema),
  maps: z.array(MapSchema).optional(),
  canvases: z.array(z.any()).optional(),
  assetManifest: z.array(
    z.object({
      assetId: z.string(),
      filename: z.string().optional(),
      mimeType: z.string(),
      hash: z.string(),
    })
  ).default([]),
});

export type GuestBundle = z.infer<typeof GuestBundleSchema>;

