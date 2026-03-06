import {
  type ISyncBackend,
  type SyncResult,
  type FileMetadata,
  type SyncEntry,
} from "./types";
import { SyncRegistry } from "./SyncRegistry";
import { DiffAlgorithm, type SyncAction } from "./DiffAlgorithm";
import { FileSystemBackend } from "./FileSystemBackend";
import { OpfsBackend } from "./OpfsBackend";

export class SyncService {
  constructor(protected registry: SyncRegistry) {}

  async sync(
    vaultId: string,
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
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
      const fsScan = await fsBackend.scan(vaultId);
      const opfsScan = await opfsBackend.scan(vaultId, sinceToken);
      const registryEntries = await this.registry.getEntriesByVault(vaultId);

      result.nextToken = opfsScan.nextToken;

      // 1. Deduplicate remote changes by handle if they are strings (Cloud IDs)
      const opfsFilesById = new Map<string, FileMetadata>();
      const otherOpfsFiles: FileMetadata[] = [];

      for (const f of opfsScan.files) {
        if (typeof f.handle === "string") {
          opfsFilesById.set(f.handle, f);
        } else {
          otherOpfsFiles.push(f);
        }
      }

      // 2. Resolve paths for "unknown" files (deletions)
      const resolvedOpfsFiles = await Promise.all(
        Array.from(opfsFilesById.values()).map(async (f) => {
          if (f.path === "unknown" && typeof f.handle === "string") {
            const entry = await this.registry.getEntryByRemoteId(f.handle);
            if (entry) return { ...f, path: entry.filePath };
          }
          return f;
        }),
      );

      const opfsFiles = [...resolvedOpfsFiles, ...otherOpfsFiles];

      const fsFiles = fsScan.files;
      const fsMap = new Map(fsFiles.map((f) => [f.path, f]));
      const opfsMap = new Map(opfsFiles.map((f) => [f.path, f]));
      const registryMap = new Map(registryEntries.map((e) => [e.filePath, e]));

      const isDeltaSync = sinceToken !== undefined && sinceToken !== null;
      const allPaths = new Set([
        ...fsMap.keys(),
        ...opfsMap.keys(),
        ...registryMap.keys(),
      ]);

      const actions: SyncAction[] = [];
      for (const path of allPaths) {
        let opfsMetadata = opfsMap.get(path);
        const registryEntry = registryMap.get(path);

        const isOpfsDeleted = opfsMetadata?.isDeleted;

        // In delta sync, if a file is missing from the remote scan but exists in our registry,
        // it means the file has NOT changed on the remote side.
        if (
          isDeltaSync &&
          !opfsMetadata &&
          !isOpfsDeleted &&
          registryEntry?.remoteId
        ) {
          opfsMetadata = {
            path,
            lastModified: Date.now(), // OPFS doesn't give real mtimes
            size: registryEntry.lastSyncedFsSize || 0, // Fallback
            handle: registryEntry.remoteId,
            hash: registryEntry.lastSyncedOpfsHash,
          };
        }

        const action = await DiffAlgorithm.calculateAction(
          path,
          fsMap.get(path),
          opfsMetadata,
          registryEntry,
          validator,
        );
        if (action.type !== "SKIP") {
          actions.push(action);
        }
      }

      const totalActions = actions.length;

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

      const CONCURRENCY = 1; // Strict sequential for reliability on large local vaults
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
                fsBackend,
                opfsBackend,
                result,
              );
            } catch (err: any) {
              result.failed.push({ path: action.path, error: err.message });
            } finally {
              updateProgress();
            }
          }
        }),
      );

      // Cleanup registry for completely gone files (Only during full sync)
      if (!isDeltaSync) {
        for (const path of registryMap.keys()) {
          if (!fsMap.has(path) && !opfsMap.has(path)) {
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
    fsBackend: ISyncBackend,
    opfsBackend: ISyncBackend,
    result: SyncResult,
  ) {
    try {
      switch (action.type) {
        case "MATCH_INITIAL": {
          await this.persistOpfsStateIfNeeded(
            vaultId,
            fsBackend,
            action.path,
            action.fsMetadata!,
          );
          await this.persistOpfsStateIfNeeded(
            vaultId,
            opfsBackend,
            action.path,
            action.opfsMetadata!,
          );
          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastSyncedFsModified: action.fsMetadata!.lastModified,
            lastSyncedFsSize: action.fsMetadata!.size,
            lastSyncedOpfsHash: action.opfsMetadata!.hash,
            status: "SYNCED",
            remoteId: this.getSerializableId(action.opfsMetadata!, opfsBackend),
          });
          break;
        }

        case "EXPORT_TO_FS": {
          const opfsContent = await opfsBackend.download(
            action.path,
            typeof action.opfsMetadata?.handle === "string"
              ? action.opfsMetadata.handle
              : undefined,
          );

          let shouldUpload = true;

          // CONTENT EQUALITY FAST-PATH
          if (
            action.fsMetadata &&
            action.fsMetadata.size === opfsContent.size
          ) {
            try {
              const fsContent = await fsBackend.download(
                action.path,
                typeof action.fsMetadata?.handle === "string"
                  ? action.fsMetadata.handle
                  : undefined,
              );

              if (
                action.path.endsWith(".md") ||
                action.path.endsWith(".markdown")
              ) {
                const fsText = await fsContent.text();
                const opfsText = await opfsContent.text();
                if (fsText === opfsText) {
                  shouldUpload = false;
                  console.log(
                    `[Sync] Fast-Path: Contents of ${action.path} are identical. Skipping export to FS.`,
                  );
                }
              }
            } catch {
              /* ignore */
            }
          }

          const updatedFs = shouldUpload
            ? await fsBackend.upload(
                action.path,
                opfsContent,
                typeof action.fsMetadata?.handle === "string"
                  ? action.fsMetadata.handle
                  : undefined,
              )
            : action.fsMetadata!;

          await this.persistOpfsStateIfNeeded(
            vaultId,
            fsBackend,
            action.path,
            updatedFs,
          );

          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastSyncedFsModified: updatedFs.lastModified,
            lastSyncedFsSize: updatedFs.size,
            lastSyncedOpfsHash: action.opfsMetadata!.hash, // Ideally we calculate a real hash here if missing
            status: "SYNCED",
            remoteId: this.getSerializableId(
              action.opfsMetadata!,
              opfsBackend,
              action.registryEntry,
            ),
          });

          if (shouldUpload) {
            if (!action.registryEntry) result.created.push(action.path);
            else result.updated.push(action.path);
          }
          break;
        }

        case "IMPORT_TO_OPFS": {
          const fsContent = await fsBackend.download(
            action.path,
            typeof action.fsMetadata?.handle === "string"
              ? action.fsMetadata.handle
              : undefined,
          );

          let shouldUpload = true;

          if (
            action.opfsMetadata &&
            action.opfsMetadata.size === fsContent.size
          ) {
            try {
              const opfsContent = await opfsBackend.download(
                action.path,
                typeof action.opfsMetadata?.handle === "string"
                  ? action.opfsMetadata.handle
                  : undefined,
              );

              if (
                action.path.endsWith(".md") ||
                action.path.endsWith(".markdown")
              ) {
                const fsText = await fsContent.text();
                const opfsText = await opfsContent.text();
                if (fsText === opfsText) {
                  shouldUpload = false;
                  console.log(
                    `[Sync] Fast-Path: Contents of ${action.path} are identical. Skipping import to OPFS.`,
                  );
                }
              }
            } catch {
              /* ignore */
            }
          }

          const updatedOpfs = shouldUpload
            ? await opfsBackend.upload(
                action.path,
                fsContent,
                typeof action.opfsMetadata?.handle === "string"
                  ? action.opfsMetadata.handle
                  : undefined,
              )
            : action.opfsMetadata!;

          await this.persistOpfsStateIfNeeded(
            vaultId,
            opfsBackend,
            action.path,
            updatedOpfs,
          );

          await this.registry.putEntry({
            filePath: action.path,
            vaultId,
            lastSyncedFsModified: action.fsMetadata!.lastModified,
            lastSyncedFsSize: action.fsMetadata!.size,
            lastSyncedOpfsHash: updatedOpfs.hash,
            status: "SYNCED",
            remoteId: this.getSerializableId(
              updatedOpfs,
              opfsBackend,
              action.registryEntry,
            ),
          });

          if (shouldUpload) {
            if (!action.registryEntry) result.created.push(action.path);
            else result.updated.push(action.path);
          }
          break;
        }

        case "HANDLE_CONFLICT": {
          // Default Conflict Strategy: Create Conflict Copy (FS content to OPFS with timestamp)
          const fsContent = await fsBackend.download(
            action.path,
            typeof action.fsMetadata?.handle === "string"
              ? action.fsMetadata.handle
              : undefined,
          );

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const extIndex = action.path.lastIndexOf(".");
          const basePath =
            extIndex !== -1 ? action.path.substring(0, extIndex) : action.path;
          const ext = extIndex !== -1 ? action.path.substring(extIndex) : "";
          const conflictPath = `${basePath}.conflict-${timestamp}${ext}`;

          const conflictFile = await opfsBackend.upload(
            conflictPath,
            fsContent,
          );
          await this.persistOpfsStateIfNeeded(
            vaultId,
            opfsBackend,
            conflictPath,
            conflictFile,
          );

          // We don't update the registry for the main path because it's still conflicting until resolved manually,
          // but we effectively "imported" the remote changes safely.
          result.conflicts.push(action.path);
          break;
        }

        case "DELETE_FS": {
          await fsBackend.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          await this.deleteOpfsStateIfNeeded(vaultId, fsBackend, action.path);
          result.deleted.push(action.path);
          break;
        }

        case "DELETE_OPFS": {
          await opfsBackend.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          await this.deleteOpfsStateIfNeeded(vaultId, opfsBackend, action.path);
          result.deleted.push(action.path);
          break;
        }
      }
      if (action.isConflict && action.type !== "HANDLE_CONFLICT") {
        result.conflicts.push(action.path);
      }
    } catch (err: any) {
      console.error(
        `[Sync] Error processing ${action.path} (${action.type}):`,
        err,
      );
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

  private async persistOpfsStateIfNeeded(
    vaultId: string,
    backend: ISyncBackend,
    path: string,
    metadata: FileMetadata,
  ) {
    if (!(backend instanceof OpfsBackend) || !metadata.hash) return;

    await this.registry.putOpfsState({
      vaultId,
      filePath: path,
      hash: metadata.hash,
      size: metadata.size,
      lastModified: metadata.lastModified,
    });
  }

  private async deleteOpfsStateIfNeeded(
    vaultId: string,
    backend: ISyncBackend,
    path: string,
  ) {
    if (!(backend instanceof OpfsBackend)) return;
    await this.registry.deleteOpfsState(vaultId, path);
  }
}
