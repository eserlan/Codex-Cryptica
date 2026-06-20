import { type CloudSyncMetadata } from "./types";
import { SyncRegistry } from "./SyncRegistry";

/**
 * Manages the persistence of Google Drive connection metadata (folder IDs, sync timestamps).
 * Wraps SyncRegistry to provide a higher-level API for connection management.
 */
export class CloudSyncMetadataService {
  constructor(
    private readonly registry: SyncRegistry,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Retrieves metadata for a specific vault.
   */
  async getMetadata(vaultId: string): Promise<CloudSyncMetadata | undefined> {
    return this.registry.getCloudMetadata(vaultId);
  }

  /**
   * Persists connection metadata for a vault.
   */
  async saveMetadata(metadata: CloudSyncMetadata): Promise<void> {
    await this.registry.putCloudMetadata(metadata);
  }

  /**
   * Removes Drive connection metadata for a vault (disconnects Drive).
   */
  async clearMetadata(vaultId: string): Promise<void> {
    await this.registry.deleteCloudMetadata(vaultId);
  }

  /**
   * Updates the last sync timestamp for a vault.
   */
  async updateLastSync(
    vaultId: string,
    token: string | null = null,
  ): Promise<void> {
    const existing = await this.getMetadata(vaultId);
    if (!existing) return;

    await this.saveMetadata({
      ...existing,
      lastSyncTime: this.now(),
      lastSyncToken: token || existing.lastSyncToken,
    });
  }
}
