import { z } from "zod";

export const ConnectionTypeSchema = z.enum([
  "friendly",
  "enemy",
  "neutral",
  "located_in",
  "related_to",
  "knows",
  "owns",
  "part_of",
  "secret_advisor",
  // Family relationship types (Family Tree view). parent_of <-> child_of are
  // inverses; spouse_of is symmetric (its own inverse).
  "parent_of",
  "child_of",
  "spouse_of",
]);

export const ConnectionSchema = z.object({
  target: z.string(), // Target Entity ID
  type: ConnectionTypeSchema.or(z.string()).default("neutral"), // Allow custom types, default to neutral
  strength: z.number().min(0).max(1).default(1),
  label: z.string().optional(), // Custom text label (e.g. "Brother", "Rival")
});

export type Connection = z.infer<typeof ConnectionSchema>;
