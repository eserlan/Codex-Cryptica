import {
  type ISyncBackend,
  type SyncResult,
  type FileMetadata,
  type SyncEntry,
} from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { DiffAlgorithm, type SyncAction } from "./DiffAlgorithm";
import { FileSystemBackend } from "./FileSystemBackend";

export class SyncService {
  constructor(protected registry: SyncRegistry) {}

  async sync(
    vaultId: string,
    local: ISyncBackend,
    remote: ISyncBackend,
    sinceToken?: string | null,
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
  ): Promise<SyncResult & { nextToken?: string }> {
    const result: SyncResult & { nextToken?: string } = {
      updated: [],
      created: [],
      deleted: [],
      conflicts: [],
      failed: [],
    };

    try {
      console.log(`[Sync] Starting sync cycle for vault: ${vaultId}`);
      const localScan = await local.scan(vaultId);
      const remoteScan = await remote.scan(vaultId, sinceToken);
      const registryEntries = await this.registry.getEntriesByVault(vaultId);

      console.log(
        `[Sync] Scan results: Local=${localScan.files.length}, Remote=${remoteScan.files.length}, Registry=${registryEntries.length}`,
      );
      result.nextToken = remoteScan.nextToken;

      // 1. Deduplicate remote changes by handle if they are strings (Cloud IDs)
      const remoteFilesById = new Map<string, FileMetadata>();
      const otherRemoteFiles: FileMetadata[] = [];

      for (const f of remoteScan.files) {
        if (typeof f.handle === "string") {
          remoteFilesById.set(f.handle, f);
        } else {
          otherRemoteFiles.push(f);
        }
      }

      // 2. Resolve paths for "unknown" files (deletions)
      const resolvedRemoteFiles = await Promise.all(
        Array.from(remoteFilesById.values()).map(async (f) => {
          if (f.path === "unknown" && typeof f.handle === "string") {
            const entry = await this.registry.getEntryByRemoteId(f.handle);
            if (entry) return { ...f, path: entry.filePath };
          }
          return f;
        }),
      );

      const remoteFiles = [...resolvedRemoteFiles, ...otherRemoteFiles];

      const localFiles = localScan.files;
      const localMap = new Map(localFiles.map((f) => [f.path, f]));
      const remoteMap = new Map(remoteFiles.map((f) => [f.path, f]));
      const registryMap = new Map(registryEntries.map((e) => [e.filePath, e]));

      const isDeltaSync = sinceToken !== undefined && sinceToken !== null;
      const allPaths = new Set([
        ...localMap.keys(),
        ...remoteMap.keys(),
        ...registryMap.keys(),
      ]);

      const actions: SyncAction[] = [];
      for (const path of allPaths) {
        let remoteMetadata = remoteMap.get(path);
        const registryEntry = registryMap.get(path);

        const isRemoteDeleted = remoteMetadata?.isDeleted;

        // In delta sync, if a file is missing from the remote scan but exists in our registry,
        // it means the file has NOT changed on the remote side.
        if (
          isDeltaSync &&
          !remoteMetadata &&
          !isRemoteDeleted &&
          registryEntry?.remoteId
        ) {
          remoteMetadata = {
            path,
            lastModified: registryEntry.lastOpfsModified,
            size: registryEntry.size,
            handle: registryEntry.remoteId,
            hash: registryEntry.remoteHash,
          };
        }

        const action = await DiffAlgorithm.calculateAction(
          path,
          localMap.get(path),
          remoteMetadata,
          registryEntry,
          validator,
        );
        if (action.type !== "SKIP") {
          actions.push(action);
        }
      }

      console.log(`[Sync] Calculated ${actions.length} actions to perform.`);

      const totalActions = actions.length;
      let _completedActions = 0;

      const updateProgress = () => {
        if (onProgress) {
          onProgress({
            updated: result.updated.length,
            created: result.created.length,
            deleted: result.deleted.length,
            failed: result.failed.length,
            total: totalActions,
          });
        }
      };

      const CONCURRENCY = 5;
      let nextActionIndex = 0;
      await Promise.all(
        Array.from({ length: CONCURRENCY }).map(async () => {
          while (nextActionIndex < actions.length) {
            const action = actions[nextActionIndex++];
            if (!action) continue;
            try {
              await this.executeAction(action, vaultId, local, remote, result);
            } catch (err: any) {
              result.failed.push({ path: action.path, error: err.message });
            } finally {
              _completedActions++;
              updateProgress();
            }
          }
        }),
      );

      // Cleanup registry for completely gone files (Only during full sync)
      if (!isDeltaSync) {
        for (const path of registryMap.keys()) {
          if (!localMap.has(path) && !remoteMap.has(path)) {
            await this.registry.deleteEntry(vaultId, path);
          }
        }
      }
    } catch (e: any) {
      result.error = e.message;
    }

    return result;
  }

