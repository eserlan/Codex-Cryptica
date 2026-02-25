import { type SyncResult, type FileMetadata } from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { SyncService } from "./SyncService";
import { FileSystemBackend } from "./FileSystemBackend";
import { GDriveBackend } from "./GDriveBackend";

export class CloudSyncService {
  private service: SyncService;

  constructor(
    private registry: SyncRegistry,
    private gdrive: GDriveBackend,
  ) {
    this.service = new SyncService(registry);
  }

  async sync(
    vaultId: string,
    opfsHandle: FileSystemDirectoryHandle,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
    onProgress?: (stats: {
      updated: number;
      created: number;
      deleted: number;
      failed: number;
      total: number;
    }) => void,
  ): Promise<SyncResult> {
    const local = new FileSystemBackend(opfsHandle);

    const metadata = await this.registry.getCloudMetadata(vaultId);
    const sinceToken = metadata?.lastSyncToken;

    if (metadata?.gdriveFolderId && this.gdrive.setVaultFolderId) {
      this.gdrive.setVaultFolderId(metadata.gdriveFolderId);
    }

    const result = await this.service.sync(
      vaultId,
      local,
      this.gdrive,
      sinceToken,
      validator,
      onProgress,
    );

    if (result.nextToken) {
      await this.registry.putCloudMetadata({
        vaultId,
        gdriveFolderId: metadata?.gdriveFolderId || "root", // Default to root
        lastSyncToken: result.nextToken,
        lastSyncTime: Date.now(),
      });
    }

    return result;
  }
}
