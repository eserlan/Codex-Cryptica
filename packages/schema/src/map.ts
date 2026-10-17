import { z } from "zod";

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const ViewportTransformSchema = z.object({
  pan: PointSchema,
  zoom: z.number().min(0.1).max(10),
});

export type Point = z.infer<typeof PointSchema>;
export type ViewportTransform = z.infer<typeof ViewportTransformSchema>;

export const MapPinSchema = z.object({
  id: z.string().uuid(),
  mapId: z.string().uuid(),
  entityId: z.string().optional(), // Link to core Lore Entity (NPC, Location, etc.)
  coordinates: PointSchema,
  hexCoordinates: z
    .object({
      q: z.number().int(),
      r: z.number().int(),
    })
    .optional(),
  visuals: z.object({
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const MapMaskSchema = z.object({
  maskPath: z.string(), // Local OPFS path to the binary mask file
});

/** Hex grid geometry, stored with the map so hex records stay aligned on every device (FR-037). */
export const MapGridGeometrySchema = z.object({
  type: z.enum(["square", "hex-pointy", "hex-flat"]),
  size: z.number().finite().positive(),
  offsetX: z.number().finite(),
  offsetY: z.number().finite(),
  labels: z
    .object({
      style: z.enum(["none", "off", "numeric", "alphanumeric", "axial"]),
      startCol: z.string().optional(),
      startColumn: z.string().optional(),
      startRow: z.number().optional(),
      rowPadding: z.number().optional(),
      separator: z.string().optional(),
      invertRow: z.boolean().optional(),
      originQ: z.number().optional(),
      originR: z.number().optional(),
    })
    .optional(),
});

export type MapGridGeometry = z.infer<typeof MapGridGeometrySchema>;

export const MapSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  assetPath: z.string(), // Local OPFS path to the image file
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }),
  parentEntityId: z.string().optional(), // Link to a "Container" entity for hierarchy
  isWorldMap: z.boolean().optional(), // If true, this is the default map for the campaign
  pins: z.array(MapPinSchema),
  fogOfWar: MapMaskSchema.optional(),
  playerVisible: z.boolean().optional(),
  /** Grid geometry for this map. Absent until adopted from this device (FR-038). */
  grid: MapGridGeometrySchema.optional(),
  /** Hex crawl state. Sparse; never exported to guests (FR-041). Records are normalised by hex-crawl-engine. */
  hexCrawl: z
    .object({
      enabled: z.boolean(),
      hexes: z.record(z.string(), z.unknown()),
    })
    .optional(),
});

export type MapPin = z.infer<typeof MapPinSchema>;
export type MapMask = z.infer<typeof MapMaskSchema>;
export type Map = z.infer<typeof MapSchema>;
