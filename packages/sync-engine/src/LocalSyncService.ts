import {
  type ILocalSyncService,
  type SyncResult,
  type FileMetadata,
} from "./types";
import { type SyncDirection } from "schema";
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
    direction: SyncDirection = "pull",
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
    signal?: AbortSignal,
  ): Promise<SyncResult> {
    const local = new FileSystemBackend(localHandle);
    const remote = new OpfsBackend(opfsHandle, this.registry);
    return this.service.sync(
      vaultId,
      local,
      remote,
      direction,
      undefined,
      validator,
      onProgress,
      signal,
    );
  }

  async resetRegistry(vaultId: string): Promise<void> {
    await this.registry.clearVault(vaultId);
  }
}
