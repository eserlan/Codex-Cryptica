import type { ICloudAdapter, RemoteFileMeta } from "../index";
import type { FileSystemAdapter, FileEntry } from "./fs-adapter";
import type { MetadataStore, SyncMetadata } from "./metadata-store";
import { resolveConflict, SYNC_SKEW_MS } from "./conflict";

interface SyncPlan {
  uploads: (FileEntry & { remoteId?: string })[];
  downloads: RemoteFileMeta[];
  deletes: { id: string; path: string }[];
  metadataUpdates: SyncMetadata[];
}

export class SyncEngine {
  constructor(
    private cloudAdapter: ICloudAdapter,
    private fsAdapter: FileSystemAdapter,
    private metadataStore: MetadataStore,
  ) {}

  async scan(): Promise<{
    local: FileEntry[];
    remote: RemoteFileMeta[];
    metadata: SyncMetadata[];
  }> {
    if (!navigator.onLine) {
      throw new Error("Offline: Cannot sync");
    }

    const [local, remote, metadata] = await Promise.all([
      this.fsAdapter.listAllFiles(),
      this.cloudAdapter.listFiles(),
      this.metadataStore.getAll(),
    ]);

    return { local, remote, metadata };
  }

  calculateDiff(
    localFiles: FileEntry[],
    remoteFilesRaw: RemoteFileMeta[],
    metadataList: SyncMetadata[],
  ): SyncPlan {
    const plan: SyncPlan = { uploads: [], downloads: [], deletes: [], metadataUpdates: [] };
    const localMap = new Map(localFiles.map((f) => [f.path, f]));
    const metadataMap = new Map(metadataList.map((m) => [m.filePath, m]));

    // 1. Remote Deduplication Pass
    const remoteGroups = new Map<string, RemoteFileMeta[]>();
    const remoteFiles = new Map<string, RemoteFileMeta>();

    for (const remote of remoteFilesRaw) {
      const vaultPath = remote.appProperties?.vault_path;
      if (!vaultPath) {
        console.warn("[SyncEngine] Remote file missing vault_path; skipping deduplication", {
          id: remote.id,
          name: remote.name,
        });
        // For files without a vault_path, fall back to name for sync path,
        // but do not deduplicate them based solely on name.
        remoteFiles.set(remote.name, remote);
        continue;
      }
      if (!remoteGroups.has(vaultPath)) remoteGroups.set(vaultPath, []);
      remoteGroups.get(vaultPath)!.push(remote);
    }

    for (const [path, group] of remoteGroups) {
      if (group.length > 1) {
        console.log(`[SyncEngine] Found ${group.length} duplicates for ${path}. Cleaning up...`);
        group.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        const [newest, ...duplicates] = group;
        remoteFiles.set(path, newest);
        for (const dup of duplicates) {
          plan.deletes.push({ id: dup.id, path });
        }
      } else {
        remoteFiles.set(path, group[0]);
      }
    }

    // 2. Process Local Files (Uploads, Conflict Resolution, or No-op)
    for (const local of localFiles) {
      const remote = remoteFiles.get(local.path);
      const meta = metadataMap.get(local.path);

      if (!remote) {
        console.log(`[SyncEngine] ${local.path} has no remote match. Adding to UPLOADS.`);
        plan.uploads.push(local);
      } else {
        let localChanged = true;
        let remoteChanged = true;

        if (meta) {
          if (Math.abs(local.lastModified - meta.localModified) < SYNC_SKEW_MS) {
            localChanged = false;
          }
          const remoteTime = new Date(remote.modifiedTime).getTime();
          const lastSyncedRemoteTime = new Date(meta.remoteModified).getTime();
          if (Math.abs(remoteTime - lastSyncedRemoteTime) < SYNC_SKEW_MS) {
            remoteChanged = false;
          }
        }

        if (!localChanged && !remoteChanged) {
          // console.log(`[SyncEngine] ${local.path} is synced. Skipping.`);
          continue;
        }

        console.log(`[SyncEngine] ${local.path} changed. Local: ${localChanged}, Remote: ${remoteChanged}`);

        if (localChanged && !remoteChanged) {
          plan.uploads.push({ ...local, remoteId: remote.id });
        } else if (!localChanged && remoteChanged) {
          plan.downloads.push(remote);
        } else {
          const decision = resolveConflict(local.lastModified, remote.modifiedTime);
          console.log(`[SyncEngine] Conflict for ${local.path}. Decision: ${decision}`);
          if (decision === "UPLOAD") {
            plan.uploads.push({ ...local, remoteId: remote.id });
          } else if (decision === "DOWNLOAD") {
            plan.downloads.push(remote);
          } else if (decision === "SKIP") {
            // Even if we SKIP transfer, we should establish/update metadata to record this successful match
            plan.metadataUpdates.push({
              filePath: local.path,
              remoteId: remote.id,
              localModified: local.lastModified,
              remoteModified: remote.modifiedTime,
              syncStatus: "SYNCED",
            });
          }
        }
      }
    }

    // 3. Process Remote Files (New Downloads or Local Deletions)
    for (const [path, remote] of remoteFiles) {
      if (!localMap.has(path)) {
        const meta = metadataMap.get(path);
        if (meta) {
          const remoteTime = new Date(remote.modifiedTime).getTime();
          const lastSyncedRemoteTime = new Date(meta.remoteModified).getTime();
          const remoteUpdatedSinceSync = Math.abs(remoteTime - lastSyncedRemoteTime) > SYNC_SKEW_MS;

          if (remoteUpdatedSinceSync) {
            plan.downloads.push(remote);
          } else {
            plan.deletes.push({ id: remote.id, path });
          }
        } else {
          plan.downloads.push(remote);
        }
      }
    }

    return plan;
  }

