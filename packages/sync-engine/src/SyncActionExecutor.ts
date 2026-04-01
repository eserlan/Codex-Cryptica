import { SyncContentComparator } from "./SyncContentComparator";
import { SyncPersistence } from "./SyncPersistence";
import { SyncRegistry } from "./SyncRegistry";
import { type ISyncBackend, type SyncResult } from "./types";
import { type SyncAction } from "./DiffAlgorithm";

export type SyncExecutionContext = {
  vaultId: string;
  fsBackend: ISyncBackend;
  opfsBackend: ISyncBackend;
  signal?: AbortSignal;
};

export class SyncActionExecutor {
  constructor(
    private registry: SyncRegistry,
    private comparator: SyncContentComparator,
    private persistence: SyncPersistence,
  ) {}

  async execute(
    action: SyncAction,
    context: SyncExecutionContext,
    result: SyncResult,
  ) {
    const { vaultId, fsBackend, opfsBackend, signal } = context;

    if (signal?.aborted) throw new Error("AbortError");
    try {
      switch (action.type) {
        case "MATCH_INITIAL": {
          let contentsIdentical = false;
          if (
            action.fsMetadata &&
            action.opfsMetadata &&
            action.fsMetadata.size === action.opfsMetadata.size
          ) {
            contentsIdentical = await this.comparator.compareContent(
              action.path,
              fsBackend,
              opfsBackend,
              action.fsMetadata,
              action.opfsMetadata,
              undefined,
              undefined,
              signal,
            );
          }

          if (signal?.aborted) throw new Error("AbortError");

          if (!contentsIdentical) {
            await this.execute(
              { ...action, type: "HANDLE_CONFLICT" },
              context,
              result,
            );
            return;
          }

          await this.persistence.persistOpfsStateIfNeeded(
            vaultId,
            fsBackend,
            action.path,
            action.fsMetadata!,
          );
          await this.persistence.persistOpfsStateIfNeeded(
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
            remoteId: this.persistence.getSerializableId(
              action.opfsMetadata!,
              opfsBackend,
            ),
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

          if (signal?.aborted) throw new Error("AbortError");

          let shouldUpload = true;
          if (
            action.fsMetadata &&
            action.fsMetadata.size === opfsContent.size
          ) {
            if (
              await this.comparator.compareContent(
                action.path,
                fsBackend,
                opfsBackend,
                action.fsMetadata,
                action.opfsMetadata,
                opfsContent,
                undefined,
                signal,
              )
            ) {
              shouldUpload = false;
            }
          }

          if (signal?.aborted) throw new Error("AbortError");

          const updatedFs = shouldUpload
            ? await fsBackend.upload(
                action.path,
                opfsContent,
                typeof action.fsMetadata?.handle === "string"
                  ? action.fsMetadata.handle
                  : undefined,
              )
            : action.fsMetadata!;

          if (signal?.aborted) throw new Error("AbortError");

          await this.persistence.persistOpfsStateIfNeeded(
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
            lastSyncedOpfsHash: action.opfsMetadata!.hash,
            status: "SYNCED",
            remoteId: this.persistence.getSerializableId(
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

          if (signal?.aborted) throw new Error("AbortError");

          let shouldUpload = true;

          if (
            action.opfsMetadata &&
            action.opfsMetadata.size === fsContent.size
          ) {
            if (
              await this.comparator.compareContent(
                action.path,
                fsBackend,
                opfsBackend,
                action.fsMetadata,
                action.opfsMetadata,
                undefined,
                fsContent,
                signal,
              )
            ) {
              shouldUpload = false;
            }
          }

          if (signal?.aborted) throw new Error("AbortError");

          const updatedOpfs = shouldUpload
            ? await opfsBackend.upload(
                action.path,
                fsContent,
                typeof action.opfsMetadata?.handle === "string"
                  ? action.opfsMetadata.handle
                  : undefined,
              )
            : action.opfsMetadata!;

          if (signal?.aborted) throw new Error("AbortError");

          await this.persistence.persistOpfsStateIfNeeded(
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
            remoteId: this.persistence.getSerializableId(
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
          if (
            action.fsMetadata &&
            action.opfsMetadata &&
            action.fsMetadata.size === action.opfsMetadata.size
          ) {
            if (
              await this.comparator.compareContent(
                action.path,
                fsBackend,
                opfsBackend,
                action.fsMetadata,
                action.opfsMetadata,
                undefined,
                undefined,
                signal,
              )
            ) {
              await this.registry.putEntry({
                filePath: action.path,
                vaultId,
                lastSyncedFsModified: action.fsMetadata.lastModified,
                lastSyncedFsSize: action.fsMetadata.size,
                lastSyncedOpfsHash: action.opfsMetadata.hash,
                status: "SYNCED",
                remoteId: this.persistence.getSerializableId(
                  action.opfsMetadata,
                  opfsBackend,
                  action.registryEntry,
                ),
              });
              break;
            }
          }

          if (signal?.aborted) throw new Error("AbortError");

          const fsTime = action.fsMetadata?.lastModified || 0;
          const opfsTime = action.opfsMetadata?.lastModified || 0;

          if (fsTime > opfsTime) {
            const fsContent = await fsBackend.download(
              action.path,
              typeof action.fsMetadata?.handle === "string"
                ? action.fsMetadata.handle
                : undefined,
            );

            if (signal?.aborted) throw new Error("AbortError");

            const updatedOpfs = await opfsBackend.upload(
              action.path,
              fsContent,
            );

            if (signal?.aborted) throw new Error("AbortError");

            await this.persistence.persistOpfsStateIfNeeded(
              vaultId,
              opfsBackend,
              action.path,
              updatedOpfs,
            );
            await this.registry.putEntry({
              filePath: action.path,
              vaultId,
              lastSyncedFsModified:
                action.fsMetadata?.lastModified ?? updatedOpfs.lastModified,
              lastSyncedFsSize:
                action.fsMetadata?.size ?? updatedOpfs.size,
              lastSyncedOpfsHash: updatedOpfs.hash,
              status: "SYNCED",
              remoteId: this.persistence.getSerializableId(
                updatedOpfs,
                opfsBackend,
                action.registryEntry,
              ),
            });
            result.updated.push(action.path);
          } else {
            const opfsContent = await opfsBackend.download(
              action.path,
              typeof action.opfsMetadata?.handle === "string"
                ? action.opfsMetadata.handle
                : undefined,
            );

            if (signal?.aborted) throw new Error("AbortError");

            const updatedFs = await fsBackend.upload(action.path, opfsContent);

            if (signal?.aborted) throw new Error("AbortError");

            await this.persistence.persistOpfsStateIfNeeded(
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
              lastSyncedOpfsHash: action.opfsMetadata!.hash,
              status: "SYNCED",
              remoteId: this.persistence.getSerializableId(
                action.opfsMetadata!,
                opfsBackend,
                action.registryEntry,
              ),
            });
            result.updated.push(action.path);
          }
          break;
        }

        case "DELETE_FS": {
          await fsBackend.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          await this.persistence.deleteOpfsStateIfNeeded(
            vaultId,
            fsBackend,
            action.path,
          );
          result.deleted.push(action.path);
          break;
        }

        case "DELETE_OPFS": {
          await opfsBackend.delete(action.path, action.registryEntry?.remoteId);
          await this.registry.deleteEntry(vaultId, action.path);
          await this.persistence.deleteOpfsStateIfNeeded(
            vaultId,
            opfsBackend,
            action.path,
          );
          result.deleted.push(action.path);
          break;
        }
      }

      if (action.isConflict && action.type !== "HANDLE_CONFLICT") {
        result.conflicts.push(action.path);
      }
    } catch (err: any) {
      if (err.message === "AbortError") throw err;
      throw err;
    }
  }
}
