# VaultStore Contract: Deletion

## Methods

### `deleteEntity(id: string): Promise<void>`
Permanently deletes an entity and cleans up all references.

**Inputs**:
- `id`: The unique identifier of the entity to delete.

**Pre-conditions**:
- User must be in Normal Mode (not Guest).
- Vault must be open and authorized.

**Post-conditions**:
- File `id.md` is removed from disk.
- Associated image and thumbnail files (if present in metadata) are removed from disk.
- Entity is removed from `this.entities`.
- All other entities referring to `id` are updated (connections removed).
- Search index is updated.
- `selectedEntityId` is nullified if it matched `id`.
