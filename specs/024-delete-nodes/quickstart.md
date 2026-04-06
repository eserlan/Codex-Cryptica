# Quickstart: Deleting Nodes

## Implementation Steps

1. **Update VaultStore**:
   - Refactor `deleteEntity` in `apps/web/src/lib/stores/vault.svelte.ts` to include relational cleanup.
   - Iterate over `this.inboundConnections[id]` and for each source, remove the connection from its metadata.

2. **UI Button**:
   - Add a "Delete" button to `EntityDetailPanel.svelte`.
   - Implement `handleDelete` with a `confirm()` prompt.

3. **Asset Cleanup**:
   - Update `saveImageToVault` in `VaultStore` to check for existing `image` and `thumbnail` paths in the entity and delete those files before updating with new paths.

4. **Validation**:
   - Run `apps/web/src/lib/stores/vault.test.ts` to verify basic deletion.
   - Add a new test case for relational cleanup.
