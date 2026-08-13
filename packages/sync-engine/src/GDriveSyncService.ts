import { type AppEventBus } from "@codex/events";
import { SyncService } from "./SyncService";
import { type GDriveBackend } from "./GDriveBackend";
import { type OpfsBackend } from "./OpfsBackend";
import { type CloudSyncMetadataService } from "./CloudSyncMetadataService";
import { type Clock, systemClock } from "./runtime";

export interface GDriveSyncDependencies {
  /**
   * Resolves the OPFS directory handle for a specific vault.
   */
  getOpfsHandle: (
    vaultId: string,
  ) => Promise<FileSystemDirectoryHandle | undefined>;
  /**
   * Returns the current time in milliseconds.
   */
  clock?: Clock;
}

/**
 * Orchestrates Google Drive synchronization.
 * Provides explicit push/pull operations to mirror vault content to/from the cloud.
 */
export class GDriveSyncService {
  private syncActive = false;
  private readonly channel: BroadcastChannel | null = null;
  private lastTabSync: number = 0;

  constructor(
    private readonly eventBus: AppEventBus,
    private readonly syncService: SyncService,
    private readonly metadataService: CloudSyncMetadataService,
    private readonly driveBackend: GDriveBackend,
    private readonly opfsBackend: OpfsBackend,
    private readonly deps: GDriveSyncDependencies,
  ) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel("codex_gdrive_sync_guard");
      this.channel.onmessage = (msg) => {
        if (msg.data.type === "SYNC_START") {
          this.lastTabSync = this.getNow();
        }
      };
    }
  }

  private getNow(): number {
    return (this.deps.clock ?? systemClock).now();
  }

  private isAnotherTabSyncing(): boolean {
    return this.getNow() - this.lastTabSync < 30000; // 30s grace period
  }

  /**
   * Pushes the current OPFS state to Google Drive.
   */
  async push(vaultId: string) {
    console.log(`[GDriveSync] push() called for vault: ${vaultId}`);
    if (this.syncActive || this.isAnotherTabSyncing()) {
      console.log(
        `[GDriveSync] push() skipped: syncActive=${this.syncActive}, isAnotherTabSyncing=${this.isAnotherTabSyncing()}`,
      );
      return;
    }

    const metadata = await this.metadataService.getMetadata(vaultId);
    if (!metadata || !metadata.remoteFolderId) {
      throw new Error("Google Drive not connected for this vault");
    }

    const opfsHandle = await this.deps.getOpfsHandle(vaultId);
    if (!opfsHandle) {
      throw new Error("Failed to resolve vault storage handle");
    }

    this.syncActive = true;
    this.channel?.postMessage({ type: "SYNC_START", vaultId });

    this.eventBus.emit({
      type: "SYNC:DRIVE_SYNC_STARTED",
      domain: "sync",
      payload: { vaultId, direction: "push" },
      metadata: { timestamp: this.getNow(), vaultId },
    });

    try {
      this.driveBackend.setVaultFolderId(metadata.remoteFolderId);
      this.opfsBackend.setHandle(opfsHandle);

      // Drive acts as the 'fsBackend' (external target) while OPFS is 'opfsBackend' (local master)
      const result = await this.syncService.sync(
        vaultId,
        this.driveBackend,
        this.opfsBackend,
        "push",
      );

      if (result.error) {
        this.eventBus.emit({
          type: "SYNC:DRIVE_SYNC_FAILED",
          domain: "sync",
          payload: { vaultId, error: result.error },
          metadata: { timestamp: this.getNow(), vaultId },
        });
        throw new Error(result.error);
      } else {
        await this.metadataService.updateLastSync(vaultId);
        this.eventBus.emit({
          type: "SYNC:DRIVE_PUSH_COMPLETE",
          domain: "sync",
          payload: {
            vaultId,
            uploaded: result.created.length + result.updated.length,
            failed: result.failed.length,
          },
          metadata: { timestamp: this.getNow(), vaultId },
        });
        return result;
      }
    } catch (error: any) {
      this.eventBus.emit({
        type: "SYNC:DRIVE_SYNC_FAILED",
        domain: "sync",
        payload: { vaultId, error: error.message },
        metadata: { timestamp: this.getNow(), vaultId },
      });
      throw error;
    } finally {
      this.syncActive = false;
    }
  }

  /**
   * Pulls content from Google Drive into OPFS.
   */
  async pull(vaultId: string) {
    console.log(`[GDriveSync] pull() called for vault: ${vaultId}`);
    if (this.syncActive || this.isAnotherTabSyncing()) {
      console.log(
        `[GDriveSync] pull() skipped: syncActive=${this.syncActive}, isAnotherTabSyncing=${this.isAnotherTabSyncing()}`,
      );
      return;
    }

    const metadata = await this.metadataService.getMetadata(vaultId);
    if (!metadata || !metadata.remoteFolderId) {
      throw new Error("Google Drive not connected for this vault");
    }

    const opfsHandle = await this.deps.getOpfsHandle(vaultId);
    if (!opfsHandle) {
      throw new Error("Failed to resolve vault storage handle");
    }

    this.syncActive = true;
    this.channel?.postMessage({ type: "SYNC_START", vaultId });

    this.eventBus.emit({
      type: "SYNC:DRIVE_SYNC_STARTED",
      domain: "sync",
      payload: { vaultId, direction: "pull" },
      metadata: { timestamp: this.getNow(), vaultId },
    });

    try {
      this.driveBackend.setVaultFolderId(metadata.remoteFolderId);
      this.opfsBackend.setHandle(opfsHandle);

      const result = await this.syncService.sync(
        vaultId,
        this.driveBackend,
        this.opfsBackend,
        "pull",
      );

      if (result.error) {
        this.eventBus.emit({
          type: "SYNC:DRIVE_SYNC_FAILED",
          domain: "sync",
          payload: { vaultId, error: result.error },
          metadata: { timestamp: this.getNow(), vaultId },
        });
        throw new Error(result.error);
      } else {
        await this.metadataService.updateLastSync(vaultId);
        this.eventBus.emit({
          type: "SYNC:DRIVE_PULL_COMPLETE",
          domain: "sync",
          payload: {
            vaultId,
            downloaded: result.created.length + result.updated.length,
            failed: result.failed.length,
          },
          metadata: { timestamp: this.getNow(), vaultId },
        });
        return result;
      }
    } catch (error: any) {
      this.eventBus.emit({
        type: "SYNC:DRIVE_SYNC_FAILED",
        domain: "sync",
        payload: { vaultId, error: error.message },
        metadata: { timestamp: this.getNow(), vaultId },
      });
      throw error;
    } finally {
      this.syncActive = false;
    }
  }

  /**
   * Cleans up resources.
   */
  destroy() {
    this.channel?.close();
  }
}
