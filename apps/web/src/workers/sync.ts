import { SyncEngine } from '$lib/cloud-bridge/sync-engine/engine';
import { FileSystemAdapter } from '$lib/cloud-bridge/sync-engine/fs-adapter';
import { MetadataStore } from '$lib/cloud-bridge/sync-engine/metadata-store';
import { WorkerDriveAdapter } from '$lib/cloud-bridge/google-drive/worker-adapter';

const metadataStore = new MetadataStore();
const fsAdapter = new FileSystemAdapter();
let engine: SyncEngine | null = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT_SYNC': {
        // payload: { accessToken }
        const cloudAdapter = new WorkerDriveAdapter(payload.accessToken);
        engine = new SyncEngine(cloudAdapter, fsAdapter, metadataStore);
        break;
      }

      case 'START_SYNC': {
        if (!engine) throw new Error('Sync Engine not initialized');
        self.postMessage({ type: 'SYNC_STATUS', payload: 'SCANNING' });
        
        const { local, remote, metadata } = await engine.scan();
        
        // Calculate Diff
        const plan = engine.calculateDiff(local, remote, metadata);
        
        if (plan.uploads.length > 0 || plan.downloads.length > 0) {
            self.postMessage({ type: 'SYNC_STATUS', payload: 'SYNCING' });
            await engine.applyPlan(plan);
            
            // If downloads occurred, notify main thread to update Graph
            if (plan.downloads.length > 0) {
                 self.postMessage({ type: 'PARSE_CONTENT', content: 'remote-updates' });
            }
        }
        
        self.postMessage({ type: 'SYNC_STATUS', payload: 'IDLE' });
        self.postMessage({ type: 'SYNC_COMPLETE', payload: { 
            uploads: plan.uploads.length, 
            downloads: plan.downloads.length 
        }});
        break;
      }
        
      case 'PARSE_CONTENT': {
         // Existing legacy handler or could be reused
         console.log('Parsing content in Svelte worker:', payload);
         // ... existing parsing logic ...
         self.postMessage({ type: 'UPDATE_GRAPH', nodes: [] });
         break;
      }
    }
  } catch (error: any) {
    console.error('Sync Worker Error:', error);
    self.postMessage({ type: 'SYNC_ERROR', payload: error.message });
  }
};