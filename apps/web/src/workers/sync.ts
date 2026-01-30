import { SyncEngine } from "$lib/cloud-bridge/sync-engine/engine";
import { FileSystemAdapter } from "$lib/cloud-bridge/sync-engine/fs-adapter";
import { MetadataStore } from "$lib/cloud-bridge/sync-engine/metadata-store";
import { WorkerDriveAdapter } from "$lib/cloud-bridge/google-drive/worker-adapter";

const metadataStore = new MetadataStore();
const fsAdapter = new FileSystemAdapter();
let engine: SyncEngine | null = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;
  // Sanitize payload for logging
  const { ...safePayload } = payload || {};
  console.log(`SyncWorker: Received message [${type}]`, safePayload);

  try {
    switch (type) {
      case "INIT_SYNC": {
        console.log('SyncWorker: Initializing engine...');
        const cloudAdapter = new WorkerDriveAdapter(payload.accessToken, payload.folderId);
        
        if (payload.rootHandle) {
          const isValid = typeof FileSystemDirectoryHandle !== "undefined" && 
                        payload.rootHandle instanceof FileSystemDirectoryHandle;
          
          if (isValid) {
            console.log('SyncWorker: Setting local root handle');
            fsAdapter.setRoot(payload.rootHandle);
          } else {
            console.error('SyncWorker: Invalid root handle provided');
            throw new Error("Invalid root handle provided to sync worker");
          }
        }
        engine = new SyncEngine(cloudAdapter, fsAdapter, metadataStore);
        console.log('SyncWorker: Engine ready');
        break;
      }

      case "START_SYNC": {
        if (!engine) {
          console.error('SyncWorker: Cannot start sync - Engine not initialized');
          throw new Error("Sync Engine not initialized");
        }
        console.log('SyncWorker: Starting scan...');
        self.postMessage({ type: "SYNC_STATUS", payload: "SCANNING" });

        const { local, remote, metadata } = await engine.scan();
        console.log(`SyncWorker: Scan complete. Local: ${local.length}, Remote: ${remote.length}, Metadata: ${metadata.length}`);
        
        if (local.length > 0) console.log('SyncWorker: Sample Local:', local[0].path);
        if (remote.length > 0) console.log('SyncWorker: Sample Remote:', remote[0].appProperties?.vault_path || remote[0].name);

        // Calculate Diff
        const plan = engine.calculateDiff(local, remote, metadata);
        console.log(`SyncWorker: Plan calculated. Uploads: ${plan.uploads.length}, Downloads: ${plan.downloads.length}, Deletions: ${plan.deletes.length}`);

        if (plan.uploads.length > 0 || plan.downloads.length > 0 || plan.deletes.length > 0) {
          self.postMessage({ type: "SYNC_STATUS", payload: "SYNCING" });
          await engine.applyPlan(plan, (phase, current, total) => {
            self.postMessage({
              type: "SYNC_PROGRESS",
              payload: { phase, current, total },
            });
          });

          // If downloads occurred, notify main thread to update Graph/Vault
          if (plan.downloads.length > 0) {
            self.postMessage({
              type: "REMOTE_UPDATES_DOWNLOADED",
            });
          }
        }

        self.postMessage({ type: "SYNC_STATUS", payload: "IDLE" });
        self.postMessage({
          type: "SYNC_COMPLETE",
          payload: {
            uploads: plan.uploads.length,
            downloads: plan.downloads.length,
          },
        });
        break;
      }

      case "PARSE_CONTENT": {
        // Existing legacy handler or could be reused
        console.log("Parsing content in Svelte worker:", payload);
        // ... existing parsing logic ...
        self.postMessage({ type: "UPDATE_GRAPH", nodes: [] });
        break;
      }
    }
  } catch (error: any) {
    console.error("Sync Worker Error:", error);
    self.postMessage({ type: "SYNC_ERROR", payload: error.message });
  }
};