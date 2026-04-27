# Quickstart: Directional Vault Synchronization

## Developer Setup

### 1. Update Sync Engine
Ensure `packages/sync-engine` is updated with the new `SyncDirection` types.
```bash
cd packages/sync-engine
npm run build
```

### 2. Verify Store Dependencies
The `VaultLifecycleManager` and `SyncStore` in `apps/web` must be updated to handle the new `push()` and `pull()` methods.

## Manual Testing Flow

### Testing "Save to Folder" (Push)
1. Link a local folder to your vault in Settings.
2. Edit an entity (e.g., change the title).
3. Verify the "SAVE TO FOLDER" button becomes enabled.
4. Click "SAVE TO FOLDER".
5. Verify the button is disabled and the local file reflects your change.

### Testing "Load from Folder" (Pull)
1. Open a file from your linked folder in an external editor (Obsidian, etc.).
2. Modify and save the file.
3. In the app, open the Vault Switcher.
4. Click the "Load from Folder" icon next to the active vault.
5. Verify the app reflects the external change.

### Testing the Safety Gate
1. Edit an entity in the app (making it "Dirty").
2. Do NOT click Save.
3. Trigger "Load from Folder".
4. Verify a confirmation dialog appears warning of data loss.
5. Click "Cancel" and verify your internal changes are preserved.
