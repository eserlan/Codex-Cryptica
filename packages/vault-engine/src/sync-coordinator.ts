import type { LocalEntity } from "./types";
import type { IAssetIOAdapter } from "./asset-manager";

export interface ISyncIOAdapter extends IAssetIOAdapter {
  walkDirectory(dir: FileSystemDirectoryHandle): Promise<any[]>;
  deleteOpfsEntry(
    root: FileSystemDirectoryHandle,
    path: string[],
    vaultId?: string,
  ): Promise<void>;
  getLocalHandle(vaultId: string): Promise<FileSystemDirectoryHandle | null>;
  setLocalHandle(
    vaultId: string,
    handle: FileSystemDirectoryHandle,
  ): Promise<void>;
  deleteLocalHandle(vaultId: string): Promise<void>;
  parseMarkdown(text: string): { metadata: any };
  showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
}

export interface ISyncNotifier {
  notify(message: string, type: "success" | "error" | "info" | "warning"): void;
  alert(message: string): void;
}

export interface ISyncEngine {
  sync(
    vaultId: string,
    localHandle: FileSystemDirectoryHandle,
    opfsHandle: FileSystemDirectoryHandle,
    validator: (path: string, meta: any) => Promise<boolean>,
    onProgress?: (stats: any) => void,
    signal?: AbortSignal,
  ): Promise<{
    error?: string;
    failed?: { error: string }[];
    created: any[];
    updated: any[];
    deleted: any[];
  }>;
}

export class SyncCoordinator {
  constructor(
    private ioAdapter: ISyncIOAdapter,
    private syncEngine: ISyncEngine,
    private notifier: ISyncNotifier,
  ) {}

  async cleanupConflictFiles(
    activeVaultId: string,
    opfsHandle: FileSystemDirectoryHandle,
    onStatusChange: (status: "saving" | "idle" | "error") => void,
    reloadFiles: () => Promise<void>,
    signal?: AbortSignal,
  ) {
    if (!activeVaultId || !opfsHandle) return;
    if (signal?.aborted) return;

    const localHandle = await this.ioAdapter.getLocalHandle(activeVaultId);

    onStatusChange("saving");
    try {
      const squash = async (root: FileSystemDirectoryHandle) => {
        const allFiles = await this.ioAdapter.walkDirectory(root);
        const groups = new Map<
          string,
          { originalPath: string[]; variants: any[] }
        >();

        for (const file of allFiles) {
          const filename = file.path[file.path.length - 1];
          const conflictIndex = filename.indexOf(".conflict-");

          let logicalName = filename;
          if (conflictIndex !== -1) {
            const extIndex = filename.lastIndexOf(".");
            logicalName =
              filename.substring(0, conflictIndex) +
              (extIndex !== -1 ? filename.substring(extIndex) : "");
          }

          const logicalPathArray = [...file.path.slice(0, -1), logicalName];
          const logicalPath = logicalPathArray.join("/");

          if (!groups.has(logicalPath)) {
            groups.set(logicalPath, {
              originalPath: logicalPathArray,
              variants: [],
            });
          }

          const f = await file.handle.getFile();
          groups.get(logicalPath)!.variants.push({
            ...file,
            lastModified: f.lastModified,
            isConflict: conflictIndex !== -1,
          });
        }

        let deleted = 0;
        let promoted = 0;

        for (const group of groups.values()) {
          if (group.variants.length === 1) {
            const onlyVariant = group.variants[0];
            if (onlyVariant.isConflict) {
              try {
                const blob = await onlyVariant.handle.getFile();
                await this.ioAdapter.writeOpfsFile(
                  group.originalPath,
                  blob,
                  root,
                  activeVaultId,
                );
                await this.ioAdapter.deleteOpfsEntry(
                  root,
                  onlyVariant.path,
                  activeVaultId,
                );
                promoted++;
              } catch (err) {
                console.error(
                  `Failed to promote orphaned conflict ${onlyVariant.path.join("/")}`,
                  err,
                );
              }
            }
            continue;
          }

          group.variants.sort((a, b) => b.lastModified - a.lastModified);
          const winner = group.variants[0];
          const losers = group.variants.slice(1);

          for (const loser of losers) {
            await this.ioAdapter.deleteOpfsEntry(
              root,
              loser.path,
              activeVaultId,
            );
            deleted++;
          }

          if (winner.isConflict) {
            try {
              const blob = await winner.handle.getFile();
              await this.ioAdapter.writeOpfsFile(
                group.originalPath,
                blob,
                root,
                activeVaultId,
              );
              await this.ioAdapter.deleteOpfsEntry(
                root,
                winner.path,
                activeVaultId,
              );
              promoted++;
            } catch (err) {
              console.error(`Failed to promote ${winner.path.join("/")}`, err);
            }
          }
        }
        return { deleted, promoted };
      };

      const opfsResults = await squash(opfsHandle);
      let fsResults = { deleted: 0, promoted: 0 };

      if (localHandle) {
        try {
          if (
            (await localHandle.queryPermission({ mode: "readwrite" })) ===
            "granted"
          ) {
            fsResults = await squash(localHandle);
          }
        } catch (_err) {
          console.warn(
            "[SyncCoordinator] Could not clean up local folder:",
            _err,
          );
        }
      }

      await reloadFiles();

      const totalDeleted = opfsResults.deleted + fsResults.deleted;
      const totalPromoted = opfsResults.promoted + fsResults.promoted;

      this.notifier.notify(
        `History squashed: ${totalDeleted} files removed, ${totalPromoted} versions promoted across stores.`,
        "success",
      );
    } catch (err: any) {
      console.error("[SyncCoordinator] Cleanup failed", err);
      this.notifier.notify("Cleanup failed: " + err.message, "error");
    } finally {
      onStatusChange("idle");
    }
  }

