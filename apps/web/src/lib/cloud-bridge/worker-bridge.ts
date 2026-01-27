import SyncWorker from "$workers/sync?worker";
import { cloudConfig } from "$stores/cloud-config";
import { get } from "svelte/store";
import { vault } from "$lib/stores/vault.svelte";
import { browser } from "$app/environment";
import type { CloudConfig } from "./index";

export class WorkerBridge {
  private worker: Worker;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.worker = new SyncWorker();
    this.setupListeners();

    if (browser) {
      // Setup periodic sync based on config only if enabled
      const unsub = cloudConfig.subscribe((config: CloudConfig) => {
        if (this.syncIntervalId) clearInterval(this.syncIntervalId);
        if (config.enabled && config.syncInterval > 0) {
          this.syncIntervalId = setInterval(
            () => this.startSync(),
            config.syncInterval,
          );
        }
      });
      this.unsubscribers.push(unsub);
    }
  }

  public destroy() {
    this.unsubscribers.forEach(u => u());
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    this.worker.terminate();
  }

  private setupListeners() {
    this.worker.onmessage = (event) => {
      const { type, payload } = event.data;

      // Since this is a class-based bridge, we'll import the store directly
      // but we need to handle the store update carefully.
      import("$stores/sync-stats").then(({ syncStats }) => {
        switch (type) {
          case "SYNC_STATUS":
            syncStats.setStatus(payload);
            break;
          case "SYNC_COMPLETE":
            syncStats.updateStats({
              filesUploaded: payload.uploads,
              filesDownloaded: payload.downloads,
            });
            break;
          case "SYNC_ERROR":
            syncStats.setError(payload);
            break;
        }
      });
    };
  }

  async startSync() {
    console.log("[WorkerBridge] startSync() called");
    const config = get(cloudConfig) as CloudConfig;

    if (!config.enabled) {
      console.warn("[WorkerBridge] Sync aborted: config.enabled is false");
      return;
    }

    // Check gapi token directly instead of adapter instance (which may not share auth state)
    const token = typeof gapi !== 'undefined' ? gapi.client?.getToken()?.access_token : null;
    if (!token) {
      console.warn("[WorkerBridge] Sync aborted: no gapi access token");
      return;
    }

    const email = config.connectedEmail;
    const storageKey = `gdrive_folder_id:${email}`;
    const folderId = localStorage.getItem(storageKey);
    const rootHandle = vault.rootHandle;

    console.log("[WorkerBridge] Sync state:", {
      hasToken: !!token,
      email,
      folderId,
      hasRootHandle: !!rootHandle,
    });


    console.log("[WorkerBridge] Posting INIT_SYNC + START_SYNC to worker");
    // Send single initialization + start command to avoid race condition
    this.worker.postMessage({
      type: "INIT_SYNC",
      payload: {
        accessToken: token,
        folderId: folderId || undefined,
        rootHandle: rootHandle
      },
    });
    this.worker.postMessage({ type: "START_SYNC" });
  }
}

export const workerBridge = new WorkerBridge();
