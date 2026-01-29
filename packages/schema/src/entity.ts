import { z } from "zod";
import { ConnectionSchema } from "./connection";

export const CategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
  icon: z.string().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export const EntityTypeSchema = z.string();

export const EntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  connections: z.array(ConnectionSchema).default([]),
  content: z.string().default(""), // Markdown content, default empty
  lore: z.string().optional(), // Extended lore & rich notes
  image: z.string().optional(),
  metadata: z
    .object({
      coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
    })
    .optional(),
  _path: z.union([z.string(), z.array(z.string())]).optional(),
});

export type Entity = z.infer<typeof EntitySchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "npc", label: "NPC", color: "#60a5fa", icon: "lucide:user" },
  { id: "creature", label: "Creature", color: "#f87171", icon: "lucide:paw-print" },
  { id: "location", label: "Location", color: "#4ade80", icon: "lucide:map-pin" },
  { id: "item", label: "Item", color: "#facc15", icon: "lucide:package" },
  { id: "event", label: "Event", color: "#e879f9", icon: "lucide:calendar" },
  { id: "faction", label: "Faction", color: "#fb923c", icon: "lucide:users" },
];