  protected async executeAction(
    action: SyncAction,
    vaultId: string,
    local: ISyncBackend,
    remote: ISyncBackend,
    result: SyncResult,
  ) {
    try {
      switch (action.type) {
        case "MATCH_INITIAL": {
          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastLocalModified: action.localMetadata!.lastModified,
            lastOpfsModified: action.opfsMetadata!.lastModified,
            size: action.localMetadata!.size,
            status: "SYNCED",
            remoteId: this.getSerializableId(action.opfsMetadata!, remote),
            remoteHash: action.opfsMetadata?.hash,
          });
          break;
        }

        case "CREATE_OPFS":
        case "UPDATE_OPFS": {
          const localContent = await local.download(
            action.path,
            typeof action.localMetadata?.handle === "string"
              ? action.localMetadata.handle
              : undefined,
          );
          const updatedRemote = await remote.upload(
            action.path,
            localContent,
            typeof action.opfsMetadata?.handle === "string"
              ? action.opfsMetadata.handle
              : undefined,
          );

          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastLocalModified: action.localMetadata!.lastModified,
            lastOpfsModified: updatedRemote.lastModified,
            size: updatedRemote.size,
            status: "SYNCED",
            remoteId: this.getSerializableId(
              updatedRemote,
              remote,
              action.registryEntry,
            ),
            remoteHash: updatedRemote.hash,
          });

          if (action.type === "CREATE_OPFS") result.created.push(action.path);
          else result.updated.push(action.path);
          break;
        }

        case "CREATE_LOCAL":
        case "UPDATE_LOCAL": {
          const remoteContent = await remote.download(
            action.path,
            typeof action.opfsMetadata?.handle === "string"
              ? action.opfsMetadata.handle
              : undefined,
          );
          const updatedLocal = await local.upload(
            action.path,
            remoteContent,
            typeof action.localMetadata?.handle === "string"
              ? action.localMetadata.handle
              : undefined,
          );

          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastLocalModified: updatedLocal.lastModified,
            lastOpfsModified: action.opfsMetadata!.lastModified,
            size: updatedLocal.size,
            status: "SYNCED",
            remoteId: this.getSerializableId(
              action.opfsMetadata!,
              remote,
              action.registryEntry,
            ),
            remoteHash: action.opfsMetadata?.hash,
          });

          if (action.type === "CREATE_LOCAL") result.created.push(action.path);
          else result.updated.push(action.path);
          break;
        }

        case "DELETE_OPFS": {
          await remote.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          result.deleted.push(action.path);
          break;
        }

        case "DELETE_LOCAL": {
          await local.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          result.deleted.push(action.path);
          break;
        }
      }

      if (action.isConflict) {
        result.conflicts.push(action.path);
      }
    } catch (err: any) {
      console.error(`[Sync] Error processing ${action.path}:`, err);
      throw err; // Re-throw to be caught by the orchestrator loop
    }
  }

  private getSerializableId(
    metadata: FileMetadata,
    backend: ISyncBackend,
    registryEntry?: SyncEntry,
  ): string | undefined {
    return typeof metadata.handle === "string"
      ? metadata.handle
      : backend instanceof FileSystemBackend
        ? undefined
        : registryEntry?.remoteId;
  }
}
