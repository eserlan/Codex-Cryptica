import { z } from "zod";
import { ConnectionSchema } from "./connection";

export const DEFAULT_ICON = "lucide:circle";

export const CategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  icon: z.string().default(DEFAULT_ICON),
});

export type Category = z.infer<typeof CategorySchema>;

export const TemporalMetadataSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12).optional(),
  day: z.number().min(1).max(31).optional(),
  label: z.string().optional(),
});

export type TemporalMetadata = z.infer<typeof TemporalMetadataSchema>;

export const EraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  start_year: z.number(),
  end_year: z.number().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
});

export type Era = z.infer<typeof EraSchema>;

export const EntityTypeSchema = z.string();

export const EntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  connections: z.array(ConnectionSchema).default([]),
  content: z.string().default(""), // Markdown content, default empty
  lore: z.string().optional(), // Extended lore & rich notes
  image: z.string().optional(),
  thumbnail: z.string().optional(),
  date: TemporalMetadataSchema.optional(),
  start_date: TemporalMetadataSchema.optional(),
  end_date: TemporalMetadataSchema.optional(),
  metadata: z
    .object({
      coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  _path: z.union([z.string(), z.array(z.string())]).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "character", label: "Character", color: "#60a5fa", icon: "lucide:user" },
  { id: "creature", label: "Creature", color: "#f87171", icon: "lucide:paw-print" },
  { id: "location", label: "Location", color: "#4ade80", icon: "lucide:map-pin" },
  { id: "item", label: "Item", color: "#facc15", icon: "lucide:package" },
  { id: "event", label: "Event", color: "#e879f9", icon: "lucide:calendar" },
  { id: "faction", label: "Faction", color: "#fb923c", icon: "lucide:users" },
  { id: "note", label: "Note", color: "#94a3b8", icon: "lucide:file-text" },
];
