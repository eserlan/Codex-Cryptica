import type { ICloudAdapter, RemoteFileMeta } from "../index";
import type { FileSystemAdapter, FileEntry } from "./fs-adapter";
import type { MetadataStore, SyncMetadata } from "./metadata-store";
import { resolveConflict, SYNC_SKEW_MS } from "./conflict";

interface SyncPlan {
  uploads: (FileEntry & { remoteId?: string })[];
  downloads: RemoteFileMeta[];
  deletes: { id: string; path: string }[];
}

export class SyncEngine {
  constructor(
    private cloudAdapter: ICloudAdapter,
    private fsAdapter: FileSystemAdapter,
    private metadataStore: MetadataStore,
  ) { }

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
    const plan: SyncPlan = { uploads: [], downloads: [], deletes: [] };
    const localMap = new Map(localFiles.map((f) => [f.path, f]));
    const metadataMap = new Map(metadataList.map((m) => [m.filePath, m]));

    // 1. Remote Deduplication Pass
    // Group remote files by their vault path (from appProperties)
    const remoteGroups = new Map<string, RemoteFileMeta[]>();
    for (const remote of remoteFilesRaw) {
      const path = remote.appProperties?.vault_path || remote.name;
      if (!remoteGroups.has(path)) remoteGroups.set(path, []);
      remoteGroups.get(path)!.push(remote);
    }

    // Identify newest version per path, mark others for deletion
    const remoteFiles = new Map<string, RemoteFileMeta>();
    for (const [path, group] of remoteGroups) {
      if (group.length > 1) {
        console.log(`[SyncEngine] Found ${group.length} duplicates for ${path}. Cleaning up...`);
        // Sort by modifiedTime descending
        group.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
        const [newest, ...duplicates] = group;
        remoteFiles.set(path, newest);
        // Add duplicates to delete plan
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
        // New Local File or Restored? 
        // If we have metadata, it means we've seen it before but it's gone from remote.
        // For safety, re-upload.
        plan.uploads.push(local);
      } else {
        // Both exist. Check for changes against BASE (metadata)
        let localChanged = true;
        let remoteChanged = true;

        if (meta) {
          if (Math.abs(local.lastModified - meta.localModified) < SYNC_SKEW_MS) {
            localChanged = false;
          }
          if (remote.modifiedTime === meta.remoteModified) {
            remoteChanged = false;
          }
        }

        if (!localChanged && !remoteChanged) continue;

        if (localChanged && !remoteChanged) {
          plan.uploads.push({ ...local, remoteId: remote.id });
        } else if (!localChanged && remoteChanged) {
          plan.downloads.push(remote);
        } else {
          // Conflict: Both changed. Use timestamp resolution.
          const decision = resolveConflict(local.lastModified, remote.modifiedTime);
          if (decision === "UPLOAD") {
            plan.uploads.push({ ...local, remoteId: remote.id });
          } else if (decision === "DOWNLOAD") {
            plan.downloads.push(remote);
          }
        }
      }
    }

    // 2. Process Remote Files (New Downloads or Local Deletions)
    for (const [path, remote] of remoteFiles) {
      if (!localMap.has(path)) {
        const meta = metadataMap.get(path);
        if (meta) {
          // It was there, but now it's gone locally -> LOCAL DELETE
          // Resolution: Should we delete remote? 
          // Rule: If remote has been updated since we last synced it, RESTORE instead of DELETE.
          const remoteUpdatedSinceSync = remote.modifiedTime !== meta.remoteModified;
          
          if (remoteUpdatedSinceSync) {
            console.log(`[SyncEngine] Remote update detected for locally deleted file ${path}. Restoring.`);
            plan.downloads.push(remote);
          } else {
            console.log(`[SyncEngine] Local deletion detected for ${path}. Propagating to remote.`);
            plan.deletes.push({ id: remote.id, path });
          }
        } else {
          // Never seen locally -> NEW REMOTE
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

      const metadataDeletes: string[] = []; // paths

  

      // Helper for parallel execution with error aggregation

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

  

              if (metadataUpdates.length >= BATCH_SIZE) {
              const batch = [...metadataUpdates];
              metadataUpdates.length = 0;
              await this.metadataStore.bulkPut(batch);
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

      // Flush remaining metadata
      if (metadataUpdates.length > 0) {
        await this.metadataStore.bulkPut(metadataUpdates);
        metadataUpdates.length = 0;
      }

      if (metadataDeletes.length > 0) {
        for (const path of metadataDeletes) {
          await this.metadataStore.delete(path);
        }
        metadataDeletes.length = 0;
      }

      if (errors.length > 0) {
        const firstError = errors[0]?.error;
        const msg = firstError instanceof Error ? firstError.message : String(firstError);
        throw new Error(`Sync failed for ${errors.length} items. First error: ${msg}`);
      }
    };

    // 1. Execute Deletions
    if (plan.deletes.length > 0) {
      console.log(`[SyncEngine] Deleting ${plan.deletes.length} remote files...`);
      await runParallel(plan.deletes, "DELETING", async (del) => {
        await this.cloudAdapter.deleteFile(del.id);
        metadataDeletes.push(del.path);
      });
    }

    // 2. Execute Uploads
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

    // 3. Execute Downloads
    if (plan.downloads.length > 0) {
      console.log(`[SyncEngine] Downloading ${plan.downloads.length} files...`);
      await runParallel(plan.downloads, "DOWNLOADING", async (file) => {
        const content = await this.cloudAdapter.downloadFile(file.id);
        const localPath = file.appProperties?.vault_path || file.name;
        await this.fsAdapter.writeFile(localPath, content);

        metadataUpdates.push({
          filePath: localPath,
          remoteId: file.id,
          localModified: Date.now(), // approximation
          remoteModified: file.modifiedTime,
          syncStatus: "SYNCED",
        });
      });
    }
  }

  private async updateMetadata(
    path: string,
    remote: RemoteFileMeta,
    localTime: number,
  ) {
    await this.metadataStore.put({
      filePath: path,
      remoteId: remote.id,
      localModified: localTime,
      remoteModified: remote.modifiedTime,
      syncStatus: "SYNCED",
    });
  }
}
