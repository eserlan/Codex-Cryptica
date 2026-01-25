import SyncWorker from '$workers/sync?worker';
import { syncStats } from '$stores/sync-stats';
import { cloudConfig } from '$stores/cloud-config';
import { get } from 'svelte/store';
import { GoogleDriveAdapter } from './google-drive/adapter';
import { browser } from '$app/environment';
import type { CloudConfig } from './index';

export class WorkerBridge {
  private worker: Worker;
  private gdriveAdapter: GoogleDriveAdapter;
  private syncIntervalId: any;

  constructor() {
    this.worker = new SyncWorker();
    this.gdriveAdapter = new GoogleDriveAdapter();
    this.setupListeners();
    
    if (browser) {
        setTimeout(() => this.startSync(), 1000);
        
        // Setup periodic sync based on config
        cloudConfig.subscribe((config: CloudConfig) => {
            if (this.syncIntervalId) clearInterval(this.syncIntervalId);
            if (config.enabled && config.syncInterval > 0) {
                this.syncIntervalId = setInterval(() => this.startSync(), config.syncInterval);
            }
        });
    }
  }

  private setupListeners() {
    this.worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      switch (type) {
        case 'SYNC_STATUS':
          syncStats.setStatus(payload);
          break;
        case 'SYNC_ERROR':
          syncStats.setError(payload);
          break;
        case 'SYNC_COMPLETE':
          syncStats.updateStats({
             filesUploaded: payload.uploads,
             filesDownloaded: payload.downloads,
             duration: 0 // TODO calculate duration
          });
          break;
        case 'UPDATE_GRAPH':
           // Handle graph update
           console.log('Graph updated from worker');
           break;
      }
    };
  }

  async startSync() {
    const config = get(cloudConfig) as CloudConfig;
    if (!config.enabled) return;

    // Ensure we have a valid token
    if (!this.gdriveAdapter.isAuthenticated()) {
        try {
            await this.gdriveAdapter.connect();
        } catch (e) {
            console.error('Auto-connect failed', e);
            return;
        }
    }

    // Get the raw access token (Note: GoogleDriveAdapter needs to expose this or we cheat a bit)
    // Since GoogleDriveAdapter encapsulates it, we might need a getter.
    // For now, let's assume we can get it via gapi
    const token = gapi.client.getToken()?.access_token;
    
    if (token) {
        this.worker.postMessage({ type: 'INIT_SYNC', payload: { accessToken: token } });
        this.worker.postMessage({ type: 'START_SYNC' });
    }
  }
}

export const workerBridge = new WorkerBridge();