  async applyPlan(
    plan: SyncPlan,
    onProgress?: (phase: string, current: number, total: number) => void,
  ) {
    const CONCURRENCY = 5;
    const metadataUpdates: SyncMetadata[] = [];
    const metadataDeletes: string[] = [];

    const runParallel = async <T>(
      items: T[],
      phase: string,
      fn: (item: T) => Promise<void>,
    ) => {
      const iterator = items.entries();
      const errors: { item: T; error: unknown }[] = [];
      const BATCH_SIZE = 10;
      let completed = 0;

      const worker = async () => {
        for (const [, item] of iterator) {
          try {
            await fn(item);
            completed++;
            onProgress?.(phase, completed, items.length);

            let batchToFlush: SyncMetadata[] = [];
            if (metadataUpdates.length >= BATCH_SIZE) {
              batchToFlush = metadataUpdates.splice(0, metadataUpdates.length);
            }
            if (batchToFlush.length > 0) {
              await this.metadataStore.bulkPut(batchToFlush);
            }
          } catch (err) {
            console.error("Sync error for item:", item, err);
            errors.push({ item, error: err });
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(items.length, CONCURRENCY) },
        worker,
      );
      await Promise.all(workers);

      if (metadataUpdates.length > 0) {
        await this.metadataStore.bulkPut(metadataUpdates);
        metadataUpdates.length = 0;
      }

      if (metadataDeletes.length > 0) {
        await Promise.all(metadataDeletes.map((p) => this.metadataStore.delete(p)));
        metadataDeletes.length = 0;
      }

      if (errors.length > 0) {
        const firstError = errors[0]?.error;
        const msg = firstError instanceof Error ? firstError.message : String(firstError);
        throw new Error(`Sync failed for ${errors.length} items. First error: ${msg}`);
      }
    };

    if (plan.deletes.length > 0) {
      console.log(`[SyncEngine] Deleting ${plan.deletes.length} remote files...`);
      await runParallel(plan.deletes, "DELETING", async (del) => {
        await this.cloudAdapter.deleteFile(del.id);
        metadataDeletes.push(del.path);
      });
    }

    if (plan.uploads.length > 0) {
      console.log(`[SyncEngine] Uploading ${plan.uploads.length} files...`);
      await runParallel(plan.uploads, "UPLOADING", async (file) => {
        const content = await this.fsAdapter.readFile(file.path);
        const meta = await this.cloudAdapter.uploadFile(file.path, content, file.remoteId);
        metadataUpdates.push({
          filePath: file.path,
          remoteId: meta.id,
          localModified: file.lastModified,
          remoteModified: meta.modifiedTime,
          syncStatus: "SYNCED",
        });
      });
    }

    if (plan.downloads.length > 0) {
      console.log(`[SyncEngine] Downloading ${plan.downloads.length} files...`);
      await runParallel(plan.downloads, "DOWNLOADING", async (file) => {
        const content = await this.cloudAdapter.downloadFile(file.id);
        const localPath = file.appProperties?.vault_path || file.name;
        await this.fsAdapter.writeFile(localPath, content);
        metadataUpdates.push({
          filePath: localPath,
          remoteId: file.id,
          localModified: Date.now(),
          remoteModified: file.modifiedTime,
          syncStatus: "SYNCED",
        });
      });
    }

    // 4. Record Metadata-only Updates (Matches)
    if (plan.metadataUpdates.length > 0) {
      console.log(`[SyncEngine] Recording metadata for ${plan.metadataUpdates.length} matched files...`);
      for (const meta of plan.metadataUpdates) {
        metadataUpdates.push(meta);
      }
    }

    // Final Flush
    if (metadataUpdates.length > 0) {
      await this.metadataStore.bulkPut(metadataUpdates);
    }
  }

  private async updateMetadata(path: string, remote: RemoteFileMeta, localTime: number) {
    await this.metadataStore.put({
      filePath: path,
      remoteId: remote.id,
      localModified: localTime,
      remoteModified: remote.modifiedTime,
      syncStatus: "SYNCED",
    });
  }
}