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

    // 1. Process Local Files (New or Modified)
    for (const local of localFiles) {
      const remote = remoteFiles.get(local.path);

      if (!remote) {
        // New Local File -> Upload
        plan.uploads.push(local);
      } else {
        // Both exist - include remoteId for update
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

    // 2. Process Remote Files (New or Deleted Locally)
    for (const [path, remote] of remoteFiles) {
      if (!localMap.has(path)) {
        // Exists remote, missing local.
        // Check metadata to see if we deleted it locally
        const meta = metadataMap.get(path);
        if (meta) {
          // We knew about it, so it must have been deleted locally -> Delete Remote
          // plan.deletes.push(path) // Optional: For now, let's play safe and re-download (restore)
          // or assume it's a new remote file if we don't implement full delete sync yet.
          // Decision: Treat as Remote New -> Download
          plan.downloads.push(remote);
        } else {
          // Never saw it before -> Download
          plan.downloads.push(remote);
        }
      }
    }

    return plan;
  }

  async applyPlan(plan: SyncPlan) {
    const CONCURRENCY = 5;
    const metadataUpdates: SyncMetadata[] = [];

    // Helper for parallel execution
    const runParallel = async <T>(items: T[], fn: (item: T) => Promise<void>) => {
      const iterator = items.entries();
      const worker = async () => {
        for (const [, item] of iterator) {
          try {
            await fn(item);
          } catch (err) {
            console.error("Sync error for item:", item, err);
            // Continue with other items despite error
          }
        }
      };
      const workers = Array.from({ length: Math.min(items.length, CONCURRENCY) }, worker);
      await Promise.all(workers);
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
        await this.fsAdapter.writeFile(file.name, content);

        metadataUpdates.push({
          filePath: file.name,
          remoteId: file.id,
          localModified: Date.now(),
          remoteModified: file.modifiedTime,
          syncStatus: "SYNCED",
        });
      });
    }

    // Batch update metadata
    if (metadataUpdates.length > 0) {
      console.log(`[SyncEngine] Updating metadata for ${metadataUpdates.length} files...`);
      await this.metadataStore.bulkPut(metadataUpdates);
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
