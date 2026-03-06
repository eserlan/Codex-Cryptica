import {
  type ILocalSyncService,
  type SyncResult,
  type FileMetadata,
} from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { SyncService } from "./SyncService";
import { FileSystemBackend } from "./FileSystemBackend";
import { OpfsBackend } from "./OpfsBackend";

export class LocalSyncService implements ILocalSyncService {
  private service: SyncService;

  constructor(private registry: SyncRegistry) {
    this.service = new SyncService(registry);
  }

  async sync(
    vaultId: string,
    localHandle: FileSystemDirectoryHandle,
    opfsHandle: FileSystemDirectoryHandle,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
  ): Promise<SyncResult> {
    const local = new FileSystemBackend(localHandle);
    const remote = new OpfsBackend(opfsHandle, this.registry);
    return this.service.sync(vaultId, local, remote, null, validator);
  }

  async resetRegistry(vaultId: string): Promise<void> {
    await this.registry.clearVault(vaultId);
  }
}
