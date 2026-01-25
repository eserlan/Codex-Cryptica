import { z } from 'zod';
import { ConnectionSchema } from './connection';

export const EntityTypeSchema = z.enum(['npc', 'location', 'item', 'event', 'faction']);

export const EntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  connections: z.array(ConnectionSchema).default([]),
  content: z.string().default(''), // Markdown content, default empty
  image: z.string().optional(),
  metadata: z.object({
    coordinates: z.object({ x: z.number(), y: z.number() }).optional()
  }).optional()
});

export type Entity = z.infer<typeof EntitySchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;