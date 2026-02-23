import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const ViewportTransformSchema = z.object({
  pan: PointSchema,
  zoom: z.number(),
});

export type Point = z.infer<typeof PointSchema>;
export type ViewportTransform = z.infer<typeof ViewportTransformSchema>;

export const MapPinSchema = z.object({
  id: z.string().uuid(),
  mapId: z.string().uuid(),
  entityId: z.string().optional(), // Link to core Lore Entity (NPC, Location, etc.)
  coordinates: PointSchema,
  visuals: z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const MapMaskSchema = z.object({
  maskPath: z.string(), // Local OPFS path to the binary mask file
});

export const MapSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  assetPath: z.string(), // Local OPFS path to the image file
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }),
  parentEntityId: z.string().optional(), // Link to a "Container" entity for hierarchy
  pins: z.array(MapPinSchema),
  fogOfWar: MapMaskSchema.optional(),
});

export type MapPin = z.infer<typeof MapPinSchema>;
export type MapMask = z.infer<typeof MapMaskSchema>;
export type Map = z.infer<typeof MapSchema>;
