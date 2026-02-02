# Data Model: Connection Labels

**Feature**: `033-connection-labels`

## Schema Updates

### Connection Object

We will expand the `Connection` schema in `packages/schema/src/connection.ts`.

```typescript
// Current
// export const ConnectionSchema = z.object({
//   target: z.string(),
//   type: z.string().optional(), // Used as label currently
//   strength: z.number().optional(),
// });

// New
export const ConnectionTypeSchema = z.enum(["friendly", "enemy", "neutral", "related_to"]);

export const ConnectionSchema = z.object({
  target: z.string(), // ID of target entity
  type: ConnectionTypeSchema.default("neutral"), // Semantic category
  label: z.string().optional(), // Custom text label (e.g. "Father", "Rival")
  strength: z.number().default(1), // Visual weight
});
```

**Migration Strategy**:
- Existing connections might just be strings or simple objects.
- `schema` validation should handle upgrading:
  - If `type` was used for custom text, move it to `label`.
  - Default `type` to "neutral" if missing or unknown.

## Graph Visual Mapping

| Connection Type | Edge Color | Line Style |
| :--- | :--- | :--- |
| `friendly` | `#22c55e` (Green-500) | Solid |
| `enemy` | `#ef4444` (Red-500) | Solid |
| `neutral` | `#94a3b8` (Slate-400) | Solid |
| `related_to` | `#94a3b8` (Slate-400) | Dashed (Optional) |

**Labels**:
- Cytoscape edge `label` property will be bound to `data(label)`.
- If `label` is empty, no text is shown.
