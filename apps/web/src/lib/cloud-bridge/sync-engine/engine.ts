import type { ICloudAdapter, RemoteFileMeta } from "../index";
import type { FileSystemAdapter, FileEntry } from "./fs-adapter";
import type { MetadataStore, SyncMetadata } from "./metadata-store";
import { resolveConflict } from "./conflict";

interface SyncPlan {
  uploads: (FileEntry & { remoteId?: string })[];
  downloads: RemoteFileMeta[];
  deletes: string[]; // paths
}

export class SyncEngine {
  constructor(
    private cloudAdapter: ICloudAdapter,
    private fsAdapter: FileSystemAdapter,
    private metadataStore: MetadataStore,
  ) { }

  async scan(): Promise<{
    local: FileEntry[];
    remote: Map<string, RemoteFileMeta>;
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
    remoteFiles: Map<string, RemoteFileMeta>,
    metadataList: SyncMetadata[],
  ): SyncPlan {
    const plan: SyncPlan = { uploads: [], downloads: [], deletes: [] };
    const localMap = new Map(localFiles.map((f) => [f.path, f]));
    const metadataMap = new Map(metadataList.map((m) => [m.filePath, m]));
    const SKEW_MS = 5000;

    // 1. Process Local Files
    for (const local of localFiles) {
      const remote = remoteFiles.get(local.path);
      const meta = metadataMap.get(local.path);

      if (!remote) {
        // New Local File -> Upload
        // But wait, if we have metadata saying we synced it, but remote is gone...
        // imply remote delete? For now, re-upload (safety first).
        plan.uploads.push(local);
      } else {
        // Both exist. Check for changes against BASE (metadata)

        let localChanged = true;
        let remoteChanged = true;

        if (meta) {
          // Check if local matches what we last saw
          if (Math.abs(local.lastModified - meta.localModified) < SKEW_MS) {
            localChanged = false;
          }
          // Check if remote matches what we last saw
          // Note: remote.modifiedTime is string, meta.remoteModified is string
          if (remote.modifiedTime === meta.remoteModified) {
            remoteChanged = false;
          }
        } else {
          // No metadata = treat both as new/unknown -> fall back to timestamp war
          // This happens on first sync or after index clear
        }

        if (!localChanged && !remoteChanged) {
          // Nothing to do
          continue;
        }

        if (localChanged && !remoteChanged) {
          plan.uploads.push({ ...local, remoteId: remote.id });
        } else if (!localChanged && remoteChanged) {
          plan.downloads.push(remote);
        } else {
          // Both changed (or no metadata) -> Conflict or First Sync
          // Use timestamp resolution
          const decision = resolveConflict(
            local.lastModified,
            remote.modifiedTime,
          );
          if (decision === "UPLOAD") {
            plan.uploads.push({ ...local, remoteId: remote.id });
          } else if (decision === "DOWNLOAD") {
            plan.downloads.push(remote);
          }
        }
      }
    }

    // 2. Process Remote Files (New or Deleted Locally)
    for (const [path, remote] of remoteFiles) {
      if (!localMap.has(path)) {
        // Exists remote, missing local.
        const meta = metadataMap.get(path);
        if (meta) {
          // We saw it before, but it's gone locally.
          // Be conservative: Re-download (Restore).
          // A smarter engine would track local deletes.
          plan.downloads.push(remote);
        } else {
          // Never saw it -> New Remote
          plan.downloads.push(remote);
        }
      }
    }

    return plan;
  }

  async applyPlan(plan: SyncPlan) {
    const CONCURRENCY = 5;
    const metadataUpdates: SyncMetadata[] = [];


    // Helper for parallel execution with error aggregation
    const runParallel = async <T>(
      items: T[],
      fn: (item: T) => Promise<void>,
    ) => {
      const iterator = items.entries();
      const errors: { item: T; error: unknown }[] = [];
      const BATCH_SIZE = 10;

      const worker = async () => {
        for (const [, item] of iterator) {
          try {
            await fn(item);


            // Periodically save metadata to prevent total loss on crash
            if (metadataUpdates.length >= BATCH_SIZE) {
              // Clone and clear the array to process this batch
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
        const batch = [...metadataUpdates];
        metadataUpdates.length = 0;
        await this.metadataStore.bulkPut(batch);
      }

      if (errors.length > 0) {
        const firstError = errors[0]?.error;
        const msg =
          firstError instanceof Error ? firstError.message : String(firstError);
        throw new Error(
          `Sync failed for ${errors.length} items. First error: ${msg}`,
        );
      }
    };

    // Execute uploads
    if (plan.uploads.length > 0) {
      console.log(`[SyncEngine] Uploading ${plan.uploads.length} files...`);
      await runParallel(plan.uploads, async (file) => {
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

    // Execute downloads
    if (plan.downloads.length > 0) {
      console.log(`[SyncEngine] Downloading ${plan.downloads.length} files...`);
      await runParallel(plan.downloads, async (file) => {
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
