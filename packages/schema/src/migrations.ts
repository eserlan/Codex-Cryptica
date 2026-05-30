import { z } from "zod";

export const MigrationLogEntrySchema = z.object({
  version: z.number().int().min(1),
  timestamp: z.number().int(),
  status: z.enum(["pending", "success", "failed", "rolled_back"]),
  rollbackSnapshotId: z.string().optional(),
  error: z.string().optional(),
});

export type MigrationLogEntry = z.infer<typeof MigrationLogEntrySchema>;
