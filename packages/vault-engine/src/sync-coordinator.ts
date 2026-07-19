import type { LocalEntity } from "./types";
import type { IAssetIOAdapter } from "./asset-manager";

export type SyncDirection = "push" | "pull";

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
    direction: SyncDirection,
    validator: (path: string, meta: any) => Promise<boolean>,
    onProgress?: (stats: any) => void,
    signal?: AbortSignal,
  ): Promise<{
    error?: string;
    failed?: { path: string; error: string }[];
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
    onStatusChange: (status: "saving" | "loading" | "idle" | "error") => void,
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

  async push(
    activeVaultId: string,
    opfsHandle: FileSystemDirectoryHandle | undefined,
    currentEntities: Record<string, LocalEntity>,
    waitForSaves: () => Promise<void>,
    onStateChange: (state: {
      status: "saving" | "loading" | "idle" | "error";
      syncType: "local" | null;
      errorMessage?: string;
      failedFiles?: { path: string; error: string }[];
    }) => void,
    checkForConflicts: () => Promise<void>,
    options?: {
      signal?: AbortSignal;
      onProgress?: (stats: any) => void;
      interactive?: boolean;
    },
  ) {
    return this.syncWithLocalFolder(
      activeVaultId,
      opfsHandle,
      "push",
      currentEntities,
      waitForSaves,
      onStateChange,
      checkForConflicts,
      options,
    );
  }

  async pull(
    activeVaultId: string,
    opfsHandle: FileSystemDirectoryHandle | undefined,
    currentEntities: Record<string, LocalEntity>,
    waitForSaves: () => Promise<void>,
    onStateChange: (state: {
      status: "saving" | "loading" | "idle" | "error";
      syncType: "local" | null;
      errorMessage?: string;
      failedFiles?: { path: string; error: string }[];
    }) => void,
    checkForConflicts: () => Promise<void>,
    options?: {
      signal?: AbortSignal;
      onProgress?: (stats: any) => void;
      interactive?: boolean;
    },
  ) {
    return this.syncWithLocalFolder(
      activeVaultId,
      opfsHandle,
      "pull",
      currentEntities,
      waitForSaves,
      onStateChange,
      checkForConflicts,
      options,
    );
  }

  async syncWithLocalFolder(
    activeVaultId: string,
    opfsHandle: FileSystemDirectoryHandle | undefined,
    direction: SyncDirection,
    currentEntities: Record<string, LocalEntity>,
    waitForSaves: () => Promise<void>,
    onStateChange: (state: {
      status: "saving" | "loading" | "idle" | "error";
      syncType: "local" | null;
      errorMessage?: string;
      failedFiles?: { path: string; error: string }[];
    }) => void,
    checkForConflicts: () => Promise<void>,
    options?: {
      signal?: AbortSignal;
      onProgress?: (stats: any) => void;
      interactive?: boolean;
    },
  ) {
    // Defend against legacy/JS callers that still pass an AbortSignal as the
    // trailing argument (the old positional signature) — treat it as { signal }
    // rather than silently dropping it.
    const { signal, onProgress, interactive } =
      options instanceof AbortSignal ? { signal: options } : (options ?? {});
    if (!opfsHandle) return;
    if (signal?.aborted) return;

    let localHandle = await this.ioAdapter.getLocalHandle(activeVaultId);
    if (signal?.aborted) return;

    if (localHandle) {
      try {
        // Validate handle is still "hot" and accessible
        for await (const _ of localHandle) {
          break;
        }
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
          localHandle = null;
        }
      } catch (err: any) {
        console.warn("[SyncCoordinator] Permission query failed:", err);
        localHandle = null;
      }
    }

    if (!localHandle) {
      // Browsers only allow the directory picker inside a user gesture, so a
      // background sync must not attempt to prompt — it would throw a raw
      // SecurityError. Surface an actionable message instead.
      if (!interactive) {
        onStateChange({
          status: "error",
          syncType: null,
          errorMessage:
            "Folder link lost. Use the sync button to reconnect this vault to its local folder.",
        });
        return;
      }
      try {
        this.notifier.alert(
          "Please select a local folder to link this vault with. This is required to establish or reconnect a lost folder link.",
        );
        localHandle = await this.ioAdapter.showDirectoryPicker();
        await this.ioAdapter.setLocalHandle(activeVaultId, localHandle);
      } catch (_err: any) {
        if (_err.name === "AbortError") return;
        onStateChange({
          status: "error",
          syncType: null,
          errorMessage:
            _err.name === "SecurityError"
              ? "The browser blocked the folder picker. Click the sync button again to choose your folder."
              : _err.name === "NotSupportedError"
                ? _err.message
                : "Failed to select folder: " + _err.message,
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

      onStateChange({
        status: direction === "push" ? "saving" : "loading",
        syncType: "local",
      });

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
        direction,
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
          failedFiles: result.failed,
        });
      } else {
        onStateChange({
          status: "idle",
          syncType: null,
          failedFiles: result.failed,
        });
        await checkForConflicts();
        const actionType = direction === "push" ? "Save" : "Load";
        const failureCount = result.failed?.length ?? 0;
        const summary =
          `${actionType} complete: ${result.created.length} created, ` +
          `${result.updated.length} updated, ${result.deleted.length} deleted.`;
        if (failureCount > 0) {
          this.notifier.notify(
            `${summary} ${failureCount} file${failureCount === 1 ? "" : "s"} failed.`,
            "warning",
          );
        } else {
          this.notifier.notify(summary, "success");
        }
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
