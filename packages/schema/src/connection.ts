import { z } from 'zod';

export const ConnectionTypeSchema = z.enum([
  'located_in',
  'related_to',
  'knows',
  'owns',
  'part_of',
  'secret_advisor', // From spec example
]);

export const ConnectionSchema = z.object({
  target: z.string(), // Target Entity ID
  type: ConnectionTypeSchema.or(z.string()), // Allow custom types
  strength: z.number().min(0).max(1).default(1),
  label: z.string().optional(), // Added label support for [[Link|Label]]
});

export type Connection = z.infer<typeof ConnectionSchema>;