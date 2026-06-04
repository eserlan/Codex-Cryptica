# Data Model: Hierarchical Nested Entities

This document defines the schema changes, validation constraints, and state transitions for the hierarchical entity explorer.

## Schema Changes

### Entity Metadata Schema

We extend `EntitySchema` in `packages/schema/src/entity.ts` with the optional `parent` field:

```typescript
export const EntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  title: z.string().min(1),
  // ... existing fields ...
  parent: z.string().optional(), // New field: points to parent's Entity.id
});
```

The Markdown parser and stringifier will automatically load and serialize this field to/from the frontmatter of `.md` files:

```yaml
---
id: waterdeep
type: location
title: Waterdeep
parent: sword-coast
---
Markdown content here...
```

---

## Validation Constraints

1. **Cycle Prevention**:
   - An entity's `parent` MUST NOT be equal to its own `id`.
   - An entity's `parent` MUST NOT be set to any of its own descendant entities.
   - Checked via `hasParentCycle(entityId: string, potentialParentId: string, entities: Record<string, Entity>): boolean`.

2. **Dangling Parent Check**:
   - If an entity's `parent` references an ID that does not exist in the vault, the entity is treated as a root-level entity (dangling reference is resolved gracefully at runtime by ignoring it, but keeping the field intact in case of sync delays).

---

## State Transitions

### 1. Creation

- When creating a child entity:
  - `parent` is set to the parent entity's `id`.
  - The child is saved to disk with `parent: parentId` in its YAML frontmatter.

### 2. Moving / Re-parenting

- When moving entity `X` to be under entity `Y`:
  - Verify `!hasParentCycle(X, Y, entities)`.
  - Set `X.parent = Y`.
  - Update `X` on disk and memory.

### 3. Deletion

- When deleting a parent entity `Y`:
  - For all child entities `C` where `C.parent === Y`:
    - Set `C.parent = undefined`.
    - Update `C` on disk and memory.
