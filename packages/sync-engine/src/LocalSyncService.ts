import {
  type ILocalSyncService,
  type SyncResult,
  type FileMetadata,
} from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { DiffAlgorithm, type SyncAction } from "./DiffAlgorithm";

export class LocalSyncService implements ILocalSyncService {
  constructor(private registry: SyncRegistry) {}

  async sync(
    vaultId: string,
    localHandle: FileSystemDirectoryHandle,
    opfsHandle: FileSystemDirectoryHandle,
    validator?: (
      path: string,
      metadata: FileMetadata,
    ) => boolean | Promise<boolean>,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      updated: [],
      created: [],
      deleted: [],
      conflicts: [],
    };

    try {
      const localFiles = await this.scanHandle(localHandle);
      const opfsFiles = await this.scanHandle(opfsHandle);
      const registryEntries = await this.registry.getEntriesByVault(vaultId);

      const localMap = new Map(localFiles.map((f) => [f.path, f]));
      const opfsMap = new Map(opfsFiles.map((f) => [f.path, f]));
      const registryMap = new Map(registryEntries.map((e) => [e.filePath, e]));

      const allPaths = new Set([
        ...localMap.keys(),
        ...opfsMap.keys(),
        ...registryMap.keys(),
      ]);

      const actions: SyncAction[] = [];
      for (const path of allPaths) {
        const action = await DiffAlgorithm.calculateAction(
          path,
          localMap.get(path),
          opfsMap.get(path),
          registryMap.get(path),
          validator,
        );
        if (action.type !== "SKIP") {
          actions.push(action);
        }
      }

      const CONCURRENCY = 5;
      let nextActionIndex = 0;
      await Promise.all(
        Array.from({ length: CONCURRENCY }).map(async () => {
          while (nextActionIndex < actions.length) {
            const action = actions[nextActionIndex++];
            if (!action) continue;
            try {
              await this.executeAction(
                action,
                vaultId,
                localHandle,
                opfsHandle,
                result,
              );
            } catch (err) {
              console.error(
                `Failed to execute action for ${action.path}:`,
                err,
              );
              // Continue with other actions
            }
          }
        }),
      );

      // Cleanup registry for completely gone files
      for (const path of registryMap.keys()) {
        if (!localMap.has(path) && !opfsMap.has(path)) {
          await this.registry.deleteEntry(vaultId, path);
        }
      }
    } catch (e: any) {
      result.error = e.message;
    }

    return result;
  }

  async resetRegistry(vaultId: string): Promise<void> {
    await this.registry.clearVault(vaultId);
  }

  private async scanHandle(
    handle: FileSystemDirectoryHandle,
    path: string[] = [],
  ): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    for await (const entry of (handle as any).values()) {
      const currentPath = [...path, entry.name];
      if (entry.kind === "file") {
        const file = await entry.getFile();
        results.push({
          path: currentPath.join("/"),
          lastModified: file.lastModified,
          size: file.size,
          handle: entry,
        });
      } else if (entry.kind === "directory") {
        const subResults = await this.scanHandle(entry, currentPath);
        results.push(...subResults);
      }
    }
    return results;
  }

  private async executeAction(
    action: SyncAction,
    vaultId: string,
    localRoot: FileSystemDirectoryHandle,
    opfsRoot: FileSystemDirectoryHandle,
    result: SyncResult,
  ) {
    const pathParts = action.path.split("/");
    const fileName = pathParts.pop()!;
    const dirParts = pathParts;

    const getTargetHandle = async (
      root: FileSystemDirectoryHandle,
      create = false,
    ) => {
      let current = root;
      for (const part of dirParts) {
        current = await current.getDirectoryHandle(part, { create });
      }
      return current;
    };

    switch (action.type) {
      case "MATCH_INITIAL": {
        await this.registry.putEntry({
          filePath: action.path,
          vaultId,
          lastLocalModified: action.localMetadata!.lastModified,
          lastOpfsModified: action.opfsMetadata!.lastModified,
          size: action.localMetadata!.size,
          status: "SYNCED",
        });
        break;
      }

      case "CREATE_OPFS":
      case "UPDATE_OPFS": {
        const localFile = await action.localMetadata!.handle.getFile();
        const opfsDir = await getTargetHandle(opfsRoot, true);
        const opfsFileHandle = await opfsDir.getFileHandle(fileName, {
          create: true,
        });
        await this.writeFile(opfsFileHandle, localFile);

        const updatedOpfs = await opfsFileHandle.getFile();
        await this.registry.putEntry({
          filePath: action.path,
          vaultId,
          lastLocalModified: action.localMetadata!.lastModified,
          lastOpfsModified: updatedOpfs.lastModified,
          size: localFile.size,
          status: "SYNCED",
        });

        if (action.type === "CREATE_OPFS") result.created.push(action.path);
        else result.updated.push(action.path);
        break;
      }

      case "CREATE_LOCAL":
      case "UPDATE_LOCAL": {
        const opfsFile = await action.opfsMetadata!.handle.getFile();
        const localDir = await getTargetHandle(localRoot, true);
        const localFileHandle = await localDir.getFileHandle(fileName, {
          create: true,
        });
        await this.writeFile(localFileHandle, opfsFile);

        const updatedLocal = await localFileHandle.getFile();
        await this.registry.putEntry({
          filePath: action.path,
          vaultId,
          lastLocalModified: updatedLocal.lastModified,
          lastOpfsModified: action.opfsMetadata!.lastModified,
          size: opfsFile.size,
          status: "SYNCED",
        });

        if (action.type === "CREATE_LOCAL") result.created.push(action.path);
        else result.updated.push(action.path);
        break;
      }

      case "DELETE_OPFS": {
        const opfsDir = await getTargetHandle(opfsRoot, false);
        await opfsDir.removeEntry(fileName);
        await this.registry.deleteEntry(vaultId, action.path);
        result.deleted.push(action.path);
        break;
      }

      case "DELETE_LOCAL": {
        const localDir = await getTargetHandle(localRoot, false);
        await localDir.removeEntry(fileName);
        await this.registry.deleteEntry(vaultId, action.path);
        result.deleted.push(action.path);
        break;
      }
    }

    if (action.isConflict) {
      result.conflicts.push(action.path);
    }
  }

  private async writeFile(handle: FileSystemFileHandle, data: Blob) {
    const writable = await (handle as any).createWritable({
      keepExistingData: false,
    });
    try {
      await writable.write(data);
      await writable.close();
    } catch (err) {
      await writable.abort();
      throw err;
    }
  }
}
