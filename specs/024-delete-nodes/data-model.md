# Data Model: Node Deletion

## Deletion Flow

1. **Trigger**: User initiates deletion of Entity `E1`.
2. **Safety**: System prompts for confirmation.
3. **Internal State Removal**:
   - Remove `E1` from `vault.entities`.
   - Remove `E1` from search index.
   - Reset `vault.selectedEntityId` if it was `E1`.
4. **Relational Cleanup**:
   - Find all entities `{E_ref}` that have an outbound connection to `E1`.
   - For each `E_ref`, remove the connection to `E1` from its `connections` array.
   - Schedule a save for each modified `E_ref`.
5. **Persistence**:
   - Remove `E1.md` from the file system.
   - Remove associated image and thumbnail files (if any) from the `images/` directory.
   - Clear `E1` from IndexedDB cache.
   
   ## Asset Replacement Flow
   
   1. **Trigger**: User generates or uploads a new image for Entity `E1`.
   2. **Identification**: System identifies current `image` and `thumbnail` paths in `E1` metadata.
   3. **New Asset Storage**: System saves the new image and thumbnail files.
   4. **Cleanup**: System deletes the *old* image and thumbnail files identified in step 2.
   5. **Update**: System updates `E1` metadata with the new paths.