  async syncWithLocalFolder(
    activeVaultId: string,
    opfsHandle: FileSystemDirectoryHandle | undefined,
    currentEntities: Record<string, LocalEntity>,
    waitForSaves: () => Promise<void>,
    onStateChange: (state: {
      status: "saving" | "idle" | "error";
      syncType: "local" | null;
      errorMessage?: string;
    }) => void,
    checkForConflicts: () => Promise<void>,
    signal?: AbortSignal,
    onProgress?: (stats: any) => void,
  ) {
    if (!opfsHandle) return;
    if (signal?.aborted) return;

    let localHandle = await this.ioAdapter.getLocalHandle(activeVaultId);
    if (signal?.aborted) return;

    if (localHandle) {
      try {
        const iterator = (localHandle as any).values();
        await iterator.next();
      } catch (validationErr: any) {
        if (
          validationErr.name === "NotFoundError" ||
          validationErr.message?.includes("not found")
        ) {
          localHandle = null;
          await this.ioAdapter.deleteLocalHandle(activeVaultId);
        }
      }
    }

    if (localHandle) {
      try {
        const permission = await localHandle.queryPermission({
          mode: "readwrite",
        });
        if (permission !== "granted") {
          const newPermission = await localHandle.requestPermission({
            mode: "readwrite",
          });
          if (newPermission !== "granted") localHandle = null;
        }
      } catch (err: any) {
        console.warn("[SyncCoordinator] Permission request failed:", err);
        localHandle = null;
      }
    }

    if (!localHandle) {
      try {
        this.notifier.alert(
          "Please select a local folder to sync this vault with. This is required to grant permission or reconnect a lost link.",
        );
        localHandle = await this.ioAdapter.showDirectoryPicker();
        await this.ioAdapter.setLocalHandle(activeVaultId, localHandle);
      } catch (_err: any) {
        if (_err.name === "AbortError") return;
        onStateChange({
          status: "error",
          syncType: null,
          errorMessage: "Failed to select folder: " + _err.message,
        });
        return;
      }
    }

    try {
      await Promise.race([
        waitForSaves(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Save queue timeout")), 10000),
        ),
      ]).catch((_err) =>
        console.warn("Continuing sync despite save queue issues"),
      );

      onStateChange({ status: "saving", syncType: "local" });

      const pathToEntity = new Map<string, LocalEntity>();
      for (const e of Object.values(currentEntities)) {
        if (e._path) {
          pathToEntity.set(e._path.join("/"), e);
        }
      }

      const result = await this.syncEngine.sync(
        activeVaultId,
        localHandle,
        opfsHandle,
        async (path, _meta) => {
          if (path.includes(".conflict-")) return false;
          if (!path.endsWith(".md") && !path.endsWith(".markdown")) return true;

          const existing = pathToEntity.get(path);
          if (existing) return true;
          if (_meta.size > 1024 * 1024) return true;

          try {
            if (!(_meta.handle instanceof FileSystemFileHandle)) return true;
            const file = await _meta.handle.getFile();
            const text = await file.text();
            const { metadata } = this.ioAdapter.parseMarkdown(text);
            return !!(metadata.id || metadata.title);
          } catch (err) {
            console.error(
              `[SyncCoordinator] Failed to parse markdown for validation: ${path}`,
              err,
            );
            return false;
          }
        },
        onProgress,
        signal,
      );

      const isHandleError = (msg: string) =>
        msg.includes("NotFoundError") ||
        msg.includes("could not be found") ||
        msg.includes("A requested file or directory could not be found");

      const hasHandleError =
        (result.error && isHandleError(result.error)) ||
        (result.failed && result.failed.some((f) => isHandleError(f.error)));

      if (hasHandleError) {
        onStateChange({ status: "idle", syncType: null });
        this.notifier.notify(
          "Local folder link lost. Please re-select the folder.",
          "error",
        );
        await this.ioAdapter.deleteLocalHandle(activeVaultId);
        return;
      }

      if (result.error) {
        onStateChange({
          status: "error",
          syncType: null,
          errorMessage: result.error,
        });
      } else {
        onStateChange({ status: "idle", syncType: null });
        await checkForConflicts();
        this.notifier.notify(
          `Sync complete: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted.`,
          "success",
        );
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        onStateChange({ status: "idle", syncType: null });
        return;
      }
      onStateChange({
        status: "error",
        syncType: null,
        errorMessage: e.message,
      });
    }
  }
}
