# Data Model: Approve Draft Entities

The underlying entity schema already supports `status: z.enum(["active", "draft"])`. No schema changes are required.

## Actions

### Approve Draft

Transitions an entity from `draft` to `active`.

- **Function**: `vault.updateEntity(id, { status: "active" })`
- **Result**: Entity disappears from the "Review" tab (which filters for `draft`) and becomes a standard entity.

### Reject Draft

Deletes the entity permanently.

- **Function**: `vault.deleteEntity(id)`
- **Result**: Entity is removed from the store and all UI lists.
