import { z } from 'zod';

export const EntityTypeSchema = z.enum(['npc', 'location', 'item', 'event', 'faction']);

export const EntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  connections: z.array(z.any()).default([]), // Refined in ConnectionSchema
  content: z.string().optional(), // Markdown content
});

export type Entity = z.infer<typeof EntitySchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
