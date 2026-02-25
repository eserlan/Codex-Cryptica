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
  ): Promise<SyncResult> {
    const local = new FileSystemBackend(opfsHandle);

    const metadata = await this.registry.getCloudMetadata(vaultId);
    const sinceToken = metadata?.lastSyncToken;

    const result = await this.service.sync(
      vaultId,
      local,
      this.gdrive,
      sinceToken,
      validator,
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
