# Data Model: GDrive Multi-Vault Support

## 1. Vault Registry Entry (`VaultMetadata`)

The existing `VaultMetadata` interface in the shared schema package will be extended to support per-vault GDrive syncing.

```typescript
// packages/schema/src/vault.ts

export interface VaultMetadata {
  id: string; // Unique local identifier (UUID)
  name: string; // User-facing name
  createdAt: number;
  lastAccessedAt: number;

  // -- NEW FIELDS FOR 053-gdrive-multi-vault --
  gdriveSyncEnabled: boolean; // Is sync currently enabled for this vault?
  gdriveFolderId: string | null; // The Google Drive Folder ID associated with this vault. null if never linked.

  // Sync state tracking per vault
  syncState: {
    lastSyncMs: number | null; // Timestamp of the last successful sync operation
    remoteHash: string | null; // Hash of the remote state for conflict detection
    status: "idle" | "syncing" | "error"; // Current ephemeral status (might reside in UI state instead of IDB)
  };
}
```

### Validations & Constraints

- `gdriveFolderId` must be unique across all local `VaultMetadata` entries. If a user attempts to link Vault B to a `gdriveFolderId` already claimed by Vault A, the system must throw a `ConflictError`.
- If `gdriveSyncEnabled` is `true`, `gdriveFolderId` MUST NOT be `null`.
- When a vault is locally deleted, its `VaultMetadata` entry is removed, effectively unlinking it.

## 2. API Contracts (`SyncEngine`)

The sync engine interface needs to be updated or created to handle operations contextually based on the active vault's metadata.

```typescript
// packages/editor-core/src/sync/engine.ts (or equivalent location)

export interface SyncEngineContext {
  vaultId: string;
  gdriveFolderId: string;
}

export interface SyncEngine {
  /**
   * Initializes or links a vault to a specific GDrive folder.
   * @param vaultId The local vault ID
   * @param folderId The remote GDrive folder ID
   * @throws {ConflictError} if the folderId is already linked to another local vault
   */
  linkVaultToDrive(vaultId: string, folderId: string): Promise<void>;

  /**
   * Disconnects a vault from GDrive sync.
   * @param vaultId The local vault ID
   */
  unlinkVaultFromDrive(vaultId: string): Promise<void>;

  /**
   * Performs a full synchronization (pull/push/merge) for the active vault context.
   * @param context The active vault's ID and its associated GDrive folder ID
   * @returns The updated sync state (timestamp, hash)
   */
  synchronize(context: SyncEngineContext): Promise<VaultMetadata["syncState"]>;
}
```

## 3. Storage

- **Database**: IndexedDB (Browser Native) via `idb` wrapper.
- **Store Name**: `vault_registry`
- **Key Path**: `id`

No structural changes to the OPFS file storage are required for this feature, as it purely dictates _where_ the files are synced to remotely.
