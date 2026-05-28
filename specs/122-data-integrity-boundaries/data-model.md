# Data Model

## Entity Validation Schema (Zod)

The core data model for an Entity must be strictly enforced:

```typescript
import { z } from "zod";

export const EntitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  aliases: z.array(z.string()).optional().default([]),
  labels: z.array(z.string()).optional().default([]), // Enforcing 'labels', not 'tags'
  color: z.string().optional(),
  description: z.string().optional(),
  type: z
    .enum(["person", "location", "event", "faction", "item", "concept", "note"])
    .optional(),
  // ... other existing fields
});

export type ValidatedEntity = z.infer<typeof EntitySchema>;
```

## Migration Log Store

A new store inside IndexedDB to track schema upgrades:

```typescript
export interface MigrationLogEntry {
  version: number;
  timestamp: number;
  status: "pending" | "success" | "failed" | "rolled_back";
  rollbackSnapshotId?: string; // Reference to the OPFS snapshot file
  error?: string;
}
```
